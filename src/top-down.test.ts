import {describe, expect, test} from "bun:test"
import {TOP_DOWN_REFERENCE_GRAPH} from "../storybook/top-down-fixture.ts"
import {
  TopDownLayoutError,
  layoutTopDown,
  type TopDownCurveSegment,
  type TopDownLayoutGraph,
  type TopDownLayoutResult,
} from "./top-down.ts"

describe("non-layered top-down spline policy", () => {
  test("lays out the reference as a tidy variable-size forest with one spline type", () => {
    const result = layoutTopDown(TOP_DOWN_REFERENCE_GRAPH)
    const inputEdgeById = new Map(TOP_DOWN_REFERENCE_GRAPH.edges.map((edge) => [edge.id, edge]))
    const portById = new Map(result.ports.map((port) => [port.id, port]))

    expect(result.direction).toBe("DOWN")
    expect(result.nodes).toHaveLength(19)
    expect(result.edges).toHaveLength(20)
    expect(result.edges.every(({curves}) => curves.length > 0)).toBeTrue()
    expect(nodeOverlaps(result)).toEqual([])
    expect(curveNodeCrossings(result, TOP_DOWN_REFERENCE_GRAPH)).toEqual([])

    for (const edge of result.edges) {
      const input = inputEdgeById.get(edge.id)!
      const source = portById.get(input.sourcePortId)!
      const target = portById.get(input.targetPortId)!
      expect(edge.curves[0]!.startPoint).toEqual({x: source.x, y: source.y})
      expect(edge.curves.at(-1)!.endPoint).toEqual({x: target.x, y: target.y})
      expect(target.y).toBeGreaterThan(source.y)
      expect(isContinuousSpline(edge.curves)).toBeTrue()
      expect(edge.curves[0]!.controlPoints[0].x).toBeCloseTo(source.x, 6)
      expect(edge.curves.at(-1)!.controlPoints[1].x).toBeCloseTo(target.x, 6)
    }

    const distinctTops = new Set(result.nodes.map(({y}) => y))
    expect(distinctTops.size).toBeGreaterThan(7)
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

  test("uses overlay relations as weak flow constraints without restoring global ranks", () => {
    const base: TopDownLayoutGraph = {
      nodes: [
        {id: "root", width: 120, height: 50},
        {id: "short", width: 100, height: 40},
        {id: "tall", width: 100, height: 90},
        {id: "short-leaf", width: 100, height: 40},
        {id: "tall-leaf", width: 100, height: 40},
      ],
      ports: [
        {id: "root/short", nodeId: "root", x: 45},
        {id: "root/tall", nodeId: "root", x: 75},
        {id: "short/in", nodeId: "short", x: 50},
        {id: "short/out", nodeId: "short", x: 50},
        {id: "short/overlay", nodeId: "short", x: 65},
        {id: "tall/in", nodeId: "tall", x: 50},
        {id: "tall/out", nodeId: "tall", x: 50},
        {id: "short-leaf/in", nodeId: "short-leaf", x: 50},
        {id: "tall-leaf/in", nodeId: "tall-leaf", x: 50},
        {id: "tall-leaf/overlay-in", nodeId: "tall-leaf", x: 65},
      ],
      edges: [
        {constraint: true, id: "root-short", sourcePortId: "root/short", targetPortId: "short/in"},
        {constraint: true, id: "root-tall", sourcePortId: "root/tall", targetPortId: "tall/in"},
        {constraint: true, id: "short-leaf", sourcePortId: "short/out", targetPortId: "short-leaf/in"},
        {constraint: true, id: "tall-leaf", sourcePortId: "tall/out", targetPortId: "tall-leaf/in"},
      ],
      layoutOptions: {nodeSpacing: 32, layerSpacing: 48, edgeSpacing: 12, padding: 24},
    }
    const tree = layoutTopDown(base)
    const overlay = layoutTopDown({
      ...base,
      edges: [...base.edges, {
        constraint: false,
        id: "overlay",
        sourcePortId: "short/overlay",
        targetPortId: "tall-leaf/overlay-in",
      }],
    })

    expect(nodeOverlaps(overlay)).toEqual([])
    expect(new Set(overlay.nodes.map(({y}) => y)).size).toBeGreaterThan(3)
    expect(tree.nodes.find(({id}) => id === "short-leaf")!.y)
      .toBeLessThan(tree.nodes.find(({id}) => id === "tall-leaf")!.y)
    const overlayEdge = overlay.edges.find(({id}) => id === "overlay")!
    expect(overlayEdge.curves.at(-1)!.endPoint.y).toBeGreaterThan(overlayEdge.curves[0]!.startPoint.y)
  })

  test("routes blocked fan-out through smooth obstacle-free spline chains", () => {
    const graph: TopDownLayoutGraph = {
      nodes: [
        {id: "root", width: 140, height: 60},
        {id: "blocker", width: 360, height: 100},
        {id: "left", width: 100, height: 50},
        {id: "right", width: 100, height: 50},
      ],
      ports: [
        {id: "root/tree", nodeId: "root", x: 70},
        {id: "root/overlay-left", nodeId: "root", x: 45},
        {id: "root/overlay-right", nodeId: "root", x: 95},
        {id: "blocker/in", nodeId: "blocker", x: 180},
        {id: "blocker/left", nodeId: "blocker", x: 130},
        {id: "blocker/right", nodeId: "blocker", x: 230},
        {id: "left/tree-in", nodeId: "left", x: 40},
        {id: "left/overlay-in", nodeId: "left", x: 65},
        {id: "right/tree-in", nodeId: "right", x: 40},
        {id: "right/overlay-in", nodeId: "right", x: 65},
      ],
      edges: [
        {constraint: true, id: "root-blocker", sourcePortId: "root/tree", targetPortId: "blocker/in"},
        {constraint: true, id: "blocker-left", sourcePortId: "blocker/left", targetPortId: "left/tree-in"},
        {constraint: true, id: "blocker-right", sourcePortId: "blocker/right", targetPortId: "right/tree-in"},
        {constraint: false, id: "overlay-left", sourcePortId: "root/overlay-left", targetPortId: "left/overlay-in"},
        {constraint: false, id: "overlay-right", sourcePortId: "root/overlay-right", targetPortId: "right/overlay-in"},
      ],
      layoutOptions: {nodeSpacing: 32, layerSpacing: 48, edgeSpacing: 12, padding: 24},
    }
    const result = layoutTopDown(graph)
    const overlays = result.edges.filter(({id}) => id.startsWith("overlay"))

    expect(overlays.every(({curves}) => curves.length > 0 && isContinuousSpline(curves))).toBeTrue()
    expect(new Set(overlays.map(({curves}) => JSON.stringify(curves[0]!.startPoint))).size).toBe(2)
    expect(curveNodeCrossings(result, graph)).toEqual([])
  })

  test("rejects multiple constrained parents instead of silently choosing one", () => {
    const graph: TopDownLayoutGraph = {
      nodes: [
        {id: "a", width: 80, height: 40},
        {id: "b", width: 80, height: 40},
        {id: "target", width: 80, height: 40},
      ],
      ports: [
        {id: "a/out", nodeId: "a", x: 40},
        {id: "b/out", nodeId: "b", x: 40},
        {id: "target/a-in", nodeId: "target", x: 25},
        {id: "target/b-in", nodeId: "target", x: 55},
      ],
      edges: [
        {constraint: true, id: "a-target", sourcePortId: "a/out", targetPortId: "target/a-in"},
        {constraint: true, id: "b-target", sourcePortId: "b/out", targetPortId: "target/b-in"},
      ],
    }

    expect(() => layoutTopDown(graph)).toThrow("multiple parents")
  })

  test("rejects a duplicate constrained parent relation", () => {
    const graph: TopDownLayoutGraph = {
      nodes: [{id: "a", width: 80, height: 40}, {id: "b", width: 80, height: 40}],
      ports: [
        {id: "a/first", nodeId: "a", x: 25},
        {id: "a/second", nodeId: "a", x: 55},
        {id: "b/first", nodeId: "b", x: 25},
        {id: "b/second", nodeId: "b", x: 55},
      ],
      edges: [
        {constraint: true, id: "first", sourcePortId: "a/first", targetPortId: "b/first"},
        {constraint: true, id: "second", sourcePortId: "a/second", targetPortId: "b/second"},
      ],
    }

    expect(() => layoutTopDown(graph)).toThrow("multiple parents")
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
        {constraint: true, id: "a-b", sourcePortId: "a/out", targetPortId: "b/in"},
        {constraint: true, id: "b-a", sourcePortId: "b/to-a", targetPortId: "a/in"},
        {constraint: false, id: "b-downstream", sourcePortId: "b/to-downstream", targetPortId: "downstream/in"},
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

  test("fails closed for invalid offsets, endpoints and mixed port roles", () => {
    expect(() => layoutTopDown({
      nodes: [{id: "a", width: 80, height: 40}],
      ports: [{id: "a/out", nodeId: "a", x: 81}],
      edges: [],
    })).toThrow("outside node width")
    expect(() => layoutTopDown({
      nodes: [{id: "a", width: 80, height: 40}],
      ports: [],
      edges: [{constraint: true, id: "missing", sourcePortId: "missing/out", targetPortId: "missing/in"}],
    })).toThrow("Unknown top-down source port")
    expect(() => layoutTopDown({
      nodes: [{id: "a", width: 80, height: 40}, {id: "b", width: 80, height: 40}],
      ports: [{id: "shared", nodeId: "a", x: 40}, {id: "b/in", nodeId: "b", x: 40}],
      edges: [
        {constraint: true, id: "forward", sourcePortId: "shared", targetPortId: "b/in"},
        {constraint: false, id: "reverse", sourcePortId: "b/in", targetPortId: "shared"},
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
        {constraint: true, id: "left", sourcePortId: "source/out", targetPortId: "left/in"},
        {constraint: true, id: "right", sourcePortId: "source/out", targetPortId: "right/in"},
      ],
    })).toThrow("reused by multiple edges")
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
        const point = cubicPoint(curve, sample / 24)
        for (const node of result.nodes) {
          if (node.id === sourceNodeId || node.id === targetNodeId) continue
          if (point.x > node.x && point.x < node.x + node.width &&
              point.y > node.y && point.y < node.y + node.height) {
            crossings.push(`${edge.id}/${node.id}`)
          }
        }
      }
    }
  }
  return [...new Set(crossings)].sort()
}

function isContinuousSpline(curves: readonly TopDownCurveSegment[]): boolean {
  for (let index = 1; index < curves.length; index += 1) {
    const previous = curves[index - 1]!
    const current = curves[index]!
    if (previous.endPoint.x !== current.startPoint.x || previous.endPoint.y !== current.startPoint.y) return false
    const incoming = {
      x: previous.endPoint.x - previous.controlPoints[1].x,
      y: previous.endPoint.y - previous.controlPoints[1].y,
    }
    const outgoing = {
      x: current.controlPoints[0].x - current.startPoint.x,
      y: current.controlPoints[0].y - current.startPoint.y,
    }
    if (Math.abs(incoming.x - outgoing.x) > 1e-6 || Math.abs(incoming.y - outgoing.y) > 1e-6) return false
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
