import {Color} from "@engine/core"
import {Pane} from "@ui/components/pane"
import {Typography} from "@ui/components/typography"
import {div} from "@ui/elements/div"
import type {UiSurface} from "@layout/core/surface"
import type {LayoutPoint} from "@nodes/layout/types"
import type {TopDownLayoutResult} from "@nodes/layout/top-down"
import type {LayoutResult} from "@nodes/layout/types"

type PreviewGraph = Readonly<{
  nodes: readonly Readonly<{id: string}>[]
  edges?: readonly Readonly<{id: string; sourcePortId: string; targetPortId: string}>[]
}>

type PreviewResult = LayoutResult | TopDownLayoutResult
type PreviewEdge = LayoutResult["edges"][number] | TopDownLayoutResult["edges"][number]

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
    for (const edge of edges) {
      const points = separateSemanticEdge(edgePoints(edge).map(transform), edge.id, 3)
      surface.drawPolyline(points, EDGE_COLOR, Math.max(1, scale * 2))
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
      sx: {padding: 0},
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

  Typography(surface, available.x, available.y, available.w, 20, {
    children: `${result.nodes.length} nodes · ${options.visibleEdgeIds?.size ?? result.edges.length}/${result.edges.length} spline edges · ${result.direction}`,
    variant: "caption",
    color: "muted",
  })
}

function separateSemanticEdge(
  points: readonly LayoutPoint[],
  edgeId: string,
  maximumOffset: number,
): readonly LayoutPoint[] {
  if (points.length < 3) return points
  const offset = (stableUnit(edgeId) - 0.5) * maximumOffset * 2
  return points.map((value, index) => {
    if (index === 0 || index === points.length - 1) return value
    const before = points[index - 1]!
    const after = points[index + 1]!
    const dx = after.x - before.x
    const dy = after.y - before.y
    const length = Math.hypot(dx, dy)
    if (length === 0) return value
    const taper = Math.sin(Math.PI * index / (points.length - 1))
    return {x: value.x - dy / length * offset * taper, y: value.y + dx / length * offset * taper}
  })
}

function stableUnit(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 0xffffffff
}

function edgePoints(edge: PreviewEdge): readonly LayoutPoint[] {
  if ("curves" in edge) return sampleCurveChain(edge.curves)
  const section = edge.sections[0]
  return [section.startPoint, ...section.bendPoints, section.endPoint]
}

function sampleCurveChain(curves: TopDownLayoutResult["edges"][number]["curves"]): readonly LayoutPoint[] {
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
