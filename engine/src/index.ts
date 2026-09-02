/**
 * # Engine Core
 *
 * **Built for [MetaFor](https://github.com/zavx0z/metafor)** and reusable by
 * other immersive applications that need a retained spatial foundation.
 *
 * The package owns retained scene transforms, geometry, materials, picking,
 * loading, animation, font data, and the target-neutral {@link ViewPoint}
 * camera boundary. Concrete WebGPU resources and drawing live in
 * `@zavx0z/webgpu`.
 *
 * ## Coordinate contract
 *
 * Engine uses a right-handed Z-up world:
 *
 * - **+X** points right
 * - **+Y** points forward
 * - **+Z** points up
 * - one world unit is one millimetre
 * - WebGPU clip-space depth is `[0, 1]`
 *
 * Product semantics and component policy belong to consumer repositories.
 *
 * @packageDocumentation
 */

export * from "./core/object-3d"
export * from "./core/presentation-clip"
export * from "./core/buffer-geometry"
export * from "./geometries/plane-geometry"
export * from "./geometries/textured-plane-geometry"
export * from "./geometries/sphere-geometry"
export * from "./geometries/torus-geometry"
export * from "./geometries/box-geometry"
export * from "./core/view-point"
export * from "./core/mesh"
export * from "./core/instanced-mesh"
export * from "./core/instance-layer"
export * from "./core/instanced-rounded-rect"
export * from "./core/instanced-stroked-path"
export * from "./core/wireframe-instanced-mesh"
export * from "./core/skinned-mesh"
export * from "./scenes/space"
export * from "./loaders/gltf-loader"
export * from "./materials"
export * from "./materials/glass-material"
export * from "./math"
export * from "./helpers/grid-helper"
export * from "./helpers/axes-helper"
export * from "./lights/light"
export * from "./lights/directional-light"
export * from "./text/true-type-font"
export * from "./objects/line"
export * from "./objects/line-segments"
export * from "./objects/text"
export * from "./materials/text-material"
export * from "./animation"
export * from "./core/raycaster"
