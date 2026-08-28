import {
  Element,
  PointerEvent,
  WheelEvent,
  type Document,
  type Event,
  type HTMLDivElement,
  type HTMLElement,
} from "@zavx0z/dom"
import {
  createGraphCanvas,
  graphCanvasCss,
  type GraphCanvasController,
  type GraphCanvasProps,
  type GraphCanvasScene,
} from "./graph-canvas.ts"

export type NodeEditorSelection =
  | Readonly<{kind: "frame" | "link" | "node"; id: string}>
  | null

export type NodeEditorProps = GraphCanvasProps & Readonly<{
  interactive?: boolean
  minScale?: number
  maxScale?: number
  fitPadding?: number
  gridSize?: number
  onSelectionChange?(selection: NodeEditorSelection): void
  onSceneChange?(scene: GraphCanvasScene): void
}>

export type NodeEditorDiagnostics = Readonly<{
  sceneUpdates: number
  selectionUpdates: number
  culledFrames: number
  culledLinks: number
  culledNodes: number
}>

export type NodeEditorController = Readonly<{
  element: HTMLElement
  graph: GraphCanvasController
  refs: Readonly<{
    root: HTMLElement
    viewport: HTMLDivElement
    grid: HTMLDivElement
    scene: HTMLDivElement
  }>
  props: NodeEditorProps
  selection: NodeEditorSelection
  diagnostics: NodeEditorDiagnostics
  update(props: NodeEditorProps): void
  select(selection: NodeEditorSelection): boolean
  setScene(scene: GraphCanvasScene): boolean
  fitToView(): boolean
  dispose(): void
}>

type Point = Readonly<{x: number; y: number}>

export const nodeEditorCss = [graphCanvasCss, String.raw`
.node-editor { position: relative; }
.node-editor__grid {
  box-sizing: border-box;
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.node-editor__grid-point {
  box-sizing: border-box;
  position: absolute;
  display: block;
  width: 2px;
  height: 2px;
  border-radius: 1px;
  background: #353535;
}
.node-editor__grid-point[data-major="true"] { background: #484848; }
.node-editor [data-culled="true"] { display: none; }
`] .join("\n")

export function createNodeEditor(document: Document, initial: NodeEditorProps): NodeEditorController {
  let current = normalizeNodeEditorProps(initial)
  const graph = createGraphCanvas(document, graphProps(current))
  const grid = createGrid(document, current.gridSize ?? 24)
  const pointers = new Map<number, Point>()
  let selection = selectionFrom(current)
  let disposed = false
  const diagnostics = {
    sceneUpdates: 0,
    selectionUpdates: 0,
    culledFrames: 0,
    culledLinks: 0,
    culledNodes: 0,
  }

  graph.element.className = "graph-canvas node-editor"
  graph.refs.viewport.insertBefore(grid, graph.refs.scene)
  syncGridTransform(grid, graph.props.scene)

  const publishGraph = (nextGraph: GraphCanvasProps): void => {
    graph.update(nextGraph)
    current = Object.freeze({...current, ...graph.props})
    syncGridTransform(grid, graph.props.scene)
    applyCulling(graph, diagnostics)
  }

  const setScene = (scene: GraphCanvasScene): boolean => {
    if (disposed) throw new Error("NodeEditor controller is disposed")
    const next = normalizeScene(scene, current.minScale ?? 0.16, current.maxScale ?? 3)
    if (sameScene(next, graph.props.scene)) return false
    diagnostics.sceneUpdates += 1
    publishGraph({...graph.props, scene: next})
    current.onSceneChange?.(next)
    return true
  }

  const select = (nextSelection: NodeEditorSelection): boolean => {
    if (disposed) throw new Error("NodeEditor controller is disposed")
    if (nextSelection && !selectionExists(graph.props, nextSelection)) return false
    if (sameSelection(selection, nextSelection)) return true
    selection = nextSelection === null ? null : Object.freeze({...nextSelection})
    diagnostics.selectionUpdates += 1
    publishGraph({
      ...graph.props,
      frames: graph.props.frames.map((frame) => ({...frame, selected: selection?.kind === "frame" && selection.id === frame.id})),
      links: graph.props.links.map((link) => ({...link, selected: selection?.kind === "link" && selection.id === link.id})),
      nodes: graph.props.nodes.map((node) => ({...node, selected: selection?.kind === "node" && selection.id === node.id})),
    })
    current.onSelectionChange?.(selection)
    return true
  }

  const fitToView = (): boolean => {
    const bounds = graphBounds(graph.props)
    if (!bounds) return false
    const padding = Math.max(0, current.fitPadding ?? 24)
    const viewportWidth = graph.props.width
    const viewportHeight = Math.max(1, graph.props.height - 30)
    const scale = clamp(
      Math.min(
        Math.max(1, viewportWidth - padding * 2) / Math.max(1, bounds.width),
        Math.max(1, viewportHeight - padding * 2) / Math.max(1, bounds.height),
      ),
      current.minScale ?? 0.16,
      current.maxScale ?? 3,
    )
    return setScene({
      translateX: (viewportWidth - bounds.width * scale) / 2 - bounds.x * scale,
      translateY: (viewportHeight - bounds.height * scale) / 2 - bounds.y * scale,
      scale,
    })
  }

  const onClick = (event: Event): void => {
    if (current.interactive === false || event.defaultPrevented || !(event.target instanceof Element)) return
    const target = event.target
    if (target.closest('[data-action="collapse-node"]') || target.closest('[data-action="toggle-preview"]')) return
    const nodeId = target.closest(".node-article")?.getAttribute("data-node-id")
    const linkId = target.closest(".node-link")?.getAttribute("data-link-id")
    const frameId = target.closest(".graph-canvas__frame")?.getAttribute("data-frame-id")
    if (nodeId) select({kind: "node", id: nodeId})
    else if (linkId) select({kind: "link", id: linkId})
    else if (frameId) select({kind: "frame", id: frameId})
    else if (target === graph.refs.viewport || target === graph.refs.scene || target === grid) select(null)
  }

  const onWheel = (event: Event): void => {
    if (current.interactive === false || !(event instanceof WheelEvent)) return
    event.preventDefault()
    const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16
      : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? 800
        : 1
    const dx = finite(event.deltaX * unit)
    const dy = finite(event.deltaY * unit)
    const scene = graph.props.scene
    if (event.ctrlKey || event.metaKey) {
      const scale = clamp(scene.scale * Math.exp(-dy * .0025), current.minScale ?? .16, current.maxScale ?? 3)
      const anchorX = event.clientX
      const anchorY = event.clientY - 30
      const ratio = scale / scene.scale
      setScene({
        translateX: anchorX - (anchorX - scene.translateX) * ratio,
        translateY: anchorY - (anchorY - scene.translateY) * ratio,
        scale,
      })
    } else setScene({translateX: scene.translateX - dx, translateY: scene.translateY - dy, scale: scene.scale})
  }

  const onPointerDown = (event: Event): void => {
    if (current.interactive === false || !(event instanceof PointerEvent) || !(event.target instanceof Element)) return
    if (event.target.closest(".node-article") || event.target.closest(".node-link") || event.target.closest(".graph-canvas__frame")) return
    pointers.set(event.pointerId, {x: event.clientX, y: event.clientY})
  }

  const onPointerMove = (event: Event): void => {
    if (current.interactive === false || !(event instanceof PointerEvent)) return
    const previous = pointers.get(event.pointerId)
    if (!previous) return
    const before = [...pointers.values()]
    pointers.set(event.pointerId, {x: event.clientX, y: event.clientY})
    const after = [...pointers.values()]
    const scene = graph.props.scene
    if (after.length === 1) {
      setScene({
        translateX: scene.translateX + event.clientX - previous.x,
        translateY: scene.translateY + event.clientY - previous.y,
        scale: scene.scale,
      })
    } else if (before.length >= 2 && after.length >= 2) {
      const beforeDistance = distance(before[0]!, before[1]!)
      const afterDistance = distance(after[0]!, after[1]!)
      if (beforeDistance > 0 && afterDistance > 0) {
        const beforeCenter = midpoint(before[0]!, before[1]!)
        const afterCenter = midpoint(after[0]!, after[1]!)
        const scale = clamp(scene.scale * afterDistance / beforeDistance, current.minScale ?? .16, current.maxScale ?? 3)
        const ratio = scale / scene.scale
        setScene({
          translateX: afterCenter.x - (beforeCenter.x - scene.translateX) * ratio,
          translateY: afterCenter.y - (beforeCenter.y - scene.translateY) * ratio,
          scale,
        })
      }
    }
    event.preventDefault()
  }

  const onPointerUp = (event: Event): void => {
    if (event instanceof PointerEvent) pointers.delete(event.pointerId)
  }

  graph.element.addEventListener("click", onClick)
  graph.refs.viewport.addEventListener("wheel", onWheel, {passive: false})
  graph.refs.viewport.addEventListener("pointerdown", onPointerDown)
  graph.refs.viewport.addEventListener("pointermove", onPointerMove)
  graph.refs.viewport.addEventListener("pointerup", onPointerUp)
  graph.refs.viewport.addEventListener("pointercancel", onPointerUp)
  applyCulling(graph, diagnostics)

  const refs = Object.freeze({root: graph.element, viewport: graph.refs.viewport, grid, scene: graph.refs.scene})
  const controller: NodeEditorController = Object.freeze({
    element: graph.element,
    graph,
    refs,
    get props() { return current },
    get selection() { return selection },
    get diagnostics() { return Object.freeze({...diagnostics}) },
    update(props) {
      if (disposed) throw new Error("NodeEditor controller is disposed")
      const next = normalizeNodeEditorProps(props)
      current = next
      publishGraph(graphProps(next))
      selection = selectionFrom(graph.props)
    },
    select,
    setScene,
    fitToView,
    dispose() {
      if (disposed) return
      disposed = true
      graph.element.removeEventListener("click", onClick)
      graph.refs.viewport.removeEventListener("wheel", onWheel)
      graph.refs.viewport.removeEventListener("pointerdown", onPointerDown)
      graph.refs.viewport.removeEventListener("pointermove", onPointerMove)
      graph.refs.viewport.removeEventListener("pointerup", onPointerUp)
      graph.refs.viewport.removeEventListener("pointercancel", onPointerUp)
      pointers.clear()
      graph.dispose()
    },
  })
  return controller
}

function createGrid(document: Document, size: number): HTMLDivElement {
  const grid = document.createElement("div")
  grid.className = "node-editor__grid"
  grid.setAttribute("aria-hidden", "true")
  const step = Math.max(8, size)
  let index = 0
  for (let y = -step * 4; y <= step * 18; y += step) {
    for (let x = -step * 4; x <= step * 24; x += step) {
      const point = document.createElement("span")
      point.className = "node-editor__grid-point"
      point.setAttribute("data-grid-index", String(index++))
      point.setAttribute("data-major", String((x / step) % 4 === 0 && (y / step) % 4 === 0))
      point.setAttribute("style", `left: ${x}px; top: ${y}px`)
      grid.appendChild(point)
    }
  }
  return grid
}

function applyCulling(graph: GraphCanvasController, diagnostics: {
  culledFrames: number
  culledLinks: number
  culledNodes: number
}): void {
  const {scale, translateX, translateY} = graph.props.scene
  const viewport = {x: 0, y: 0, width: graph.props.width, height: Math.max(1, graph.props.height - 30)}
  let culledFrames = 0
  let culledLinks = 0
  let culledNodes = 0
  for (const frame of graph.props.frames) {
    const visible = intersects(viewport, projectRect(frame, scale, translateX, translateY))
    syncAttribute(graph.frameRefs(frame.id)!.element, "data-culled", String(!visible))
    if (!visible) culledFrames += 1
  }
  for (const node of graph.props.nodes) {
    const visible = intersects(viewport, projectRect(node, scale, translateX, translateY))
    syncAttribute(graph.nodeRefs(node.id)!.element, "data-culled", String(!visible))
    if (!visible) culledNodes += 1
  }
  for (const link of graph.props.links) {
    const visible = link.segments.some((segment) => intersects(viewport, projectSegment(segment, scale, translateX, translateY)))
    syncAttribute(graph.linkRefs(link.id)!.element, "data-culled", String(!visible))
    if (!visible) culledLinks += 1
  }
  diagnostics.culledFrames = culledFrames
  diagnostics.culledLinks = culledLinks
  diagnostics.culledNodes = culledNodes
}

function graphBounds(props: GraphCanvasProps): Readonly<{x: number; y: number; width: number; height: number}> | null {
  const rects = [
    ...props.frames.map(({x, y, width, height}) => ({x, y, width, height})),
    ...props.nodes.map(({x, y, width, height}) => ({x, y, width, height})),
    ...props.links.flatMap(({segments}) => segments.map((segment) => ({
      x: Math.min(segment.x1, segment.x2),
      y: Math.min(segment.y1, segment.y2),
      width: Math.max(1, Math.abs(segment.x2 - segment.x1)),
      height: Math.max(1, Math.abs(segment.y2 - segment.y1)),
    }))),
  ]
  if (rects.length === 0) return null
  const x = Math.min(...rects.map((rect) => rect.x))
  const y = Math.min(...rects.map((rect) => rect.y))
  const right = Math.max(...rects.map((rect) => rect.x + rect.width))
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height))
  return Object.freeze({x, y, width: right - x, height: bottom - y})
}

function graphProps(props: NodeEditorProps): GraphCanvasProps {
  return Object.freeze({
    title: props.title,
    width: props.width,
    height: props.height,
    scene: props.scene,
    frames: props.frames,
    links: props.links,
    nodes: props.nodes,
  })
}

function normalizeNodeEditorProps(props: NodeEditorProps): NodeEditorProps {
  if (!props || typeof props !== "object") throw new TypeError("NodeEditor props must be an object")
  const minScale = positive(props.minScale ?? .16, "NodeEditor minScale")
  const maxScale = positive(props.maxScale ?? 3, "NodeEditor maxScale")
  if (maxScale < minScale) throw new RangeError("NodeEditor maxScale must be at least minScale")
  const fitPadding = finite(props.fitPadding ?? 24)
  const gridSize = positive(props.gridSize ?? 24, "NodeEditor gridSize")
  return Object.freeze({...props, minScale, maxScale, fitPadding, gridSize})
}

function normalizeScene(scene: GraphCanvasScene, minScale: number, maxScale: number): GraphCanvasScene {
  if (!scene || typeof scene !== "object") throw new TypeError("NodeEditor scene must be an object")
  return Object.freeze({
    translateX: finite(scene.translateX),
    translateY: finite(scene.translateY),
    scale: clamp(positive(scene.scale, "NodeEditor scene scale"), minScale, maxScale),
  })
}

function selectionFrom(props: GraphCanvasProps): NodeEditorSelection {
  const frame = props.frames.find(({selected}) => selected)
  const link = props.links.find(({selected}) => selected)
  const node = props.nodes.find(({selected}) => selected)
  if (node) return Object.freeze({kind: "node", id: node.id})
  if (link) return Object.freeze({kind: "link", id: link.id})
  if (frame) return Object.freeze({kind: "frame", id: frame.id})
  return null
}

function selectionExists(props: GraphCanvasProps, selection: NonNullable<NodeEditorSelection>): boolean {
  const collection = selection.kind === "frame" ? props.frames : selection.kind === "link" ? props.links : props.nodes
  return collection.some(({id}) => id === selection.id)
}

function sameSelection(left: NodeEditorSelection, right: NodeEditorSelection): boolean {
  return left === right || (left !== null && right !== null && left.kind === right.kind && left.id === right.id)
}

function sameScene(left: GraphCanvasScene, right: GraphCanvasScene): boolean {
  return left.translateX === right.translateX && left.translateY === right.translateY && left.scale === right.scale
}

function syncGridTransform(grid: HTMLDivElement, scene: GraphCanvasScene): void {
  grid.setAttribute("style", `transform: translate(${scene.translateX}px, ${scene.translateY}px) scale(${scene.scale}); transform-origin: 0 0`)
}

function projectRect(
  rect: Readonly<{x: number; y: number; width: number; height: number}>,
  scale: number,
  translateX: number,
  translateY: number,
) {
  return {
    x: rect.x * scale + translateX,
    y: rect.y * scale + translateY,
    width: rect.width * scale,
    height: rect.height * scale,
  }
}

function projectSegment(
  segment: Readonly<{x1: number; y1: number; x2: number; y2: number}>,
  scale: number,
  translateX: number,
  translateY: number,
) {
  const x = Math.min(segment.x1, segment.x2) * scale + translateX
  const y = Math.min(segment.y1, segment.y2) * scale + translateY
  return {
    x,
    y,
    width: Math.max(16, Math.abs(segment.x2 - segment.x1) * scale),
    height: Math.max(16, Math.abs(segment.y2 - segment.y1) * scale),
  }
}

function intersects(
  left: Readonly<{x: number; y: number; width: number; height: number}>,
  right: Readonly<{x: number; y: number; width: number; height: number}>,
): boolean {
  return left.x < right.x + right.width && left.x + left.width > right.x &&
    left.y < right.y + right.height && left.y + left.height > right.y
}

function distance(left: Point, right: Point): number {
  return Math.hypot(right.x - left.x, right.y - left.y)
}

function midpoint(left: Point, right: Point): Point {
  return {x: (left.x + right.x) / 2, y: (left.y + right.y) / 2}
}

function finite(value: number): number {
  if (!Number.isFinite(value)) throw new TypeError("NodeEditor geometry must be finite")
  return value
}

function positive(value: number, label: string): number {
  finite(value)
  if (value <= 0) throw new RangeError(`${label} must be greater than zero`)
  return value
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function syncAttribute(element: Element, name: string, value: string): void {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value)
}
