import {describe, expect, test} from "bun:test"
import {createDocument, HTMLElement} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import * as root from "@nodes/ui"
import {
  createGraphCanvas,
  graphCanvasCss,
  graphCanvasDefaultProps,
} from "@nodes/ui/graph-canvas"
import {
  createNodeWorkbench,
  nodeWorkbenchCss,
} from "@nodes/ui/node-workbench"
import {
  createParameterSocket,
  parameterSocketCss,
  parameterSocketDefaultProps,
} from "@nodes/ui/parameter-socket"
import {
  createNodeTreeEditor,
  nodeTreeEditorCss,
  nodeTreeEditorDefaultProps,
} from "@nodes/ui/node-tree-editor"

describe("@nodes/ui public standard-DOM contract", () => {
  test("publishes only exact DOM owner subpaths at root", () => {
    expect(Object.keys(root).sort()).toEqual([
      "createGraphCanvas",
      "createNodeTreeEditor",
      "createNodeWorkbench",
      "createParameterSocket",
      "graphCanvasCss",
      "graphCanvasDefaultProps",
      "nodeTreeEditorCss",
      "nodeTreeEditorDefaultProps",
      "nodeWorkbenchCss",
      "parameterSocketCss",
      "parameterSocketDefaultProps",
    ])
  })

  test("returns exact @zavx0z/dom identities from every factory", () => {
    const document = createDocument()
    const graph = createGraphCanvas(document)
    const parameters = createParameterSocket(document)
    const tree = createNodeTreeEditor(document)
    const workbench = createNodeWorkbench(document, {
      title: "Public DOM Nodes",
      mode: "aggregate",
      showTree: true,
      showGraph: true,
      showParameters: true,
      tree: nodeTreeEditorDefaultProps,
      graph: graphCanvasDefaultProps,
      parameters: parameterSocketDefaultProps,
      images: [],
      popup: {visible: false, label: "", items: []},
    })
    for (const controller of [graph, parameters, tree, workbench]) {
      expect(controller.element).toBeInstanceOf(HTMLElement)
      expect(controller.element.ownerDocument).toBe(document)
    }
    expect(workbench.graph.element.ownerDocument).toBe(document)
    expect(workbench.parameters.element.ownerDocument).toBe(document)
    expect(workbench.tree.element.ownerDocument).toBe(document)
  })

  test("renders the public controllers with stable identity", () => {
    const document = createDocument()
    const graph = createGraphCanvas(document)
    document.appendChild(graph.element)
    const renderer = createDocumentRenderer({
      document,
      root: graph.element,
      viewport: {width: 800, height: 520},
      styleSheets: [graphCanvasCss, nodeWorkbenchCss, parameterSocketCss, nodeTreeEditorCss],
    })
    const frame = renderer.flush()
    expect(frame.hits.get(graph.nodeRefs("process")!.element)).toBeDefined()
    expect(renderer.flush()).toBe(frame)
    const node = graph.nodeRefs("process")
    graph.update({...graph.props, title: "Updated"})
    expect(graph.nodeRefs("process")).toBe(node)
    expect(renderer.flush()).not.toBe(frame)
    renderer.dispose()
  })
})
