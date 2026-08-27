import {describe, expect, test} from "bun:test"
import {
  activeSyntaxTheme,
  activeSyntaxThemeName,
  resolveSyntaxScopeColorHex,
} from "./syntax-theme.ts"

describe("@ui/components syntax theme", () => {
  test("owns the source-backed Islands Dark theme without retained UI owners", () => {
    expect(activeSyntaxThemeName).toBe("Islands Dark")
    expect(activeSyntaxTheme.type).toBe("dark")
    expect(activeSyntaxTheme.tokenColors?.length).toBeGreaterThan(20)
  })

  test("resolves exact scopes first, then parent scopes and editor fallback", () => {
    expect(resolveSyntaxScopeColorHex(["comment.block.documentation"]))
      .toBe("#5f826b")
    expect(resolveSyntaxScopeColorHex(["constant.numeric.hex"]))
      .toBe("#2aacb8")
    expect(resolveSyntaxScopeColorHex(["unknown.scope"]))
      .toBe("#bcbec4")
    expect(resolveSyntaxScopeColorHex(["unknown.scope"], "#abc"))
      .toBe("#aabbcc")
  })

  test("has no Engine, Layout or Elements implementation dependency", async () => {
    const source = await Bun.file(new URL("syntax-theme.ts", import.meta.url)).text()
    for (const forbidden of ["@engine/core", "@layout/core", "@ui/elements", "UiSurface", "UiRuntime"]) {
      expect(source).not.toContain(forbidden)
    }
    const manifest = await Bun.file(new URL("./package.json", import.meta.url)).json() as {
      exports: Record<string, string>
    }
    expect(manifest.exports["./syntax-theme"]).toBe("./syntax-theme.ts")
  })
})
