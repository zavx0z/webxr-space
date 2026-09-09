import {NodePreviewImageView} from "./node-preview-image-view/src/node-preview-image-view.tsx"
import type {NodePreview} from "../../shared/node/preview.ts"
import {metadataBoolean, metadataString, NODE_PARAMETER_SPACING_MEDIUM, NODE_PARAMETER_SPACING_SMALL} from "@nodes/parameters/shared"
import {socketKey, socketSide} from "@nodes/sockets/shared"
import {NODE_BORDER_WIDTH, NODE_ROW_HEIGHT} from "@nodes/sockets/metrics"

import type {
  ExternalStore,
  NodeJsonValue,
  NodeTreeNodeSnapshot,
  ParameterReference,
  ParameterSnapshot,
  Socket as CoreSocket,
} from "@nodes/tree"
import {type FunctionComponent} from "@zavx0z/component"
import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import {chevronDownIcon, chevronRightIcon} from "@zavx0z/ui/themes/icons"
import {
  nodeSocketLayoutPortId,
  type NodeRect,
} from "../../shared/projection/geometry.ts"
import {
  NODE_BODY_PADDING_BOTTOM,
  NODE_BODY_PADDING_TOP,
  NODE_COLLAPSED_HEIGHT,
  NODE_HEADER_HEIGHT,
  NODE_MINIMUM_WIDTH,
  NODE_ROW_GAP,
  planNodeGeometry,
  type NodeGeometryPlan,
  type NodeGeometryRowInput,
} from "../../shared/projection/metrics.ts"
import {
  Parameter,
  projectedParameterFieldHeight,
  resolveProjectedParameterPresentation,
  type ParameterInput,
} from "@nodes/parameters/shared"
import {Socket} from "@nodes/sockets/socket"
import {SOCKET_KINDS, type SocketKind, type SocketShape} from "@nodes/sockets/presets"

export type {NodePreview, NodePreviewImage} from "../../shared/node/preview.ts"

export type ProjectedNodeSnapshot = NodeTreeNodeSnapshot<ParameterReference, NodeJsonValue, NodeJsonValue>

type UiNodeSnapshot = ProjectedNodeSnapshot

/**
Проекция одной ноды по размерам владельца Layout.

@property rect - Готовый прямоугольник в координатах общего дерева; компонент не выполняет раскладку.

@property [parameters] - Snapshot-проекции исходных Parameters; одновременно с children не допускаются.

@property [parameterStore] - Возвращает исходный внешний Store по ID без копирования значения.

@property [resolvedSocketSides] - Стороны портов из той же принятой геометрии, что задаёт rect.
*/
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
  resolvedSocketSides?: ReadonlyMap<string, "left" | "right"> | undefined
  children?: JsxSourceElement | null | undefined
  style?: CssStyle | undefined
  onActivate?: ((event: Event) => void) | undefined
  onCollapseChange?: ((collapsed: boolean, event: Event) => void) | undefined
  onPreviewChange?: ((enabled: boolean, event: Event) => void) | undefined
  onParameterInput?: ((change: ParameterInput, event: Event) => void) | undefined
  onParameterChange?: ((change: ParameterInput, event: Event) => void) | undefined
  onSocketActivate?: ((socketId: string, event: Event) => void) | undefined
}>

/**
 * Строит размеры projected Node и локальные Y всех Socket из snapshot до Layout
 * и без чтения отрисованного дерева.
 */
export function planProjectedNodeGeometry(
  snapshot: ProjectedNodeSnapshot,
  width?: number,
  connectedSocketKeys?: ReadonlySet<string>,
  resolvedSocketSides?: ReadonlyMap<string, "left" | "right">,
): NodeGeometryPlan {
  const parameterIds = new Set(snapshot.parameters.map(parameter => parameter.id))
  const socketsByParameter = new Map<string, CoreSocket[]>()
  const loose: CoreSocket[] = []
  for (const socket of snapshot.sockets) {
    if (socket.parameterId === undefined || !parameterIds.has(socket.parameterId)) {
      loose.push(socket)
      continue
    }
    const sockets = socketsByParameter.get(socket.parameterId) ?? []
    sockets.push(socket)
    socketsByParameter.set(socket.parameterId, sockets)
  }
  const right = loose.filter(socket => projectedSocketSide(
    snapshot.id,
    socket,
    resolvedSocketSides,
  ) === "right")
  const left = loose.filter(socket => projectedSocketSide(
    snapshot.id,
    socket,
    resolvedSocketSides,
  ) === "left")
  const rows: NodeGeometryRowInput[] = [
    ...right.map(socket => projectedSocketRow(snapshot.id, socket)),
    ...snapshot.parameters.map(parameter => {
      const sockets = socketsByParameter.get(parameter.id) ?? []
      const connected = sockets.some(socket =>
        connectedSocketKeys?.has(socketKey(snapshot.id, socket.id)) === true)
      const resolved = resolveProjectedParameterPresentation(parameter)
      return Object.freeze({
        height: connected
          ? NODE_ROW_HEIGHT
          : Math.max(NODE_ROW_HEIGHT, projectedParameterFieldHeight(resolved)),
        spacingBefore: parameterSpacingBeforePixels(parameter),
        socketIds: Object.freeze(sockets.map(socket =>
          nodeSocketLayoutPortId(snapshot.id, socket.id))),
      })
    }),
    ...left.map(socket => projectedSocketRow(snapshot.id, socket)),
  ]
  return planNodeGeometry({width, rows: Object.freeze(rows)})
}

export function Node(props: NodeProps) {
  validateNodeProps(props)
  const parameters = props.parameters ?? []
  if (props.children != null && parameters.length > 0) {
    throw new Error(`Node ${props.id} accepts either authored Component children or projected Parameters`)
  }
  const sockets = props.sockets ?? []
  const parameterIds = new Set(parameters.map(parameter => parameter.id))
  const loose = sockets.filter(socket => socket.parameterId === undefined || !parameterIds.has(socket.parameterId))
  const right = loose.filter(socket => resolvedSocketSide(props, socket) === "right")
  const left = loose.filter(socket => resolvedSocketSide(props, socket) === "left")
  const image = props.preview?.image
  const previewVisible = props.preview?.enabled === true && image !== undefined &&
    image.src.length > 0 && image.width > 0 && image.height > 0
  const headerColor = props.headerColor ?? "#5b466b"
  const selectedShadow = props.selected === true
    ? `0 0 12px ${headerColor}`
    : "0 0 12px rgba(0, 0, 0, .5)"
  const collapseLabel = props.collapsed === true ? `Развернуть ${props.label}` : `Свернуть ${props.label}`
  const collapseIcon = props.collapsed === true ? chevronRightIcon : chevronDownIcon
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
      height: ${props.collapsed === true ? `${NODE_COLLAPSED_HEIGHT}px` : `${props.rect.height}px`};
      min-width: ${NODE_MINIMUM_WIDTH}px;
      min-height: 0;
      overflow: visible;
      border: ${NODE_BORDER_WIDTH}px solid #111111;
      border-radius: var(--radius-large);
      background: #303030;
      color: #d8d8d8;
      font-size: var(--font-size-xs);
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
        border: var(--border-width-control) solid #111111;
        border-radius: var(--radius-large) var(--radius-large) 0 0;
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
        height: ${NODE_HEADER_HEIGHT}px;
        min-height: ${NODE_HEADER_HEIGHT}px;
        gap: 4px;
        padding: 0 5px;
        overflow: hidden;
        border-radius: var(--radius-large) var(--radius-large) 0 0;
        background: ${headerColor};
        color: #dedede;

        &[data-collapsed="true"] {
          border-radius: var(--radius-large);
        }
      `}
    >
      <button
        type="button"
        data-action="collapse-node"
        aria-label={collapseLabel}
        aria-expanded={String(props.collapsed !== true)}
        title={collapseLabel}
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
          font-size: var(--font-size-sm);
        `}
      >
        <img
          src={collapseIcon}
          alt=""
          aria-hidden="true"
          width={14}
          height={14}
          style={css`
            position: relative;
            top: 2px;
            display: block;
            width: 14px;
            height: 14px;
          `}
        />
      </button>
      <strong
        data-node-label=""
        title={props.title}
        style={css`
          display: block;
          min-width: 0;
          flex-grow: 1;
          overflow: hidden;
          color: #dedede;
          font-size: var(--font-size-sm);
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
        title={previewLabel}
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
          font-size: var(--font-size-sm);

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
        gap: ${NODE_ROW_GAP}px;
        padding: ${NODE_BODY_PADDING_TOP}px 0 ${NODE_BODY_PADDING_BOTTOM}px;

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
        resolvedSocketSides={props.resolvedSocketSides}
        spacingBefore={parameterSpacingBefore(parameter)}
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

function parameterSpacingBefore(
  parameter: UiNodeSnapshot["parameters"][number],
): "small" | "medium" | undefined {
  const spacing = metadataString(parameter.presentation, "spacingBefore", "")
  if (spacing === "") return undefined
  if (spacing !== "small" && spacing !== "medium") {
    throw new TypeError(`Parameter ${parameter.id} spacingBefore must be small or medium`)
  }
  return spacing
}

function parameterSpacingBeforePixels(
  parameter: UiNodeSnapshot["parameters"][number],
): number {
  const spacing = parameterSpacingBefore(parameter)
  if (spacing === "small") return NODE_PARAMETER_SPACING_SMALL
  if (spacing === "medium") return NODE_PARAMETER_SPACING_MEDIUM
  return 0
}

function resolvedSocketSide(props: NodeProps, socket: CoreSocket): "left" | "right" {
  return projectedSocketSide(props.id, socket, props.resolvedSocketSides)
}

function projectedSocketSide(
  nodeId: string,
  socket: CoreSocket,
  resolvedSocketSides?: ReadonlyMap<string, "left" | "right">,
): "left" | "right" {
  return resolvedSocketSides?.get(socketKey(nodeId, socket.id)) ?? socketSide(socket)
}

function projectedSocketRow(nodeId: string, socket: CoreSocket): NodeGeometryRowInput {
  return Object.freeze({
    height: NODE_ROW_HEIGHT,
    socketIds: Object.freeze([nodeSocketLayoutPortId(nodeId, socket.id)]),
  })
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
