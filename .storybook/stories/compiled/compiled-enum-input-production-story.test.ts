import {describe, expect, test} from "bun:test"
import {createDocument} from "@zavx0z/dom"
import {createCompiledEnumInputProductionStory} from "./compiled-enum-input-production-story.tsx"

describe("compiled EnumInput production story", () => {
  test("serializes the controlled option value rather than its visible label", () => {
    const mounted = createCompiledEnumInputProductionStory(createDocument(), {
      value: "output",
      presentation: "expanded",
      options: [
        {key: "input", value: "input", label: "Input"},
        {key: "output", value: "output", label: "Output"}
      ]
    })
    expect(mounted.story.element.getAttribute("data-value")).toBe("output")
    expect(mounted.story.source.typescript).toContain('useState("output")')
    expect(mounted.story.source.typescript).not.toContain('useState("Output")')
    mounted.story.dispose()
  })
})
