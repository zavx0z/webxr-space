import {expect, test} from "bun:test"
import {createCubicLinkRoute, projectLinkMarkers, projectLinkArrowheads} from "../shared/routing/link-path.ts"

const vertical = () => createCubicLinkRoute([{startPoint: {x: 0, y: 4}, controlPoints: [{x: 0, y: 30}, {x: 0, y: 70}], endPoint: {x: 0, y: 96}}])

test("[LINK-MARKER-GEOMETRY] SVG point viewport + Desktop refX дают независимые tips и closed triangles", () => {
  const route = vertical()
  const markers = projectLinkMarkers(route, {start: {length: 11.5, width: 14, offset: 3}, end: {length: 10.5, width: 14 * 10.5 / 11.5, offset: 4 * 10.5 / 11.5}})
  expect(markers[0]!.tip).toEqual({x: 0, y: 7})
  expect(markers[1]!.tip.y).toBeCloseTo(92.34782608695652, 12)
  expect(markers[0]!.points[1].y).toBe(18.5)
  expect(Math.abs(markers[1]!.points[1].x)).toBeCloseTo(6.391304347826087, 12)
  for (const marker of markers) {
    expect(marker.d.split(" L ")).toHaveLength(4)
    expect(marker.d).not.toMatch(/NaN|Infinity/)
  }
  expect(projectLinkArrowheads(route, false, true)[0]!.d).toContain("0 96")
})

test("[LINK-MARKER-VALIDATION] invalid styles не проходят в vector-path", () => {
  expect(() => projectLinkMarkers(vertical(), {end: {length: -1, width: 3, offset: 0}})).toThrow()
  expect(() => projectLinkMarkers(vertical(), {end: {length: 1, width: 3, offset: Infinity}})).toThrow()
  expect(projectLinkMarkers(vertical(), {})).toEqual([])
})

test("[LINK-STROKE-GAPS] shortening линии сохраняет исходные marker tangents", () => {
  const route = createCubicLinkRoute([{startPoint: {x: 0, y: 4}, controlPoints: [{x: 0, y: 30}, {x: 0, y: 70}], endPoint: {x: 0, y: 96}}], {start: 4, end: 8})
  const markers = projectLinkMarkers(route, {end: {length: 10.5, width: 14, offset: 4}})
  expect(markers[0]!.tip).toEqual({x: 0, y: 92})
  if (route.kind !== "path") throw new Error("Нужен cubic route")
  const coordinates = route.projection.d.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/g)!.map(Number)
  expect(coordinates[1]).toBeCloseTo(8, 7)
  expect(coordinates.at(-1)).toBeCloseTo(88, 7)
})
