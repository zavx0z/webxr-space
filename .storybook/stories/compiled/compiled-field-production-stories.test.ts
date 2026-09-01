/** Package-owned external Storybook story support. */
import {describe, expect, test} from "bun:test"
import {Event, createDocument, type HTMLInputElement} from "@zavx0z/dom"
import {
  createCompiledTextFieldProductionStory,
  createCompiledVectorFieldProductionStory,
} from "./compiled-field-production-stories.tsx"

describe("compiled concrete Field production stories", () => {
  test("mounts the exact hook-controlled owner and publishes executable JSX", () => {
    const document = createDocument()
    const mounted = createCompiledTextFieldProductionStory(document, {
      id: "name",
      label: "Name",
      value: "Alpha"
    })
    const input = mounted.story.element.querySelector("input") as HTMLInputElement
    input.value = "Beta"
    input.dispatchEvent(new Event("input", {bubbles: true}))
    expect(input.value).toBe("Beta")
    expect(mounted.story.element.getAttribute("data-story-component")).toBe("text-field")
    expect(mounted.story.source.typescript).toContain("<TextField")
    expect(mounted.story.source.typescript).toContain("@ui/components/fields/text-field")
    expect(mounted.story.source.typescript).toContain("useState")
    expect(mounted.story.source.typescript).not.toContain("Css")
    expect(mounted.story.componentRoot.readStyleSheets().styleSheets.length).toBeGreaterThan(0)
    expect(mounted.story.source.typescript).not.toContain("createTextField")
    expect(mounted.story.source.html).not.toContain('class="')
    mounted.story.dispose()
  })

  test("uses the same adapter for a nested keyed vector owner", () => {
    const document = createDocument()
    const mounted = createCompiledVectorFieldProductionStory(document, {
      id: "position",
      label: "Position",
      value: [1, 2, 3]
    })
    expect(mounted.story.element.querySelectorAll("input")).toHaveLength(3)
    expect(mounted.story.source.html).toContain('data-control-key="X"')
    expect(mounted.story.source.typescript).toContain("<VectorField")
    mounted.story.dispose()
  })
})
