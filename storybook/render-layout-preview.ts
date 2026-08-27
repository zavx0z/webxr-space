import {Color} from "@engine/core"
import {Pane} from "@ui/components/pane"
import {Typography} from "@ui/components/typography"
import {div} from "@ui/elements/div"
import type {UiSurface} from "@layout/core/surface"
import type {CoffmanGrahamLayoutResult} from "@nodes/layout/coffman-graham"
import type {LayoutPoint} from "@nodes/layout/types"
import type {TopDownLayoutResult} from "@nodes/layout/top-down"
import type {LayoutResult} from "@nodes/layout/types"

type PreviewGraph = Readonly<{
  nodes: readonly Readonly<{id: string}>[]
  edges?: readonly Readonly<{id: string; sourcePortId: string; targetPortId: string}>[]
}>

type PreviewResult = LayoutResult | TopDownLayoutResult | CoffmanGrahamLayoutResult
type PreviewEdge = PreviewResult["edges"][number]

export type LayoutPreviewOptions = Readonly<{
  showRoutes: boolean
  showPorts: boolean
  labels?: Readonly<Record<string, string>>
  visibleEdgeIds?: ReadonlySet<string>
}>

const EDGE_COLOR = new Color(0.68, 0.72, 0.75, 0.9)

export function drawLayoutPreview(
  surface: UiSurface,
  graph: PreviewGraph,
  result: PreviewResult,
  frame: Readonly<{x: number; y: number; w: number; h: number}>,
  options: LayoutPreviewOptions,
): void {
  const headerHeight = 66
  const margin = 18
  const available = {
    x: frame.x + margin,
    y: frame.y + headerHeight,
    w: Math.max(1, frame.w - margin * 2),
    h: Math.max(1, frame.h - headerHeight - margin),
  }
  const scale = Math.min(
    available.w / Math.max(1, result.bounds.width),
    available.h / Math.max(1, result.bounds.height),
    1.4,
  )
  const contentWidth = result.bounds.width * scale
  const contentHeight = result.bounds.height * scale
  const offsetX = available.x + (available.w - contentWidth) / 2 - result.bounds.x * scale
  const offsetY = available.y + (available.h - contentHeight) / 2 - result.bounds.y * scale
  const transform = (point: LayoutPoint): LayoutPoint => ({
    x: offsetX + point.x * scale,
    y: offsetY + point.y * scale,
  })

  if (options.showRoutes) {
    const edges: PreviewEdge[] = result.edges.filter(({id}) => options.visibleEdgeIds?.has(id) ?? true)
    edges.sort((left, right) => left.id.localeCompare(right.id))
    const crossingGaps = "crossings" in result
      ? Map.groupBy(result.crossings, ({underEdgeId}) => underEdgeId)
      : new Map<string, never[]>()
    for (const edge of edges) {
      const points = edgePoints(edge).map(transform)
      const gaps = (crossingGaps.get(edge.id) ?? []).map(({point}) => transform(point))
      const runs = splitPolylineAtGaps(points, gaps, Math.max(3, scale * 7))
      for (const run of runs) surface.drawPolyline(run, EDGE_COLOR, Math.max(1, scale * 2))
      const tip = points.at(-1)
      if (tip !== undefined) drawArrow(surface, points, Math.max(4, scale * 9), EDGE_COLOR)
    }
  }

  const labelById = options.labels ?? Object.fromEntries(graph.nodes.map(({id}) => [id, id]))
  for (const node of result.nodes) {
    const x = offsetX + node.x * scale
    const y = offsetY + node.y * scale
    const width = node.width * scale
    const height = node.height * scale
    Pane(surface, x, y, width, height, {
      appearance: "panel",
      variant: "filled",
      style: {padding: 0},
    })
    const label = labelById[node.id] ?? node.id
    div(surface, x + 5, y + 3, Math.max(1, width - 10), Math.max(1, height - 6), {
      children: label,
      style: {
        color: "text",
        fontSize: Math.max(7, Math.min(13, 12 * scale)),
        lineHeight: 1.15,
        textAlign: "center",
        overflow: "hidden",
      },
    })
  }

  if (options.showPorts) {
    const visiblePortIds = options.visibleEdgeIds === undefined || graph.edges === undefined
      ? null
      : new Set(graph.edges.flatMap((edge) => options.visibleEdgeIds!.has(edge.id)
          ? [edge.sourcePortId, edge.targetPortId] : []))
    for (const port of result.ports) {
      if (visiblePortIds !== null && !visiblePortIds.has(port.id)) continue
      const center = transform(port)
      const diameter = Math.max(4, scale * 9)
      div(surface, center.x - diameter / 2, center.y - diameter / 2, diameter, diameter, {
        style: {
          background: "cyan",
          borderColor: "borderBright",
          borderRadius: 999,
          borderWidth: 1,
        },
      })
    }
  }

  const bridgeText = "crossings" in result ? ` · ${result.crossings.length} bridges` : ""
  Typography(surface, available.x, available.y, available.w, 20, {
    children: `${result.nodes.length} nodes · ${options.visibleEdgeIds?.size ?? result.edges.length}/${result.edges.length} cubic Bézier edges${bridgeText} · ${result.direction}`,
    variant: "caption",
    color: "muted",
  })
}

function edgePoints(edge: PreviewEdge): readonly LayoutPoint[] {
  if ("curves" in edge) return sampleCurveChain(edge.curves)
  const section = edge.sections[0]
  return [section.startPoint, ...section.bendPoints, section.endPoint]
}

function sampleCurveChain(
  curves: TopDownLayoutResult["edges"][number]["curves"] |
    CoffmanGrahamLayoutResult["edges"][number]["curves"],
): readonly LayoutPoint[] {
  return curves.flatMap((curve, curveIndex) => Array.from({length: 17}, (_, index) => {
    if (curveIndex > 0 && index === 0) return null
    const t = index / 16
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
  surface.drawLine(tip.x, tip.y, baseX + px * size * 0.45, baseY + py * size * 0.45, color, 1.5)
  surface.drawLine(tip.x, tip.y, baseX - px * size * 0.45, baseY - py * size * 0.45, color, 1.5)
}

function splitPolylineAtGaps(
  points: readonly LayoutPoint[],
  gaps: readonly LayoutPoint[],
  radius: number,
): readonly (readonly LayoutPoint[])[] {
  if (points.length < 2 || gaps.length === 0) return [points]
  const cumulative = [0]
  for (let index = 1; index < points.length; index += 1) {
    cumulative.push(cumulative[index - 1]! + distance(points[index - 1]!, points[index]!))
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
      const candidateDistance = distance(gap, projected)
      if (candidateDistance < nearestDistance) {
        nearestDistance = candidateDistance
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

function distance(first: LayoutPoint, second: LayoutPoint): number {
  return Math.hypot(second.x - first.x, second.y - first.y)
}
