import {VECTOR_PATH_COORDINATE_LIMIT} from "@zavx0z/dom/html/vector-path-element"

export type LinkPathPoint = Readonly<{
  x: number
  y: number
}>

export type LinkPathBounds = Readonly<{
  x: number
  y: number
  width: number
  height: number
}>

export type LinkCubicCurve = Readonly<{
  startPoint: LinkPathPoint
  controlPoints: readonly [LinkPathPoint, LinkPathPoint]
  endPoint: LinkPathPoint
}>

export type LinkRoute =
  | Readonly<{
    kind: "orthogonal"
    points: readonly LinkPathPoint[]
  }>
  | Readonly<{
    kind: "path"
    projection: LinkPathProjection
  }>

export type LinkPathProjection = Readonly<{
  d: string
  bounds: LinkPathBounds
  segmentCount: number
}>

type PlannedSegment =
  | Readonly<{kind: "line"; from: LinkPathPoint; to: LinkPathPoint}>
  | Readonly<{
    kind: "cubic"
    from: LinkPathPoint
    control1: LinkPathPoint
    control2: LinkPathPoint
    to: LinkPathPoint
  }>

const pathProjections = new WeakMap<object, LinkPathProjection | null>()
const projectedRoutes = new WeakSet<object>()
const LINK_PATH_SEGMENT_LIMIT = 256

export function normalizeLinkRoute(route: LinkRoute): LinkRoute {
  if (!route || typeof route !== "object") routeError("needs object")
  if (pathProjections.has(route)) return route
  if (route.kind === "orthogonal") {
    if (!Array.isArray(route.points) || route.points.length < 2) {
      routeError("needs >=2 orthogonal points")
    }
    if (route.points.length > LINK_PATH_SEGMENT_LIMIT + 1) assertSegmentLimit(route.points.length - 1)
    const points = route.points.map(frozenPoint)
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1]!
      const point = points[index]!
      if (samePoint(previous, point)) routeError(`point ${index} repeats previous`)
      if (previous.x !== point.x && previous.y !== point.y) {
        routeError(`run ${index - 1} not axis-aligned`)
      }
    }
    const normalized = Object.freeze({
      kind: "orthogonal" as const,
      points: Object.freeze(points),
    })
    pathProjections.set(normalized, null)
    return normalized
  }
  if (route.kind === "path") {
    if (!projectedRoutes.has(route)) routeError("path requires createCubicLinkRoute")
    const normalized = Object.freeze({kind: "path" as const, projection: route.projection})
    pathProjections.set(normalized, route.projection)
    return normalized
  }
  return routeError("kind orthogonal|path")
}

export function projectLinkRoute(route: LinkRoute): LinkPathProjection {
  const normalized = normalizeLinkRoute(route)
  const cached = pathProjections.get(normalized)
  if (cached) return cached
  const projection = normalized.kind === "orthogonal" ? projectOrthogonalRoute(normalized) : normalized.projection
  pathProjections.set(normalized, projection)
  return projection
}

export function createCubicLinkRoute(curves: readonly LinkCubicCurve[]): LinkRoute {
  if (!Array.isArray(curves) || curves.length === 0) routeError("needs cubic")
  assertSegmentLimit(curves.length)
  const normalized = curves.map((curve, index): LinkCubicCurve => {
    if (!curve || typeof curve !== "object" || !Array.isArray(curve.controlPoints) || curve.controlPoints.length !== 2) {
      routeError(`curve ${index} needs 2 controls`)
    }
    const result = Object.freeze({
      startPoint: frozenPoint(curve.startPoint),
      controlPoints: Object.freeze([
        frozenPoint(curve.controlPoints[0]),
        frozenPoint(curve.controlPoints[1]),
      ]) as readonly [LinkPathPoint, LinkPathPoint],
      endPoint: frozenPoint(curve.endPoint),
    })
    if (samePoint(result.startPoint, result.endPoint) &&
      result.controlPoints.every((control) => samePoint(control, result.startPoint))) routeError(`curve ${index} is a point`)
    if (index > 0 && !samePoint(curves[index - 1]!.endPoint, result.startPoint)) routeError(`curve ${index} disconnected`)
    return result
  })
  const projection = projectCubicRoute(Object.freeze({kind: "cubic", curves: Object.freeze(normalized)}))
  const route = Object.freeze({kind: "path" as const, projection})
  projectedRoutes.add(route)
  return route
}

function projectOrthogonalRoute(route: Extract<LinkRoute, {kind: "orthogonal"}>): LinkPathProjection {
  const segments = planOrthogonalSegments(route.points, 10)
  if (segments.length === 0) routeError("projection is empty")
  assertSegmentLimit(segments.length)
  const commands = [`M ${coordinate(segments[0]!.from.x)} ${coordinate(segments[0]!.from.y)}`]
  for (const segment of segments) {
    commands.push(segment.kind === "line"
      ? `L ${coordinate(segment.to.x)} ${coordinate(segment.to.y)}`
      : `C ${coordinate(segment.control1.x)} ${coordinate(segment.control1.y)} ${coordinate(segment.control2.x)} ${coordinate(segment.control2.y)} ${coordinate(segment.to.x)} ${coordinate(segment.to.y)}`)
  }
  return Object.freeze({
    d: commands.join(" "),
    bounds: pointBounds(route.points),
    segmentCount: segments.length,
  })
}

function projectCubicRoute(route: Readonly<{kind: "cubic"; curves: readonly LinkCubicCurve[]}>): LinkPathProjection {
  assertSegmentLimit(route.curves.length)
  const first = route.curves[0]!
  const commands = [`M ${coordinate(first.startPoint.x)} ${coordinate(first.startPoint.y)}`]
  for (const curve of route.curves) {
    commands.push(`C ${coordinate(curve.controlPoints[0].x)} ${coordinate(curve.controlPoints[0].y)} ${coordinate(curve.controlPoints[1].x)} ${coordinate(curve.controlPoints[1].y)} ${coordinate(curve.endPoint.x)} ${coordinate(curve.endPoint.y)}`)
  }
  const bounds = pointBounds(route.curves.flatMap(({startPoint, controlPoints, endPoint}) => [
    startPoint,
    ...controlPoints,
    endPoint,
  ]))
  return Object.freeze({d: commands.join(" "), bounds, segmentCount: route.curves.length})
}

function assertSegmentLimit(segmentCount: number): void {
  if (segmentCount > LINK_PATH_SEGMENT_LIMIT) {
    throw new RangeError(`Link Path limit: ${segmentCount}/${LINK_PATH_SEGMENT_LIMIT}`)
  }
}

function planOrthogonalSegments(points: readonly LinkPathPoint[], radius: number): readonly PlannedSegment[] {
  const segments: PlannedSegment[] = []
  let cursor = points[0]!
  for (let index = 1; index < points.length; index += 1) {
    const corner = points[index]!
    const next = points[index + 1]
    if (next === undefined || radius === 0 || collinear(points[index - 1]!, corner, next)) {
      appendLine(segments, cursor, corner)
      assertSegmentLimit(segments.length)
      cursor = corner
      continue
    }
    const previous = points[index - 1]!
    const entry = toward(corner, previous, Math.min(radius, distance(previous, corner) / 2))
    const exit = toward(corner, next, Math.min(radius, distance(corner, next) / 2))
    appendLine(segments, cursor, entry)
    if (!samePoint(entry, exit)) {
      segments.push({
        kind: "cubic",
        from: entry,
        control1: lerp(entry, corner, 2 / 3),
        control2: lerp(exit, corner, 2 / 3),
        to: exit,
      })
    }
    assertSegmentLimit(segments.length)
    cursor = exit
  }
  return segments
}

function appendLine(segments: PlannedSegment[], from: LinkPathPoint, to: LinkPathPoint): void {
  if (!samePoint(from, to)) segments.push({kind: "line", from, to})
}

function frozenPoint(point: LinkPathPoint): LinkPathPoint {
  if (!point || typeof point !== "object" || !Number.isFinite(point.x + point.y) ||
    Math.max(Math.abs(point.x), Math.abs(point.y)) > VECTOR_PATH_COORDINATE_LIMIT) {
    routeError("finite point")
  }
  return Object.freeze({x: point.x === 0 ? 0 : point.x, y: point.y === 0 ? 0 : point.y})
}

function routeError(detail: string): never {
  throw new TypeError(`Link route: ${detail}`)
}

function pointBounds(points: readonly LinkPathPoint[]): LinkPathBounds {
  let left = Number.POSITIVE_INFINITY
  let top = Number.POSITIVE_INFINITY
  let right = Number.NEGATIVE_INFINITY
  let bottom = Number.NEGATIVE_INFINITY
  for (const point of points) {
    left = Math.min(left, point.x)
    top = Math.min(top, point.y)
    right = Math.max(right, point.x)
    bottom = Math.max(bottom, point.y)
  }
  return Object.freeze({x: left, y: top, width: right - left, height: bottom - top})
}

function toward(from: LinkPathPoint, to: LinkPathPoint, amount: number): LinkPathPoint {
  const length = distance(from, to)
  if (length <= Number.EPSILON) return from
  const ratio = amount / length
  return {x: from.x + (to.x - from.x) * ratio, y: from.y + (to.y - from.y) * ratio}
}

function lerp(from: LinkPathPoint, to: LinkPathPoint, t: number): LinkPathPoint {
  return {x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t}
}

function distance(left: LinkPathPoint, right: LinkPathPoint): number {
  return Math.hypot(right.x - left.x, right.y - left.y)
}

function samePoint(left: LinkPathPoint, right: LinkPathPoint): boolean {
  return left.x === right.x && left.y === right.y
}

function collinear(previous: LinkPathPoint, corner: LinkPathPoint, next: LinkPathPoint): boolean {
  const cross = (corner.x - previous.x) * (next.y - corner.y) - (corner.y - previous.y) * (next.x - corner.x)
  return Math.abs(cross) < 1e-6
}

function coordinate(value: number): string {
  return String(value === 0 ? 0 : value)
}
