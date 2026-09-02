import {
  Element as DomElement,
} from "@zavx0z/dom"
import type {LayoutResult} from "@nodes/layout/types"
import {
  useMemo,
  useRef,
  useState,
  type FunctionComponent,
} from "@zavx0z/react"
import {
  clamp,
  createNodeGeometryIndex,
  fitNodeTreeTransform,
  metadataBoolean,
  type NodeTreeTransform,
} from "./geometry.ts"
import {
  NodeTree,
  type NodeTreeProps,
  type NodeTreeSelection,
  type NodeTreeStore,
} from "./node-tree.tsx"
import type {ParameterInput} from "./parameter.tsx"

export type NodeEditorProps = Readonly<{
  store: NodeTreeStore
  layout?: LayoutResult | undefined
  label?: string | undefined
  title?: string | undefined
  width?: number | undefined
  height?: number | undefined
  interactive?: boolean | undefined
  minScale?: number | undefined
  maxScale?: number | undefined
  fitPadding?: number | undefined
  gridSize?: number | undefined
  overscan?: number | undefined
  transform?: NodeTreeTransform | undefined
  selection?: NodeTreeSelection | undefined
  collapsedNodeIds?: ReadonlySet<string> | undefined
  previewNodeIds?: ReadonlySet<string> | undefined
  style?: CssStyle | undefined
  onTransformChange?: ((transform: NodeTreeTransform, event: Event) => void) | undefined
  onSelectionChange?: ((selection: NodeTreeSelection, event: Event) => void) | undefined
  onNodeCollapseChange?: ((nodeId: string, collapsed: boolean, event: Event) => void) | undefined
  onNodePreviewChange?: ((nodeId: string, enabled: boolean, event: Event) => void) | undefined
  onParameterInput?: ((change: ParameterInput, event: Event) => void) | undefined
  onParameterChange?: ((change: ParameterInput, event: Event) => void) | undefined
  onSocketActivate?: ((nodeId: string, socketId: string, event: Event) => void) | undefined
}>

type Point = Readonly<{x: number; y: number}>

export function NodeEditor(props: NodeEditorProps) {
  const width = positive(props.width ?? 760, "NodeEditor width")
  const height = positive(props.height ?? 480, "NodeEditor height")
  const contentHeight = Math.max(1, height - 30)
  const minScale = positive(props.minScale ?? .16, "NodeEditor minScale")
  const maxScale = positive(props.maxScale ?? 3, "NodeEditor maxScale")
  if (maxScale < minScale) throw new RangeError("NodeEditor maxScale must be at least minScale")
  const padding = nonNegative(props.fitPadding ?? 24, "NodeEditor fitPadding")
  const gridSize = positive(props.gridSize ?? 24, "NodeEditor gridSize")
  const initialGeometry = useMemo(() => geometry(props.store, props.layout), [props.store, props.layout])
  const initialTransform = useMemo(
    () => fitNodeTreeTransform(initialGeometry.bounds, width, contentHeight, padding, minScale, maxScale),
    [initialGeometry, width, contentHeight, padding, minScale, maxScale],
  )
  const [ownedTransform, setOwnedTransform] = useState(initialTransform)
  const [ownedSelection, setOwnedSelection] = useState<NodeTreeSelection>(null)
  const [ownedCollapsed, setOwnedCollapsed] = useState<ReadonlySet<string>>(() => initialCollapsed(props.store))
  const [ownedPreview, setOwnedPreview] = useState<ReadonlySet<string>>(() => initialPreviews(props.store))
  const pointers = useRef(new Map<number, Point>())
  const transform = props.transform ?? ownedTransform
  const selection = props.selection ?? ownedSelection
  const collapsed = props.collapsedNodeIds ?? ownedCollapsed
  const previews = props.previewNodeIds ?? ownedPreview
  const interactive = props.interactive !== false
  const viewport = useMemo(() => Object.freeze({
    x: -transform.x / transform.scale,
    y: -transform.y / transform.scale,
    width: width / transform.scale,
    height: contentHeight / transform.scale,
    overscan: (props.overscan ?? 160) / transform.scale,
  }), [transform, width, contentHeight, props.overscan])
  const gridPoints = useMemo(() => createGridPoints(gridSize, width, contentHeight), [gridSize, width, contentHeight])

  const publishTransform = (next: NodeTreeTransform, event: Event) => {
    const normalized = Object.freeze({
      x: finite(next.x, "NodeEditor transform x"),
      y: finite(next.y, "NodeEditor transform y"),
      scale: clamp(positive(next.scale, "NodeEditor transform scale"), minScale, maxScale),
    })
    if (props.transform === undefined) setOwnedTransform(normalized)
    props.onTransformChange?.(normalized, event)
  }
  const publishSelection: NonNullable<NodeTreeProps["onSelectionChange"]> = (next, event) => {
    if (props.selection === undefined) setOwnedSelection(next)
    props.onSelectionChange?.(next, event)
  }
  const publishCollapse: NonNullable<NodeTreeProps["onNodeCollapseChange"]> = (nodeId, value, event) => {
    if (props.collapsedNodeIds === undefined) setOwnedCollapsed(updateSet(collapsed, nodeId, value))
    props.onNodeCollapseChange?.(nodeId, value, event)
  }
  const publishPreview: NonNullable<NodeTreeProps["onNodePreviewChange"]> = (nodeId, value, event) => {
    if (props.previewNodeIds === undefined) setOwnedPreview(updateSet(previews, nodeId, value))
    props.onNodePreviewChange?.(nodeId, value, event)
  }
  const fit = (event: Event) => publishTransform(
    fitNodeTreeTransform(geometry(props.store, props.layout).bounds, width, contentHeight, padding, minScale, maxScale),
    event,
  )
  const onWheel = (event: WheelEvent) => {
    if (!interactive) return
    event.preventDefault()
    const unit = event.deltaMode === 1 ? 16
      : event.deltaMode === 2 ? 800
        : 1
    const dx = event.deltaX * unit
    const dy = event.deltaY * unit
    if (event.ctrlKey || event.metaKey) {
      const scale = clamp(transform.scale * Math.exp(-dy * .0025), minScale, maxScale)
      const anchorX = event.clientX
      const anchorY = event.clientY
      const ratio = scale / transform.scale
      publishTransform(Object.freeze({
        x: anchorX - (anchorX - transform.x) * ratio,
        y: anchorY - (anchorY - transform.y) * ratio,
        scale,
      }), event)
      return
    }
    publishTransform(Object.freeze({x: transform.x - dx, y: transform.y - dy, scale: transform.scale}), event)
  }
  const onPointerDown = (event: PointerEvent) => {
    if (!interactive || !(event.target instanceof DomElement)) return
    if (event.target.closest("[data-node-id]") || event.target.closest("[data-link-id]") ||
      event.target.closest("[data-frame-id]")) return
    pointers.current.set(event.pointerId, Object.freeze({x: event.clientX, y: event.clientY}))
  }
  const onPointerMove = (event: PointerEvent) => {
    if (!interactive) return
    const previous = pointers.current.get(event.pointerId)
    if (previous === undefined) return
    const before = [...pointers.current.values()]
    pointers.current.set(event.pointerId, Object.freeze({x: event.clientX, y: event.clientY}))
    const after = [...pointers.current.values()]
    if (after.length === 1) {
      publishTransform(Object.freeze({
        x: transform.x + event.clientX - previous.x,
        y: transform.y + event.clientY - previous.y,
        scale: transform.scale,
      }), event)
    } else if (before.length >= 2 && after.length >= 2) {
      const beforeDistance = distance(before[0]!, before[1]!)
      const afterDistance = distance(after[0]!, after[1]!)
      if (beforeDistance > 0 && afterDistance > 0) {
        const beforeCenter = midpoint(before[0]!, before[1]!)
        const afterCenter = midpoint(after[0]!, after[1]!)
        const scale = clamp(transform.scale * afterDistance / beforeDistance, minScale, maxScale)
        const ratio = scale / transform.scale
        publishTransform(Object.freeze({
          x: afterCenter.x - (beforeCenter.x - transform.x) * ratio,
          y: afterCenter.y - (beforeCenter.y - transform.y) * ratio,
          scale,
        }), event)
      }
    }
    event.preventDefault()
  }
  const onPointerUp = (event: PointerEvent) => {
    pointers.current.delete(event.pointerId)
  }
  const clearSelection = (event: Event) => {
    if (!interactive || event.defaultPrevented) return
    publishSelection(null, event)
  }

  return <section
    aria-label={props.label ?? "Node editor"}
    data-node-editor=""
    data-selection-kind={selection?.kind}
    data-selection-id={selection?.id}
    style={css`
      box-sizing: border-box;
      position: relative;
      display: flex;
      flex-direction: column;
      width: ${width}px;
      height: ${height}px;
      min-width: 0;
      min-height: 0;
      overflow: hidden;
      border: 1px solid #111111;
      border-radius: 6px;
      background: #1d1d1d;
      color: #d8d8d8;

      ${props.style}
    `}
  >
    <header
      style={css`
        box-sizing: border-box;
        display: flex;
        align-items: center;
        width: 100%;
        height: 30px;
        min-height: 30px;
        gap: 6px;
        padding: 4px 8px;
        border-bottom: 1px solid #111111;
        background: #242424;
        color: #7edcec;
        font-size: 11px;
      `}
    >
      <strong
        style={css`
          display: block;
          min-width: 0;
          flex-grow: 1;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        `}
      >
        {props.title ?? "Редактор нод"}
      </strong>
      <span
        aria-live="polite"
        style={css`
          color: #9c9c9c;
          font-size: 9px;
        `}
      >
        {Math.round(transform.scale * 100)}%
      </span>
      <button
        type="button"
        data-action="fit-node-tree"
        disabled={!interactive}
        onClick={fit}
        style={css`
          box-sizing: border-box;
          height: 20px;
          padding: 1px 6px;
          border: 1px solid #4a4a4a;
          border-radius: 3px;
          background: #303030;
          color: #d8d8d8;
          font-size: 9px;
        `}
      >
        Вписать
      </button>
    </header>
    <div
      role="application"
      aria-label={props.label ?? "Node editor viewport"}
      data-node-editor-viewport=""
      onClick={clearSelection}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={css`
        box-sizing: border-box;
        position: relative;
        display: block;
        width: 100%;
        min-height: 0;
        flex-grow: 1;
        overflow: hidden;
        background: #1d1d1d;
        touch-action: none;
      `}
    >
      <div
        aria-hidden="true"
        data-node-editor-grid=""
        style={css`
          box-sizing: border-box;
          position: absolute;
          display: block;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          transform: translate(${transform.x}px, ${transform.y}px) scale(${transform.scale});
          transform-origin: 0 0;
        `}
      >
        {gridPoints.map(point => <GridPoint
          key={point.id}
          point={point}
        />)}
      </div>
      <NodeTree
        store={props.store}
        layout={props.layout}
        label={props.label}
        viewport={viewport}
        transform={transform}
        selection={selection}
        collapsedNodeIds={collapsed}
        previewNodeIds={previews}
        onSelectionChange={publishSelection}
        onNodeCollapseChange={publishCollapse}
        onNodePreviewChange={publishPreview}
        onParameterInput={props.onParameterInput}
        onParameterChange={props.onParameterChange}
        onSocketActivate={props.onSocketActivate}
      />
    </div>
  </section>
}

type GridPointValue = Readonly<{id: string; x: number; y: number; major: boolean}>

function GridPoint(props: Readonly<{point: GridPointValue}>) {
  return <span
    data-major={props.point.major ? "true" : undefined}
    style={css`
      box-sizing: border-box;
      position: absolute;
      display: block;
      left: ${props.point.x}px;
      top: ${props.point.y}px;
      width: ${props.point.major ? "2px" : "1px"};
      height: ${props.point.major ? "2px" : "1px"};
      border-radius: 1px;
      background: ${props.point.major ? "#484848" : "#353535"};
    `}
  ></span>
}

export type NodeEditorComponent = FunctionComponent<NodeEditorProps>

function geometry(store: NodeTreeStore, layout?: LayoutResult) {
  const snapshot = store.getTopologySnapshot()
  return createNodeGeometryIndex(snapshot.nodes, snapshot.frames, snapshot.links, layout)
}

function initialCollapsed(store: NodeTreeStore): ReadonlySet<string> {
  return Object.freeze(new Set(store.getTopologySnapshot().nodes
    .filter(node => metadataBoolean(node.metadata, "collapsed", false))
    .map(node => node.id)))
}

function initialPreviews(store: NodeTreeStore): ReadonlySet<string> {
  return Object.freeze(new Set(store.getTopologySnapshot().nodes.flatMap(node => {
    const preview = node.metadata !== undefined && typeof node.metadata === "object" && !Array.isArray(node.metadata)
      ? (node.metadata as Readonly<Record<string, unknown>>).preview
      : undefined
    return preview !== null && typeof preview === "object" &&
      (preview as Readonly<Record<string, unknown>>).enabled === true ? [node.id] : []
  })))
}

function updateSet(source: ReadonlySet<string>, id: string, present: boolean): ReadonlySet<string> {
  const next = new Set(source)
  if (present) next.add(id)
  else next.delete(id)
  return Object.freeze(next)
}

function createGridPoints(size: number, width: number, height: number): readonly GridPointValue[] {
  const points: GridPointValue[] = []
  const columns = Math.ceil(width / size) + 12
  const rows = Math.ceil(height / size) + 12
  for (let row = -6; row < rows; row += 1) for (let column = -6; column < columns; column += 1) {
    points.push(Object.freeze({
      id: `${column}:${row}`,
      x: column * size,
      y: row * size,
      major: column % 4 === 0 && row % 4 === 0,
    }))
  }
  return Object.freeze(points)
}

function distance(left: Point, right: Point): number {
  return Math.hypot(right.x - left.x, right.y - left.y)
}

function midpoint(left: Point, right: Point): Point {
  return Object.freeze({x: (left.x + right.x) / 2, y: (left.y + right.y) / 2})
}

function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new TypeError(`${label} must be finite`)
  return value
}

function positive(value: number, label: string): number {
  finite(value, label)
  if (value <= 0) throw new RangeError(`${label} must be positive`)
  return value
}

function nonNegative(value: number, label: string): number {
  finite(value, label)
  if (value < 0) throw new RangeError(`${label} must be non-negative`)
  return value
}
