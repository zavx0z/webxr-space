import {connect as dagConnect} from "d3-dag/dist/dag/create.js"
import {greedy as coordGreedy} from "d3-dag/dist/sugiyama/coord/greedy.js"
import {twoLayer as decrossTwoLayer} from "d3-dag/dist/sugiyama/decross/two-layer.js"
import {coffmanGraham as layeringCoffmanGraham} from "d3-dag/dist/sugiyama/layering/coffman-graham.js"
import {sugify} from "d3-dag/dist/sugiyama/utils.js"
import type {LayoutPoint} from "../../types/protocol.ts"
import type {
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
  const placed = placeGraph(graph)
  const routed = routeEdges(graph, placed)
  return materialize(graph, placed, routed)
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
  return {nodes, ports, edges, options}
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

function routeEdges(graph: NormalizedGraph, placed: Placement): readonly CoffmanGrahamEdgeGeometry[] {
  const layerBounds = new Map<number, {top: number; bottom: number; center: number}>()
  for (let index = 0; index < graph.nodes.length; index += 1) {
    const layer = placed.nodeLayer[index]!
    const node = graph.nodes[index]!
    const current = layerBounds.get(layer)
    const top = placed.nodeY[index]!
    const bottom = top + node.height
    const center = top + node.height / 2
    if (current === undefined) layerBounds.set(layer, {top, bottom, center})
    else {
      current.top = Math.min(current.top, top)
      current.bottom = Math.max(current.bottom, bottom)
      current.center = (current.center + center) / 2
    }
  }
  return graph.edges.map((edge): CoffmanGrahamEdgeGeometry => {
    const start = point(placed.portX[edge.sourcePortIndex]!, placed.portY[edge.sourcePortIndex]!)
    const end = point(placed.portX[edge.targetPortIndex]!, placed.portY[edge.targetPortIndex]!)
    const sourceLayer = placed.nodeLayer[edge.sourceNodeIndex]!
    const targetLayer = placed.nodeLayer[edge.targetNodeIndex]!
    const sourceGuide = point(start.x, layerBounds.get(sourceLayer)!.bottom + graph.options.edgeSpacing)
    const targetGuide = point(end.x, layerBounds.get(targetLayer)!.top - graph.options.edgeSpacing)
    const interior = placed.edgePoints.get(edge.id)!.slice(1, -1).flatMap((guide) => {
      const layer = [...layerBounds.values()].find(({center}) => Math.abs(center - guide.y) <= 1e-5)
      return layer === undefined
        ? [guide]
        : [
            point(guide.x, layer.top - graph.options.edgeSpacing),
            point(guide.x, layer.bottom + graph.options.edgeSpacing),
          ]
    }).filter(({y}) => y > sourceGuide.y + EPSILON && y < targetGuide.y - EPSILON)
    const path = strictlyDownwardGuide([start, sourceGuide, ...interior, targetGuide, end])
    const primitives = roundedPrimitives(path, ROUNDED_CORNER_RADIUS)
    const curves = primitivesToCubics(primitives)
    if (curves.length === 0) throw new Error(`Coffman–Graham edge has no rounded path: ${edge.id}`)
    return {id: edge.id, curves: [curves[0]!, ...curves.slice(1)]}
  })
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
  return primitives.map((primitive, index): CoffmanGrahamCurveSegment => {
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
      controlPoints: [add(primitive.start, startHandle), subtract(primitive.end, endHandle)],
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
  routed: readonly CoffmanGrahamEdgeGeometry[],
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
