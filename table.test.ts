import {describe, expect, test} from "bun:test"
import {UiSurface} from "@layout/core/surface"
import {Table, normalizeTableSelection, tableSelectionAfterClick} from "./table.ts"

const ROWS = ["rowid:1", "rowid:2", "rowid:3", "rowid:4"]

type DrawTextCall = Parameters<UiSurface["drawText"]>

class TableInteractionSurface extends UiSurface {
  override measureText(text: string, fontPx: number): number { return text.length * fontPx * 0.6 }
  override drawText(...args: DrawTextCall): number { return this.measureText(args[0], args[3].fontPx) }
  override drawRoundedRect(): void {}
  override drawRect(): void {}
  override pushClip(): void {}
  override popClip(): void {}
  protected render(): void {}
}

describe("table selection model", () => {
  test("normalizes selection against visible row ids", () => {
    expect(normalizeTableSelection(ROWS, ["missing", "rowid:2", "rowid:2", "rowid:4"])).toEqual(["rowid:2", "rowid:4"])
  })

  test("applies single and additive clicks", () => {
    expect(tableSelectionAfterClick(ROWS, ["rowid:1"], "rowid:3", "rowid:1").selectedRowIds).toEqual(["rowid:3"])
    expect(tableSelectionAfterClick(ROWS, ["rowid:1"], "rowid:3", "rowid:1", {metaKey: true}).selectedRowIds).toEqual([
      "rowid:1",
      "rowid:3",
    ])
    expect(tableSelectionAfterClick(ROWS, ["rowid:1", "rowid:3"], "rowid:1", "rowid:1", {ctrlKey: true}).selectedRowIds).toEqual([
      "rowid:3",
    ])
  })

  test("selects a shift range from the anchor", () => {
    expect(tableSelectionAfterClick(ROWS, ["rowid:1"], "rowid:4", "rowid:1", {shiftKey: true}).selectedRowIds).toEqual([
      "rowid:1",
      "rowid:2",
      "rowid:3",
      "rowid:4",
    ])
  })

  test("lets an interactive cell win over its owning row hit", () => {
    const surface = new TableInteractionSurface()
    const actions: string[] = []
    Table(surface, 0, 0, 100, 80, {
      key: "interactive-table",
      columns: [
        {key: "name", width: 50},
        {key: "value", width: 50},
      ],
      rows: [{name: "Alpha", value: 1}],
      isCellInteractive: ({columnIndex}) => columnIndex === 0,
      onCellClick: ({column}) => { actions.push(`cell:${column.key}`) },
      onRowClick: () => { actions.push("row") },
    })

    expect(surface.pointerHitKey(10, 35)).toBe("interactive-table:cell:0:name")
    const pointer = {button: 0, detail: 1, preventDefault() {}} as MouseEvent
    surface.onPointerDown(pointer, 10, 35)
    surface.onPointerUp(pointer, 10, 35)
    expect(actions).toEqual(["cell:name"])
  })
})
