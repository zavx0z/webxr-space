import type {
  Link as CoreLink,
  NodeJsonObject,
  NodeJsonValue,
  NodeTreeNodeSnapshot,
  ParameterReference,
  Socket as CoreSocket,
} from "@nodes/core"
import type {LayoutResult} from "@nodes/layout/types"
import {
  projectLinkRoute,
  type LinkPathBounds,
  type LinkPathPoint,
  type LinkRoute,
} from "./src/link-path.ts"

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

export const NODE_HEADER_HEIGHT = 24
export const NODE_BODY_INSET = 8
export const NODE_ROW_HEIGHT = 20
export const NODE_ROW_GAP = 3
export const NODE_DEFAULT_WIDTH = 140
export const NODE_DEFAULT_HEIGHT = 52

type UiNodeSnapshot = NodeTreeNodeSnapshot<ParameterReference, NodeJsonValue, NodeJsonValue>
type UiSocket = CoreSocket<NodeJsonValue>
type UiLink = CoreLink<NodeJsonValue>

export type NodeGeometryIndex = Readonly<{
  nodeRects: ReadonlyMap<string, NodeRect>
  frameRects: ReadonlyMap<string, NodeRect>
  portCenters: ReadonlyMap<string, NodePoint>
  linkRoutes: ReadonlyMap<string, LinkRoute>
  bounds: NodeRect | null
}>

export function createNodeGeometryIndex(
  nodes: readonly UiNodeSnapshot[],
  frames: readonly Readonly<{id: string; metadata?: NodeJsonValue}>[],
  links: readonly UiLink[],
  layout?: LayoutResult | undefined,
): NodeGeometryIndex {
  const layoutNodes = new Map(layout?.nodes.map(node => [node.id, node]) ?? [])
  const frameIds = new Set(frames.map(frame => frame.id))
  const nodeRects = new Map<string, NodeRect>()
  const frameRects = new Map<string, NodeRect>()
  for (let index = 0; index < frames.length; index += 1) {
    const frame = frames[index]!
    const geometry = layoutNodes.get(frame.id)
    frameRects.set(frame.id, geometry === undefined
      ? metadataRect(frame.metadata, 18 + index * 24, 18 + index * 24, 640, 420)
      : rect(geometry.x, geometry.y, geometry.width, geometry.height, `Frame ${frame.id}`))
  }
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]!
    const geometry = layoutNodes.get(node.id)
    nodeRects.set(node.id, geometry === undefined
      ? nodeMetadataRect(node, index)
      : rect(geometry.x, geometry.y, geometry.width, geometry.height, `Node ${node.id}`))
  }

  const layoutPorts = new Map(layout?.ports.map(port => [port.id, Object.freeze({x: port.x, y: port.y})]) ?? [])
  const portCenters = new Map<string, NodePoint>()
  for (const node of nodes) {
    const nodeRect = nodeRects.get(node.id)!
    const parameterIndex = new Map(node.parameters.map((parameter, index) => [parameter.id, index]))
    const looseRight = node.sockets.filter(socket => socket.parameterId === undefined && socketSide(socket) === "right")
    const looseLeft = node.sockets.filter(socket => socket.parameterId === undefined && socketSide(socket) === "left")
    for (const socket of node.sockets) {
      const layoutCenter = layoutPortCenter(layoutPorts, node.id, socket.id)
      const center = layoutCenter ?? fallbackSocketCenter(
        nodeRect,
        socket,
        parameterIndex,
        looseRight,
        looseLeft,
        node.parameters.length,
        metadataBoolean(node.metadata, "collapsed", false),
      )
      portCenters.set(socketKey(node.id, socket.id), center)
    }
  }

  const layoutEdges = new Map(layout?.edges.map(edge => [edge.id, edge]) ?? [])
  const linkRoutes = new Map<string, LinkRoute>()
  for (const link of links) {
    const edge = layoutEdges.get(link.id)
    if (edge !== undefined) {
      const section = edge.sections[0]
      linkRoutes.set(link.id, Object.freeze({
        kind: "orthogonal",
        points: Object.freeze([
          Object.freeze({...section.startPoint}),
          ...section.bendPoints.map(point => Object.freeze({...point})),
          Object.freeze({...section.endPoint}),
        ]),
      }))
      continue
    }
    const authored = metadataRoute(link.metadata)
    linkRoutes.set(link.id, authored ?? routeBetween(
      requiredPortCenter(portCenters, link.from.nodeId, link.from.socketId),
      requiredPortCenter(portCenters, link.to.nodeId, link.to.socketId),
      socketSideById(nodes, link.from.nodeId, link.from.socketId),
    ))
  }

  const geometryRects = [
    ...frameRects.values(),
    ...nodeRects.values(),
    ...linkRoutes.values().map(route => projectLinkRoute(route).bounds),
  ]
  return Object.freeze({
    nodeRects,
    frameRects,
    portCenters,
    linkRoutes,
    bounds: unionRects(geometryRects),
  })
}

export function viewportForTransform(
  transform: NodeTreeTransform,
  width: number,
  height: number,
  overscan = 0,
): NodeTreeViewport {
  const scale = positive(transform.scale, "NodeTree transform scale")
  return Object.freeze({
    x: -finite(transform.x, "NodeTree transform x") / scale,
    y: -finite(transform.y, "NodeTree transform y") / scale,
    width: positive(width, "NodeTree viewport width") / scale,
    height: positive(height, "NodeTree viewport height") / scale,
    overscan: nonNegative(overscan, "NodeTree viewport overscan") / scale,
  })
}

export function fitNodeTreeTransform(
  bounds: NodeRect | null,
  width: number,
  height: number,
  padding: number,
  minScale: number,
  maxScale: number,
): NodeTreeTransform {
  if (bounds === null) return DEFAULT_NODE_TREE_TRANSFORM
  const safePadding = nonNegative(padding, "NodeEditor fit padding")
  const availableWidth = Math.max(1, positive(width, "NodeEditor width") - safePadding * 2)
  const availableHeight = Math.max(1, positive(height, "NodeEditor height") - safePadding * 2)
  const scale = clamp(
    Math.min(availableWidth / Math.max(1, bounds.width), availableHeight / Math.max(1, bounds.height)),
    positive(minScale, "NodeEditor minScale"),
    positive(maxScale, "NodeEditor maxScale"),
  )
  return Object.freeze({
    x: (width - bounds.width * scale) / 2 - bounds.x * scale,
    y: (height - bounds.height * scale) / 2 - bounds.y * scale,
    scale,
  })
}

export function intersectsViewport(viewport: NodeTreeViewport, bounds: NodeRect | LinkPathBounds): boolean {
  const overscan = viewport.overscan ?? 0
  return viewport.x - overscan <= bounds.x + bounds.width &&
    viewport.x + viewport.width + overscan >= bounds.x &&
    viewport.y - overscan <= bounds.y + bounds.height &&
    viewport.y + viewport.height + overscan >= bounds.y
}

export function socketKey(nodeId: string, socketId: string): string {
  return `${nodeId}\u0000${socketId}`
}

export function socketSide(socket: Pick<UiSocket, "direction" | "side">): "left" | "right" {
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

function nodeMetadataRect(node: UiNodeSnapshot, index: number): NodeRect {
  const width = metadataNumber(node.metadata, "width") ?? 216
  const height = metadataNumber(node.metadata, "height") ?? Math.max(
    NODE_DEFAULT_HEIGHT,
    NODE_HEADER_HEIGHT + NODE_BODY_INSET * 2 +
      (node.parameters.length + node.sockets.filter(socket => socket.parameterId === undefined).length) *
        (NODE_ROW_HEIGHT + NODE_ROW_GAP),
  )
  return metadataRect(node.metadata, 42 + index * 284, 54 + index % 2 * 94, width, height)
}

function metadataRect(
  value: NodeJsonValue | undefined,
  fallbackX: number,
  fallbackY: number,
  fallbackWidth: number,
  fallbackHeight: number,
): NodeRect {
  return rect(
    metadataNumber(value, "x") ?? fallbackX,
    metadataNumber(value, "y") ?? fallbackY,
    metadataNumber(value, "width") ?? fallbackWidth,
    metadataNumber(value, "height") ?? fallbackHeight,
    "Node geometry",
  )
}

function rect(x: number, y: number, width: number, height: number, label: string): NodeRect {
  return Object.freeze({
    x: finite(x, `${label} x`),
    y: finite(y, `${label} y`),
    width: positive(width, `${label} width`),
    height: positive(height, `${label} height`),
  })
}

function fallbackSocketCenter(
  node: NodeRect,
  socket: UiSocket,
  parameterIndex: ReadonlyMap<string, number>,
  looseRight: readonly UiSocket[],
  looseLeft: readonly UiSocket[],
  parameterCount: number,
  collapsed: boolean,
): NodePoint {
  const side = socketSide(socket)
  const x = side === "left" ? node.x : node.x + node.width
  if (collapsed) {
    const sameSide = [...looseRight, ...looseLeft].filter(candidate => socketSide(candidate) === side)
    const index = Math.max(0, sameSide.findIndex(candidate => candidate.id === socket.id))
    return Object.freeze({x, y: node.y + NODE_HEADER_HEIGHT / 2 + (index - (sameSide.length - 1) / 2) * 8})
  }
  let row: number
  if (socket.parameterId !== undefined && parameterIndex.has(socket.parameterId)) {
    row = looseRight.length + parameterIndex.get(socket.parameterId)!
  } else if (side === "right") {
    row = Math.max(0, looseRight.findIndex(candidate => candidate.id === socket.id))
  } else {
    row = looseRight.length + parameterCount + Math.max(0, looseLeft.findIndex(candidate => candidate.id === socket.id))
  }
  return Object.freeze({
    x,
    y: node.y + NODE_HEADER_HEIGHT + NODE_BODY_INSET + row * (NODE_ROW_HEIGHT + NODE_ROW_GAP) + NODE_ROW_HEIGHT / 2,
  })
}

function layoutPortCenter(
  layoutPorts: ReadonlyMap<string, NodePoint>,
  nodeId: string,
  socketId: string,
): NodePoint | undefined {
  return layoutPorts.get(`${nodeId}/${socketId}`) ??
    layoutPorts.get(`${nodeId}:${socketId}`) ??
    layoutPorts.get(socketId)
}

function requiredPortCenter(
  ports: ReadonlyMap<string, NodePoint>,
  nodeId: string,
  socketId: string,
): NodePoint {
  return ports.get(socketKey(nodeId, socketId)) ?? Object.freeze({x: 0, y: 0})
}

function socketSideById(
  nodes: readonly UiNodeSnapshot[],
  nodeId: string,
  socketId: string,
): "left" | "right" {
  const socket = nodes.find(node => node.id === nodeId)?.sockets.find(candidate => candidate.id === socketId)
  return socket === undefined ? "right" : socketSide(socket)
}

function routeBetween(from: NodePoint, to: NodePoint, fromSide: "left" | "right"): LinkRoute {
  if (from.x === to.x && from.y === to.y) {
    const outerX = from.x + (fromSide === "left" ? -30 : 30)
    return Object.freeze({
      kind: "orthogonal",
      points: Object.freeze([
        from,
        Object.freeze({x: outerX, y: from.y}),
        Object.freeze({x: outerX, y: from.y + 30}),
        Object.freeze({x: from.x, y: from.y + 30}),
        to,
      ]),
    })
  }
  const middleX = Math.round((from.x + to.x) / 2)
  return Object.freeze({
    kind: "orthogonal",
    points: Object.freeze(dedupePoints([
      from,
      Object.freeze({x: middleX, y: from.y}),
      Object.freeze({x: middleX, y: to.y}),
      to,
    ])),
  })
}

function dedupePoints(points: readonly LinkPathPoint[]): readonly LinkPathPoint[] {
  return points.filter((point, index) => index === 0 ||
    point.x !== points[index - 1]!.x || point.y !== points[index - 1]!.y)
}

function metadataRoute(value: NodeJsonValue | undefined): LinkRoute | undefined {
  const route = metadata(value, "route")
  if (route === null || typeof route !== "object" || Array.isArray(route)) return undefined
  const record = route as NodeJsonObject
  if (record.kind !== "orthogonal" || !Array.isArray(record.points)) return undefined
  const points: LinkPathPoint[] = []
  for (const point of record.points) {
    if (point === null || typeof point !== "object" || Array.isArray(point)) return undefined
    const entry = point as NodeJsonObject
    if (typeof entry.x !== "number" || typeof entry.y !== "number") return undefined
    points.push(Object.freeze({x: entry.x, y: entry.y}))
  }
  return Object.freeze({kind: "orthogonal", points: Object.freeze(points)})
}

function unionRects(rects: readonly (NodeRect | LinkPathBounds)[]): NodeRect | null {
  if (rects.length === 0) return null
  const x = Math.min(...rects.map(entry => entry.x))
  const y = Math.min(...rects.map(entry => entry.y))
  const right = Math.max(...rects.map(entry => entry.x + entry.width))
  const bottom = Math.max(...rects.map(entry => entry.y + entry.height))
  return Object.freeze({x, y, width: right - x, height: bottom - y})
}
