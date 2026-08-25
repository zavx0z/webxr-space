import {describe, expect, test} from "bun:test"
import {Mesh} from "../core/mesh"
import {PlaneGeometry} from "../geometries/plane-geometry"
import {Matrix4} from "../math/matrix-4"
import {MeshBasicMaterial} from "../materials/mesh-basic-material"
import {Renderer} from "./index"
import {meshBasicShader} from "./shaders/ui-shaders"

type RendererProbe = {
  perObjectDataCPU: Float32Array
  updateMeshData(mesh: Mesh, worldMatrix: Matrix4, offsetFloats: number): void
}

describe("MeshBasicMaterial framebuffer clip", () => {
  test("uploads the optional clip to the shader-owned per-object slot", () => {
    const material = new MeshBasicMaterial()
    material.clipBounds = [11, 23, 47, 59]
    const mesh = new Mesh(new PlaneGeometry({width: 1, height: 1}), material)
    const renderer = new Renderer() as unknown as RendererProbe
    renderer.perObjectDataCPU = new Float32Array(64)

    renderer.updateMeshData(mesh, new Matrix4(), 0)

    expect([...renderer.perObjectDataCPU.slice(36, 40)]).toEqual(material.clipBounds)
  })

  test("discards fragments outside the same framebuffer clip slot", () => {
    expect(meshBasicShader).toContain("clipBounds: vec4<f32>")
    expect(meshBasicShader).toContain("in.position.x < b.x")
    expect(meshBasicShader).toContain("in.position.y > b.w")
    expect(meshBasicShader).toContain("discard")
  })
})
