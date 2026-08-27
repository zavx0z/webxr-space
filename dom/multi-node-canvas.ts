import type {
  Document,
  HTMLDivElement,
  HTMLElement,
  Text,
} from "@zavx0z/dom"

export type MultiNodeCanvasNode = Readonly<{
  id: string
  label: string
  title: string
  x: number
  y: number
  width: number
  height: number
  selected: boolean
}>

export type MultiNodeCanvasScene = Readonly<{
  translateX: number
  translateY: number
  scale: number
}>

export type MultiNodeCanvasProps = Readonly<{
  title: string
  width: number
  height: number
  scene: MultiNodeCanvasScene
  nodes: readonly MultiNodeCanvasNode[]
}>

export type MultiNodeCanvasNodeRefs = Readonly<{
  element: HTMLElement
  text: Text
}>

export type MultiNodeCanvasRefs = Readonly<{
  root: HTMLElement
  header: HTMLElement
  headerText: Text
  viewport: HTMLDivElement
  scene: HTMLDivElement
}>

export type MultiNodeCanvasController = Readonly<{
  element: HTMLElement
  refs: MultiNodeCanvasRefs
  props: MultiNodeCanvasProps
  nodeRefs(id: string): MultiNodeCanvasNodeRefs | null
  update(props: MultiNodeCanvasProps): void
  dispose(): void
}>

const defaultNodes = Object.freeze([
  Object.freeze({
    id: "input",
    label: "Input",
    title: "Input node",
    x: 32,
    y: 42,
    width: 132,
    height: 76,
    selected: false,
  }),
  Object.freeze({
    id: "process",
    label: "Process",
    title: "Process node",
    x: 206,
    y: 92,
    width: 148,
    height: 84,
    selected: true,
  }),
  Object.freeze({
    id: "output",
    label: "Output",
    title: "Output node",
    x: 398,
    y: 48,
    width: 136,
    height: 78,
    selected: false,
  }),
] as const)

export const multiNodeCanvasDefaultProps: MultiNodeCanvasProps = Object.freeze({
  title: "Node Canvas",
  width: 600,
  height: 320,
  scene: Object.freeze({translateX: 0, translateY: 0, scale: 1}),
  nodes: defaultNodes,
})

export const multiNodeCanvasCss = String.raw`
.multi-node-canvas {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #111111;
  border-radius: 4px;
  background: #1d1d1d;
  color: #e0e0e0;
}

.multi-node-canvas__header {
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

.multi-node-canvas__viewport {
  box-sizing: border-box;
  position: relative;
  display: block;
  min-height: 0;
  flex-grow: 1;
  overflow: hidden;
  background: #1d1d1d;
}

.multi-node-canvas__scene {
  box-sizing: border-box;
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
}

.multi-node-canvas__node {
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

.multi-node-canvas__node[aria-selected="true"] {
  border-color: #2d6880;
  box-shadow: 0 0 12px 2px rgba(45, 104, 128, 0.45);
}
`

export function createMultiNodeCanvas(
  document: Document,
  initialProps: MultiNodeCanvasProps = multiNodeCanvasDefaultProps,
): MultiNodeCanvasController {
  const root = document.createElement("section")
  const header = document.createElement("header")
  const headerText = document.createTextNode("")
  const viewport = document.createElement("div")
  const scene = document.createElement("div")
  const records = new Map<string, MultiNodeCanvasNodeRefs>()
  let currentProps = normalizeProps(initialProps)
  let disposed = false

  root.className = "multi-node-canvas"
  header.className = "multi-node-canvas__header"
  header.appendChild(headerText)
  viewport.className = "multi-node-canvas__viewport"
  viewport.setAttribute("role", "application")
  scene.className = "multi-node-canvas__scene"
  viewport.appendChild(scene)
  root.append(header, viewport)

  const apply = (next: MultiNodeCanvasProps): void => {
    document.transaction(() => {
      syncText(headerText, next.title)
      syncAttribute(root, "data-node-count", String(next.nodes.length))
      syncAttribute(root, "style", canvasStyle(next))
      syncAttribute(viewport, "aria-label", next.title)
      syncAttribute(scene, "style", sceneStyle(next.scene))

      const nextIds = new Set(next.nodes.map(({id}) => id))
      for (const [id, record] of records) {
        if (nextIds.has(id)) continue
        record.element.remove()
        records.delete(id)
      }

      let reference = scene.firstChild
      for (const node of next.nodes) {
        let record = records.get(node.id)
        if (!record) {
          record = createNodeRecord(document)
          records.set(node.id, record)
        }
        syncNode(record, node)
        if (record.element !== reference) scene.insertBefore(record.element, reference)
        reference = record.element.nextSibling
      }
      currentProps = next
    })
  }

  const refs: MultiNodeCanvasRefs = Object.freeze({
    root,
    header,
    headerText,
    viewport,
    scene,
  })
  const controller: MultiNodeCanvasController = Object.freeze({
    element: root,
    refs,
    get props() { return currentProps },
    nodeRefs(id) {
      return records.get(String(id)) ?? null
    },
    update(props) {
      if (disposed) throw new Error("MultiNodeCanvas controller is disposed")
      apply(normalizeProps(props))
    },
    dispose() {
      disposed = true
    },
  })
  apply(currentProps)
  return controller
}

function createNodeRecord(document: Document): MultiNodeCanvasNodeRefs {
  const element = document.createElement("article")
  const text = document.createTextNode("")
  element.className = "multi-node-canvas__node"
  element.setAttribute("role", "option")
  element.tabIndex = 0
  element.appendChild(text)
  return Object.freeze({element, text})
}

function syncNode(record: MultiNodeCanvasNodeRefs, node: MultiNodeCanvasNode): void {
  syncText(record.text, node.label)
  syncAttribute(record.element, "data-node-id", node.id)
  syncAttribute(record.element, "aria-selected", String(node.selected))
  syncAttribute(record.element, "style", positionedNodeStyle(node))
  if (record.element.title !== node.title) record.element.title = node.title
}

function normalizeProps(props: MultiNodeCanvasProps): MultiNodeCanvasProps {
  if (typeof props !== "object" || props === null) {
    throw new TypeError("MultiNodeCanvas props must be an object")
  }
  assertString(props.title, "MultiNodeCanvas title")
  assertPositive(props.width, "MultiNodeCanvas width")
  assertPositive(props.height, "MultiNodeCanvas height")
  if (typeof props.scene !== "object" || props.scene === null) {
    throw new TypeError("MultiNodeCanvas scene must be an object")
  }
  assertFinite(props.scene.translateX, "MultiNodeCanvas scene translateX")
  assertFinite(props.scene.translateY, "MultiNodeCanvas scene translateY")
  assertPositive(props.scene.scale, "MultiNodeCanvas scene scale")
  if (!Array.isArray(props.nodes)) throw new TypeError("MultiNodeCanvas nodes must be an array")

  const ids = new Set<string>()
  const nodes = props.nodes.map((node, index) => {
    if (typeof node !== "object" || node === null) {
      throw new TypeError(`MultiNodeCanvas node ${index} must be an object`)
    }
    assertNonEmpty(node.id, `MultiNodeCanvas node ${index} id`)
    if (ids.has(node.id)) throw new Error(`MultiNodeCanvas Node id must be unique: ${node.id}`)
    ids.add(node.id)
    assertNonEmpty(node.label, `MultiNodeCanvas Node ${node.id} label`)
    assertString(node.title, `MultiNodeCanvas Node ${node.id} title`)
    assertFinite(node.x, `MultiNodeCanvas Node ${node.id} x`)
    assertFinite(node.y, `MultiNodeCanvas Node ${node.id} y`)
    assertPositive(node.width, `MultiNodeCanvas Node ${node.id} width`)
    assertPositive(node.height, `MultiNodeCanvas Node ${node.id} height`)
    assertBoolean(node.selected, `MultiNodeCanvas Node ${node.id} selected`)
    return Object.freeze({...node})
  })

  return Object.freeze({
    title: props.title,
    width: props.width,
    height: props.height,
    scene: Object.freeze({...props.scene}),
    nodes: Object.freeze(nodes),
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

function canvasStyle(props: MultiNodeCanvasProps): string {
  return `width: ${props.width}px; height: ${props.height}px`
}

function sceneStyle(scene: MultiNodeCanvasScene): string {
  return `transform: translate(${scene.translateX}px, ${scene.translateY}px) scale(${scene.scale}); transform-origin: 0 0`
}

function positionedNodeStyle(node: MultiNodeCanvasNode): string {
  return `left: ${node.x}px; top: ${node.y}px; width: ${node.width}px; height: ${node.height}px`
}

function syncText(node: Text, value: string): void {
  if (node.data !== value) node.data = value
}

function syncAttribute(element: HTMLElement, name: string, value: string): void {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value)
}
