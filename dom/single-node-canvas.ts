import type {
  Document,
  HTMLDivElement,
  HTMLElement,
  Text,
} from "@zavx0z/dom"

export type SingleNodeCanvasNode = Readonly<{
  id: string
  label: string
  title: string
  x: number
  y: number
  width: number
  height: number
  selected: boolean
}>

export type SingleNodeCanvasProps = Readonly<{
  title: string
  width: number
  height: number
  node: SingleNodeCanvasNode
}>

export type SingleNodeCanvasRefs = Readonly<{
  root: HTMLElement
  header: HTMLElement
  headerText: Text
  viewport: HTMLDivElement
  node: HTMLElement
  nodeText: Text
}>

export type SingleNodeCanvasController = Readonly<{
  element: HTMLElement
  refs: SingleNodeCanvasRefs
  props: SingleNodeCanvasProps
  update(props: SingleNodeCanvasProps): void
  dispose(): void
}>

const defaultNode = Object.freeze({
  id: "output",
  label: "Output",
  title: "Output node",
  x: 40,
  y: 30,
  width: 140,
  height: 80,
  selected: false,
})

export const singleNodeCanvasDefaultProps: SingleNodeCanvasProps = Object.freeze({
  title: "Node Canvas",
  width: 320,
  height: 220,
  node: defaultNode,
})

export const singleNodeCanvasCss = String.raw`
.single-node-canvas {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #111111;
  border-radius: 4px;
  background: #1d1d1d;
  color: #e0e0e0;
}

.single-node-canvas__header {
  box-sizing: border-box;
  display: block;
  width: 100%;
  height: 30px;
  padding: 7px 10px;
  border-bottom: 1px solid #111111;
  background: #242424;
  color: #7edcec;
  font-size: 12px;
}

.single-node-canvas__viewport {
  box-sizing: border-box;
  position: relative;
  display: block;
  min-height: 0;
  flex-grow: 1;
  overflow: hidden;
  background: #1d1d1d;
}

.single-node-canvas__node {
  box-sizing: border-box;
  position: absolute;
  display: block;
  padding: 8px;
  border: 1px solid #111111;
  border-radius: 6px;
  background: #303030;
  box-shadow: 0 4px 10px 0 rgba(0, 0, 0, 0.35);
  color: #e0e0e0;
  font-size: 12px;
}

.single-node-canvas__node[aria-selected="true"] {
  border-color: #2d6880;
  box-shadow: 0 0 12px 2px rgba(45, 104, 128, 0.45);
}
`

export function createSingleNodeCanvas(
  document: Document,
  initialProps: SingleNodeCanvasProps = singleNodeCanvasDefaultProps,
): SingleNodeCanvasController {
  const props = normalizeProps(initialProps)
  const root = document.createElement("section")
  const header = document.createElement("header")
  const headerText = document.createTextNode("")
  const viewport = document.createElement("div")
  const node = document.createElement("article")
  const nodeText = document.createTextNode("")

  root.className = "single-node-canvas"
  root.setAttribute("data-node-count", "1")
  header.className = "single-node-canvas__header"
  header.appendChild(headerText)
  viewport.className = "single-node-canvas__viewport"
  viewport.setAttribute("role", "application")
  node.className = "single-node-canvas__node"
  node.setAttribute("role", "option")
  node.tabIndex = 0
  node.appendChild(nodeText)
  viewport.appendChild(node)
  root.append(header, viewport)

  const nodeId = props.node.id
  let currentProps = props
  let disposed = false

  const update = (nextProps: SingleNodeCanvasProps): void => {
    if (disposed) throw new Error("SingleNodeCanvas controller is disposed")
    const next = normalizeProps(nextProps)
    if (next.node.id !== nodeId) {
      throw new Error(`SingleNodeCanvas Node id cannot change: ${nodeId} -> ${next.node.id}`)
    }
    syncText(headerText, next.title)
    syncAttribute(root, "style", canvasStyle(next))
    syncAttribute(viewport, "aria-label", next.title)
    syncText(nodeText, next.node.label)
    syncAttribute(node, "data-node-id", next.node.id)
    syncAttribute(node, "aria-selected", String(next.node.selected))
    syncAttribute(node, "style", positionedNodeStyle(next.node))
    if (node.title !== next.node.title) node.title = next.node.title
    currentProps = next
  }

  const refs: SingleNodeCanvasRefs = Object.freeze({
    root,
    header,
    headerText,
    viewport,
    node,
    nodeText,
  })
  const controller: SingleNodeCanvasController = Object.freeze({
    element: root,
    refs,
    get props() { return currentProps },
    update,
    dispose() {
      disposed = true
    },
  })
  update(props)
  return controller
}

function normalizeProps(props: SingleNodeCanvasProps): SingleNodeCanvasProps {
  if (typeof props !== "object" || props === null) {
    throw new TypeError("SingleNodeCanvas props must be an object")
  }
  assertString(props.title, "SingleNodeCanvas title")
  assertPositive(props.width, "SingleNodeCanvas width")
  assertPositive(props.height, "SingleNodeCanvas height")
  const node = props.node
  if (typeof node !== "object" || node === null) {
    throw new TypeError("SingleNodeCanvas node must be an object")
  }
  assertNonEmpty(node.id, "SingleNodeCanvas Node id")
  assertNonEmpty(node.label, "SingleNodeCanvas Node label")
  assertString(node.title, "SingleNodeCanvas Node title")
  assertFinite(node.x, "SingleNodeCanvas Node x")
  assertFinite(node.y, "SingleNodeCanvas Node y")
  assertPositive(node.width, "SingleNodeCanvas Node width")
  assertPositive(node.height, "SingleNodeCanvas Node height")
  assertBoolean(node.selected, "SingleNodeCanvas Node selected")
  return Object.freeze({
    title: props.title,
    width: props.width,
    height: props.height,
    node: Object.freeze({...node}),
  })
}

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string") throw new TypeError(`${label} must be a string`)
}

function assertNonEmpty(value: unknown, label: string): asserts value is string {
  assertString(value, label)
  if (value.trim().length === 0) throw new TypeError(`${label} must not be empty`)
}

function assertFinite(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be finite`)
  }
}

function assertPositive(value: unknown, label: string): asserts value is number {
  assertFinite(value, label)
  if (value <= 0) throw new RangeError(`${label} must be greater than zero`)
}

function assertBoolean(value: unknown, label: string): asserts value is boolean {
  if (typeof value !== "boolean") throw new TypeError(`${label} must be a boolean`)
}

function canvasStyle(props: SingleNodeCanvasProps): string {
  return `width: ${props.width}px; height: ${props.height}px`
}

function positionedNodeStyle(node: SingleNodeCanvasNode): string {
  return `left: ${node.x}px; top: ${node.y}px; width: ${node.width}px; height: ${node.height}px`
}

function syncText(node: Text, value: string): void {
  if (node.data !== value) node.data = value
}

function syncAttribute(element: HTMLElement, name: string, value: string): void {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value)
}
