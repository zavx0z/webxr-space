import {describe, expect, test} from "bun:test"
import {
  clearIcon,
  folderIcon,
  minusIcon,
  pickerIcon,
  plusIcon,
  runIcon,
  uiIcons,
} from "./icons.ts"

describe("@ui/components icons", () => {
  test("owns stable SVG data URLs for document img elements", () => {
    expect(Object.keys(uiIcons).length).toBeGreaterThan(40)
    expect(uiIcons.run).toStartWith("data:image/svg+xml;charset=utf-8,")
    expect(decodeURIComponent(uiIcons.breakpointActive)).toContain("<circle")
    expect(uiIcons.resume).toBe(uiIcons.run)
    expect(uiIcons.recognition).toBe(uiIcons.image)
    expect([runIcon, clearIcon, plusIcon, minusIcon, folderIcon, pickerIcon]).toEqual([
      uiIcons.run,
      uiIcons.clear,
      uiIcons.plus,
      uiIcons.minus,
      uiIcons.folder,
      uiIcons.picker,
    ])
  })

  test("keeps production control imports tree-shakeable without the aggregate catalog", async () => {
    const sources = await Promise.all([
      Bun.file(new URL("path-input.tsx", import.meta.url)).text(),
      Bun.file(new URL("reference-input.tsx", import.meta.url)).text(),
    ])
    expect(sources.every((source) => source.includes('from "./icon-assets.ts"'))).toBeTrue()
    expect(sources.every((source) => !source.includes('from "./icons.ts"'))).toBeTrue()
    expect(await Bun.file(new URL("number-input.tsx", import.meta.url)).text()).not.toContain("icon-assets")
    expect(await Bun.file(new URL("icon-assets.ts", import.meta.url)).text()).not.toContain("uiIcons")
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
