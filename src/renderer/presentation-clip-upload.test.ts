import {describe, expect, test} from "bun:test"
import {Mesh} from "../core/mesh"
import {Object3D} from "../core/object-3d"
import {PlaneGeometry} from "../geometries/plane-geometry"
import {Matrix4} from "../math/matrix-4"
import {MeshBasicMaterial} from "../materials/mesh-basic-material"
import {MeshLambertMaterial} from "../materials/mesh-lambert-material"
import {Renderer} from "./index"
import {
  encodePresentationClipChains,
  MAX_PRESENTATION_CLIPS_PER_OBJECT,
  PRESENTATION_CLIP_RANGE_FLOAT_OFFSET,
  PRESENTATION_CLIP_RECORD_FLOATS,
  type PresentationClipRange,
} from "./presentation-clip-upload"
import {renderItemSupportsPresentationClips} from "./presentation-clip-support"
import type {RenderItem} from "./utils/render-list"

describe("presentation clip upload", () => {
  test("encodes distinct nested rounded clips in their live coordinate spaces", () => {
    const firstSpace = new Object3D()
    firstSpace.position.set(3, -2, 1)
    firstSpace.scale.set(2, 0.5, 1)
    firstSpace.rotation.z = Math.PI / 5
    firstSpace.updateWorldMatrix()
    const secondSpace = new Object3D()
    secondSpace.position.set(-1, 4, 0)
    secondSpace.updateWorldMatrix()

    const clipped = new Object3D()
    clipped.presentationClips = [
      {
        kind: "rounded-rect",
        coordinateSpace: firstSpace,
        center: [1, 2],
        halfSize: [5, 3],
        radii: [1, 2, 7, 0.5],
      },
      {
        kind: "rounded-rect",
        coordinateSpace: secondSpace,
        center: [0, 0],
        halfSize: [2, 4],
        radii: [0, 0, 0, 0],
      },
    ]
    const plain = new Object3D()
    const upload = encodePresentationClipChains([clipped, clipped, plain])

    expect(upload.data).toHaveLength(PRESENTATION_CLIP_RECORD_FLOATS * 2)
    expect(upload.ranges.get(clipped)).toEqual({start: 0, count: 2})
    expect(upload.ranges.get(plain)).toEqual({start: 0, count: 0})
    expect([...upload.data.slice(0, 16)]).toEqual(
      [...new Matrix4().copy(firstSpace.matrixWorld).invert().elements].map(Math.fround),
    )
    expect([...upload.data.slice(16, 20)]).toEqual([1, 2, 5, 3])
    expect([...upload.data.slice(20, 24)]).toEqual([1, 2, 3, 0.5])
  })

  test("encodes invalid and non-invertible clips as fail-closed records", () => {
    const singular = new Object3D()
    singular.scale.set(0, 1, 1)
    singular.updateWorldMatrix()
    const invalid = new Object3D()
    invalid.presentationClips = [{
      kind: "rounded-rect",
      coordinateSpace: singular,
      center: [0, 0],
      halfSize: [10, 10],
      radii: [2, 2, 2, 2],
    }]

    const upload = encodePresentationClipChains([invalid])
    expect([...upload.data.slice(16, 20)]).toEqual([0, 0, -1, -1])
    expect(upload.ranges.get(invalid)).toEqual({start: 0, count: 1})
  })

  test("fails closed for malformed coordinate spaces and matrices without throwing", () => {
    const missingMatrix = {} as Object3D
    const malformedMatrix = new Object3D()
    Object.assign(malformedMatrix, {matrixWorld: {elements: []}})
    const throwingMatrix = Object.defineProperty({}, "matrixWorld", {
      get() {
        throw new Error("malformed matrix getter")
      },
    }) as Object3D
    const objects = [missingMatrix, malformedMatrix, throwingMatrix].map((coordinateSpace) => {
      const object = new Object3D()
      object.presentationClips = [{
        kind: "rounded-rect",
        coordinateSpace,
        center: [0, 0],
        halfSize: [10, 10],
        radii: [2, 2, 2, 2],
      }]
      return object
    })

    const upload = encodePresentationClipChains(objects)
    const invalidRange = upload.ranges.get(objects[0]!)
    expect(upload.data).toHaveLength(PRESENTATION_CLIP_RECORD_FLOATS)
    expect(invalidRange).toEqual({start: 0, count: 1})
    expect(upload.ranges.get(objects[1]!)).toBe(invalidRange)
    expect(upload.ranges.get(objects[2]!)).toBe(invalidRange)
    expect([...upload.data.slice(16, 20)]).toEqual([0, 0, -1, -1])
  })

  test("refreshes coordinate inverses between frame-local encoding calls", () => {
    let inverseComputations = 0
    const coordinateSpace = new Object3D()
    const determinant = coordinateSpace.matrixWorld.determinant.bind(coordinateSpace.matrixWorld)
    coordinateSpace.matrixWorld.determinant = () => {
      inverseComputations += 1
      return determinant()
    }
    coordinateSpace.updateWorldMatrix()
    const object = new Object3D()
    object.presentationClips = [{
      kind: "rounded-rect",
      coordinateSpace,
      center: [0, 0],
      halfSize: [10, 10],
      radii: [2, 2, 2, 2],
    }]

    const first = encodePresentationClipChains([object])
    coordinateSpace.position.x = 7
    coordinateSpace.updateWorldMatrix()
    const second = encodePresentationClipChains([object])

    expect([...first.data.slice(0, 16)]).not.toEqual([...second.data.slice(0, 16)])
    expect([...second.data.slice(0, 16)]).toEqual(
      [...new Matrix4().copy(coordinateSpace.matrixWorld).invert().elements].map(Math.fround),
    )
    expect(inverseComputations).toBe(2)
  })

  test("maps an over-depth chain to one shared fail-closed record", () => {
    const coordinateSpace = new Object3D()
    coordinateSpace.updateWorldMatrix()
    const first = new Object3D()
    const second = new Object3D()
    for (const object of [first, second]) {
      object.presentationClips = Array.from({length: MAX_PRESENTATION_CLIPS_PER_OBJECT + 1}, (_, index) => ({
        kind: "rounded-rect" as const,
        coordinateSpace,
        center: [index, 0] as const,
        halfSize: [10, 10] as const,
        radii: [2, 2, 2, 2] as const,
      }))
    }

    const upload = encodePresentationClipChains([first, second])
    const invalidRange = upload.ranges.get(first)
    expect(upload.data).toHaveLength(PRESENTATION_CLIP_RECORD_FLOATS)
    expect(invalidRange).toEqual({start: 0, count: 1})
    expect(upload.ranges.get(second)).toBe(invalidRange)
    expect([...upload.data.slice(16, 20)]).toEqual([0, 0, -1, -1])
  })

  test("uses one invalid range when the total storage record limit is exhausted", () => {
    const spaces = Array.from({length: 4}, (_, index) => {
      const space = new Object3D()
      space.position.x = index
      space.updateWorldMatrix()
      return space
    })
    const objects = spaces.map((coordinateSpace, index) => {
      const object = new Object3D()
      object.presentationClips = [{
        kind: "rounded-rect",
        coordinateSpace,
        center: [index, 0],
        halfSize: [10, 10],
        radii: [2, 2, 2, 2],
      }]
      return object
    })

    const upload = encodePresentationClipChains(objects, {maxRecords: 3})
    const invalidRange = upload.ranges.get(objects[2]!)
    expect(upload.data).toHaveLength(PRESENTATION_CLIP_RECORD_FLOATS * 3)
    expect(upload.ranges.get(objects[0]!)).toEqual({start: 0, count: 1})
    expect(upload.ranges.get(objects[1]!)).toEqual({start: 1, count: 1})
    expect(invalidRange).toEqual({start: 2, count: 1})
    expect(upload.ranges.get(objects[3]!)).toBe(invalidRange)
    expect([...upload.data.slice(PRESENTATION_CLIP_RECORD_FLOATS * 2 + 16, PRESENTATION_CLIP_RECORD_FLOATS * 2 + 20)])
      .toEqual([0, 0, -1, -1])
  })

  test("fails closed when finite f64 geometry overflows during f32 conversion", () => {
    const coordinateSpace = new Object3D()
    coordinateSpace.updateWorldMatrix()
    const object = new Object3D()
    object.presentationClips = [{
      kind: "rounded-rect",
      coordinateSpace,
      center: [Number.MAX_VALUE, 0],
      halfSize: [10, 10],
      radii: [2, 2, 2, 2],
    }]

    const upload = encodePresentationClipChains([object])
    expect(upload.ranges.get(object)).toEqual({start: 0, count: 1})
    expect(upload.data.every(Number.isFinite)).toBeTrue()
    expect([...upload.data.slice(16, 20)]).toEqual([0, 0, -1, -1])
  })

  test("interns one three-record range for ten thousand identical chains", () => {
    let inverseComputations = 0
    const spaces = Array.from({length: 3}, (_, index) => {
      const space = new Object3D()
      space.position.set(index * 2, -index, 0)
      space.updateWorldMatrix()
      const determinant = space.matrixWorld.determinant.bind(space.matrixWorld)
      space.matrixWorld.determinant = () => {
        inverseComputations += 1
        return determinant()
      }
      return space
    })
    const objects = Array.from({length: 10_000}, () => {
      const object = new Object3D()
      object.presentationClips = spaces.map((coordinateSpace, index) => ({
        kind: "rounded-rect" as const,
        coordinateSpace,
        center: [index * 0.25, -index * 0.5] as const,
        halfSize: [10 - index, 8 - index] as const,
        radii: [2, 3, 4, 1] as const,
      }))
      return object
    })

    const upload = encodePresentationClipChains(objects, {maxRecords: 8})
    const sharedRange = upload.ranges.get(objects[0]!)!
    expect(upload.data).toHaveLength(PRESENTATION_CLIP_RECORD_FLOATS * 3)
    expect(upload.ranges.size).toBe(10_000)
    expect(sharedRange).toEqual({start: 0, count: 3})
    expect(new Set(upload.ranges.values()).size).toBe(1)
    expect(inverseComputations).toBe(3)
  })

  test("writes the clip range into the free tail of each 256-byte object block", () => {
    type RendererProbe = {
      perObjectDataCPU: Float32Array
      boneMatricesDataCPU: Float32Array
      presentationClipRanges: ReadonlyMap<Object3D, PresentationClipRange>
      updatePerObjectData(items: RenderItem[]): void
    }
    const mesh = new Mesh(new PlaneGeometry({width: 1, height: 1}), new MeshBasicMaterial())
    const item: RenderItem = {type: "static-mesh", object: mesh, worldMatrix: new Matrix4()}
    const renderer = new Renderer() as unknown as RendererProbe
    renderer.perObjectDataCPU = new Float32Array(64)
    renderer.boneMatricesDataCPU = new Float32Array(128 * 16)
    renderer.presentationClipRanges = new Map([[mesh, {start: 7, count: 3}]])

    renderer.updatePerObjectData([item])

    expect([...renderer.perObjectDataCPU.slice(PRESENTATION_CLIP_RANGE_FLOAT_OFFSET, PRESENTATION_CLIP_RANGE_FLOAT_OFFSET + 4)])
      .toEqual([7, 3, 0, 0])
  })

  test("rejects unsupported clipped renderables instead of rendering them unclipped", () => {
    const basic = new Mesh(new PlaneGeometry({width: 1, height: 1}), new MeshBasicMaterial())
    const lambert = new Mesh(new PlaneGeometry({width: 1, height: 1}), new MeshLambertMaterial())
    const matrix = new Matrix4()
    expect(renderItemSupportsPresentationClips({type: "static-mesh", object: basic, worldMatrix: matrix})).toBeTrue()
    expect(renderItemSupportsPresentationClips({type: "static-mesh", object: lambert, worldMatrix: matrix})).toBeFalse()
  })
})
