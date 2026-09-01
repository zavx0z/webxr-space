import {describe, expect, test} from "bun:test"
import {Event} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {CollectionField} from "./collection-field.tsx"

describe("compiled production CollectionField", () => {
  test("composes CollectionControl with direct item ownership", () => {
    expect(isCompiledTemplate(CollectionField)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const selected: string[] = []
    root.render(CollectionField as any, {id: "items", label: "Items", items: [{id: "a", label: "Alpha"}], selectedId: null, onSelect: (id: string) => selected.push(id)})
    host.querySelector('[data-item-key="a"]')!.dispatchEvent(new Event("click", {bubbles: true}))
    expect(selected).toEqual(["a"])
    root.unmount()
  })
})
