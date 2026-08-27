import type {
  LayoutPresentationCase,
  LayoutPresentationDiagnostic,
  LayoutPresentationPoint,
} from "../../dom/layout-presentation.ts"
import type {LayoutResult} from "@nodes/layout/types"
import type {TopDownLayoutResult} from "@nodes/layout/top-down"
import type {CoffmanGrahamLayoutResult} from "@nodes/layout/coffman-graham"

export type LayoutDomResult = LayoutResult | TopDownLayoutResult | CoffmanGrahamLayoutResult

export function createLayoutDomCase(options: Readonly<{
  id: string
  label: string
  policy: LayoutPresentationCase["policy"]
  result: LayoutDomResult
  labels?: Readonly<Record<string, string>>
  diagnostics?: readonly LayoutPresentationDiagnostic[]
}>): LayoutPresentationCase {
  const {result} = options
  return Object.freeze({
    id: options.id,
    label: options.label,
    policy: options.policy,
    direction: result.direction,
    bounds: Object.freeze({...result.bounds}),
    nodes: Object.freeze(result.nodes.map((node) => Object.freeze({
      ...node,
      label: options.labels?.[node.id] ?? node.id,
    }))),
    ports: Object.freeze(result.ports.map((port) => Object.freeze({...port}))),
    edges: Object.freeze(result.edges.map((edge) => Object.freeze({
      id: edge.id,
      points: Object.freeze("curves" in edge
        ? sampleCurves(edge.curves)
        : samplePolyline([
          edge.sections[0].startPoint,
          ...edge.sections[0].bendPoints,
          edge.sections[0].endPoint,
        ])),
    }))),
    diagnostics: Object.freeze([
      diagnostic("direction", "Direction", result.direction),
      diagnostic("bounds", "Computed bounds", `${decimal(result.bounds.width)} × ${decimal(result.bounds.height)}`),
      diagnostic("nodes", "Computed nodes", String(result.nodes.length)),
      diagnostic("ports", "Resolved ports", String(result.ports.length)),
      diagnostic("edges", "Computed edges", String(result.edges.length)),
      ...(options.diagnostics ?? []),
    ]),
  })
}

export function diagnostic(id: string, label: string, value: string | number): LayoutPresentationDiagnostic {
  return Object.freeze({id, label, value: String(value)})
}

function samplePolyline(points: readonly LayoutPresentationPoint[]): readonly LayoutPresentationPoint[] {
  const sampled: LayoutPresentationPoint[] = []
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1]!
    const end = points[index]!
    append(sampled, start)
    append(sampled, {x: (start.x + end.x) / 2, y: (start.y + end.y) / 2})
    append(sampled, end)
  }
  return sampled
}

function sampleCurves(
  curves: TopDownLayoutResult["edges"][number]["curves"] |
    CoffmanGrahamLayoutResult["edges"][number]["curves"],
): readonly LayoutPresentationPoint[] {
  const sampled: LayoutPresentationPoint[] = []
  for (const curve of curves) {
    append(sampled, curve.startPoint)
    append(sampled, cubic(curve, 0.5))
    append(sampled, curve.endPoint)
  }
  return sampled
}

function cubic(
  curve: TopDownLayoutResult["edges"][number]["curves"][number],
  t: number,
): LayoutPresentationPoint {
  const u = 1 - t
  return {
    x: u ** 3 * curve.startPoint.x + 3 * u ** 2 * t * curve.controlPoints[0].x +
      3 * u * t ** 2 * curve.controlPoints[1].x + t ** 3 * curve.endPoint.x,
    y: u ** 3 * curve.startPoint.y + 3 * u ** 2 * t * curve.controlPoints[0].y +
      3 * u * t ** 2 * curve.controlPoints[1].y + t ** 3 * curve.endPoint.y,
  }
}

function append(points: LayoutPresentationPoint[], point: LayoutPresentationPoint): void {
  const previous = points.at(-1)
  if (previous?.x === point.x && previous.y === point.y) return
  points.push(Object.freeze({...point}))
}
function decimal(value: number): string { return String(Math.round(value * 1000) / 1000) }
