import type {
  ExternalStore,
  NodeJsonValue,
  NodeTreeNodeSnapshot,
  ParameterReference,
  ParameterSnapshot,
  Socket as CoreSocket,
} from "@nodes/core"
import {type FunctionComponent} from "@zavx0z/react"
import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import {
  metadataBoolean,
  metadataString,
  type NodeRect,
} from "./geometry.ts"
import {
  Parameter,
  type ParameterInput,
} from "./parameter.tsx"
import {
  Socket,
  SOCKET_KINDS,
  type SocketKind,
  type SocketShape,
} from "./socket.tsx"

export type NodePreviewImage = Readonly<{
  src: string
  width: number
  height: number
  alt?: string | undefined
}>

export type NodePreview = Readonly<{
  enabled: boolean
  image?: NodePreviewImage | undefined
}>

type UiNodeSnapshot = NodeTreeNodeSnapshot<ParameterReference, NodeJsonValue, NodeJsonValue>

export type NodeProps = Readonly<{
  id: string
  frameId?: string | undefined
  label: string
  rect: NodeRect
  title?: string | undefined
  category?: string | undefined
  headerColor?: string | undefined
  selected?: boolean | undefined
  hidden?: boolean | undefined
  collapsed?: boolean | undefined
  preview?: NodePreview | undefined
  parameters?: UiNodeSnapshot["parameters"] | undefined
  sockets?: readonly CoreSocket[] | undefined
  parameterStore?: ((parameterId: string) => ExternalStore<ParameterSnapshot>) | undefined
  connectedSocketKeys?: ReadonlySet<string> | undefined
  children?: JsxSourceElement | null | undefined
  style?: CssStyle | undefined
  onActivate?: ((event: Event) => void) | undefined
  onCollapseChange?: ((collapsed: boolean, event: Event) => void) | undefined
  onPreviewChange?: ((enabled: boolean, event: Event) => void) | undefined
  onParameterInput?: ((change: ParameterInput, event: Event) => void) | undefined
  onParameterChange?: ((change: ParameterInput, event: Event) => void) | undefined
  onSocketActivate?: ((socketId: string, event: Event) => void) | undefined
}>

export function Node(props: NodeProps) {
  validateNodeProps(props)
  const parameters = props.parameters ?? []
  if (props.children != null && parameters.length > 0) {
    throw new Error(`Node ${props.id} accepts either authored Component children or projected Parameters`)
  }
  const sockets = props.sockets ?? []
  const parameterIds = new Set(parameters.map(parameter => parameter.id))
  const loose = sockets.filter(socket => socket.parameterId === undefined || !parameterIds.has(socket.parameterId))
  const right = loose.filter(socket => socketSide(socket) === "right")
  const left = loose.filter(socket => socketSide(socket) === "left")
  const image = props.preview?.image
  const previewVisible = props.preview?.enabled === true && image !== undefined &&
    image.src.length > 0 && image.width > 0 && image.height > 0
  const headerColor = props.headerColor ?? "#5b466b"
  const selectedShadow = props.selected === true
    ? `0 0 12px ${headerColor}`
    : "0 0 12px rgba(0, 0, 0, .5)"
  const collapseLabel = props.collapsed === true ? `Развернуть ${props.label}` : `Свернуть ${props.label}`
  const collapseGlyph = props.collapsed === true ? "▸" : "▾"
  const previewLabel = props.preview?.enabled === true ? "Скрыть preview" : "Показать preview"
  const previewGlyph = props.preview?.enabled === true ? "◉" : "○"
  const toggleCollapse = (event: Event) => {
    event.stopPropagation()
    props.onCollapseChange?.(props.collapsed !== true, event)
  }
  const togglePreview = (event: Event) => {
    event.stopPropagation()
    props.onPreviewChange?.(props.preview?.enabled !== true, event)
  }
  return <article
    role="option"
    tabIndex={0}
    aria-label={props.label}
    aria-selected={String(props.selected === true)}
    hidden={props.hidden === true}
    data-node-id={props.id}
    data-frame-id={props.frameId}
    data-category={props.category ?? ""}
    data-collapsed={props.collapsed === true ? "true" : undefined}
    title={props.title ?? props.label}
    onClick={props.onActivate}
    style={css`
      box-sizing: border-box;
      position: absolute;
      z-index: 3;
      display: flex;
      flex-direction: column;
      left: ${props.rect.x}px;
      top: ${props.rect.y}px;
      width: ${props.rect.width}px;
      min-width: 100px;
      min-height: ${props.collapsed === true ? "24px" : `${props.rect.height}px`};
      overflow: visible;
      border: 1px solid #111111;
      border-radius: 6px;
      background: #303030;
      color: #d8d8d8;
      font-size: 10px;
      box-shadow: ${selectedShadow};

      &[aria-selected="true"] {
        border-color: #171717;
      }

      &[hidden] {
        display: none;
      }

      ${props.style}
    `}
  >
    <figure
      hidden={!previewVisible}
      data-node-preview=""
      style={css`
        box-sizing: border-box;
        position: absolute;
        left: 3px;
        bottom: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        width: ${Math.max(1, props.rect.width - 6)}px;
        min-height: 72px;
        margin: 0;
        padding: 3px;
        overflow: hidden;
        border: 1px solid #111111;
        border-radius: 6px 6px 0 0;
        background: #2b2b2b;

        &[hidden] {
          display: none;
        }
      `}
    >
      {image !== undefined ? <NodePreviewImageView
        image={image}
        nodeLabel={props.label}
      /> : null}
    </figure>
    <header
      data-collapsed={props.collapsed === true ? "true" : undefined}
      style={css`
        box-sizing: border-box;
        display: flex;
        flex-direction: row;
        align-items: center;
        width: 100%;
        height: 24px;
        min-height: 24px;
        gap: 2px;
        padding: 0 5px;
        overflow: hidden;
        border-radius: 5px 5px 0 0;
        background: ${headerColor};
        color: #dedede;

        &[data-collapsed="true"] {
          border-radius: 5px;
        }
      `}
    >
      <button
        type="button"
        data-action="collapse-node"
        aria-label={collapseLabel}
        aria-expanded={String(props.collapsed !== true)}
        disabled={props.onCollapseChange === undefined}
        onClick={toggleCollapse}
        style={css`
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 12px;
          min-width: 12px;
          height: 20px;
          min-height: 20px;
          padding: 0;
          border: 0;
          background: transparent;
          color: #dedede;
          font-size: 10px;
        `}
      >
        {collapseGlyph}
      </button>
      <strong
        style={css`
          display: block;
          min-width: 0;
          flex-grow: 1;
          overflow: hidden;
          color: #dedede;
          font-size: 10px;
          font-weight: 600;
          white-space: nowrap;
          text-overflow: ellipsis;
        `}
      >
        {props.label}
      </strong>
      <small
        hidden={props.category === undefined}
        style={css`
          display: block;
          flex-shrink: 0;
          color: rgba(255, 255, 255, .68);
          font-size: 9px;
          white-space: nowrap;

          &[hidden] {
            display: none;
          }
        `}
      >
        {props.category ?? ""}
      </small>
      <button
        type="button"
        data-action="toggle-preview"
        aria-label={previewLabel}
        aria-pressed={String(props.preview?.enabled === true)}
        hidden={props.preview === undefined}
        disabled={props.onPreviewChange === undefined}
        onClick={togglePreview}
        style={css`
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 12px;
          min-width: 12px;
          height: 20px;
          min-height: 20px;
          padding: 0;
          border: 0;
          background: transparent;
          color: #dedede;
          font-size: 10px;

          &[hidden] {
            display: none;
          }
        `}
      >
        {previewGlyph}
      </button>
    </header>
    <section
      aria-label={`${props.label} body`}
      hidden={props.collapsed === true}
      style={css`
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        width: 100%;
        min-width: 0;
        gap: 3px;
        padding: 8px;

        &[hidden] {
          display: none;
        }
      `}
    >
      {right.map(socket => <Socket
        key={socket.id}
        id={socket.id}
        nodeId={props.id}
        kind={socketKind(socket.valueType?.id ?? metadataString(socket.metadata, "kind", "custom"))}
        direction={socket.direction}
        side="right"
        label={metadataString(socket.metadata, "label", socket.id)}
        shape={socketShape(metadataString(socket.metadata, "shape", ""))}
        connected={props.connectedSocketKeys?.has(`${props.id}\u0000${socket.id}`) === true}
        disabled={metadataBoolean(socket.metadata, "disabled", false)}
        presentation="row"
        onActivate={event => props.onSocketActivate?.(socket.id, event)}
      />)}
      {parameters.map(parameter => <Parameter
        key={parameter.id}
        nodeId={props.id}
        snapshot={parameter}
        sockets={sockets.filter(socket => socket.parameterId === parameter.id)}
        store={props.parameterStore?.(parameter.id)}
        connectedSocketKeys={props.connectedSocketKeys}
        onInput={props.onParameterInput}
        onChange={props.onParameterChange}
        onSocketActivate={props.onSocketActivate}
      />)}
      {props.children}
      {left.map(socket => <Socket
        key={socket.id}
        id={socket.id}
        nodeId={props.id}
        kind={socketKind(socket.valueType?.id ?? metadataString(socket.metadata, "kind", "custom"))}
        direction={socket.direction}
        side="left"
        label={metadataString(socket.metadata, "label", socket.id)}
        shape={socketShape(metadataString(socket.metadata, "shape", ""))}
        connected={props.connectedSocketKeys?.has(`${props.id}\u0000${socket.id}`) === true}
        disabled={metadataBoolean(socket.metadata, "disabled", false)}
        presentation="row"
        onActivate={event => props.onSocketActivate?.(socket.id, event)}
      />)}
    </section>
  </article>
}

export type NodeComponent = FunctionComponent<NodeProps>

function NodePreviewImageView(props: Readonly<{image: NodePreviewImage; nodeLabel: string}>) {
  return <img
    src={props.image.src}
    width={props.image.width}
    height={props.image.height}
    alt={props.image.alt ?? `${props.nodeLabel} preview`}
    style={css`
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    `}
  />
}

function socketSide(socket: CoreSocket): "left" | "right" {
  return socket.side ?? (socket.direction === "output" ? "right" : "left")
}

function socketKind(value: string): SocketKind {
  return SOCKET_KINDS.includes(value as SocketKind) ? value as SocketKind : "custom"
}

function socketShape(value: string): SocketShape | undefined {
  return value === "circle" || value === "square" || value === "diamond" ||
    value === "circle-dot" || value === "square-dot" || value === "diamond-dot" ||
    value === "line" || value === "volume-grid" ? value : undefined
}

function validateNodeProps(props: NodeProps): void {
  if (props.id.trim().length === 0) throw new TypeError("Node id must be non-empty")
  if (props.label.trim().length === 0) throw new TypeError(`Node ${props.id} label must be non-empty`)
  if (props.headerColor !== undefined && !/^#[0-9a-f]{6}$/iu.test(props.headerColor)) {
    throw new TypeError(`Node ${props.id} headerColor must be #rrggbb`)
  }
  const ids = new Set<string>()
  for (const socket of props.sockets ?? []) {
    if (ids.has(socket.id)) throw new Error(`Node ${props.id} Socket id must be unique: ${socket.id}`)
    ids.add(socket.id)
  }
}
