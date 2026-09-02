/** Package-owned external Storybook story support. */
import {describe, expect, test} from "bun:test"
import {Event, createDocument, type HTMLButtonElement, type HTMLInputElement} from "@zavx0z/dom"
import {uiIcons} from "@ui/components/icons"
import {createCompiledInspectorProductionStory} from "./compiled-inspector-production-story.tsx"

describe("compiled Inspector production story", () => {
  test("uses the final keyed/hook-controlled owner", () => {
    const mounted = createCompiledInspectorProductionStory(createDocument())
    const owner = mounted.story.element
    const search = owner.querySelector("input") as HTMLInputElement
    search.value = "label"
    search.dispatchEvent(new Event("input", {bubbles: true}))
    const props = owner.querySelector("[data-panel]")!
    expect(props.getAttributeNames().some(name => name.startsWith("data-z-"))).toBe(true)
    expect(owner.textContent).toContain("label")
    expect(owner.textContent).not.toContain("variant")
    const category = [...owner.querySelectorAll("nav button")].find(button => button.textContent === "P") as HTMLButtonElement
    expect(category.getAttribute("aria-pressed")).toBe("true")
    expect(category.querySelector("img")?.getAttribute("src")).toBe(uiIcons.settings)
    expect([...owner.querySelectorAll("img")].some(image => image.getAttribute("src") === uiIcons.search)).toBeTrue()
    expect(owner.querySelector('[title="Inspected element"] img')?.getAttribute("src")).toBe(uiIcons.resource)
    expect(mounted.story.source.typescript).toContain("<Inspector")
    expect(mounted.story.source.typescript).toContain("<Panel")
    expect(mounted.story.source.typescript).toContain("<TextField")
    expect(mounted.story.source.typescript).toContain("<SelectField")
    expect(mounted.story.source.typescript).toContain("<CheckboxField")
    expect(mounted.story.source.typescript).not.toContain('@ui/components/field"')
    expect(mounted.story.source.typescript).toContain("uiIcons.settings")
    expect(mounted.story.source.typescript).toContain("useState")
    expect(mounted.story.source.typescript).not.toContain("Css")
    expect(mounted.story.componentRoot.readStyleSheets().styleSheets.length).toBeGreaterThan(0)
    expect(mounted.story.props).toMatchObject({selectedCategoryId: "props"})
    expect(owner.textContent).not.toContain("HTML")
    expect(owner.textContent).not.toContain("CSS")
    expect(mounted.story.source.html).not.toContain('class="')
    mounted.story.dispose()
  })

})
