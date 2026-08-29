import {describe, expect, test} from "bun:test"
import {createDocument, MouseEvent} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {graphCanvasCss} from "./graph-canvas.ts"
import {nodeTreeEditorCss} from "./node-tree-editor.ts"
import {createNodeWorkbench, nodeWorkbenchCss} from "./node-workbench.ts"
import {parameterSocketCss} from "./parameter-socket.ts"
import {createRemainingDomProps} from "../storybook/dom/remaining-dom-data.ts"

describe("production DOM NodeWorkbench composition", () => {
  test("reuses exact Graph/NodeTree/Parameter controller subtrees", () => {
    const controller = createNodeWorkbench(createDocument(), createRemainingDomProps(""))
    expect(controller.element.className).toBe("node-workbench")
    expect(controller.refs.treeRegion.firstChild).toBe(controller.tree.element)
    expect(controller.refs.graphRegion.firstChild).toBe(controller.graph.element)
    expect(controller.refs.parameterRegion.firstChild).toBe(controller.parameters.element)
    expect(controller.tree.element.className).toBe("node-tree-dom")
    expect(controller.graph.element.className).toBe("graph-canvas node-editor")
    expect(controller.editor.graph).toBe(controller.graph)
    expect(controller.editor.refs.grid.parentNode).toBe(controller.graph.refs.viewport)
    expect(controller.parameters.element.className).toBe("parameter-socket")
    expect(controller.props.mode).toBe("aggregate")
  })

  test("preserves wrapper and nested keyed identities through route state updates", () => {
    const controller = createNodeWorkbench(createDocument(), createRemainingDomProps("ui/node-editor/scene"))
    const fixed = controller.refs
    const graphNode = controller.graph.nodeRefs("scalar")!
    const parameter = controller.parameters.parameterRefs("text-both")!
    controller.update(createRemainingDomProps("ui/node-editor/scene/rotation-linked"))
    expect(controller.refs).toBe(fixed)
    expect(controller.graph.nodeRefs("scalar")).toBe(graphNode)
    expect(controller.parameters.parameterRefs("text-both")).toBeNull()
    expect(parameter.row.parentNode).toBeNull()
    expect(controller.graph.linkRefs("scalar-transform-rotation")).not.toBeNull()
    expect(controller.refs.treeRegion.hasAttribute("hidden")).toBeTrue()
  })

  test("materializes keyed accepted-reference and preview images", () => {
    const controller = createNodeWorkbench(createDocument(), createRemainingDomProps("ui/comparison/reference/default"))
    const reference = controller.imageRefs("reference")!
    expect(reference.image.localName).toBe("img")
    expect(reference.image.src).toContain("/__storybook/resources/nodes/")
    expect(reference.image.src).toContain("kind=reference")
    expect(controller.graph.nodeRefs("comparison-noise")?.text.data).toBe("Noise Texture")
    expect(controller.parameters.props.parameters.map(({label}) => label)).toEqual([
      "Vector", "Scale", "Detail", "Roughness", "Lacunarity", "Distortion",
    ])
    controller.update(createRemainingDomProps("ui/node-editor/preview/multiple"))
    expect(reference.figure.parentNode).toBeNull()
    expect(controller.imageRefs("primary")).not.toBeNull()
    expect(controller.imageRefs("secondary")).not.toBeNull()
  })

  test("leaves standard child events bubbling and controller state controlled", () => {
    const document = createDocument()
    const host = document.createElement("div")
    const controller = createNodeWorkbench(document, createRemainingDomProps("ui/node-editor/scene/mixed-sides"))
    const props = controller.props
    const events: string[] = []
    document.appendChild(host)
    host.appendChild(controller.element)
    host.addEventListener("click", ({type}) => events.push(type))
    controller.graph.nodeRefs("scalar")!.element.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}))
    expect(events).toEqual(["click"])
    expect(controller.props).toBe(props)
  })

  test("renders the composed production subtrees and remains private DOM-only", async () => {
    const document = createDocument()
    const controller = createNodeWorkbench(document, createRemainingDomProps("ui"))
    document.appendChild(controller.element)
    const renderer = createDocumentRenderer({
      document,
      root: controller.element,
      viewport: {width: 1024, height: 700},
      styleSheets: [nodeWorkbenchCss, graphCanvasCss, nodeTreeEditorCss, parameterSocketCss],
    })
    const frame = renderer.flush()
    expect(frame.displayList.filter((item) => item.kind === "text").map((item) => item.text))
      .toEqual(expect.arrayContaining(["Node UI · production DOM owners", "Скалярная математика", "Преобразование", "Principled", "Текст · Вход и выход"]))
    expect(frame.hits.get(controller.graph.nodeRefs("scalar")!.element)).toBeDefined()
    renderer.dispose()
    const source = await Bun.file(new URL("./node-workbench.ts", import.meta.url)).text()
    for (const forbidden of ["@layout/core", "@ui/elements", "@ui/components", "@engine/core", "@zavx0z/renderer", "UiSurface", "addEventListener"]) expect(source).not.toContain(forbidden)
    const manifest = await Bun.file(new URL("../package.json", import.meta.url)).json() as {exports: Record<string, unknown>}
    expect(manifest.exports["./dom/node-workbench"]).toBeUndefined()
    expect(manifest.exports["./node-workbench"]).toBe("./dom/node-workbench.ts")
  })
})
