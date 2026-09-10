import type {LinkCubicCurve, LinkPathPoint} from "./link-path.ts"

/** Удаляет длину с концов кубической цепочки; исходные curves и marker tangents не изменяет. */
export function trimCubicCurves(curves: readonly LinkCubicCurve[], start: number, end: number): readonly LinkCubicCurve[] {
  if (!Number.isFinite(start + end) || start < 0 || end < 0) throw new Error("Недопустимый промежуток линии")
  if (!start && !end) return curves
  const lengths = curves.map(curve => arcLength(curve))
  const total = lengths.reduce((a, b) => a + b, 0)
  // Desktop оставляет исходную короткую линию, когда оба промежутка не помещаются.
  if (total < start + end) return curves
  const result: LinkCubicCurve[] = []
  let position = 0
  curves.forEach((curve, index) => {
    const length = lengths[index]!
    const from = Math.max(0, start - position)
    const to = Math.min(length, total - end - position)
    position += length
    if (to <= from) return
    const t0 = from === 0 ? 0 : parameterAtLength(curve, from)
    const t1 = to === length ? 1 : parameterAtLength(curve, to)
    const prefix = t1 === 1 ? curve : split(curve, t1)[0]
    result.push(t0 === 0 ? prefix : split(prefix, t0 / t1)[1])
  })
  return result.length ? result : curves
}

function parameterAtLength(curve: LinkCubicCurve, length: number): number {
  let low = 0
  let high = 1
  for (let i = 0; i < 42; i += 1) {
    const middle = (low + high) / 2
    if (arcLength(curve, middle) < length) low = middle
    else high = middle
  }
  return (low + high) / 2
}

function arcLength(curve: LinkCubicCurve, end = 1): number {
  const speed = (t: number): number => {
    const [a, b] = curve.controlPoints
    const p = curve.startPoint
    const q = curve.endPoint
    const u = 1 - t
    return 3 * Math.hypot(u * u * (a.x - p.x) + 2 * u * t * (b.x - a.x) + t * t * (q.x - b.x), u * u * (a.y - p.y) + 2 * u * t * (b.y - a.y) + t * t * (q.y - b.y))
  }
  const integrate = (a: number, b: number, fa: number, fm: number, fb: number, estimate: number, tolerance: number, depth: number): number => {
    const middle = (a + b) / 2
    const leftSpeed = speed((a + middle) / 2)
    const rightSpeed = speed((middle + b) / 2)
    const left = (middle - a) * (fa + 4 * leftSpeed + fm) / 6
    const right = (b - middle) * (fm + 4 * rightSpeed + fb) / 6
    const delta = left + right - estimate
    if (depth === 0 || Math.abs(delta) <= 15 * tolerance) return left + right + delta / 15
    return integrate(a, middle, fa, leftSpeed, fm, left, tolerance / 2, depth - 1) + integrate(middle, b, fm, rightSpeed, fb, right, tolerance / 2, depth - 1)
  }
  const a = speed(0)
  const m = speed(end / 2)
  const b = speed(end)
  return integrate(0, end, a, m, b, end * (a + 4 * m + b) / 6, 1e-8, 16)
}

function split(curve: LinkCubicCurve, t: number): readonly [LinkCubicCurve, LinkCubicCurve] {
  const mix = (a: LinkPathPoint, b: LinkPathPoint): LinkPathPoint => ({x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t})
  const a = mix(curve.startPoint, curve.controlPoints[0])
  const b = mix(curve.controlPoints[0], curve.controlPoints[1])
  const c = mix(curve.controlPoints[1], curve.endPoint)
  const d = mix(a, b)
  const e = mix(b, c)
  const middle = mix(d, e)
  return [{startPoint: curve.startPoint, controlPoints: [a, d], endPoint: middle}, {startPoint: middle, controlPoints: [e, c], endPoint: curve.endPoint}]
}
