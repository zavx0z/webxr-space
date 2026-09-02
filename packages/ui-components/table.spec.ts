import {describe, expect, test} from "bun:test"
import {Event} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "./document.fixture.ts"
import {TableFixture} from "./table.fixture.tsx"
import {Table} from "./table.tsx"

describe("compiled production Table", () => {
  test("keeps controlled keyed row selection in its adjacent consumer fixture", () => {
    expect(isCompiledTemplate(Table)).toBe(true)
    expect(isCompiledTemplate(TableFixture)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const columns = [{key: "name", label: "Name"}]
    const rows = [{key: "input", cells: {name: "Input"}}, {key: "output", cells: {name: "Output"}}]

    root.render(TableFixture as any, {columns, rows, selectedKey: "input"})
    const input = host.querySelector('[data-row-key="input"]')!
    const output = host.querySelector('[data-row-key="output"]')!
    output.dispatchEvent(new Event("click", {bubbles: true}))
    expect(output.getAttribute("aria-selected")).toBe("true")

    root.render(TableFixture as any, {columns, rows: [rows[1]!, rows[0]!], selectedKey: "input"})
    expect(host.querySelector('[data-row-key="input"]')).toBe(input)
    expect(host.querySelector('[data-row-key="output"]')).toBe(output)
    expect(output.getAttribute("aria-selected")).toBe("true")
    root.unmount()
  })
})
