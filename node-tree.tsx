import type {
  Link as CoreLink,
  NodeJsonValue,
  NodeTreeExternalStore,
  NodeTreeSnapshot,
  ParameterSnapshot,
} from "@nodes/core"
import type {LayoutResult} from "@nodes/layout/types"
import {
  memo,
  useMemo,
  useSyncExternalStore,
  type FunctionComponent,
} from "@zavx0z/react"
import {Frame} from "./frame.tsx"
import {
  createNodeGeometryIndex,
  DEFAULT_NODE_TREE_TRANSFORM,
  intersectsViewport,
  metadata,
  metadataBoolean,
  metadataNumber,
  metadataString,
  socketKey,
  type NodeGeometryIndex,
  type NodeRect,
  type NodeTreeTransform,
  type NodeTreeViewport,
} from "./geometry.ts"
import {Link, projectLinkRoute, type LinkRoute} from "./link.tsx"
import {Node, type NodePreview} from "./node.tsx"
import type {ParameterInput} from "./parameter.tsx"
import {SOCKET_KINDS, type SocketKind} from "./socket.tsx"

export type {
  NodeRect,
  NodeTreeTransform,
  NodeTreeViewport,
} from "./geometry.ts"
export {nodeSocketLayoutPortId} from "./geometry.ts"

export type NodeTreeStore = NodeTreeExternalStore<NodeTreeSnapshot, ParameterSnapshot>

export type NodeTreeSelection =
  | Readonly<{kind: "frame" | "link" | "node"; id: string}>
  | null

export type NodeTreeProps = Readonly<{
  store: NodeTreeStore
  label?: string | undefined
  layout: LayoutResult
  viewport?: NodeTreeViewport | undefined
  materializeCulled?: boolean | undefined
  transform?: NodeTreeTransform | undefined
  selection?: NodeTreeSelection | undefined
  collapsedNodeIds?: ReadonlySet<string> | undefined
  previewNodeIds?: ReadonlySet<string> | undefined
  style?: CssStyle | undefined
  onSelectionChange?: ((selection: NodeTreeSelection, event: Event) => void) | undefined
  onNodeCollapseChange?: ((nodeId: string, collapsed: boolean, event: Event) => void) | undefined
  onNodePreviewChange?: ((nodeId: string, enabled: boolean, event: Event) => void) | undefined
  onParameterInput?: ((change: ParameterInput, event: Event) => void) | undefined
  onParameterChange?: ((change: ParameterInput, event: Event) => void) | undefined
  onSocketActivate?: ((nodeId: string, socketId: string, event: Event) => void) | undefined
}>

type UiSnapshot = NodeTreeSnapshot
type UiNode = UiSnapshot["nodes"][number]
type UiFrame = UiSnapshot["frames"][number]
type UiLink = UiSnapshot["links"][number]

type VisibleNode = Readonly<{node: UiNode; rect: NodeRect; culled: boolean}>
type VisibleFrame = Readonly<{frame: UiFrame; rect: NodeRect; culled: boolean}>
type VisibleLink = Readonly<{link: UiLink; route: LinkRoute; bounds: NodeRect; culled: boolean}>

type NodeTreeView = Readonly<{
  frames: readonly VisibleFrame[]
  nodes: readonly VisibleNode[]
  links: readonly VisibleLink[]
  allNodes: readonly UiNode[]
  connectedSocketKeys: ReadonlySet<string>
  geometry: NodeGeometryIndex
}>

export function NodeTree(props: NodeTreeProps) {
  const viewStore = useMemo(
    () => createNodeTreeViewStore(props.store, props.layout, props.viewport, props.materializeCulled === true),
    [props.store, props.layout, props.viewport, props.materializeCulled],
  )
  const view = useSyncExternalStore(viewStore.subscribe, viewStore.getSnapshot)
  const actions = useMemo(() => createActions(props), [
    props.store,
    props.onSelectionChange,
    props.onNodeCollapseChange,
    props.onNodePreviewChange,
    props.onSocketActivate,
  ])
  const transform = props.transform ?? DEFAULT_NODE_TREE_TRANSFORM
  return <section
    role="tree"
    aria-label={props.label ?? "Node tree"}
    data-node-tree=""
    data-frame-count={view.frames.length}
    data-link-count={view.links.length}
    data-node-count={view.nodes.length}
    style={css`
      box-sizing: border-box;
      position: relative;
      display: block;
      width: 100%;
      height: 100%;
      min-width: 0;
      min-height: 0;
      overflow: hidden;
      background: transparent;
      color: #d8d8d8;

      ${props.style}
    `}
  >
    <div
      role="group"
      aria-label={props.label ?? "Node tree scene"}
      data-node-tree-scene=""
      style={css`
        box-sizing: border-box;
        position: absolute;
        display: block;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        transform: translate(${transform.x}px, ${transform.y}px) scale(${transform.scale});
        transform-origin: 0 0;
      `}
    >
      <MemoNodeTreeContent
        view={view}
        treeProps={props}
        actions={actions}
      />
    </div>
  </section>
}

export type NodeTreeComponent = FunctionComponent<NodeTreeProps>

type NodeTreeContentProps = Readonly<{
  view: NodeTreeView
  treeProps: NodeTreeProps
  actions: NodeTreeActions
}>

function NodeTreeContent(props: NodeTreeContentProps) {
  const {view, treeProps, actions} = props
  return <div
    data-node-tree-content=""
    style={css`
      box-sizing: border-box;
      position: absolute;
      display: block;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      overflow: visible;
    `}
  >
    {view.frames.map(entry => <MemoFrameProjection
      key={entry.frame.id}
      entry={entry}
      selection={treeProps.selection}
      actions={actions}
    />)}
    {view.links.map(entry => <MemoLinkProjection
      key={entry.link.id}
      entry={entry}
      kind={linkKind(entry.link, view)}
      selection={treeProps.selection}
      actions={actions}
    />)}
    {view.nodes.map(entry => <MemoNodeProjection
      key={entry.node.id}
      entry={entry}
      view={view}
      treeProps={treeProps}
      actions={actions}
    />)}
  </div>
}

function FrameProjection(props: Readonly<{
  entry: VisibleFrame
  selection?: NodeTreeSelection | undefined
  actions: NodeTreeActions
}>) {
  const entry = props.entry
  return <Frame
    id={entry.frame.id}
    label={metadataString(entry.frame.metadata, "label", entry.frame.id)}
    title={metadataString(entry.frame.metadata, "description", "") || undefined}
    color={metadataString(entry.frame.metadata, "color", "") || undefined}
    rect={entry.rect}
    parentFrameId={entry.frame.parentFrameId}
    selected={props.selection?.kind === "frame" && props.selection.id === entry.frame.id}
    hidden={entry.culled}
    onActivate={props.actions.selectFrame(entry.frame.id)}
  />
}

const MemoFrameProjection = memo(FrameProjection, (previous, next) =>
  sameFrameEntry(previous.entry, next.entry) && sameSelection(previous.selection, next.selection) &&
  previous.actions === next.actions)

function LinkProjection(props: Readonly<{
  entry: VisibleLink
  kind: SocketKind
  selection?: NodeTreeSelection | undefined
  actions: NodeTreeActions
}>) {
  const entry = props.entry
  return <Link
    id={entry.link.id}
    title={metadataString(entry.link.metadata, "label", `${entry.link.from.nodeId} → ${entry.link.to.nodeId}`)}
    kind={props.kind}
    from={entry.link.from}
    to={entry.link.to}
    route={entry.route}
    selected={props.selection?.kind === "link" && props.selection.id === entry.link.id}
    disabled={metadataBoolean(entry.link.metadata, "disabled", false)}
    hidden={entry.culled}
    onActivate={props.actions.selectLink(entry.link.id)}
  />
}

const MemoLinkProjection = memo(LinkProjection, (previous, next) =>
  sameLinkEntry(previous.entry, next.entry) && previous.kind === next.kind &&
  sameSelection(previous.selection, next.selection) && previous.actions === next.actions)

const MemoNodeTreeContent = memo(NodeTreeContent, sameNodeTreeContentProps)

function sameNodeTreeContentProps(previous: NodeTreeContentProps, next: NodeTreeContentProps): boolean {
  const left = previous.treeProps
  const right = next.treeProps
  return previous.view === next.view && previous.actions === next.actions &&
    sameSelection(left.selection, right.selection) &&
    left.collapsedNodeIds === right.collapsedNodeIds && left.previewNodeIds === right.previewNodeIds &&
    left.onParameterInput === right.onParameterInput && left.onParameterChange === right.onParameterChange
}

function sameSelection(left: NodeTreeSelection | undefined, right: NodeTreeSelection | undefined): boolean {
  return left === right || left !== null && left !== undefined && right !== null && right !== undefined &&
    left.kind === right.kind && left.id === right.id
}

type NodeProjectionProps = Readonly<{
  entry: VisibleNode
  view: NodeTreeView
  treeProps: NodeTreeProps
  actions: NodeTreeActions
}>

function NodeProjection(projection: NodeProjectionProps) {
  const {entry, view, actions} = projection
  const props = projection.treeProps
  const node = entry.node
  const collapsed = props.collapsedNodeIds?.has(node.id) ?? metadataBoolean(node.metadata, "collapsed", false)
  const preview = nodePreview(node, props.previewNodeIds)
  return <Node
    id={node.id}
    frameId={node.frameId}
    label={metadataString(node.metadata, "label", node.id)}
    title={metadataString(node.metadata, "description", "") || undefined}
    category={metadataString(node.metadata, "category", "") || undefined}
    headerColor={metadataString(node.metadata, "headerColor", "") || undefined}
    rect={entry.rect}
    selected={props.selection?.kind === "node" && props.selection.id === node.id}
    hidden={entry.culled}
    collapsed={collapsed}
    preview={preview}
    parameters={node.parameters}
    sockets={node.sockets}
    parameterStore={actions.parameterStore(node.id)}
    connectedSocketKeys={view.connectedSocketKeys}
    resolvedSocketSides={view.geometry.portSides}
    onActivate={actions.selectNode(node.id)}
    onCollapseChange={actions.collapseNode(node.id)}
    onPreviewChange={actions.previewNode(node.id)}
    onParameterInput={props.onParameterInput}
    onParameterChange={props.onParameterChange}
    onSocketActivate={actions.socket(node.id)}
  />
}

const MemoNodeProjection = memo(NodeProjection, sameNodeProjectionProps)

function sameNodeProjectionProps(previous: NodeProjectionProps, next: NodeProjectionProps): boolean {
  const left = previous.treeProps
  const right = next.treeProps
  return sameNodeEntry(previous.entry, next.entry) && previous.actions === next.actions &&
    sameSelection(left.selection, right.selection) &&
    left.collapsedNodeIds === right.collapsedNodeIds && left.previewNodeIds === right.previewNodeIds &&
    left.onParameterInput === right.onParameterInput && left.onParameterChange === right.onParameterChange &&
    sameSet(previous.view.connectedSocketKeys, next.view.connectedSocketKeys)
}

function sameNodeEntry(left: VisibleNode, right: VisibleNode): boolean {
  return left.node === right.node && left.culled === right.culled && sameRect(left.rect, right.rect)
}

function sameFrameEntry(left: VisibleFrame, right: VisibleFrame): boolean {
  return left.frame === right.frame && left.culled === right.culled && sameRect(left.rect, right.rect)
}

function sameLinkEntry(left: VisibleLink, right: VisibleLink): boolean {
  return left.link === right.link && left.culled === right.culled && sameRect(left.bounds, right.bounds) &&
    (left.route === right.route || projectLinkRoute(left.route).d === projectLinkRoute(right.route).d)
}

type NodeTreeActions = Readonly<{
  selectFrame(id: string): (event: Event) => void
  selectLink(id: string): (event: Event) => void
  selectNode(id: string): (event: Event) => void
  collapseNode(id: string): (collapsed: boolean, event: Event) => void
  previewNode(id: string): (enabled: boolean, event: Event) => void
  socket(nodeId: string): (socketId: string, event: Event) => void
  parameterStore(nodeId: string): (parameterId: string) => ReturnType<NodeTreeStore["parameter"]>
}>

function createActions(props: NodeTreeProps): NodeTreeActions {
  const frame = new Map<string, (event: Event) => void>()
  const link = new Map<string, (event: Event) => void>()
  const node = new Map<string, (event: Event) => void>()
  const collapse = new Map<string, (collapsed: boolean, event: Event) => void>()
  const preview = new Map<string, (enabled: boolean, event: Event) => void>()
  const sockets = new Map<string, (socketId: string, event: Event) => void>()
  const parameterStores = new Map<string, (parameterId: string) => ReturnType<NodeTreeStore["parameter"]>>()
  return Object.freeze({
    selectFrame(id) {
      let action = frame.get(id)
      if (action === undefined) {
        action = event => {
          event.stopPropagation()
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
          props.onSelectionChange?.(Object.freeze({kind: "node", id}), event)
        }
        node.set(id, action)
      }
      return action
    },
    collapseNode(id) {
      let action = collapse.get(id)
      if (action === undefined) {
        action = (collapsed, event) => props.onNodeCollapseChange?.(id, collapsed, event)
        collapse.set(id, action)
      }
      return action
    },
    previewNode(id) {
      let action = preview.get(id)
      if (action === undefined) {
        action = (enabled, event) => props.onNodePreviewChange?.(id, enabled, event)
        preview.set(id, action)
      }
      return action
    },
    socket(nodeId) {
      let action = sockets.get(nodeId)
      if (action === undefined) {
        action = (socketId, event) => props.onSocketActivate?.(nodeId, socketId, event)
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

function createNodeTreeViewStore(
  store: NodeTreeStore,
  layout: LayoutResult,
  viewport: NodeTreeViewport | undefined,
  materializeCulled: boolean,
): Readonly<{
  subscribe(listener: () => void): () => void
  getSnapshot(): NodeTreeView
}> {
  let source: UiSnapshot | undefined
  let selected: NodeTreeView | undefined
  const getSnapshot = (): NodeTreeView => {
    const snapshot = store.getTopologySnapshot()
    if (snapshot === source && selected !== undefined) return selected
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
    const next = Object.freeze({
      frames: Object.freeze(visibleFrames),
      nodes: Object.freeze(visibleNodes),
      links: Object.freeze(visibleLinks),
      allNodes: snapshot.nodes,
      connectedSocketKeys: Object.freeze(connected),
      geometry,
    })
    source = snapshot
    if (selected !== undefined && sameView(selected, next)) return selected
    selected = next
    return selected
  }
  return Object.freeze({
    subscribe: store.subscribeTopology,
    getSnapshot,
  })
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

function nodePreview(node: UiNode, enabledIds?: ReadonlySet<string>): NodePreview | undefined {
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

function linkKind(link: CoreLink, view: NodeTreeView): SocketKind {
  const source = view.allNodes.find(node => node.id === link.from.nodeId)
  const socket = source?.sockets.find(candidate => candidate.id === link.from.socketId)
  const value = socket?.valueType?.id ?? metadataString(link.metadata, "kind", "custom")
  return SOCKET_KINDS.includes(value as SocketKind) ? value as SocketKind : "custom"
}

function projectBounds(route: LinkRoute): NodeRect {
  const bounds = projectLinkRoute(route).bounds
  return Object.freeze({...bounds})
}

function sameView(previous: NodeTreeView, next: NodeTreeView): boolean {
  return sameVisible(previous.frames, next.frames, entry => entry.frame.id, entry => entry.rect, entry => entry.culled) &&
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

function sameRect(left: NodeRect, right: NodeRect): boolean {
  return left === right || left.x === right.x && left.y === right.y &&
    left.width === right.width && left.height === right.height
}

function sameSet(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  return left === right || left.size === right.size && [...left].every(value => right.has(value))
}
