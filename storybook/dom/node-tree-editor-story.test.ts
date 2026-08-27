import {describe, expect, test} from "bun:test"
import {createDocument, InputEvent, MouseEvent} from "@zavx0z/dom"
import {NODE_TREE_EDITOR_DOM_ROUTES, createNodeTreeEditorStory} from "./node-tree-editor-story.ts"

describe("NodeTree and NodeTreeEditor DOM family story", () => {
  test("covers exact owner overviews and leaves with one controller", () => {
    expect(NODE_TREE_EDITOR_DOM_ROUTES).toEqual([
      "core", "core/node-tree", "core/node-tree/live",
      "editor", "editor/node-tree", "editor/node-tree/live",
    ])
    for (const route of NODE_TREE_EDITOR_DOM_ROUTES) {
      const story = createNodeTreeEditorStory(createDocument(), route)
      expect(story.element.className, route).toBe("node-tree-dom")
      expect(story.props.editable, route).toBe(route.startsWith("editor"))
      expect(story.source().css, route).toContain(".node-tree-dom__tree")
      expect(story.source().typescript, route).toContain("createNodeTreeEditor")
      story.dispose()
    }
  })

  test("controls search, disclosure, selection and parameter input with stable refs", () => {
    const document = createDocument()
    const story = createNodeTreeEditorStory(document, "editor/node-tree/live")
    document.appendChild(story.element)
    const input = story.nodeRefs("input")!
    const value = input.parameterRefs("value")!
    story.element.querySelector(".node-tree-dom__search")!.dispatchEvent(new InputEvent("input", {bubbles: true}))
    const search = story.element.querySelector(".node-tree-dom__search") as import("@zavx0z/dom").HTMLInputElement
    search.value = "out"
    search.dispatchEvent(new InputEvent("input", {bubbles: true}))
    expect(story.props.query).toBe("out")
    expect(input.item.hasAttribute("hidden")).toBeTrue()
    input.disclosure.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}))
    expect(story.nodeRefs("input")).toBe(input)
    expect(story.props.nodes.find(({id}) => id === "input")?.expanded).toBeFalse()
    input.label.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}))
    expect(story.props.selectedNodeId).toBe("input")
    value.input.value = "Live"
    value.input.dispatchEvent(new InputEvent("input", {bubbles: true}))
    expect(story.props.nodes.find(({id}) => id === "input")?.parameters[0]?.value).toBe("Live")
    expect(story.source().typescript).toContain('"value": "Live"')
  })

  test("keeps Core read-only and Editor authoring actions explicit", () => {
    const core = createNodeTreeEditorStory(createDocument(), "core/node-tree/live")
    const editor = createNodeTreeEditorStory(createDocument(), "editor/node-tree/live")
    expect(core.nodeRefs("input")?.remove.hasAttribute("hidden")).toBeTrue()
    expect(editor.nodeRefs("input")?.remove.hasAttribute("hidden")).toBeFalse()
    const before = editor.props.nodes.length
    editor.element.querySelector('[data-action="add-node"]')!.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}))
    expect(editor.props.nodes).toHaveLength(before + 1)
    expect(editor.props.selectedNodeId).toMatch(/^added-/)
  })

  test("disposes private behavior and source imports no retained owners", async () => {
    const story = createNodeTreeEditorStory(createDocument(), "editor/node-tree/live")
    const props = story.props
    story.dispose()
    story.element.querySelector('[data-action="add-node"]')!.dispatchEvent(new MouseEvent("click", {bubbles: true}))
    expect(story.props).toBe(props)
    const source = await Bun.file(new URL("./node-tree-editor-story.ts", import.meta.url)).text()
    for (const forbidden of ["@layout/core", "@ui/elements", "@ui/components", "@engine/core", "@zavx0z/renderer", "UiSurface"]) expect(source).not.toContain(forbidden)
  })
})
