import {Pane} from "@ui/components/pane"
import {Typography} from "@ui/components/typography"
import {div} from "@ui/elements/div"
import {palette} from "@ui/elements/theme"
import type {UiSurface} from "@layout/core/surface"
import type {LayoutPoint} from "@nodes/layout/types"
import type {TopDownLayoutResult} from "@nodes/layout/top-down"
import type {LayoutResult} from "@nodes/layout/types"

type PreviewGraph = Readonly<{
  nodes: readonly Readonly<{id: string}>[]
}>

type PreviewResult = LayoutResult | TopDownLayoutResult

export type LayoutPreviewOptions = Readonly<{
  showRoutes: boolean
  showPorts: boolean
  labels?: Readonly<Record<string, string>>
}>

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
    const arrowTips = new Set<string>()
    for (const edge of result.edges) {
      const section = edge.sections[0]
      if (section === undefined) continue
      const points = [section.startPoint, ...section.bendPoints, section.endPoint].map(transform)
      surface.drawPolyline(points, palette.cyan, Math.max(1, scale * 2))
      const tip = points.at(-1)
      const tipKey = tip === undefined ? "" : `${tip.x}\0${tip.y}`
      if (tip !== undefined && !arrowTips.has(tipKey)) {
        arrowTips.add(tipKey)
        drawArrow(surface, points, Math.max(4, scale * 9))
      }
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
    for (const port of result.ports) {
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
    children: `${result.nodes.length} nodes · ${result.edges.length} edges · ${result.direction}`,
    variant: "caption",
    color: "muted",
  })
}

function drawArrow(surface: UiSurface, points: readonly LayoutPoint[], size: number): void {
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
  surface.drawLine(tip.x, tip.y, baseX + px * size * 0.45, baseY + py * size * 0.45, palette.cyan, 1.5)
  surface.drawLine(tip.x, tip.y, baseX - px * size * 0.45, baseY - py * size * 0.45, palette.cyan, 1.5)
}
