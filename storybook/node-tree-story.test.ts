import {describe, expect, test} from "bun:test"
import {createDocument, InputEvent} from "@zavx0z/dom"
import {createCoreNodeTreeStory} from "./node-tree-story.ts"

describe("Core external Storybook owner", () => {
  test("keeps the live NodeTree view owner-local and read-only", () => {
    const story = createCoreNodeTreeStory(createDocument(), "core/node-tree/live")
    expect(story.props.editable).toBeFalse()
    const add = story.element.querySelector('[data-action="add-node"]')!
    expect(add.hasAttribute("hidden")).toBeTrue()
    expect(add.hasAttribute("disabled")).toBeTrue()
    const search = story.element.querySelector('input[type="search"]')!
    if (!("value" in search)) throw new Error("Core search input is missing")
    search.value = "Output"
    search.dispatchEvent(new InputEvent("input", {bubbles: true}))
    expect(story.props.query).toBe("Output")
    expect(story.source().typescript).toContain("@nodes/ui/node-tree-editor")
    story.dispose()
  })
})
