import {describe, expect, test} from "bun:test"
import {Event, createDocument, type HTMLButtonElement} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {CollectionInput, collectionInputCss} from "./collection-input.tsx"

describe("compiled production CollectionInput", () => {
  test("composes List and Buttons with retained keyed items and standard actions", () => {
    expect(isCompiledTemplate(CollectionInput)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const events: string[] = []
    const items = [
      {id: "a", label: "Alpha"},
      {id: "b", label: "Beta"},
      {id: "c", label: "Gamma"}
    ]
    root.render(CollectionInput as any, {
      items,
      selectedId: "b",
      onSelect: (id: string) => events.push(`select:${id}`),
      onAdd: () => events.push("add"),
      onRemove: (id: string) => events.push(`remove:${id}`),
      onMove: (id: string, direction: string) => events.push(`${direction}:${id}`)
    })
    const beta = host.querySelector('[data-item-key="b"]')!
    const buttons = [...host.querySelectorAll("button")] as HTMLButtonElement[]
    beta.dispatchEvent(new Event("click", {bubbles: true}))
    buttons.find(button => button.title === "Add item")!.click()
    buttons.find(button => button.title === "Remove selected item")!.click()
    buttons.find(button => button.title === "Move selected item up")!.click()
    expect(events).toEqual(["select:b", "add", "remove:b", "up:b"])

    root.render(CollectionInput as any, {
      items: [items[2]!, items[1]!, items[0]!],
      selectedId: "b",
      onMove: () => {}
    })
    expect(host.querySelector('[data-item-key="b"]')).toBe(beta)
    expect([...host.querySelectorAll("li")].map(row => row.getAttribute("data-item-key"))).toEqual(["c", "b", "a"])
    expect(host.querySelector("div")!.className).toBe("")
    root.unmount()
  })

  test("preserves exact visible-row heights and class-free joined composition", () => {
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    root.render(CollectionInput as any, {items: [], selectedId: null, visibleRows: 4, emptyLabel: "Empty"})
    const owner = host.querySelector("div")!
    const list = owner.querySelector("ul")!
    const renderer = createDocumentRenderer({
      document,
      root: host,
      viewport: {width: 400, height: 240},
      styleSheets: [collectionInputCss]
    })
    const frame = renderer.flush()
    expect(frame.boxByNode.get(owner)?.width).toBe(320)
    expect(frame.boxByNode.get(list)?.height).toBe(110)
    expect(list.textContent).toContain("Empty")
    expect(collectionInputCss).not.toContain(".ui-")
    renderer.dispose()
    root.unmount()
  })
})
