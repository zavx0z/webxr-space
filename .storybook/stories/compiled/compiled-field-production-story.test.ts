/** Package-owned external Storybook story support. */
import {describe, expect, test} from "bun:test"
import {Event, createDocument, type HTMLInputElement} from "@zavx0z/dom"
import {createCompiledFieldProductionStory} from "./compiled-field-production-story.tsx"

describe("compiled Field production story", () => {
  test("mounts the exact hook-controlled owner and publishes executable JSX", () => {
    const document = createDocument()
    const mounted = createCompiledFieldProductionStory(document, {
      id: "name",
      label: "Name",
      kind: "text",
      value: "Alpha"
    })
    const input = mounted.story.element.querySelector("input") as HTMLInputElement
    input.value = "Beta"
    input.dispatchEvent(new Event("input", {bubbles: true}))
    expect(input.value).toBe("Beta")
    expect(mounted.story.element.getAttribute("data-story-component")).toBe("field")
    expect(mounted.story.source.typescript).toContain("<Field")
    expect(mounted.story.source.typescript).toContain("useState")
    expect(mounted.story.source.typescript).not.toContain("Css")
    expect(mounted.story.componentRoot.readStyleSheets().styleSheets.length).toBeGreaterThan(0)
    expect(mounted.story.source.typescript).not.toContain("createField")
    expect(mounted.story.source.html).not.toContain('class="')
    mounted.story.dispose()
  })

  test("uses the same adapter for a nested keyed vector owner", () => {
    const document = createDocument()
    const mounted = createCompiledFieldProductionStory(document, {
      id: "position",
      label: "Position",
      kind: "vector",
      value: [1, 2, 3]
    })
    expect(mounted.story.element.querySelectorAll("input")).toHaveLength(3)
    expect(mounted.story.source.html).toContain('data-control-key="X"')
    mounted.story.dispose()
  })
})
