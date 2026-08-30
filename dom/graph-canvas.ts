import type {
  Document,
  HTMLDivElement,
  HTMLElement,
  Text,
} from "@zavx0z/dom"
import {
  createLink,
  linkCss,
  normalizeLinkDefinition,
  type LinkController,
  type LinkEndpoint,
  type LinkSegmentRefs,
} from "./link.ts"
import {
  createNode,
  nodeCss,
  normalizeNodeDefinition,
  type NodeController,
  type NodeDefinition,
} from "./node.ts"
import type {SocketKind} from "./socket.ts"

export type GraphCanvasScene = Readonly<{
  translateX: number
  translateY: number
  scale: number
}>

export type GraphCanvasFrame = Readonly<{
  id: string
  label: string
  title: string
  x: number
  y: number
  width: number
  height: number
  selected: boolean
}>

export type GraphCanvasLinkSegment = Readonly<{
  x1: number
  y1: number
  x2: number
  y2: number
}>

export type GraphCanvasLink = Readonly<{
  id: string
  title: string
  selected: boolean
  kind?: SocketKind
  from?: LinkEndpoint
  to?: LinkEndpoint
  disabled?: boolean
  segments: readonly GraphCanvasLinkSegment[]
}>

export type GraphCanvasNode = NodeDefinition & Readonly<{
  x: number
  y: number
  width: number
  height: number
  selected: boolean
}>

export type GraphCanvasProps = Readonly<{
  title: string
  width: number
  height: number
  scene: GraphCanvasScene
  frames: readonly GraphCanvasFrame[]
  links: readonly GraphCanvasLink[]
  nodes: readonly GraphCanvasNode[]
}>

export type GraphCanvasFrameRefs = Readonly<{
  element: HTMLElement
  label: HTMLElement
  labelText: Text
}>

export type GraphCanvasLinkSegmentRefs = LinkSegmentRefs

export type GraphCanvasLinkRefs = Readonly<{
  element: HTMLDivElement
  segmentRefs(index: number): GraphCanvasLinkSegmentRefs | null
}>

export type GraphCanvasNodeRefs = NodeController["refs"]

export type GraphCanvasRefs = Readonly<{
  root: HTMLElement
  header: HTMLElement
  headerText: Text
  viewport: HTMLDivElement
  scene: HTMLDivElement
}>

export type GraphCanvasController = Readonly<{
  element: HTMLElement
  refs: GraphCanvasRefs
  props: GraphCanvasProps
  frameRefs(id: string): GraphCanvasFrameRefs | null
  linkRefs(id: string): GraphCanvasLinkRefs | null
  nodeRefs(id: string): GraphCanvasNodeRefs | null
  update(props: GraphCanvasProps): void
  dispose(): void
}>

type LinkRecord = {controller: LinkController; refs: GraphCanvasLinkRefs}

const defaultFrames = Object.freeze([
  Object.freeze({
    id: "pipeline",
    label: "Pipeline",
    title: "Pipeline frame",
    x: 18,
    y: 20,
    width: 584,
    height: 248,
    selected: false,
  }),
])

const defaultLinks = Object.freeze([
  Object.freeze({
    id: "input-process",
    title: "Input to Process",
    selected: false,
    segments: Object.freeze([
      Object.freeze({x1: 180, y1: 106, x2: 216, y2: 106}),
      Object.freeze({x1: 216, y1: 106, x2: 216, y2: 171}),
      Object.freeze({x1: 216, y1: 171, x2: 250, y2: 171}),
    ]),
  }),
  Object.freeze({
    id: "process-output",
    title: "Process to Output",
    selected: true,
    segments: Object.freeze([
      Object.freeze({x1: 402, y1: 171, x2: 420, y2: 171}),
      Object.freeze({x1: 420, y1: 171, x2: 420, y2: 109}),
      Object.freeze({x1: 420, y1: 109, x2: 440, y2: 109}),
    ]),
  }),
])

const defaultNodes = Object.freeze([
  Object.freeze({
    id: "input",
    label: "Input",
    title: "Input node",
    x: 50,
    y: 70,
    width: 130,
    height: 72,
    selected: false,
  }),
  Object.freeze({
    id: "process",
    label: "Process",
    title: "Process node",
    x: 250,
    y: 128,
    width: 152,
    height: 86,
    selected: true,
  }),
  Object.freeze({
    id: "output",
    label: "Output",
    title: "Output node",
    x: 440,
    y: 72,
    width: 136,
    height: 74,
    selected: false,
  }),
])

export const graphCanvasDefaultProps: GraphCanvasProps = Object.freeze({
  title: "Graph Canvas",
  width: 640,
  height: 360,
  scene: Object.freeze({translateX: 0, translateY: 0, scale: 1}),
  frames: defaultFrames,
  links: defaultLinks,
  nodes: defaultNodes,
})

export const graphCanvasCss = /* @__PURE__ */ [nodeCss, linkCss, /* @__PURE__ */ String.raw`
.graph-canvas {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #111111;
  border-radius: 4px;
  background: #1d1d1d;
  color: #e0e0e0;
}

.graph-canvas__header {
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

.graph-canvas__viewport {
  box-sizing: border-box;
  position: relative;
  display: block;
  min-height: 0;
  flex-grow: 1;
  overflow: hidden;
  background: #1d1d1d;
}

.graph-canvas__scene {
  box-sizing: border-box;
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
}

.graph-canvas__frame {
  box-sizing: border-box;
  position: absolute;
  display: block;
  border: 1px solid #3b3b3b;
  border-radius: 6px;
  background: #262626;
  color: #a8a8a8;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
}

.graph-canvas__frame[aria-selected="true"] {
  border-color: #2d6880;
  box-shadow: 0 2px 10px rgba(45, 104, 128, 0.5);
}

.graph-canvas__frame-label {
  box-sizing: border-box;
  display: block;
  width: 100%;
  height: 24px;
  padding: 5px 8px;
  border-bottom: 1px solid #3b3b3b;
  color: #a8a8a8;
  font-size: 11px;
}

.graph-canvas__link {
  box-sizing: border-box;
  display: block;
  width: 0;
  height: 0;
}
.graph-canvas__node { position: absolute; }
`] .join("\n")

export function createGraphCanvas(
  document: Document,
  initialProps: GraphCanvasProps = graphCanvasDefaultProps,
): GraphCanvasController {
  const root = document.createElement("section")
  const header = document.createElement("header")
  const headerText = document.createTextNode("")
  const viewport = document.createElement("div")
  const scene = document.createElement("div")
  const frameRecords = new Map<string, GraphCanvasFrameRefs>()
  const linkRecords = new Map<string, LinkRecord>()
  const nodeRecords = new Map<string, NodeController>()
  let currentProps = normalizeProps(initialProps)
  let disposed = false

  root.className = "graph-canvas"
  header.className = "graph-canvas__header"
  header.appendChild(headerText)
  viewport.className = "graph-canvas__viewport"
  viewport.setAttribute("role", "application")
  scene.className = "graph-canvas__scene"
  scene.setAttribute("role", "listbox")
  scene.setAttribute("aria-multiselectable", "true")
  viewport.appendChild(scene)
  root.append(header, viewport)

  const apply = (next: GraphCanvasProps): void => {
    document.transaction(() => {
      syncText(headerText, next.title)
      syncAttribute(root, "style", canvasStyle(next))
      syncAttribute(root, "data-frame-count", String(next.frames.length))
      syncAttribute(root, "data-link-count", String(next.links.length))
      syncAttribute(root, "data-node-count", String(next.nodes.length))
      syncAttribute(viewport, "aria-label", next.title)
      syncAttribute(scene, "style", sceneStyle(next.scene))

      const framesChanged = next.frames !== currentProps.frames || frameRecords.size !== next.frames.length
      const linksChanged = next.links !== currentProps.links || linkRecords.size !== next.links.length
      const nodesChanged = next.nodes !== currentProps.nodes || nodeRecords.size !== next.nodes.length
      if (framesChanged) reconcileFrames(document, frameRecords, next.frames)
      if (linksChanged) reconcileLinks(document, linkRecords, next.links)
      if (nodesChanged) reconcileNodes(document, nodeRecords, next.nodes)
      if (framesChanged || linksChanged || nodesChanged) reorderScene(scene, [
        ...next.frames.map(({id}) => frameRecords.get(id)!.element),
        ...next.links.map(({id}) => linkRecords.get(id)!.refs.element),
        ...next.nodes.map(({id}) => nodeRecords.get(id)!.element),
      ])
      currentProps = next
    })
  }

  const refs: GraphCanvasRefs = Object.freeze({root, header, headerText, viewport, scene})
  const controller: GraphCanvasController = Object.freeze({
    element: root,
    refs,
    get props() { return currentProps },
    frameRefs(id) { return frameRecords.get(String(id)) ?? null },
    linkRefs(id) { return linkRecords.get(String(id))?.refs ?? null },
    nodeRefs(id) { return nodeRecords.get(String(id))?.refs ?? null },
    update(props) {
      if (disposed) throw new Error("GraphCanvas controller is disposed")
      const next = normalizeProps(props)
      apply(Object.freeze({
        ...next,
        frames: props.frames === currentProps.frames ? currentProps.frames : next.frames,
        links: props.links === currentProps.links ? currentProps.links : next.links,
        nodes: props.nodes === currentProps.nodes ? currentProps.nodes : next.nodes,
      }))
    },
    dispose() {
      if (disposed) return
      disposed = true
      for (const record of linkRecords.values()) record.controller.dispose()
      for (const node of nodeRecords.values()) node.dispose()
    },
  })
  apply(currentProps)
  return controller
}

function reconcileFrames(
  document: Document,
  records: Map<string, GraphCanvasFrameRefs>,
  frames: readonly GraphCanvasFrame[],
): void {
  removeMissing(records, new Set(frames.map(({id}) => id)), ({element}) => element.remove())
  for (const frame of frames) {
    let record = records.get(frame.id)
    if (!record) {
      const element = document.createElement("section")
      const label = document.createElement("span")
      const labelText = document.createTextNode("")
      element.className = "graph-canvas__frame"
      element.setAttribute("role", "option")
      element.tabIndex = 0
      label.className = "graph-canvas__frame-label"
      label.appendChild(labelText)
      element.appendChild(label)
      record = Object.freeze({element, label, labelText})
      records.set(frame.id, record)
    }
    syncText(record.labelText, frame.label)
    syncSelectable(record.element, "data-frame-id", frame.id, frame.title, frame.selected)
    syncAttribute(record.element, "style", positionedStyle(frame))
  }
}

function reconcileLinks(
  document: Document,
  records: Map<string, LinkRecord>,
  links: readonly GraphCanvasLink[],
): void {
  removeMissing(records, new Set(links.map(({id}) => id)), ({controller}) => {
    controller.element.remove()
    controller.dispose()
  })
  for (const link of links) {
    let record = records.get(link.id)
    if (!record) {
      const controller = createLink(document, link)
      const refs: GraphCanvasLinkRefs = Object.freeze({
        element: controller.element,
        segmentRefs(index) { return controller.refs.segment(index) },
      })
      record = {controller, refs}
      records.set(link.id, record)
    } else record.controller.update(link)
  }
}

function reconcileNodes(
  document: Document,
  records: Map<string, NodeController>,
  nodes: readonly GraphCanvasNode[],
): void {
  removeMissing(records, new Set(nodes.map(({id}) => id)), (controller) => {
    controller.element.remove()
    controller.dispose()
  })
  for (const node of nodes) {
    const current = records.get(node.id)
    if (current) current.update(node)
    else {
      const controller = createNode(document, node)
      controller.element.className = "node-article graph-canvas__node"
      records.set(node.id, controller)
    }
  }
}

function removeMissing<RecordValue>(
  records: Map<string, RecordValue>,
  ids: ReadonlySet<string>,
  remove: (record: RecordValue) => void,
): void {
  for (const [id, record] of records) {
    if (ids.has(id)) continue
    remove(record)
    records.delete(id)
  }
}

function reorderScene(scene: HTMLDivElement, elements: readonly HTMLElement[]): void {
  let reference = scene.firstChild
  for (const element of elements) {
    if (element !== reference) scene.insertBefore(element, reference)
    reference = element.nextSibling
  }
}

function normalizeProps(props: GraphCanvasProps): GraphCanvasProps {
  if (typeof props !== "object" || props === null) throw new TypeError("GraphCanvas props must be an object")
  assertString(props.title, "GraphCanvas title")
  assertPositive(props.width, "GraphCanvas width")
  assertPositive(props.height, "GraphCanvas height")
  if (typeof props.scene !== "object" || props.scene === null) throw new TypeError("GraphCanvas scene must be an object")
  assertFinite(props.scene.translateX, "GraphCanvas scene translateX")
  assertFinite(props.scene.translateY, "GraphCanvas scene translateY")
  assertPositive(props.scene.scale, "GraphCanvas scene scale")

  const frames = normalizePositioned(props.frames, "Frame")
  const nodes = Object.freeze(normalizePositioned(props.nodes, "Node")
    .map((node) => normalizeNodeDefinition(node) as GraphCanvasNode))
  if (!Array.isArray(props.links)) throw new TypeError("GraphCanvas Links must be an array")
  const linkIds = new Set<string>()
  const links = props.links.map((link, linkIndex) => {
    if (typeof link !== "object" || link === null) throw new TypeError(`GraphCanvas Link ${linkIndex} must be an object`)
    assertNonEmpty(link.id, `GraphCanvas Link ${linkIndex} id`)
    if (linkIds.has(link.id)) throw new Error(`GraphCanvas Link id must be unique: ${link.id}`)
    linkIds.add(link.id)
    assertNonEmpty(link.title, `GraphCanvas Link ${link.id} title`)
    assertBoolean(link.selected, `GraphCanvas Link ${link.id} selected`)
    if (!Array.isArray(link.segments) || link.segments.length === 0) {
      throw new TypeError(`GraphCanvas Link ${link.id} segments must be a non-empty array`)
    }
    const segments = link.segments.map((
      segment: GraphCanvasLinkSegment,
      segmentIndex: number,
    ) => {
      if (typeof segment !== "object" || segment === null) {
        throw new TypeError(`GraphCanvas Link ${link.id} segment ${segmentIndex} must be an object`)
      }
      for (const coordinate of ["x1", "y1", "x2", "y2"] as const) {
        assertFinite(segment[coordinate], `GraphCanvas Link ${link.id} segment ${segmentIndex} ${coordinate}`)
      }
      const horizontal = segment.y1 === segment.y2 && segment.x1 !== segment.x2
      const vertical = segment.x1 === segment.x2 && segment.y1 !== segment.y2
      if (!horizontal && !vertical) {
        throw new Error(`GraphCanvas Link ${link.id} segment ${segmentIndex} must be strictly axis-aligned`)
      }
      return Object.freeze({...segment})
    })
    return normalizeLinkDefinition({...link, segments: Object.freeze(segments)}) as GraphCanvasLink
  })

  return Object.freeze({
    title: props.title,
    width: props.width,
    height: props.height,
    scene: Object.freeze({...props.scene}),
    frames,
    links: Object.freeze(links),
    nodes,
  })
}

function normalizePositioned<Positioned extends GraphCanvasFrame | GraphCanvasNode>(
  source: readonly Positioned[],
  kind: "Frame" | "Node",
): readonly Positioned[] {
  if (!Array.isArray(source)) throw new TypeError(`GraphCanvas ${kind}s must be an array`)
  const ids = new Set<string>()
  return Object.freeze(source.map((entry, index) => {
    if (typeof entry !== "object" || entry === null) throw new TypeError(`GraphCanvas ${kind} ${index} must be an object`)
    assertNonEmpty(entry.id, `GraphCanvas ${kind} ${index} id`)
    if (ids.has(entry.id)) throw new Error(`GraphCanvas ${kind} id must be unique: ${entry.id}`)
    ids.add(entry.id)
    assertNonEmpty(entry.label, `GraphCanvas ${kind} ${entry.id} label`)
    assertString(entry.title, `GraphCanvas ${kind} ${entry.id} title`)
    assertFinite(entry.x, `GraphCanvas ${kind} ${entry.id} x`)
    assertFinite(entry.y, `GraphCanvas ${kind} ${entry.id} y`)
    assertPositive(entry.width, `GraphCanvas ${kind} ${entry.id} width`)
    assertPositive(entry.height, `GraphCanvas ${kind} ${entry.id} height`)
    assertBoolean(entry.selected, `GraphCanvas ${kind} ${entry.id} selected`)
    return Object.freeze({...entry}) as Positioned
  }))
}

function syncSelectable(
  element: HTMLElement,
  idAttribute: string,
  id: string,
  title: string,
  selected: boolean,
): void {
  syncAttribute(element, idAttribute, id)
  syncAttribute(element, "aria-selected", String(selected))
  if (element.title !== title) element.title = title
}

function canvasStyle(props: GraphCanvasProps): string {
  return `width: ${props.width}px; height: ${props.height}px`
}

function sceneStyle(scene: GraphCanvasScene): string {
  return `transform: translate(${scene.translateX}px, ${scene.translateY}px) scale(${scene.scale}); transform-origin: 0 0`
}

function positionedStyle(entry: GraphCanvasFrame | GraphCanvasNode): string {
  return `left: ${entry.x}px; top: ${entry.y}px; width: ${entry.width}px; height: ${entry.height}px`
}

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string") throw new TypeError(`${label} must be a string`)
}

function assertNonEmpty(value: unknown, label: string): asserts value is string {
  assertString(value, label)
  if (value.trim().length === 0) throw new TypeError(`${label} must not be empty`)
}

function assertFinite(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(`${label} must be finite`)
}

function assertPositive(value: unknown, label: string): asserts value is number {
  assertFinite(value, label)
  if (value <= 0) throw new RangeError(`${label} must be greater than zero`)
}

function assertBoolean(value: unknown, label: string): asserts value is boolean {
  if (typeof value !== "boolean") throw new TypeError(`${label} must be a boolean`)
}

function syncText(node: Text, value: string): void {
  if (node.data !== value) node.data = value
}

function syncAttribute(element: HTMLElement, name: string, value: string): void {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value)
}
