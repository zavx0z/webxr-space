import {describe, expect, test} from "bun:test"
import {TOP_DOWN_REFERENCE_GRAPH} from "../storybook/top-down-fixture.ts"
import {
  TopDownLayoutError,
  layoutTopDown,
  type TopDownLayoutGraph,
  type TopDownLayoutResult,
} from "./top-down.ts"

describe("isolated top-down DAG policy", () => {
  test("places the reference topology through exact SOUTH/NORTH ports", () => {
    const result = layoutTopDown(TOP_DOWN_REFERENCE_GRAPH)

    expect(result.direction).toBe("DOWN")
    expect(result.nodes).toHaveLength(19)
    expect(result.edges).toHaveLength(20)
    expect(result.ports.every(({side}) => side === "NORTH" || side === "SOUTH")).toBeTrue()
    expect(result.ports.filter(({side}) => side === "SOUTH")).not.toHaveLength(0)
    expect(result.ports.filter(({side}) => side === "NORTH")).not.toHaveLength(0)
    expect(nodeOverlaps(result)).toEqual([])
    expect(nonOrthogonalSegments(result)).toEqual([])
    expect(nodeInteriorCrossings(result)).toEqual([])

    const nodeById = new Map(result.nodes.map((node) => [node.id, node]))
    const portById = new Map(result.ports.map((port) => [port.id, port]))
    for (const edge of TOP_DOWN_REFERENCE_GRAPH.edges) {
      const source = portById.get(edge.sourcePortId)!
      const target = portById.get(edge.targetPortId)!
      const sourceNode = nodeById.get(edge.sourcePortId.slice(0, -4))!
      const targetNode = nodeById.get(edge.targetPortId.slice(0, -3))!
      expect(source.side).toBe("SOUTH")
      expect(source.y).toBe(sourceNode.y + sourceNode.height)
      expect(target.side).toBe("NORTH")
      expect(target.y).toBe(targetNode.y)
    }
  })

  test("is invariant to input collection order", () => {
    const first = layoutTopDown(TOP_DOWN_REFERENCE_GRAPH)
    const permuted = layoutTopDown({
      ...TOP_DOWN_REFERENCE_GRAPH,
      nodes: [...TOP_DOWN_REFERENCE_GRAPH.nodes].reverse(),
      ports: [...TOP_DOWN_REFERENCE_GRAPH.ports].reverse(),
      edges: [...TOP_DOWN_REFERENCE_GRAPH.edges].reverse(),
    })

    expect(permuted).toEqual(first)
  })

  test("uses compact local channels for long edges without dummy output", () => {
    const result = layoutTopDown(TOP_DOWN_REFERENCE_GRAPH)
    const longRoutes = result.edges.filter(({sections}) => sections[0]!.bendPoints.length >= 4)
    const compact = result.edges.find(({id}) => id === "flow-12-ui-layout-panel-ui-button")!
    const compactPoints = [compact.sections[0]!.startPoint, ...compact.sections[0]!.bendPoints, compact.sections[0]!.endPoint]

    expect(longRoutes.length).toBeGreaterThan(0)
    expect(compactPoints).toEqual([
      {x: 357, y: 998},
      {x: 357, y: 1170},
      {x: 514, y: 1170},
      {x: 514, y: 1202},
    ])
    expect(result.bounds.width).toBe(1028)
    expect(result.nodes.map(({id}) => id).sort()).toEqual(
      TOP_DOWN_REFERENCE_GRAPH.nodes.map(({id}) => id).sort(),
    )
    for (const edge of longRoutes) {
      const points = [edge.sections[0]!.startPoint, ...edge.sections[0]!.bendPoints, edge.sections[0]!.endPoint]
      const vertical = points.slice(1).find((point, index) => {
        const previous = points[index]!
        return previous.x === point.x && Math.abs(point.y - previous.y) > 64
      })
      expect(vertical).toBeDefined()
    }
  })

  test("uses an external lane only when an intermediate rank blocks every local channel", () => {
    const graph: TopDownLayoutGraph = {
      nodes: [
        {id: "source", width: 100, height: 50},
        {id: "blocker", width: 300, height: 60},
        {id: "target", width: 100, height: 50},
      ],
      ports: [
        {id: "source/out", nodeId: "source", x: 50},
        {id: "blocker/in", nodeId: "blocker", x: 150},
        {id: "blocker/out", nodeId: "blocker", x: 150},
        {id: "target/in", nodeId: "target", x: 50},
      ],
      edges: [
        {id: "source-blocker", sourcePortId: "source/out", targetPortId: "blocker/in"},
        {id: "blocker-target", sourcePortId: "blocker/out", targetPortId: "target/in"},
        {id: "source-target", sourcePortId: "source/out", targetPortId: "target/in"},
      ],
    }
    const result = layoutTopDown(graph)
    const route = result.edges.find(({id}) => id === "source-target")!
    const points = [route.sections[0]!.startPoint, ...route.sections[0]!.bendPoints, route.sections[0]!.endPoint]
    const left = Math.min(...result.nodes.map(({x}) => x))
    const right = Math.max(...result.nodes.map(({x, width}) => x + width))
    const external = points.find(({x}) => x < left || x > right)

    expect(external).toBeDefined()
    expect(nodeInteriorCrossings(result)).toEqual([])
  })

  test("supports disconnected roots and an isolated node", () => {
    const graph: TopDownLayoutGraph = {
      nodes: [
        {id: "a", width: 80, height: 40},
        {id: "b", width: 80, height: 40},
        {id: "c", width: 80, height: 40},
        {id: "isolated", width: 90, height: 44},
      ],
      ports: [
        {id: "a/out", nodeId: "a", x: 40},
        {id: "b/in", nodeId: "b", x: 40},
      ],
      edges: [{id: "a-b", sourcePortId: "a/out", targetPortId: "b/in"}],
    }
    const result = layoutTopDown(graph)

    expect(result.nodes).toHaveLength(4)
    expect(nodeOverlaps(result)).toEqual([])
    expect(result.nodes.find(({id}) => id === "b")!.y)
      .toBeGreaterThan(result.nodes.find(({id}) => id === "a")!.y)
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
        {id: "b/out", nodeId: "b", x: 40},
        {id: "downstream/in", nodeId: "downstream", x: 40},
      ],
      edges: [
        {id: "a-b", sourcePortId: "a/out", targetPortId: "b/in"},
        {id: "b-a", sourcePortId: "b/out", targetPortId: "a/in"},
        {id: "b-downstream", sourcePortId: "b/out", targetPortId: "downstream/in"},
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

  test("fails closed for invalid endpoints, offsets and mixed port roles", () => {
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

function nonOrthogonalSegments(result: TopDownLayoutResult): string[] {
  return result.edges.flatMap((edge) => {
    const section = edge.sections[0]!
    const points = [section.startPoint, ...section.bendPoints, section.endPoint]
    return points.slice(1).flatMap((point, index) => {
      const previous = points[index]!
      return previous.x !== point.x && previous.y !== point.y ? [`${edge.id}:${index}`] : []
    })
  })
}

function nodeInteriorCrossings(result: TopDownLayoutResult): string[] {
  const crossings: string[] = []
  for (const edge of result.edges) {
    const section = edge.sections[0]!
    const points = [section.startPoint, ...section.bendPoints, section.endPoint]
    for (let index = 1; index < points.length; index += 1) {
      const from = points[index - 1]!
      const to = points[index]!
      for (const node of result.nodes) {
        const horizontal = from.y === to.y && from.y > node.y && from.y < node.y + node.height &&
          Math.max(Math.min(from.x, to.x), node.x) < Math.min(Math.max(from.x, to.x), node.x + node.width)
        const vertical = from.x === to.x && from.x > node.x && from.x < node.x + node.width &&
          Math.max(Math.min(from.y, to.y), node.y) < Math.min(Math.max(from.y, to.y), node.y + node.height)
        if (horizontal || vertical) crossings.push(`${edge.id}/${node.id}/${index}`)
      }
    }
  }
  return crossings
}
