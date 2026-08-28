import {describe, expect, test} from "bun:test"
import {Event, createDocument} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {List, listComponentCss} from "./list-component.tsx"
import {Table, tableComponentCss} from "./table-component.tsx"

describe("compiled keyed collections", () => {
  test("List retains keyed rows and standard selection proposals", () => {
    expect(isCompiledTemplate(List)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const selected: string[] = []
    const items = [
      {key: "a", label: "Alpha", detail: "A"},
      {key: "b", label: "Beta", detail: "B"},
      {key: "c", label: "Gamma", detail: "C"}
    ]
    root.render(List as any, {items, selectedKey: "a", onSelect: (key: string) => selected.push(key)})
    const alpha = host.querySelector('[data-item-key="a"]')!
    const beta = host.querySelector('[data-item-key="b"]')!
    beta.dispatchEvent(new Event("click", {bubbles: true}))
    expect(selected).toEqual(["b"])

    root.render(List as any, {items: [items[2]!, items[0]!, items[1]!], selectedKey: "b"})
    const rows = [...host.querySelectorAll("li")]
    expect(rows.map(row => row.getAttribute("data-item-key"))).toEqual(["c", "a", "b"])
    expect(rows[1]).toBe(alpha)
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
      viewport: {width: 360, height: 220},
      styleSheets: [listComponentCss, tableComponentCss]
    })
    const frame = renderer.flush()
    expect(frame.boxByNode.get(list)?.width).toBe(300)
    expect(frame.boxByNode.get(row)?.height).toBe(24)
    expect(listComponentCss).not.toContain(".ui-")
    expect(tableComponentCss).not.toContain(".ui-")
    renderer.dispose()
    root.unmount()
  })
})
