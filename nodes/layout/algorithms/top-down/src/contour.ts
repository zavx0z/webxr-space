import type {TopDownCurveSegment, TopDownShape} from "../../../protocol/types/src/top-down.ts"
import type {LayoutPoint} from "../../../protocol/types/src/protocol.ts"

type Contour = Readonly<{x: number; y: number; width: number; height: number; shape?: TopDownShape}>
const EPSILON = 1e-5

/** Пересечение луча центр → соседняя guide point с измеренной фигурой. */
export function intersectContour(node: Contour, guide: LayoutPoint): LayoutPoint {
  const x = node.x + node.width / 2
  const y = node.y + node.height / 2
  const dx = guide.x - x
  const dy = guide.y - y
  if (dx === 0 && dy === 0) throw new Error("Направление пересечения контура отсутствует")
  const halfWidth = node.width / 2
  const halfHeight = node.height / 2
  const scale = node.shape === "ellipse" || node.shape === "circle"
    ? 1 / Math.hypot(dx / halfWidth, dy / halfHeight)
    : 1 / Math.max(Math.abs(dx) / halfWidth, Math.abs(dy) / halfHeight)
  return {x: x + dx * scale, y: y + dy * scale}
}

/** Формула Mermaid 11.16 rounded; quadratic переводится в cubic точно, без аппроксимации. */
export function roundedContourCurves(
  input: readonly LayoutPoint[],
  startInset = 0,
  endInset = 0,
): readonly [TopDownCurveSegment, ...TopDownCurveSegment[]] {
  const points = input.map(value => ({...value}))
  const move = (index: number, neighbor: number, amount: number): void => {
    const a = points[index]!
    const b = points[neighbor]!
    const length = Math.hypot(b.x - a.x, b.y - a.y)
    if (amount && length <= amount) throw new Error("Inset превышает длину конечного участка")
    if (amount) points[index] = mix(a, b, amount / length)
  }
  move(0, 1, startInset)
  move(points.length - 1, points.length - 2, endInset)
  const curves: TopDownCurveSegment[] = []
  let cursor = points[0]!
  const line = (end: LayoutPoint): void => {
    if (cursor.x === end.x && cursor.y === end.y) return
    curves.push({startPoint: cursor, controlPoints: [mix(cursor, end, 1 / 3), mix(cursor, end, 2 / 3)], endPoint: end})
    cursor = end
  }
  for (let i = 1; i < points.length - 1; i += 1) {
    const previous = points[i - 1]!
    const corner = points[i]!
    const next = points[i + 1]!
    const incoming = Math.hypot(corner.x - previous.x, corner.y - previous.y)
    const outgoing = Math.hypot(next.x - corner.x, next.y - corner.y)
    const cosine = ((corner.x - previous.x) * (next.x - corner.x) + (corner.y - previous.y) * (next.y - corner.y)) / (incoming * outgoing)
    const angle = Math.acos(Math.max(-1, Math.min(1, cosine)))
    if (incoming < EPSILON || outgoing < EPSILON || angle < EPSILON || Math.abs(Math.PI - angle) < EPSILON) {
      line(corner)
      continue
    }
    const trim = Math.min(5 / Math.sin(angle / 2), incoming / 2, outgoing / 2)
    const entry = mix(corner, previous, trim / incoming)
    const exit = mix(corner, next, trim / outgoing)
    line(entry)
    curves.push({startPoint: entry, controlPoints: [mix(entry, corner, 2 / 3), mix(exit, corner, 2 / 3)], endPoint: exit})
    cursor = exit
  }
  line(points.at(-1)!)
  if (!curves.length) throw new Error("Контурная связь не содержит участка")
  return [curves[0]!, ...curves.slice(1)]
}

function mix(a: LayoutPoint, b: LayoutPoint, t: number): LayoutPoint {
  return {x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t}
}

/** Точки экстремумов cubic; control hull не выдаётся за фактический bounds кривой. */
export function cubicExtrema(curve: TopDownCurveSegment): readonly LayoutPoint[] {
  const parameters = new Set([0, 1])
  for (const axis of ["x", "y"] as const) {
    const p = curve.startPoint[axis]
    const a = curve.controlPoints[0][axis]
    const b = curve.controlPoints[1][axis]
    const q = curve.endPoint[axis]
    const quadratic = -p + 3 * a - 3 * b + q
    const linear = 2 * (p - 2 * a + b)
    const constant = a - p
    const roots = Math.abs(quadratic) < 1e-12
      ? Math.abs(linear) < 1e-12 ? [] : [-constant / linear]
      : linear * linear < 4 * quadratic * constant ? [] : [
        (-linear + Math.sqrt(linear * linear - 4 * quadratic * constant)) / (2 * quadratic),
        (-linear - Math.sqrt(linear * linear - 4 * quadratic * constant)) / (2 * quadratic),
      ]
    for (const t of roots) if (t > 0 && t < 1) parameters.add(t)
  }
  return [...parameters].map(t => {
    const u = 1 - t
    const coordinate = (axis: "x" | "y") => u ** 3 * curve.startPoint[axis] + 3 * u * u * t * curve.controlPoints[0][axis] + 3 * u * t * t * curve.controlPoints[1][axis] + t ** 3 * curve.endPoint[axis]
    return {x: coordinate("x"), y: coordinate("y")}
  })
}
