import {describe, expect, test} from "bun:test"
import {uiIcons} from "./icons.ts"

describe("@ui/components icons", () => {
  test("owns stable SVG data URLs for document img elements", () => {
    expect(Object.keys(uiIcons).length).toBeGreaterThan(40)
    expect(uiIcons.run).toStartWith("data:image/svg+xml;charset=utf-8,")
    expect(decodeURIComponent(uiIcons.breakpointActive)).toContain("<circle")
    expect(uiIcons.resume).toBe(uiIcons.run)
    expect(uiIcons.recognition).toBe(uiIcons.image)
  })

  test("has no Engine, Layout or Elements implementation dependency", async () => {
    const source = await Bun.file(new URL("icons.ts", import.meta.url)).text()
    for (const forbidden of ["@engine/core", "@layout/core", "@ui/elements", "UiSurface", "UiRuntime"]) {
      expect(source).not.toContain(forbidden)
    }
    const manifest = await Bun.file(new URL("./package.json", import.meta.url)).json() as {
      exports: Record<string, string>
    }
    expect(manifest.exports["./icons"]).toBe("./icons.ts")
  })
})
