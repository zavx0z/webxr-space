/**
Общее отображение и навигация по графу в существующем Document.

@packageDocumentation
*/
import {useMemo, useRef, useState} from "@zavx0z/component"
import {Element} from "@zavx0z/dom"
import {GraphControls} from "../shared/graph/controls/index.tsx"
import {GridPoint} from "../shared/graph/grid-point/index.tsx"
import {Frame} from "@webxr/nodes/frame"
import {Link, projectLinkRoute} from "@webxr/nodes/link"
import {MemoGraphNodeContent} from "../shared/graph/node/index.tsx"
import {clamp, finite, positive, fitGraph, intersects, IDENTITY_TRANSFORM} from "../shared/graph/navigation.ts"
import type {GraphSelection, GraphTransform, GraphViewProps} from "../shared/graph/contracts.ts"

export type {GraphScene, GraphNode, GraphNodeProps, GraphFrame, GraphLink, GraphRect, GraphSelection, GraphTransform, GraphViewport, GraphViewProps} from "../shared/graph/contracts.ts"

/**
Показывает принятую числовую сцену, не создавая модель или редактор.

@property scene - Согласованные ноды, рамки, маршруты и границы в CSS-координатах графа.
@property [pending] - Сохраняет прежние элементы скрытыми и блокирует устаревший ввод.
@property [navigation] - Прокрутка, pan/zoom или внешнее управление преобразованием.
@property [isCurrent] - Проверяет актуальность источника перед каждым действием.
@property [selection] - Управляемое выделение; без него просмотр хранит только собственный выбор.
*/
export function GraphView(props: GraphViewProps) {
  const navigation = props.navigation ?? "none"
  const width = positive(props.width ?? 760, "GraphView width")
  const height = positive(props.height ?? 480, "GraphView height")
  const controls = props.controls ?? navigation === "pan-zoom"
  const contentHeight = Math.max(1, height - (controls ? 30 : 0))
  const minScale = positive(props.minScale ?? .16, "GraphView minScale")
  const maxScale = positive(props.maxScale ?? 3, "GraphView maxScale")
  if (maxScale < minScale) throw new RangeError("GraphView maxScale must be at least minScale")
  const padding = finite(props.fitPadding ?? 24, "GraphView fitPadding")
  if (padding < 0) throw new RangeError("GraphView fitPadding must be non-negative")
  const scene = props.scene
  const grid = useMemo(() => {
    if (props.gridSize === undefined) return []
    const size = positive(props.gridSize, "GraphView gridSize")
    const points = []
    for (let row = -6; row < Math.ceil(contentHeight / size) + 6; row += 1) {
      for (let column = -6; column < Math.ceil(width / size) + 6; column += 1) {
        points.push({id: `${column}:${row}`, x: column * size, y: row * size, major: column % 4 === 0 && row % 4 === 0})
      }
    }
    return points
  }, [props.gridSize, width, contentHeight])
  const initial = scene === null || navigation !== "pan-zoom" ? IDENTITY_TRANSFORM
    : fitGraph(scene.bounds, width, contentHeight, padding, minScale, maxScale)
  const [ownedTransform, setOwnedTransform] = useState(initial)
  const [ownedSelection, setOwnedSelection] = useState<GraphSelection>(null)
  const transform = props.transform ?? ownedTransform
  const selection = props.selection === undefined ? ownedSelection : props.selection
  const pending = props.pending === true || scene === null
  const token = useMemo(() => ({}), [scene, pending, props.isCurrent, props.interactive])
  const active = useRef(token)
  active.current = token
  const current = () => active.current === token && !pending && props.interactive !== false && (props.isCurrent?.() ?? true)
  const pointers = useRef(new Map<number, Readonly<{x: number; y: number}>>())
  if (pending) pointers.current.clear()
  const viewport = props.viewport ?? (navigation === "pan-zoom" ? {
    x: -transform.x / transform.scale,
    y: -transform.y / transform.scale,
    width: width / transform.scale,
    height: contentHeight / transform.scale,
    overscan: (props.overscan ?? 160) / transform.scale,
  } : undefined)
  const nodes = scene?.nodes.filter(node => props.materializeCulled === true || intersects(viewport, node.rect)) ?? []
  const frames = scene?.frames.filter(frame => props.materializeCulled === true || intersects(viewport, frame.rect)) ?? []
  const links = scene?.links.filter(link => props.materializeCulled === true || intersects(viewport, projectLinkRoute(link.route).bounds)) ?? []
  const publishTransform = (next: GraphTransform, event: Event) => {
    if (!current()) return
    const value = Object.freeze({
      x: finite(next.x, "GraphView transform x"),
      y: finite(next.y, "GraphView transform y"),
      scale: clamp(positive(next.scale, "GraphView transform scale"), minScale, maxScale),
    })
    if (props.transform === undefined) setOwnedTransform(value)
    props.onTransformChange?.(value, event)
  }
  const select = (value: GraphSelection, event: Event) => {
    event.stopPropagation()
    if (!current()) return
    if (props.selection === undefined) setOwnedSelection(value)
    props.onSelectionChange?.(value, event)
  }
  const dispatch = useRef({scene, select, current})
  dispatch.current = {scene, select, current}
  const activations = useMemo(() => {
    const entries = [
      ...(scene?.nodes.map(entry => ({kind: "node" as const, id: entry.id})) ?? []),
      ...(scene?.frames.map(entry => ({kind: "frame" as const, id: entry.id})) ?? []),
      ...(scene?.links.map(entry => ({kind: "link" as const, id: entry.id})) ?? []),
    ]
    return new Map(entries.map(entry => [`${entry.kind}/${entry.id}`, (event: Event) => {
      if (dispatch.current.scene === scene && dispatch.current.current()) dispatch.current.select(entry, event)
    }]))
  }, [scene])
  const fit = (event: Event) => {
    if (scene !== null) publishTransform(fitGraph(scene.bounds, width, contentHeight, padding, minScale, maxScale), event)
  }
  const wheel = (event: WheelEvent) => {
    if (navigation !== "pan-zoom" || !current()) return
    event.preventDefault()
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 800 : 1
    if (event.ctrlKey || event.metaKey) {
      const scale = clamp(transform.scale * Math.exp(-event.deltaY * unit * .0025), minScale, maxScale)
      const ratio = scale / transform.scale
      publishTransform({x: event.clientX - (event.clientX - transform.x) * ratio, y: event.clientY - (event.clientY - transform.y) * ratio, scale}, event)
    } else {
      publishTransform({x: transform.x - event.deltaX * unit, y: transform.y - event.deltaY * unit, scale: transform.scale}, event)
    }
  }
  const pointerDown = (event: PointerEvent) => {
    if (navigation !== "pan-zoom" || !current() || !(event.target instanceof Element)) return
    if (event.target.closest("[data-node-id], [data-link-id], [data-frame-id]")) return
    pointers.current.set(event.pointerId, {x: event.clientX, y: event.clientY})
  }
  const pointerMove = (event: PointerEvent) => {
    if (!current()) return
    const previous = pointers.current.get(event.pointerId)
    if (previous === undefined) return
    const before = [...pointers.current.values()]
    pointers.current.set(event.pointerId, {x: event.clientX, y: event.clientY})
    const after = [...pointers.current.values()]
    if (after.length === 1) {
      publishTransform({x: transform.x + event.clientX - previous.x, y: transform.y + event.clientY - previous.y, scale: transform.scale}, event)
    } else if (before.length >= 2 && after.length >= 2) {
      const distance = (points: typeof before) => Math.hypot(points[0]!.x - points[1]!.x, points[0]!.y - points[1]!.y)
      const oldDistance = distance(before)
      const newDistance = distance(after)
      if (oldDistance > 0 && newDistance > 0) {
        const scale = clamp(transform.scale * newDistance / oldDistance, minScale, maxScale)
        const ratio = scale / transform.scale
        publishTransform({
          x: (after[0]!.x + after[1]!.x) / 2 - ((before[0]!.x + before[1]!.x) / 2 - transform.x) * ratio,
          y: (after[0]!.y + after[1]!.y) / 2 - ((before[0]!.y + before[1]!.y) / 2 - transform.y) * ratio,
          scale,
        }, event)
      }
    }
    event.preventDefault()
  }
  const pointerUp = (event: PointerEvent) => { pointers.current.delete(event.pointerId) }
  return <section
    aria-label={props.label ?? "Просмотр графа"}
    data-graph-view=""
    data-layout-pending={pending ? "true" : undefined}
    aria-busy={String(pending)}
    data-node-count={nodes.length}
    data-frame-count={frames.length}
    data-link-count={links.length}
    data-selection-kind={selection?.kind}
    data-selection-id={selection?.id}
    style={css`
      box-sizing: border-box;
      position: relative;
      display: flex;
      flex-direction: column;
      width: ${props.width === undefined && navigation !== "pan-zoom" ? "100%" : `${width}px`};
      height: ${navigation === "scroll" ? "auto" : props.height === undefined && navigation === "none" ? "100%" : `${height}px`};
      min-width: 0;
      min-height: 0;
      overflow: hidden;

      ${props.style}
    `}
  >
    {controls ? <GraphControls
      title={props.title}
      scale={transform.scale}
      disabled={!current()}
      onFit={fit}
    /> : null}
    <p
      role="status"
      hidden={!pending}
      style={css`
        &[hidden] {
          display: none;
        }
      `}
    >Ожидание раскладки</p>
    <div
      data-graph-viewport=""
      onClick={event => { if (!event.defaultPrevented) select(null, event) }}
      onWheel={wheel}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      onPointerCancel={pointerUp}
      style={css`
        position: relative;
        box-sizing: border-box;
        width: 100%;
        min-width: 0;
        min-height: 0;
        flex-grow: 1;
        overflow: ${navigation === "scroll" ? "auto" : "hidden"};
        touch-action: ${navigation === "pan-zoom" ? "none" : "auto"};
      `}
    >
      <div
        data-graph-scene=""
        hidden={pending}
        style={css`
          position: relative;
          box-sizing: border-box;
          width: ${navigation === "scroll" ? `${Math.max(1, (scene?.bounds.x ?? 0) + (scene?.bounds.width ?? 0))}px` : "100%"};
          height: ${navigation === "scroll" ? `${Math.max(1, (scene?.bounds.y ?? 0) + (scene?.bounds.height ?? 0))}px` : "100%"};
          transform: translate(${transform.x}px, ${transform.y}px) scale(${transform.scale});
          transform-origin: 0 0;

          &[hidden] {
            visibility: hidden;
            pointer-events: none;
          }
        `}
      >
        {grid.map(point => <GridPoint
          key={point.id}
          point={point}
        />)}
        {frames.map(frame => <Frame
          key={frame.id}
          id={frame.id}
          label={frame.label}
          title={frame.title}
          color={frame.color}
          parentFrameId={frame.parentFrameId}
          rect={frame.rect}
          hidden={frame.hidden === true || !intersects(viewport, frame.rect)}
          selected={selection?.kind === "frame" && selection.id === frame.id}
          onActivate={activations.get(`frame/${frame.id}`)}
        />)}
        {links.map(link => <Link
          key={link.id}
          id={link.id}
          title={link.title}
          from={link.from}
          to={link.to}
          kind={link.kind}
          route={link.route}
          startArrow={link.startArrow}
          endArrow={link.endArrow}
          disabled={link.disabled}
          hidden={link.hidden === true || !intersects(viewport, projectLinkRoute(link.route).bounds)}
          selected={selection?.kind === "link" && selection.id === link.id}
          onActivate={activations.get(`link/${link.id}`)}
        />)}
        {nodes.map(node => <MemoGraphNodeContent
          key={node.id}
          node={node}
          selected={selection?.kind === "node" && selection.id === node.id}
          hidden={node.hidden === true || !intersects(viewport, node.rect)}
          onActivate={activations.get(`node/${node.id}`)!}
        />)}
      </div>
    </div>
  </section>
}
