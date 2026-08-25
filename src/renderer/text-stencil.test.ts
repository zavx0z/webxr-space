import { describe, expect, test } from "bun:test"
import {
  TEXT_COVER_FACE_STATE,
  TEXT_STENCIL_BACK_FACE_STATE,
  TEXT_STENCIL_FACE_STATE,
} from "./text-stencil"
import {Matrix4} from "../math/matrix-4"
import {TextMaterial} from "../materials/text-material"
import type {Text} from "../objects/text"
import {Renderer} from "./index"
import {textShader} from "./shaders/ui-shaders"

type RendererProbe = {
  perObjectDataCPU: Float32Array
  updateTextData(text: Text, worldMatrix: Matrix4, offsetFloats: number, isStencil: boolean): void
}

describe("text stencil config", () => {
  test("text stencil сохраняет winding mask до cover-pass", () => {
    expect(TEXT_STENCIL_FACE_STATE.passOp).toBe("increment-wrap")
    expect(TEXT_STENCIL_BACK_FACE_STATE.passOp).toBe("decrement-wrap")
  })

  test("text cover очищает stencil после заливки glyph", () => {
    expect(TEXT_COVER_FACE_STATE.compare).toBe("not-equal")
    expect(TEXT_COVER_FACE_STATE.passOp).toBe("zero")
  })

  test("text stencil and cover apply the same framebuffer clip", () => {
    expect(textShader).toContain("fn applyClip(position: vec4<f32>, worldPosition: vec3<f32>) -> f32")
    expect(textShader.match(/applyClip\(in\.position, in\.worldPosition\)/g)).toHaveLength(2)
  })

  test("uploads the same framebuffer clip for stencil and cover passes", () => {
    const clipBounds: [number, number, number, number] = [11, 23, 47, 59]
    const text = {
      clipBounds,
      material: new TextMaterial(),
    } as Text
    const renderer = new Renderer() as unknown as RendererProbe
    renderer.perObjectDataCPU = new Float32Array(128)

    renderer.updateTextData(text, new Matrix4(), 0, true)
    renderer.updateTextData(text, new Matrix4(), 64, false)

    expect([...renderer.perObjectDataCPU.slice(36, 40)]).toEqual(clipBounds)
    expect([...renderer.perObjectDataCPU.slice(100, 104)]).toEqual(clipBounds)
  })
})
