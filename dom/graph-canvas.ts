import type {
  Document,
  HTMLDivElement,
  HTMLVectorPathElement,
  HTMLElement,
  Text,
} from "@zavx0z/dom"
import {
  createLink,
  linkCss,
  normalizeLinkDefinition,
  type LinkController,
  type LinkEndpoint,
  type LinkPathBounds,
  type LinkPathProjection,
  type LinkRoute,
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

export type GraphCanvasLink = Readonly<{
  id: string
  title: string
  selected: boolean
  kind?: SocketKind
  from?: LinkEndpoint
  to?: LinkEndpoint
  disabled?: boolean
  route: LinkRoute
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

export type GraphCanvasLinkRefs = Readonly<{
  element: HTMLVectorPathElement
  projection: LinkPathProjection
  bounds: LinkPathBounds
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
const normalizedLinkChanges = new WeakMap<object, Readonly<{
  previous: WeakRef<readonly GraphCanvasLink[]>
  indices: readonly number[]
}>>()

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
    route: Object.freeze({
      kind: "orthogonal" as const,
      points: Object.freeze([
        Object.freeze({x: 180, y: 106}),
        Object.freeze({x: 216, y: 106}),
        Object.freeze({x: 216, y: 171}),
        Object.freeze({x: 250, y: 171}),
      ]),
    }),
  }),
  Object.freeze({
    id: "process-output",
    title: "Process to Output",
    selected: true,
    route: Object.freeze({
      kind: "orthogonal" as const,
      points: Object.freeze([
        Object.freeze({x: 402, y: 171}),
        Object.freeze({x: 420, y: 171}),
        Object.freeze({x: 420, y: 109}),
        Object.freeze({x: 440, y: 109}),
      ]),
    }),
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

.graph-canvas__node { position: absolute; z-index: 3; }
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
      const linkChange = linksChanged ? normalizedLinkChanges.get(next.links) : undefined
      const stableLinkOrder = linkRecords.size === currentProps.links.length && linkChange?.previous.deref() === currentProps.links
      const orderChanged = scene.childNodes.length === 0 || !sameIds(currentProps.frames, next.frames) ||
        linksChanged && !stableLinkOrder ||
        !sameIds(currentProps.nodes, next.nodes)
      if (framesChanged) reconcileFrames(document, frameRecords, next.frames)
      if (linksChanged) reconcileLinks(document, linkRecords, next.links, stableLinkOrder ? linkChange.indices : undefined)
      if (nodesChanged) reconcileNodes(document, nodeRecords, next.nodes)
      if (orderChanged) {
        reorderScene(scene, [
          ...next.frames.map(({id}) => frameRecords.get(id)!.element),
          ...next.links.map(({id}) => linkRecords.get(id)!.refs.element),
          ...next.nodes.map(({id}) => nodeRecords.get(id)!.element),
        ])
      }
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
      apply(normalizeProps(props, currentProps))
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
  changes?: readonly number[],
): void {
  if (changes !== undefined) {
    for (const index of changes) {
      const link = links[index]!
      records.get(link.id)!.controller.update(link)
    }
    return
  }
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
        get projection() { return controller.projection },
        get bounds() { return controller.projection.bounds },
      })
      record = {controller, refs}
      records.set(link.id, record)
    } else if (record.controller.definition !== link) record.controller.update(link)
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

function normalizeProps(props: GraphCanvasProps, previous?: GraphCanvasProps): GraphCanvasProps {
  if (typeof props !== "object" || props === null) throw new TypeError("GraphCanvas props must be an object")
  assertString(props.title, "GraphCanvas title")
  assertPositive(props.width, "GraphCanvas width")
  assertPositive(props.height, "GraphCanvas height")
  if (typeof props.scene !== "object" || props.scene === null) throw new TypeError("GraphCanvas scene must be an object")
  assertFinite(props.scene.translateX, "GraphCanvas scene translateX")
  assertFinite(props.scene.translateY, "GraphCanvas scene translateY")
  assertPositive(props.scene.scale, "GraphCanvas scene scale")

  const frames = props.frames === previous?.frames ? previous.frames : normalizePositioned(props.frames, "Frame")
  const nodes = props.nodes === previous?.nodes ? previous.nodes : Object.freeze(normalizePositioned(props.nodes, "Node")
    .map((node) => normalizeNodeDefinition(node) as GraphCanvasNode))
  const links = props.links === previous?.links ? previous.links : normalizeLinks(props.links, previous?.links)

  return Object.freeze({
    title: props.title,
    width: props.width,
    height: props.height,
    scene: Object.freeze({...props.scene}),
    frames,
    links,
    nodes,
  })
}

function normalizeLinks(
  links: readonly GraphCanvasLink[],
  previous?: readonly GraphCanvasLink[],
): readonly GraphCanvasLink[] {
  if (!Array.isArray(links)) throw new TypeError("GraphCanvas Links must be an array")
  if (previous !== undefined && normalizedLinkChanges.get(links)?.previous.deref() === previous) return links
  const linkIds = new Set<string>()
  return Object.freeze(links.map((link, linkIndex) => {
    if (typeof link !== "object" || link === null) throw new TypeError(`GraphCanvas Link ${linkIndex} must be an object`)
    assertNonEmpty(link.id, `GraphCanvas Link ${linkIndex} id`)
    if (linkIds.has(link.id)) throw new Error(`GraphCanvas Link id must be unique: ${link.id}`)
    linkIds.add(link.id)
    assertNonEmpty(link.title, `GraphCanvas Link ${link.id} title`)
    assertBoolean(link.selected, `GraphCanvas Link ${link.id} selected`)
    return normalizeLinkDefinition(link) as GraphCanvasLink
  }))
}

export function replaceGraphCanvasLink(
  links: readonly GraphCanvasLink[],
  index: number,
  nextLink: GraphCanvasLink,
): readonly GraphCanvasLink[] {
  return replaceGraphCanvasLinks(links, [{index, link: nextLink}])
}

export function replaceGraphCanvasLinks(
  links: readonly GraphCanvasLink[],
  replacements: readonly Readonly<{index: number; link: GraphCanvasLink}>[],
): readonly GraphCanvasLink[] {
  if (!Array.isArray(replacements) || replacements.length === 0) throw new TypeError("GraphCanvas Link replacements must not be empty")
  const result = links.slice()
  const indices: number[] = []
  const seen = new Set<number>()
  for (const {index, link} of replacements) {
    if (!Number.isSafeInteger(index) || index < 0 || index >= links.length || seen.has(index)) {
      throw new RangeError("GraphCanvas Link replacement index is invalid or duplicated")
    }
    seen.add(index)
    const previous = links[index]!
    const next = normalizeLinkDefinition(link) as GraphCanvasLink
    if (next.id !== previous.id) throw new Error(`GraphCanvas Link id cannot change: ${previous.id} -> ${next.id}`)
    if (next === previous) continue
    result[index] = next
    indices.push(index)
  }
  if (indices.length === 0) return links
  const frozen = Object.freeze(result)
  normalizedLinkChanges.set(frozen, Object.freeze({previous: new WeakRef(links), indices: Object.freeze(indices)}))
  return frozen
}

function sameIds(
  previous: readonly Readonly<{id: string}>[],
  next: readonly Readonly<{id: string}>[],
): boolean {
  return previous.length === next.length && previous.every(({id}, index) => next[index]!.id === id)
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
