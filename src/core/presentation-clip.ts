import type {Object3D} from "./object-3d"

/**
 * One analytical rounded rectangle in an Engine-owned local coordinate space.
 *
 * A renderable evaluates every shape in its `Object3D.presentationClips` list.
 * The resulting presentation region is their intersection. Rectangular clips
 * use four zero radii.
 */
export type PresentationClipShape = Readonly<{
  kind: "rounded-rect"
  coordinateSpace: Object3D
  center: readonly [x: number, y: number]
  halfSize: readonly [width: number, height: number]
  radii: readonly [topLeft: number, topRight: number, bottomRight: number, bottomLeft: number]
}>
