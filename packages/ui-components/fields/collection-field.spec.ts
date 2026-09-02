import {describe, expect, test} from "bun:test"
import {Event, type HTMLButtonElement} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {CollectionFieldFixture} from "./collection-field.fixture.tsx"
import {CollectionField} from "./collection-field.tsx"

describe("compiled production CollectionField", () => {
  test("keeps selection inspectable while readOnly blocks collection mutation", () => {
    expect(isCompiledTemplate(CollectionField)).toBe(true)
    expect(isCompiledTemplate(CollectionFieldFixture)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const events: string[] = []
    root.render(CollectionField as any, {label: "Items", items: [{id: "a", label: "Alpha"}, {id: "b", label: "Beta"}], selectedId: "a", visibleRows: 4, readOnly: true, onSelect: (id: string) => events.push(`select:${id}`), onAdd: () => events.push("add")})
    host.querySelector('[data-item-key="b"]')!.dispatchEvent(new Event("click", {bubbles: true}))
    const add = ([...host.querySelectorAll("button")] as HTMLButtonElement[]).find(button => button.title === "Add item")!
    add.click()
    expect(events).toEqual(["select:b"])
    const list = host.querySelector("ul")!
    const renderer = createDocumentRenderer({document, root: host, viewport: {width: 480, height: 240}})
    expect(renderer.flush().boxByNode.get(list)?.height).toBe(110)
    renderer.dispose()
    root.render(CollectionFieldFixture as any, {})
    expect(host.textContent).toContain("Items")
    root.unmount()
  })
})
