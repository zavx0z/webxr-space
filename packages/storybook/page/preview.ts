import {Color, Object3D} from "@engine/core"
import {Pane} from "@ui/components/pane"
import {Typography} from "@ui/components/typography"
import {div} from "@ui/elements/div"
import {
  activeUiTheme,
  rgba8ToColor,
  resolveOpaqueRgba8,
} from "@ui/elements/theme"
import {UiSurface, Z} from "@layout/core/surface"
import type {LayoutPoint} from "@nodes/layout/types"
import type {CoffmanGrahamLayoutResult} from "@nodes/layout/coffman-graham"
import type {UiComponentGraphNode} from "../../../scripts/ui-component-graph.ts"
import {
  createUiComponentGraphLayout,
  type UiComponentGraphLayout,
} from "./ui-component-graph-model.ts"
import type {UiGraphStoryPreview} from "./stories.ts"

type Rect = Readonly<{x: number; y: number; w: number; h: number}>
export type UiComponentGraphFit = Readonly<{x: number; y: number; scale: number}>
export type UiComponentGraphPreviewDiagnostics = Readonly<{
  livePreviews: number
  missingPreviews: number
  failedPreviews: number
  renderErrors: Readonly<Record<string, string>>
}>

const HEADER_HEIGHT = 38
const GRAPH_PADDING = 28
const NODE_HEADER_HEIGHT = 42
const NODE_INSET = 7
const NODE_RADIUS = 5
const EDGE_COLOR = new Color(0.68, 0.72, 0.75, 0.86)
const ELEMENT_HEADER = new Color(0.18, 0.39, 0.46, 0.94)
const COMPONENT_HEADER = new Color(0.34, 0.25, 0.48, 0.94)
export const UI_COMPONENT_GRAPH_BACKGROUND = rgba8ToColor(resolveOpaqueRgba8(
  activeUiTheme.spaceNode.back,
  activeUiTheme.spaceNode.navigationBar,
))

export class UiComponentGraphSurface extends UiSurface {
  readonly #layout: UiComponentGraphLayout
  readonly #previews: ReadonlyMap<string, UiGraphStoryPreview>
  readonly #contentRoot: Object3D
  #materialized = false
  #materializedFont: unknown = null
  #materializedPixelScale = Number.NaN
  #fitScale = 1
  readonly #renderErrors = new Map<string, string>()

  constructor(
    graph: UiComponentGraphLayout["graph"],
    previews: ReadonlyMap<string, UiGraphStoryPreview>,
  ) {
    super({bgColor: UI_COMPONENT_GRAPH_BACKGROUND, borderColor: null})
    this.#layout = createUiComponentGraphLayout(graph)
    this.#previews = previews
    this.node.name = "UiComponentGraphSurface"
    this.#contentRoot = this.createRetainedParent()
    this.#contentRoot.name = "UiComponentGraphSurface.contentRoot"
  }

  get diagnostics(): Readonly<{
    nodes: number
    edges: number
    visibleEdges: number
    livePreviews: number
    missingPreviews: number
    failedPreviews: number
    renderErrors: Readonly<Record<string, string>>
    fitScale: number
    bounds: CoffmanGrahamLayoutResult["bounds"]
  }> {
    const previewDiagnostics = summarizeUiComponentGraphPreviews(this.#previews, this.#renderErrors)
    return Object.freeze({
      nodes: this.#layout.graph.nodes.length,
      edges: this.#layout.graph.edges.length,
      visibleEdges: this.#layout.graph.edges.length,
      ...previewDiagnostics,
      fitScale: this.#fitScale,
      bounds: this.#layout.result.bounds,
    })
  }

  protected override render(): void {
    this.withLayer("underlay", () => {
      this.drawRect(0, 0, this.rectW, this.rectH, UI_COMPONENT_GRAPH_BACKGROUND, Z.CONTAINER)
    })
    const viewport: Rect = {
      x: 0,
      y: HEADER_HEIGHT,
      w: this.rectW,
      h: Math.max(1, this.rectH - HEADER_HEIGHT),
    }
    if (!this.#materialized || this.#materializedFont !== this.font ||
      this.#materializedPixelScale !== this.pixelScale) {
      this.materializeRetainedParent(this.#contentRoot, () => this.#drawGraph())
      this.#materialized = true
      this.#materializedFont = this.font
      this.#materializedPixelScale = this.pixelScale
    }
    this.#fitGraph(viewport)
    this.updateRetainedViewportClip(this.#contentRoot, viewport)
    this.withLayer("overlay", () => {
      div(this, 0, 0, this.rectW, HEADER_HEIGHT, {
        style: {background: UI_COMPONENT_GRAPH_BACKGROUND, borderColor: "border", borderWidth: 1, borderRadius: 0},
      })
      Typography(this, 12, 0, Math.max(1, this.rectW - 24), HEADER_HEIGHT, {
        children: `UI COMPONENT GRAPH · ${this.#layout.graph.nodes.length} нод · ${this.diagnostics.visibleEdges}/${this.#layout.graph.edges.length} связей · ${this.#layout.result.crossings.length} BRIDGES · COFFMAN–GRAHAM LAYERED · fit ${(this.#fitScale * 100).toFixed(0)}%`,
        variant: "caption",
        color: "muted",
      })
    })
  }

  #fitGraph(viewport: Rect): void {
    const {bounds} = this.#layout.result
    const {x, y, scale} = fitUiComponentGraphBounds(bounds, viewport)
    this.#fitScale = scale
    this.updateRetainedTransform(this.#contentRoot, (parent) => {
      parent.position.set(x * this.pixelScale, -y * this.pixelScale, 0)
      parent.scale.set(scale, scale, 1)
      parent.updateMatrix()
    })
  }

  #drawGraph(): void {
    const edges = [...this.#layout.result.edges].sort((left, right) => left.id.localeCompare(right.id))
    const crossingGaps = Map.groupBy(this.#layout.result.crossings, ({underEdgeId}) => underEdgeId)
    for (const edge of edges) {
      const points = uiComponentEdgePoints(edge.curves)
      const gaps = (crossingGaps.get(edge.id) ?? []).map(({point}) => point)
      for (const run of splitPolylineAtGaps(points, gaps, 18)) this.drawPolyline(run, EDGE_COLOR, 1.6)
      const tip = points.at(-1)!
      drawArrow(this, points, 7, EDGE_COLOR)
    }

    for (const resultNode of this.#layout.result.nodes) {
      const rect = {
        x: resultNode.x,
        y: resultNode.y,
        w: resultNode.width,
        h: resultNode.height,
      }
      const node = this.#layout.nodeById.get(resultNode.id)
      if (node === undefined) continue
      this.#drawNode(node, rect, this.#previews.get(node.id))
    }
  }

  #drawNode(node: UiComponentGraphNode, rect: Rect, preview: UiGraphStoryPreview | undefined): void {
    Pane(this, rect.x, rect.y, rect.w, rect.h, {
      appearance: "panel",
      variant: "filled",
      style: {padding: 0},
    })
    div(this, rect.x, rect.y, rect.w, NODE_HEADER_HEIGHT, {
      style: {
        background: node.layer === "element" ? ELEMENT_HEADER : COMPONENT_HEADER,
        borderColor: null,
        borderRadius: NODE_RADIUS,
        padding: 0,
      },
    })
    Typography(this, rect.x + 9, rect.y + 2, rect.w - 18, 20, {
      children: node.exportName,
      fontPx: 12,
      color: "text",
    })
    Typography(this, rect.x + 9, rect.y + 20, rect.w - 18, 18, {
      children: node.subpath,
      fontPx: 9,
      color: "muted",
    })
    const body = {
      x: rect.x + NODE_INSET,
      y: rect.y + NODE_HEADER_HEIGHT + NODE_INSET,
      w: rect.w - NODE_INSET * 2,
      h: rect.h - NODE_HEADER_HEIGHT - NODE_INSET * 2,
    }
    div(this, body.x, body.y, body.w, body.h, {
      style: {
        background: UI_COMPONENT_GRAPH_BACKGROUND,
        borderColor: "border",
        borderRadius: 3,
        borderWidth: 1,
      },
    })
    this.withChildClip({kind: "rounded-rect", ...body, radius: 3}, () => {
      if (preview?.module !== null && preview?.module !== undefined) {
        this.#renderErrors.delete(node.id)
        try {
          preview.module.render(this, preview.module.defaultArgs, body)
        } catch (error) {
          const message = errorText(error)
          this.#renderErrors.set(node.id, message)
          this.#drawStatus(body, `Ошибка render: ${message}`, "error")
        }
        return
      }
      if (preview?.error !== null && preview?.error !== undefined) {
        this.#drawStatus(body, preview.error, "error")
        return
      }
      this.#drawStatus(body, "Нет точного story preview", "muted")
    })
    if (preview?.match !== null && preview?.match !== undefined) {
      Typography(this, body.x + 5, body.y + body.h - 17, body.w - 10, 14, {
        children: preview.match.route,
        fontPx: 8,
        color: "muted",
        style: {textAlign: "right"},
      })
    }
  }

  #drawStatus(body: Rect, value: string, color: "muted" | "error"): void {
    Typography(this, body.x + 10, body.y + 10, body.w - 20, body.h - 20, {
      children: value,
      variant: "caption",
      color: color === "error" ? "red" : "muted",
      style: {textAlign: "center"},
    })
  }
}

export function summarizeUiComponentGraphPreviews(
  previews: ReadonlyMap<string, UiGraphStoryPreview>,
  renderErrors: ReadonlyMap<string, string>,
): UiComponentGraphPreviewDiagnostics {
  let livePreviews = 0
  let missingPreviews = 0
  let failedPreviews = 0
  for (const [id, preview] of previews) {
    if (preview.error !== null || renderErrors.has(id)) failedPreviews += 1
    else if (preview.module !== null) livePreviews += 1
    else missingPreviews += 1
  }
  return Object.freeze({
    livePreviews,
    missingPreviews,
    failedPreviews,
    renderErrors: Object.freeze(Object.fromEntries([...renderErrors].sort(([left], [right]) => left.localeCompare(right)))),
  })
}

export function fitUiComponentGraphBounds(
  bounds: CoffmanGrahamLayoutResult["bounds"],
  viewport: Rect,
  padding = GRAPH_PADDING,
): UiComponentGraphFit {
  const contentWidth = bounds.width + padding * 2
  const contentHeight = bounds.height + padding * 2
  const scale = Math.min(
    viewport.w / Math.max(1, contentWidth),
    viewport.h / Math.max(1, contentHeight),
    1,
  )
  return Object.freeze({
    x: viewport.x + (viewport.w - contentWidth * scale) / 2 + (padding - bounds.x) * scale,
    y: viewport.y + (viewport.h - contentHeight * scale) / 2 + (padding - bounds.y) * scale,
    scale,
  })
}

export function uiComponentEdgePoints(
  curves: CoffmanGrahamLayoutResult["edges"][number]["curves"],
): readonly LayoutPoint[] {
  return curves.flatMap((curve, curveIndex) => Array.from({length: 25}, (_, index) => {
    if (curveIndex > 0 && index === 0) return null
    const t = index / 24
    const u = 1 - t
    return {
      x: u ** 3 * curve.startPoint.x + 3 * u ** 2 * t * curve.controlPoints[0].x +
        3 * u * t ** 2 * curve.controlPoints[1].x + t ** 3 * curve.endPoint.x,
      y: u ** 3 * curve.startPoint.y + 3 * u ** 2 * t * curve.controlPoints[0].y +
        3 * u * t ** 2 * curve.controlPoints[1].y + t ** 3 * curve.endPoint.y,
    }
  }).filter((point): point is LayoutPoint => point !== null))
}

function drawArrow(surface: UiSurface, points: readonly LayoutPoint[], size: number, color: Color): void {
  const tip = points.at(-1)
  const previous = points.at(-2)
  if (tip === undefined || previous === undefined) return
  const dx = tip.x - previous.x
  const dy = tip.y - previous.y
  const length = Math.hypot(dx, dy)
  if (length === 0) return
  const ux = dx / length
  const uy = dy / length
  const px = -uy
  const py = ux
  const baseX = tip.x - ux * size
  const baseY = tip.y - uy * size
  surface.drawLine(tip.x, tip.y, baseX + px * size * 0.45, baseY + py * size * 0.45, color, 1.2)
  surface.drawLine(tip.x, tip.y, baseX - px * size * 0.45, baseY - py * size * 0.45, color, 1.2)
}

function splitPolylineAtGaps(
  points: readonly LayoutPoint[],
  gaps: readonly LayoutPoint[],
  radius: number,
): readonly (readonly LayoutPoint[])[] {
  if (points.length < 2 || gaps.length === 0) return [points]
  const cumulative = [0]
  for (let index = 1; index < points.length; index += 1) {
    cumulative.push(cumulative[index - 1]! + pointDistance(points[index - 1]!, points[index]!))
  }
  const total = cumulative.at(-1)!
  const intervals = gaps.map((gap) => {
    let nearestDistance = Number.POSITIVE_INFINITY
    let nearestOffset = 0
    for (let index = 1; index < points.length; index += 1) {
      const start = points[index - 1]!
      const end = points[index]!
      const dx = end.x - start.x
      const dy = end.y - start.y
      const lengthSquared = dx * dx + dy * dy
      const ratio = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1,
        ((gap.x - start.x) * dx + (gap.y - start.y) * dy) / lengthSquared))
      const projected = {x: start.x + dx * ratio, y: start.y + dy * ratio}
      const distance = pointDistance(gap, projected)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestOffset = cumulative[index - 1]! + Math.sqrt(lengthSquared) * ratio
      }
    }
    return {start: Math.max(0, nearestOffset - radius), end: Math.min(total, nearestOffset + radius)}
  }).sort((left, right) => left.start - right.start || left.end - right.end)
  const merged: Array<{start: number; end: number}> = []
  for (const interval of intervals) {
    const previous = merged.at(-1)
    if (previous !== undefined && interval.start <= previous.end) previous.end = Math.max(previous.end, interval.end)
    else merged.push({...interval})
  }
  const runs: LayoutPoint[][] = []
  let cursor = 0
  for (const interval of merged) {
    if (interval.start > cursor) runs.push(polylineRange(points, cumulative, cursor, interval.start))
    cursor = Math.max(cursor, interval.end)
  }
  if (cursor < total) runs.push(polylineRange(points, cumulative, cursor, total))
  return runs.filter((run) => run.length >= 2)
}

function polylineRange(
  points: readonly LayoutPoint[],
  cumulative: readonly number[],
  start: number,
  end: number,
): LayoutPoint[] {
  const result = [pointAtOffset(points, cumulative, start)]
  for (let index = 1; index < points.length - 1; index += 1) {
    if (cumulative[index]! > start && cumulative[index]! < end) result.push(points[index]!)
  }
  result.push(pointAtOffset(points, cumulative, end))
  return result
}

function pointAtOffset(
  points: readonly LayoutPoint[],
  cumulative: readonly number[],
  offset: number,
): LayoutPoint {
  let index = 1
  while (index < cumulative.length && cumulative[index]! < offset) index += 1
  if (index >= points.length) return points.at(-1)!
  const startOffset = cumulative[index - 1]!
  const endOffset = cumulative[index]!
  const ratio = endOffset === startOffset ? 0 : (offset - startOffset) / (endOffset - startOffset)
  const start = points[index - 1]!
  const end = points[index]!
  return {x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio}
}

function pointDistance(first: LayoutPoint, second: LayoutPoint): number {
  return Math.hypot(second.x - first.x, second.y - first.y)
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
