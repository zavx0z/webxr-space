/** Package-owned external Storybook story support. */
import {describe, expect, test} from "bun:test"
import {Event, createDocument} from "@zavx0z/dom"
import {uiIcons} from "@ui/components/icons"
import {
  createCompiledListProductionStory,
  createCompiledTableProductionStory,
} from "./compiled-data-production-stories.tsx"

describe("compiled data production stories", () => {
  test("keeps List and Table selection on retained keyed rows", () => {
    const document = createDocument()
    const list = createCompiledListProductionStory(document, {
      items: [{key: "a", label: "Alpha", iconSrc: uiIcons.log}, {key: "b", label: "Beta", iconSrc: uiIcons.run}],
      selectedKey: "a",
    })
    const listA = list.story.element.querySelector('[data-item-key="a"]')
    const listB = list.story.element.querySelector('[data-item-key="b"]')!
    listB.dispatchEvent(new Event("click", {bubbles: true}))
    expect(listB.getAttribute("aria-selected")).toBe("true")
    expect(list.story.element.querySelector('[data-item-key="a"]')).toBe(listA)
    expect(listB.querySelector("img")?.getAttribute("src")).toBe(uiIcons.run)
    expect(list.story.source.typescript).toContain("uiIcons.run")
    expect(list.story.source.typescript).not.toContain("Css")
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
    expect(table.story.source.typescript).not.toContain("Css")
    expect(table.story.source.typescript).not.toContain("createTable(")

    for (const mounted of [list, table]) {
      expect(mounted.story.source.typescript).toContain("useState")
      expect(mounted.story.componentRoot.readStyleSheets().styleSheets.length).toBeGreaterThan(0)
      expect(mounted.story.source.html).not.toContain('class="')
      mounted.story.dispose()
    }
  })
})
