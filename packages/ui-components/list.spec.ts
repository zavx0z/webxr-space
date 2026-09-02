import {describe, expect, test} from "bun:test"
import {Event} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "./document.fixture.ts"
import {ListFixture} from "./list.fixture.tsx"
import {List} from "./list.tsx"

describe("compiled production List", () => {
  test("keeps controlled keyed selection in its adjacent consumer fixture", () => {
    expect(isCompiledTemplate(List)).toBe(true)
    expect(isCompiledTemplate(ListFixture)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const items = [{key: "input", label: "Input"}, {key: "output", label: "Output"}]

    root.render(ListFixture as any, {items, selectedKey: "input"})
    const input = host.querySelector('[data-item-key="input"]')!
    const output = host.querySelector('[data-item-key="output"]')!
    output.dispatchEvent(new Event("click", {bubbles: true}))
    expect(output.getAttribute("aria-selected")).toBe("true")

    root.render(ListFixture as any, {items: [items[1]!, items[0]!], selectedKey: "input"})
    expect(host.querySelector('[data-item-key="input"]')).toBe(input)
    expect(host.querySelector('[data-item-key="output"]')).toBe(output)
    expect(output.getAttribute("aria-selected")).toBe("true")
    root.unmount()
  })
})
