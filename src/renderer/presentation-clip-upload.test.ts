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
    expect(upload.ranges.get(plain)).toEqual({start: 2, count: 0})
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
