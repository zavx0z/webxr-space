import {expect, test} from "bun:test"
import {layoutTopDown, TopDownLayoutError, type TopDownContourGraph, type TopDownLayoutGraph} from "@nodes/layout/top-down"
import {runTopDownWorkerRequest} from "@nodes/layout/worker/top-down/executor"
import reference from "./references/dagre-7.0.14.json"
import ports from "./references/ports-before.json"
import {roundedContourCurves, cubicExtrema} from "../algorithms/top-down/src/contour.ts"

for (const fixture of reference.fixtures) {
  test(`[TOPDOWN-PARITY] ${fixture.name}: upstream coordinates и raw routes`, () => {
    const input = {...fixture.input, attachment: "contour" as const}
    const before = structuredClone(input)
    const result = layoutTopDown(input)
    expect(input).toEqual(before)
    expect(layoutTopDown(input)).toEqual(result)
    expect(result.ports).toEqual([])
    for (const expected of fixture.expected.nodes) {
      const actual = result.nodes.find(node => node.id === expected.id)!
      for (const key of ["x", "y", "width", "height"] as const) expect(actual[key]).toBeCloseTo(expected[key], 6)
    }
    for (const expected of fixture.expected.edges) {
      const actual = result.edges.find(edge => edge.id === expected.id)!
      expect(actual.guidePoints).toHaveLength(expected.points.length)
      expected.points.forEach((point, index) => {
        expect(actual.guidePoints![index]!.x).toBeCloseTo(point.x, 6)
        expect(actual.guidePoints![index]!.y).toBeCloseTo(point.y, 6)
      })
    }
    expect(result.bounds.width).toBeCloseTo(fixture.expected.bounds.width, 6)
    expect(result.bounds.height).toBeCloseTo(fixture.expected.bounds.height, 6)
    const worker = runTopDownWorkerRequest({type: "layout", requestId: 1, generation: 1, graph: input})
    expect(worker.type).toBe("layout-result")
    if (worker.type === "layout-result") expect(worker.result).toEqual(result)
  })
}

for (const fixture of ports.fixtures) {
  test(`[TOPDOWN-PORT-COMPAT] ${fixture.name}: прежняя точная геометрия`, () => {
    expect(JSON.stringify(layoutTopDown(fixture.input as TopDownLayoutGraph))).toBe(JSON.stringify(fixture.expected))
  })
}

test("[TOPDOWN-CONTOURS] эллипсы, круги и боковое пересечение rectangle", () => {
  const graph: TopDownContourGraph = {attachment: "contour", nodes: [
    {id: "a", width: 120, height: 80, shape: "ellipse"},
    {id: "b", width: 90, height: 90, shape: "circle"},
    {id: "c", width: 340, height: 20},
  ], edges: [{id: "ab", sourceNodeId: "a", targetNodeId: "b"}, {id: "ac", sourceNodeId: "a", targetNodeId: "c"}]}
  const result = layoutTopDown(graph)
  for (const edge of result.edges) {
    const node = result.nodes.find(node => node.id === "a")!
    const point = edge.attachment!.start
    expect(((point.x - node.x - node.width / 2) / (node.width / 2)) ** 2 + ((point.y - node.y - node.height / 2) / (node.height / 2)) ** 2).toBeCloseTo(1, 6)
    expect(edge.curves[0]!.startPoint).toEqual(point)
  }
  const circle = result.nodes.find(node => node.id === "b")!
  const circleEnd = result.edges.find(edge => edge.id === "ab")!.attachment!.end
  expect(Math.hypot(circleEnd.x - circle.x - 45, circleEnd.y - circle.y - 45)).toBeCloseTo(45, 6)
  const seven = layoutTopDown({...reference.fixtures[0]!.input, attachment: "contour"})
  const root = seven.nodes.find(node => node.id === "ContentNode")!
  expect(seven.edges[0]!.attachment!.start.x).toBe(root.x)
  expect(seven.edges[0]!.attachment!.start.y).toBeLessThan(root.y + root.height)
  expect(() => layoutTopDown({...graph, nodes: [{id: "a", width: 100, height: 50, shape: "circle"}]})).toThrow("Круг")
})

test("[TOPDOWN-ROUNDED] эталонный угол90: Q с trim sqrt(50) и точным cubic transport", () => {
  const curves = roundedContourCurves([{x: 0, y: 0}, {x: 100, y: 0}, {x: 100, y: 100}], 4, 4)
  expect(curves).toHaveLength(3)
  const radius = Math.sqrt(50)
  expect(curves[0]!.startPoint).toEqual({x: 4, y: 0})
  expect(curves[0]!.endPoint.x).toBeCloseTo(100 - radius, 12)
  expect(curves[1]!.endPoint.y).toBeCloseTo(radius, 12)
  expect(curves[1]!.controlPoints[0].x).toBeCloseTo(100 - radius / 3, 12)
  expect(curves[1]!.controlPoints[1].y).toBeCloseTo(radius / 3, 12)
  expect(curves.at(-1)!.endPoint).toEqual({x: 100, y: 96})
})

test("[TOPDOWN-CONTOUR-CYCLE] typed cycle и отсутствие фиктивных Socket ports", () => {
  expect(() => layoutTopDown({attachment: "contour", nodes: [{id: "a", width: 20, height: 20}], edges: [{id: "loop", sourceNodeId: "a", targetNodeId: "a"}]})).toThrow(TopDownLayoutError)
})

test("[TOPDOWN-CURVE-BOUNDS] cubic extrema исключают лишнюю площадь control hull", () => {
  const points = cubicExtrema({startPoint: {x: 0, y: 0}, controlPoints: [{x: 100, y: 100}, {x: -100, y: 100}], endPoint: {x: 0, y: 0}})
  expect(Math.max(...points.map(point => point.y))).toBe(75)
  expect(Math.max(...points.map(point => point.x))).toBeCloseTo(100 / (2 * Math.sqrt(3)), 10)
  expect(Math.min(...points.map(point => point.x))).toBeCloseTo(-100 / (2 * Math.sqrt(3)), 10)
})
