import {describe, expect, test} from "bun:test"
import {TOP_DOWN_REFERENCE_GRAPH} from "../storybook/top-down-fixture.ts"
import {
  TopDownLayoutError,
  layoutTopDown,
  type TopDownCurveSegment,
  type TopDownLayoutGraph,
  type TopDownLayoutResult,
} from "./top-down.ts"

describe("Codex-compatible Dagre top-down policy", () => {
  test("uses one independent rounded-corner cubic pipeline for the reference", () => {
    const result = layoutTopDown(TOP_DOWN_REFERENCE_GRAPH)
    const inputEdgeById = new Map(TOP_DOWN_REFERENCE_GRAPH.edges.map((edge) => [edge.id, edge]))
    const portById = new Map(result.ports.map((port) => [port.id, port]))

    expect(result.direction).toBe("DOWN")
    expect(result.nodes).toHaveLength(19)
    expect(result.edges).toHaveLength(20)
    expect(result.ports).toHaveLength(40)
    expect(result.edges.every(({curves}) => curves.length > 0)).toBeTrue()
    expect(result.edges.some(({curves}) => curves.length > 1)).toBeTrue()
    expect(result.edges.some(({curves}) => curves.some((curve) => curveFlatness(curve) <= 1e-5))).toBeTrue()
    expect(result.edges.some(({curves}) => curves.some((curve) => curveFlatness(curve) > 1e-5))).toBeTrue()
    expect(nodeOverlaps(result)).toEqual([])
    expect(curveNodeCrossings(result, TOP_DOWN_REFERENCE_GRAPH)).toEqual([])
    expect(collinearEdgeOverlaps(result)).toEqual([])
    expect(nonMonotoneCurveSegments(result)).toEqual([])

    const sourceEndpoints = new Set<string>()
    const targetEndpoints = new Set<string>()
    for (const edge of result.edges) {
      const input = inputEdgeById.get(edge.id)!
      const source = portById.get(input.sourcePortId)!
      const target = portById.get(input.targetPortId)!
      expect(edge.curves[0]!.startPoint).toEqual({x: source.x, y: source.y})
      expect(edge.curves.at(-1)!.endPoint).toEqual({x: target.x, y: target.y})
      expect(target.y).toBeGreaterThan(source.y)
      expect(isContinuousCubicChain(edge.curves)).toBeTrue()
      sourceEndpoints.add(JSON.stringify(edge.curves[0]!.startPoint))
      targetEndpoints.add(JSON.stringify(edge.curves.at(-1)!.endPoint))
    }
    expect(sourceEndpoints.size).toBe(result.edges.length)
    expect(targetEndpoints.size).toBe(result.edges.length)
    expect(new Set(result.nodes.map(({y}) => y)).size).toBeGreaterThan(7)
  })

  test("is invariant to node, port and edge input order", () => {
    const first = layoutTopDown(TOP_DOWN_REFERENCE_GRAPH)
    const permuted = layoutTopDown({
      ...TOP_DOWN_REFERENCE_GRAPH,
      nodes: [...TOP_DOWN_REFERENCE_GRAPH.nodes].reverse(),
      ports: [...TOP_DOWN_REFERENCE_GRAPH.ports].reverse(),
      edges: [...TOP_DOWN_REFERENCE_GRAPH.edges].reverse(),
    })

    expect(permuted).toEqual(first)
  })

  test("supports ordinary fan-in without relation subtypes", () => {
    const graph: TopDownLayoutGraph = {
      nodes: [
        {id: "a", width: 80, height: 40},
        {id: "b", width: 80, height: 40},
        {id: "target", width: 100, height: 50},
        {id: "leaf", width: 80, height: 40},
      ],
      ports: [
        {id: "a/out", nodeId: "a", x: 40},
        {id: "b/out", nodeId: "b", x: 40},
        {id: "target/a-in", nodeId: "target", x: 30},
        {id: "target/b-in", nodeId: "target", x: 70},
        {id: "target/out", nodeId: "target", x: 50},
        {id: "leaf/in", nodeId: "leaf", x: 40},
      ],
      edges: [
        {id: "a-target", sourcePortId: "a/out", targetPortId: "target/a-in"},
        {id: "b-target", sourcePortId: "b/out", targetPortId: "target/b-in"},
        {id: "target-leaf", sourcePortId: "target/out", targetPortId: "leaf/in"},
      ],
    }
    const result = layoutTopDown(graph)

    expect(nodeOverlaps(result)).toEqual([])
    expect(curveNodeCrossings(result, graph)).toEqual([])
    expect(result.edges.map(({id}) => id)).toEqual(["a-target", "b-target", "target-leaf"])
    expect(result.nodes.find(({id}) => id === "target")!.y)
      .toBeGreaterThan(result.nodes.find(({id}) => id === "a")!.y)
    expect(result.nodes.find(({id}) => id === "leaf")!.y)
      .toBeGreaterThan(result.nodes.find(({id}) => id === "target")!.y)
  })

  test("keeps parallel semantic edges independent in the Dagre multigraph", () => {
    const graph: TopDownLayoutGraph = {
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
    const result = layoutTopDown(graph)

    expect(result.edges).toHaveLength(2)
    expect(result.edges[0]!.curves).not.toEqual(result.edges[1]!.curves)
    expect(new Set(result.edges.map(({curves}) => JSON.stringify(curves[0]!.startPoint))).size).toBe(2)
    expect(new Set(result.edges.map(({curves}) => JSON.stringify(curves.at(-1)!.endPoint))).size).toBe(2)
  })

  test("rejects a cycle before placement with a stable witness", () => {
    const graph: TopDownLayoutGraph = {
      nodes: [
        {id: "a", width: 80, height: 40},
        {id: "b", width: 80, height: 40},
        {id: "downstream", width: 80, height: 40},
      ],
      ports: [
        {id: "a/in", nodeId: "a", x: 40},
        {id: "a/out", nodeId: "a", x: 40},
        {id: "b/in", nodeId: "b", x: 40},
        {id: "b/to-a", nodeId: "b", x: 25},
        {id: "b/to-downstream", nodeId: "b", x: 55},
        {id: "downstream/in", nodeId: "downstream", x: 40},
      ],
      edges: [
        {id: "a-b", sourcePortId: "a/out", targetPortId: "b/in"},
        {id: "b-a", sourcePortId: "b/to-a", targetPortId: "a/in"},
        {id: "b-downstream", sourcePortId: "b/to-downstream", targetPortId: "downstream/in"},
      ],
    }

    try {
      layoutTopDown(graph)
      throw new Error("Expected a cycle error")
    } catch (error) {
      expect(error).toBeInstanceOf(TopDownLayoutError)
      const typed = error as TopDownLayoutError
      expect(typed.code).toBe("CYCLE_DETECTED")
      expect(typed.witness).toEqual({nodeIds: ["a", "b"], edgeIds: ["a-b", "b-a"]})
    }
  })

  test("fails closed for legacy edge classes, invalid endpoints and reused ports", () => {
    expect(() => layoutTopDown({
      nodes: [{id: "a", width: 80, height: 40}],
      ports: [{id: "a/out", nodeId: "a", x: 81}],
      edges: [],
    })).toThrow("outside node width")
    expect(() => layoutTopDown({
      nodes: [{id: "a", width: 80, height: 40}],
      ports: [],
      edges: [{id: "missing", sourcePortId: "missing/out", targetPortId: "missing/in"}],
    })).toThrow("Unknown top-down source port")
    expect(() => layoutTopDown({
      nodes: [{id: "a", width: 80, height: 40}, {id: "b", width: 80, height: 40}],
      ports: [{id: "shared", nodeId: "a", x: 40}, {id: "b/in", nodeId: "b", x: 40}],
      edges: [
        {id: "forward", sourcePortId: "shared", targetPortId: "b/in"},
        {id: "reverse", sourcePortId: "b/in", targetPortId: "shared"},
      ],
    })).toThrow("conflicting edge roles")
    expect(() => layoutTopDown({
      nodes: [
        {id: "source", width: 80, height: 40},
        {id: "left", width: 80, height: 40},
        {id: "right", width: 80, height: 40},
      ],
      ports: [
        {id: "source/out", nodeId: "source", x: 40},
        {id: "left/in", nodeId: "left", x: 40},
        {id: "right/in", nodeId: "right", x: 40},
      ],
      edges: [
        {id: "left", sourcePortId: "source/out", targetPortId: "left/in"},
        {id: "right", sourcePortId: "source/out", targetPortId: "right/in"},
      ],
    })).toThrow("reused by multiple edges")
    expect(() => layoutTopDown({
      nodes: [{id: "a", width: 80, height: 40}, {id: "b", width: 80, height: 40}],
      ports: [{id: "a/out", nodeId: "a", x: 40}, {id: "b/in", nodeId: "b", x: 40}],
      edges: [{constraint: true, id: "legacy", sourcePortId: "a/out", targetPortId: "b/in"}],
    } as unknown as TopDownLayoutGraph)).toThrow("one semantic type")
  })

  test("rejects graphs outside the frozen production budget before placement", () => {
    expect(() => layoutTopDown({
      nodes: Array.from({length: 129}, (_, index) => ({id: `node-${index}`, width: 20, height: 20})),
      ports: [],
      edges: [],
    })).toThrow("bounded policy budget")
  })
})

function nodeOverlaps(result: TopDownLayoutResult): string[] {
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

function curveNodeCrossings(result: TopDownLayoutResult, graph: TopDownLayoutGraph): string[] {
  const inputEdgeById = new Map(graph.edges.map((edge) => [edge.id, edge]))
  const inputPortById = new Map(graph.ports.map((port) => [port.id, port]))
  const crossings: string[] = []
  for (const edge of result.edges) {
    const input = inputEdgeById.get(edge.id)!
    const sourceNodeId = inputPortById.get(input.sourcePortId)!.nodeId
    const targetNodeId = inputPortById.get(input.targetPortId)!.nodeId
    for (const curve of edge.curves) {
      for (let sample = 1; sample < 24; sample += 1) {
        const curvePoint = cubicPoint(curve, sample / 24)
        for (const node of result.nodes) {
          if (node.id === sourceNodeId || node.id === targetNodeId) continue
          if (curvePoint.x > node.x && curvePoint.x < node.x + node.width &&
              curvePoint.y > node.y && curvePoint.y < node.y + node.height) {
            crossings.push(`${edge.id}/${node.id}`)
          }
        }
      }
    }
  }
  return [...new Set(crossings)].sort()
}

function collinearEdgeOverlaps(result: TopDownLayoutResult): string[] {
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

function nonMonotoneCurveSegments(result: TopDownLayoutResult): string[] {
  return result.edges.flatMap((edge) => edge.curves.flatMap((curve, index) =>
    curve.startPoint.y + 1e-7 < curve.controlPoints[0].y &&
    curve.controlPoints[0].y + 1e-7 < curve.controlPoints[1].y &&
    curve.controlPoints[1].y + 1e-7 < curve.endPoint.y
      ? []
      : [`${edge.id}/${index}`]))
}

function isContinuousCubicChain(curves: readonly TopDownCurveSegment[]): boolean {
  for (let index = 1; index < curves.length; index += 1) {
    const previous = curves[index - 1]!
    const current = curves[index]!
    if (!samePoint(previous.endPoint, current.startPoint)) return false
    const incoming = {
      x: previous.endPoint.x - previous.controlPoints[1].x,
      y: previous.endPoint.y - previous.controlPoints[1].y,
    }
    const outgoing = {
      x: current.controlPoints[0].x - current.startPoint.x,
      y: current.controlPoints[0].y - current.startPoint.y,
    }
    if (!samePoint(incoming, outgoing, 1e-5)) return false
  }
  return true
}

function cubicPoint(curve: TopDownCurveSegment, t: number) {
  const u = 1 - t
  return {
    x: u ** 3 * curve.startPoint.x + 3 * u ** 2 * t * curve.controlPoints[0].x +
      3 * u * t ** 2 * curve.controlPoints[1].x + t ** 3 * curve.endPoint.x,
    y: u ** 3 * curve.startPoint.y + 3 * u ** 2 * t * curve.controlPoints[0].y +
      3 * u * t ** 2 * curve.controlPoints[1].y + t ** 3 * curve.endPoint.y,
  }
}

function curveFlatness(curve: TopDownCurveSegment): number {
  const dx = curve.endPoint.x - curve.startPoint.x
  const dy = curve.endPoint.y - curve.startPoint.y
  const length = Math.hypot(dx, dy) || 1
  const distance = (curvePoint: Readonly<{x: number; y: number}>): number =>
    Math.abs(dy * curvePoint.x - dx * curvePoint.y +
      curve.endPoint.x * curve.startPoint.y - curve.endPoint.y * curve.startPoint.x) / length
  return Math.max(distance(curve.controlPoints[0]), distance(curve.controlPoints[1]))
}

function collinear(first: Readonly<{x: number; y: number}>, second: Readonly<{x: number; y: number}>, third: Readonly<{x: number; y: number}>): boolean {
  return Math.abs((second.x - first.x) * (third.y - first.y) -
    (second.y - first.y) * (third.x - first.x)) < 1e-5
}

function samePoint(
  left: Readonly<{x: number; y: number}>,
  right: Readonly<{x: number; y: number}>,
  epsilon = 1e-7,
): boolean {
  return Math.abs(left.x - right.x) <= epsilon && Math.abs(left.y - right.y) <= epsilon
}
