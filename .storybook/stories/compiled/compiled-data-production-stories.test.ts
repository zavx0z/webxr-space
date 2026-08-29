/** Package-owned external Storybook story support. */
import {describe, expect, test} from "bun:test"
import {Event, createDocument, type HTMLButtonElement} from "@zavx0z/dom"
import {
  createCompiledCollectionInputProductionStory,
  createCompiledColorInputProductionStory,
  createCompiledListProductionStory,
  createCompiledTableProductionStory,
} from "./compiled-data-production-stories.tsx"

describe("compiled data production stories", () => {
  test("keeps ColorInput presentation in hook state", () => {
    const mounted = createCompiledColorInputProductionStory(createDocument(), {
      value: {r: 0.2, g: 0.55, b: 0.8, a: 1},
      presentation: "closed",
    })
    const owner = mounted.story.element
    const trigger = owner.querySelector("button") as HTMLButtonElement
    trigger.click()
    expect(mounted.story.element).toBe(owner)
    expect(trigger.getAttribute("aria-expanded")).toBe("true")
    expect(mounted.story.source.typescript).toContain("<ColorInput")
    expect(mounted.story.source.typescript).toContain("useState")
    expect(mounted.story.source.typescript).toContain("colorInputCss")
    expect(mounted.story.source.typescript).not.toContain("createColorInput(")
    mounted.story.dispose()
  })

  test("keeps CollectionInput selection and keyed rows", () => {
    const mounted = createCompiledCollectionInputProductionStory(createDocument(), {
      items: [
        {id: "input", label: "Input"},
        {id: "output", label: "Output"},
        {id: "viewport", label: "Viewport"},
      ],
      selectedId: "output",
    })
    const owner = mounted.story.element
    const output = owner.querySelector('[data-item-key="output"]')
    const viewport = owner.querySelector('[data-item-key="viewport"]')!
    viewport.dispatchEvent(new Event("click", {bubbles: true}))
    expect(viewport.getAttribute("aria-selected")).toBe("true")
    expect(owner.querySelector('[data-item-key="output"]')).toBe(output)
    expect(mounted.story.source.typescript).toContain("<CollectionInput")
    expect(mounted.story.source.typescript).toContain("useState")
    expect(mounted.story.source.typescript).toContain("collectionInputCss")
    expect(mounted.story.source.typescript).not.toContain("createCollectionInput(")
    mounted.story.dispose()
  })

  test("keeps List and Table selection on retained keyed rows", () => {
    const document = createDocument()
    const list = createCompiledListProductionStory(document, {
      items: [{key: "a", label: "Alpha"}, {key: "b", label: "Beta"}],
      selectedKey: "a",
    })
    const listA = list.story.element.querySelector('[data-item-key="a"]')
    const listB = list.story.element.querySelector('[data-item-key="b"]')!
    listB.dispatchEvent(new Event("click", {bubbles: true}))
    expect(listB.getAttribute("aria-selected")).toBe("true")
    expect(list.story.element.querySelector('[data-item-key="a"]')).toBe(listA)
    expect(list.story.source.typescript).toContain("listCss")
    expect(list.story.source.typescript).not.toContain("createList(")

    const table = createCompiledTableProductionStory(document, {
      columns: [{key: "name", label: "Name"}],
      rows: [{key: "a", cells: {name: "Alpha"}}, {key: "b", cells: {name: "Beta"}}],
      selectedKey: "a",
    })
    const rowA = table.story.element.querySelector('[data-row-key="a"]')
    const rowB = table.story.element.querySelector('[data-row-key="b"]')!
    rowB.dispatchEvent(new Event("click", {bubbles: true}))
    expect(rowB.getAttribute("aria-selected")).toBe("true")
    expect(table.story.element.querySelector('[data-row-key="a"]')).toBe(rowA)
    expect(table.story.source.typescript).toContain("tableCss")
    expect(table.story.source.typescript).not.toContain("createTable(")

    for (const mounted of [list, table]) {
      expect(mounted.story.source.typescript).toContain("useState")
      expect(mounted.story.source.html).not.toContain('class="')
      mounted.story.dispose()
    }
  })
})
