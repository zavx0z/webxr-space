import {describe, expect, test} from "bun:test"
import {Color} from "@engine/core"
import {rgba8ToColor, uiTheme, resolveWidgetColors} from "@ui/elements"
import {UiSurface, type UiSurface as UiSurfaceType} from "@layout/core/surface"
import {Pane} from "./pane.ts"

type RoundedRectCall = Parameters<UiSurfaceType["drawRoundedRect"]>

class RecordingSurface extends UiSurface {
  readonly roundedRects: RoundedRectCall[] = []
  override drawRoundedRect(...args: RoundedRectCall): void { this.roundedRects.push(args) }
  protected render(): void {}
}

describe("Pane Blender appearance", () => {
  test("maps panel, active panel and box materials", () => {
    const panel = new RecordingSurface()
    Pane(panel, 0, 0, 100, 80, {appearance: "panel"})
    expect(panel.roundedRects[0]?.[4]).toMatchObject({
      fill: rgba8ToColor(uiTheme.spaceNode.panel.back),
      border: rgba8ToColor(uiTheme.material.editorBorder),
      radius: 6,
    })
    expect(panel.roundedRects[1]?.[4]).toMatchObject({
      fill: null,
      border: rgba8ToColor(uiTheme.material.editorOutline),
      radius: 6,
    })

    const active = new RecordingSurface()
    Pane(active, 0, 0, 100, 80, {appearance: "panel", active: true})
    expect(active.roundedRects[0]?.[4].border).toEqual(rgba8ToColor(uiTheme.material.editorBorder))
    expect(active.roundedRects[1]?.[4].border).toEqual(rgba8ToColor(uiTheme.material.editorOutlineActive))

    const box = new RecordingSurface()
    Pane(box, 0, 0, 100, 80, {appearance: "box"})
    const colors = resolveWidgetColors("box")
    expect(box.roundedRects[0]?.[4]).toMatchObject({
      fill: rgba8ToColor(colors.inner),
      border: rgba8ToColor(colors.outline),
      radius: 4,
    })
  })

  test("keeps ordinary panes on panel radius and editor panels on editor-area radius", () => {
    const ordinary = new RecordingSurface()
    Pane(ordinary, 0, 0, 100, 80)
    expect(ordinary.roundedRects[0]?.[4].radius).toBe(4)

    const surface = new RecordingSurface()
    Pane(surface, 0, 0, 100, 80, {appearance: "panel"})

    expect(surface.roundedRects.map((call) => call[4].radius)).toEqual([
      6,
      6,
    ])
  })

  test("keeps explicit fill and border stronger", () => {
    const fill = new Color(0.1, 0.2, 0.3, 0.4)
    const border = new Color(0.5, 0.6, 0.7, 0.8)
    const surface = new RecordingSurface()
    Pane(surface, 0, 0, 100, 80, {appearance: "panel", style: {background: fill, borderColor: border}})
    expect(surface.roundedRects[0]?.[4]).toMatchObject({fill, border})
  })

  test("keeps explicit style radius stronger on the panel and its outline", () => {
    const surface = new RecordingSurface()
    Pane(surface, 0, 0, 100, 80, {appearance: "panel", style: {borderRadius: 9}})
    expect(surface.roundedRects.map((call) => call[4].radius)).toEqual([9, 9])
  })
})
