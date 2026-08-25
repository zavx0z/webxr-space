import type {LayoutEdgeGeometry, LayoutPoint} from "../../types/protocol.ts"
import type {
  TopDownCycleWitness,
  TopDownLayoutGraph,
  TopDownLayoutResult,
  TopDownPortGeometry,
} from "../../types/top-down.ts"

const DEFAULT_NODE_SPACING = 40
const DEFAULT_LAYER_SPACING = 64
const DEFAULT_EDGE_SPACING = 16
const DEFAULT_PADDING = 32
const ORDERING_SWEEPS = 4

type NormalizedNode = Readonly<{
  id: string
  width: number
  height: number
}>

type NormalizedPort = Readonly<{
  id: string
  nodeIndex: number
  offsetX: number
}>

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
  options: Readonly<{
    nodeSpacing: number
    layerSpacing: number
    edgeSpacing: number
    padding: number
  }>
}>

type RankedGraph = Readonly<{
  ranks: Int32Array
  layers: number[][]
  incoming: readonly (readonly number[])[]
  outgoing: readonly (readonly number[])[]
}>

type LongSide = -1 | 0 | 1

type TrackLeg = {
  edgeIndex: number
  kind: 0 | 1 | 2
  fromX: number
  toX: number
  y: number
}

type Placement = Readonly<{
  nodeX: Float64Array
  nodeY: Float64Array
  portX: Float64Array
  portY: Float64Array
  portSide: readonly ("NORTH" | "SOUTH" | null)[]
  longSide: Int8Array
  longLaneX: Float64Array
  exitTrackY: Float64Array
  entryTrackY: Float64Array
  adjacentTrackY: Float64Array
  bounds: Readonly<{x: number; y: number; width: number; height: number}>
}>

export function solveTopDownLayout(
  input: TopDownLayoutGraph,
  cycleError: (witness: TopDownCycleWitness) => Error,
): TopDownLayoutResult {
  const graph = normalizeGraph(input)
  const ranked = rankGraph(graph, cycleError)
  orderLayers(graph, ranked)
  const placement = placeAndRouteTracks(graph, ranked)
  return materializeResult(graph, placement)
}

function normalizeGraph(input: TopDownLayoutGraph): NormalizedGraph {
  const options = {
    nodeSpacing: positive(input.layoutOptions?.nodeSpacing, DEFAULT_NODE_SPACING, "nodeSpacing"),
    layerSpacing: positive(input.layoutOptions?.layerSpacing, DEFAULT_LAYER_SPACING, "layerSpacing"),
    edgeSpacing: positive(input.layoutOptions?.edgeSpacing, DEFAULT_EDGE_SPACING, "edgeSpacing"),
    padding: positive(input.layoutOptions?.padding, DEFAULT_PADDING, "padding"),
  }
  const nodeIds = new Set<string>()
  const nodes = [...input.nodes]
    .sort(compareIds)
    .map((node): NormalizedNode => {
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
  const ports = [...input.ports]
    .sort(compareIds)
    .map((port): NormalizedPort => {
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
  const edges = [...input.edges]
    .sort(compareIds)
    .map((edge): NormalizedEdge => {
      requireId(edge.id, "edge")
      if (edgeIds.has(edge.id)) throw new Error(`Duplicate top-down edge: ${edge.id}`)
      edgeIds.add(edge.id)
      const sourcePortIndex = portIndexById.get(edge.sourcePortId)
      const targetPortIndex = portIndexById.get(edge.targetPortId)
      if (sourcePortIndex === undefined) {
        throw new Error(`Unknown top-down source port: ${edge.id}/${edge.sourcePortId}`)
      }
      if (targetPortIndex === undefined) {
        throw new Error(`Unknown top-down target port: ${edge.id}/${edge.targetPortId}`)
      }
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

function rankGraph(graph: NormalizedGraph, cycleError: (witness: TopDownCycleWitness) => Error): RankedGraph {
  const indegree = new Int32Array(graph.nodes.length)
  const outgoingEdgeIndexes = Array.from({length: graph.nodes.length}, () => [] as number[])
  const incoming = Array.from({length: graph.nodes.length}, () => [] as number[])
  const outgoing = Array.from({length: graph.nodes.length}, () => [] as number[])
  for (let edgeIndex = 0; edgeIndex < graph.edges.length; edgeIndex += 1) {
    const edge = graph.edges[edgeIndex]!
    indegree[edge.targetNodeIndex] = indegree[edge.targetNodeIndex]! + 1
    outgoingEdgeIndexes[edge.sourceNodeIndex]!.push(edgeIndex)
    incoming[edge.targetNodeIndex]!.push(edge.sourceNodeIndex)
    outgoing[edge.sourceNodeIndex]!.push(edge.targetNodeIndex)
  }
  const ready = new NumericMinHeap()
  for (let nodeIndex = 0; nodeIndex < graph.nodes.length; nodeIndex += 1) {
    if (indegree[nodeIndex] === 0) ready.push(nodeIndex)
  }
  const ranks = new Int32Array(graph.nodes.length)
  let processed = 0
  let maximumRank = 0
  while (ready.size > 0) {
    const sourceNodeIndex = ready.pop()
    processed += 1
    const sourceRank = ranks[sourceNodeIndex]!
    for (const edgeIndex of outgoingEdgeIndexes[sourceNodeIndex]!) {
      const edge = graph.edges[edgeIndex]!
      const targetRank = sourceRank + 1
      if (targetRank > ranks[edge.targetNodeIndex]!) ranks[edge.targetNodeIndex] = targetRank
      if (targetRank > maximumRank) maximumRank = targetRank
      indegree[edge.targetNodeIndex] = indegree[edge.targetNodeIndex]! - 1
      if (indegree[edge.targetNodeIndex] === 0) ready.push(edge.targetNodeIndex)
    }
  }
  if (processed !== graph.nodes.length) {
    const unresolved = new Set<number>()
    for (let nodeIndex = 0; nodeIndex < graph.nodes.length; nodeIndex += 1) {
      if (indegree[nodeIndex]! > 0) unresolved.add(nodeIndex)
    }
    throw cycleError(findCycleWitness(graph, outgoingEdgeIndexes, unresolved))
  }
  const layers = Array.from({length: graph.nodes.length === 0 ? 0 : maximumRank + 1}, () => [] as number[])
  for (let nodeIndex = 0; nodeIndex < graph.nodes.length; nodeIndex += 1) {
    layers[ranks[nodeIndex]!]!.push(nodeIndex)
  }
  return {ranks, layers, incoming, outgoing}
}

function findCycleWitness(
  graph: NormalizedGraph,
  outgoingEdgeIndexes: readonly (readonly number[])[],
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
      const edgeIndexes = outgoingEdgeIndexes[frame.nodeIndex]!
      if (frame.nextEdge >= edgeIndexes.length) {
        state[frame.nodeIndex] = 2
        stack.pop()
        continue
      }
      const edgeIndex = edgeIndexes[frame.nextEdge]!
      frame.nextEdge += 1
      const edge = graph.edges[edgeIndex]!
      const target = edge.targetNodeIndex
      if (!unresolved.has(target)) continue
      if (state[target] === 0) {
        state[target] = 1
        parentEdge[target] = edgeIndex
        stack.push({nodeIndex: target, nextEdge: 0})
        continue
      }
      if (state[target] !== 1) continue
      const nodeIndexes = new Set<number>([target])
      const edgeIndexesInCycle = new Set<number>([edgeIndex])
      let current = frame.nodeIndex
      while (current !== target) {
        nodeIndexes.add(current)
        const currentParentEdge = parentEdge[current]!
        if (currentParentEdge < 0) break
        edgeIndexesInCycle.add(currentParentEdge)
        current = graph.edges[currentParentEdge]!.sourceNodeIndex
      }
      return {
        nodeIds: [...nodeIndexes].map((index) => graph.nodes[index]!.id).sort(),
        edgeIds: [...edgeIndexesInCycle].map((index) => graph.edges[index]!.id).sort(),
      }
    }
  }
  return {
    nodeIds: [...unresolved].map((index) => graph.nodes[index]!.id).sort(),
    edgeIds: graph.edges
      .filter((edge) => unresolved.has(edge.sourceNodeIndex) && unresolved.has(edge.targetNodeIndex))
      .map((edge) => edge.id)
      .sort(),
  }
}

function orderLayers(graph: NormalizedGraph, ranked: RankedGraph): void {
  const positions = new Int32Array(graph.nodes.length)
  const updatePositions = (): void => {
    for (const layer of ranked.layers) {
      for (let index = 0; index < layer.length; index += 1) positions[layer[index]!] = index
    }
  }
  updatePositions()
  for (let sweep = 0; sweep < ORDERING_SWEEPS; sweep += 1) {
    for (let rank = 1; rank < ranked.layers.length; rank += 1) {
      sortLayer(graph, ranked.layers[rank]!, ranked.incoming, positions)
      updatePositions()
    }
    for (let rank = ranked.layers.length - 2; rank >= 0; rank -= 1) {
      sortLayer(graph, ranked.layers[rank]!, ranked.outgoing, positions)
      updatePositions()
    }
  }
}

function sortLayer(
  graph: NormalizedGraph,
  layer: number[],
  neighbours: readonly (readonly number[])[],
  positions: Int32Array,
): void {
  const previous = new Map(layer.map((nodeIndex, index) => [nodeIndex, index]))
  const score = new Map<number, number>()
  for (const nodeIndex of layer) {
    const adjacent = neighbours[nodeIndex]!
    if (adjacent.length === 0) continue
    let total = 0
    for (const neighbour of adjacent) total += positions[neighbour]!
    score.set(nodeIndex, total / adjacent.length)
  }
  layer.sort((left, right) => {
    const leftScore = score.get(left)
    const rightScore = score.get(right)
    if (leftScore !== undefined || rightScore !== undefined) {
      if (leftScore === undefined) return 1
      if (rightScore === undefined) return -1
      if (leftScore !== rightScore) return leftScore - rightScore
    }
    return previous.get(left)! - previous.get(right)! || compareIds(graph.nodes[left]!, graph.nodes[right]!)
  })
}

function placeAndRouteTracks(graph: NormalizedGraph, ranked: RankedGraph): Placement {
  const nodeCount = graph.nodes.length
  const edgeCount = graph.edges.length
  const nodeX = new Float64Array(nodeCount)
  const nodeY = new Float64Array(nodeCount)
  const layerHeights = new Float64Array(ranked.layers.length)
  const layerWidths = new Float64Array(ranked.layers.length)
  let contentWidth = 0
  for (let rank = 0; rank < ranked.layers.length; rank += 1) {
    const layer = ranked.layers[rank]!
    let width = 0
    let height = 0
    for (let index = 0; index < layer.length; index += 1) {
      const node = graph.nodes[layer[index]!]!
      width += node.width
      if (index > 0) width += graph.options.nodeSpacing
      if (node.height > height) height = node.height
    }
    layerWidths[rank] = width
    layerHeights[rank] = height
    if (width > contentWidth) contentWidth = width
  }
  for (let rank = 0; rank < ranked.layers.length; rank += 1) {
    let x = (contentWidth - layerWidths[rank]!) / 2
    for (const nodeIndex of ranked.layers[rank]!) {
      nodeX[nodeIndex] = x
      x += graph.nodes[nodeIndex]!.width + graph.options.nodeSpacing
    }
  }

  const basePortX = graph.ports.map((port) => nodeX[port.nodeIndex]! + port.offsetX)
  const longSide = new Int8Array(edgeCount)
  let leftLongCount = 0
  let rightLongCount = 0
  for (let edgeIndex = 0; edgeIndex < edgeCount; edgeIndex += 1) {
    const edge = graph.edges[edgeIndex]!
    if (ranked.ranks[edge.targetNodeIndex]! - ranked.ranks[edge.sourceNodeIndex]! <= 1) continue
    const sourceX = basePortX[edge.sourcePortIndex]!
    const targetX = basePortX[edge.targetPortIndex]!
    const leftCost = sourceX + targetX
    const rightCost = (contentWidth - sourceX) + (contentWidth - targetX)
    const side: LongSide = leftCost < rightCost
      ? -1
      : rightCost < leftCost
        ? 1
        : leftLongCount <= rightLongCount ? -1 : 1
    longSide[edgeIndex] = side
    if (side === -1) leftLongCount += 1
    else rightLongCount += 1
  }
  const leftReserve = leftLongCount === 0 ? 0 : (leftLongCount + 1) * graph.options.edgeSpacing
  const rightReserve = rightLongCount === 0 ? 0 : (rightLongCount + 1) * graph.options.edgeSpacing
  const contentLeft = graph.options.padding + leftReserve
  const contentRight = contentLeft + contentWidth
  for (let nodeIndex = 0; nodeIndex < nodeCount; nodeIndex += 1) {
    nodeX[nodeIndex] = nodeX[nodeIndex]! + contentLeft
  }

  const portX = new Float64Array(graph.ports.length)
  for (let portIndex = 0; portIndex < graph.ports.length; portIndex += 1) {
    const port = graph.ports[portIndex]!
    portX[portIndex] = nodeX[port.nodeIndex]! + port.offsetX
  }
  const longLaneX = new Float64Array(edgeCount)
  let leftLaneIndex = 0
  let rightLaneIndex = 0
  for (let edgeIndex = 0; edgeIndex < edgeCount; edgeIndex += 1) {
    if (longSide[edgeIndex] === -1) {
      longLaneX[edgeIndex] = contentLeft - graph.options.edgeSpacing * (++leftLaneIndex)
    } else if (longSide[edgeIndex] === 1) {
      longLaneX[edgeIndex] = contentRight + graph.options.edgeSpacing * (++rightLaneIndex)
    }
  }

  const legsByGap = Array.from({length: Math.max(0, ranked.layers.length - 1)}, () => [] as TrackLeg[])
  for (let edgeIndex = 0; edgeIndex < edgeCount; edgeIndex += 1) {
    const edge = graph.edges[edgeIndex]!
    const sourceRank = ranked.ranks[edge.sourceNodeIndex]!
    const targetRank = ranked.ranks[edge.targetNodeIndex]!
    const sourceX = portX[edge.sourcePortIndex]!
    const targetX = portX[edge.targetPortIndex]!
    if (longSide[edgeIndex] === 0) {
      if (sourceX !== targetX) {
        legsByGap[sourceRank]!.push({edgeIndex, kind: 0, fromX: sourceX, toX: targetX, y: 0})
      }
      continue
    }
    const laneX = longLaneX[edgeIndex]!
    legsByGap[sourceRank]!.push({edgeIndex, kind: 1, fromX: sourceX, toX: laneX, y: 0})
    legsByGap[targetRank - 1]!.push({edgeIndex, kind: 2, fromX: laneX, toX: targetX, y: 0})
  }
  for (const legs of legsByGap) legs.sort((left, right) =>
    (left.fromX + left.toX) - (right.fromX + right.toX) ||
    Math.min(left.fromX, left.toX) - Math.min(right.fromX, right.toX) ||
    compareIds(graph.edges[left.edgeIndex]!, graph.edges[right.edgeIndex]!) ||
    left.kind - right.kind)

  const layerTops = new Float64Array(ranked.layers.length)
  const gapHeights = new Float64Array(legsByGap.length)
  if (ranked.layers.length > 0) layerTops[0] = graph.options.padding
  for (let rank = 0; rank < legsByGap.length; rank += 1) {
    const trackCount = legsByGap[rank]!.length
    const tracksHeight = trackCount === 0 ? 0 : (trackCount + 1) * graph.options.edgeSpacing
    gapHeights[rank] = Math.max(graph.options.layerSpacing, tracksHeight)
    layerTops[rank + 1] = layerTops[rank]! + layerHeights[rank]! + gapHeights[rank]!
  }
  for (let rank = 0; rank < ranked.layers.length; rank += 1) {
    for (const nodeIndex of ranked.layers[rank]!) {
      nodeY[nodeIndex] = layerTops[rank]! + (layerHeights[rank]! - graph.nodes[nodeIndex]!.height) / 2
    }
  }
  for (let rank = 0; rank < legsByGap.length; rank += 1) {
    const legs = legsByGap[rank]!
    if (legs.length === 0) continue
    const margin = (gapHeights[rank]! - (legs.length - 1) * graph.options.edgeSpacing) / 2
    const layerBottom = layerTops[rank]! + layerHeights[rank]!
    for (let index = 0; index < legs.length; index += 1) {
      legs[index]!.y = layerBottom + margin + index * graph.options.edgeSpacing
    }
  }

  const adjacentTrackY = new Float64Array(edgeCount)
  const exitTrackY = new Float64Array(edgeCount)
  const entryTrackY = new Float64Array(edgeCount)
  for (const legs of legsByGap) {
    for (const leg of legs) {
      if (leg.kind === 0) adjacentTrackY[leg.edgeIndex] = leg.y
      else if (leg.kind === 1) exitTrackY[leg.edgeIndex] = leg.y
      else entryTrackY[leg.edgeIndex] = leg.y
    }
  }

  const portY = new Float64Array(graph.ports.length)
  const portSide: Array<"NORTH" | "SOUTH" | null> = graph.ports.map(() => null)
  for (const edge of graph.edges) {
    const sourcePort = graph.ports[edge.sourcePortIndex]!
    const targetPort = graph.ports[edge.targetPortIndex]!
    portSide[edge.sourcePortIndex] = "SOUTH"
    portSide[edge.targetPortIndex] = "NORTH"
    portY[edge.sourcePortIndex] = nodeY[sourcePort.nodeIndex]! + graph.nodes[sourcePort.nodeIndex]!.height
    portY[edge.targetPortIndex] = nodeY[targetPort.nodeIndex]!
  }
  const height = ranked.layers.length === 0
    ? graph.options.padding * 2
    : layerTops.at(-1)! + layerHeights.at(-1)! + graph.options.padding
  return {
    nodeX,
    nodeY,
    portX,
    portY,
    portSide,
    longSide,
    longLaneX,
    exitTrackY,
    entryTrackY,
    adjacentTrackY,
    bounds: {
      x: 0,
      y: 0,
      width: graph.options.padding * 2 + leftReserve + contentWidth + rightReserve,
      height,
    },
  }
}

function materializeResult(graph: NormalizedGraph, placement: Placement): TopDownLayoutResult {
  const ports: TopDownPortGeometry[] = []
  for (let portIndex = 0; portIndex < graph.ports.length; portIndex += 1) {
    const side = placement.portSide[portIndex]
    if (side === null || side === undefined) continue
    ports.push({
      id: graph.ports[portIndex]!.id,
      x: clean(placement.portX[portIndex]!),
      y: clean(placement.portY[portIndex]!),
      side,
    })
  }
  const edges: LayoutEdgeGeometry[] = graph.edges.map((edge, edgeIndex) => {
    const startPoint = point(placement.portX[edge.sourcePortIndex]!, placement.portY[edge.sourcePortIndex]!)
    const endPoint = point(placement.portX[edge.targetPortIndex]!, placement.portY[edge.targetPortIndex]!)
    let points: LayoutPoint[]
    if (placement.longSide[edgeIndex] === 0) {
      const trackY = placement.adjacentTrackY[edgeIndex]!
      points = startPoint.x === endPoint.x || trackY === 0
        ? [startPoint, endPoint]
        : [startPoint, point(startPoint.x, trackY), point(endPoint.x, trackY), endPoint]
    } else {
      const laneX = placement.longLaneX[edgeIndex]!
      points = [
        startPoint,
        point(startPoint.x, placement.exitTrackY[edgeIndex]!),
        point(laneX, placement.exitTrackY[edgeIndex]!),
        point(laneX, placement.entryTrackY[edgeIndex]!),
        point(endPoint.x, placement.entryTrackY[edgeIndex]!),
        endPoint,
      ]
    }
    points = simplify(points)
    return {
      id: edge.id,
      sections: [{
        startPoint: points[0]!,
        bendPoints: points.slice(1, -1),
        endPoint: points.at(-1)!,
      }],
    }
  })
  return {
    direction: "DOWN",
    bounds: placement.bounds,
    nodes: graph.nodes.map((node, nodeIndex) => ({
      id: node.id,
      x: clean(placement.nodeX[nodeIndex]!),
      y: clean(placement.nodeY[nodeIndex]!),
      width: node.width,
      height: node.height,
    })),
    ports,
    edges,
  }
}

function simplify(points: readonly LayoutPoint[]): LayoutPoint[] {
  const result: LayoutPoint[] = []
  for (const candidate of points) {
    const previous = result.at(-1)
    if (previous !== undefined && previous.x === candidate.x && previous.y === candidate.y) continue
    const before = result.at(-2)
    if (before !== undefined && previous !== undefined &&
        ((before.x === previous.x && previous.x === candidate.x) ||
         (before.y === previous.y && previous.y === candidate.y))) {
      result[result.length - 1] = candidate
    } else result.push(candidate)
  }
  return result
}

function setRole(
  roles: Int8Array,
  portIndex: number,
  role: 1 | 2,
  edgeId: string,
  portId: string,
): void {
  const previous = roles[portIndex]!
  if (previous !== 0 && previous !== role) {
    throw new Error(`Top-down port has conflicting edge roles: ${edgeId}/${portId}`)
  }
  roles[portIndex] = role
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
  return Object.is(value, -0) ? 0 : value
}

function compareIds(left: Readonly<{id: string}>, right: Readonly<{id: string}>): number {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0
}

class NumericMinHeap {
  readonly #values: number[] = []

  get size(): number {
    return this.#values.length
  }

  push(value: number): void {
    let index = this.#values.length
    this.#values.push(value)
    while (index > 0) {
      const parent = (index - 1) >> 1
      if (this.#values[parent]! <= value) break
      this.#values[index] = this.#values[parent]!
      index = parent
    }
    this.#values[index] = value
  }

  pop(): number {
    const result = this.#values[0]!
    const last = this.#values.pop()!
    if (this.#values.length === 0) return result
    let index = 0
    while (true) {
      const left = index * 2 + 1
      if (left >= this.#values.length) break
      const right = left + 1
      const child = right < this.#values.length && this.#values[right]! < this.#values[left]! ? right : left
      if (this.#values[child]! >= last) break
      this.#values[index] = this.#values[child]!
      index = child
    }
    this.#values[index] = last
    return result
  }
}
