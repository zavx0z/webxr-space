import type {
  Document,
  Element,
  Event,
  HTMLElement,
  Node,
  Text,
} from "@zavx0z/dom"
import type {NodesExternalStorySource} from "../../../../.storybook/runtime.ts"
import {createRoot, type ComponentRoot} from "@zavx0z/react"
import {
  createSingleNodeCanvas,
  type SingleNodeCanvasProps,
  type SingleNodeCanvasRefs,
} from "../../dom/single-node-canvas.ts"

export type SingleNodeStory = Readonly<{
  element: HTMLElement
  componentRoot: ComponentRoot
  refs: SingleNodeCanvasRefs
  props: SingleNodeCanvasProps
  update(props: SingleNodeCanvasProps): void
  source(): NodesExternalStorySource
  dispose(): void
}>

export const singleNodeStoryDefaultProps: SingleNodeCanvasProps = Object.freeze({
  title: "Граф узла",
  width: 360,
  height: 240,
  node: Object.freeze({
    id: "output",
    label: "Вывод",
    title: "Узел вывода",
    x: 52,
    y: 38,
    width: 156,
    height: 88,
    selected: false,
  }),
})

export function createSingleNodeStory(
  document: Document,
  initialProps: SingleNodeCanvasProps = singleNodeStoryDefaultProps,
): SingleNodeStory {
  const controller = createSingleNodeCanvas(document, initialProps)
  const componentRoot = createRoot(document.createDocumentFragment())
  let disposed = false

  const update = (props: SingleNodeCanvasProps): void => {
    if (disposed) throw new Error("SingleNodeStory controller is disposed")
    controller.update(props)
  }
  const onClick = (event: Event): void => {
    if (disposed || event.defaultPrevented) return
    const current = controller.props
    update({
      ...current,
      node: {
        ...current.node,
        selected: !current.node.selected,
      },
    })
  }

  controller.refs.node.addEventListener("click", onClick)

  return Object.freeze({
    element: controller.element,
    componentRoot,
    refs: controller.refs,
    get props() { return controller.props },
    update,
    source() {
      return Object.freeze({
        html: serializeElement(controller.element),
        typescript: renderTypeScript(controller.props),
      })
    },
    dispose() {
      if (disposed) return
      disposed = true
      controller.refs.node.removeEventListener("click", onClick)
      componentRoot.unmount()
      controller.dispose()
    },
  })
}

function renderTypeScript(props: SingleNodeCanvasProps): string {
  return [
    'import {createDocument} from "@zavx0z/dom"',
    'import {createSingleNodeCanvas} from "../../dom/single-node-canvas.ts"',
    "",
    "const document = createDocument()",
    `const props = ${JSON.stringify(props, null, 2)} as const`,
    "const controller = createSingleNodeCanvas(document, props)",
    'controller.refs.node.addEventListener("click", (event) => {',
    "  if (event.defaultPrevented) return",
    "  const current = controller.props",
    "  controller.update({",
    "    ...current,",
    "    node: {...current.node, selected: !current.node.selected},",
    "  })",
    "})",
    "document.appendChild(controller.element)",
  ].join("\n")
}

function serializeElement(element: Element, depth = 0): string {
  const indent = "  ".repeat(depth)
  const attributes = element.getAttributeNames().sort().map((name) => {
    const value = element.getAttribute(name) ?? ""
    return ` ${name}="${escapeAttribute(value)}"`
  }).join("")
  const children = [...element.childNodes]
  if (children.length === 0) return `${indent}<${element.localName}${attributes}></${element.localName}>`
  if (children.every((node) => node.nodeType === 3)) {
    return `${indent}<${element.localName}${attributes}>${escapeText(element.textContent ?? "")}</${element.localName}>`
  }
  const body = children.map((node: Node) => node.nodeType === 3
    ? `${"  ".repeat(depth + 1)}${escapeText((node as Text).data)}`
    : serializeElement(node as Element, depth + 1)).join("\n")
  return `${indent}<${element.localName}${attributes}>\n${body}\n${indent}</${element.localName}>`
}

function escapeText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
}

function escapeAttribute(value: string): string {
  return escapeText(value).replaceAll('"', "&quot;")
}
