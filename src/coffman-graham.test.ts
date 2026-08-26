import {describe, expect, test} from "bun:test"
import {TOP_DOWN_DENSE_GRAPH} from "../storybook/top-down-dense-fixture.ts"
import {
  CoffmanGrahamLayoutError,
  layoutCoffmanGraham,
  type CoffmanGrahamCurveSegment,
  type CoffmanGrahamLayoutGraph,
  type CoffmanGrahamLayoutResult,
} from "./coffman-graham.ts"

const DENSE_GRAPH = TOP_DOWN_DENSE_GRAPH as CoffmanGrahamLayoutGraph

describe("Coffman–Graham width-bounded layered policy", () => {
  test("keeps the 54/85 stress graph compact, independent and node-safe", () => {
    const result = layoutCoffmanGraham(DENSE_GRAPH)
    const centers = Map.groupBy(result.nodes, (node) => node.y + node.height / 2)
    const sourceEndpoints = new Set(result.edges.map(({curves}) => JSON.stringify(curves[0]!.startPoint)))
    const targetEndpoints = new Set(result.edges.map(({curves}) => JSON.stringify(curves.at(-1)!.endPoint)))

    expect(result.nodes).toHaveLength(54)
    expect(result.edges).toHaveLength(85)
    expect(result.ports).toHaveLength(170)
    expect(Math.max(...[...centers.values()].map((nodes) => nodes.length))).toBeLessThanOrEqual(4)
    expect(result.bounds).toEqual({x: 0, y: 0, width: 3372, height: 2052})
    expect(result.bounds.width / result.bounds.height).toBeLessThan(2)
    expect(sourceEndpoints.size).toBe(result.edges.length)
    expect(targetEndpoints.size).toBe(result.edges.length)
    expect(nodeOverlaps(result)).toEqual([])
    expect(curveNodeCrossings(result, DENSE_GRAPH)).toEqual([])
    expect(horizontalSegments(result)).toEqual([])
    expect(collinearEdgeOverlaps(result)).toEqual([])
    expect(hash(result)).toBe("19125d0482e8befcec28e862cacf7bd7dcb1a26a8bdfdbe10784a226b7fa4e5d")
  })

  test("is invariant to input collection order", () => {
    const first = layoutCoffmanGraham(DENSE_GRAPH)
    const permuted = layoutCoffmanGraham({
      ...DENSE_GRAPH,
      nodes: [...DENSE_GRAPH.nodes].reverse(),
      ports: [...DENSE_GRAPH.ports].reverse(),
      edges: [...DENSE_GRAPH.edges].reverse(),
    })
    expect(permuted).toEqual(first)
  })

  test("applies the explicit bounded layer width", () => {
    const result = layoutCoffmanGraham({
      ...DENSE_GRAPH,
      layoutOptions: {...DENSE_GRAPH.layoutOptions, maxNodesPerLayer: 6},
    })
    const centers = Map.groupBy(result.nodes, (node) => node.y + node.height / 2)
    expect(Math.max(...[...centers.values()].map((nodes) => nodes.length))).toBeLessThanOrEqual(6)
    expect(() => layoutCoffmanGraham({
      ...DENSE_GRAPH,
      layoutOptions: {...DENSE_GRAPH.layoutOptions, maxNodesPerLayer: 17},
    })).toThrow("maxNodesPerLayer")
  })

  test("keeps parallel semantic edges independent", () => {
    const graph: CoffmanGrahamLayoutGraph = {
      nodes: [{id: "a", width: 100, height: 50}, {id: "b", width: 100, height: 50}],
      ports: [
        {id: "a/first", nodeId: "a", x: 30},
        {id: "a/second", nodeId: "a", x: 70},
        {id: "b/first", nodeId: "b", x: 30},
        {id: "b/second", nodeId: "b", x: 70},
      ],
      edges: [
        {id: "first", sourcePortId: "a/first", targetPortId: "b/first"},
        {id: "second", sourcePortId: "a/second", targetPortId: "b/second"},
      ],
    }
    const result = layoutCoffmanGraham(graph)

    expect(result.edges).toHaveLength(2)
    expect(result.edges[0]!.curves).not.toEqual(result.edges[1]!.curves)
    expect(new Set(result.edges.map(({curves}) => JSON.stringify(curves[0]!.startPoint))).size).toBe(2)
    expect(new Set(result.edges.map(({curves}) => JSON.stringify(curves.at(-1)!.endPoint))).size).toBe(2)
    expect(collinearEdgeOverlaps(result)).toEqual([])
  })

  test("rejects cycles before Coffman–Graham layering", () => {
    const graph: CoffmanGrahamLayoutGraph = {
      nodes: [{id: "a", width: 80, height: 40}, {id: "b", width: 80, height: 40}],
      ports: [
        {id: "a/in", nodeId: "a", x: 40},
        {id: "a/out", nodeId: "a", x: 40},
        {id: "b/in", nodeId: "b", x: 40},
        {id: "b/out", nodeId: "b", x: 40},
      ],
      edges: [
        {id: "a-b", sourcePortId: "a/out", targetPortId: "b/in"},
        {id: "b-a", sourcePortId: "b/out", targetPortId: "a/in"},
      ],
    }
    try {
      layoutCoffmanGraham(graph)
      throw new Error("Expected Coffman–Graham cycle error")
    } catch (error) {
      expect(error).toBeInstanceOf(CoffmanGrahamLayoutError)
      expect((error as CoffmanGrahamLayoutError).witness)
        .toEqual({nodeIds: ["a", "b"], edgeIds: ["a-b", "b-a"]})
    }
  })
})

function nodeOverlaps(result: CoffmanGrahamLayoutResult): string[] {
  const overlaps: string[] = []
  for (let leftIndex = 0; leftIndex < result.nodes.length; leftIndex += 1) {
    const left = result.nodes[leftIndex]!
    for (let rightIndex = leftIndex + 1; rightIndex < result.nodes.length; rightIndex += 1) {
      const right = result.nodes[rightIndex]!
      if (left.x < right.x + right.width && left.x + left.width > right.x &&
          left.y < right.y + right.height && left.y + left.height > right.y) {
        overlaps.push(`${left.id}/${right.id}`)
      }
    }
  }
  return overlaps
}

function curveNodeCrossings(result: CoffmanGrahamLayoutResult, graph: CoffmanGrahamLayoutGraph): string[] {
  const inputEdgeById = new Map(graph.edges.map((edge) => [edge.id, edge]))
  const inputPortById = new Map(graph.ports.map((port) => [port.id, port]))
  const crossings: string[] = []
  for (const edge of result.edges) {
    const input = inputEdgeById.get(edge.id)!
    const sourceNodeId = inputPortById.get(input.sourcePortId)!.nodeId
    const targetNodeId = inputPortById.get(input.targetPortId)!.nodeId
    for (const curve of edge.curves) {
      for (let sample = 1; sample < 64; sample += 1) {
        const position = cubicPoint(curve, sample / 64)
        for (const node of result.nodes) {
          if (node.id === sourceNodeId || node.id === targetNodeId) continue
          if (position.x > node.x && position.x < node.x + node.width &&
              position.y > node.y && position.y < node.y + node.height) {
            crossings.push(`${edge.id}/${node.id}`)
          }
        }
      }
    }
  }
  return [...new Set(crossings)].sort()
}

function horizontalSegments(result: CoffmanGrahamLayoutResult): string[] {
  return result.edges.flatMap((edge) => edge.curves.flatMap((curve, index) =>
    Math.abs(curve.endPoint.y - curve.startPoint.y) < 1e-7 ? [`${edge.id}/${index}`] : []))
}

function collinearEdgeOverlaps(result: CoffmanGrahamLayoutResult): string[] {
  const lines = result.edges.flatMap((edge) => edge.curves
    .filter((curve) => curveFlatness(curve) < 1e-5)
    .map((curve) => ({edgeId: edge.id, start: curve.startPoint, end: curve.endPoint})))
  const overlaps: string[] = []
  for (let leftIndex = 0; leftIndex < lines.length; leftIndex += 1) {
    const left = lines[leftIndex]!
    for (let rightIndex = leftIndex + 1; rightIndex < lines.length; rightIndex += 1) {
      const right = lines[rightIndex]!
      if (left.edgeId === right.edgeId || !collinear(left.start, left.end, right.start) ||
          !collinear(left.start, left.end, right.end)) continue
      const horizontal = Math.abs(left.end.x - left.start.x) >= Math.abs(left.end.y - left.start.y)
      const leftRange = horizontal ? [left.start.x, left.end.x] : [left.start.y, left.end.y]
      const rightRange = horizontal ? [right.start.x, right.end.x] : [right.start.y, right.end.y]
      const overlap = Math.min(Math.max(...leftRange), Math.max(...rightRange)) -
        Math.max(Math.min(...leftRange), Math.min(...rightRange))
      if (overlap > 1e-5) overlaps.push(`${left.edgeId}/${right.edgeId}`)
    }
  }
  return [...new Set(overlaps)].sort()
}

function cubicPoint(curve: CoffmanGrahamCurveSegment, t: number) {
  const u = 1 - t
  return {
    x: u ** 3 * curve.startPoint.x + 3 * u ** 2 * t * curve.controlPoints[0].x +
      3 * u * t ** 2 * curve.controlPoints[1].x + t ** 3 * curve.endPoint.x,
    y: u ** 3 * curve.startPoint.y + 3 * u ** 2 * t * curve.controlPoints[0].y +
      3 * u * t ** 2 * curve.controlPoints[1].y + t ** 3 * curve.endPoint.y,
  }
}

function curveFlatness(curve: CoffmanGrahamCurveSegment): number {
  const dx = curve.endPoint.x - curve.startPoint.x
  const dy = curve.endPoint.y - curve.startPoint.y
  const length = Math.hypot(dx, dy) || 1
  const distance = (point: Readonly<{x: number; y: number}>): number =>
    Math.abs(dy * point.x - dx * point.y +
      curve.endPoint.x * curve.startPoint.y - curve.endPoint.y * curve.startPoint.x) / length
  return Math.max(distance(curve.controlPoints[0]), distance(curve.controlPoints[1]))
}

function collinear(first: Readonly<{x: number; y: number}>, second: Readonly<{x: number; y: number}>, third: Readonly<{x: number; y: number}>): boolean {
  return Math.abs((second.x - first.x) * (third.y - first.y) -
    (second.y - first.y) * (third.x - first.x)) < 1e-5
}

function hash(value: unknown): string {
  return new Bun.CryptoHasher("sha256").update(JSON.stringify(value)).digest("hex")
}
