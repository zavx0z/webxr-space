import {describe, expect, test} from "bun:test"
import {VECTOR_PATH_COORDINATE_LIMIT} from "@zavx0z/dom/html/vector-path-element"
import {createCubicLinkRoute, normalizeLinkRoute, projectLinkRoute} from "./link-path.ts"

const LINK_PATH_SEGMENT_LIMIT = 256

describe("Node Link path projection", () => {
  test("restores the historical local radius-10 orthogonal cubic law", () => {
    const projection = projectLinkRoute({kind: "orthogonal", points: [
      {x: 10, y: 20},
      {x: 80, y: 20},
      {x: 80, y: 90},
      {x: 130, y: 90},
    ]})

    expect(projection.d).toBe([
      "M 10 20",
      "L 70 20",
      "C 76.66666666666667 20 80 23.333333333333336 80 30",
      "L 80 80",
      "C 80 86.66666666666667 83.33333333333333 90 90 90",
      "L 130 90",
    ].join(" "))
    expect(projection.bounds).toEqual({x: 10, y: 20, width: 120, height: 70})
    expect(projection.segmentCount).toBe(5)
  })

  test("uses half of a short adjacent run and preserves exact endpoints", () => {
    const projection = projectLinkRoute({kind: "orthogonal", points: [
      {x: 0, y: 0},
      {x: 8, y: 0},
      {x: 8, y: 6},
    ]})
    expect(projection.d).toStartWith("M 0 0")
    expect(projection.d).toEndWith("L 8 6")
    expect(projection.d).toContain("L 4 0")
    expect(projection.d).toContain("C")
  })

  test("transports a continuous cubic chain directly without sampling", () => {
    const projection = projectLinkRoute(createCubicLinkRoute([
      {
        startPoint: {x: 4, y: 8},
        controlPoints: [{x: 12, y: -4}, {x: 20, y: 28}],
        endPoint: {x: 30, y: 16},
      },
      {
        startPoint: {x: 30, y: 16},
        controlPoints: [{x: 34, y: 18}, {x: 40, y: 22}],
        endPoint: {x: 48, y: 24},
      },
    ]))
    expect(projection.d).toBe("M 4 8 C 12 -4 20 28 30 16 C 34 18 40 22 48 24")
    expect(projection.segmentCount).toBe(2)
    expect(projection.bounds.x).toBe(4)
    expect(projection.bounds.y).toBeLessThan(8)
    expect(projection.bounds.x + projection.bounds.width).toBe(48)
  })

  test("preserves a visible cubic self-loop and rejects only a point-degenerate curve", () => {
    const projection = projectLinkRoute(createCubicLinkRoute([{
      startPoint: {x: 20, y: 20},
      controlPoints: [{x: 60, y: -30}, {x: -20, y: -30}],
      endPoint: {x: 20, y: 20},
    }]))
    expect(projection.d).toBe("M 20 20 C 60 -30 -20 -30 20 20")
    expect(projection.bounds.width).toBeGreaterThan(0)
    expect(projection.bounds.height).toBeGreaterThan(0)
    expect(() => createCubicLinkRoute([{
      startPoint: {x: 20, y: 20},
      controlPoints: [{x: 20, y: 20}, {x: 20, y: 20}],
      endPoint: {x: 20, y: 20},
    }])).toThrow("curve 0 is a point")
  })

  test("fails closed for malformed or discontinuous routes", () => {
    expect(() => normalizeLinkRoute({kind: "orthogonal", points: [{x: 0, y: 0}]}))
      .toThrow("needs >=2 orthogonal points")
    expect(() => normalizeLinkRoute({kind: "orthogonal", points: [{x: 0, y: 0}, {x: 1, y: 1}]}))
      .toThrow("not axis-aligned")
    expect(() => normalizeLinkRoute({kind: "orthogonal", points: [{x: 0, y: 0}, {x: 0, y: 0}]}))
      .toThrow("repeats")
    expect(() => createCubicLinkRoute([
      {startPoint: {x: 0, y: 0}, controlPoints: [{x: 1, y: 0}, {x: 2, y: 0}], endPoint: {x: 3, y: 0}},
      {startPoint: {x: 4, y: 0}, controlPoints: [{x: 5, y: 0}, {x: 6, y: 0}], endPoint: {x: 7, y: 0}},
    ])).toThrow("curve 1 disconnected")
  })

  test("matches the platform maximum at 256 cubics and rejects 257 before DOM", () => {
    const curves = Array.from({length: LINK_PATH_SEGMENT_LIMIT + 1}, (_, index) => ({
      startPoint: {x: index, y: 0},
      controlPoints: [{x: index + 1 / 3, y: 0}, {x: index + 2 / 3, y: 0}] as const,
      endPoint: {x: index + 1, y: 0},
    }))
    expect(projectLinkRoute(createCubicLinkRoute(curves.slice(0, LINK_PATH_SEGMENT_LIMIT))).segmentCount)
      .toBe(LINK_PATH_SEGMENT_LIMIT)
    expect(() => createCubicLinkRoute(curves)).toThrow("257/256")

    const zigzag: Array<{x: number; y: number}> = []
    let x = 0
    let y = 0
    for (let index = 0; index < 130; index += 1) {
      zigzag.push({x, y})
      if (index % 2 === 0) x += 30
      else y += 30
    }
    expect(() => projectLinkRoute({kind: "orthogonal", points: zigzag})).toThrow("257/256")

    const collinear = Array.from({length: 257}, (_, index) => ({x: index, y: 0}))
    expect(projectLinkRoute({kind: "orthogonal", points: collinear}).segmentCount).toBe(256)
    expect(() => projectLinkRoute({kind: "orthogonal", points: [...collinear, {x: 257, y: 0}]}))
      .toThrow("257/256")
  })

  test("uses the exact DOM author coordinate bound before deriving route bounds", () => {
    expect(projectLinkRoute({kind: "orthogonal", points: [
      {x: -VECTOR_PATH_COORDINATE_LIMIT, y: 0},
      {x: VECTOR_PATH_COORDINATE_LIMIT, y: 0},
    ]}).bounds.width).toBe(VECTOR_PATH_COORDINATE_LIMIT * 2)
    expect(() => projectLinkRoute({kind: "orthogonal", points: [
      {x: 0, y: 0},
      {x: VECTOR_PATH_COORDINATE_LIMIT + 1, y: 0},
    ]})).toThrow("finite point")
    expect(() => projectLinkRoute({kind: "orthogonal", points: [
      {x: -1e308, y: 0},
      {x: 1e308, y: 0},
    ]})).toThrow("finite point")
    expect(() => projectLinkRoute({
      kind: "path",
      projection: {d: "M 0 0 L 1 0", bounds: {x: 0, y: 0, width: 1, height: 0}, segmentCount: 1},
    })).toThrow("requires createCubicLinkRoute")
  })
})
