import {describe, expect, test} from "bun:test"
import {createDocument} from "@zavx0z/dom"
import {createNodeTreeStory} from "./node-tree-story.ts"

describe("canonical NodeTree Storybook leaf", () => {
  test("uses the final NodeEditor component path", () => {
    const story = createNodeTreeStory(createDocument())
    expect(story.element.querySelector('[data-node-editor]')).not.toBeNull()
    expect(story.element.querySelectorAll('[data-node-tree]')).toHaveLength(1)
    expect(story.element.querySelectorAll('article[data-node-id]')).toHaveLength(2)
    expect(story.element.querySelectorAll("vector-path")).toHaveLength(1)
    expect(story.source().typescript).toContain('import {NodeEditor} from "@nodes/ui"')
    story.dispose()
  })
})
