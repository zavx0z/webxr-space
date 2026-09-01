import {describe, expect, test} from "bun:test"
import {Event, MouseEvent} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {List} from "./list.tsx"
import {uiIcons} from "./icons.ts"
import {
  Table,
  normalizeTableSelection,
  tableSelectionAfterClick
} from "./table.tsx"
import {createDocument} from "./test-document.ts"

describe("compiled keyed collections", () => {
  test("List retains keyed rows and standard selection proposals", () => {
    expect(isCompiledTemplate(List)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const selected: string[] = []
    const items = [
      {key: "a", label: "Alpha", iconSrc: uiIcons.log, detail: "A"},
      {key: "b", label: "Beta", iconSrc: uiIcons.run, detail: "B"},
      {key: "c", label: "Gamma", iconSrc: uiIcons.visibilityOn, detail: "C"}
    ]
    root.render(List as any, {items, selectedKey: "a", onSelect: (key: string) => selected.push(key)})
    const alpha = host.querySelector('[data-item-key="a"]')!
    const beta = host.querySelector('[data-item-key="b"]')!
    const alphaIcon = alpha.querySelector("img")!
    expect(alphaIcon.getAttribute("src")).toBe(uiIcons.log)
    expect(alphaIcon.getAttribute("alt")).toBe("")
    expect(alphaIcon.getAttribute("aria-hidden")).toBe("true")
    beta.dispatchEvent(new Event("click", {bubbles: true}))
    expect(selected).toEqual(["b"])

    root.render(List as any, {items: [items[2]!, items[0]!, items[1]!], selectedKey: "b"})
    const rows = [...host.querySelectorAll("li")]
    expect(rows.map(row => row.getAttribute("data-item-key"))).toEqual(["c", "a", "b"])
    expect(rows[1]).toBe(alpha)
    expect(rows[1]!.querySelector("img")).toBe(alphaIcon)
    expect(rows[2]).toBe(beta)
    expect(rows[2]!.getAttribute("aria-selected")).toBe("true")
    expect(host.querySelector("ul")!.className).toBe("")
    root.unmount()
  })

  test("Table retains nested row and cell identities across both reorder axes", () => {
    expect(isCompiledTemplate(Table)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const columns = [{key: "name", label: "Name"}, {key: "value", label: "Value"}]
    const rows = [
      {key: "a", cells: {name: "Alpha", value: "1"}},
      {key: "b", cells: {name: "Beta", value: "2"}}
    ]
    const activated: string[] = []
    root.render(Table as any, {columns, rows, onRowActivate: (key: string) => activated.push(key)})
    const rowA = host.querySelector('[data-row-key="a"]')!
    const rowB = host.querySelector('[data-row-key="b"]')!
    const cellAName = rowA.querySelector('[data-column-key="name"]')!
    rowB.dispatchEvent(new Event("click", {bubbles: true}))
    expect(activated).toEqual(["b"])

    root.render(Table as any, {
      columns: [columns[1]!, columns[0]!],
      rows: [rows[1]!, rows[0]!],
      selectedKey: "b"
    })
    const nextRows = [...host.querySelectorAll("tbody tr")]
    expect(nextRows[0]).toBe(rowB)
    expect(nextRows[1]).toBe(rowA)
    expect(rowA.querySelectorAll("td")[1]).toBe(cellAName)
    expect(rowB.getAttribute("aria-selected")).toBe("true")
    expect(host.querySelector("table")!.className).toBe("")
    root.unmount()
  })

  test("Table restores single, additive and Shift-range selection proposals", () => {
    const keys = ["a", "b", "c", "d"]
    expect(normalizeTableSelection(keys, ["missing", "b", "b", "d"])).toEqual(["b", "d"])
    expect(tableSelectionAfterClick(keys, ["a"], "c", "a").selectedKeys).toEqual(["c"])
    expect(tableSelectionAfterClick(keys, ["a"], "c", "a", {metaKey: true}).selectedKeys).toEqual(["a", "c"])
    expect(tableSelectionAfterClick(keys, ["a", "c"], "a", "a", {ctrlKey: true}).selectedKeys).toEqual(["c"])
    expect(tableSelectionAfterClick(keys, ["a"], "d", "a", {shiftKey: true}).selectedKeys).toEqual(keys)
  })

  test("lets an interactive cell own activation before its row", () => {
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const actions: string[] = []
    const selections: string[][] = []
    root.render(Table as any, {
      columns: [{key: "name", label: "Name"}, {key: "value", label: "Value"}],
      rows: [{key: "a", cells: {name: "Alpha", value: 1}}],
      selectedKeys: [],
      isCellInteractive: (context: {columnIndex: number}) => context.columnIndex === 0,
      onCellActivate: (context: {column: {key: string}}) => actions.push(`cell:${context.column.key}`),
      onRowActivate: () => actions.push("row"),
      onSelectionChange: (update: {selectedKeys: readonly string[]}) => selections.push([...update.selectedKeys])
    })
    const cells = host.querySelectorAll("td")
    cells[0]!.dispatchEvent(new MouseEvent("click", {bubbles: true}))
    expect(actions).toEqual(["cell:name"])
    expect(selections).toEqual([])
    cells[1]!.dispatchEvent(new MouseEvent("click", {bubbles: true, shiftKey: true}))
    expect(actions).toEqual(["cell:name", "row"])
    expect(selections).toEqual([["a"]])
    expect(cells[0]!.getAttribute("data-interactive")).toBe("true")

    root.render(Table as any, {
      columns: [{key: "name", label: "Name"}, {key: "value", label: "Value"}],
      rows: [{key: "a", cells: {name: "Alpha", value: 1}}],
      disabled: true,
      isCellInteractive: () => true,
      onCellActivate: () => actions.push("disabled-cell"),
      onRowActivate: () => actions.push("disabled-row")
    })
    host.querySelector("td")!.dispatchEvent(new MouseEvent("click", {bubbles: true}))
    expect(actions).toEqual(["cell:name", "row"])
    expect(host.querySelector("td")!.getAttribute("data-interactive")).toBeNull()
    expect(host.querySelector("td")!.getAttribute("aria-disabled")).toBe("true")
    root.unmount()
  })

  test("keeps exact compact collection geometry with class-free sheets", () => {
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    root.render(List as any, {items: [{key: "a", label: "Alpha"}], dense: true})
    const list = host.querySelector("ul")!
    const row = list.querySelector("li")!
    const renderer = createDocumentRenderer({
      document,
      root: host,
      viewport: {width: 360, height: 220}
    })
    const frame = renderer.flush()
    expect(frame.boxByNode.get(list)?.width).toBe(300)
    expect(frame.boxByNode.get(row)?.height).toBe(24)
    renderer.dispose()
    root.unmount()
  })
})
