import type {Document, HTMLElement, Text} from "@zavx0z/dom"

export type LayoutPresentationPoint = Readonly<{x: number; y: number}>
export type LayoutPresentationBounds = Readonly<{x: number; y: number; width: number; height: number}>
export type LayoutPresentationNode = Readonly<{
  id: string
  label: string
  x: number
  y: number
  width: number
  height: number
}>
export type LayoutPresentationPort = Readonly<{
  id: string
  x: number
  y: number
  side: "WEST" | "EAST" | "NORTH" | "SOUTH"
}>
export type LayoutPresentationEdge = Readonly<{
  id: string
  points: readonly LayoutPresentationPoint[]
}>
export type LayoutPresentationDiagnostic = Readonly<{
  id: string
  label: string
  value: string
}>
export type LayoutPresentationCase = Readonly<{
  id: string
  label: string
  policy: "fixed" | "adaptive" | "dagre-layered" | "coffman-graham"
  direction: "RIGHT" | "DOWN"
  bounds: LayoutPresentationBounds
  nodes: readonly LayoutPresentationNode[]
  ports: readonly LayoutPresentationPort[]
  edges: readonly LayoutPresentationEdge[]
  diagnostics: readonly LayoutPresentationDiagnostic[]
}>
export type LayoutPresentationProps = Readonly<{
  title: string
  showRoutes: boolean
  showPorts: boolean
  cases: readonly LayoutPresentationCase[]
}>
export type LayoutPresentationCaseRefs = Readonly<{
  item: HTMLElement
  heading: HTMLElement
  headingText: Text
  status: HTMLElement
  statusText: Text
  viewport: HTMLElement
  scene: HTMLElement
  edges: HTMLElement
  nodes: HTMLElement
  ports: HTMLElement
  diagnostics: HTMLElement
  node(id: string): HTMLElement | null
  port(id: string): HTMLElement | null
  edge(id: string): Readonly<{group: HTMLElement; points: readonly HTMLElement[]}> | null
}>
export type LayoutPresentationController = Readonly<{
  element: HTMLElement
  props: LayoutPresentationProps
  refs: Readonly<{
    root: HTMLElement
    header: HTMLElement
    headerText: Text
    routes: HTMLElement
    ports: HTMLElement
    cases: HTMLElement
  }>
  caseRefs(id: string): LayoutPresentationCaseRefs | null
  update(props: LayoutPresentationProps): void
  dispose(): void
}>

type EdgeRecord = {group: HTMLElement; points: HTMLElement[]}
type DiagnosticRecord = {row: HTMLElement; term: HTMLElement; value: HTMLElement; termText: Text; valueText: Text}
type CaseRecord = {
  refs: LayoutPresentationCaseRefs
  nodeById: Map<string, HTMLElement>
  nodeTextById: Map<string, Text>
  portById: Map<string, HTMLElement>
  edgeById: Map<string, EdgeRecord>
  diagnosticById: Map<string, DiagnosticRecord>
}

const VIEWPORT_WIDTH = 332
const VIEWPORT_HEIGHT = 248
const VIEWPORT_INSET = 10

export const layoutPresentationCss = String.raw`
.layout-dom { box-sizing: border-box; display: flex; flex-direction: column; width: 820px; height: 540px; overflow: hidden; border: 1px solid #111; border-radius: 4px; background: #292929; color: #e0e0e0; }
.layout-dom__header { box-sizing: border-box; display: flex; flex-direction: row; align-items: center; gap: 8px; height: 38px; padding: 6px 10px; background: #242424; }
.layout-dom__title { min-width: 0; flex-grow: 1; color: #7edcec; font-size: 12px; }
.layout-dom__toggle { height: 26px; padding: 3px 8px; background: #3b3b3b; color: #e0e0e0; }
.layout-dom__toggle[aria-pressed="true"] { background: #2d5060; color: #bff5ff; }
.layout-dom__cases { box-sizing: border-box; display: flex; flex-direction: row; flex-grow: 1; gap: 10px; min-height: 0; overflow: auto; padding: 10px; }
.layout-dom__case { box-sizing: border-box; display: flex; flex-direction: column; flex-shrink: 0; width: 356px; height: 478px; overflow: hidden; border: 1px solid #181818; border-radius: 4px; background: #252525; }
.layout-dom__case-heading { box-sizing: border-box; height: 28px; padding: 6px 8px; color: #ececec; font-size: 11px; }
.layout-dom__status { box-sizing: border-box; height: 24px; padding: 4px 8px; color: #9fcbd3; font-size: 10px; }
.layout-dom__viewport { position: relative; box-sizing: border-box; width: 332px; height: 248px; margin: 0 11px; overflow: hidden; border: 1px solid #151515; background: #202020; }
.layout-dom__scene, .layout-dom__edge-layer, .layout-dom__node-layer, .layout-dom__port-layer { position: absolute; left: 0; top: 0; transform-origin: 0 0; }
.layout-dom__edge { position: absolute; left: 0; top: 0; }
.layout-dom__edge-point { position: absolute; width: 4px; height: 4px; border-radius: 999px; background: #72b8c4; }
.layout-dom__node { position: absolute; box-sizing: border-box; overflow: hidden; border: 1px solid #111; border-radius: 3px; background: #3b3b3b; color: #f0f0f0; padding: 4px; font-size: 10px; white-space: nowrap; text-overflow: ellipsis; }
.layout-dom__port { position: absolute; box-sizing: border-box; width: 8px; height: 8px; border: 1px solid #172b30; border-radius: 999px; background: #65d6e8; }
.layout-dom__diagnostics { box-sizing: border-box; display: flex; flex-direction: column; flex-grow: 1; gap: 2px; overflow: auto; padding: 8px; }
.layout-dom__diagnostic { display: flex; flex-direction: row; gap: 6px; min-height: 16px; font-size: 9px; }
.layout-dom__diagnostic-key { width: 116px; color: #a0a0a0; }
.layout-dom__diagnostic-value { min-width: 0; flex-grow: 1; color: #d8d8d8; }
[hidden] { display: none; }
`

export function createLayoutPresentation(
  document: Document,
  initialProps: LayoutPresentationProps,
): LayoutPresentationController {
  const root = document.createElement("section")
  const header = document.createElement("header")
  const headerText = document.createTextNode("")
  const routes = document.createElement("button")
  const ports = document.createElement("button")
  const cases = document.createElement("div")
  const records = new Map<string, CaseRecord>()
  let current = normalize(initialProps)
  let disposed = false

  root.className = "layout-dom"
  header.className = "layout-dom__header"
  const title = document.createElement("h1")
  title.className = "layout-dom__title"
  title.appendChild(headerText)
  routes.className = "layout-dom__toggle"
  routes.setAttribute("type", "button")
  routes.setAttribute("data-action", "toggle-routes")
  routes.textContent = "Маршруты"
  ports.className = "layout-dom__toggle"
  ports.setAttribute("type", "button")
  ports.setAttribute("data-action", "toggle-ports")
  ports.textContent = "Порты"
  header.append(title, routes, ports)
  cases.className = "layout-dom__cases"
  root.append(header, cases)

  const apply = (next: LayoutPresentationProps): void => document.transaction(() => {
    syncText(headerText, next.title)
    routes.setAttribute("aria-pressed", String(next.showRoutes))
    ports.setAttribute("aria-pressed", String(next.showPorts))
    const ids = new Set(next.cases.map(({id}) => id))
    for (const [id, record] of records) if (!ids.has(id)) {
      record.refs.item.remove()
      records.delete(id)
    }
    for (const item of next.cases) {
      let record = records.get(item.id)
      if (!record) {
        record = createCaseRecord(document, item.id)
        records.set(item.id, record)
      }
      syncCase(record, item, next.showRoutes, next.showPorts)
    }
    reorder(cases, next.cases.map(({id}) => records.get(id)!.refs.item))
    current = next
  })

  const refs = Object.freeze({root, header, headerText, routes, ports, cases})
  const controller: LayoutPresentationController = Object.freeze({
    element: root,
    refs,
    get props() { return current },
    caseRefs(id) { return records.get(String(id))?.refs ?? null },
    update(props) {
      if (disposed) throw new Error("LayoutPresentation controller is disposed")
      apply(normalize(props))
    },
    dispose() { disposed = true },
  })
  apply(current)
  return controller
}

function createCaseRecord(document: Document, id: string): CaseRecord {
  const item = document.createElement("article")
  const heading = document.createElement("h2")
  const headingText = document.createTextNode("")
  const status = document.createElement("output")
  const statusText = document.createTextNode("")
  const viewport = document.createElement("div")
  const scene = document.createElement("div")
  const edges = document.createElement("div")
  const nodes = document.createElement("div")
  const ports = document.createElement("div")
  const diagnostics = document.createElement("dl")
  const nodeById = new Map<string, HTMLElement>()
  const nodeTextById = new Map<string, Text>()
  const portById = new Map<string, HTMLElement>()
  const edgeById = new Map<string, EdgeRecord>()
  const diagnosticById = new Map<string, DiagnosticRecord>()
  item.className = "layout-dom__case"
  item.setAttribute("data-case-id", id)
  heading.className = "layout-dom__case-heading"
  heading.appendChild(headingText)
  status.className = "layout-dom__status"
  status.appendChild(statusText)
  viewport.className = "layout-dom__viewport"
  scene.className = "layout-dom__scene"
  edges.className = "layout-dom__edge-layer"
  nodes.className = "layout-dom__node-layer"
  ports.className = "layout-dom__port-layer"
  diagnostics.className = "layout-dom__diagnostics"
  scene.append(edges, nodes, ports)
  viewport.appendChild(scene)
  item.append(heading, status, viewport, diagnostics)
  const refs: LayoutPresentationCaseRefs = Object.freeze({
    item, heading, headingText, status, statusText, viewport, scene, edges, nodes, ports, diagnostics,
    node(nodeId) { return nodeById.get(String(nodeId)) ?? null },
    port(portId) { return portById.get(String(portId)) ?? null },
    edge(edgeId) {
      const record = edgeById.get(String(edgeId))
      return record ? Object.freeze({group: record.group, points: Object.freeze([...record.points])}) : null
    },
  })
  return {refs, nodeById, nodeTextById, portById, edgeById, diagnosticById}
}

function syncCase(
  record: CaseRecord,
  item: LayoutPresentationCase,
  showRoutes: boolean,
  showPorts: boolean,
): void {
  syncText(record.refs.headingText, item.label)
  syncText(record.refs.statusText, `${item.policy} · ${item.direction} · ${formatBounds(item.bounds)}`)
  record.refs.item.setAttribute("data-policy", item.policy)
  record.refs.item.setAttribute("data-direction", item.direction)
  const scale = Math.min(
    (VIEWPORT_WIDTH - VIEWPORT_INSET * 2) / item.bounds.width,
    (VIEWPORT_HEIGHT - VIEWPORT_INSET * 2) / item.bounds.height,
    1,
  )
  const offsetX = VIEWPORT_INSET + (VIEWPORT_WIDTH - VIEWPORT_INSET * 2 - item.bounds.width * scale) / 2
  const offsetY = VIEWPORT_INSET + (VIEWPORT_HEIGHT - VIEWPORT_INSET * 2 - item.bounds.height * scale) / 2
  setStyle(record.refs.scene, [
    `width:${item.bounds.width}px`,
    `height:${item.bounds.height}px`,
    `transform:translate(${decimal(offsetX)}px, ${decimal(offsetY)}px) scale(${decimal(scale)})`,
  ])
  for (const layer of [record.refs.edges, record.refs.nodes, record.refs.ports]) {
    setStyle(layer, [`width:${item.bounds.width}px`, `height:${item.bounds.height}px`])
  }
  syncBooleanAttribute(record.refs.edges, "hidden", !showRoutes)
  syncBooleanAttribute(record.refs.ports, "hidden", !showPorts)
  syncNodes(record, item)
  syncPorts(record, item)
  syncEdges(record, item)
  syncDiagnostics(record, item)
}

function syncNodes(record: CaseRecord, item: LayoutPresentationCase): void {
  const ids = new Set(item.nodes.map(({id}) => id))
  for (const [id, node] of record.nodeById) if (!ids.has(id)) {
    node.remove()
    record.nodeById.delete(id)
    record.nodeTextById.delete(id)
  }
  for (const geometry of item.nodes) {
    let node = record.nodeById.get(geometry.id)
    if (!node) {
      node = record.refs.item.ownerDocument!.createElement("article")
      const text = record.refs.item.ownerDocument!.createTextNode("")
      node.className = "layout-dom__node"
      node.setAttribute("data-node-id", geometry.id)
      node.appendChild(text)
      record.nodeById.set(geometry.id, node)
      record.nodeTextById.set(geometry.id, text)
    }
    syncText(record.nodeTextById.get(geometry.id)!, geometry.label)
    setStyle(node, [
      `left:${decimal(geometry.x - item.bounds.x)}px`,
      `top:${decimal(geometry.y - item.bounds.y)}px`,
      `width:${decimal(geometry.width)}px`,
      `height:${decimal(geometry.height)}px`,
    ])
  }
  reorder(record.refs.nodes, item.nodes.map(({id}) => record.nodeById.get(id)!))
}

function syncPorts(record: CaseRecord, item: LayoutPresentationCase): void {
  const ids = new Set(item.ports.map(({id}) => id))
  for (const [id, port] of record.portById) if (!ids.has(id)) {
    port.remove()
    record.portById.delete(id)
  }
  for (const geometry of item.ports) {
    let port = record.portById.get(geometry.id)
    if (!port) {
      port = record.refs.item.ownerDocument!.createElement("span")
      port.className = "layout-dom__port"
      port.setAttribute("data-port-id", geometry.id)
      record.portById.set(geometry.id, port)
    }
    port.setAttribute("data-side", geometry.side)
    port.setAttribute("title", `${geometry.id} · ${geometry.side}`)
    setStyle(port, [
      `left:${decimal(geometry.x - item.bounds.x - 4)}px`,
      `top:${decimal(geometry.y - item.bounds.y - 4)}px`,
    ])
  }
  reorder(record.refs.ports, item.ports.map(({id}) => record.portById.get(id)!))
}

function syncEdges(record: CaseRecord, item: LayoutPresentationCase): void {
  const ids = new Set(item.edges.map(({id}) => id))
  for (const [id, edge] of record.edgeById) if (!ids.has(id)) {
    edge.group.remove()
    record.edgeById.delete(id)
  }
  for (const geometry of item.edges) {
    let edge = record.edgeById.get(geometry.id)
    if (!edge) {
      const group = record.refs.item.ownerDocument!.createElement("div")
      group.className = "layout-dom__edge"
      group.setAttribute("data-edge-id", geometry.id)
      group.setAttribute("role", "img")
      edge = {group, points: []}
      record.edgeById.set(geometry.id, edge)
    }
    edge.group.setAttribute("aria-label", `Маршрут ${geometry.id}`)
    while (edge.points.length > geometry.points.length) edge.points.pop()!.remove()
    while (edge.points.length < geometry.points.length) {
      const point = record.refs.item.ownerDocument!.createElement("span")
      point.className = "layout-dom__edge-point"
      edge.group.appendChild(point)
      edge.points.push(point)
    }
    geometry.points.forEach((point, index) => setStyle(edge!.points[index]!, [
      `left:${decimal(point.x - item.bounds.x - 2)}px`,
      `top:${decimal(point.y - item.bounds.y - 2)}px`,
    ]))
  }
  reorder(record.refs.edges, item.edges.map(({id}) => record.edgeById.get(id)!.group))
}

function syncDiagnostics(record: CaseRecord, item: LayoutPresentationCase): void {
  const ids = new Set(item.diagnostics.map(({id}) => id))
  for (const [id, diagnostic] of record.diagnosticById) if (!ids.has(id)) {
    diagnostic.row.remove()
    record.diagnosticById.delete(id)
  }
  for (const diagnostic of item.diagnostics) {
    let current = record.diagnosticById.get(diagnostic.id)
    if (!current) {
      const document = record.refs.item.ownerDocument!
      const row = document.createElement("div")
      const term = document.createElement("dt")
      const value = document.createElement("dd")
      const termText = document.createTextNode("")
      const valueText = document.createTextNode("")
      row.className = "layout-dom__diagnostic"
      term.className = "layout-dom__diagnostic-key"
      value.className = "layout-dom__diagnostic-value"
      term.appendChild(termText)
      value.appendChild(valueText)
      row.append(term, value)
      current = {row, term, value, termText, valueText}
      record.diagnosticById.set(diagnostic.id, current)
    }
    syncText(current.termText, diagnostic.label)
    syncText(current.valueText, diagnostic.value)
  }
  reorder(record.refs.diagnostics, item.diagnostics.map(({id}) => record.diagnosticById.get(id)!.row))
}

function normalize(props: LayoutPresentationProps): LayoutPresentationProps {
  if (!props || typeof props !== "object") throw new TypeError("LayoutPresentation props must be an object")
  if (typeof props.title !== "string" || typeof props.showRoutes !== "boolean" || typeof props.showPorts !== "boolean") {
    throw new TypeError("LayoutPresentation title/toggles are invalid")
  }
  if (!Array.isArray(props.cases) || props.cases.length === 0) throw new TypeError("LayoutPresentation cases must be a non-empty array")
  const caseIds = new Set<string>()
  const cases = props.cases.map((item, index): LayoutPresentationCase => {
    assertKey(item.id, `Layout case ${index}`)
    if (caseIds.has(item.id)) throw new Error(`LayoutPresentation case id must be unique: ${item.id}`)
    caseIds.add(item.id)
    if (typeof item.label !== "string" || !["fixed", "adaptive", "dagre-layered", "coffman-graham"].includes(item.policy) || !["RIGHT", "DOWN"].includes(item.direction)) {
      throw new TypeError(`LayoutPresentation case ${item.id} is invalid`)
    }
    assertRect(item.bounds, `Layout case ${item.id} bounds`)
    const nodes = normalizeById<LayoutPresentationNode>(item.nodes, `Layout case ${item.id} node`, (node) => {
      if (typeof node.label !== "string") throw new TypeError(`LayoutPresentation node ${node.id} label must be a string`)
      assertRect(node, `Layout node ${node.id}`)
      return Object.freeze({...node})
    })
    const ports = normalizeById<LayoutPresentationPort>(item.ports, `Layout case ${item.id} port`, (port) => {
      assertPoint(port, `Layout port ${port.id}`)
      if (!["WEST", "EAST", "NORTH", "SOUTH"].includes(port.side)) throw new TypeError(`LayoutPresentation port ${port.id} side is invalid`)
      return Object.freeze({...port})
    })
    const edges = normalizeById<LayoutPresentationEdge>(item.edges, `Layout case ${item.id} edge`, (edge) => {
      if (!Array.isArray(edge.points) || edge.points.length < 2) throw new TypeError(`LayoutPresentation edge ${edge.id} must have at least two points`)
      return Object.freeze({...edge, points: Object.freeze(edge.points.map((point, pointIndex) => {
        assertPoint(point, `Layout edge ${edge.id} point ${pointIndex}`)
        return Object.freeze({...point})
      }))})
    })
    const diagnostics = normalizeById<LayoutPresentationDiagnostic>(item.diagnostics, `Layout case ${item.id} diagnostic`, (diagnostic) => {
      if (typeof diagnostic.label !== "string" || typeof diagnostic.value !== "string") throw new TypeError(`LayoutPresentation diagnostic ${diagnostic.id} is invalid`)
      return Object.freeze({...diagnostic})
    })
    return Object.freeze({...item, bounds: Object.freeze({...item.bounds}), nodes, ports, edges, diagnostics})
  })
  return Object.freeze({...props, cases: Object.freeze(cases)})
}

function normalizeById<T extends Readonly<{id: string}>>(
  items: readonly T[],
  label: string,
  normalizeItem: (item: T) => T,
): readonly T[] {
  if (!Array.isArray(items)) throw new TypeError(`${label}s must be an array`)
  const ids = new Set<string>()
  return Object.freeze(items.map((item, index) => {
    assertKey(item.id, `${label} ${index}`)
    if (ids.has(item.id)) throw new Error(`${label} id must be unique: ${item.id}`)
    ids.add(item.id)
    return normalizeItem(item)
  }))
}

function assertKey(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${label} id must be non-empty`)
}
function assertPoint(point: LayoutPresentationPoint, label: string): void {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) throw new TypeError(`${label} must be finite`)
}
function assertRect(rect: LayoutPresentationBounds, label: string): void {
  assertPoint(rect, label)
  if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height) || rect.width <= 0 || rect.height <= 0) throw new TypeError(`${label} size must be finite and positive`)
}
function reorder(parent: HTMLElement, children: readonly HTMLElement[]): void {
  let reference = parent.firstChild
  for (const child of children) {
    if (child !== reference) parent.insertBefore(child, reference)
    reference = child.nextSibling
  }
}
function syncText(text: Text, value: string): void { if (text.data !== value) text.data = value }
function syncBooleanAttribute(element: HTMLElement, name: string, value: boolean): void {
  if (value) {
    if (!element.hasAttribute(name)) element.setAttribute(name, "")
  } else element.removeAttribute(name)
}
function setStyle(element: HTMLElement, declarations: readonly string[]): void {
  element.setAttribute("style", declarations.join(";"))
}
function decimal(value: number): string { return String(Math.round(value * 1000) / 1000) }
function formatBounds(bounds: LayoutPresentationBounds): string {
  return `${decimal(bounds.width)} × ${decimal(bounds.height)}`
}
