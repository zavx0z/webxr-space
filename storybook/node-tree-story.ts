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
  nodeTreeEditorCss,
  nodeTreeEditorDefaultProps,
  type NodeTreeEditorProps,
} from "@nodes/ui/node-tree-editor"
import type {NodesExternalStorySource} from "../../../.storybook/runtime.ts"

export function createCoreNodeTreeStory(document: Document, route: string) {
  if (route !== "core/node-tree/live") throw new Error(`Unknown Core story route: ${route}`)
  const controller = createNodeTreeEditor(document, {
    ...nodeTreeEditorDefaultProps,
    title: "NodeTree",
    editable: false,
  })
  let disposed = false
  const update = (props: NodeTreeEditorProps): void => {
    if (disposed) throw new Error("Core NodeTree story is disposed")
    controller.update(props)
  }
  const onInput = (event: Event): void => {
    if (disposed || !(event.target instanceof HTMLInputElement)) return
    const input = event.target
    if (input === controller.refs.search) update({...controller.props, query: input.value})
  }
  const onClick = (event: Event): void => {
    if (disposed || event.defaultPrevented || !(event.target instanceof Element)) return
    const button = event.target.closest("button")
    if (!(button instanceof HTMLButtonElement) || button.disabled) return
    const nodeId = button.closest(".node-tree-dom__node")?.getAttribute("data-node-id")
    if (!nodeId) return
    if (button.getAttribute("data-action") === "select-node") {
      update({...controller.props, selectedNodeId: nodeId})
    } else if (button.getAttribute("data-action") === "toggle-node") {
      update({...controller.props, nodes: controller.props.nodes.map((node) =>
        node.id === nodeId ? {...node, expanded: !node.expanded} : node)})
    }
  }
  controller.element.addEventListener("input", onInput)
  controller.element.addEventListener("click", onClick)
  return Object.freeze({
    element: controller.element,
    get props() { return controller.props },
    source(): NodesExternalStorySource {
      return Object.freeze({
        html: serialize(controller.element),
        css: nodeTreeEditorCss,
        typescript: [
          'import {createNodeTreeEditor} from "@nodes/ui/node-tree-editor"',
          'import {createDocument} from "@zavx0z/dom"',
          "",
          "const document = createDocument()",
          `const props = ${JSON.stringify(controller.props, null, 2)} as const`,
          "const view = createNodeTreeEditor(document, props)",
          "document.appendChild(view.element)",
        ].join("\n"),
      })
    },
    dispose() {
      if (disposed) return
      disposed = true
      controller.element.removeEventListener("input", onInput)
      controller.element.removeEventListener("click", onClick)
      controller.dispose()
    },
  })
}

function serialize(element: Element, depth = 0): string {
  const indent = "  ".repeat(depth)
  const attrs = element.getAttributeNames().sort().map((name) => {
    const value = element.getAttribute(name) ?? ""
    return ` ${name}="${escape(value)}"`
  }).join("")
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
