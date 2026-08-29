import {
  Element,
  type Document,
  type Event,
  type HTMLElement,
  type Node,
  type Text,
} from "@zavx0z/dom"
import type {NodesExternalStorySource} from "../../../../.storybook/runtime.ts"
import {
  createGraphCanvas,
  graphCanvasCss,
  graphCanvasDefaultProps,
  type GraphCanvasController,
  type GraphCanvasFrameRefs,
  type GraphCanvasLinkRefs,
  type GraphCanvasNodeRefs,
  type GraphCanvasProps,
  type GraphCanvasRefs,
} from "../../dom/graph-canvas.ts"

export type GraphStorySelection = Readonly<{
  kind: "frame" | "link" | "node"
  id: string
}> | null

export type GraphStory = Readonly<{
  element: HTMLElement
  refs: GraphCanvasRefs
  props: GraphCanvasProps
  selection: GraphStorySelection
  frameRefs(id: string): GraphCanvasFrameRefs | null
  linkRefs(id: string): GraphCanvasLinkRefs | null
  nodeRefs(id: string): GraphCanvasNodeRefs | null
  update(props: GraphCanvasProps): void
  source(): NodesExternalStorySource
  dispose(): void
}>

export const graphStoryDefaultProps: GraphCanvasProps = Object.freeze({
  title: "Ортогональные связи",
  width: 640,
  height: 360,
  scene: Object.freeze({translateX: 14, translateY: 10, scale: 1.04}),
  frames: freezeEntries(graphCanvasDefaultProps.frames.map((frame) => ({
    ...frame,
    label: "Pipeline",
    title: "Группа обработки",
    selected: false,
  }))),
  links: freezeEntries(graphCanvasDefaultProps.links.map((link) => ({
    ...link,
    title: link.id === "process-output" ? "Выбранная связь" : "Связь узлов",
    selected: link.id === "process-output",
    segments: freezeEntries(link.segments),
  }))),
  nodes: freezeEntries(graphCanvasDefaultProps.nodes.map((node) => ({
    ...node,
    label: node.id === "input" ? "Ввод" : node.id === "process" ? "Обработка" : "Вывод",
    title: `${node.id} node`,
    selected: false,
  }))),
})

export function createGraphStory(
  document: Document,
  initialProps: GraphCanvasProps = graphStoryDefaultProps,
): GraphStory {
  const controller = createGraphCanvas(document, initialProps)
  let disposed = false

  const update = (props: GraphCanvasProps): void => {
    if (disposed) throw new Error("GraphStory controller is disposed")
    controller.update(props)
  }
  const onClick = (event: Event): void => {
    if (disposed || event.defaultPrevented || !(event.target instanceof Element)) return
    const selection = selectionFromTarget(controller, event.target)
    if (!selection) return
    const current = controller.props
    update({
      ...current,
      frames: current.frames.map((frame) => ({
        ...frame,
        selected: selection.kind === "frame" && frame.id === selection.id,
      })),
      links: current.links.map((link) => ({
        ...link,
        selected: selection.kind === "link" && link.id === selection.id,
      })),
      nodes: current.nodes.map((node) => ({
        ...node,
        selected: selection.kind === "node" && node.id === selection.id,
      })),
    })
  }

  controller.refs.scene.addEventListener("click", onClick)

  return Object.freeze({
    element: controller.element,
    refs: controller.refs,
    get props() { return controller.props },
    get selection() { return selectionFromProps(controller.props) },
    frameRefs(id) { return controller.frameRefs(id) },
    linkRefs(id) { return controller.linkRefs(id) },
    nodeRefs(id) { return controller.nodeRefs(id) },
    update,
    source() {
      return Object.freeze({
        html: serializeElement(controller.element),
        css: graphCanvasCss,
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

function selectionFromTarget(
  controller: GraphCanvasController,
  target: Element,
): Exclude<GraphStorySelection, null> | null {
  const node = target.closest(".graph-canvas__node")
  const nodeId = node?.getAttribute("data-node-id")
  if (nodeId && controller.nodeRefs(nodeId)) return Object.freeze({kind: "node", id: nodeId})

  const link = target.closest(".graph-canvas__link")
  const linkId = link?.getAttribute("data-link-id")
  if (linkId && controller.linkRefs(linkId)) return Object.freeze({kind: "link", id: linkId})

  const frame = target.closest(".graph-canvas__frame")
  const frameId = frame?.getAttribute("data-frame-id")
  if (frameId && controller.frameRefs(frameId)) return Object.freeze({kind: "frame", id: frameId})
  return null
}

function selectionFromProps(props: GraphCanvasProps): GraphStorySelection {
  const frame = props.frames.find(({selected}) => selected)
  if (frame) return Object.freeze({kind: "frame", id: frame.id})
  const link = props.links.find(({selected}) => selected)
  if (link) return Object.freeze({kind: "link", id: link.id})
  const node = props.nodes.find(({selected}) => selected)
  return node ? Object.freeze({kind: "node", id: node.id}) : null
}

function renderTypeScript(props: GraphCanvasProps): string {
  return [
    'import {Element, createDocument} from "@zavx0z/dom"',
    'import {createGraphCanvas} from "../../dom/graph-canvas.ts"',
    "",
    "const document = createDocument()",
    `const props = ${JSON.stringify(props, null, 2)} as const`,
    "const controller = createGraphCanvas(document, props)",
    'controller.refs.scene.addEventListener("click", (event) => {',
    "  if (event.defaultPrevented || !(event.target instanceof Element)) return",
    '  const nodeId = event.target.closest(".graph-canvas__node")?.getAttribute("data-node-id")',
    '  const linkId = event.target.closest(".graph-canvas__link")?.getAttribute("data-link-id")',
    '  const frameId = event.target.closest(".graph-canvas__frame")?.getAttribute("data-frame-id")',
    "  if (!nodeId && !linkId && !frameId) return",
    "  const current = controller.props",
    "  controller.update({",
    "    ...current,",
    "    frames: current.frames.map((frame) => ({...frame, selected: frame.id === frameId})),",
    "    links: current.links.map((link) => ({...link, selected: link.id === linkId})),",
    "    nodes: current.nodes.map((node) => ({...node, selected: node.id === nodeId})),",
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

function freezeEntries<Entry extends object>(entries: readonly Entry[]): readonly Readonly<Entry>[] {
  return Object.freeze(entries.map((entry) => Object.freeze({...entry})))
}

function escapeText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
}

function escapeAttribute(value: string): string {
  return escapeText(value).replaceAll('"', "&quot;")
}
