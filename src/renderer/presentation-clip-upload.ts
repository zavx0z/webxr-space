import {Matrix4} from "../math/matrix-4"
import type {Object3D} from "../core/object-3d"
import type {PresentationClipShape} from "../core/presentation-clip"

export const PRESENTATION_CLIP_RECORD_FLOATS = 24
export const PRESENTATION_CLIP_RECORD_SIZE = PRESENTATION_CLIP_RECORD_FLOATS * Float32Array.BYTES_PER_ELEMENT
export const PRESENTATION_CLIP_RANGE_FLOAT_OFFSET = 56
export const MAX_PRESENTATION_CLIPS_PER_OBJECT = 16
export const DEFAULT_MAX_PRESENTATION_CLIP_RECORDS = 65_536

export type PresentationClipRange = Readonly<{
  start: number
  count: number
}>

export type PresentationClipUpload = Readonly<{
  data: Float32Array
  ranges: ReadonlyMap<Object3D, PresentationClipRange>
}>

export type PresentationClipEncodingLimits = Readonly<{
  maxRecords?: number
}>

type InternedPresentationClipChain = Readonly<{
  coordinateSpaces: readonly Object3D[]
  geometryBits: Uint32Array
  range: PresentationClipRange
}>

type PresentationClipMatrix = Readonly<{
  elements: ArrayLike<number>
  determinant(): number
}>

const PRESENTATION_CLIP_GEOMETRY_FLOATS = 8
const PRESENTATION_CLIP_HASH_OFFSET = 0x811c9dc5
const PRESENTATION_CLIP_HASH_PRIME = 0x01000193
const EMPTY_RANGE: PresentationClipRange = Object.freeze({start: 0, count: 0})
const INVALID_RECORD = new Float32Array([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
  0, 0, -1, -1,
  0, 0, 0, 0,
])

/**
 * Flattens and interns resolved clip chains for one frame.
 *
 * The frame-local signature cache hashes coordinate-space identity and the
 * canonical f32 geometry consumed by the GPU. Hash buckets are always checked
 * against the full signature, so a collision cannot share an unrelated range.
 * Coordinate inverses are sampled once per frame and never survive this call.
 *
 * The record budget includes one lazily emitted fail-closed record. A chain
 * that is invalid, too deep, or cannot fit whole is mapped to that shared
 * record; chains are never truncated and never become unclipped.
 */
export function encodePresentationClipChains(
  objects: readonly Object3D[],
  limits: PresentationClipEncodingLimits = {},
): PresentationClipUpload {
  const maxRecords = normaliseRecordLimit(limits.maxRecords)
  const values: number[] = []
  const ranges = new Map<Object3D, PresentationClipRange>()
  const internedChains = new Map<number, InternedPresentationClipChain[]>()
  const coordinateIds = new Map<Object3D, number>()
  const inverseCache = new Map<Object3D, Float32Array | null>()
  const coordinateScratch = new Array<Object3D>(MAX_PRESENTATION_CLIPS_PER_OBJECT)
  const geometryScratch = new Float32Array(
    MAX_PRESENTATION_CLIPS_PER_OBJECT * PRESENTATION_CLIP_GEOMETRY_FLOATS,
  )
  const geometryBitsScratch = new Uint32Array(geometryScratch.buffer)
  let invalidRange: PresentationClipRange | null = null

  const failClosedRange = (): PresentationClipRange => {
    if (invalidRange !== null) return invalidRange
    const start = values.length / PRESENTATION_CLIP_RECORD_FLOATS
    values.push(...INVALID_RECORD)
    invalidRange = Object.freeze({start, count: 1})
    return invalidRange
  }

  for (const object of objects) {
    if (ranges.has(object)) continue
    const shapes = object.presentationClips
    const shapeCount = shapes.length
    if (shapeCount === 0) {
      ranges.set(object, EMPTY_RANGE)
      continue
    }
    if (shapeCount > MAX_PRESENTATION_CLIPS_PER_OBJECT) {
      ranges.set(object, failClosedRange())
      continue
    }

    let signatureHash = mixPresentationClipHash(PRESENTATION_CLIP_HASH_OFFSET, shapeCount)
    let signatureValid = true
    for (let shapeIndex = 0; shapeIndex < shapeCount; shapeIndex += 1) {
      const shape = shapes[shapeIndex]!
      const coordinateSpace = readCoordinateSpace(shape)
      const geometryOffset = shapeIndex * PRESENTATION_CLIP_GEOMETRY_FLOATS
      if (
        coordinateSpace === null ||
        !writeCanonicalGeometry(shape, geometryScratch, geometryOffset)
      ) {
        signatureValid = false
        break
      }
      coordinateScratch[shapeIndex] = coordinateSpace
      let coordinateId = coordinateIds.get(coordinateSpace)
      if (coordinateId === undefined) {
        coordinateId = coordinateIds.size
        coordinateIds.set(coordinateSpace, coordinateId)
      }
      signatureHash = mixPresentationClipHash(signatureHash, coordinateId)
      for (
        let geometryIndex = geometryOffset;
        geometryIndex < geometryOffset + PRESENTATION_CLIP_GEOMETRY_FLOATS;
        geometryIndex += 1
      ) {
        signatureHash = mixPresentationClipHash(signatureHash, geometryBitsScratch[geometryIndex]!)
      }
    }
    if (!signatureValid) {
      ranges.set(object, failClosedRange())
      continue
    }

    const interned = findInternedChain(
      internedChains.get(signatureHash),
      shapeCount,
      coordinateScratch,
      geometryBitsScratch,
    )
    if (interned !== null) {
      ranges.set(object, interned.range)
      continue
    }

    const recordCount = values.length / PRESENTATION_CLIP_RECORD_FLOATS
    const reservedInvalidRecords = invalidRange === null ? 1 : 0
    if (recordCount + shapeCount > maxRecords - reservedInvalidRecords) {
      const range = failClosedRange()
      rememberInternedChain(
        internedChains,
        signatureHash,
        shapeCount,
        coordinateScratch,
        geometryBitsScratch,
        range,
      )
      ranges.set(object, range)
      continue
    }

    const valueStart = values.length
    let encodable = true
    for (let shapeIndex = 0; shapeIndex < shapeCount; shapeIndex += 1) {
      const worldToLocal = inverseForCoordinateSpace(coordinateScratch[shapeIndex]!, inverseCache)
      if (worldToLocal === null) {
        encodable = false
        break
      }
      for (let matrixIndex = 0; matrixIndex < worldToLocal.length; matrixIndex += 1) {
        values.push(worldToLocal[matrixIndex]!)
      }
      const geometryOffset = shapeIndex * PRESENTATION_CLIP_GEOMETRY_FLOATS
      for (
        let geometryIndex = geometryOffset;
        geometryIndex < geometryOffset + PRESENTATION_CLIP_GEOMETRY_FLOATS;
        geometryIndex += 1
      ) {
        values.push(geometryScratch[geometryIndex]!)
      }
    }

    let range: PresentationClipRange
    if (!encodable) {
      values.length = valueStart
      range = failClosedRange()
    } else {
      range = Object.freeze({start: recordCount, count: shapeCount})
    }
    rememberInternedChain(
      internedChains,
      signatureHash,
      shapeCount,
      coordinateScratch,
      geometryBitsScratch,
      range,
    )
    ranges.set(object, range)
  }

  return {data: new Float32Array(values), ranges}
}

function readCoordinateSpace(shape: PresentationClipShape): Object3D | null {
  try {
    if (shape?.kind !== "rounded-rect") return null
    const coordinateSpace = shape.coordinateSpace as unknown
    if (
      coordinateSpace === null ||
      (typeof coordinateSpace !== "object" && typeof coordinateSpace !== "function")
    ) return null
    return coordinateSpace as Object3D
  } catch {
    return null
  }
}

function writeCanonicalGeometry(
  shape: PresentationClipShape,
  target: Float32Array,
  offset: number,
): boolean {
  try {
    const centerX = readFiniteTupleValue(shape.center, 0)
    const centerY = readFiniteTupleValue(shape.center, 1)
    const halfWidth = readFiniteTupleValue(shape.halfSize, 0)
    const halfHeight = readFiniteTupleValue(shape.halfSize, 1)
    const topLeft = readFiniteTupleValue(shape.radii, 0)
    const topRight = readFiniteTupleValue(shape.radii, 1)
    const bottomRight = readFiniteTupleValue(shape.radii, 2)
    const bottomLeft = readFiniteTupleValue(shape.radii, 3)
    if (
      centerX === null || centerY === null ||
      halfWidth === null || halfHeight === null ||
      topLeft === null || topRight === null || bottomRight === null || bottomLeft === null ||
      halfWidth <= 0 || halfHeight <= 0 ||
      topLeft < 0 || topRight < 0 || bottomRight < 0 || bottomLeft < 0
    ) return false

    target[offset] = centerX
    target[offset + 1] = centerY
    target[offset + 2] = halfWidth
    target[offset + 3] = halfHeight
    target[offset + 4] = topLeft
    target[offset + 5] = topRight
    target[offset + 6] = bottomRight
    target[offset + 7] = bottomLeft
    for (let index = offset; index < offset + PRESENTATION_CLIP_GEOMETRY_FLOATS; index += 1) {
      if (!Number.isFinite(target[index]!)) return false
    }
    if (target[offset + 2]! <= 0 || target[offset + 3]! <= 0) return false
    const radiusMax = Math.min(target[offset + 2]!, target[offset + 3]!)
    for (let index = offset + 4; index < offset + PRESENTATION_CLIP_GEOMETRY_FLOATS; index += 1) {
      target[index] = Math.min(radiusMax, target[index]!)
    }
    return true
  } catch {
    return false
  }
}

function readFiniteTupleValue(tuple: unknown, index: number): number | null {
  if (tuple === null || (typeof tuple !== "object" && typeof tuple !== "function")) return null
  const value = (tuple as {readonly [position: number]: unknown})[index]
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function mixPresentationClipHash(hash: number, value: number): number {
  return Math.imul(hash ^ value, PRESENTATION_CLIP_HASH_PRIME) >>> 0
}

function findInternedChain(
  bucket: readonly InternedPresentationClipChain[] | undefined,
  shapeCount: number,
  coordinateSpaces: readonly Object3D[],
  geometryBits: Uint32Array,
): InternedPresentationClipChain | null {
  if (bucket === undefined) return null
  const geometryCount = shapeCount * PRESENTATION_CLIP_GEOMETRY_FLOATS
  for (const candidate of bucket) {
    if (candidate.coordinateSpaces.length !== shapeCount) continue
    let matches = true
    for (let index = 0; index < shapeCount; index += 1) {
      if (candidate.coordinateSpaces[index] !== coordinateSpaces[index]) {
        matches = false
        break
      }
    }
    if (!matches) continue
    for (let index = 0; index < geometryCount; index += 1) {
      if (candidate.geometryBits[index] !== geometryBits[index]) {
        matches = false
        break
      }
    }
    if (matches) return candidate
  }
  return null
}

function rememberInternedChain(
  chains: Map<number, InternedPresentationClipChain[]>,
  hash: number,
  shapeCount: number,
  coordinateSpaces: readonly Object3D[],
  geometryBits: Uint32Array,
  range: PresentationClipRange,
): void {
  const retainedCoordinateSpaces = new Array<Object3D>(shapeCount)
  for (let index = 0; index < shapeCount; index += 1) {
    retainedCoordinateSpaces[index] = coordinateSpaces[index]!
  }
  const geometryCount = shapeCount * PRESENTATION_CLIP_GEOMETRY_FLOATS
  const retainedGeometryBits = new Uint32Array(geometryCount)
  for (let index = 0; index < geometryCount; index += 1) {
    retainedGeometryBits[index] = geometryBits[index]!
  }
  const entry = {
    coordinateSpaces: retainedCoordinateSpaces,
    geometryBits: retainedGeometryBits,
    range,
  }
  const bucket = chains.get(hash)
  if (bucket === undefined) {
    chains.set(hash, [entry])
  } else {
    bucket.push(entry)
  }
}

function inverseForCoordinateSpace(
  coordinateSpace: Object3D,
  cache: Map<Object3D, Float32Array | null>,
): Float32Array | null {
  const cached = cache.get(coordinateSpace)
  if (cached !== undefined || cache.has(coordinateSpace)) return cached ?? null

  let inverse: Float32Array | null = null
  try {
    const matrix = readPresentationClipMatrix(coordinateSpace)
    if (matrix !== null) {
      let matrixValid = true
      for (let index = 0; index < matrix.elements.length; index += 1) {
        if (!Number.isFinite(matrix.elements[index]!)) {
          matrixValid = false
          break
        }
      }
      const determinant = matrixValid ? matrix.determinant() : Number.NaN
      if (Number.isFinite(determinant) && determinant !== 0) {
        const localMatrix = new Matrix4()
        localMatrix.elements.set(matrix.elements)
        const candidate = new Float32Array(localMatrix.invert().elements)
        if (candidate.every(Number.isFinite)) inverse = candidate
      }
    }
  } catch {
    inverse = null
  }
  cache.set(coordinateSpace, inverse)
  return inverse
}

function readPresentationClipMatrix(coordinateSpace: Object3D): PresentationClipMatrix | null {
  const matrix = (coordinateSpace as {matrixWorld?: unknown}).matrixWorld
  if (matrix === null || (typeof matrix !== "object" && typeof matrix !== "function")) return null
  const elements = (matrix as {elements?: unknown}).elements
  if (elements === null || (typeof elements !== "object" && typeof elements !== "function")) return null
  if ((elements as ArrayLike<unknown>).length !== 16) return null
  const determinant = (matrix as {determinant?: unknown}).determinant
  if (typeof determinant !== "function") return null
  return matrix as PresentationClipMatrix
}

function normaliseRecordLimit(value: number | undefined): number {
  if (value === undefined) return DEFAULT_MAX_PRESENTATION_CLIP_RECORDS
  if (!Number.isFinite(value) || value < 1) return 1
  return Math.max(1, Math.floor(value))
}
