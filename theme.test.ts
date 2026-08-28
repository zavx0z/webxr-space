import {describe, expect, test} from "bun:test"
import {resolveWidgetColors, rgba8ToColor, uiTheme, widgetCssVariables} from "./theme.ts"

describe("DOM component theme", () => {
  test("keeps class-specific source roles immutable", () => {
    expect(Object.isFrozen(uiTheme)).toBeTrue()
    expect(Object.isFrozen(uiTheme.widgets.number)).toBeTrue()
    expect(uiTheme.widgets.text.inner).not.toEqual(uiTheme.widgets.regular.inner)
    expect(uiTheme.material.widgetEmboss).toEqual([0, 0, 0, 0x26])
    expect(uiTheme.statusBar.back).toEqual([0x18, 0x18, 0x18, 0xff])
  })

  test("resolves selected, hover and disabled without mutating source", () => {
    const before = uiTheme.widgets.regular.inner
    expect(resolveWidgetColors("regular", {selected: true}).inner)
      .toEqual(uiTheme.widgets.regular.innerSelected)
    expect(resolveWidgetColors("regular", {hovered: true}).inner).not.toEqual(before)
    expect(resolveWidgetColors("regular", {disabled: true}).inner[3]).toBe(127)
    expect(uiTheme.widgets.regular.inner).toBe(before)
  })

  test("exposes renderer-independent CSS colors", () => {
    expect(rgba8ToColor([24, 24, 24, 255])).toBe("rgb(24 24 24)")
    expect(rgba8ToColor([0, 0, 0, 38])).toBe("rgba(0, 0, 0, 0.149)")
    expect(widgetCssVariables("toggle", {selected: true})).toContain("--ui-widget-inner")
  })
})
