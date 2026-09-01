import {describe, expect, test} from "bun:test"
import {MAX_PRESENTATION_CLIPS_PER_OBJECT} from "../presentation-clip-upload"
import {composePresentationClipShader} from "./presentation-clip"
import {
  colorPickerShader,
  imageExternalShader,
  imageShader,
  meshBasicShader,
  radialBackdropShader,
  roundedShader,
  strokedPathInstancedShader,
  textShader,
} from "./ui-shaders"

const clippedShaders = [
  meshBasicShader,
  textShader,
  imageShader,
  imageExternalShader,
  roundedShader,
  colorPickerShader,
  radialBackdropShader,
  strokedPathInstancedShader,
]

describe("presentation clip shader composition", () => {
  test("shares one storage-backed rounded clip evaluator across every UiSurface pipeline", () => {
    for (const shader of clippedShaders) {
      expect(shader).not.toContain("// @engine-presentation-clip")
      expect(shader).toContain("var<storage, read> presentationClipRecords")
      expect(shader).toContain("fn presentationClipCoverage(")
      expect(shader).toContain(`const MAX_PRESENTATION_CLIPS_PER_OBJECT: u32 = ${MAX_PRESENTATION_CLIPS_PER_OBJECT}u`)
      expect(shader).toContain("if (requestedCount > MAX_PRESENTATION_CLIPS_PER_OBJECT)")
      expect(shader).toContain("offset < MAX_PRESENTATION_CLIPS_PER_OBJECT")
      expect(shader).toContain("presentationClipSdRoundBox")
      expect(shader).toContain("presentationClipRange: vec4<f32>")
      expect(shader).toContain("worldPosition: vec3<f32>")
      expect(shader).toMatch(/presentationClipCoverage\((?:in\.)?worldPosition, perObject\.presentationClipRange\)/)
    }
  })

  test("requires exactly one composition marker", () => {
    expect(() => composePresentationClipShader("fn main() {}"))
      .toThrow("exactly one presentation clip marker")
    expect(() => composePresentationClipShader("// @engine-presentation-clip\n// @engine-presentation-clip"))
      .toThrow("exactly one presentation clip marker")
  })
})
