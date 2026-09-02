import type {
  LayoutPresentationCase,
  LayoutPresentationDiagnostic,
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
      ...( "curves" in edge
        ? cubicPath(edge.curves)
        : polylinePath([
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

function polylinePath(points: readonly Readonly<{x: number; y: number}>[]): Readonly<{d: string; segmentCount: number}> {
  if (points.length < 2) throw new Error("Layout presentation polyline must contain at least two points")
  return Object.freeze({
    d: [`M ${coordinate(points[0]!.x)} ${coordinate(points[0]!.y)}`, ...points.slice(1)
      .map((point) => `L ${coordinate(point.x)} ${coordinate(point.y)}`)].join(" "),
    segmentCount: points.length - 1,
  })
}

function cubicPath(
  curves: TopDownLayoutResult["edges"][number]["curves"] |
    CoffmanGrahamLayoutResult["edges"][number]["curves"],
): Readonly<{d: string; segmentCount: number}> {
  const first = curves[0]
  if (first === undefined) throw new Error("Layout presentation cubic chain must not be empty")
  return Object.freeze({
    d: [
      `M ${coordinate(first.startPoint.x)} ${coordinate(first.startPoint.y)}`,
      ...curves.map((curve) => `C ${coordinate(curve.controlPoints[0].x)} ${coordinate(curve.controlPoints[0].y)} ${coordinate(curve.controlPoints[1].x)} ${coordinate(curve.controlPoints[1].y)} ${coordinate(curve.endPoint.x)} ${coordinate(curve.endPoint.y)}`),
    ].join(" "),
    segmentCount: curves.length,
  })
}
function decimal(value: number): string { return String(Math.round(value * 1000) / 1000) }
function coordinate(value: number): string {
  if (!Number.isFinite(value)) throw new TypeError(`Layout Path coordinate must be finite: ${value}`)
  return String(Object.is(value, -0) ? 0 : value)
}
