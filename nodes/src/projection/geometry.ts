import type {
  Link as CoreLink,
  NodeJsonObject,
  NodeJsonValue,
  NodeTreeNodeSnapshot,
  ParameterReference,
  Socket as CoreSocket,
} from "@zavx0z/nodetree"
import type {LayoutResult} from "@zavx0z/layout/types"
import {
  projectLinkRoute,
  type LinkRoute,
} from "../routing/link-path.ts"

export type NodePoint = Readonly<{x: number; y: number}>
export type NodeRect = Readonly<{x: number; y: number; width: number; height: number}>

export type NodeTreeTransform = Readonly<{
  x: number
  y: number
  scale: number
}>

export type NodeTreeViewport = Readonly<{
  x: number
  y: number
  width: number
  height: number
  overscan?: number | undefined
}>

export const DEFAULT_NODE_TREE_TRANSFORM: NodeTreeTransform = Object.freeze({
  x: 0,
  y: 0,
  scale: 1,
})

type UiNodeSnapshot = NodeTreeNodeSnapshot<ParameterReference, NodeJsonValue, NodeJsonValue>
type UiLink = CoreLink<NodeJsonValue>

export type NodeGeometryIndex = Readonly<{
  nodeRects: ReadonlyMap<string, NodeRect>
  frameRects: ReadonlyMap<string, NodeRect>
  portCenters: ReadonlyMap<string, NodePoint>
  portSides: ReadonlyMap<string, "left" | "right">
  linkRoutes: ReadonlyMap<string, LinkRoute>
  bounds: NodeRect
}>

type RetainedNodeGeometryIndex = Readonly<{
  nodeRects: Map<string, NodeRect>
  frameRects: Map<string, NodeRect>
  portCenters: Map<string, NodePoint>
  portSides: Map<string, "left" | "right">
  linkRoutes: Map<string, LinkRoute>
  layoutNodes: ReadonlyMap<string, LayoutResult["nodes"][number]>
  layoutPorts: ReadonlyMap<string, LayoutResult["ports"][number]>
}>

const retainedNodeGeometryIndexes = new WeakMap<NodeGeometryIndex, RetainedNodeGeometryIndex>()

/** Canonical Layout port id for one Core Socket endpoint. */
export function nodeSocketLayoutPortId(nodeId: string, socketId: string): string {
  requireId(nodeId, "Layout port Node")
  requireId(socketId, "Layout port Socket")
  return `${nodeId}/${socketId}`
}

/**
 * Consumes completed owner geometry without placing, measuring or routing.
 * Missing, duplicate or contradictory geometry fails before component materialization.
 */
export function createNodeGeometryIndex(
  nodes: readonly UiNodeSnapshot[],
  frames: readonly Readonly<{id: string; metadata?: NodeJsonValue}>[],
  links: readonly UiLink[],
  layout: LayoutResult,
): NodeGeometryIndex {
  requireLayoutResult(layout)
  const bounds = exactRect(layout.bounds, "Layout bounds")
  const expectedEntityIds = new Set([
    ...frames.map(frame => frame.id),
    ...nodes.map(node => node.id),
  ])
  const layoutNodeById = uniqueMap(layout.nodes, "Layout Node")
  requireIds(expectedEntityIds, layoutNodeById, "Layout Node")

  const frameRects = new Map<string, NodeRect>()
  for (const frame of frames) {
    const geometry = layoutNodeById.get(frame.id)!
    const frameRect = exactRect(geometry, `Frame ${frame.id}`)
    requireContainedRect(bounds, frameRect, `Frame ${frame.id}`)
    frameRects.set(frame.id, frameRect)
  }
  const nodeRects = new Map<string, NodeRect>()
  for (const node of nodes) {
    const geometry = layoutNodeById.get(node.id)!
    const nodeRect = exactRect(geometry, `Node ${node.id}`)
    requireContainedRect(bounds, nodeRect, `Node ${node.id}`)
    nodeRects.set(node.id, nodeRect)
  }

  const expectedPortIds = new Set<string>()
  const socketByPortId = new Map<string, Readonly<{nodeId: string; socket: CoreSocket}>>()
  for (const node of nodes) for (const socket of node.sockets) {
    const portId = nodeSocketLayoutPortId(node.id, socket.id)
    if (expectedPortIds.has(portId)) throw new Error(`Duplicate Core Socket endpoint: ${portId}`)
    expectedPortIds.add(portId)
    socketByPortId.set(portId, Object.freeze({nodeId: node.id, socket}))
  }
  const layoutPortById = uniqueMap(layout.ports, "Layout Port")
  requireIds(expectedPortIds, layoutPortById, "Layout Port")
  const portCenters = new Map<string, NodePoint>()
  const portSides = new Map<string, "left" | "right">()
  for (const [portId, owner] of socketByPortId) {
    const port = layoutPortById.get(portId)!
    const key = socketKey(owner.nodeId, owner.socket.id)
    const ownerRect = nodeRects.get(owner.nodeId)!
    const geometry = exactPortGeometry(portId, ownerRect, port)
    portCenters.set(key, geometry.center)
    portSides.set(key, geometry.side)
  }

  const expectedEdgeIds = new Set(links.map(link => link.id))
  const layoutEdgeById = uniqueMap(layout.edges, "Layout Edge")
  requireIds(expectedEdgeIds, layoutEdgeById, "Layout Edge")
  const linkRoutes = new Map<string, LinkRoute>()
  for (const link of links) {
    const edge = layoutEdgeById.get(link.id)!
    const section = edge.sections[0]
    const from = requiredPortCenter(portCenters, link.from.nodeId, link.from.socketId)
    const to = requiredPortCenter(portCenters, link.to.nodeId, link.to.socketId)
    requirePoint(section.startPoint, from, `Layout Edge ${link.id} source`)
    requirePoint(section.endPoint, to, `Layout Edge ${link.id} target`)
    const route = Object.freeze({
      kind: "orthogonal" as const,
      points: Object.freeze([
        Object.freeze({...section.startPoint}),
        ...section.bendPoints.map(point => Object.freeze({...point})),
        Object.freeze({...section.endPoint}),
      ]),
    })
    const projection = projectLinkRoute(route)
    requireContainedRect(bounds, projection.bounds, `Layout Edge ${link.id}`)
    linkRoutes.set(link.id, route)
  }

  const result = Object.freeze({
    nodeRects,
    frameRects,
    portCenters,
    portSides,
    linkRoutes,
    bounds,
  })
  retainedNodeGeometryIndexes.set(result, Object.freeze({
    nodeRects,
    frameRects,
    portCenters,
    portSides,
    linkRoutes,
    layoutNodes: layoutNodeById,
    layoutPorts: layoutPortById,
  }))
  return result
}

/** Adds one Core-confirmed append through copy-on-write retained geometry indexes. */
export function appendNodeGeometryIndex(
  geometry: NodeGeometryIndex,
  node: UiNodeSnapshot,
): NodeGeometryIndex {
  const retained = retainedNodeGeometryIndexes.get(geometry)
  if (retained === undefined) throw new Error("Node geometry index is not retained")
  if (retained.nodeRects.has(node.id)) throw new Error(`Node geometry already exists: ${node.id}`)
  const layoutNode = retained.layoutNodes.get(node.id)
  if (layoutNode === undefined) throw new Error(`Layout Node geometry is missing: ${node.id}`)
  const nodeRect = exactRect(layoutNode, `Node ${node.id}`)
  requireContainedRect(geometry.bounds, nodeRect, `Node ${node.id}`)

  const ports: ReadonlyArray<Readonly<{
    key: string
    center: NodePoint
    side: "left" | "right"
  }>> = node.sockets.map(socket => {
    const portId = nodeSocketLayoutPortId(node.id, socket.id)
    const key = socketKey(node.id, socket.id)
    if (retained.portCenters.has(key)) throw new Error(`Socket geometry already exists: ${portId}`)
    const port = retained.layoutPorts.get(portId)
    if (port === undefined) throw new Error(`Layout Port geometry is missing: ${portId}`)
    const exact = exactPortGeometry(portId, nodeRect, port)
    return Object.freeze({key, center: exact.center, side: exact.side})
  })
  if (new Set(ports.map(port => port.key)).size !== ports.length) {
    throw new Error(`Duplicate Core Socket endpoint on appended Node: ${node.id}`)
  }

  const nodeRects = new Map(retained.nodeRects)
  const portCenters = new Map(retained.portCenters)
  const portSides = new Map(retained.portSides)
  nodeRects.set(node.id, nodeRect)
  for (const port of ports) {
    portCenters.set(port.key, port.center)
    portSides.set(port.key, port.side)
  }
  const result = Object.freeze({
    nodeRects,
    frameRects: retained.frameRects,
    portCenters,
    portSides,
    linkRoutes: retained.linkRoutes,
    bounds: geometry.bounds,
  })
  retainedNodeGeometryIndexes.set(result, Object.freeze({
    nodeRects,
    frameRects: retained.frameRects,
    portCenters,
    portSides,
    linkRoutes: retained.linkRoutes,
    layoutNodes: retained.layoutNodes,
    layoutPorts: retained.layoutPorts,
  }))
  return result
}

export function fitNodeTreeTransform(
  bounds: NodeRect,
  width: number,
  height: number,
  padding: number,
  minScale: number,
  maxScale: number,
): NodeTreeTransform {
  const safePadding = nonNegative(padding, "NodeEditor fit padding")
  const availableWidth = Math.max(1, positive(width, "NodeEditor width") - safePadding * 2)
  const availableHeight = Math.max(1, positive(height, "NodeEditor height") - safePadding * 2)
  const scale = clamp(
    Math.min(availableWidth / bounds.width, availableHeight / bounds.height),
    positive(minScale, "NodeEditor minScale"),
    positive(maxScale, "NodeEditor maxScale"),
  )
  return Object.freeze({
    x: (width - bounds.width * scale) / 2 - bounds.x * scale,
    y: (height - bounds.height * scale) / 2 - bounds.y * scale,
    scale,
  })
}

export function intersectsViewport(viewport: NodeTreeViewport, bounds: NodeRect): boolean {
  const overscan = viewport.overscan ?? 0
  return viewport.x - overscan <= bounds.x + bounds.width &&
    viewport.x + viewport.width + overscan >= bounds.x &&
    viewport.y - overscan <= bounds.y + bounds.height &&
    viewport.y + viewport.height + overscan >= bounds.y
}

export function socketKey(nodeId: string, socketId: string): string {
  return `${nodeId}\u0000${socketId}`
}

export function socketSide(socket: Pick<CoreSocket, "direction" | "side">): "left" | "right" {
  return socket.side ?? (socket.direction === "output" ? "right" : "left")
}

export function metadata(value: NodeJsonValue | undefined, key: string): NodeJsonValue | undefined {
  if (value === null || value === undefined || typeof value !== "object" || Array.isArray(value)) return undefined
  return (value as NodeJsonObject)[key]
}

export function metadataString(value: NodeJsonValue | undefined, key: string, fallback: string): string {
  const candidate = metadata(value, key)
  return typeof candidate === "string" && candidate.length > 0 ? candidate : fallback
}

export function metadataNumber(value: NodeJsonValue | undefined, key: string): number | undefined {
  const candidate = metadata(value, key)
  return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : undefined
}

export function metadataBoolean(value: NodeJsonValue | undefined, key: string, fallback: boolean): boolean {
  const candidate = metadata(value, key)
  return typeof candidate === "boolean" ? candidate : fallback
}

export function metadataStringArray(value: NodeJsonValue | undefined, key: string): readonly string[] | undefined {
  const candidate = metadata(value, key)
  if (!Array.isArray(candidate) || !candidate.every(entry => typeof entry === "string")) return undefined
  return candidate as readonly string[]
}

export function metadataObjectArray(value: NodeJsonValue | undefined, key: string): readonly NodeJsonObject[] | undefined {
  const candidate = metadata(value, key)
  if (!Array.isArray(candidate) || !candidate.every(entry => entry !== null && typeof entry === "object" && !Array.isArray(entry))) {
    return undefined
  }
  return candidate as readonly NodeJsonObject[]
}

export function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new TypeError(`${label} must be finite`)
  return value
}

export function positive(value: number, label: string): number {
  finite(value, label)
  if (value <= 0) throw new RangeError(`${label} must be positive`)
  return value
}

export function nonNegative(value: number, label: string): number {
  finite(value, label)
  if (value < 0) throw new RangeError(`${label} must be non-negative`)
  return value
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function requireLayoutResult(layout: LayoutResult): void {
  if (typeof layout !== "object" || layout === null) throw new TypeError("NodeTree layout is required")
  if (!Array.isArray(layout.nodes) || !Array.isArray(layout.ports) || !Array.isArray(layout.edges)) {
    throw new TypeError("NodeTree layout must contain Node, Port and Edge geometry arrays")
  }
  exactRect(layout.bounds, "Layout bounds")
}

function uniqueMap<Entry extends Readonly<{id: string}>>(
  entries: readonly Entry[],
  label: string,
): ReadonlyMap<string, Entry> {
  const result = new Map<string, Entry>()
  for (const entry of entries) {
    requireId(entry.id, label)
    if (result.has(entry.id)) throw new Error(`${label} id must be unique: ${entry.id}`)
    result.set(entry.id, entry)
  }
  return result
}

function requireIds(
  expected: ReadonlySet<string>,
  actual: ReadonlyMap<string, unknown>,
  label: string,
): void {
  for (const id of expected) if (!actual.has(id)) throw new Error(`${label} geometry is missing: ${id}`)
}

function exactRect(
  value: Readonly<{x: number; y: number; width: number; height: number}>,
  label: string,
): NodeRect {
  return Object.freeze({
    x: finite(value.x, `${label} x`),
    y: finite(value.y, `${label} y`),
    width: positive(value.width, `${label} width`),
    height: positive(value.height, `${label} height`),
  })
}

function exactPortGeometry(
  portId: string,
  ownerRect: NodeRect,
  port: LayoutResult["ports"][number],
): Readonly<{center: NodePoint; side: "left" | "right"}> {
  if (port.side !== "WEST" && port.side !== "EAST") {
    throw new TypeError(`Layout Port ${portId} side must be WEST or EAST`)
  }
  const x = finite(port.x, `Layout Port ${portId} x`)
  const y = finite(port.y, `Layout Port ${portId} y`)
  const expectedX = port.side === "WEST" ? ownerRect.x : ownerRect.x + ownerRect.width
  if (x !== expectedX || y < ownerRect.y || y > ownerRect.y + ownerRect.height) {
    throw new Error(`Layout Port ${portId} must lie on its resolved Node side`)
  }
  return Object.freeze({
    center: Object.freeze({x, y}),
    side: port.side === "WEST" ? "left" : "right",
  })
}

function requiredPortCenter(
  centers: ReadonlyMap<string, NodePoint>,
  nodeId: string,
  socketId: string,
): NodePoint {
  const center = centers.get(socketKey(nodeId, socketId))
  if (center === undefined) throw new Error(`Layout Port geometry is missing: ${nodeSocketLayoutPortId(nodeId, socketId)}`)
  return center
}

function requirePoint(
  actual: NodePoint,
  expected: NodePoint,
  label: string,
): void {
  if (actual.x !== expected.x || actual.y !== expected.y) {
    throw new Error(`${label} must equal its exact Layout Port center`)
  }
}

function requireContainedRect(outer: NodeRect, inner: NodeRect, label: string): void {
  if (inner.x < outer.x || inner.y < outer.y ||
    inner.x + inner.width > outer.x + outer.width ||
    inner.y + inner.height > outer.y + outer.height) {
    throw new Error(`${label} must be contained by Layout bounds`)
  }
}

function requireId(value: string, label: string): void {
  if (typeof value !== "string" || value.trim().length === 0) throw new TypeError(`${label} id must be non-empty`)
}
