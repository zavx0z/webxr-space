import {
  Element,
  type Document,
  type Event,
  type HTMLElement,
  type Node,
  type Text,
} from "@zavx0z/dom"
import type {StorybookDomStorySource} from "@zavx0z/storybook/stories"
import {
  createMultiNodeCanvas,
  multiNodeCanvasCss,
  type MultiNodeCanvasProps,
  type MultiNodeCanvasRefs,
  type MultiNodeCanvasNodeRefs,
} from "../../dom/multi-node-canvas.ts"

export type MultiNodeStory = Readonly<{
  element: HTMLElement
  refs: MultiNodeCanvasRefs
  props: MultiNodeCanvasProps
  nodeRefs(id: string): MultiNodeCanvasNodeRefs | null
  update(props: MultiNodeCanvasProps): void
  source(): StorybookDomStorySource
  dispose(): void
}>

export const multiNodeStoryDefaultProps: MultiNodeCanvasProps = Object.freeze({
  title: "Сцена узлов",
  width: 600,
  height: 320,
  scene: Object.freeze({translateX: 18, translateY: 12, scale: 1.05}),
  nodes: Object.freeze([
    Object.freeze({
      id: "input",
      label: "Ввод",
      title: "Входной узел",
      x: 30,
      y: 44,
      width: 132,
      height: 76,
      selected: false,
    }),
    Object.freeze({
      id: "scalar",
      label: "Скаляр",
      title: "Выбранный скалярный узел",
      x: 218,
      y: 96,
      width: 152,
      height: 86,
      selected: true,
    }),
    Object.freeze({
      id: "output",
      label: "Вывод",
      title: "Выходной узел",
      x: 414,
      y: 48,
      width: 138,
      height: 78,
      selected: false,
    }),
  ]),
})

export function createMultiNodeStory(
  document: Document,
  initialProps: MultiNodeCanvasProps = multiNodeStoryDefaultProps,
): MultiNodeStory {
  const controller = createMultiNodeCanvas(document, initialProps)
  let disposed = false

  const update = (props: MultiNodeCanvasProps): void => {
    if (disposed) throw new Error("MultiNodeStory controller is disposed")
    controller.update(props)
  }
  const onClick = (event: Event): void => {
    if (disposed || event.defaultPrevented || !(event.target instanceof Element)) return
    const target = event.target.closest(".multi-node-canvas__node")
    if (!target || !controller.refs.scene.contains(target)) return
    const id = target.getAttribute("data-node-id")
    if (id === null || !controller.nodeRefs(id)) return
    const current = controller.props
    update({
      ...current,
      nodes: current.nodes.map((node) => ({...node, selected: node.id === id})),
    })
  }

  controller.refs.scene.addEventListener("click", onClick)

  return Object.freeze({
    element: controller.element,
    refs: controller.refs,
    get props() { return controller.props },
    nodeRefs(id) { return controller.nodeRefs(id) },
    update,
    source() {
      return Object.freeze({
        html: serializeElement(controller.element),
        css: multiNodeCanvasCss,
        typescript: renderTypeScript(controller.props),
      })
    },
    dispose() {
      if (disposed) return
      disposed = true
      controller.refs.scene.removeEventListener("click", onClick)
      controller.dispose()
    },
  })
}

function renderTypeScript(props: MultiNodeCanvasProps): string {
  return [
    'import {Element, createDocument} from "@zavx0z/dom"',
    'import {createMultiNodeCanvas} from "../../dom/multi-node-canvas.ts"',
    "",
    "const document = createDocument()",
    `const props = ${JSON.stringify(props, null, 2)} as const`,
    "const controller = createMultiNodeCanvas(document, props)",
    'controller.refs.scene.addEventListener("click", (event) => {',
    "  if (event.defaultPrevented || !(event.target instanceof Element)) return",
    '  const target = event.target.closest(".multi-node-canvas__node")',
    "  const id = target?.getAttribute(\"data-node-id\")",
    "  if (!id || !controller.nodeRefs(id)) return",
    "  const current = controller.props",
    "  controller.update({",
    "    ...current,",
    "    nodes: current.nodes.map((node) => ({...node, selected: node.id === id})),",
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
