import {
  Element,
  HTMLButtonElement,
  HTMLInputElement,
  type Document,
  type Event,
  type Node,
  type Text,
} from "@zavx0z/dom"
import {
  createNodeTreeEditor,
  nodeTreeEditorDefaultProps,
  type NodeTreeEditorProps,
} from "@nodes/ui/node-tree-editor"
import {createRoot} from "@zavx0z/react"
import type {NodesExternalStorySource} from "../../../.storybook/runtime.ts"

let addedNodeId = 1

export function createEditorNodeTreeStory(document: Document, route: string) {
  if (route !== "editor/node-tree/live") throw new Error(`Unknown Editor story route: ${route}`)
  const controller = createNodeTreeEditor(document, {
    ...nodeTreeEditorDefaultProps,
    title: "NodeTreeEditor",
    editable: true,
  })
  const componentRoot = createRoot(document.createDocumentFragment())
  let disposed = false
  const update = (props: NodeTreeEditorProps): void => {
    if (disposed) throw new Error("Editor NodeTree story is disposed")
    controller.update(props)
  }
  const onInput = (event: Event): void => {
    if (disposed || !(event.target instanceof HTMLInputElement)) return
    const input = event.target
    if (input === controller.refs.search) return update({...controller.props, query: input.value})
    const item = input.closest(".node-tree-dom__parameter")
    const nodeId = item?.getAttribute("data-node-id")
    const parameterId = item?.getAttribute("data-parameter-id")
    if (!nodeId || !parameterId) return
    update({...controller.props, nodes: controller.props.nodes.map((node) => node.id === nodeId
      ? {...node, parameters: node.parameters.map((parameter) =>
        parameter.id === parameterId ? {...parameter, value: input.value} : parameter)}
      : node)})
  }
  const onClick = (event: Event): void => {
    if (disposed || event.defaultPrevented || !(event.target instanceof Element)) return
    const button = event.target.closest("button")
    if (!(button instanceof HTMLButtonElement) || button.disabled) return
    const action = button.getAttribute("data-action")
    const nodeId = button.closest(".node-tree-dom__node")?.getAttribute("data-node-id") ?? null
    const parameterId = button.closest(".node-tree-dom__parameter")?.getAttribute("data-parameter-id") ?? null
    const current = controller.props
    if (action === "select-node" && nodeId) update({...current, selectedNodeId: nodeId})
    else if (action === "toggle-node" && nodeId) update({...current, nodes: current.nodes.map((node) =>
      node.id === nodeId ? {...node, expanded: !node.expanded} : node)})
    else if (action === "remove-node" && nodeId) update({...current, nodes: current.nodes.filter((node) => node.id !== nodeId)})
    else if (action === "remove-parameter" && nodeId && parameterId) update({...current, nodes: current.nodes.map((node) =>
      node.id === nodeId ? {...node, parameters: node.parameters.filter((parameter) => parameter.id !== parameterId)} : node)})
    else if (action === "add-node") {
      const id = `added-${addedNodeId++}`
      update({...current, selectedNodeId: id, nodes: [...current.nodes, {
        id,
        label: "New Node",
        expanded: true,
        parameters: [],
      }]})
    }
  }
  controller.element.addEventListener("input", onInput)
  controller.element.addEventListener("click", onClick)
  return Object.freeze({
    element: controller.element,
    componentRoot,
    get props() { return controller.props },
    source(): NodesExternalStorySource {
      return Object.freeze({
        html: serialize(controller.element),
        typescript: [
          'import {createNodeTreeEditor} from "@nodes/ui/node-tree-editor"',
          'import {createDocument} from "@zavx0z/dom"',
          "",
          "const document = createDocument()",
          `const props = ${JSON.stringify(controller.props, null, 2)} as const`,
          "const editor = createNodeTreeEditor(document, props)",
          "document.appendChild(editor.element)",
        ].join("\n"),
      })
    },
    dispose() {
      if (disposed) return
      disposed = true
      controller.element.removeEventListener("input", onInput)
      controller.element.removeEventListener("click", onClick)
      componentRoot.unmount()
      controller.dispose()
    },
  })
}

function serialize(element: Element, depth = 0): string {
  const indent = "  ".repeat(depth)
  const attrs = element.getAttributeNames().sort().map((name) =>
    ` ${name}="${escape(element.getAttribute(name) ?? "")}"`).join("")
  if (element.localName === "input") return `${indent}<input${attrs}>`
  const children = [...element.childNodes]
  if (children.length === 0) return `${indent}<${element.localName}${attrs}></${element.localName}>`
  const body = children.map((node: Node) => node.nodeType === 3
    ? `${"  ".repeat(depth + 1)}${escape((node as Text).data)}`
    : serialize(node as Element, depth + 1)).join("\n")
  return `${indent}<${element.localName}${attrs}>\n${body}\n${indent}</${element.localName}>`
}

function escape(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;")
}
