import {connect as dagConnect} from "d3-dag/dist/dag/create.js"
import {greedy as coordGreedy} from "d3-dag/dist/sugiyama/coord/greedy.js"
import {twoLayer as decrossTwoLayer} from "d3-dag/dist/sugiyama/decross/two-layer.js"
import {coffmanGraham as layeringCoffmanGraham} from "d3-dag/dist/sugiyama/layering/coffman-graham.js"
import {sugify} from "d3-dag/dist/sugiyama/utils.js"
import type {LayoutPoint} from "../../types/protocol.ts"
import type {
  CoffmanGrahamCrossingGeometry,
  CoffmanGrahamCurveSegment,
  CoffmanGrahamCycleWitness,
  CoffmanGrahamEdgeGeometry,
  CoffmanGrahamLayoutGraph,
  CoffmanGrahamLayoutResult,
  CoffmanGrahamPortGeometry,
} from "../../types/coffman-graham.ts"

const DEFAULT_MAX_NODES_PER_LAYER = 4
const DEFAULT_NODE_SPACING = 32
const DEFAULT_LAYER_SPACING = 52
const DEFAULT_EDGE_SPACING = 10
const DEFAULT_PADDING = 24
const ROUNDED_CORNER_RADIUS = 5
const SOURCE_RUNWAY_SPACINGS = 2
const TARGET_RUNWAY_SPACINGS = 8
const MAX_NODES = 512
const MAX_PORTS = 4096
const MAX_EDGES = 2048
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
  options: Readonly<{
    maxNodesPerLayer: number
    nodeSpacing: number
    layerSpacing: number
    edgeSpacing: number
    padding: number
  }>
}>
type Placement = Readonly<{
  nodeX: Float64Array
  nodeY: Float64Array
  nodeLayer: Int32Array
  portX: Float64Array
  portY: Float64Array
  edgePoints: ReadonlyMap<string, readonly LayoutPoint[]>
}>
type LayerGeometry = Readonly<{
  id: number
  top: number
  bottom: number
  center: number
}>
type ChannelLeg = {
  edgeId: string
  upperLayer: number
  lowerLayer: number
  startX: number
  endX: number
  trackIndex: number
  trackOffset: number
}
type CorridorPlan = Readonly<{
  diagonalBlockStart: number
}>
type ChannelPlacement = Placement & Readonly<{
  layerGeometry: ReadonlyMap<number, LayerGeometry>
  legsByEdgeId: ReadonlyMap<string, readonly ChannelLeg[]>
  corridors: ReadonlyMap<number, CorridorPlan>
}>
type RoutedGraph = Readonly<{
  edges: readonly CoffmanGrahamEdgeGeometry[]
  paths: ReadonlyMap<string, readonly LayoutPoint[]>
}>
type LinkDatum = Readonly<{
  edgeIds: readonly string[] | null
  source: string
  target: string
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

export function solveCoffmanGraham(
  input: CoffmanGrahamLayoutGraph,
  cycleError: (witness: CoffmanGrahamCycleWitness) => Error,
): CoffmanGrahamLayoutResult {
  const graph = normalizeGraph(input)
  validateDag(graph, cycleError)
  const placed = planDiagonalChannels(graph, orderPortsByConnections(graph, placeGraph(graph)))
  const routed = routeEdges(graph, placed)
  return materialize(graph, placed, routed.edges, classifyCrossings(routed.paths))
}

function normalizeGraph(input: CoffmanGrahamLayoutGraph): NormalizedGraph {
  if (input.nodes.length > MAX_NODES || input.ports.length > MAX_PORTS || input.edges.length > MAX_EDGES) {
    throw new Error(`Coffman–Graham graph exceeds the bounded policy budget: ${input.nodes.length}/${input.ports.length}/${input.edges.length}`)
  }
  const options = {
    maxNodesPerLayer: boundedInteger(
      input.layoutOptions?.maxNodesPerLayer,
      DEFAULT_MAX_NODES_PER_LAYER,
      2,
      16,
      "maxNodesPerLayer",
    ),
    nodeSpacing: positive(input.layoutOptions?.nodeSpacing, DEFAULT_NODE_SPACING, "nodeSpacing"),
    layerSpacing: positive(input.layoutOptions?.layerSpacing, DEFAULT_LAYER_SPACING, "layerSpacing"),
    edgeSpacing: positive(input.layoutOptions?.edgeSpacing, DEFAULT_EDGE_SPACING, "edgeSpacing"),
    padding: positive(input.layoutOptions?.padding, DEFAULT_PADDING, "padding"),
  }
  const nodeIds = new Set<string>()
  const nodes = [...input.nodes].sort(compareIds).map((node): NormalizedNode => {
    requireId(node.id, "node")
    if (nodeIds.has(node.id)) throw new Error(`Duplicate Coffman–Graham node: ${node.id}`)
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
    if (portIds.has(port.id)) throw new Error(`Duplicate Coffman–Graham port: ${port.id}`)
    portIds.add(port.id)
    const nodeIndex = nodeIndexById.get(port.nodeId)
    if (nodeIndex === undefined) throw new Error(`Unknown Coffman–Graham port node: ${port.id}/${port.nodeId}`)
    const offsetX = finite(port.x, `port.x:${port.id}`)
    if (offsetX < 0 || offsetX > nodes[nodeIndex]!.width) {
      throw new Error(`Coffman–Graham port is outside node width: ${port.id}`)
    }
    return {id: port.id, nodeIndex, offsetX}
  })
  const portIndexById = new Map(ports.map((port, index) => [port.id, index]))
  const edgeIds = new Set<string>()
  const roles = new Int8Array(ports.length)
  const edges = [...input.edges].sort(compareIds).map((edge): NormalizedEdge => {
    requireId(edge.id, "edge")
    if (edgeIds.has(edge.id)) throw new Error(`Duplicate Coffman–Graham edge: ${edge.id}`)
    edgeIds.add(edge.id)
    const sourcePortIndex = portIndexById.get(edge.sourcePortId)
    const targetPortIndex = portIndexById.get(edge.targetPortId)
    if (sourcePortIndex === undefined) throw new Error(`Unknown Coffman–Graham source port: ${edge.id}/${edge.sourcePortId}`)
    if (targetPortIndex === undefined) throw new Error(`Unknown Coffman–Graham target port: ${edge.id}/${edge.targetPortId}`)
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
  validatePortSlots(nodes, ports, roles)
  return {nodes, ports, edges, options}
}

function validatePortSlots(
  nodes: readonly NormalizedNode[],
  ports: readonly NormalizedPort[],
  roles: Int8Array,
): void {
  const slotsByNodeRole = new Map<number, number[]>()
  for (let index = 0; index < ports.length; index += 1) {
    const role = roles[index]!
    if (role === 0) continue
    const port = ports[index]!
    const key = port.nodeIndex * 2 + role - 1
    const slots = slotsByNodeRole.get(key) ?? []
    slots.push(port.offsetX)
    slotsByNodeRole.set(key, slots)
  }
  for (const [key, slots] of slotsByNodeRole) {
    slots.sort((left, right) => left - right)
    for (let index = 1; index < slots.length; index += 1) {
      if (Math.abs(slots[index]! - slots[index - 1]!) > EPSILON) continue
      const nodeIndex = Math.floor(key / 2)
      const side = key % 2 === 0 ? "SOUTH" : "NORTH"
      throw new Error(`Coffman–Graham port slots overlap: ${nodes[nodeIndex]!.id}/${side}`)
    }
  }
}

function validateDag(
  graph: NormalizedGraph,
  cycleError: (witness: CoffmanGrahamCycleWitness) => Error,
): void {
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

function placeGraph(graph: NormalizedGraph): Placement {
  const connected = new Set<number>()
  const edgesByNodePair = new Map<string, NormalizedEdge[]>()
  for (const edge of graph.edges) {
    connected.add(edge.sourceNodeIndex)
    connected.add(edge.targetNodeIndex)
    const key = nodePairKey(
      graph.nodes[edge.sourceNodeIndex]!.id,
      graph.nodes[edge.targetNodeIndex]!.id,
    )
    const values = edgesByNodePair.get(key) ?? []
    values.push(edge)
    edgesByNodePair.set(key, values)
  }
  const linkData: LinkDatum[] = [...edgesByNodePair.values()].map((edges) => {
    const edge = edges[0]!
    return {
      edgeIds: edges.map(({id}) => id),
      source: graph.nodes[edge.sourceNodeIndex]!.id,
      target: graph.nodes[edge.targetNodeIndex]!.id,
    }
  })
  for (let index = 0; index < graph.nodes.length; index += 1) {
    if (!connected.has(index)) {
      linkData.push({edgeIds: null, source: graph.nodes[index]!.id, target: graph.nodes[index]!.id})
    }
  }
  const dag = dagConnect()
    .sourceId((datum: LinkDatum) => datum.source)
    .targetId((datum: LinkDatum) => datum.target)
    .single(true)(linkData)
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]))
  layeringCoffmanGraham().width(graph.options.maxNodesPerLayer)(dag)
  const layers = sugify(dag)
  const size = (node: (typeof layers)[number][number]): readonly [number, number] => {
    if ("target" in node.data) {
      const parallelCount = edgesByNodePair.get(nodePairKey(
        node.data.source.data.id,
        node.data.target.data.id,
      ))!.length
      return [graph.options.edgeSpacing * parallelCount, 0]
    }
    const measured = nodeById.get(node.data.node.data.id)!
    return [measured.width + graph.options.nodeSpacing, measured.height + graph.options.layerSpacing]
  }
  let layoutHeight = 0
  for (const layer of layers) {
    const layerHeight = Math.max(...layer.map((node) => size(node)[1]))
    for (const node of layer) node.y = layoutHeight + layerHeight / 2
    layoutHeight += layerHeight
  }
  decrossTwoLayer()(layers)
  coordGreedy()(layers, (node) => size(node)[0])
  for (const layer of layers) {
    for (const node of layer) {
      if (node.x === undefined || node.y === undefined) {
        throw new Error("Coffman–Graham coordinate assignment did not place every node")
      }
      if ("target" in node.data) continue
      const original = node.data.node
      original.x = node.x
      original.y = node.y
      const pointsByTarget = new Map(
        [...original.ichildLinks()].map(({points, target}) => [target, points]),
      )
      for (const firstChild of node.ichildren()) {
        const points = [{x: node.x, y: node.y}]
        let child = firstChild
        while ("target" in child.data) {
          if (child.x === undefined || child.y === undefined) {
            throw new Error("Coffman–Graham coordinate assignment did not place every dummy")
          }
          points.push({x: child.x, y: child.y})
          child = [...child.ichildren()][0]!
        }
        if (child.x === undefined || child.y === undefined) {
          throw new Error("Coffman–Graham coordinate assignment did not place every target")
        }
        points.push({x: child.x, y: child.y})
        const targetPoints = pointsByTarget.get(child.data.node)
        if (targetPoints === undefined) {
          throw new Error("Coffman–Graham did not preserve a routed link")
        }
        targetPoints.splice(0, targetPoints.length, ...points)
      }
    }
  }

  const nodeIndexById = new Map(graph.nodes.map((node, index) => [node.id, index]))
  const nodeX = new Float64Array(graph.nodes.length)
  const nodeY = new Float64Array(graph.nodes.length)
  const nodeLayer = new Int32Array(graph.nodes.length)
  for (const node of dag) {
    const nodeIndex = nodeIndexById.get(node.data.id)!
    const measured = graph.nodes[nodeIndex]!
    nodeX[nodeIndex] = clean(node.x! - measured.width / 2)
    nodeY[nodeIndex] = clean(node.y! - measured.height / 2)
    nodeLayer[nodeIndex] = node.value!
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
  for (const link of dag.links()) {
    const datum = link.data as LinkDatum
    if (datum.edgeIds === null) continue
    const center = (datum.edgeIds.length - 1) / 2
    for (let index = 0; index < datum.edgeIds.length; index += 1) {
      const offsetX = (index - center) * graph.options.edgeSpacing
      edgePoints.set(
        datum.edgeIds[index]!,
        link.points.map(({x, y}) => point(x + offsetX, y)),
      )
    }
  }
  if (edgePoints.size !== graph.edges.length) {
    throw new Error(`Coffman–Graham did not preserve every semantic edge: ${edgePoints.size}/${graph.edges.length}`)
  }
  return {nodeX, nodeY, nodeLayer, portX, portY, edgePoints}
}

/** Derives a free node-side port order from the already reduced connection order. */
function orderPortsByConnections(graph: NormalizedGraph, placed: Placement): Placement {
  type OrderedPort = Readonly<{
    edgeId: string
    portIndex: number
    adjacentX: number
  }>
  const sourceByNode = new Map<number, OrderedPort[]>()
  const targetByNode = new Map<number, OrderedPort[]>()
  for (const edge of graph.edges) {
    const points = placed.edgePoints.get(edge.id)!
    addOrderedPort(sourceByNode, edge.sourceNodeIndex, {
      edgeId: edge.id,
      portIndex: edge.sourcePortIndex,
      adjacentX: points[1]!.x,
    })
    addOrderedPort(targetByNode, edge.targetNodeIndex, {
      edgeId: edge.id,
      portIndex: edge.targetPortIndex,
      adjacentX: points.at(-2)!.x,
    })
  }
  const portX = placed.portX.slice()
  assignOrderedPortSlots(sourceByNode, portX)
  assignOrderedPortSlots(targetByNode, portX)
  return {...placed, portX}
}

function addOrderedPort<T>(groups: Map<number, T[]>, nodeIndex: number, value: T): void {
  const values = groups.get(nodeIndex) ?? []
  values.push(value)
  groups.set(nodeIndex, values)
}

function assignOrderedPortSlots(
  groups: ReadonlyMap<number, readonly Readonly<{
    edgeId: string
    portIndex: number
    adjacentX: number
  }>[]>,
  portX: Float64Array,
): void {
  for (const values of groups.values()) {
    const slots = values.map(({portIndex}) => portX[portIndex]!).sort((left, right) => left - right)
    const ordered = [...values].sort((left, right) =>
      left.adjacentX - right.adjacentX || left.edgeId.localeCompare(right.edgeId))
    for (let index = 0; index < ordered.length; index += 1) {
      portX[ordered[index]!.portIndex] = slots[index]!
    }
  }
}

/** Reserves deterministic Y tracks so diagonal centerlines keep `edgeSpacing`. */
function planDiagonalChannels(graph: NormalizedGraph, placed: Placement): ChannelPlacement {
  const originalLayers = collectLayerGeometry(graph, placed)
  const layerIds = [...originalLayers.keys()].sort((left, right) => left - right)
  const layerPosition = new Map(layerIds.map((id, index) => [id, index]))
  const legsByEdgeId = new Map<string, readonly ChannelLeg[]>()
  const diagonalLegsByUpperLayer = new Map<number, ChannelLeg[]>()
  for (const edge of graph.edges) {
    const sourceLayer = placed.nodeLayer[edge.sourceNodeIndex]!
    const targetLayer = placed.nodeLayer[edge.targetNodeIndex]!
    const sourcePosition = layerPosition.get(sourceLayer)!
    const targetPosition = layerPosition.get(targetLayer)!
    const points = placed.edgePoints.get(edge.id)!
    const expectedPointCount = targetPosition - sourcePosition + 1
    if (points.length !== expectedPointCount) {
      throw new Error(`Coffman–Graham edge guide does not cover every layer: ${edge.id}/${points.length}/${expectedPointCount}`)
    }
    const layerXs = [
      placed.portX[edge.sourcePortIndex]!,
      ...points.slice(1, -1).map(({x}) => x),
      placed.portX[edge.targetPortIndex]!,
    ]
    const legs: ChannelLeg[] = []
    for (let offset = 0; offset < expectedPointCount - 1; offset += 1) {
      const upperLayer = layerIds[sourcePosition + offset]!
      const lowerLayer = layerIds[sourcePosition + offset + 1]!
      const leg: ChannelLeg = {
        edgeId: edge.id,
        upperLayer,
        lowerLayer,
        startX: layerXs[offset]!,
        endX: layerXs[offset + 1]!,
        trackIndex: -1,
        trackOffset: -1,
      }
      legs.push(leg)
      if (Math.abs(leg.endX - leg.startX) > EPSILON) {
        const values = diagonalLegsByUpperLayer.get(upperLayer) ?? []
        values.push(leg)
        diagonalLegsByUpperLayer.set(upperLayer, values)
      }
    }
    legsByEdgeId.set(edge.id, legs)
  }

  const diagonalBlockHeightByUpperLayer = new Map<number, number>()
  for (const [upperLayer, legs] of diagonalLegsByUpperLayer) {
    diagonalBlockHeightByUpperLayer.set(
      upperLayer,
      assignDiagonalTracks(legs, graph.options.edgeSpacing),
    )
  }
  const sourceRunway = graph.options.edgeSpacing * SOURCE_RUNWAY_SPACINGS
  const targetRunway = graph.options.edgeSpacing * TARGET_RUNWAY_SPACINGS
  const shiftByLayer = new Map<number, number>()
  let cumulativeShift = 0
  for (let index = 0; index < layerIds.length; index += 1) {
    const layerId = layerIds[index]!
    shiftByLayer.set(layerId, cumulativeShift)
    const nextLayerId = layerIds[index + 1]
    if (nextLayerId === undefined) continue
    const upper = originalLayers.get(layerId)!
    const lower = originalLayers.get(nextLayerId)!
    const diagonalBlockHeight = diagonalBlockHeightByUpperLayer.get(layerId) ?? 0
    const requiredGap = sourceRunway + diagonalBlockHeight + targetRunway
    const originalGap = lower.top - upper.bottom
    cumulativeShift += Math.max(0, requiredGap - originalGap)
  }

  const nodeY = placed.nodeY.slice()
  for (let index = 0; index < graph.nodes.length; index += 1) {
    nodeY[index] = clean(nodeY[index]! + shiftByLayer.get(placed.nodeLayer[index]!)!)
  }
  const portY = placed.portY.slice()
  for (let index = 0; index < graph.ports.length; index += 1) {
    portY[index] = clean(portY[index]! + shiftByLayer.get(placed.nodeLayer[graph.ports[index]!.nodeIndex]!)!)
  }
  const layerGeometry = new Map<number, LayerGeometry>()
  for (const layerId of layerIds) {
    const original = originalLayers.get(layerId)!
    const shift = shiftByLayer.get(layerId)!
    layerGeometry.set(layerId, {
      id: layerId,
      top: clean(original.top + shift),
      bottom: clean(original.bottom + shift),
      center: clean(original.center + shift),
    })
  }
  const corridors = new Map<number, CorridorPlan>()
  for (let index = 0; index < layerIds.length - 1; index += 1) {
    const upperLayer = layerIds[index]!
    const upper = layerGeometry.get(upperLayer)!
    corridors.set(upperLayer, {
      diagonalBlockStart: clean(upper.bottom + sourceRunway),
    })
  }
  return {
    ...placed,
    nodeY,
    portY,
    layerGeometry,
    legsByEdgeId,
    corridors,
  }
}

function collectLayerGeometry(
  graph: NormalizedGraph,
  placed: Placement,
): ReadonlyMap<number, LayerGeometry> {
  const layers = new Map<number, {id: number; top: number; bottom: number; center: number}>()
  for (let index = 0; index < graph.nodes.length; index += 1) {
    const id = placed.nodeLayer[index]!
    const node = graph.nodes[index]!
    const top = placed.nodeY[index]!
    const bottom = top + node.height
    const center = top + node.height / 2
    const current = layers.get(id)
    if (current === undefined) layers.set(id, {id, top, bottom, center})
    else {
      if (Math.abs(current.center - center) > EPSILON) {
        throw new Error(`Coffman–Graham layer does not share one center: ${id}`)
      }
      current.top = Math.min(current.top, top)
      current.bottom = Math.max(current.bottom, bottom)
    }
  }
  return layers
}

function assignDiagonalTracks(legs: ChannelLeg[], spacing: number): number {
  const compareLegs = (left: ChannelLeg, right: ChannelLeg): number =>
    Math.min(left.startX, left.endX) - Math.min(right.startX, right.endX) ||
    Math.max(left.startX, left.endX) - Math.max(right.startX, right.endX) ||
    left.edgeId.localeCompare(right.edgeId)
  const outgoing = new Map(legs.map((leg) => [leg, new Set<ChannelLeg>()]))
  const predecessors = new Map(legs.map((leg) => [leg, new Set<ChannelLeg>()]))
  const addPrecedence = (before: ChannelLeg, after: ChannelLeg): void => {
    if (before === after || outgoing.get(before)!.has(after)) return
    outgoing.get(before)!.add(after)
    predecessors.get(after)!.add(before)
  }
  for (let leftIndex = 0; leftIndex < legs.length; leftIndex += 1) {
    const left = legs[leftIndex]!
    for (let rightIndex = leftIndex + 1; rightIndex < legs.length; rightIndex += 1) {
      const right = legs[rightIndex]!
      let leftAboveRight =
        Number(insideOpenInterval(right.startX, left.startX, left.endX)) +
        Number(insideOpenInterval(left.endX, right.startX, right.endX))
      let rightAboveLeft =
        Number(insideOpenInterval(left.startX, right.startX, right.endX)) +
        Number(insideOpenInterval(right.endX, left.startX, left.endX))
      if (Math.abs(left.endX - right.startX) < spacing - EPSILON) leftAboveRight += 1
      if (Math.abs(right.endX - left.startX) < spacing - EPSILON) rightAboveLeft += 1
      if (Math.abs(left.endX - right.startX) <= EPSILON) leftAboveRight += 1
      if (Math.abs(right.endX - left.startX) <= EPSILON) rightAboveLeft += 1
      if (leftAboveRight < rightAboveLeft) addPrecedence(left, right)
      else if (rightAboveLeft < leftAboveRight) addPrecedence(right, left)
    }
  }
  const indegree = new Map(legs.map((leg) => [leg, predecessors.get(leg)!.size]))
  const ready = legs.filter((leg) => indegree.get(leg) === 0).sort(compareLegs)
  const ordered: ChannelLeg[] = []
  const emitted = new Set<ChannelLeg>()
  while (ordered.length < legs.length) {
    if (ready.length === 0) {
      const next = legs.filter((leg) => !emitted.has(leg)).sort(compareLegs)[0]!
      for (const predecessor of predecessors.get(next)!) outgoing.get(predecessor)!.delete(next)
      predecessors.get(next)!.clear()
      indegree.set(next, 0)
      ready.push(next)
    }
    const leg = ready.shift()!
    ordered.push(leg)
    emitted.add(leg)
    for (const next of outgoing.get(leg)!) {
      const remaining = indegree.get(next)! - 1
      indegree.set(next, remaining)
      if (remaining === 0) insertBy(ready, next, compareLegs)
    }
  }
  const tracks: ChannelLeg[][] = []
  for (const leg of ordered) {
    let selected = 0
    for (const predecessor of predecessors.get(leg)!) {
      selected = Math.max(selected, predecessor.trackIndex + 1)
    }
    while (true) {
      const track = tracks[selected]
      if (track === undefined) {
        tracks[selected] = [leg]
        break
      }
      if (track.every((existing) => separatedXIntervals(existing, leg, spacing))) {
        track.push(leg)
        break
      }
      selected += 1
    }
    leg.trackIndex = selected
  }
  const offsets = new Float64Array(tracks.length)
  for (let lowerIndex = 0; lowerIndex < tracks.length; lowerIndex += 1) {
    for (let upperIndex = 0; upperIndex < lowerIndex; upperIndex += 1) {
      let required = 0
      for (const upper of tracks[upperIndex]!) {
        for (const lower of tracks[lowerIndex]!) {
          if (separatedXIntervals(upper, lower, spacing)) continue
          required = Math.max(required, requiredDiagonalOffset(upper, lower, spacing))
        }
      }
      offsets[lowerIndex] = Math.max(offsets[lowerIndex]!, offsets[upperIndex]! + required)
    }
    offsets[lowerIndex] = clean(offsets[lowerIndex]!)
    for (const leg of tracks[lowerIndex]!) leg.trackOffset = offsets[lowerIndex]!
  }
  return tracks.length === 0
    ? 0
    : clean(Math.max(...offsets) + spacing)
}

/** Minimal downward shift that keeps two finite diagonal centerlines `spacing` apart. */
function requiredDiagonalOffset(upper: ChannelLeg, lower: ChannelLeg, spacing: number): number {
  const difference = [
    point(upper.startX - lower.startX, 0),
    point(upper.startX - lower.endX, -spacing),
    point(upper.endX - lower.endX, 0),
    point(upper.endX - lower.startX, spacing),
  ]
  let required = 0
  for (let index = 0; index < difference.length; index += 1) {
    const start = difference[index]!
    const end = difference[(index + 1) % difference.length]!
    const minimumX = Math.max(-spacing, Math.min(start.x, end.x))
    const maximumX = Math.min(spacing, Math.max(start.x, end.x))
    if (minimumX > maximumX + EPSILON) continue
    if (Math.abs(end.x - start.x) <= EPSILON) {
      required = Math.max(required, clearanceOffset(start.x, Math.max(start.y, end.y), spacing))
      continue
    }
    const slope = (end.y - start.y) / (end.x - start.x)
    const intercept = start.y - slope * start.x
    required = Math.max(
      required,
      clearanceOffset(minimumX, slope * minimumX + intercept, spacing),
      clearanceOffset(maximumX, slope * maximumX + intercept, spacing),
    )
    const stationaryX = slope * spacing / Math.sqrt(1 + slope * slope)
    if (stationaryX >= minimumX - EPSILON && stationaryX <= maximumX + EPSILON) {
      required = Math.max(
        required,
        clearanceOffset(stationaryX, slope * stationaryX + intercept, spacing),
      )
    }
  }
  return clean(required)
}

function clearanceOffset(x: number, y: number, spacing: number): number {
  return y + Math.sqrt(Math.max(0, spacing * spacing - x * x))
}

function insideOpenInterval(value: number, first: number, second: number): boolean {
  return value > Math.min(first, second) + EPSILON && value < Math.max(first, second) - EPSILON
}

function separatedXIntervals(left: ChannelLeg, right: ChannelLeg, spacing: number): boolean {
  const leftMinimum = Math.min(left.startX, left.endX)
  const leftMaximum = Math.max(left.startX, left.endX)
  const rightMinimum = Math.min(right.startX, right.endX)
  const rightMaximum = Math.max(right.startX, right.endX)
  return leftMaximum + spacing <= rightMinimum + EPSILON ||
    rightMaximum + spacing <= leftMinimum + EPSILON
}

function insertBy<T>(values: T[], value: T, compare: (left: T, right: T) => number): void {
  let index = 0
  while (index < values.length && compare(values[index]!, value) <= 0) index += 1
  values.splice(index, 0, value)
}

function routeEdges(graph: NormalizedGraph, placed: ChannelPlacement): RoutedGraph {
  const paths = new Map<string, readonly LayoutPoint[]>()
  const edges = graph.edges.map((edge): CoffmanGrahamEdgeGeometry => {
    const start = point(placed.portX[edge.sourcePortIndex]!, placed.portY[edge.sourcePortIndex]!)
    const end = point(placed.portX[edge.targetPortIndex]!, placed.portY[edge.targetPortIndex]!)
    const guide: LayoutPoint[] = [start]
    for (const leg of placed.legsByEdgeId.get(edge.id)!) {
      const upper = placed.layerGeometry.get(leg.upperLayer)!
      const lower = placed.layerGeometry.get(leg.lowerLayer)!
      guide.push(point(
        leg.startX,
        upper.bottom + graph.options.edgeSpacing * SOURCE_RUNWAY_SPACINGS,
      ))
      const corridor = placed.corridors.get(leg.upperLayer)!
      if (leg.trackOffset >= 0) {
        const diagonalStartY = corridor.diagonalBlockStart +
          leg.trackOffset
        guide.push(
          point(leg.startX, diagonalStartY),
          point(leg.endX, diagonalStartY + graph.options.edgeSpacing),
        )
      }
      guide.push(point(
        leg.endX,
        lower.top - graph.options.edgeSpacing * TARGET_RUNWAY_SPACINGS,
      ))
    }
    guide.push(end)
    const path = strictlyDownwardGuide(guide)
    paths.set(edge.id, path)
    const primitives = roundedPrimitives(path, ROUNDED_CORNER_RADIUS)
    const curves = primitivesToCubics(primitives)
    if (curves.length === 0) throw new Error(`Coffman–Graham edge has no rounded path: ${edge.id}`)
    return {id: edge.id, curves: [curves[0]!, ...curves.slice(1)]}
  })
  return {edges, paths}
}

function classifyCrossings(
  paths: ReadonlyMap<string, readonly LayoutPoint[]>,
): readonly CoffmanGrahamCrossingGeometry[] {
  const sections = [...paths].flatMap(([edgeId, points]) => points.slice(1).map((endPoint, index) => {
    const startPoint = points[index]!
    return {
      edgeId,
      startPoint,
      endPoint,
      minimumX: Math.min(startPoint.x, endPoint.x),
      maximumX: Math.max(startPoint.x, endPoint.x),
      minimumY: Math.min(startPoint.y, endPoint.y),
      maximumY: Math.max(startPoint.y, endPoint.y),
    }
  })).sort((left, right) =>
      left.minimumY - right.minimumY ||
      left.maximumY - right.maximumY ||
      left.edgeId.localeCompare(right.edgeId))
  const crossings: CoffmanGrahamCrossingGeometry[] = []
  let active: typeof sections = []
  for (const right of sections) {
    active = active.filter((left) => left.maximumY > right.minimumY + EPSILON)
    for (const left of active) {
      if (left.edgeId === right.edgeId ||
          left.maximumX <= right.minimumX + EPSILON ||
          right.maximumX <= left.minimumX + EPSILON) continue
      const intersection = openLineIntersection(
        left.startPoint,
        left.endPoint,
        right.startPoint,
        right.endPoint,
      )
      if (intersection === null) continue
      const leftDiagonal = Math.abs(left.endPoint.x - left.startPoint.x) > EPSILON
      const rightDiagonal = Math.abs(right.endPoint.x - right.startPoint.x) > EPSILON
      const leftOver = leftDiagonal !== rightDiagonal
        ? leftDiagonal
        : left.edgeId.localeCompare(right.edgeId) < 0
      crossings.push({
        overEdgeId: leftOver ? left.edgeId : right.edgeId,
        underEdgeId: leftOver ? right.edgeId : left.edgeId,
        point: intersection,
      })
    }
    active.push(right)
  }
  return crossings.sort((left, right) =>
    left.point.y - right.point.y ||
    left.point.x - right.point.x ||
    left.overEdgeId.localeCompare(right.overEdgeId) ||
    left.underEdgeId.localeCompare(right.underEdgeId))
}

function openLineIntersection(
  leftStart: LayoutPoint,
  leftEnd: LayoutPoint,
  rightStart: LayoutPoint,
  rightEnd: LayoutPoint,
): LayoutPoint | null {
  const leftDx = leftEnd.x - leftStart.x
  const leftDy = leftEnd.y - leftStart.y
  const rightDx = rightEnd.x - rightStart.x
  const rightDy = rightEnd.y - rightStart.y
  const denominator = leftDx * rightDy - leftDy * rightDx
  if (Math.abs(denominator) <= EPSILON) return null
  const offsetX = rightStart.x - leftStart.x
  const offsetY = rightStart.y - leftStart.y
  const leftRatio = (offsetX * rightDy - offsetY * rightDx) / denominator
  const rightRatio = (offsetX * leftDy - offsetY * leftDx) / denominator
  if (leftRatio <= EPSILON || leftRatio >= 1 - EPSILON ||
      rightRatio <= EPSILON || rightRatio >= 1 - EPSILON) return null
  return point(leftStart.x + leftDx * leftRatio, leftStart.y + leftDy * leftRatio)
}

function strictlyDownwardGuide(values: readonly LayoutPoint[]): readonly LayoutPoint[] {
  const start = values[0]
  const end = values.at(-1)
  if (start === undefined || end === undefined || end.y <= start.y + EPSILON) return []
  const result: LayoutPoint[] = [point(start.x, start.y)]
  for (const value of values.slice(1, -1)) {
    const current = point(value.x, value.y)
    if (current.y <= result.at(-1)!.y + EPSILON || current.y >= end.y - EPSILON) continue
    result.push(current)
  }
  result.push(point(end.x, end.y))
  return simplifyPath(result)
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

function primitivesToCubics(primitives: readonly RoundedPrimitive[]): readonly CoffmanGrahamCurveSegment[] {
  return primitives.map((primitive): CoffmanGrahamCurveSegment => {
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
    return {
      startPoint: primitive.start,
      controlPoints: [
        interpolate(primitive.start, primitive.end, 1 / 3),
        interpolate(primitive.start, primitive.end, 2 / 3),
      ],
      endPoint: primitive.end,
    }
  })
}

function pushLine(primitives: RoundedPrimitive[], start: LayoutPoint, end: LayoutPoint): void {
  if (samePoint(start, end)) return
  primitives.push({kind: "line", start, end})
}

function materialize(
  graph: NormalizedGraph,
  placed: Placement,
  routed: readonly CoffmanGrahamEdgeGeometry[],
  routedCrossings: readonly CoffmanGrahamCrossingGeometry[],
): CoffmanGrahamLayoutResult {
  const rawBounds = geometryBounds(graph, placed, routed)
  const shiftX = graph.options.padding - rawBounds.x
  const shiftY = graph.options.padding - rawBounds.y
  const sourcePorts = new Set(graph.edges.map(({sourcePortIndex}) => sourcePortIndex))
  const usedPorts = new Set(graph.edges.flatMap(({sourcePortIndex, targetPortIndex}) => [sourcePortIndex, targetPortIndex]))
  const translate = (value: LayoutPoint): LayoutPoint => point(value.x + shiftX, value.y + shiftY)
  const translateCurve = (curve: CoffmanGrahamCurveSegment): CoffmanGrahamCurveSegment => ({
    startPoint: translate(curve.startPoint),
    controlPoints: [translate(curve.controlPoints[0]), translate(curve.controlPoints[1])],
    endPoint: translate(curve.endPoint),
  })
  const edges = routed.map((edge): CoffmanGrahamEdgeGeometry => ({
    id: edge.id,
    curves: [translateCurve(edge.curves[0]), ...edge.curves.slice(1).map(translateCurve)],
  }))
  const crossings = routedCrossings.map((crossing): CoffmanGrahamCrossingGeometry => ({
    overEdgeId: crossing.overEdgeId,
    underEdgeId: crossing.underEdgeId,
    point: translate(crossing.point),
  }))
  const ports: CoffmanGrahamPortGeometry[] = []
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
    crossings,
  }
}

function geometryBounds(
  graph: NormalizedGraph,
  placed: Placement,
  edges: readonly CoffmanGrahamEdgeGeometry[],
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
): CoffmanGrahamCycleWitness {
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
      const nodeIds = [graph.nodes[target]!.id]
      let cursor = frame.nodeIndex
      while (cursor !== target) {
        nodeIds.push(graph.nodes[cursor]!.id)
        const incoming = parentEdge[cursor]!
        if (incoming < 0) throw new Error("Coffman–Graham cycle witness reconstruction failed")
        cursor = graph.edges[incoming]!.sourceNodeIndex
      }
      nodeIds.reverse()
      const firstNode = [...nodeIds].sort()[0]!
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
  throw new Error("Coffman–Graham cycle witness was not found")
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
  if (previous !== 0 && previous !== role) throw new Error(`Coffman–Graham port has conflicting edge roles: ${edgeId}/${portId}`)
  if (previous === role) throw new Error(`Coffman–Graham port is reused by multiple edges: ${edgeId}/${portId}`)
  roles[index] = role
}

function insertNumber(values: number[], value: number): void {
  let index = 0
  while (index < values.length && values[index]! < value) index += 1
  values.splice(index, 0, value)
}

function boundedInteger(value: number | undefined, fallback: number, minimum: number, maximum: number, label: string): number {
  const candidate = value ?? fallback
  if (!Number.isInteger(candidate) || candidate < minimum || candidate > maximum) {
    throw new Error(`${label} must be an integer between ${minimum} and ${maximum}`)
  }
  return candidate
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
  if (id.length === 0) throw new Error(`Coffman–Graham ${kind} id must not be empty`)
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

function nodePairKey(sourceId: string, targetId: string): string {
  return JSON.stringify([sourceId, targetId])
}
