import type {Event, HTMLInputElement} from "@zavx0z/dom"
import {
  defineStyles,
  memo,
  useId,
  useMemo,
  useSyncExternalStore,
  type FunctionComponent,
  type StyleValue,
} from "@zavx0z/react"

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
  style?: StyleValue
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
  style?: StyleValue
  parameterStore?: ((nodeId: string, parameterId: string) => NodeSystemParameterExternalStore) | undefined
  onParameterInput?: ((change: NodeSystemParameterInput) => void) | undefined
}>

export type ParameterRowProps = Readonly<{
  nodeId: string
  parameter: NodeSystemParameterSnapshot
  sockets: readonly NodeSystemSocketSnapshot[]
  links: readonly NodeSystemLinkSnapshot[]
  store?: NodeSystemParameterExternalStore | undefined
  style?: StyleValue
  onParameterInput?: ((change: NodeSystemParameterInput) => void) | undefined
}>

export type SocketPortProps = Readonly<{
  nodeId: string
  socket: NodeSystemSocketSnapshot
  connected?: boolean
  style?: StyleValue
}>

export type NodeConnectionProps = Readonly<{
  link: NodeSystemLinkSnapshot
  nodes: readonly NodeSystemNodeSnapshot[]
  offsetX?: number
  offsetY?: number
  style?: StyleValue
}>

export const nodeSystemStyles = defineStyles("@nodes/ui/node-system", {
  root: {
    boxSizing: "border-box",
    position: "relative",
    display: "block",
    width: "100%",
    minWidth: 720,
    minHeight: 480,
    overflow: "hidden",
    border: "1px solid rgb(26 26 26)",
    borderRadius: 7,
    background: "rgb(29 29 29)",
    color: "rgb(224 224 224)",
    fontSize: 11,
  },
  status: {
    boxSizing: "border-box",
    position: "absolute",
    top: 8,
    right: 10,
    zIndex: 3,
    display: "flex",
    alignItems: "center",
    height: 20,
    gap: 6,
    padding: "2px 7px",
    border: "1px solid rgb(57 57 57)",
    borderRadius: 10,
    background: "rgba(24, 24, 24, .86)",
    color: "rgb(166 166 166)",
    fontSize: 10,
    whiteSpace: "nowrap",
  },
  scene: {
    boxSizing: "border-box",
    position: "absolute",
    display: "block",
    left: 0,
    top: 0,
    width: "100%",
    height: "100%",
  },
  node: {
    boxSizing: "border-box",
    position: "absolute",
    zIndex: 2,
    display: "flex",
    flexDirection: "column",
    minWidth: 210,
    overflow: "visible",
    border: "1px solid rgb(15 15 15)",
    borderRadius: 6,
    background: "rgb(48 48 48)",
    color: "rgb(224 224 224)",
    boxShadow: "0 8px 22px rgba(0, 0, 0, .48)",
  },
  header: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    height: 26,
    minHeight: 26,
    gap: 6,
    padding: "0 8px",
    overflow: "hidden",
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
    color: "rgb(245 245 245)",
  },
  title: {
    display: "block",
    minWidth: 0,
    flexGrow: 1,
    overflow: "hidden",
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  },
  category: {
    display: "block",
    flexShrink: 0,
    color: "rgba(255, 255, 255, .68)",
    fontSize: 9,
    whiteSpace: "nowrap",
  },
  body: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    width: "100%",
    minWidth: 0,
    gap: 3,
    padding: "6px 8px 8px",
  },
  parameter: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    minWidth: 0,
    minHeight: 27,
    gap: 5,
  },
  socketStack: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    minWidth: 13,
    gap: 2,
  },
  socket: {
    boxSizing: "border-box",
    display: "block",
    width: 13,
    minWidth: 13,
    height: 13,
    minHeight: 13,
    padding: 0,
    border: "2px solid rgb(158 158 158)",
    borderRadius: "50%",
    background: "rgb(31 31 31)",
    color: "transparent",
    fontSize: 1,
    boxShadow: "0 0 0 rgba(0, 0, 0, 0)",
    ":hover": {boxShadow: "0 0 7px currentcolor"},
    ":focus": {boxShadow: "0 0 8px currentcolor"},
  },
  socketConnected: {
    background: "currentcolor",
    boxShadow: "0 0 5px currentcolor",
  },
  label: {
    display: "block",
    width: 82,
    minWidth: 64,
    overflow: "hidden",
    color: "rgb(211 211 211)",
    fontSize: 10,
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  },
  control: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    flexGrow: 1,
    height: 22,
    overflow: "hidden",
    border: "1px solid rgb(80 80 80)",
    borderRadius: 3,
    background: "rgb(68 68 68)",
    color: "rgb(238 238 238)",
  },
  input: {
    boxSizing: "border-box",
    display: "block",
    width: "100%",
    minWidth: 0,
    height: 20,
    padding: "2px 5px",
    border: "none",
    borderRadius: 2,
    background: "transparent",
    color: "rgb(238 238 238)",
    fontSize: 10,
    ":focus": {background: "rgb(38 38 38)"},
  },
  checkbox: {
    boxSizing: "border-box",
    display: "block",
    width: 14,
    minWidth: 14,
    height: 14,
    margin: "3px 5px",
  },
  complex: {
    display: "block",
    width: "100%",
    minWidth: 0,
    padding: "2px 5px",
    overflow: "hidden",
    color: "rgb(183 204 226)",
    fontSize: 9,
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  },
  looseSockets: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: 6,
    paddingTop: 3,
  },
  looseLabel: {
    display: "block",
    minWidth: 0,
    flexGrow: 1,
    overflow: "hidden",
    color: "rgb(176 176 176)",
    fontSize: 9,
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  },
  connection: {
    boxSizing: "border-box",
    position: "absolute",
    zIndex: 1,
    display: "block",
    left: 0,
    top: 0,
    width: "100%",
    height: "100%",
  },
  segment: {
    boxSizing: "border-box",
    position: "absolute",
    display: "block",
    minWidth: 2,
    minHeight: 2,
    borderRadius: 2,
    background: "rgb(158 158 158)",
    boxShadow: "0 0 4px rgba(0, 0, 0, .7)",
  },
})

export const nodeSystemCss = nodeSystemStyles.cssText

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
    style={[
      nodeSystemStyles.root,
      viewport === undefined ? undefined : {width: viewport.width, height: viewport.height},
      props.style,
    ]}
  >
    <span style={nodeSystemStyles.status}>
      {view.entries.length} visible nodes
    </span>
    <div style={nodeSystemStyles.scene}>
      {view.links.map(link => <MemoNodeConnection
        key={link.id}
        link={link}
        nodes={view.nodes}
        offsetX={offsetX}
        offsetY={offsetY}
      />)}
      {view.entries.map(entry => <MemoNodeCard
        key={entry.node.id}
        node={entry.node}
        links={view.links}
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
    style={[
      nodeSystemStyles.node,
      {
        left: placement.x - (props.offsetX ?? 0),
        top: placement.y - (props.offsetY ?? 0),
        width: placement.width,
      },
      props.style,
    ]}
  >
    <header style={[nodeSystemStyles.header, {background: headerColor}]}>
      <strong style={nodeSystemStyles.title}>{label}</strong>
      <small style={nodeSystemStyles.category}>{category}</small>
    </header>
    <section aria-label={`${label} parameters`} style={nodeSystemStyles.body}>
      {props.node.parameters.map(parameter => <MemoParameterRow
        key={parameter.id}
        nodeId={props.node.id}
        parameter={parameter}
        sockets={props.node.sockets.filter(socket => socket.parameterId === parameter.id)}
        links={props.links}
        store={props.parameterStore?.(props.node.id, parameter.id)}
        onParameterInput={props.onParameterInput}
      />)}
      {looseSockets.map(socket => <MemoLooseSocketRow
        key={socket.id}
        nodeId={props.node.id}
        socket={socket}
        links={props.links}
      />)}
    </section>
  </article>
}

type LooseSocketRowProps = Readonly<{
  nodeId: string
  socket: NodeSystemSocketSnapshot
  links: readonly NodeSystemLinkSnapshot[]
}>

function LooseSocketRow(props: LooseSocketRowProps) {
  return <div
    data-loose-socket={props.socket.id}
    style={nodeSystemStyles.looseSockets}
  >
    <MemoSocketPort
      nodeId={props.nodeId}
      socket={props.socket}
      connected={isSocketConnected(props.links, props.nodeId, props.socket.id)}
    />
    <span style={nodeSystemStyles.looseLabel}>
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
  const controlId = useId()
  const labelId = `${controlId}-label`
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
  return <div
    role="group"
    aria-labelledby={labelId}
    data-parameter-id={parameter.id}
    style={[nodeSystemStyles.parameter, props.style]}
  >
    <span style={nodeSystemStyles.socketStack}>
      {left.map(socket => <MemoSocketPort
        key={socket.id}
        nodeId={props.nodeId}
        socket={socket}
        connected={isSocketConnected(props.links, props.nodeId, socket.id)}
      />)}
    </span>
    <label id={labelId} htmlFor={activeControlId(controlId, parameter.value)} style={nodeSystemStyles.label}>
      {label}
    </label>
    <ParameterControl
      id={controlId}
      parameter={parameter}
      disabled={disabled}
      readOnly={readOnly}
      onInput={onInput}
    />
    <span style={nodeSystemStyles.socketStack}>
      {right.map(socket => <MemoSocketPort
        key={socket.id}
        nodeId={props.nodeId}
        socket={socket}
        connected={isSocketConnected(props.links, props.nodeId, socket.id)}
      />)}
    </span>
  </div>
}

type ParameterControlProps = Readonly<{
  id: string
  parameter: NodeSystemParameterSnapshot
  disabled: boolean
  readOnly: boolean
  onInput(value: NodeSystemJsonValue): void
}>

function ParameterControl(props: ParameterControlProps) {
  const booleanValue = typeof props.parameter.value === "boolean"
  const numberValue = typeof props.parameter.value === "number"
  const stringValue = typeof props.parameter.value === "string"
  const complexValue = !booleanValue && !numberValue && !stringValue
  return <span style={nodeSystemStyles.control}>
    {booleanValue ? <BooleanParameterControl
      id={props.id}
      parameter={props.parameter}
      disabled={props.disabled}
      readOnly={props.readOnly}
      onInput={props.onInput}
    /> : null}
    {numberValue ? <NumberParameterControl
      id={props.id}
      parameter={props.parameter}
      disabled={props.disabled}
      readOnly={props.readOnly}
      onInput={props.onInput}
    /> : null}
    {stringValue ? <StringParameterControl
      id={props.id}
      parameter={props.parameter}
      disabled={props.disabled}
      readOnly={props.readOnly}
      onInput={props.onInput}
    /> : null}
    {complexValue ? <ComplexParameterControl
      id={props.id}
      parameter={props.parameter}
      disabled={props.disabled}
      readOnly={props.readOnly}
      onInput={props.onInput}
    /> : null}
  </span>
}

function BooleanParameterControl(props: ParameterControlProps) {
  const onChange = (event: Event) => props.onInput((event.target as HTMLInputElement).checked)
  return <input
    id={`${props.id}-boolean`}
    aria-label={metadataString(props.parameter.presentation, "label", props.parameter.id)}
    type="checkbox"
    checked={props.parameter.value === true}
    disabled={props.disabled}
    onChange={onChange}
    style={nodeSystemStyles.checkbox}
  />
}

function NumberParameterControl(props: ParameterControlProps) {
  const onInput = (event: Event) => {
    const value = (event.target as HTMLInputElement).valueAsNumber
    if (Number.isFinite(value)) props.onInput(value)
  }
  return <input
    id={`${props.id}-number`}
    aria-label={metadataString(props.parameter.presentation, "label", props.parameter.id)}
    type="number"
    value={props.parameter.value as number}
    min={metadataNumber(props.parameter.presentation, "min")}
    max={metadataNumber(props.parameter.presentation, "max")}
    step={metadataNumber(props.parameter.presentation, "step") ?? 0.1}
    disabled={props.disabled}
    readOnly={props.readOnly}
    onInput={onInput}
    style={nodeSystemStyles.input}
  />
}

function StringParameterControl(props: ParameterControlProps) {
  const onInput = (event: Event) => props.onInput((event.target as HTMLInputElement).value)
  return <input
    id={`${props.id}-string`}
    aria-label={metadataString(props.parameter.presentation, "label", props.parameter.id)}
    type="text"
    value={props.parameter.value as string}
    disabled={props.disabled}
    readOnly={props.readOnly}
    onInput={onInput}
    style={nodeSystemStyles.input}
  />
}

function ComplexParameterControl(props: ParameterControlProps) {
  const text = JSON.stringify(props.parameter.value)
  return <output
    id={`${props.id}-complex`}
    aria-label={metadataString(props.parameter.presentation, "label", props.parameter.id)}
    style={nodeSystemStyles.complex}
  >
    {text}
  </output>
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
    style={[
      nodeSystemStyles.socket,
      props.connected === true && nodeSystemStyles.socketConnected,
      {borderColor: color, color},
      props.style,
    ]}
  >
    {label}
  </button>
}

export function NodeConnection(props: NodeConnectionProps) {
  const from = endpointPosition(props.nodes, props.link.from.nodeId, props.link.from.socketId)
  const to = endpointPosition(props.nodes, props.link.to.nodeId, props.link.to.socketId)
  const offsetX = props.offsetX ?? 0
  const offsetY = props.offsetY ?? 0
  const localFrom = Object.freeze({...from, x: from.x - offsetX, y: from.y - offsetY})
  const localTo = Object.freeze({...to, x: to.x - offsetX, y: to.y - offsetY})
  const middleX = Math.round((localFrom.x + localTo.x) / 2)
  const horizontalOne = horizontalSegment(localFrom.x, localFrom.y, middleX)
  const vertical = verticalSegment(middleX, localFrom.y, localTo.y)
  const horizontalTwo = horizontalSegment(middleX, localTo.y, localTo.x)
  const color = socketColor(from.kind)
  const label = metadataString(props.link.metadata, "label", `${props.link.from.nodeId} → ${props.link.to.nodeId}`)
  return <span
    role="img"
    aria-label={label}
    data-link-id={props.link.id}
    style={[nodeSystemStyles.connection, props.style]}
  >
    <span aria-hidden="true" style={[nodeSystemStyles.segment, horizontalOne, {background: color}]}></span>
    <span aria-hidden="true" style={[nodeSystemStyles.segment, vertical, {background: color}]}></span>
    <span aria-hidden="true" style={[nodeSystemStyles.segment, horizontalTwo, {background: color}]}></span>
  </span>
}

export type NodeSystemComponent = FunctionComponent<NodeSystemProps>
export type NodeCardComponent = FunctionComponent<NodeCardProps>
export type ParameterRowComponent = FunctionComponent<ParameterRowProps>
export type SocketPortComponent = FunctionComponent<SocketPortProps>
export type NodeConnectionComponent = FunctionComponent<NodeConnectionProps>

const MemoNodeCard = memo(NodeCard, sameNodeCardProps)
const MemoParameterRow = memo(ParameterRow, sameParameterRowProps)
const MemoSocketPort = memo(SocketPort, sameSocketPortProps)
const MemoNodeConnection = memo(NodeConnection, sameNodeConnectionProps)
const MemoLooseSocketRow = memo(LooseSocketRow, sameLooseSocketRowProps)

type Placement = Readonly<{x: number; y: number; width: number}>
type EndpointPosition = Readonly<{x: number; y: number; kind: string}>
type VisibleNodeEntry = Readonly<{node: NodeSystemNodeSnapshot; index: number}>
type NodeSystemViewSnapshot = Readonly<{
  entries: readonly VisibleNodeEntry[]
  nodes: readonly NodeSystemNodeSnapshot[]
  links: readonly NodeSystemLinkSnapshot[]
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
    const links = Object.freeze(snapshot.links.filter(link =>
      nodeIds.has(link.from.nodeId) && nodeIds.has(link.to.nodeId)))
    source = snapshot
    if (selected !== undefined && sameVisibleEntries(selected.entries, entries) &&
      sameLinks(selected.links, links)) return selected
    selected = Object.freeze({entries, nodes, links})
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
    sameNodeSnapshot(previous.node, next.node) && sameLinks(previous.links, next.links)
}

function sameParameterRowProps(previous: ParameterRowProps, next: ParameterRowProps): boolean {
  return previous.nodeId === next.nodeId && previous.style === next.style &&
    previous.onParameterInput === next.onParameterInput && previous.store === next.store &&
    sameParameter(previous.parameter, next.parameter) &&
    sameSockets(previous.sockets, next.sockets) && sameLinks(previous.links, next.links)
}

function sameSocketPortProps(previous: SocketPortProps, next: SocketPortProps): boolean {
  return previous.nodeId === next.nodeId && previous.connected === next.connected &&
    previous.style === next.style && sameSocket(previous.socket, next.socket)
}

function sameNodeConnectionProps(previous: NodeConnectionProps, next: NodeConnectionProps): boolean {
  return previous.offsetX === next.offsetX && previous.offsetY === next.offsetY &&
    previous.style === next.style && sameLink(previous.link, next.link) &&
    sameEndpointNode(previous.nodes, next.nodes, next.link.from.nodeId) &&
    sameEndpointNode(previous.nodes, next.nodes, next.link.to.nodeId)
}

function sameLooseSocketRowProps(previous: LooseSocketRowProps, next: LooseSocketRowProps): boolean {
  return previous.nodeId === next.nodeId && sameSocket(previous.socket, next.socket) &&
    sameLinks(previous.links, next.links)
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

function sameLink(previous: NodeSystemLinkSnapshot, next: NodeSystemLinkSnapshot): boolean {
  return previous === next || previous.id === next.id && sameJson(previous.metadata, next.metadata) &&
    previous.from.nodeId === next.from.nodeId && previous.from.socketId === next.from.socketId &&
    previous.to.nodeId === next.to.nodeId && previous.to.socketId === next.to.socketId
}

function sameEndpointNode(
  previous: readonly NodeSystemNodeSnapshot[],
  next: readonly NodeSystemNodeSnapshot[],
  id: string,
): boolean {
  const before = previous.find(node => node.id === id)
  const after = next.find(node => node.id === id)
  return before === undefined || after === undefined ? before === after : sameNodeSnapshot(before, after)
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

function endpointPosition(
  nodes: readonly NodeSystemNodeSnapshot[],
  nodeId: string,
  socketId: string,
): EndpointPosition {
  const index = Math.max(0, nodes.findIndex(node => node.id === nodeId))
  const node = nodes[index]
  if (node === undefined) return Object.freeze({x: 0, y: 0, kind: "custom"})
  const placement = nodePlacement(node, index)
  const socketIndex = Math.max(0, node.sockets.findIndex(socket => socket.id === socketId))
  const socket = node.sockets[socketIndex]
  const side = socket === undefined ? "right" : socketSide(socket)
  const parameterIndex = socket?.parameterId === undefined
    ? socketIndex
    : Math.max(0, node.parameters.findIndex(parameter => parameter.id === socket.parameterId))
  return Object.freeze({
    x: side === "right" ? placement.x + placement.width : placement.x,
    y: placement.y + 45.5 + parameterIndex * 30,
    kind: socket?.valueType?.id ?? "custom",
  })
}

function horizontalSegment(fromX: number, y: number, toX: number): StyleValue {
  return Object.freeze({
    left: Math.min(fromX, toX),
    top: y,
    width: Math.max(2, Math.abs(toX - fromX)),
    height: 2,
  })
}

function verticalSegment(x: number, fromY: number, toY: number): StyleValue {
  return Object.freeze({
    left: x,
    top: Math.min(fromY, toY),
    width: 2,
    height: Math.max(2, Math.abs(toY - fromY)),
  })
}

function isSocketConnected(
  links: readonly NodeSystemLinkSnapshot[],
  nodeId: string,
  socketId: string,
): boolean {
  return links.some(link =>
    link.from.nodeId === nodeId && link.from.socketId === socketId ||
    link.to.nodeId === nodeId && link.to.socketId === socketId)
}

function socketSide(socket: NodeSystemSocketSnapshot): "left" | "right" {
  return socket.side ?? (socket.direction === "output" ? "right" : "left")
}

function activeControlId(id: string, value: NodeSystemJsonValue): string {
  if (typeof value === "boolean") return `${id}-boolean`
  if (typeof value === "number") return `${id}-number`
  if (typeof value === "string") return `${id}-string`
  return `${id}-complex`
}

function metadataString(value: NodeSystemJsonValue | undefined, key: string, fallback: string): string {
  const candidate = metadata(value, key)
  return typeof candidate === "string" && candidate.length > 0 ? candidate : fallback
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
