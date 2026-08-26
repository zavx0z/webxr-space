import {
  Graph,
  layout as layoutDagre,
  type EdgeLabel,
  type GraphLabel,
  type NodeLabel,
  type OrderConstraint,
} from "@dagrejs/dagre"
import type {LayoutPoint} from "../../types/protocol.ts"
import type {
  TopDownCurveSegment,
  TopDownCycleWitness,
  TopDownEdgeGeometry,
  TopDownLayoutGraph,
  TopDownLayoutResult,
  TopDownPortGeometry,
} from "../../types/top-down.ts"

const DEFAULT_NODE_SPACING = 50
const DEFAULT_LAYER_SPACING = 50
const DEFAULT_EDGE_SPACING = 20
const DEFAULT_PADDING = 8
const ROUNDED_CORNER_RADIUS = 5
const MAX_NODES = 128
const MAX_PORTS = 256
const MAX_EDGES = 512
const EPSILON = 1e-7

type NormalizedNode = Readonly<{id: string; width: number; height: number}>
type NormalizedPort = Readonly<{id: string; nodeIndex: number; offsetX: number}>
type NormalizedEdge = Readonly<{
  id: string
  sourcePortIndex: number
  targetPortIndex: number
  sourceNodeIndex: number
  targetNodeIndex: number
}>
type NormalizedGraph = Readonly<{
  nodes: readonly NormalizedNode[]
  ports: readonly NormalizedPort[]
  edges: readonly NormalizedEdge[]
  options: Readonly<{nodeSpacing: number; layerSpacing: number; edgeSpacing: number; padding: number}>
}>
type Placement = Readonly<{
  nodeX: Float64Array
  nodeY: Float64Array
  portX: Float64Array
  portY: Float64Array
  edgePoints: ReadonlyMap<string, readonly LayoutPoint[]>
}>
type RoundedPrimitive = Readonly<{
  kind: "line"
  start: LayoutPoint
  end: LayoutPoint
}> | Readonly<{
  kind: "quadratic"
  start: LayoutPoint
  control: LayoutPoint
  end: LayoutPoint
}>

/**
Runs the single Codex-compatible top-down pipeline.

Every graph uses one Dagre/Sugiyama pass. Every semantic edge then uses the
same rounded-corner conversion over its own Dagre point chain. No edge can
select another placement or routing algorithm.
*/
export function solveTopDownCurves(
  input: TopDownLayoutGraph,
  cycleError: (witness: TopDownCycleWitness) => Error,
): TopDownLayoutResult {
  const graph = normalizeGraph(input)
  validateDag(graph, cycleError)
  const placed = placeWithDagre(graph)
  const routed = routeRoundedEdges(graph, placed)
  return materialize(graph, placed, routed)
}

function normalizeGraph(input: TopDownLayoutGraph): NormalizedGraph {
  if (input.nodes.length > MAX_NODES || input.ports.length > MAX_PORTS || input.edges.length > MAX_EDGES) {
    throw new Error(`Top-down graph exceeds the bounded policy budget: ${input.nodes.length}/${input.ports.length}/${input.edges.length}`)
  }
  const options = {
    nodeSpacing: positive(input.layoutOptions?.nodeSpacing, DEFAULT_NODE_SPACING, "nodeSpacing"),
    layerSpacing: positive(input.layoutOptions?.layerSpacing, DEFAULT_LAYER_SPACING, "layerSpacing"),
    edgeSpacing: positive(input.layoutOptions?.edgeSpacing, DEFAULT_EDGE_SPACING, "edgeSpacing"),
    padding: positive(input.layoutOptions?.padding, DEFAULT_PADDING, "padding"),
  }
  const nodeIds = new Set<string>()
  const nodes = [...input.nodes].sort(compareIds).map((node): NormalizedNode => {
    requireId(node.id, "node")
    if (nodeIds.has(node.id)) throw new Error(`Duplicate top-down node: ${node.id}`)
    nodeIds.add(node.id)
    return {
      id: node.id,
      width: positive(node.width, undefined, `node.width:${node.id}`),
      height: positive(node.height, undefined, `node.height:${node.id}`),
    }
  })
  const nodeIndexById = new Map(nodes.map((node, index) => [node.id, index]))
  const portIds = new Set<string>()
  const ports = [...input.ports].sort(compareIds).map((port): NormalizedPort => {
    requireId(port.id, "port")
    if (portIds.has(port.id)) throw new Error(`Duplicate top-down port: ${port.id}`)
    portIds.add(port.id)
    const nodeIndex = nodeIndexById.get(port.nodeId)
    if (nodeIndex === undefined) throw new Error(`Unknown top-down port node: ${port.id}/${port.nodeId}`)
    const offsetX = finite(port.x, `port.x:${port.id}`)
    if (offsetX < 0 || offsetX > nodes[nodeIndex]!.width) {
      throw new Error(`Top-down port is outside node width: ${port.id}`)
    }
    return {id: port.id, nodeIndex, offsetX}
  })
  const portIndexById = new Map(ports.map((port, index) => [port.id, index]))
  const edgeIds = new Set<string>()
  const roles = new Int8Array(ports.length)
  const edges = [...input.edges].sort(compareIds).map((edge): NormalizedEdge => {
    requireId(edge.id, "edge")
    if (edgeIds.has(edge.id)) throw new Error(`Duplicate top-down edge: ${edge.id}`)
    edgeIds.add(edge.id)
    if (Object.prototype.hasOwnProperty.call(edge, "constraint")) {
      throw new Error(`Top-down edges have one semantic type and do not accept constraint: ${edge.id}`)
    }
    const sourcePortIndex = portIndexById.get(edge.sourcePortId)
    const targetPortIndex = portIndexById.get(edge.targetPortId)
    if (sourcePortIndex === undefined) throw new Error(`Unknown top-down source port: ${edge.id}/${edge.sourcePortId}`)
    if (targetPortIndex === undefined) throw new Error(`Unknown top-down target port: ${edge.id}/${edge.targetPortId}`)
    setRole(roles, sourcePortIndex, 1, edge.id, ports[sourcePortIndex]!.id)
    setRole(roles, targetPortIndex, 2, edge.id, ports[targetPortIndex]!.id)
    return {
      id: edge.id,
      sourcePortIndex,
      targetPortIndex,
      sourceNodeIndex: ports[sourcePortIndex]!.nodeIndex,
      targetNodeIndex: ports[targetPortIndex]!.nodeIndex,
    }
  })
  return {nodes, ports, edges, options}
}

function validateDag(graph: NormalizedGraph, cycleError: (witness: TopDownCycleWitness) => Error): void {
  const indegree = new Int32Array(graph.nodes.length)
  const outgoing = Array.from({length: graph.nodes.length}, () => [] as number[])
  for (let index = 0; index < graph.edges.length; index += 1) {
    const edge = graph.edges[index]!
    indegree[edge.targetNodeIndex] = indegree[edge.targetNodeIndex]! + 1
    outgoing[edge.sourceNodeIndex]!.push(index)
  }
  const ready = graph.nodes.map((_, index) => index).filter((index) => indegree[index] === 0)
  let visited = 0
  while (ready.length > 0) {
    const source = ready.shift()!
    visited += 1
    for (const edgeIndex of outgoing[source]!) {
      const target = graph.edges[edgeIndex]!.targetNodeIndex
      indegree[target] = indegree[target]! - 1
      if (indegree[target] === 0) insertNumber(ready, target)
    }
  }
  if (visited === graph.nodes.length) return
  const unresolved = new Set<number>()
  for (let index = 0; index < graph.nodes.length; index += 1) {
    if (indegree[index]! > 0) unresolved.add(index)
  }
  throw cycleError(findCycleWitness(graph, outgoing, unresolved))
}

function placeWithDagre(graph: NormalizedGraph): Placement {
  const dagre = new Graph<GraphLabel, NodeLabel, EdgeLabel>({
    directed: true,
    multigraph: true,
    compound: false,
  })
  dagre.setGraph({
    rankdir: "TB",
    ranker: "network-simplex",
    nodesep: graph.options.nodeSpacing,
    ranksep: graph.options.layerSpacing,
    edgesep: graph.options.edgeSpacing,
    marginx: 0,
    marginy: 0,
  })
  dagre.setDefaultEdgeLabel(() => ({}))
  const layoutNodeOrder: number[] = []
  const insertedNodes = new Set<number>()
  const insertNode = (nodeIndex: number): void => {
    if (insertedNodes.has(nodeIndex)) return
    insertedNodes.add(nodeIndex)
    layoutNodeOrder.push(nodeIndex)
  }
  for (const edge of graph.edges) {
    insertNode(edge.sourceNodeIndex)
    insertNode(edge.targetNodeIndex)
  }
  for (let index = 0; index < graph.nodes.length; index += 1) insertNode(index)
  for (const index of layoutNodeOrder) {
    const node = graph.nodes[index]!
    dagre.setNode(node.id, {width: node.width, height: node.height})
  }
  for (const edge of [...graph.edges].reverse()) {
    dagre.setEdge(
      graph.nodes[edge.sourceNodeIndex]!.id,
      graph.nodes[edge.targetNodeIndex]!.id,
      {height: 0, minlen: 1, weight: 1, width: 0},
      edge.id,
    )
  }
  const desiredOrder = portOrderConstraints(graph)
  layoutDagre(dagre, {
    customOrder(layoutGraph, order) {
      const constraints = acyclicOrderConstraints(desiredOrder.filter(({left, right}) =>
        layoutGraph.node(left)?.rank === layoutGraph.node(right)?.rank))
      order(layoutGraph, {constraints: [...constraints]})
    },
  })

  const nodeX = new Float64Array(graph.nodes.length)
  const nodeY = new Float64Array(graph.nodes.length)
  for (let index = 0; index < graph.nodes.length; index += 1) {
    const node = graph.nodes[index]!
    const geometry = dagre.node(node.id)
    if (!Number.isFinite(geometry.x) || !Number.isFinite(geometry.y)) {
      throw new Error(`Dagre did not place top-down node: ${node.id}`)
    }
    nodeX[index] = clean(geometry.x! - node.width / 2)
    nodeY[index] = clean(geometry.y! - node.height / 2)
  }

  const portX = new Float64Array(graph.ports.length)
  const portY = new Float64Array(graph.ports.length)
  const sourcePorts = new Set(graph.edges.map(({sourcePortIndex}) => sourcePortIndex))
  for (let index = 0; index < graph.ports.length; index += 1) {
    const port = graph.ports[index]!
    portX[index] = clean(nodeX[port.nodeIndex]! + port.offsetX)
    portY[index] = clean(sourcePorts.has(index)
      ? nodeY[port.nodeIndex]! + graph.nodes[port.nodeIndex]!.height
      : nodeY[port.nodeIndex]!)
  }

  const edgePoints = new Map<string, readonly LayoutPoint[]>()
  for (const edge of graph.edges) {
    const label = dagre.edge(
      graph.nodes[edge.sourceNodeIndex]!.id,
      graph.nodes[edge.targetNodeIndex]!.id,
      edge.id,
    )
    const points = label.points?.map(({x, y}) => point(x, y)) ?? []
    if (points.length < 2) throw new Error(`Dagre did not route top-down edge: ${edge.id}`)
    edgePoints.set(edge.id, points)
  }
  return {nodeX, nodeY, portX, portY, edgePoints}
}

function portOrderConstraints(graph: NormalizedGraph): readonly OrderConstraint[] {
  const outgoing = new Map<number, NormalizedEdge[]>()
  const incoming = new Map<number, NormalizedEdge[]>()
  for (const edge of graph.edges) {
    const sourceEdges = outgoing.get(edge.sourceNodeIndex) ?? []
    sourceEdges.push(edge)
    outgoing.set(edge.sourceNodeIndex, sourceEdges)
    const targetEdges = incoming.get(edge.targetNodeIndex) ?? []
    targetEdges.push(edge)
    incoming.set(edge.targetNodeIndex, targetEdges)
  }
  const constraints: OrderConstraint[] = []
  for (const edges of outgoing.values()) {
    edges.sort((left, right) =>
      graph.ports[left.sourcePortIndex]!.offsetX - graph.ports[right.sourcePortIndex]!.offsetX ||
      left.id.localeCompare(right.id))
    for (let index = 1; index < edges.length; index += 1) {
      const left = graph.nodes[edges[index - 1]!.targetNodeIndex]!.id
      const right = graph.nodes[edges[index]!.targetNodeIndex]!.id
      if (left !== right) constraints.push({left, right})
    }
  }
  for (const edges of incoming.values()) {
    edges.sort((left, right) =>
      graph.ports[left.targetPortIndex]!.offsetX - graph.ports[right.targetPortIndex]!.offsetX ||
      left.id.localeCompare(right.id))
    for (let index = 1; index < edges.length; index += 1) {
      const left = graph.nodes[edges[index - 1]!.sourceNodeIndex]!.id
      const right = graph.nodes[edges[index]!.sourceNodeIndex]!.id
      if (left !== right) constraints.push({left, right})
    }
  }
  return constraints
}

function acyclicOrderConstraints(values: readonly OrderConstraint[]): readonly OrderConstraint[] {
  const adjacency = new Map<string, Set<string>>()
  const result: OrderConstraint[] = []
  const reaches = (source: string, target: string): boolean => {
    const pending = [source]
    const seen = new Set(pending)
    while (pending.length > 0) {
      const current = pending.shift()!
      if (current === target) return true
      for (const next of adjacency.get(current) ?? []) {
        if (seen.has(next)) continue
        seen.add(next)
        pending.push(next)
      }
    }
    return false
  }
  for (const constraint of values) {
    if (reaches(constraint.right, constraint.left)) continue
    const targets = adjacency.get(constraint.left) ?? new Set<string>()
    targets.add(constraint.right)
    adjacency.set(constraint.left, targets)
    result.push(constraint)
  }
  return result
}

function routeRoundedEdges(graph: NormalizedGraph, placed: Placement): readonly TopDownEdgeGeometry[] {
  return graph.edges.map((edge): TopDownEdgeGeometry => {
    const start = point(placed.portX[edge.sourcePortIndex]!, placed.portY[edge.sourcePortIndex]!)
    const end = point(placed.portX[edge.targetPortIndex]!, placed.portY[edge.targetPortIndex]!)
    const dagrePoints = placed.edgePoints.get(edge.id)!
    const terminalLength = Math.min(graph.options.layerSpacing / 2, Math.max(0, end.y - start.y) / 2)
    const sourceTerminal = point(start.x, start.y + terminalLength)
    const targetTerminal = point(end.x, end.y - terminalLength)
    const interior = dagrePoints.slice(1, -1).filter(({y}) =>
      y >= sourceTerminal.y - EPSILON && y <= targetTerminal.y + EPSILON)
    const path = simplifyPath([start, sourceTerminal, ...interior, targetTerminal, end])
    const primitives = roundedPrimitives(path, ROUNDED_CORNER_RADIUS)
    const curves = primitivesToCubics(primitives)
    if (curves.length === 0) throw new Error(`Top-down edge has no rounded path: ${edge.id}`)
    return {id: edge.id, curves: [curves[0]!, ...curves.slice(1)]}
  })
}

function roundedPrimitives(path: readonly LayoutPoint[], radius: number): readonly RoundedPrimitive[] {
  if (path.length < 2) return []
  const primitives: RoundedPrimitive[] = []
  let cursor = path[0]!
  for (let index = 1; index < path.length - 1; index += 1) {
    const previous = path[index - 1]!
    const corner = path[index]!
    const next = path[index + 1]!
    if (sameDirection(previous, corner, next)) continue
    const cornerRadius = Math.min(radius, distance(previous, corner) / 2, distance(corner, next) / 2)
    if (cornerRadius <= EPSILON) continue
    const entry = moveTowards(corner, previous, cornerRadius)
    const exit = moveTowards(corner, next, cornerRadius)
    pushLine(primitives, cursor, entry)
    primitives.push({kind: "quadratic", start: entry, control: corner, end: exit})
    cursor = exit
  }
  pushLine(primitives, cursor, path.at(-1)!)
  return primitives
}

function primitivesToCubics(primitives: readonly RoundedPrimitive[]): readonly TopDownCurveSegment[] {
  return primitives.map((primitive, index): TopDownCurveSegment => {
    if (primitive.kind === "quadratic") {
      return {
        startPoint: primitive.start,
        controlPoints: [
          interpolate(primitive.start, primitive.control, 2 / 3),
          interpolate(primitive.end, primitive.control, 2 / 3),
        ],
        endPoint: primitive.end,
      }
    }
    const previous = primitives[index - 1]
    const next = primitives[index + 1]
    const startHandle = previous?.kind === "quadratic"
      ? subtract(previous.end, previousCubicControl2(previous))
      : scale(subtract(primitive.end, primitive.start), 1 / 3)
    const endHandle = next?.kind === "quadratic"
      ? subtract(nextCubicControl1(next), next.start)
      : scale(subtract(primitive.end, primitive.start), 1 / 3)
    return {
      startPoint: primitive.start,
      controlPoints: [
        add(primitive.start, startHandle),
        subtract(primitive.end, endHandle),
      ],
      endPoint: primitive.end,
    }
  })
}

function previousCubicControl2(primitive: Extract<RoundedPrimitive, {kind: "quadratic"}>): LayoutPoint {
  return interpolate(primitive.end, primitive.control, 2 / 3)
}

function nextCubicControl1(primitive: Extract<RoundedPrimitive, {kind: "quadratic"}>): LayoutPoint {
  return interpolate(primitive.start, primitive.control, 2 / 3)
}

function pushLine(primitives: RoundedPrimitive[], start: LayoutPoint, end: LayoutPoint): void {
  if (samePoint(start, end)) return
  primitives.push({kind: "line", start, end})
}

function materialize(
  graph: NormalizedGraph,
  placed: Placement,
  routed: readonly TopDownEdgeGeometry[],
): TopDownLayoutResult {
  const rawBounds = geometryBounds(graph, placed, routed)
  const shiftX = graph.options.padding - rawBounds.x
  const shiftY = graph.options.padding - rawBounds.y
  const sourcePorts = new Set(graph.edges.map(({sourcePortIndex}) => sourcePortIndex))
  const usedPorts = new Set(graph.edges.flatMap(({sourcePortIndex, targetPortIndex}) => [sourcePortIndex, targetPortIndex]))
  const translate = (value: LayoutPoint): LayoutPoint => point(value.x + shiftX, value.y + shiftY)
  const translateCurve = (curve: TopDownCurveSegment): TopDownCurveSegment => ({
    startPoint: translate(curve.startPoint),
    controlPoints: [translate(curve.controlPoints[0]), translate(curve.controlPoints[1])],
    endPoint: translate(curve.endPoint),
  })
  const edges = routed.map((edge): TopDownEdgeGeometry => ({
    id: edge.id,
    curves: [translateCurve(edge.curves[0]), ...edge.curves.slice(1).map(translateCurve)],
  }))
  const ports: TopDownPortGeometry[] = []
  for (const index of [...usedPorts].sort((left, right) => compareIds(graph.ports[left]!, graph.ports[right]!))) {
    ports.push({
      id: graph.ports[index]!.id,
      x: clean(placed.portX[index]! + shiftX),
      y: clean(placed.portY[index]! + shiftY),
      side: sourcePorts.has(index) ? "SOUTH" : "NORTH",
    })
  }
  return {
    direction: "DOWN",
    bounds: {
      x: 0,
      y: 0,
      width: clean(rawBounds.width + graph.options.padding * 2),
      height: clean(rawBounds.height + graph.options.padding * 2),
    },
    nodes: graph.nodes.map((node, index) => ({
      id: node.id,
      x: clean(placed.nodeX[index]! + shiftX),
      y: clean(placed.nodeY[index]! + shiftY),
      width: node.width,
      height: node.height,
    })),
    ports,
    edges,
  }
}

function geometryBounds(
  graph: NormalizedGraph,
  placed: Readonly<{nodeX: Float64Array; nodeY: Float64Array}>,
  edges: readonly TopDownEdgeGeometry[],
): Readonly<{x: number; y: number; width: number; height: number}> {
  let left = Math.min(0, ...graph.nodes.map((_, index) => placed.nodeX[index]!))
  let top = Math.min(0, ...graph.nodes.map((_, index) => placed.nodeY[index]!))
  let right = Math.max(0, ...graph.nodes.map((node, index) => placed.nodeX[index]! + node.width))
  let bottom = Math.max(0, ...graph.nodes.map((node, index) => placed.nodeY[index]! + node.height))
  for (const edge of edges) {
    for (const curve of edge.curves) {
      for (const curvePoint of [curve.startPoint, ...curve.controlPoints, curve.endPoint]) {
        left = Math.min(left, curvePoint.x)
        top = Math.min(top, curvePoint.y)
        right = Math.max(right, curvePoint.x)
        bottom = Math.max(bottom, curvePoint.y)
      }
    }
  }
  return {x: left, y: top, width: right - left, height: bottom - top}
}

function findCycleWitness(
  graph: NormalizedGraph,
  outgoing: readonly (readonly number[])[],
  unresolved: ReadonlySet<number>,
): TopDownCycleWitness {
  const state = new Int8Array(graph.nodes.length)
  const parentEdge = new Int32Array(graph.nodes.length)
  parentEdge.fill(-1)
  for (const start of unresolved) {
    if (state[start] !== 0) continue
    state[start] = 1
    const stack: Array<{nodeIndex: number; nextEdge: number}> = [{nodeIndex: start, nextEdge: 0}]
    while (stack.length > 0) {
      const frame = stack.at(-1)!
      const edges = outgoing[frame.nodeIndex]!
      if (frame.nextEdge >= edges.length) {
        state[frame.nodeIndex] = 2
        stack.pop()
        continue
      }
      const edgeIndex = edges[frame.nextEdge]!
      frame.nextEdge += 1
      const target = graph.edges[edgeIndex]!.targetNodeIndex
      if (!unresolved.has(target)) continue
      if (state[target] === 0) {
        state[target] = 1
        parentEdge[target] = edgeIndex
        stack.push({nodeIndex: target, nextEdge: 0})
        continue
      }
      if (state[target] !== 1) continue
      const edgeIds = [graph.edges[edgeIndex]!.id]
      const nodeIds = [graph.nodes[target]!.id]
      let cursor = frame.nodeIndex
      while (cursor !== target) {
        nodeIds.push(graph.nodes[cursor]!.id)
        const incoming = parentEdge[cursor]!
        if (incoming < 0) throw new Error("Top-down cycle witness reconstruction failed")
        edgeIds.push(graph.edges[incoming]!.id)
        cursor = graph.edges[incoming]!.sourceNodeIndex
      }
      nodeIds.reverse()
      edgeIds.reverse()
      const pairs = nodeIds.map((nodeId, index) => ({nodeId, edgeId: edgeIds[index]!}))
      pairs.sort((left, right) => left.nodeId.localeCompare(right.nodeId))
      const firstNode = pairs[0]!.nodeId
      const rotation = nodeIds.indexOf(firstNode)
      const rotatedNodeIds = [...nodeIds.slice(rotation), ...nodeIds.slice(0, rotation)]
      return {
        nodeIds: rotatedNodeIds,
        edgeIds: rotatedNodeIds.map((sourceId, index) => {
          const targetId = rotatedNodeIds[(index + 1) % rotatedNodeIds.length]!
          return graph.edges.find((edge) =>
            graph.nodes[edge.sourceNodeIndex]!.id === sourceId &&
            graph.nodes[edge.targetNodeIndex]!.id === targetId)!.id
        }),
      }
    }
  }
  throw new Error("Top-down cycle witness was not found")
}

function simplifyPath(values: readonly LayoutPoint[]): readonly LayoutPoint[] {
  const deduplicated: LayoutPoint[] = []
  for (const value of values) {
    const current = point(value.x, value.y)
    if (!samePoint(deduplicated.at(-1), current)) deduplicated.push(current)
  }
  if (deduplicated.length < 3) return deduplicated
  const result = [deduplicated[0]!]
  for (let index = 1; index < deduplicated.length - 1; index += 1) {
    const previous = result.at(-1)!
    const current = deduplicated[index]!
    const next = deduplicated[index + 1]!
    if (!sameDirection(previous, current, next)) result.push(current)
  }
  result.push(deduplicated.at(-1)!)
  return result
}

function sameDirection(first: LayoutPoint, second: LayoutPoint, third: LayoutPoint): boolean {
  const ax = second.x - first.x
  const ay = second.y - first.y
  const bx = third.x - second.x
  const by = third.y - second.y
  return Math.abs(ax * by - ay * bx) <= EPSILON && ax * bx + ay * by >= 0
}

function moveTowards(from: LayoutPoint, to: LayoutPoint, amount: number): LayoutPoint {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy)
  if (length <= EPSILON) return from
  return point(from.x + dx / length * amount, from.y + dy / length * amount)
}

function interpolate(from: LayoutPoint, to: LayoutPoint, ratio: number): LayoutPoint {
  return point(from.x + (to.x - from.x) * ratio, from.y + (to.y - from.y) * ratio)
}

function add(left: LayoutPoint, right: LayoutPoint): LayoutPoint {
  return point(left.x + right.x, left.y + right.y)
}

function subtract(left: LayoutPoint, right: LayoutPoint): LayoutPoint {
  return point(left.x - right.x, left.y - right.y)
}

function scale(value: LayoutPoint, factor: number): LayoutPoint {
  return point(value.x * factor, value.y * factor)
}

function distance(left: LayoutPoint, right: LayoutPoint): number {
  return Math.hypot(right.x - left.x, right.y - left.y)
}

function samePoint(left: LayoutPoint | undefined, right: LayoutPoint): boolean {
  return left !== undefined && Math.abs(left.x - right.x) <= EPSILON && Math.abs(left.y - right.y) <= EPSILON
}

function setRole(roles: Int8Array, index: number, role: 1 | 2, edgeId: string, portId: string): void {
  const previous = roles[index]!
  if (previous !== 0 && previous !== role) throw new Error(`Top-down port has conflicting edge roles: ${edgeId}/${portId}`)
  if (previous === role) throw new Error(`Top-down port is reused by multiple edges: ${edgeId}/${portId}`)
  roles[index] = role
}

function insertNumber(values: number[], value: number): void {
  let index = 0
  while (index < values.length && values[index]! < value) index += 1
  values.splice(index, 0, value)
}

function positive(value: number | undefined, fallback: number | undefined, label: string): number {
  const candidate = value ?? fallback
  if (candidate === undefined || !Number.isFinite(candidate) || candidate <= 0) {
    throw new Error(`${label} must be a finite positive number`)
  }
  return candidate
}

function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite`)
  return value
}

function requireId(id: string, kind: string): void {
  if (id.length === 0) throw new Error(`Top-down ${kind} id must not be empty`)
}

function point(x: number, y: number): LayoutPoint {
  return {x: clean(x), y: clean(y)}
}

function clean(value: number): number {
  const rounded = Math.round(value * 1e7) / 1e7
  return Object.is(rounded, -0) ? 0 : rounded
}

function compareIds(left: Readonly<{id: string}>, right: Readonly<{id: string}>): number {
  return left.id.localeCompare(right.id)
}
