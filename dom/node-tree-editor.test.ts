import {describe, expect, test} from "bun:test"
import {createDocument, HTMLInputElement, InputEvent, MouseEvent} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createNodeTreeEditor, nodeTreeEditorCss, nodeTreeEditorDefaultProps} from "./node-tree-editor.ts"

describe("production DOM NodeTree/NodeTreeEditor", () => {
  test("creates exact nested keyed tree and read-only controls", () => {
    const controller = createNodeTreeEditor(createDocument())
    const input = controller.nodeRefs("input")!
    const output = controller.nodeRefs("output")!
    const value = input.parameterRefs("value")!
    expect(controller.element.className).toBe("node-tree-dom")
    expect(controller.refs.tree.childNodes).toEqual([input.item, output.item])
    expect(input.item.getAttribute("role")).toBe("treeitem")
    expect(output.item.getAttribute("aria-selected")).toBe("true")
    expect(value.input).toBeInstanceOf(HTMLInputElement)
    expect(value.label.getAttribute("for")).toBe(value.controlId)
    expect(value.input.id).toBe(value.controlId)
    expect(value.input.value).toBe("0.75")
    expect(value.input.readOnly).toBeTrue()
    expect(controller.refs.addNode.hasAttribute("hidden")).toBeTrue()
    expect(controller.props).toEqual(nodeTreeEditorDefaultProps)
  })

  test("preserves Node/Parameter identity through reorder, filter and controlled updates", () => {
    const controller = createNodeTreeEditor(createDocument())
    const input = controller.nodeRefs("input")!
    const value = input.parameterRefs("value")!
    const output = controller.nodeRefs("output")!
    controller.update({...controller.props, editable: true, query: "out", nodes: [
      {...controller.props.nodes[1]!, label: "Output Node"},
      {...controller.props.nodes[0]!, parameters: [{...controller.props.nodes[0]!.parameters[0]!, value: "1.5"}]},
    ]})
    expect(controller.nodeRefs("input")).toBe(input)
    expect(input.parameterRefs("value")).toBe(value)
    expect(controller.nodeRefs("output")).toBe(output)
    expect(controller.refs.tree.childNodes).toEqual([output.item, input.item])
    expect(output.item.hasAttribute("hidden")).toBeFalse()
    expect(input.item.hasAttribute("hidden")).toBeTrue()
    expect(value.input.value).toBe("1.5")
    expect(value.input.readOnly).toBeFalse()
    expect(controller.refs.addNode.hasAttribute("hidden")).toBeFalse()
  })

  test("leaves standard native events bubbling and controlled", () => {
    const document = createDocument()
    const host = document.createElement("div")
    const controller = createNodeTreeEditor(document)
    document.appendChild(host)
    host.appendChild(controller.element)
    const props = controller.props
    const events: string[] = []
    host.addEventListener("input", (event) => events.push(event.type))
    host.addEventListener("click", (event) => events.push(event.type))
    controller.refs.search.value = "out"
    controller.refs.search.dispatchEvent(new InputEvent("input", {bubbles: true}))
    controller.nodeRefs("input")!.label.dispatchEvent(new MouseEvent("click", {bubbles: true}))
    expect(events).toEqual(["input", "click"])
    expect(controller.props).toBe(props)
  })

  test("validates keys and selection before mutation", () => {
    const controller = createNodeTreeEditor(createDocument())
    const props = controller.props
    const children = [...controller.refs.tree.childNodes]
    expect(() => controller.update({...controller.props, selectedNodeId: "missing"}))
      .toThrow("NodeTreeEditor selected Node does not exist: missing")
    expect(() => controller.update({...controller.props, nodes: [controller.props.nodes[0]!, {...controller.props.nodes[0]!}]}))
      .toThrow("NodeTreeEditor Node id must be unique: input")
    expect(controller.props).toBe(props)
    expect(controller.refs.tree.childNodes).toEqual(children)
  })

  test("renders nested lists and remains package-private DOM-only", async () => {
    const document = createDocument()
    const controller = createNodeTreeEditor(document)
    document.appendChild(controller.element)
    const renderer = createDocumentRenderer({document, root: controller.element, viewport: {width: 600, height: 400}, styleSheets: [nodeTreeEditorCss]})
    const frame = renderer.flush()
    expect(frame.hits.get(controller.refs.search)).toMatchObject({interactive: true, role: "searchbox"})
    expect(frame.displayList.filter((item) => item.kind === "text").map((item) => item.text))
      .toEqual(expect.arrayContaining(["NodeTree", "Input", "Output", "Value", "0.75"]))
    expect(renderer.flush()).toBe(frame)
    renderer.dispose()
    const source = await Bun.file(new URL("./node-tree-editor.ts", import.meta.url)).text()
    for (const forbidden of ["@layout/core", "@ui/elements", "@ui/components", "@engine/core", "@zavx0z/renderer", "addEventListener"]) expect(source).not.toContain(forbidden)
    const manifest = await Bun.file(new URL("../package.json", import.meta.url)).json() as {exports: Record<string, string>}
    expect(manifest.exports["./dom/node-tree-editor"]).toBeUndefined()
    expect(manifest.exports["./node-tree-editor"]).toBe("./dom/node-tree-editor.ts")
  })
})
