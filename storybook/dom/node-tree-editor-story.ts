import {Element, HTMLButtonElement, HTMLInputElement, type Document, type Event, type HTMLElement, type Node, type Text} from "@zavx0z/dom"
import type {StorybookDomStorySource} from "@zavx0z/storybook/stories"
import {
  createNodeTreeEditor,
  nodeTreeEditorCss,
  nodeTreeEditorDefaultProps,
  type NodeTreeItemRefs,
  type NodeTreeEditorProps,
} from "../../dom/node-tree-editor.ts"

export const NODE_TREE_EDITOR_DOM_ROUTES = Object.freeze([
  "core", "core/node-tree", "core/node-tree/live",
  "editor", "editor/node-tree", "editor/node-tree/live",
] as const)
export type NodeTreeEditorRoute = typeof NODE_TREE_EDITOR_DOM_ROUTES[number]
export type NodeTreeEditorStory = Readonly<{
  element: HTMLElement
  props: NodeTreeEditorProps
  nodeRefs(id: string): NodeTreeItemRefs | null
  source(): StorybookDomStorySource
  update(props: NodeTreeEditorProps): void
  dispose(): void
}>
let addedNodeId = 1

export function createNodeTreeEditorStory(document: Document, route: NodeTreeEditorRoute): NodeTreeEditorStory {
  const editable = route.startsWith("editor")
  const controller = createNodeTreeEditor(document, {
    ...nodeTreeEditorDefaultProps,
    title: editable ? "NodeTreeEditor" : "NodeTree",
    editable,
  })
  let disposed = false
  const update = (props: NodeTreeEditorProps): void => {
    if (disposed) throw new Error("NodeTreeEditorStory controller is disposed")
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
      ? {...node, parameters: node.parameters.map((parameter) => parameter.id === parameterId ? {...parameter, value: input.value} : parameter)}
      : node)})
  }
  const onClick = (event: Event): void => {
    if (disposed || event.defaultPrevented || !(event.target instanceof Element)) return
    const button = event.target.closest("button")
    if (!(button instanceof HTMLButtonElement)) return
    const action = button?.getAttribute("data-action")
    if (!action || button.disabled) return
    const nodeItem = button.closest(".node-tree-dom__node")
    const nodeId = nodeItem?.getAttribute("data-node-id") ?? null
    const parameterItem = button.closest(".node-tree-dom__parameter")
    const parameterId = parameterItem?.getAttribute("data-parameter-id") ?? null
    const current = controller.props
    if (action === "select-node" && nodeId) update({...current, selectedNodeId: nodeId})
    else if (action === "toggle-node" && nodeId) update({...current, nodes: current.nodes.map((node) => node.id === nodeId ? {...node, expanded: !node.expanded} : node)})
    else if (action === "remove-node" && current.editable && nodeId) update({...current, selectedNodeId: current.selectedNodeId === nodeId ? null : current.selectedNodeId, nodes: current.nodes.filter((node) => node.id !== nodeId)})
    else if (action === "remove-parameter" && current.editable && nodeId && parameterId) update({...current, nodes: current.nodes.map((node) => node.id === nodeId ? {...node, parameters: node.parameters.filter((parameter) => parameter.id !== parameterId)} : node)})
    else if (action === "add-node" && current.editable) {
      const id = `added-${addedNodeId++}`
      update({...current, selectedNodeId: id, nodes: [...current.nodes, {id, label: "New Node", expanded: true, parameters: []}]})
    }
  }
  controller.element.addEventListener("input", onInput)
  controller.element.addEventListener("click", onClick)
  return Object.freeze({
    element: controller.element,
    get props() { return controller.props },
    nodeRefs(id) { return controller.nodeRefs(id) },
    update,
    source() { return Object.freeze({html: serialize(controller.element), css: nodeTreeEditorCss, typescript: renderSource(controller.props)}) },
    dispose() {
      if (disposed) return
      disposed = true
      controller.element.removeEventListener("input", onInput)
      controller.element.removeEventListener("click", onClick)
      controller.dispose()
    },
  })
}

function renderSource(props: NodeTreeEditorProps): string {
  return [
    'import {createDocument} from "@zavx0z/dom"',
    'import {createNodeTreeEditor} from "../../dom/node-tree-editor.ts"',
    "", "const document = createDocument()",
    `const props = ${JSON.stringify(props, null, 2)} as const`,
    "const controller = createNodeTreeEditor(document, props)",
    "// Bind standard bubbling input/click events to complete controlled props.",
    "document.appendChild(controller.element)",
  ].join("\n")
}
function serialize(element: Element, depth = 0): string {
  const indent = "  ".repeat(depth)
  const attrs = element.getAttributeNames().sort().map((name) => {
    const value = element.getAttribute(name) ?? ""
    if (["disabled", "hidden", "readonly"].includes(name) && value === "") return ` ${name}`
    return ` ${name}="${escape(value)}"`
  }).join("")
  if (element.localName === "input") return `${indent}<input${attrs}>`
  const children = [...element.childNodes]
  if (children.length === 0) return `${indent}<${element.localName}${attrs}></${element.localName}>`
  if (children.every((node) => node.nodeType === 3)) return `${indent}<${element.localName}${attrs}>${escape(element.textContent ?? "")}</${element.localName}>`
  const body = children.map((node: Node) => node.nodeType === 3 ? `${"  ".repeat(depth + 1)}${escape((node as Text).data)}` : serialize(node as Element, depth + 1)).join("\n")
  return `${indent}<${element.localName}${attrs}>\n${body}\n${indent}</${element.localName}>`
}
function escape(value: string): string { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;") }
