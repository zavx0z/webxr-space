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
import {createNode, nodeCss} from "@nodes/ui/node"
import {createParameter, parameterCss} from "@nodes/ui/parameter"
import {createSocket, socketCss} from "@nodes/ui/socket"
import {createLink, linkCss} from "@nodes/ui/link"
import {createNodeEditor, nodeEditorCss} from "@nodes/ui/node-editor"

describe("@nodes/ui public standard-DOM contract", () => {
  test("publishes only exact DOM owner subpaths at root", () => {
    expect(Object.keys(root).sort()).toEqual([
      "NodeCard",
      "NodeConnection",
      "NodeSystem",
      "ParameterRow",
      "SOCKET_KINDS",
      "SOCKET_PRESETS",
      "SOCKET_SHAPES",
      "SocketPort",
      "createGraphCanvas",
      "createLink",
      "createNode",
      "createNodeEditor",
      "createNodeTreeEditor",
      "createNodeWorkbench",
      "createParameter",
      "createParameterSocket",
      "createSocket",
      "graphCanvasCss",
      "graphCanvasDefaultProps",
      "linkCss",
      "nodeCss",
      "nodeEditorCss",
      "nodeTreeEditorCss",
      "nodeTreeEditorDefaultProps",
      "nodeWorkbenchCss",
      "parameterCss",
      "parameterSocketCss",
      "parameterSocketDefaultProps",
      "socketCss",
      "socketPreset",
    ])
  })

  test("returns exact @zavx0z/dom identities from every factory", () => {
    const document = createDocument()
    const graph = createGraphCanvas(document)
    const field = {
      id: "value",
      kind: "number" as const,
      label: "Value",
      value: 1,
    }
    const parameter = createParameter(document, {id: "value", field})
    const socket = createSocket(document, {
      id: "value-output",
      kind: "float",
      direction: "output",
      side: "right",
      label: "Value",
    })
    const node = createNode(document, {id: "node", label: "Math", parameters: [{id: "value", field}]})
    const link = createLink(document, {id: "link", title: "Value", segments: [{x1: 0, y1: 0, x2: 40, y2: 0}]})
    const editor = createNodeEditor(document, graphCanvasDefaultProps)
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
    for (const controller of [graph, parameter, socket, node, link, editor, parameters, tree, workbench]) {
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
      styleSheets: [graphCanvasCss, nodeCss, parameterCss, socketCss, linkCss, nodeEditorCss, nodeWorkbenchCss, parameterSocketCss, nodeTreeEditorCss],
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
