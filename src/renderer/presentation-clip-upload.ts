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

type EncodedPresentationClipShape = Readonly<{
  signature: string
  record: Float32Array
}>

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
  const internedChains = new Map<string, PresentationClipRange>()
  const internedShapes = new Map<string, EncodedPresentationClipShape | null>()
  const coordinateIds = new Map<Object3D, number>()
  const inverseCache = new Map<Object3D, Float32Array | null>()
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
    if (shapes.length === 0) {
      ranges.set(object, EMPTY_RANGE)
      continue
    }
    if (shapes.length > MAX_PRESENTATION_CLIPS_PER_OBJECT) {
      ranges.set(object, failClosedRange())
      continue
    }

    const encodedShapes: EncodedPresentationClipShape[] = []
    let invalid = false
    for (const shape of shapes) {
      const encoded = encodePresentationClipShape(shape, coordinateIds, inverseCache, internedShapes)
      if (encoded === null) {
        invalid = true
        break
      }
      encodedShapes.push(encoded)
    }
    if (invalid) {
      ranges.set(object, failClosedRange())
      continue
    }

    const signature = encodedShapes.map((shape) => shape.signature).join("|")
    const interned = internedChains.get(signature)
    if (interned !== undefined) {
      ranges.set(object, interned)
      continue
    }

    const recordCount = values.length / PRESENTATION_CLIP_RECORD_FLOATS
    const reservedInvalidRecords = invalidRange === null ? 1 : 0
    if (recordCount + encodedShapes.length > maxRecords - reservedInvalidRecords) {
      const range = failClosedRange()
      internedChains.set(signature, range)
      ranges.set(object, range)
      continue
    }

    const range = Object.freeze({start: recordCount, count: encodedShapes.length})
    for (const shape of encodedShapes) values.push(...shape.record)
    internedChains.set(signature, range)
    ranges.set(object, range)
  }

  return {data: new Float32Array(values), ranges}
}

function encodePresentationClipShape(
  shape: PresentationClipShape,
  coordinateIds: Map<Object3D, number>,
  inverseCache: Map<Object3D, Float32Array | null>,
  internedShapes: Map<string, EncodedPresentationClipShape | null>,
): EncodedPresentationClipShape | null {
  const coordinateSpace = shape.coordinateSpace as Object3D | null | undefined
  if (shape.kind !== "rounded-rect" || coordinateSpace === null || coordinateSpace === undefined) return null
  const center = shape.center
  const halfSize = shape.halfSize
  const radii = shape.radii
  if (![...center, ...halfSize, ...radii].every(Number.isFinite)) return null
  if (halfSize[0] <= 0 || halfSize[1] <= 0 || radii.some((radius) => radius < 0)) return null

  const geometry = new Float32Array([
    center[0],
    center[1],
    halfSize[0],
    halfSize[1],
    radii[0],
    radii[1],
    radii[2],
    radii[3],
  ])
  if (!geometry.every(Number.isFinite) || geometry[2]! <= 0 || geometry[3]! <= 0) return null
  const radiusMax = Math.min(geometry[2]!, geometry[3]!)
  for (let index = 4; index < geometry.length; index++) geometry[index] = Math.min(radiusMax, geometry[index]!)

  let coordinateId = coordinateIds.get(coordinateSpace)
  if (coordinateId === undefined) {
    coordinateId = coordinateIds.size
    coordinateIds.set(coordinateSpace, coordinateId)
  }
  const geometryBits = new Uint32Array(geometry.buffer)
  const signature = `${coordinateId}:${[...geometryBits].join(",")}`
  const cached = internedShapes.get(signature)
  if (cached !== undefined || internedShapes.has(signature)) return cached ?? null

  const worldToLocal = inverseForCoordinateSpace(coordinateSpace, inverseCache)
  if (worldToLocal === null) {
    internedShapes.set(signature, null)
    return null
  }
  const record = new Float32Array(PRESENTATION_CLIP_RECORD_FLOATS)
  record.set(worldToLocal)
  record.set(geometry, 16)
  if (!record.every(Number.isFinite)) {
    internedShapes.set(signature, null)
    return null
  }
  const encoded = {
    signature,
    record,
  }
  internedShapes.set(signature, encoded)
  return encoded
}

function inverseForCoordinateSpace(
  coordinateSpace: Object3D,
  cache: Map<Object3D, Float32Array | null>,
): Float32Array | null {
  const cached = cache.get(coordinateSpace)
  if (cached !== undefined || cache.has(coordinateSpace)) return cached ?? null

  const matrix = coordinateSpace.matrixWorld
  let inverse: Float32Array | null = null
  if (matrix.elements.every(Number.isFinite)) {
    const determinant = matrix.determinant()
    if (Number.isFinite(determinant) && determinant !== 0) {
      const candidate = new Float32Array(new Matrix4().copy(matrix).invert().elements)
      if (candidate.every(Number.isFinite)) inverse = candidate
    }
  }
  cache.set(coordinateSpace, inverse)
  return inverse
}

function normaliseRecordLimit(value: number | undefined): number {
  if (value === undefined) return DEFAULT_MAX_PRESENTATION_CLIP_RECORDS
  if (!Number.isFinite(value) || value < 1) return 1
  return Math.max(1, Math.floor(value))
}
