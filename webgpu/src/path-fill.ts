import type {PathDisplayItem} from "@renderer/html"

type Geometry = PathDisplayItem["geometry"]
type Edge = Geometry["segments"][number]
type Rule = NonNullable<PathDisplayItem["fillRule"]>
const cache = new WeakMap<Geometry, Map<Rule, Float32Array>>()
const MAX_VERTICES = 1_048_576

/**
 * Разбивает sampled контур на неперекрывающиеся треугольники по правилу заливки.
 * Горизонтальные полосы разделены вершинами и пересечениями рёбер, поэтому
 * порядок границ внутри полосы постоянен даже у самопересекающегося контура.
 * Кэш зависит только от неизменяемой геометрии и правила, а не от цвета/проекции.
 */
export function pathFillVertices(geometry: Geometry, rule: Rule): Float32Array {
  const previous = cache.get(geometry)?.get(rule)
  if (previous !== undefined) return previous
  const segments = geometry.segments
  const edges = [...segments, {from: segments[segments.length - 1]!.to, to: segments[0]!.from}]
    .filter(edge => edge.from.y !== edge.to.y)
  const levels = new Set(edges.flatMap(edge => [edge.from.y, edge.to.y]))
  for (let i = 0; i < edges.length; i += 1) {
    const a = edges[i]!
    const ax = a.to.x - a.from.x
    const ay = a.to.y - a.from.y
    for (let j = i + 1; j < edges.length; j += 1) {
      const b = edges[j]!
      const bx = b.to.x - b.from.x
      const by = b.to.y - b.from.y
      const denominator = ax * by - ay * bx
      if (denominator === 0) continue
      const dx = b.from.x - a.from.x
      const dy = b.from.y - a.from.y
      const t = (dx * by - dy * bx) / denominator
      const u = (dx * ay - dy * ax) / denominator
      if (t > 0 && t < 1 && u > 0 && u < 1) levels.add(a.from.y + t * ay)
    }
  }
  const sorted = [...levels].sort((a, b) => a - b)
  const vertices: number[] = []
  for (let i = 1; i < sorted.length; i += 1) {
    const bottom = sorted[i - 1]!
    const top = sorted[i]!
    const middle = bottom + (top - bottom) / 2
    const crossings = edges.filter(edge => middle > Math.min(edge.from.y, edge.to.y) && middle < Math.max(edge.from.y, edge.to.y))
      .sort((a, b) => atY(a, middle) - atY(b, middle))
    let winding = 0
    for (let j = 0; j + 1 < crossings.length; j += 1) {
      const left = crossings[j]!
      const right = crossings[j + 1]!
      winding += left.to.y > left.from.y ? 1 : -1
      if (rule === "evenodd" ? Math.abs(winding) % 2 === 0 : winding === 0) continue
      if (atY(right, middle) <= atY(left, middle)) continue
      const lb = atY(left, bottom)
      const lt = atY(left, top)
      const rb = atY(right, bottom)
      const rt = atY(right, top)
      vertices.push(lb, bottom, 0, rb, bottom, 0, lt, top, 0,
        rb, bottom, 0, rt, top, 0, lt, top, 0)
      if (vertices.length / 3 > MAX_VERTICES) throw new RangeError("Vector fill tessellation exceeds vertex capacity")
    }
  }
  const result = new Float32Array(vertices)
  if (Object.isFrozen(geometry) && Object.isFrozen(segments) && segments.every(edge =>
    Object.isFrozen(edge) && Object.isFrozen(edge.from) && Object.isFrozen(edge.to))) {
    let rules = cache.get(geometry)
    if (rules === undefined) cache.set(geometry, rules = new Map())
    rules.set(rule, result)
  }
  return result
}

function atY(edge: Edge, y: number): number {
  return edge.from.x + (y - edge.from.y) * (edge.to.x - edge.from.x) / (edge.to.y - edge.from.y)
}
