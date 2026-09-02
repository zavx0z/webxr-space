import {describe, expect, test} from "bun:test"
import {TOP_DOWN_DENSE_GRAPH} from "../storybook/top-down-dense-fixture.ts"
import {
  CoffmanGrahamLayoutError,
  layoutCoffmanGraham,
  type CoffmanGrahamCurveSegment,
  type CoffmanGrahamLayoutGraph,
  type CoffmanGrahamLayoutResult,
} from "./coffman-graham.ts"

const DENSE_GRAPH: CoffmanGrahamLayoutGraph = TOP_DOWN_DENSE_GRAPH

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
    expect(result.bounds).toEqual({x: 0, y: 0, width: 3372, height: 3681.9360215})
    expect(result.bounds.width / result.bounds.height).toBeLessThan(2)
    expect(sourceEndpoints.size).toBe(result.edges.length)
    expect(targetEndpoints.size).toBe(result.edges.length)
    expect(result.edges.every(({curves}) => {
      const terminal = curves[0]!
      return Math.abs(terminal.startPoint.x - terminal.endPoint.x) <= 1e-7 &&
        terminal.endPoint.y - terminal.startPoint.y >= DENSE_GRAPH.layoutOptions!.edgeSpacing!
    })).toBeTrue()
    expect(result.edges.every(({curves}) => {
      const terminal = curves.at(-1)!
      return Math.abs(terminal.startPoint.x - terminal.endPoint.x) <= 1e-7 &&
        terminal.endPoint.y - terminal.startPoint.y >=
          DENSE_GRAPH.layoutOptions!.edgeSpacing! * 8 - 5
    })).toBeTrue()
    expect(nodeOverlaps(result)).toEqual([])
    expect(curveNodeCrossings(result, DENSE_GRAPH)).toEqual([])
    expect(horizontalSegments(result)).toEqual([])
    expect(result.crossings).toHaveLength(192)
    expect(result.crossings.some(({overEdgeId, underEdgeId}) => {
      const ids = new Set([overEdgeId, underEdgeId])
      return ids.has("flow-046-rank-5-node-00-rank-6-node-00") &&
        ids.has("flow-083-rank-0-node-04-rank-6-node-00")
    })).toBeFalse()
    expect(result.crossings.length).toBeGreaterThanOrEqual(edgeSectionCrossingKeys(result).length)
    expect(terminalCrossingViolations(
      result,
      DENSE_GRAPH,
      DENSE_GRAPH.layoutOptions!.edgeSpacing! * 6,
    )).toEqual([])
    expect(collinearEdgeOverlaps(result)).toEqual([])
    expect(diagonalClearanceViolations(
      result,
      DENSE_GRAPH.layoutOptions!.edgeSpacing!,
    )).toEqual([])
    expect(hash(result)).toBe("3af3d3c4e0087f45b6761db78980a1c91b5f10c020cdae56c67df6f133fe634b")
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

  test("orders port slots by adjacent connections", () => {
    const graph: CoffmanGrahamLayoutGraph = {
      nodes: [
        {id: "a", width: 100, height: 40},
        {id: "b", width: 100, height: 40},
        {id: "c", width: 120, height: 50},
      ],
      ports: [
        {id: "a/out", nodeId: "a", x: 50},
        {id: "b/out", nodeId: "b", x: 50},
        {id: "c/from-a", nodeId: "c", x: 20},
        {id: "c/from-b", nodeId: "c", x: 100},
      ],
      edges: [
        {id: "a-c", sourcePortId: "a/out", targetPortId: "c/from-a"},
        {id: "b-c", sourcePortId: "b/out", targetPortId: "c/from-b"},
      ],
    }
    const result = layoutCoffmanGraham(graph)
    const target = result.nodes.find(({id}) => id === "c")!
    const port = new Map(result.ports.map((value) => [value.id, value]))

    expect(port.get("c/from-a")!.x).toBeGreaterThan(port.get("c/from-b")!.x)
    expect([
      port.get("c/from-a")!.x - target.x,
      port.get("c/from-b")!.x - target.x,
    ].sort((left, right) => left - right)).toEqual([20, 100])
    expect(result.crossings).toEqual([])
  })

  test("fails closed for overlapping port-order slots", () => {
    const graph: CoffmanGrahamLayoutGraph = {
      nodes: [
        {id: "a", width: 100, height: 40},
        {id: "b", width: 100, height: 40},
        {id: "c", width: 100, height: 40},
      ],
      ports: [
        {id: "a/out", nodeId: "a", x: 50},
        {id: "b/out", nodeId: "b", x: 50},
        {id: "c/first", nodeId: "c", x: 50},
        {id: "c/second", nodeId: "c", x: 50},
      ],
      edges: [
        {id: "a-c", sourcePortId: "a/out", targetPortId: "c/first"},
        {id: "b-c", sourcePortId: "b/out", targetPortId: "c/second"},
      ],
    }
    expect(() => layoutCoffmanGraham(graph)).toThrow("port slots overlap: c/NORTH")
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

function edgeSectionCrossingKeys(result: CoffmanGrahamLayoutResult): string[] {
  const lines = result.edges.flatMap((edge) => edge.curves.flatMap((curve) =>
    curveFlatness(curve) < 1e-5
      ? [{edgeId: edge.id, start: curve.startPoint, end: curve.endPoint}]
      : []))
  const crossings: string[] = []
  for (let leftIndex = 0; leftIndex < lines.length; leftIndex += 1) {
    const left = lines[leftIndex]!
    for (let rightIndex = leftIndex + 1; rightIndex < lines.length; rightIndex += 1) {
      const right = lines[rightIndex]!
      if (left.edgeId === right.edgeId) continue
      const intersection = openSegmentIntersection(left.start, left.end, right.start, right.end)
      if (intersection !== null) {
        crossings.push(crossingKey(left.edgeId, right.edgeId, intersection))
      }
    }
  }
  return crossings.sort()
}

function terminalCrossingViolations(
  result: CoffmanGrahamLayoutResult,
  graph: CoffmanGrahamLayoutGraph,
  minimum: number,
): string[] {
  const portYById = new Map(result.ports.map(({id, y}) => [id, y]))
  const targetYByEdgeId = new Map(graph.edges.map(({id, targetPortId}) => [
    id,
    portYById.get(targetPortId)!,
  ]))
  return result.crossings.flatMap(({overEdgeId, underEdgeId, point}) =>
    [overEdgeId, underEdgeId].flatMap((edgeId) => {
      const distance = targetYByEdgeId.get(edgeId)! - point.y
      return distance > 1e-7 && distance < minimum - 1e-7
        ? [`${edgeId}:${distance.toFixed(6)}`]
        : []
    })).sort()
}

function crossingKey(
  firstEdgeId: string,
  secondEdgeId: string,
  point: Readonly<{x: number; y: number}>,
): string {
  const [first, second] = [firstEdgeId, secondEdgeId].sort()
  return `${first}:${second}:${point.x.toFixed(3)},${point.y.toFixed(3)}`
}

function openSegmentIntersection(
  leftStart: Readonly<{x: number; y: number}>,
  leftEnd: Readonly<{x: number; y: number}>,
  rightStart: Readonly<{x: number; y: number}>,
  rightEnd: Readonly<{x: number; y: number}>,
): Readonly<{x: number; y: number}> | null {
  const leftDx = leftEnd.x - leftStart.x
  const leftDy = leftEnd.y - leftStart.y
  const rightDx = rightEnd.x - rightStart.x
  const rightDy = rightEnd.y - rightStart.y
  const denominator = leftDx * rightDy - leftDy * rightDx
  if (Math.abs(denominator) <= 1e-7) return null
  const offsetX = rightStart.x - leftStart.x
  const offsetY = rightStart.y - leftStart.y
  const leftRatio = (offsetX * rightDy - offsetY * rightDx) / denominator
  const rightRatio = (offsetX * leftDy - offsetY * leftDx) / denominator
  if (leftRatio <= 1e-7 || leftRatio >= 1 - 1e-7 ||
      rightRatio <= 1e-7 || rightRatio >= 1 - 1e-7) return null
  return {
    x: leftStart.x + leftDx * leftRatio,
    y: leftStart.y + leftDy * leftRatio,
  }
}

function diagonalClearanceViolations(
  result: CoffmanGrahamLayoutResult,
  minimum: number,
): string[] {
  const linesByCorridor = rawDiagonalSections(result)
  const violations: string[] = []
  for (let corridor = 0; corridor < linesByCorridor.length; corridor += 1) {
    const lines = linesByCorridor[corridor]!
    for (let leftIndex = 0; leftIndex < lines.length; leftIndex += 1) {
      const left = lines[leftIndex]!
      for (let rightIndex = leftIndex + 1; rightIndex < lines.length; rightIndex += 1) {
        const right = lines[rightIndex]!
        if (left.edgeId === right.edgeId) continue
        const clearance = segmentDistance(left.start, left.end, right.start, right.end)
        if (clearance + 1e-5 < minimum) {
          violations.push(`${corridor}:${left.edgeId}/${right.edgeId}:${clearance.toFixed(6)}`)
        }
      }
    }
    const origins = [...new Set(lines.map(({originY}) => originY))].sort((left, right) => left - right)
    for (const origin of origins.slice(1)) {
      const current = lines.filter(({originY}) => Math.abs(originY - origin) <= 1e-5)
      const previous = lines.filter(({originY}) => originY < origin - 1e-5)
      const binding = current.some((lower) => previous.some((upper) =>
        Math.abs(segmentDistance(upper.start, upper.end, lower.start, lower.end) - minimum) <= 1e-4))
      if (!binding) {
        violations.push(`${corridor}:origin:${origin.toFixed(5)}:unbound`)
      }
    }
  }
  return violations.sort()
}

function rawDiagonalSections(result: CoffmanGrahamLayoutResult) {
  const layers = [...Map.groupBy(result.nodes, (node) => node.y + node.height / 2).values()]
    .map((nodes) => ({
      top: Math.min(...nodes.map(({y}) => y)),
      bottom: Math.max(...nodes.map(({y, height}) => y + height)),
      center: nodes[0]!.y + nodes[0]!.height / 2,
    }))
    .sort((left, right) => left.center - right.center)
  const sections = Array.from({length: Math.max(0, layers.length - 1)}, () => [] as Array<{
    edgeId: string
    originY: number
    start: Readonly<{x: number; y: number}>
    end: Readonly<{x: number; y: number}>
  }>)
  for (const edge of result.edges) {
    for (let index = 1; index < edge.curves.length - 1; index += 1) {
      const curve = edge.curves[index]!
      const previous = edge.curves[index - 1]!
      const next = edge.curves[index + 1]!
      const dx = curve.endPoint.x - curve.startPoint.x
      const dy = curve.endPoint.y - curve.startPoint.y
      if (curveFlatness(curve) >= 1e-5 || curveFlatness(previous) < 1e-5 ||
          curveFlatness(next) < 1e-5 || Math.abs(dx) <= 1e-7 || Math.abs(dy) <= 1e-7) continue
      const start = quadraticCorner(previous)
      const end = quadraticCorner(next)
      const corridor = layers.findIndex((layer, candidate) => {
        const lower = layers[candidate + 1]
        return lower !== undefined && start.y > layer.bottom + 1e-5 && end.y < lower.top - 1e-5
      })
      if (corridor >= 0) sections[corridor]!.push({edgeId: edge.id, originY: start.y, start, end})
    }
  }
  return sections
}

function quadraticCorner(curve: CoffmanGrahamCurveSegment) {
  return {
    x: curve.startPoint.x + (curve.controlPoints[0].x - curve.startPoint.x) * 1.5,
    y: curve.startPoint.y + (curve.controlPoints[0].y - curve.startPoint.y) * 1.5,
  }
}

function segmentDistance(
  leftStart: Readonly<{x: number; y: number}>,
  leftEnd: Readonly<{x: number; y: number}>,
  rightStart: Readonly<{x: number; y: number}>,
  rightEnd: Readonly<{x: number; y: number}>,
): number {
  if (openSegmentIntersection(leftStart, leftEnd, rightStart, rightEnd) !== null) return 0
  return Math.min(
    pointSegmentDistance(leftStart, rightStart, rightEnd),
    pointSegmentDistance(leftEnd, rightStart, rightEnd),
    pointSegmentDistance(rightStart, leftStart, leftEnd),
    pointSegmentDistance(rightEnd, leftStart, leftEnd),
  )
}

function pointSegmentDistance(
  point: Readonly<{x: number; y: number}>,
  start: Readonly<{x: number; y: number}>,
  end: Readonly<{x: number; y: number}>,
): number {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const lengthSquared = dx * dx + dy * dy
  const ratio = lengthSquared <= 1e-7
    ? 0
    : Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared))
  return Math.hypot(point.x - (start.x + dx * ratio), point.y - (start.y + dy * ratio))
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
