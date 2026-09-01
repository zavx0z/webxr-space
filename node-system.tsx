import {BooleanField} from "@ui/components/fields/boolean-field"
import {
  ColorField,
  type ColorFieldValue,
} from "@ui/components/fields/color-field"
import {IntegerField} from "@ui/components/fields/integer-field"
import {MatrixField} from "@ui/components/fields/matrix-field"
import {NumberField} from "@ui/components/fields/number-field"
import {PathField} from "@ui/components/fields/path-field"
import {ReadonlyField} from "@ui/components/fields/readonly-field"
import {RotationField} from "@ui/components/fields/rotation-field"
import {TextField} from "@ui/components/fields/text-field"
import {VectorField} from "@ui/components/fields/vector-field"
import {
  memo,
  useMemo,
  useSyncExternalStore,
  type FunctionComponent,
} from "@zavx0z/react"
import {
  projectLinkRoute,
  type LinkPathProjection,
} from "./dom/link-path.ts"

export type NodeSystemJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly NodeSystemJsonValue[]
  | NodeSystemJsonObject

export type NodeSystemJsonObject = Readonly<{
  [key: string]: NodeSystemJsonValue
}>

export type NodeSystemValueType = Readonly<{
  id: string
  version: number
}>

export type NodeSystemParameterSnapshot = Readonly<{
  id: string
  revision: number
  value: NodeSystemJsonValue
  presentation: NodeSystemJsonValue
  valueType?: NodeSystemValueType
}>

export type NodeSystemSocketSnapshot = Readonly<{
  id: string
  direction: "input" | "output" | "bidirectional"
  parameterId?: string
  side?: "left" | "right"
  valueType?: NodeSystemValueType
  metadata?: NodeSystemJsonValue
}>

export type NodeSystemNodeSnapshot = Readonly<{
  id: string
  parameters: readonly NodeSystemParameterSnapshot[]
  sockets: readonly NodeSystemSocketSnapshot[]
  metadata?: NodeSystemJsonValue
}>

export type NodeSystemLinkSnapshot = Readonly<{
  id: string
  from: Readonly<{nodeId: string; socketId: string}>
  to: Readonly<{nodeId: string; socketId: string}>
  metadata?: NodeSystemJsonValue
}>

export type NodeSystemSnapshot = Readonly<{
  revision: number
  topologyRevision: number
  nodes: readonly NodeSystemNodeSnapshot[]
  links: readonly NodeSystemLinkSnapshot[]
}>

/** Structural read contract implemented directly by Core's cached external-store facade. */
export type NodeSystemExternalStore = Readonly<{
  subscribe(listener: () => void): () => void
  getSnapshot(): NodeSystemSnapshot
  subscribeTopology?(listener: () => void): () => void
  getTopologySnapshot?(): NodeSystemSnapshot
  parameter?(nodeId: string, parameterId: string): NodeSystemParameterExternalStore
}>

export type NodeSystemParameterExternalStore = Readonly<{
  subscribe(listener: () => void): () => void
  getSnapshot(): NodeSystemParameterSnapshot
}>

export type NodeSystemParameterInput = Readonly<{
  nodeId: string
  parameterId: string
  value: NodeSystemJsonValue
}>

export type NodeSystemProps = Readonly<{
  store: NodeSystemExternalStore
  label?: string
  viewport?: NodeSystemViewport
  style?: CssStyle
  onParameterInput?: ((change: NodeSystemParameterInput) => void) | undefined
}>

export type NodeSystemViewport = Readonly<{
  x: number
  y: number
  width: number
  height: number
  overscan?: number
}>

export type NodeCardProps = Readonly<{
  node: NodeSystemNodeSnapshot
  links: readonly NodeSystemLinkSnapshot[]
  index: number
  offsetX?: number
  offsetY?: number
  style?: CssStyle
  connectedSocketKeys?: ReadonlySet<string> | undefined
  parameterStore?: ((nodeId: string, parameterId: string) => NodeSystemParameterExternalStore) | undefined
  onParameterInput?: ((change: NodeSystemParameterInput) => void) | undefined
}>

export type ParameterRowProps = Readonly<{
  nodeId: string
  parameter: NodeSystemParameterSnapshot
  sockets: readonly NodeSystemSocketSnapshot[]
  links: readonly NodeSystemLinkSnapshot[]
  connectedSocketKeys?: ReadonlySet<string> | undefined
  store?: NodeSystemParameterExternalStore | undefined
  style?: CssStyle
  onParameterInput?: ((change: NodeSystemParameterInput) => void) | undefined
}>

export type SocketPortProps = Readonly<{
  nodeId: string
  socket: NodeSystemSocketSnapshot
  connected?: boolean
  style?: CssStyle
}>

export type NodeConnectionProps = Readonly<{
  link: NodeSystemLinkSnapshot
  nodes: readonly NodeSystemNodeSnapshot[]
  offsetX?: number
  offsetY?: number
  style?: CssStyle
}>

const EMPTY_NODE_SYSTEM_LINKS: readonly NodeSystemLinkSnapshot[] = Object.freeze([])

export function NodeSystem(props: NodeSystemProps) {
  const viewStore = useMemo(
    () => createNodeSystemViewStore(props.store, props.viewport),
    [props.store, props.viewport],
  )
  const view = useSyncExternalStore(viewStore.subscribe, viewStore.getSnapshot)
  const label = props.label ?? "Node system"
  const viewport = props.viewport
  const offsetX = viewport?.x ?? 0
  const offsetY = viewport?.y ?? 0
  return <section
    aria-label={label}
    data-node-system=""
    style={css`
      & {
        box-sizing: border-box;
        position: relative;
        display: block;
        width: ${viewport?.width === undefined ? "100%" : `${viewport.width}px`};
        height: ${viewport?.height === undefined ? "auto" : `${viewport.height}px`};
        min-width: 720px;
        min-height: 480px;
        overflow: hidden;
        border: 1px solid rgb(26 26 26);
        border-radius: 7px;
        background: rgb(29 29 29);
        color: rgb(224 224 224);
        font-size: 11px;
      }
      ${props.style}
    `}
  >
    <span style={css`
      & {
        box-sizing: border-box;
        position: absolute;
        top: 8px;
        right: 10px;
        z-index: 3;
        display: flex;
        align-items: center;
        height: 20px;
        gap: 6px;
        padding: 2px 7px;
        border: 1px solid rgb(57 57 57);
        border-radius: 10px;
        background: rgba(24, 24, 24, .86);
        color: rgb(166 166 166);
        font-size: 10px;
        white-space: nowrap;
      }
    `}>
      {view.entries.length} visible nodes
    </span>
    <div style={css`
      & {
        box-sizing: border-box;
        position: absolute;
        display: block;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
      }
    `}>
      {view.connections.map(connection => <MemoPlannedNodeConnection
        key={connection.link.id}
        connection={connection}
      />)}
      {view.entries.map(entry => <MemoNodeCard
        key={entry.node.id}
        node={entry.node}
        links={EMPTY_NODE_SYSTEM_LINKS}
        connectedSocketKeys={view.connectedSocketKeys}
        index={entry.index}
        offsetX={offsetX}
        offsetY={offsetY}
        parameterStore={props.store.parameter}
        onParameterInput={props.onParameterInput}
      />)}
    </div>
  </section>
}

export function NodeCard(props: NodeCardProps) {
  const placement = nodePlacement(props.node, props.index)
  const label = metadataString(props.node.metadata, "label", props.node.id)
  const category = metadataString(props.node.metadata, "category", "General")
  const headerColor = metadataString(props.node.metadata, "headerColor", "rgb(83 91 109)")
  const parameterIds = new Set(props.node.parameters.map(parameter => parameter.id))
  const looseSockets = props.node.sockets.filter(socket =>
    socket.parameterId === undefined || !parameterIds.has(socket.parameterId))
  return <article
    aria-label={label}
    data-node-id={props.node.id}
    style={css`
      & {
        box-sizing: border-box;
        position: absolute;
        z-index: 2;
        display: flex;
        flex-direction: column;
        left: ${placement.x - (props.offsetX ?? 0)}px;
        top: ${placement.y - (props.offsetY ?? 0)}px;
        width: ${placement.width}px;
        min-width: 210px;
        overflow: visible;
        border: 1px solid rgb(15 15 15);
        border-radius: 6px;
        background: rgb(48 48 48);
        color: rgb(224 224 224);
        box-shadow: 0 8px 22px rgba(0, 0, 0, .48);
      }
      ${props.style}
    `}
  >
    <header style={css`
      & {
        box-sizing: border-box;
        display: flex;
        flex-direction: row;
        align-items: center;
        width: 100%;
        height: 26px;
        min-height: 26px;
        gap: 6px;
        padding: 0 8px;
        overflow: hidden;
        border-top-left-radius: 5px;
        border-top-right-radius: 5px;
        background: ${headerColor};
        color: rgb(245 245 245);
      }
    `}>
      <strong style={css`
        & {
          display: block;
          min-width: 0;
          flex-grow: 1;
          overflow: hidden;
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
      `}>{label}</strong>
      <small style={css`
        & {
          display: block;
          flex-shrink: 0;
          color: rgba(255, 255, 255, .68);
          font-size: 9px;
          white-space: nowrap;
        }
      `}>{category}</small>
    </header>
    <section aria-label={`${label} parameters`} style={css`
      & {
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        width: 100%;
        min-width: 0;
        gap: 3px;
        padding: 6px 8px 8px;
      }
    `}>
      {props.node.parameters.map(parameter => <MemoParameterRow
        key={parameter.id}
        nodeId={props.node.id}
        parameter={parameter}
        sockets={props.node.sockets.filter(socket => socket.parameterId === parameter.id)}
        links={props.links}
        connectedSocketKeys={props.connectedSocketKeys}
        store={props.parameterStore?.(props.node.id, parameter.id)}
        onParameterInput={props.onParameterInput}
      />)}
      {looseSockets.map(socket => <MemoLooseSocketRow
        key={socket.id}
        nodeId={props.node.id}
        socket={socket}
        links={props.links}
        connectedSocketKeys={props.connectedSocketKeys}
      />)}
    </section>
  </article>
}

type LooseSocketRowProps = Readonly<{
  nodeId: string
  socket: NodeSystemSocketSnapshot
  links: readonly NodeSystemLinkSnapshot[]
  connectedSocketKeys?: ReadonlySet<string> | undefined
}>

function LooseSocketRow(props: LooseSocketRowProps) {
  return <div
    data-loose-socket={props.socket.id}
    style={css`
      & {
        box-sizing: border-box;
        display: flex;
        flex-direction: row;
        align-items: center;
        width: 100%;
        gap: 6px;
        padding-top: 3px;
      }
    `}
  >
    <MemoSocketPort
      nodeId={props.nodeId}
      socket={props.socket}
      connected={isSocketConnected(props.links, props.nodeId, props.socket.id, props.connectedSocketKeys)}
    />
    <span style={css`
      & {
        display: block;
        min-width: 0;
        flex-grow: 1;
        overflow: hidden;
        color: rgb(176 176 176);
        font-size: 9px;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
    `}>
      {metadataString(props.socket.metadata, "label", props.socket.id)}
    </span>
  </div>
}

export function ParameterRow(props: ParameterRowProps) {
  const fallbackStore = useMemo(() => Object.freeze({
    subscribe: (_listener: () => void) => () => {},
    getSnapshot: () => props.parameter,
  }), [props.parameter])
  const store = props.store ?? fallbackStore
  const parameter = useSyncExternalStore(store.subscribe, store.getSnapshot)
  const left = props.sockets.filter(socket => socketSide(socket) === "left")
  const right = props.sockets.filter(socket => socketSide(socket) === "right")
  const label = metadataString(parameter.presentation, "label", parameter.id)
  const disabled = metadataBoolean(parameter.presentation, "disabled", false)
  const readOnly = metadataBoolean(parameter.presentation, "readOnly", false)
  const onInput = (value: NodeSystemJsonValue) => props.onParameterInput?.(Object.freeze({
    nodeId: props.nodeId,
    parameterId: parameter.id,
    value,
  }))
  const description = metadataString(parameter.presentation, "description", "") || undefined
  const valueType = parameter.valueType?.id
  const vectorValue = numericVectorValue(parameter.value)
  const matrixValue = numericMatrixValue(parameter.value)
  const colorValue = colorFieldValue(parameter.value)
  const concreteComposite =
    valueType === "vector" && vectorValue !== null ||
    valueType === "rotation" && vectorValue !== null ||
    valueType === "matrix" && matrixValue !== null ||
    valueType === "color" && colorValue !== null
  return <div
    role="group"
    aria-label={label}
    data-parameter-id={parameter.id}
    style={css`
      & {
        box-sizing: border-box;
        display: flex;
        flex-direction: row;
        align-items: center;
        width: 100%;
        min-width: 0;
        min-height: 27px;
        gap: 5px;
      }
      ${props.style}
    `}
  >
    <span style={css`
      & {
        display: flex;
        flex-direction: row;
        align-items: center;
        min-width: 13px;
        gap: 2px;
      }
    `}>
      {left.map(socket => <MemoSocketPort
        key={socket.id}
        nodeId={props.nodeId}
        socket={socket}
        connected={isSocketConnected(props.links, props.nodeId, socket.id, props.connectedSocketKeys)}
      />)}
    </span>
    {typeof parameter.value === "boolean" ? <BooleanField
      id={parameter.id}
      label={label}
      value={parameter.value}
      disabled={disabled}
      readOnly={readOnly}
      description={description}
      onChange={onInput}
    /> : null}
    {typeof parameter.value === "number" && valueType === "integer" ? <IntegerField
      id={parameter.id}
      label={label}
      value={parameter.value}
      min={metadataNumber(parameter.presentation, "min")}
      max={metadataNumber(parameter.presentation, "max")}
      step={metadataNumber(parameter.presentation, "step") ?? 1}
      disabled={disabled}
      readOnly={readOnly}
      description={description}
      onChange={onInput}
    /> : null}
    {typeof parameter.value === "number" && valueType !== "integer" ? <NumberField
      id={parameter.id}
      label={label}
      value={parameter.value}
      min={metadataNumber(parameter.presentation, "min")}
      max={metadataNumber(parameter.presentation, "max")}
      step={metadataNumber(parameter.presentation, "step") ?? .1}
      disabled={disabled}
      readOnly={readOnly}
      description={description}
      onChange={onInput}
    /> : null}
    {typeof parameter.value === "string" && valueType === "path" ? <PathField
      id={parameter.id}
      label={label}
      value={parameter.value}
      placeholder={metadataString(parameter.presentation, "placeholder", "") || undefined}
      disabled={disabled}
      readOnly={readOnly}
      description={description}
      onChange={onInput}
    /> : null}
    {typeof parameter.value === "string" && valueType !== "path" ? <TextField
      id={parameter.id}
      label={label}
      value={parameter.value}
      placeholder={metadataString(parameter.presentation, "placeholder", "") || undefined}
      disabled={disabled}
      readOnly={readOnly}
      description={description}
      onChange={onInput}
    /> : null}
    {valueType === "vector" && vectorValue !== null ? <VectorField
      id={parameter.id}
      label={label}
      value={vectorValue}
      min={metadataNumber(parameter.presentation, "min")}
      max={metadataNumber(parameter.presentation, "max")}
      step={metadataNumber(parameter.presentation, "step")}
      disabled={disabled}
      readOnly={readOnly}
      description={description}
      onChange={onInput}
    /> : null}
    {valueType === "rotation" && vectorValue !== null ? <RotationField
      id={parameter.id}
      label={label}
      value={vectorValue}
      min={metadataNumber(parameter.presentation, "min")}
      max={metadataNumber(parameter.presentation, "max")}
      step={metadataNumber(parameter.presentation, "step")}
      disabled={disabled}
      readOnly={readOnly}
      description={description}
      onChange={onInput}
    /> : null}
    {valueType === "matrix" && matrixValue !== null ? <MatrixField
      id={parameter.id}
      label={label}
      value={matrixValue}
      step={metadataNumber(parameter.presentation, "step")}
      disabled={disabled}
      readOnly={readOnly}
      description={description}
      onChange={onInput}
    /> : null}
    {valueType === "color" && colorValue !== null ? <ColorField
      id={parameter.id}
      label={label}
      value={colorValue}
      disabled={disabled}
      readOnly={readOnly}
      description={description}
      onChange={onInput}
    /> : null}
    {typeof parameter.value !== "boolean" && typeof parameter.value !== "number" && typeof parameter.value !== "string" && !concreteComposite ? <ReadonlyField
      id={parameter.id}
      label={label}
      value={JSON.stringify(parameter.value) ?? "null"}
      disabled={disabled}
      description={description}
    /> : null}
    <span style={css`
      & {
        display: flex;
        flex-direction: row;
        align-items: center;
        min-width: 13px;
        gap: 2px;
      }
    `}>
      {right.map(socket => <MemoSocketPort
        key={socket.id}
        nodeId={props.nodeId}
        socket={socket}
        connected={isSocketConnected(props.links, props.nodeId, socket.id, props.connectedSocketKeys)}
      />)}
    </span>
  </div>
}

export function SocketPort(props: SocketPortProps) {
  const kind = props.socket.valueType?.id ?? metadataString(props.socket.metadata, "kind", "custom")
  const label = metadataString(props.socket.metadata, "label", props.socket.id)
  const color = socketColor(kind)
  return <button
    type="button"
    aria-label={`${label} · ${props.socket.direction}`}
    aria-pressed={props.connected === true}
    data-node-id={props.nodeId}
    data-socket-id={props.socket.id}
    data-socket-kind={kind}
    data-socket-direction={props.socket.direction}
    data-socket-side={socketSide(props.socket)}
    title={`${label} · ${kind}`}
    style={css`
      & {
        box-sizing: border-box;
        display: block;
        width: 13px;
        min-width: 13px;
        height: 13px;
        min-height: 13px;
        padding: 0;
        border: 2px solid ${color};
        border-radius: 50%;
        background: rgb(31 31 31);
        color: ${color};
        font-size: 1px;
        box-shadow: 0 0 0 rgba(0, 0, 0, 0);
      }
      &[aria-pressed="true"] {
        background: currentcolor;
        box-shadow: 0 0 5px currentcolor;
      }
      &:hover { box-shadow: 0 0 7px currentcolor; }
      &:focus { box-shadow: 0 0 8px currentcolor; }
      ${props.style}
    `}
  >
    {label}
  </button>
}

export function NodeConnection(props: NodeConnectionProps) {
  const index = createNodeGeometryIndex(props.nodes)
  const connection = planNodeConnection(
    props.link,
    index,
    props.offsetX ?? 0,
    props.offsetY ?? 0,
  )
  return <PlannedNodeConnection connection={connection} style={props.style} />
}

type PlannedNodeConnectionProps = Readonly<{
  connection: NodeConnectionView
  style?: CssStyle | undefined
}>

function PlannedNodeConnection(props: PlannedNodeConnectionProps) {
  const {connection} = props
  return <vector-path
    role="img"
    aria-label={connection.label}
    data-link-id={connection.link.id}
    data-path-segments={connection.path.segmentCount}
    d={connection.path.d}
    style={css`
      & {
        box-sizing: border-box;
        position: absolute;
        z-index: 1;
        display: block;
        left: 0;
        top: 0;
        width: 0;
        height: 0;
        color: ${connection.color};
        stroke: ${connection.color};
        stroke-width: 2.2px;
        pointer-hit-width: 16px;
      }
      ${props.style}
    `}
  ></vector-path>
}

export type NodeSystemComponent = FunctionComponent<NodeSystemProps>
export type NodeCardComponent = FunctionComponent<NodeCardProps>
export type ParameterRowComponent = FunctionComponent<ParameterRowProps>
export type SocketPortComponent = FunctionComponent<SocketPortProps>
export type NodeConnectionComponent = FunctionComponent<NodeConnectionProps>

const MemoNodeCard = memo(NodeCard, sameNodeCardProps)
const MemoParameterRow = memo(ParameterRow, sameParameterRowProps)
const MemoSocketPort = memo(SocketPort, sameSocketPortProps)
const MemoPlannedNodeConnection = memo(PlannedNodeConnection, samePlannedNodeConnectionProps)
const MemoLooseSocketRow = memo(LooseSocketRow, sameLooseSocketRowProps)

type Placement = Readonly<{x: number; y: number; width: number}>
type EndpointPosition = Readonly<{x: number; y: number; kind: string; side: "left" | "right"}>
type VisibleNodeEntry = Readonly<{node: NodeSystemNodeSnapshot; index: number}>
type NodeGeometry = Readonly<{
  node: NodeSystemNodeSnapshot
  index: number
  placement: Placement
  endpointBySocketId: ReadonlyMap<string, EndpointPosition>
}>
type NodeConnectionView = Readonly<{
  link: NodeSystemLinkSnapshot
  path: LinkPathProjection
  bounds: LinkPathProjection["bounds"]
  color: string
  label: string
}>
type NodeSystemViewSnapshot = Readonly<{
  entries: readonly VisibleNodeEntry[]
  nodes: readonly NodeSystemNodeSnapshot[]
  links: readonly NodeSystemLinkSnapshot[]
  connections: readonly NodeConnectionView[]
  connectedSocketKeys: ReadonlySet<string>
}>

function createNodeSystemViewStore(
  store: NodeSystemExternalStore,
  viewport: NodeSystemViewport | undefined,
): Readonly<{
  subscribe(listener: () => void): () => void
  getSnapshot(): NodeSystemViewSnapshot
}> {
  const subscribe = store.subscribeTopology ?? store.subscribe
  const read = store.getTopologySnapshot ?? store.getSnapshot
  let source: NodeSystemSnapshot | undefined
  let selected: NodeSystemViewSnapshot | undefined
  const getSnapshot = (): NodeSystemViewSnapshot => {
    const snapshot = read()
    if (snapshot === source && selected !== undefined) return selected
    const entries = visibleNodeEntries(snapshot.nodes, viewport)
    if (selected !== undefined && sameVisibleEntries(selected.entries, entries) &&
      source?.links === snapshot.links) {
      source = snapshot
      return selected
    }
    const nodes = Object.freeze(entries.map(entry => entry.node))
    const nodeIds = new Set(nodes.map(node => node.id))
    const geometry = createNodeGeometryIndex(snapshot.nodes)
    const viewportRect = nodeSystemViewportRect(viewport)
    const offsetX = viewport?.x ?? 0
    const offsetY = viewport?.y ?? 0
    const connections: NodeConnectionView[] = []
    const connectedSocketKeys = new Set<string>()
    for (const link of snapshot.links) {
      const from = endpointPosition(geometry, link.from.nodeId, link.from.socketId)
      const to = endpointPosition(geometry, link.to.nodeId, link.to.socketId)
      const endpointVisible = nodeIds.has(link.from.nodeId) || nodeIds.has(link.to.nodeId)
      const routeVisible = viewportRect === null || intersectsBounds(viewportRect, connectionBounds(from, to))
      if (endpointVisible || routeVisible) connections.push(planNodeConnection(link, geometry, offsetX, offsetY))
      if (nodeIds.has(link.from.nodeId)) connectedSocketKeys.add(socketKey(link.from.nodeId, link.from.socketId))
      if (nodeIds.has(link.to.nodeId)) connectedSocketKeys.add(socketKey(link.to.nodeId, link.to.socketId))
    }
    const links = Object.freeze(connections.map(({link}) => link))
    source = snapshot
    if (selected !== undefined && sameVisibleEntries(selected.entries, entries) &&
      sameLinks(selected.links, links) && sameConnections(selected.connections, connections)) return selected
    selected = Object.freeze({
      entries,
      nodes,
      links,
      connections: Object.freeze(connections),
      connectedSocketKeys: Object.freeze(connectedSocketKeys),
    })
    return selected
  }
  return Object.freeze({subscribe, getSnapshot})
}

function visibleNodeEntries(
  nodes: readonly NodeSystemNodeSnapshot[],
  viewport: NodeSystemViewport | undefined,
): readonly VisibleNodeEntry[] {
  if (viewport === undefined) {
    return Object.freeze(nodes.map((node, index) => Object.freeze({node, index})))
  }
  const overscan = finiteNonNegative(viewport.overscan ?? 160, "NodeSystem viewport overscan")
  const left = finite(viewport.x, "NodeSystem viewport x") - overscan
  const top = finite(viewport.y, "NodeSystem viewport y") - overscan
  const right = left + finitePositive(viewport.width, "NodeSystem viewport width") + overscan * 2
  const bottom = top + finitePositive(viewport.height, "NodeSystem viewport height") + overscan * 2
  const visible: VisibleNodeEntry[] = []
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]!
    const placement = nodePlacement(node, index)
    const height = metadataNumber(node.metadata, "height") ?? 40 + node.parameters.length * 36
    if (placement.x + placement.width < left || placement.x > right ||
      placement.y + height < top || placement.y > bottom) continue
    visible.push(Object.freeze({node, index}))
  }
  return Object.freeze(visible)
}

function sameVisibleEntries(
  previous: readonly VisibleNodeEntry[],
  next: readonly VisibleNodeEntry[],
): boolean {
  return previous.length === next.length && previous.every((entry, index) => {
    const candidate = next[index]!
    return entry.index === candidate.index && sameNodeSnapshot(entry.node, candidate.node)
  })
}

function sameNodeCardProps(previous: NodeCardProps, next: NodeCardProps): boolean {
  return previous.index === next.index && previous.offsetX === next.offsetX &&
    previous.offsetY === next.offsetY && previous.style === next.style &&
    previous.onParameterInput === next.onParameterInput && previous.parameterStore === next.parameterStore &&
    previous.connectedSocketKeys === next.connectedSocketKeys &&
    sameNodeSnapshot(previous.node, next.node) && sameLinks(previous.links, next.links)
}

function sameParameterRowProps(previous: ParameterRowProps, next: ParameterRowProps): boolean {
  return previous.nodeId === next.nodeId && previous.style === next.style &&
    previous.onParameterInput === next.onParameterInput && previous.store === next.store &&
    previous.connectedSocketKeys === next.connectedSocketKeys &&
    sameParameter(previous.parameter, next.parameter) &&
    sameSockets(previous.sockets, next.sockets) && sameLinks(previous.links, next.links)
}

function sameSocketPortProps(previous: SocketPortProps, next: SocketPortProps): boolean {
  return previous.nodeId === next.nodeId && previous.connected === next.connected &&
    previous.style === next.style && sameSocket(previous.socket, next.socket)
}

function samePlannedNodeConnectionProps(previous: PlannedNodeConnectionProps, next: PlannedNodeConnectionProps): boolean {
  return previous.style === next.style && sameConnection(previous.connection, next.connection)
}

function sameLooseSocketRowProps(previous: LooseSocketRowProps, next: LooseSocketRowProps): boolean {
  return previous.nodeId === next.nodeId && sameSocket(previous.socket, next.socket) &&
    previous.connectedSocketKeys === next.connectedSocketKeys && sameLinks(previous.links, next.links)
}

function sameNodeSnapshot(previous: NodeSystemNodeSnapshot, next: NodeSystemNodeSnapshot): boolean {
  if (previous === next) return true
  if (previous.id !== next.id || !sameJson(previous.metadata, next.metadata) ||
    !sameSockets(previous.sockets, next.sockets) ||
    previous.parameters.length !== next.parameters.length) return false
  return previous.parameters.every((parameter, index) => sameParameter(parameter, next.parameters[index]!))
}

function sameParameter(previous: NodeSystemParameterSnapshot, next: NodeSystemParameterSnapshot): boolean {
  return previous === next || previous.id === next.id && previous.revision === next.revision
}

function sameSockets(
  previous: readonly NodeSystemSocketSnapshot[],
  next: readonly NodeSystemSocketSnapshot[],
): boolean {
  return previous === next || previous.length === next.length &&
    previous.every((socket, index) => sameSocket(socket, next[index]!))
}

function sameSocket(previous: NodeSystemSocketSnapshot, next: NodeSystemSocketSnapshot): boolean {
  return previous === next || previous.id === next.id && previous.direction === next.direction &&
    previous.parameterId === next.parameterId && previous.side === next.side &&
    sameJson(previous.metadata, next.metadata) && sameValueType(previous.valueType, next.valueType)
}

function sameLinks(
  previous: readonly NodeSystemLinkSnapshot[],
  next: readonly NodeSystemLinkSnapshot[],
): boolean {
  return previous === next || previous.length === next.length &&
    previous.every((link, index) => sameLink(link, next[index]!))
}

function sameConnections(
  previous: readonly NodeConnectionView[],
  next: readonly NodeConnectionView[],
): boolean {
  return previous === next || previous.length === next.length &&
    previous.every((connection, index) => sameConnection(connection, next[index]!))
}

function sameConnection(previous: NodeConnectionView, next: NodeConnectionView): boolean {
  return previous === next || sameLink(previous.link, next.link) &&
    previous.path.d === next.path.d && previous.color === next.color && previous.label === next.label
}

function sameLink(previous: NodeSystemLinkSnapshot, next: NodeSystemLinkSnapshot): boolean {
  return previous === next || previous.id === next.id && sameJson(previous.metadata, next.metadata) &&
    previous.from.nodeId === next.from.nodeId && previous.from.socketId === next.from.socketId &&
    previous.to.nodeId === next.to.nodeId && previous.to.socketId === next.to.socketId
}

function sameValueType(previous: NodeSystemValueType | undefined, next: NodeSystemValueType | undefined): boolean {
  return previous === next || previous !== undefined && next !== undefined &&
    previous.id === next.id && previous.version === next.version
}

function sameJson(previous: NodeSystemJsonValue | undefined, next: NodeSystemJsonValue | undefined): boolean {
  if (Object.is(previous, next)) return true
  if (previous === undefined || next === undefined || previous === null || next === null ||
    typeof previous !== typeof next) return false
  if (Array.isArray(previous) || Array.isArray(next)) {
    if (!Array.isArray(previous) || !Array.isArray(next) || previous.length !== next.length) return false
    return previous.every((value, index) => sameJson(value, next[index]!))
  }
  if (typeof previous !== "object" || typeof next !== "object") return false
  const previousEntries = Object.entries(previous)
  const nextRecord = next as NodeSystemJsonObject
  if (previousEntries.length !== Object.keys(nextRecord).length) return false
  return previousEntries.every(([key, value]) => Object.hasOwn(nextRecord, key) && sameJson(value, nextRecord[key]))
}

function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new TypeError(`${label} must be finite`)
  return value
}

function finitePositive(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) throw new TypeError(`${label} must be positive and finite`)
  return value
}

function finiteNonNegative(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) throw new TypeError(`${label} must be finite and non-negative`)
  return value
}

function nodePlacement(node: NodeSystemNodeSnapshot, index: number): Placement {
  return Object.freeze({
    x: metadataNumber(node.metadata, "x") ?? 42 + index * 284,
    y: metadataNumber(node.metadata, "y") ?? 54 + index % 2 * 94,
    width: metadataNumber(node.metadata, "width") ?? 252,
  })
}

function createNodeGeometryIndex(nodes: readonly NodeSystemNodeSnapshot[]): ReadonlyMap<string, NodeGeometry> {
  const result = new Map<string, NodeGeometry>()
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]!
    const placement = nodePlacement(node, index)
    const endpointBySocketId = new Map<string, EndpointPosition>()
    const parameterIndexById = new Map(node.parameters.map((parameter, parameterIndex) => [parameter.id, parameterIndex]))
    for (let socketIndex = 0; socketIndex < node.sockets.length; socketIndex += 1) {
      const socket = node.sockets[socketIndex]!
      const side = socketSide(socket)
      const parameterIndex = parameterIndexById.get(socket.parameterId ?? "") ?? 0
      const y = socket.parameterId === undefined
        ? placement.y + 46.5 + socketIndex * 30
        // Concrete Fields own a 28px row; NodeCard adds a 3px row gap.
        : placement.y + 47 + parameterIndex * 31
      endpointBySocketId.set(socket.id, Object.freeze({
        x: side === "right" ? placement.x + placement.width : placement.x,
        y,
        kind: socket.valueType?.id ?? "custom",
        side,
      }))
    }
    result.set(node.id, Object.freeze({node, index, placement, endpointBySocketId}))
  }
  return result
}

function endpointPosition(
  nodes: ReadonlyMap<string, NodeGeometry>,
  nodeId: string,
  socketId: string,
): EndpointPosition {
  return nodes.get(nodeId)?.endpointBySocketId.get(socketId) ?? Object.freeze({x: 0, y: 0, kind: "custom", side: "right"})
}

function planNodeConnection(
  link: NodeSystemLinkSnapshot,
  nodes: ReadonlyMap<string, NodeGeometry>,
  offsetX: number,
  offsetY: number,
): NodeConnectionView {
  const from = endpointPosition(nodes, link.from.nodeId, link.from.socketId)
  const to = endpointPosition(nodes, link.to.nodeId, link.to.socketId)
  const localFrom = Object.freeze({x: from.x - offsetX, y: from.y - offsetY})
  const localTo = Object.freeze({x: to.x - offsetX, y: to.y - offsetY})
  const sameEndpoint = localFrom.x === localTo.x && localFrom.y === localTo.y
  const loopX = localFrom.x + (from.side === "left" ? -30 : 30)
  const middleX = Math.round((localFrom.x + localTo.x) / 2)
  const candidates = sameEndpoint
    ? [
      localFrom,
      {x: loopX, y: localFrom.y},
      {x: loopX, y: localFrom.y + 30},
      {x: localFrom.x, y: localFrom.y + 30},
      localTo,
    ]
    : [localFrom, {x: middleX, y: localFrom.y}, {x: middleX, y: localTo.y}, localTo]
  const points = candidates.filter((point, index) => index === 0 ||
    point.x !== candidates[index - 1]!.x || point.y !== candidates[index - 1]!.y)
  const path = projectLinkRoute({kind: "orthogonal", points})
  return Object.freeze({
    link,
    path,
    bounds: path.bounds,
    color: socketColor(from.kind),
    label: metadataString(link.metadata, "label", `${link.from.nodeId} → ${link.to.nodeId}`),
  })
}

function connectionBounds(from: EndpointPosition, to: EndpointPosition): LinkPathProjection["bounds"] {
  if (from.x === to.x && from.y === to.y) {
    const loopX = from.x + (from.side === "left" ? -30 : 30)
    return Object.freeze({x: Math.min(from.x, loopX), y: from.y, width: 30, height: 30})
  }
  const x = Math.min(from.x, to.x)
  const y = Math.min(from.y, to.y)
  return Object.freeze({x, y, width: Math.abs(to.x - from.x), height: Math.abs(to.y - from.y)})
}

function nodeSystemViewportRect(viewport: NodeSystemViewport | undefined): LinkPathProjection["bounds"] | null {
  if (viewport === undefined) return null
  const overscan = finiteNonNegative(viewport.overscan ?? 160, "NodeSystem viewport overscan")
  return Object.freeze({
    x: finite(viewport.x, "NodeSystem viewport x") - overscan,
    y: finite(viewport.y, "NodeSystem viewport y") - overscan,
    width: finitePositive(viewport.width, "NodeSystem viewport width") + overscan * 2,
    height: finitePositive(viewport.height, "NodeSystem viewport height") + overscan * 2,
  })
}

function intersectsBounds(
  left: LinkPathProjection["bounds"],
  right: LinkPathProjection["bounds"],
): boolean {
  return left.x <= right.x + right.width && left.x + left.width >= right.x &&
    left.y <= right.y + right.height && left.y + left.height >= right.y
}

function isSocketConnected(
  links: readonly NodeSystemLinkSnapshot[],
  nodeId: string,
  socketId: string,
  index?: ReadonlySet<string>,
): boolean {
  if (index !== undefined) return index.has(socketKey(nodeId, socketId))
  return links.some(link =>
    link.from.nodeId === nodeId && link.from.socketId === socketId ||
    link.to.nodeId === nodeId && link.to.socketId === socketId)
}

function socketKey(nodeId: string, socketId: string): string {
  return `${nodeId}\u0000${socketId}`
}

function socketSide(socket: NodeSystemSocketSnapshot): "left" | "right" {
  return socket.side ?? (socket.direction === "output" ? "right" : "left")
}

function metadataString(value: NodeSystemJsonValue | undefined, key: string, fallback: string): string {
  const candidate = metadata(value, key)
  return typeof candidate === "string" && candidate.length > 0 ? candidate : fallback
}

function numericVectorValue(value: NodeSystemJsonValue): readonly number[] | null {
  if (
    !Array.isArray(value) || value.length < 2 || value.length > 4 ||
    !value.every((entry) => typeof entry === "number" && Number.isFinite(entry))
  ) return null
  return value as readonly number[]
}

function numericMatrixValue(value: NodeSystemJsonValue): readonly (readonly number[])[] | null {
  if (
    !Array.isArray(value) || value.length < 2 || value.length > 4 ||
    !value.every((row) => Array.isArray(row) && row.length === value.length &&
      row.every((entry) => typeof entry === "number" && Number.isFinite(entry)))
  ) return null
  return value as readonly (readonly number[])[]
}

function colorFieldValue(value: NodeSystemJsonValue): ColorFieldValue | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null
  const object = value as NodeSystemJsonObject
  if (
    typeof object.r !== "number" || !Number.isFinite(object.r) ||
    typeof object.g !== "number" || !Number.isFinite(object.g) ||
    typeof object.b !== "number" || !Number.isFinite(object.b) ||
    typeof object.a !== "number" || !Number.isFinite(object.a)
  ) return null
  return Object.freeze({r: object.r, g: object.g, b: object.b, a: object.a})
}

function metadataNumber(value: NodeSystemJsonValue | undefined, key: string): number | undefined {
  const candidate = metadata(value, key)
  return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : undefined
}

function metadataBoolean(
  value: NodeSystemJsonValue | undefined,
  key: string,
  fallback: boolean,
): boolean {
  const candidate = metadata(value, key)
  return typeof candidate === "boolean" ? candidate : fallback
}

function metadata(value: NodeSystemJsonValue | undefined, key: string): NodeSystemJsonValue | undefined {
  if (value === null || value === undefined || typeof value !== "object" || Array.isArray(value)) return undefined
  return (value as NodeSystemJsonObject)[key]
}

function socketColor(kind: string): string {
  switch (kind) {
    case "boolean": return "rgb(220 84 133)"
    case "float": return "rgb(158 158 158)"
    case "integer": return "rgb(92 158 107)"
    case "vector": return "rgb(99 138 235)"
    case "rotation": return "rgb(148 107 224)"
    case "color": return "rgb(235 199 61)"
    case "string": return "rgb(107 184 184)"
    case "geometry": return "rgb(56 173 145)"
    case "shader": return "rgb(84 199 99)"
    default: return "rgb(213 89 209)"
  }
}
