import {describe, expect, test} from "bun:test"
import {Mesh} from "../core/mesh"
import {PlaneGeometry} from "../geometries/plane-geometry"
import {Matrix4} from "../math/matrix-4"
import {RoundedRectMaterial} from "../materials/rounded-rect-material"
import {Renderer} from "./index"
import {roundedShader} from "./shaders/ui-shaders"

type RendererProbe = {
  perObjectDataCPU: Float32Array
  updateMeshData(mesh: Mesh, worldMatrix: Matrix4, offsetFloats: number): void
}

const uploadedParams = (material: RoundedRectMaterial): number[] => {
  const mesh = new Mesh(new PlaneGeometry({width: 1, height: 1}), material)
  const renderer = new Renderer() as unknown as RendererProbe
  renderer.perObjectDataCPU = new Float32Array(64)
  renderer.updateMeshData(mesh, new Matrix4(), 0)
  return [...renderer.perObjectDataCPU.slice(48, 52)]
}

const uploadedBorderWidths = (material: RoundedRectMaterial): number[] => {
  const mesh = new Mesh(new PlaneGeometry({width: 1, height: 1}), material)
  const renderer = new Renderer() as unknown as RendererProbe
  renderer.perObjectDataCPU = new Float32Array(64)
  renderer.updateMeshData(mesh, new Matrix4(), 0)
  return [...renderer.perObjectDataCPU.slice(60, 64)]
}

describe("RoundedRectMaterial analytical shadow", () => {
  test("uploads explicit transparent fill alpha and keeps border/shader alpha authoritative", () => {
    const material = new RoundedRectMaterial({
      width: 2,
      height: 1,
      radius: {tl: 0.1, tr: 0.2, br: 0.3, bl: 0.4},
      fill: null,
      border: 0x6699cc,
      borderWidth: 0.05,
    })
    const mesh = new Mesh(new PlaneGeometry({width: 2, height: 1}), material)
    const renderer = new Renderer() as unknown as RendererProbe
    renderer.perObjectDataCPU = new Float32Array(64)
    renderer.updateMeshData(mesh, new Matrix4(), 0)

    expect([...renderer.perObjectDataCPU.slice(32, 36)]).toEqual([1, 1, 1, 0])
    expect(renderer.perObjectDataCPU[39]).toBe(1)
    expect([...renderer.perObjectDataCPU.slice(44, 48)]).toEqual([0.1, 0.2, 0.3, 0.4].map(Math.fround))
    expect(roundedShader).toContain("perObject.fill.rgb * fillStrength * perObject.fill.a")
    expect(roundedShader).toContain("fillStrength * perObject.fill.a + borderStrength * perObject.border.a")
  })

  test("preserves ordinary uniform packing and uses the existing spare params", () => {
    const ordinary = new RoundedRectMaterial({
      width: 2,
      height: 1,
      radius: 0.2,
      borderWidth: 0.05,
      opacity: 0.75,
    })
    const shadow = new RoundedRectMaterial({
      width: 2,
      height: 1,
      radius: 0.2,
      opacity: 0.5,
      shadowBlur: 0.25,
      shadowSpread: 0.125,
    })

    const ordinaryParams = uploadedParams(ordinary)
    expect(ordinaryParams[0]).toBeCloseTo(0.05)
    expect(ordinaryParams.slice(1)).toEqual([0.75, 0, 0])
    expect(uploadedBorderWidths(ordinary)).toEqual([0.05, 0.05, 0.05, 0.05].map(Math.fround))
    expect(uploadedParams(shadow)).toEqual([0, 0.5, 0.25, 0.125])
  })

  test("uploads canonical asymmetric edges in the final spare vec4", () => {
    const material = new RoundedRectMaterial({
      width: 4,
      height: 2,
      radius: 0,
      borderWidths: [0.1, 0.2, 0.3, 0.4],
    })

    expect(uploadedParams(material)[0]).toBe(0)
    expect(uploadedBorderWidths(material)).toEqual([0.1, 0.2, 0.3, 0.4].map(Math.fround))
    expect(roundedShader).toContain("borderWidths: vec4<f32>")
    expect(roundedShader).toContain("let uniformBorderWidths = all(borderWidths == vec4<f32>(borderWidth));")
    expect(roundedShader).toContain("-halfSize.x + borderWidths.w")
    expect(roundedShader).toContain("-halfSize.y + borderWidths.z")
    expect(roundedShader).toContain("halfSize.x - borderWidths.y")
    expect(roundedShader).toContain("halfSize.y - borderWidths.x")
    expect(roundedShader).toContain("p - innerCenter")
    expect(roundedShader).toContain("vec4<f32>(0.0)")
  })

  test("fails upload before mutation when public data becomes non-uniform and rounded", () => {
    const material = new RoundedRectMaterial({
      width: 4,
      height: 2,
      radius: 0.25,
      borderWidth: 0.1,
    })
    const unsafe = material.borderWidths as unknown as number[]
    unsafe[1] = 0.2
    const mesh = new Mesh(new PlaneGeometry({width: 4, height: 2}), material)
    const renderer = new Renderer() as unknown as RendererProbe
    renderer.perObjectDataCPU = new Float32Array(64)

    expect(() => renderer.updateMeshData(mesh, new Matrix4(), 0)).toThrow(
      "require zero corner radii",
    )
    expect([...renderer.perObjectDataCPU]).toEqual(new Array(64).fill(0))
  })

  test("keeps the ordinary rounded branch and adds one texture-free analytical fade", () => {
    expect(roundedShader).toContain("let dOuter = sdRoundBox(p, halfSize, radii);")
    expect(roundedShader).toContain("let outerMask = 1.0 - smoothstep(-aa, aa, dOuter);")
    expect(roundedShader).toContain("if (!any(borderWidths > vec4<f32>(0.0)))")
    expect(roundedShader).toContain("if (uniformBorderWidths)")
    expect(roundedShader).toContain("let dInner = sdRoundBox(p, innerHalf, innerRadii);")
    expect(roundedShader).toContain("let shadowBlur = perObject.params.z;")
    expect(roundedShader).toContain("let shadowSpread = perObject.params.w;")
    expect(roundedShader).toContain("let shadowDistance = dOuter - shadowSpread;")
    expect(roundedShader).toContain("smoothstep(-shadowBlur, shadowBlur, shadowDistance)")
    expect(roundedShader).not.toContain("max(shadowBlur, aa)")
    expect(roundedShader.match(/@binding\(/g)).toHaveLength(3)
    expect(roundedShader).not.toContain("texture_2d")
    expect(roundedShader).not.toContain("textureSample")
    expect(roundedShader).not.toContain("sampler")
  })
})
