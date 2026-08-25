import {Matrix4} from "../math/matrix-4"
import type {Object3D} from "../core/object-3d"
import type {PresentationClipShape} from "../core/presentation-clip"

export const PRESENTATION_CLIP_RECORD_FLOATS = 24
export const PRESENTATION_CLIP_RECORD_SIZE = PRESENTATION_CLIP_RECORD_FLOATS * Float32Array.BYTES_PER_ELEMENT
export const PRESENTATION_CLIP_RANGE_FLOAT_OFFSET = 56

export type PresentationClipRange = Readonly<{
  start: number
  count: number
}>

export type PresentationClipUpload = Readonly<{
  data: Float32Array
  ranges: ReadonlyMap<Object3D, PresentationClipRange>
}>

const INVALID_HALF_SIZE: readonly [number, number] = [-1, -1]

/** Flattens each distinct renderable's resolved clip chain for one frame. */
export function encodePresentationClipChains(objects: readonly Object3D[]): PresentationClipUpload {
  const values: number[] = []
  const ranges = new Map<Object3D, PresentationClipRange>()

  for (const object of objects) {
    if (ranges.has(object)) continue
    const start = values.length / PRESENTATION_CLIP_RECORD_FLOATS
    for (const shape of object.presentationClips) encodePresentationClipShape(values, shape)
    ranges.set(object, {start, count: object.presentationClips.length})
  }

  return {data: new Float32Array(values), ranges}
}

function encodePresentationClipShape(target: number[], shape: PresentationClipShape): void {
  const matrix = shape.coordinateSpace?.matrixWorld
  const center = shape.center
  const halfSize = shape.halfSize
  const radii = shape.radii
  const matrixValid = matrix !== undefined && matrix.elements.every(Number.isFinite)
  const valuesValid = [...center, ...halfSize, ...radii].every(Number.isFinite)
  const dimensionsValid = halfSize[0] > 0 && halfSize[1] > 0
  const radiiValid = radii.every((radius) => radius >= 0)
  const determinant = matrixValid ? matrix.determinant() : Number.NaN

  if (
    shape.kind !== "rounded-rect" ||
    !matrixValid ||
    !valuesValid ||
    !dimensionsValid ||
    !radiiValid ||
    !Number.isFinite(determinant) ||
    determinant === 0
  ) {
    encodeInvalidPresentationClip(target)
    return
  }

  const worldToLocal = new Matrix4().copy(matrix).invert()
  if (!worldToLocal.elements.every(Number.isFinite)) {
    encodeInvalidPresentationClip(target)
    return
  }
  const radiusMax = Math.min(halfSize[0], halfSize[1])
  target.push(
    ...worldToLocal.elements,
    center[0],
    center[1],
    halfSize[0],
    halfSize[1],
    Math.min(radiusMax, radii[0]),
    Math.min(radiusMax, radii[1]),
    Math.min(radiusMax, radii[2]),
    Math.min(radiusMax, radii[3]),
  )
}

function encodeInvalidPresentationClip(target: number[]): void {
  target.push(
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
    0, 0, ...INVALID_HALF_SIZE,
    0, 0, 0, 0,
  )
}
