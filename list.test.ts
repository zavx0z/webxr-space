import {describe, expect, test} from "bun:test"
import {rgba8ToColor, resolveWidgetColors} from "@ui/elements"
import {type UiSurface, UiSurface as BaseUiSurface} from "@layout/core/surface"
import {Color} from "@engine/core"
import {ListItemButton} from "./list.ts"

type HitCall = Parameters<UiSurface["hit"]>
type RoundedRectCall = Parameters<UiSurface["drawRoundedRect"]>

class RecordingSurface extends BaseUiSurface {
  readonly hits: HitCall[] = []
  readonly roundedRects: RoundedRectCall[] = []
  override hit(...args: HitCall): void { this.hits.push(args) }
  override drawRoundedRect(...args: RoundedRectCall): void { this.roundedRects.push(args) }
  protected render(): void {}
}

describe("component ListItemButton", () => {
  test("keeps a tooltip-only row non-clickable with the default cursor", () => {
    const surface = new RecordingSurface()
    ListItemButton(surface, 0, 0, 100, 24, {
      primary: "Description",
      tooltip: "Tooltip",
    })

    expect(surface.hits).toHaveLength(1)
    expect(surface.hits[0]?.[5]).toMatchObject({cursor: "default", tooltip: {label: "Tooltip"}})
  })

  test("delegates selected and disabled material state to Elements li", () => {
    const selected = new RecordingSurface()
    ListItemButton(selected, 0, 0, 100, 24, {primary: "Selected", selected: true})
    const selectedColors = resolveWidgetColors("listItem", {selected: true, listItem: true})
    expect(selected.roundedRects[0]?.[4]).toMatchObject({
      fill: rgba8ToColor(selectedColors.inner),
      border: rgba8ToColor(selectedColors.outline),
    })

    const disabled = new RecordingSurface()
    ListItemButton(disabled, 0, 0, 100, 24, {primary: "Disabled", disabled: true, onClick() {}})
    expect(disabled.hits).toHaveLength(0)
  })

  test("preserves explicit row fill and border overrides", () => {
    const fill = new Color(0.1, 0.2, 0.3, 0.4)
    const border = new Color(0.5, 0.6, 0.7, 0.8)
    const surface = new RecordingSurface()
    ListItemButton(surface, 0, 0, 100, 24, {primary: "Explicit", style: {background: fill, borderColor: border}})
    expect(surface.roundedRects[0]?.[4]).toMatchObject({fill, border})
  })

  test("plans list rows and item content through nested Flex owners", async () => {
    const source = await Bun.file(new URL("./list.ts", import.meta.url)).text()
    expect(source).toContain('import {flexColumn, flexRow} from "@layout/core/flex"')
    expect(source).not.toContain("let rowY =")
    expect(source).not.toContain("let cursorX =")
  })
})
