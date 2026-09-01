import {describe, expect, test} from "bun:test"
import {
  applyIcon,
  chevronDownIcon,
  closeIcon,
  clearIcon,
  databaseIcon,
  executionPointIcon,
  expandIcon,
  folderIcon,
  imageIcon,
  languageIcon,
  minusIcon,
  pickerIcon,
  pinIcon,
  plusIcon,
  resourceIcon,
  runIcon,
  searchIcon,
  settingsIcon,
  uiIcons,
  visibilityOnIcon,
  breakpointIcon,
} from "./icons.ts"

describe("@ui/components icons", () => {
  test("owns stable SVG data URLs for document img elements", () => {
    expect(Object.keys(uiIcons).length).toBeGreaterThan(40)
    expect(uiIcons.run).toStartWith("data:image/svg+xml;charset=utf-8,")
    expect(decodeURIComponent(uiIcons.breakpointActive)).toContain("<circle")
    expect(uiIcons.resume).toBe(uiIcons.run)
    expect(uiIcons.recognition).toBe(uiIcons.image)
    expect([
      runIcon,
      clearIcon,
      plusIcon,
      minusIcon,
      closeIcon,
      applyIcon,
      searchIcon,
      chevronDownIcon,
      folderIcon,
      pickerIcon,
      resourceIcon,
      pinIcon,
      settingsIcon,
      languageIcon,
      executionPointIcon,
      breakpointIcon,
      databaseIcon,
      expandIcon,
      visibilityOnIcon,
      imageIcon,
    ]).toEqual([
      uiIcons.run,
      uiIcons.clear,
      uiIcons.plus,
      uiIcons.minus,
      uiIcons.close,
      uiIcons.apply,
      uiIcons.search,
      uiIcons.chevronDown,
      uiIcons.folder,
      uiIcons.picker,
      uiIcons.resource,
      uiIcons.pin,
      uiIcons.settings,
      uiIcons.language,
      uiIcons.executionPoint,
      uiIcons.breakpoint,
      uiIcons.database,
      uiIcons.expand,
      uiIcons.visibilityOn,
      uiIcons.image,
    ])
  })

  test("keeps production control imports tree-shakeable without the aggregate catalog", async () => {
    const sources = await Promise.all([
      Bun.file(new URL("controls/path-control.tsx", import.meta.url)).text(),
      Bun.file(new URL("controls/reference-control.tsx", import.meta.url)).text(),
      Bun.file(new URL("notification.tsx", import.meta.url)).text(),
      Bun.file(new URL("controls/collection-control.tsx", import.meta.url)).text(),
      Bun.file(new URL("inspector.tsx", import.meta.url)).text(),
      Bun.file(new URL("hud.tsx", import.meta.url)).text(),
      Bun.file(new URL("controls/enum-control.tsx", import.meta.url)).text(),
    ])
    expect(sources.every((source) => /from "\.\.?\/icon-assets\.ts"/u.test(source))).toBeTrue()
    expect(sources.every((source) => !/from "\.\.?\/icons\.ts"/u.test(source))).toBeTrue()
    expect(await Bun.file(new URL("controls/number-control.tsx", import.meta.url)).text()).not.toContain("icon-assets")
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
