import {describe, expect, test} from "bun:test"
import {createDocument} from "@zavx0z/dom"
import {createCoreNodeTreeStory} from "./node-tree-story.tsx"

describe("Core external Storybook owner", () => {
  test("keeps the live NodeTree view owner-local and read-only", () => {
    const story = createCoreNodeTreeStory(createDocument(), "core/node-tree/live")
    expect(story.props).toMatchObject({revision: 0, topologyRevision: 0})
    expect(story.element.querySelectorAll('[data-node-tree]')).toHaveLength(1)
    expect(story.element.querySelector('[data-node-editor]')).toBeNull()
    expect(story.source().typescript).toContain("@nodes/ui/node-tree")
    story.dispose()
  })
})
