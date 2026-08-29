import {describe, expect, test} from "bun:test"
import {MouseEvent, createDocument} from "@zavx0z/dom"
import {createEditorNodeTreeStory} from "./node-tree-editor-story.ts"

describe("Editor external Storybook owner", () => {
  test("keeps authoring controls in the Editor package", () => {
    const story = createEditorNodeTreeStory(createDocument(), "editor/node-tree/live")
    const before = story.props.nodes.length
    story.element.querySelector('[data-action="add-node"]')!
      .dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}))
    expect(story.props.nodes).toHaveLength(before + 1)
    expect(story.props.editable).toBeTrue()
    expect(story.source().typescript).toContain("@nodes/ui/node-tree-editor")
    story.dispose()
  })
})
