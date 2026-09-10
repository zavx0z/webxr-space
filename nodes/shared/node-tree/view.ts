import type {Link as CoreLink, NodeTreeSnapshot} from "@nodes/tree"
import type {LayoutResult} from "@nodes/layout/types"
import {metadata, metadataBoolean, metadataNumber, metadataString} from "@nodes/parameters/shared"
import {socketKey} from "@nodes/sockets/shared"
import {SOCKET_KINDS, type SocketKind} from "@nodes/sockets/presets"
import {
  appendNodeGeometryIndex,
  createNodeGeometryIndex,
  intersectsViewport,
  type NodeGeometryIndex,
  type NodeRect,
  type NodeTreeViewport,
} from "../projection/geometry.ts"
import type {NodeTreeLayoutState} from "../projection/layout-state.ts"
import {getNodeTreeLayoutStore} from "../projection/layout-state.ts"
import {projectLinkRoute, type LinkRoute} from "../routing/link-path.ts"
import type {NodePreview} from "../node/preview.ts"
import type {
  NodeTreeActions,
  NodeTreeProps,
  NodeTreeSelection,
  NodeTreeStore,
  NodeTreeView,
  UiSnapshot,
  UiNode,
  VisibleNode,
  VisibleFrame,
  VisibleLink,
} from "./contracts.ts"

export function sameSelection(left: NodeTreeSelection | undefined, right: NodeTreeSelection | undefined): boolean {
  return left === right || left !== null && left !== undefined && right !== null && right !== undefined &&
    left.kind === right.kind && left.id === right.id
}

export function sameNodeEntry(left: VisibleNode, right: VisibleNode): boolean {
  return left.node === right.node && left.culled === right.culled && sameRect(left.rect, right.rect)
}

export function sameFrameEntry(left: VisibleFrame, right: VisibleFrame): boolean {
  return left.frame === right.frame && left.culled === right.culled && sameRect(left.rect, right.rect)
}

export function sameLinkEntry(left: VisibleLink, right: VisibleLink): boolean {
  return left.link === right.link && left.culled === right.culled && sameRect(left.bounds, right.bounds) &&
    (left.route === right.route || projectLinkRoute(left.route).d === projectLinkRoute(right.route).d)
}

export function createActions(
  props: Omit<NodeTreeProps, "layout">,
  topology: NodeTreeSnapshot,
  isActive: () => boolean,
): NodeTreeActions {
  const current = () => isActive() && props.store.getTopologySnapshot() === topology
  const frame = new Map<string, (event: Event) => void>()
  const link = new Map<string, (event: Event) => void>()
  const node = new Map<string, (event: Event) => void>()
  const collapse = new Map<string, (collapsed: boolean, event: Event) => void>()
  const preview = new Map<string, (enabled: boolean, event: Event) => void>()
  const sockets = new Map<string, (socketId: string, event: Event) => void>()
  const parameterStores = new Map<string, (parameterId: string) => ReturnType<NodeTreeStore["parameter"]>>()
  return Object.freeze({
    parameterInput(change, event) {
      if (current()) props.onParameterInput?.(change, event)
    },
    parameterChange(change, event) {
      if (current()) props.onParameterChange?.(change, event)
    },
    selectFrame(id) {
      let action = frame.get(id)
      if (action === undefined) {
        action = event => {
          event.stopPropagation()
          if (!current()) return
          props.onSelectionChange?.(Object.freeze({kind: "frame", id}), event)
        }
        frame.set(id, action)
      }
      return action
    },
    selectLink(id) {
      let action = link.get(id)
      if (action === undefined) {
        action = event => {
          event.stopPropagation()
          if (!current()) return
          props.onSelectionChange?.(Object.freeze({kind: "link", id}), event)
        }
        link.set(id, action)
      }
      return action
    },
    selectNode(id) {
      let action = node.get(id)
      if (action === undefined) {
        action = event => {
          event.stopPropagation()
          if (!current()) return
          props.onSelectionChange?.(Object.freeze({kind: "node", id}), event)
        }
        node.set(id, action)
      }
      return action
    },
    collapseNode(id) {
      let action = collapse.get(id)
      if (action === undefined) {
        action = (collapsed, event) => { if (current()) props.onNodeCollapseChange?.(id, collapsed, event) }
        collapse.set(id, action)
      }
      return action
    },
    previewNode(id) {
      let action = preview.get(id)
      if (action === undefined) {
        action = (enabled, event) => { if (current()) props.onNodePreviewChange?.(id, enabled, event) }
        preview.set(id, action)
      }
      return action
    },
    socket(nodeId) {
      let action = sockets.get(nodeId)
      if (action === undefined) {
        action = (socketId, event) => { if (current()) props.onSocketActivate?.(nodeId, socketId, event) }
        sockets.set(nodeId, action)
      }
      return action
    },
    parameterStore(nodeId) {
      let read = parameterStores.get(nodeId)
      if (read === undefined) {
        read = parameterId => props.store.parameter(nodeId, parameterId)
        parameterStores.set(nodeId, read)
      }
      return read
    },
  })
}

/** Geometry is derived only from an accepted pair during component render. */
export function createNodeTreeViewSelector(store: NodeTreeStore) {
  let source: UiSnapshot | undefined
  let previousLayout: LayoutResult | undefined
  let previousViewport: NodeTreeViewport | undefined
  let previousMaterialization = false
  let selected: NodeTreeView | undefined
  return (
    state: NodeTreeLayoutState,
    viewport: NodeTreeViewport | undefined,
    materializeCulled: boolean,
  ): NodeTreeView => {
    const snapshot = state.snapshot
    const layout = state.layout
    const sameInputs = layout === previousLayout && viewport === previousViewport &&
      materializeCulled === previousMaterialization
    if (snapshot === source && sameInputs && selected !== undefined) return selected
    const update = store.getTopologyUpdate()
    const incremental = !sameInputs || snapshot !== update.snapshot || source === undefined || selected === undefined
      ? null
      : appendNodeTreeView(source, selected, update, viewport, materializeCulled)
    const next = incremental ?? createFullNodeTreeView(snapshot, layout, viewport, materializeCulled)
    source = snapshot
    previousLayout = layout
    previousViewport = viewport
    previousMaterialization = materializeCulled
    if (selected !== undefined && sameView(selected, next)) return selected
    selected = next
    return selected
  }
}

function createFullNodeTreeView(
  snapshot: UiSnapshot,
  layout: LayoutResult,
  viewport: NodeTreeViewport | undefined,
  materializeCulled: boolean,
): NodeTreeView {
  const geometry = createNodeGeometryIndex(snapshot.nodes, snapshot.frames, snapshot.links, layout)
  const visibleNodes = snapshot.nodes.flatMap(node => {
    const nodeRect = geometry.nodeRects.get(node.id)!
    const visible = viewport === undefined || intersectsViewport(viewport, nodeRect)
    return visible || materializeCulled
      ? [Object.freeze({node, rect: nodeRect, culled: !visible})]
      : []
  })
  const visibleNodeIds = new Set(visibleNodes.filter(entry => !entry.culled).map(entry => entry.node.id))
  const visibleLinks = snapshot.links.flatMap(link => {
    const route = geometry.linkRoutes.get(link.id)!
    const bounds = projectBounds(route)
    const endpointVisible = visibleNodeIds.has(link.from.nodeId) || visibleNodeIds.has(link.to.nodeId)
    const visible = viewport === undefined || endpointVisible || intersectsViewport(viewport, bounds)
    return visible || materializeCulled
      ? [Object.freeze({link, route, bounds, culled: !visible})]
      : []
  })
  const visibleFrameIds = visibleFrameIdsFor(snapshot, geometry, viewport, visibleNodes)
  const visibleFrames = snapshot.frames.flatMap(frame => visibleFrameIds.has(frame.id) || materializeCulled
    ? [Object.freeze({frame, rect: geometry.frameRects.get(frame.id)!, culled: !visibleFrameIds.has(frame.id)})]
    : [])
  const connected = new Set<string>()
  for (const link of snapshot.links) {
    if (visibleNodeIds.has(link.from.nodeId)) connected.add(socketKey(link.from.nodeId, link.from.socketId))
    if (visibleNodeIds.has(link.to.nodeId)) connected.add(socketKey(link.to.nodeId, link.to.socketId))
  }
  return Object.freeze({
    frames: Object.freeze(visibleFrames),
    nodes: Object.freeze(visibleNodes),
    links: Object.freeze(visibleLinks),
    nodeById: new Map(snapshot.nodes.map(node => [node.id, node])),
    frameById: new Map(snapshot.frames.map(frame => [frame.id, frame])),
    visibleNodeIds: Object.freeze(visibleNodeIds),
    visibleFrameIds: Object.freeze(visibleFrameIds),
    connectedSocketKeys: Object.freeze(connected),
    geometry,
  })
}

function appendNodeTreeView(
  source: UiSnapshot,
  previous: NodeTreeView,
  update: ReturnType<NodeTreeStore["getTopologyUpdate"]>,
  viewport: NodeTreeViewport | undefined,
  materializeCulled: boolean,
): NodeTreeView | null {
  const node = appendedNode(source, update)
  if (node === null) return null
  const geometry = appendNodeGeometryIndex(previous.geometry, node)
  const rect = geometry.nodeRects.get(node.id)!
  const visible = viewport === undefined || intersectsViewport(viewport, rect)
  if (!visible && !materializeCulled) return previous
  if (previous.nodeById.has(node.id)) throw new Error(`Appended Node view already exists: ${node.id}`)
  const nodeById = new Map(previous.nodeById)
  nodeById.set(node.id, node)
  const visibleNodeIds = visible
    ? Object.freeze(new Set([...previous.visibleNodeIds, node.id]))
    : previous.visibleNodeIds
  const nodes = visible || materializeCulled
    ? Object.freeze([...previous.nodes, Object.freeze({node, rect, culled: !visible})])
    : previous.nodes
  const nextFrames = visible && node.frameId !== undefined
    ? appendVisibleFrames(previous, node.frameId, materializeCulled)
    : null
  return Object.freeze({
    frames: nextFrames?.frames ?? previous.frames,
    nodes,
    links: previous.links,
    nodeById,
    frameById: previous.frameById,
    visibleNodeIds,
    visibleFrameIds: nextFrames?.ids ?? previous.visibleFrameIds,
    connectedSocketKeys: previous.connectedSocketKeys,
    geometry,
  })
}

function appendedNode(
  source: UiSnapshot,
  update: ReturnType<NodeTreeStore["getTopologyUpdate"]>,
): UiNode | null {
  const snapshot = update.snapshot
  const delta = update.delta
  if (update.mode !== "append-node" || delta === null ||
    delta.removed.length !== 0 || delta.updated.length !== 0 ||
    delta.revision !== snapshot.revision || delta.topologyRevision !== snapshot.topologyRevision ||
    delta.topologyRevision !== source.topologyRevision + 1 ||
    snapshot.frames !== source.frames || snapshot.links !== source.links ||
    snapshot.nodes.length !== source.nodes.length + 1) return null
  const addedNodes = delta.added.filter(address => address.kind === "node")
  if (addedNodes.length !== 1) return null
  const id = addedNodes[0]!.id
  if (delta.added.some(address => address.kind !== "node" &&
    (!("nodeId" in address) || address.nodeId !== id))) return null
  const node = snapshot.nodes[snapshot.nodes.length - 1]
  return node?.id === id ? node : null
}

function appendVisibleFrames(
  view: NodeTreeView,
  frameId: string,
  materializeCulled: boolean,
): Readonly<{frames: readonly VisibleFrame[]; ids: ReadonlySet<string>}> | null {
  if (view.visibleFrameIds.has(frameId)) return null
  const ids = new Set(view.visibleFrameIds)
  let current: string | undefined = frameId
  while (current !== undefined && !ids.has(current)) {
    ids.add(current)
    current = view.frameById.get(current)?.parentFrameId
  }
  const frames = [...view.frameById.values()].flatMap(frame => ids.has(frame.id) || materializeCulled
    ? [Object.freeze({frame, rect: view.geometry.frameRects.get(frame.id)!, culled: !ids.has(frame.id)})]
    : [])
  return Object.freeze({frames: Object.freeze(frames), ids: Object.freeze(ids)})
}

function visibleFrameIdsFor(
  snapshot: UiSnapshot,
  geometry: NodeGeometryIndex,
  viewport: NodeTreeViewport | undefined,
  nodes: readonly VisibleNode[],
): ReadonlySet<string> {
  const result = new Set<string>()
  if (viewport === undefined) snapshot.frames.forEach(frame => result.add(frame.id))
  else snapshot.frames.forEach(frame => {
    if (intersectsViewport(viewport, geometry.frameRects.get(frame.id)!)) result.add(frame.id)
  })
  nodes.filter(entry => !entry.culled).forEach(entry => {
    if (entry.node.frameId !== undefined) result.add(entry.node.frameId)
  })
  const frameById = new Map(snapshot.frames.map(frame => [frame.id, frame]))
  for (const id of [...result]) {
    let parent = frameById.get(id)?.parentFrameId
    while (parent !== undefined && !result.has(parent)) {
      result.add(parent)
      parent = frameById.get(parent)?.parentFrameId
    }
  }
  return result
}

export function nodePreview(node: UiNode, enabledIds?: ReadonlySet<string>): NodePreview | undefined {
  const value = metadata(node.metadata, "preview")
  if (value === undefined) return undefined
  const enabled = enabledIds?.has(node.id) ?? metadataBoolean(value, "enabled", false)
  const src = metadataString(value, "src", "")
  const width = metadataNumber(value, "width")
  const height = metadataNumber(value, "height")
  return Object.freeze({
    enabled,
    ...(src.length > 0 && width !== undefined && height !== undefined
      ? {image: Object.freeze({
          src,
          width,
          height,
          alt: metadataString(value, "alt", `${metadataString(node.metadata, "label", node.id)} preview`),
        })}
      : {}),
  })
}

export function linkKind(link: CoreLink, nodeById: ReadonlyMap<string, UiNode>): SocketKind {
  const source = nodeById.get(link.from.nodeId)
  const socket = source?.sockets.find(candidate => candidate.id === link.from.socketId)
  const value = socket?.valueType?.id ?? metadataString(link.metadata, "kind", "custom")
  return SOCKET_KINDS.includes(value as SocketKind) ? value as SocketKind : "custom"
}

function projectBounds(route: LinkRoute): NodeRect {
  const bounds = projectLinkRoute(route).bounds
  return Object.freeze({...bounds})
}

function sameView(previous: NodeTreeView, next: NodeTreeView): boolean {
  return previous.nodeById === next.nodeById && previous.geometry === next.geometry &&
    sameVisible(previous.frames, next.frames, entry => entry.frame.id, entry => entry.rect, entry => entry.culled) &&
    sameVisible(previous.nodes, next.nodes, entry => entry.node.id, entry => entry.rect, entry => entry.culled) &&
    sameLinks(previous.links, next.links) &&
    sameSet(previous.connectedSocketKeys, next.connectedSocketKeys)
}

function sameLinks(previous: readonly VisibleLink[], next: readonly VisibleLink[]): boolean {
  return previous.length === next.length && previous.every((entry, index) => {
    const candidate = next[index]!
    return entry.link.id === candidate.link.id && entry.culled === candidate.culled && sameRect(entry.bounds, candidate.bounds) &&
      (entry.route === candidate.route || projectLinkRoute(entry.route).d === projectLinkRoute(candidate.route).d)
  })
}

function sameVisible<T>(
  previous: readonly T[],
  next: readonly T[],
  id: (entry: T) => string,
  bounds: (entry: T) => NodeRect,
  culled: (entry: T) => boolean,
): boolean {
  return previous.length === next.length && previous.every((entry, index) => {
    const candidate = next[index]!
    return id(entry) === id(candidate) && culled(entry) === culled(candidate) &&
      sameRect(bounds(entry), bounds(candidate))
  })
}

export function sameRect(left: NodeRect, right: NodeRect): boolean {
  return left === right || left.x === right.x && left.y === right.y &&
    left.width === right.width && left.height === right.height
}

export function sameSet(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  return left === right || left.size === right.size && [...left].every(value => right.has(value))
}
