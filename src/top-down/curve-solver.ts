import {flextree, type FlextreeNode} from "d3-flextree"
import {Layout as ColaLayout, type InputNode, type Link as ColaBaseLink} from "webcola"
import type {LayoutPoint} from "../../types/protocol.ts"
import type {
  TopDownCurveSegment,
  TopDownCycleWitness,
  TopDownEdgeGeometry,
  TopDownLayoutGraph,
  TopDownLayoutResult,
  TopDownPortGeometry,
} from "../../types/top-down.ts"

const DEFAULT_NODE_SPACING = 40
const DEFAULT_LAYER_SPACING = 64
const DEFAULT_EDGE_SPACING = 16
const DEFAULT_PADDING = 32
const MAX_NODES = 128
const MAX_PORTS = 256
const MAX_EDGES = 512
const COLA_UNCONSTRAINED_ITERATIONS = 0
const COLA_USER_CONSTRAINT_ITERATIONS = 4
const COLA_OVERLAP_ITERATIONS = 8

type NormalizedNode = Readonly<{id: string; width: number; height: number}>
type NormalizedPort = Readonly<{id: string; nodeIndex: number; offsetX: number}>
type NormalizedEdge = Readonly<{
  id: string
  constraint: boolean
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
type FlexDatum = {
  index: number | null
  size: [number, number]
  children: FlexDatum[]
}
type ColaNode = InputNode & {
  id: string
  x: number
  y: number
  width: number
  height: number
  index?: number
}
type ColaLink = ColaBaseLink<ColaNode | number> & {
  constraint: boolean
  separation: number
}
type Placement = Readonly<{
  nodeX: Float64Array
  nodeY: Float64Array
  portX: Float64Array
  portY: Float64Array
}>

export function solveTopDownCurves(
  input: TopDownLayoutGraph,
  cycleError: (witness: TopDownCycleWitness) => Error,
): TopDownLayoutResult {
  const graph = normalizeGraph(input)
  validateDag(graph, cycleError)
  const forest = buildForest(graph)
  const placed = placeForest(graph, forest)
  const routed = routeEdges(graph, placed)
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
    if (typeof edge.constraint !== "boolean") throw new Error(`Top-down edge constraint must be boolean: ${edge.id}`)
    const sourcePortIndex = portIndexById.get(edge.sourcePortId)
    const targetPortIndex = portIndexById.get(edge.targetPortId)
    if (sourcePortIndex === undefined) throw new Error(`Unknown top-down source port: ${edge.id}/${edge.sourcePortId}`)
    if (targetPortIndex === undefined) throw new Error(`Unknown top-down target port: ${edge.id}/${edge.targetPortId}`)
    setRole(roles, sourcePortIndex, 1, edge.id, ports[sourcePortIndex]!.id)
    setRole(roles, targetPortIndex, 2, edge.id, ports[targetPortIndex]!.id)
    return {
      id: edge.id,
      constraint: edge.constraint,
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

function buildForest(graph: NormalizedGraph): Readonly<{
  roots: readonly number[]
  children: readonly (readonly number[])[]
  delayByNode: Int32Array
}> {
  const parent = new Int32Array(graph.nodes.length)
  parent.fill(-1)
  const children = Array.from({length: graph.nodes.length}, () => [] as number[])
  const childOrder = new Map<string, string>()
  for (const edge of graph.edges) {
    if (!edge.constraint) continue
    const previous = parent[edge.targetNodeIndex]!
    if (previous >= 0) {
      throw new Error(`Top-down constrained target has multiple parents: ${graph.nodes[edge.targetNodeIndex]!.id}`)
    }
    parent[edge.targetNodeIndex] = edge.sourceNodeIndex
    children[edge.sourceNodeIndex]!.push(edge.targetNodeIndex)
    childOrder.set(`${edge.sourceNodeIndex}\0${edge.targetNodeIndex}`, edge.id)
  }
  for (let parentIndex = 0; parentIndex < children.length; parentIndex += 1) {
    children[parentIndex]!.sort((left, right) =>
      childOrder.get(`${parentIndex}\0${left}`)!.localeCompare(childOrder.get(`${parentIndex}\0${right}`)!) ||
      compareIds(graph.nodes[left]!, graph.nodes[right]!))
  }
  const roots = graph.nodes.map((_, index) => index).filter((index) => parent[index] === -1)
  const depth = new Int32Array(graph.nodes.length)
  const queue = [...roots]
  while (queue.length > 0) {
    const source = queue.shift()!
    for (const target of children[source]!) {
      depth[target] = depth[source]! + 1
      queue.push(target)
    }
  }
  const overlayTargets = Array.from({length: graph.nodes.length}, () => [] as number[])
  for (const edge of graph.edges) {
    if (!edge.constraint) overlayTargets[edge.sourceNodeIndex]!.push(edge.targetNodeIndex)
  }
  const delayByNode = new Int32Array(graph.nodes.length)
  for (let index = 0; index < graph.nodes.length; index += 1) {
    const targets = overlayTargets[index]!
    if (parent[index] === -1 || children[index]!.length > 0 || targets.length === 0) continue
    const available = targets.map((target) => depth[target]! - depth[index]! - 1)
    if (available.every((delay) => delay > 0)) delayByNode[index] = Math.min(...available)
  }
  return {
    roots,
    children,
    delayByNode,
  }
}

function placeForest(
  graph: NormalizedGraph,
  forest: Readonly<{
    roots: readonly number[]
    children: readonly (readonly number[])[]
    delayByNode: Int32Array
  }>,
): Placement {
  const heights = graph.nodes.map(({height}) => height).sort((left, right) => left - right)
  const virtualStep = heights[Math.floor(heights.length / 2)]! + graph.options.layerSpacing
  let nodeX: Float64Array
  let nodeY: Float64Array
  if (forest.roots.length > 1) {
    const seed = layeredSeed(graph, forest)
    nodeX = seed.nodeX
    nodeY = seed.nodeY
  } else {
    const delayed = (index: number): FlexDatum => {
      let branch = datum(index)
      for (let remaining = forest.delayByNode[index]!; remaining > 0; remaining -= 1) {
        branch = {index: null, size: [0, virtualStep], children: [branch]}
      }
      return branch
    }
    const datum = (index: number): FlexDatum => ({
      index,
      size: [graph.nodes[index]!.width, graph.nodes[index]!.height + graph.options.layerSpacing],
      children: forest.children[index]!.map(delayed),
    })
    const synthetic: FlexDatum = {index: null, size: [0, 0], children: forest.roots.map(datum)}
    const layout = flextree<FlexDatum>({
      children: (entry) => entry.children,
      nodeSize: (entry) => entry.data.size,
      spacing: () => graph.options.nodeSpacing,
    })
    const tree = layout(layout.hierarchy(synthetic))
    const entries: FlextreeNode<FlexDatum>[] = []
    const visit = (entry: FlextreeNode<FlexDatum>): void => {
      if (entry.data.index !== null) entries.push(entry)
      for (const child of entry.children ?? []) visit(child)
    }
    visit(tree)
    const minLeft = Math.min(0, ...entries.map((entry) => entry.x - graph.nodes[entry.data.index!]!.width / 2))
    const minTop = Math.min(0, ...entries.map((entry) => entry.y))
    nodeX = new Float64Array(graph.nodes.length)
    nodeY = new Float64Array(graph.nodes.length)
    for (const entry of entries) {
      const index = entry.data.index!
      nodeX[index] = entry.x - graph.nodes[index]!.width / 2 - minLeft
      nodeY[index] = entry.y - minTop
    }
  }
  const routerNodes: ColaNode[] = graph.nodes.map((node, index) => ({
    id: node.id,
    width: node.width + graph.options.nodeSpacing,
    height: node.height + graph.options.nodeSpacing,
    x: nodeX[index]! + node.width / 2,
    y: nodeY[index]! + node.height / 2,
  }))
  const routerLinks: ColaLink[] = graph.edges.map((edge) => {
    const source = graph.nodes[edge.sourceNodeIndex]!
    const target = graph.nodes[edge.targetNodeIndex]!
    const baseSeparation = (source.height + target.height) / 2 + graph.options.layerSpacing
    return {
      source: edge.sourceNodeIndex,
      target: edge.targetNodeIndex,
      constraint: edge.constraint,
      separation: edge.constraint
        ? baseSeparation + forest.delayByNode[edge.targetNodeIndex]! * virtualStep
        : Math.max(1, graph.options.layerSpacing / 4),
      length: baseSeparation + graph.options.nodeSpacing,
    }
  })
  const router = new ColaLayout()
    .size([Math.max(1, ...routerNodes.map(({x}) => x)), Math.max(1, ...routerNodes.map(({y}) => y))])
    .nodes(routerNodes)
    .links(routerLinks)
    .avoidOverlaps(true)
    .handleDisconnected(true)
    .flowLayout("y", (link: ColaLink) => link.separation)
    .linkDistance((link) => (link as ColaLink).length ?? graph.options.layerSpacing)
    .convergenceThreshold(1e-5)
  router.start(
    COLA_UNCONSTRAINED_ITERATIONS,
    forest.roots.length > 1 ? 1 : COLA_USER_CONSTRAINT_ITERATIONS,
    forest.roots.length > 1 ? 2 : COLA_OVERLAP_ITERATIONS,
    0,
    false,
    false,
  )
  for (let index = 0; index < routerNodes.length; index += 1) {
    const node = routerNodes[index]!
    nodeX[index] = clean(node.x - graph.nodes[index]!.width / 2)
    nodeY[index] = clean(node.y - graph.nodes[index]!.height / 2)
  }
  const portX = new Float64Array(graph.ports.length)
  const portY = new Float64Array(graph.ports.length)
  const sourcePorts = new Set(graph.edges.map(({sourcePortIndex}) => sourcePortIndex))
  for (let index = 0; index < graph.ports.length; index += 1) {
    const port = graph.ports[index]!
    portX[index] = nodeX[port.nodeIndex]! + port.offsetX
    portY[index] = sourcePorts.has(index)
      ? nodeY[port.nodeIndex]! + graph.nodes[port.nodeIndex]!.height
      : nodeY[port.nodeIndex]!
  }
  return {nodeX, nodeY, portX, portY}
}

function layeredSeed(
  graph: NormalizedGraph,
  forest: Readonly<{roots: readonly number[]; children: readonly (readonly number[])[]}>,
): Readonly<{nodeX: Float64Array; nodeY: Float64Array}> {
  const ranks = new Int32Array(graph.nodes.length)
  let maximumRank = 0
  const queue = [...forest.roots]
  for (let head = 0; head < queue.length; head += 1) {
    const source = queue[head]!
    for (const target of forest.children[source]!) {
      ranks[target] = ranks[source]! + 1
      maximumRank = Math.max(maximumRank, ranks[target]!)
      queue.push(target)
    }
  }
  const preorder: number[] = []
  const stack = [...forest.roots].reverse()
  while (stack.length > 0) {
    const nodeIndex = stack.pop()!
    preorder.push(nodeIndex)
    const children = forest.children[nodeIndex]!
    for (let index = children.length - 1; index >= 0; index -= 1) stack.push(children[index]!)
  }
  const preorderPosition = new Int32Array(graph.nodes.length)
  for (let index = 0; index < preorder.length; index += 1) preorderPosition[preorder[index]!] = index
  const layers = Array.from({length: maximumRank + 1}, () => [] as number[])
  for (let index = 0; index < graph.nodes.length; index += 1) layers[ranks[index]!]!.push(index)
  for (const layer of layers) layer.sort((left, right) => preorderPosition[left]! - preorderPosition[right]!)
  const layerWidths = layers.map((layer) => layer.reduce((total, index) =>
    total + graph.nodes[index]!.width, Math.max(0, layer.length - 1) * graph.options.nodeSpacing))
  const contentWidth = Math.max(0, ...layerWidths)
  const nodeX = new Float64Array(graph.nodes.length)
  const nodeY = new Float64Array(graph.nodes.length)
  let top = 0
  for (let rank = 0; rank < layers.length; rank += 1) {
    const layer = layers[rank]!
    const height = Math.max(0, ...layer.map((index) => graph.nodes[index]!.height))
    let left = (contentWidth - layerWidths[rank]!) / 2
    for (const index of layer) {
      nodeX[index] = left
      nodeY[index] = top + (height - graph.nodes[index]!.height) / 2
      left += graph.nodes[index]!.width + graph.options.nodeSpacing
    }
    top += height + graph.options.layerSpacing
  }
  return {nodeX, nodeY}
}

function routeEdges(
  graph: NormalizedGraph,
  placed: Placement,
): readonly TopDownEdgeGeometry[] {
  const router = createObstacleRouter(graph, placed)
  const occupied: OccupiedSegment[] = []
  const resultById = new Map<string, TopDownEdgeGeometry>()
  const schedule = graph.edges.map((_, index) => index).sort((left, right) => {
    const leftEdge = graph.edges[left]!
    const rightEdge = graph.edges[right]!
    if (leftEdge.targetNodeIndex === rightEdge.targetNodeIndex) {
      return placed.portX[leftEdge.sourcePortIndex]! - placed.portX[rightEdge.sourcePortIndex]! ||
        placed.portX[leftEdge.targetPortIndex]! - placed.portX[rightEdge.targetPortIndex]! ||
        compareIds(leftEdge, rightEdge)
    }
    return Number(rightEdge.constraint) - Number(leftEdge.constraint) || compareIds(leftEdge, rightEdge)
  })
  for (const edgeIndex of schedule) {
    const edge = graph.edges[edgeIndex]!
    const start = point(placed.portX[edge.sourcePortIndex]!, placed.portY[edge.sourcePortIndex]!)
    const end = point(placed.portX[edge.targetPortIndex]!, placed.portY[edge.targetPortIndex]!)
    const direct = directCurve(start, end)
    const directPoints = sampleCurves([direct])
    const directAllowed = end.y > start.y && curveClearsNodes(graph, placed, edge, direct)
    const directScore = directAllowed ? routedPathScore(directPoints, occupied) : Number.POSITIVE_INFINITY
    let curves: readonly [TopDownCurveSegment, ...TopDownCurveSegment[]]
    let routingPoints: readonly LayoutPoint[]
    if (directAllowed && directScore < 1_000_000) {
      curves = [direct]
      routingPoints = directPoints
    } else {
      const path = obstaclePath(router, edge, start, end, occupied)
      const routedCurves = roundedPathCurves(path, router.clearance * 0.8)
      const routedScore = routedPathScore(path, occupied)
      if (directScore <= routedScore) {
        curves = [direct]
        routingPoints = directPoints
      } else {
        curves = routedCurves
        routingPoints = path
      }
    }
    for (const segment of pathSegments(routingPoints)) {
      occupied.push(segment)
    }
    resultById.set(edge.id, {id: edge.id, curves})
  }
  return graph.edges.map(({id}) => resultById.get(id)!)
}

function directCurve(start: LayoutPoint, end: LayoutPoint): TopDownCurveSegment {
  const control = Math.max(0, end.y - start.y) * 0.42
  return {
    startPoint: start,
    controlPoints: [
      point(start.x, start.y + control),
      point(end.x, end.y - control),
    ],
    endPoint: end,
  }
}

function obstaclePath(
  router: ObstacleRouter,
  edge: NormalizedEdge,
  start: LayoutPoint,
  end: LayoutPoint,
  occupied: readonly OccupiedSegment[],
): readonly LayoutPoint[] {
  const sourceProbe = point(start.x, start.y + router.clearance)
  const targetProbe = point(end.x, end.y - router.clearance)
  const route = routeOrthogonalVisibility(
    router,
    sourceProbe,
    targetProbe,
    occupied,
  )
  if (route === null) throw new Error(`Top-down obstacle router found no path: ${edge.id}`)
  return simplifyPath([start, ...route, end])
}

type ObstacleRouter = Readonly<{
  clearance: number
  obstacles: readonly RectangleBounds[]
  xs: readonly number[]
  ys: readonly number[]
  xIndex: ReadonlyMap<number, number>
  yIndex: ReadonlyMap<number, number>
  valid: Uint8Array
  horizontal: Uint8Array
  vertical: Uint8Array
}>
type OccupiedSegment = Readonly<{
  start: LayoutPoint
  end: LayoutPoint
}>

function createObstacleRouter(graph: NormalizedGraph, placed: Placement): ObstacleRouter {
  const clearance = graph.options.edgeSpacing
  const obstacles = graph.nodes.map((node, index): RectangleBounds => ({
    left: placed.nodeX[index]! - clearance,
    right: placed.nodeX[index]! + node.width + clearance,
    top: placed.nodeY[index]! - clearance,
    bottom: placed.nodeY[index]! + node.height + clearance,
  }))
  const margin = graph.options.edgeSpacing * 2
  const outerLeft = Math.min(...obstacles.map(({left}) => left)) - margin
  const outerRight = Math.max(...obstacles.map(({right}) => right)) + margin
  const outerTop = Math.min(...obstacles.map(({top}) => top)) - margin
  const outerBottom = Math.max(...obstacles.map(({bottom}) => bottom)) + margin
  const xs = uniqueSorted([
    outerLeft,
    outerRight,
    ...obstacles.flatMap(({left, right}) => [left, right]),
    ...graph.ports.map((_, index) => placed.portX[index]!),
  ])
  const ys = uniqueSorted([
    outerTop,
    outerBottom,
    ...obstacles.flatMap(({top, bottom}) => [top, bottom]),
  ])
  const width = xs.length
  const vertexCount = width * ys.length
  const valid = new Uint8Array(vertexCount)
  for (let yIndex = 0; yIndex < ys.length; yIndex += 1) {
    for (let xIndex = 0; xIndex < width; xIndex += 1) {
      valid[yIndex * width + xIndex] = pointInsideAny(xs[xIndex]!, ys[yIndex]!, obstacles) ? 0 : 1
    }
  }
  const horizontal = new Uint8Array(vertexCount)
  const vertical = new Uint8Array(vertexCount)
  for (let yIndex = 0; yIndex < ys.length; yIndex += 1) {
    for (let xIndex = 0; xIndex < width; xIndex += 1) {
      const vertex = yIndex * width + xIndex
      if (valid[vertex] === 0) continue
      if (xIndex + 1 < width && valid[vertex + 1] === 1 &&
          !pointInsideAny((xs[xIndex]! + xs[xIndex + 1]!) / 2, ys[yIndex]!, obstacles)) horizontal[vertex] = 1
      if (yIndex + 1 < ys.length && valid[vertex + width] === 1 &&
          !pointInsideAny(xs[xIndex]!, (ys[yIndex]! + ys[yIndex + 1]!) / 2, obstacles)) vertical[vertex] = 1
    }
  }
  return {
    clearance,
    obstacles,
    xs,
    ys,
    xIndex: new Map(xs.map((value, index) => [value, index])),
    yIndex: new Map(ys.map((value, index) => [value, index])),
    valid,
    horizontal,
    vertical,
  }
}

function routeOrthogonalVisibility(
  router: ObstacleRouter,
  start: LayoutPoint,
  end: LayoutPoint,
  occupied: readonly OccupiedSegment[],
): readonly LayoutPoint[] | null {
  const simple = routeSimpleChannels(router, start, end, occupied)
  if (simple !== null) return simple
  const startX = router.xIndex.get(start.x)
  const startY = router.yIndex.get(start.y)
  const endX = router.xIndex.get(end.x)
  const endY = router.yIndex.get(end.y)
  if (startX === undefined || startY === undefined || endX === undefined || endY === undefined) return null
  const width = router.xs.length
  const startVertex = startY * width + startX
  const endVertex = endY * width + endX
  if (router.valid[startVertex] === 0 || router.valid[endVertex] === 0) return null
  const distance = new Float64Array(router.valid.length * 2)
  distance.fill(Number.POSITIVE_INFINITY)
  const previous = new Int32Array(distance.length)
  previous.fill(-1)
  const heap = new RouteMinHeap()
  for (const axis of [0, 1] as const) {
    const state = startVertex * 2 + axis
    distance[state] = 0
    heap.push(state, manhattan(start, end), 0)
  }
  let finalState = -1
  while (heap.size > 0) {
    const current = heap.pop()
    if (current.cost !== distance[current.state]) continue
    const vertex = Math.floor(current.state / 2)
    const axis = current.state % 2
    if (vertex === endVertex) {
      finalState = current.state
      break
    }
    const xIndex = vertex % width
    const yIndex = Math.floor(vertex / width)
    for (const [nextVertex, nextAxis, clear] of [
      [vertex - 1, 0, xIndex > 0 && router.horizontal[vertex - 1] === 1],
      [vertex + 1, 0, xIndex + 1 < width && router.horizontal[vertex] === 1],
      [vertex - width, 1, yIndex > 0 && router.vertical[vertex - width] === 1],
      [vertex + width, 1, yIndex + 1 < router.ys.length && router.vertical[vertex] === 1],
    ] as const) {
      if (!clear) continue
      const nextState = nextVertex * 2 + nextAxis
      const nextPoint = point(router.xs[nextVertex % width]!, router.ys[Math.floor(nextVertex / width)]!)
      const step = manhattan(point(router.xs[xIndex]!, router.ys[yIndex]!), nextPoint) + (axis === nextAxis ? 0 : 12)
      const nextDistance = current.cost + step
      if (nextDistance >= distance[nextState]!) continue
      distance[nextState] = nextDistance
      previous[nextState] = current.state
      heap.push(nextState, nextDistance + manhattan(nextPoint, end), nextDistance)
    }
  }
  if (finalState < 0) return null
  const reversed: LayoutPoint[] = []
  for (let state = finalState; state >= 0; state = previous[state]!) {
    const vertex = Math.floor(state / 2)
    reversed.push(point(router.xs[vertex % width]!, router.ys[Math.floor(vertex / width)]!))
    if (vertex === startVertex) break
  }
  return simplifyPath(reversed.reverse())
}

function routeSimpleChannels(
  router: ObstacleRouter,
  start: LayoutPoint,
  end: LayoutPoint,
  occupied: readonly OccupiedSegment[],
): readonly LayoutPoint[] | null {
  let best: Readonly<{score: number; path: readonly LayoutPoint[]}> | null = null
  const consider = (path: readonly LayoutPoint[]): void => {
    const simplified = simplifyPath(path)
    if (!orthogonalPathClears(simplified, router.obstacles)) return
    const score = routedPathScore(simplified, occupied)
    if (best === null || score < best.score) best = {score, path: simplified}
  }
  consider([start, point(start.x, end.y), end])
  consider([start, point(end.x, start.y), end])
  for (const x of router.xs) consider([start, point(x, start.y), point(x, end.y), end])
  for (const y of router.ys) consider([start, point(start.x, y), point(end.x, y), end])
  if (best !== null && (best as Readonly<{score: number}>).score < 1_000_000) {
    return (best as Readonly<{score: number; path: readonly LayoutPoint[]}>).path
  }
  for (const outerX of [router.xs[0]!, router.xs.at(-1)!]) {
    const exits = router.ys.flatMap((y) => {
      const path = simplifyPath([start, point(start.x, y), point(outerX, y)])
      return orthogonalPathClears(path, router.obstacles) ? [{y, path}] : []
    })
    const entries = router.ys.flatMap((y) => {
      const path = simplifyPath([point(outerX, y), point(end.x, y), end])
      return orthogonalPathClears(path, router.obstacles) ? [{y, path}] : []
    })
    for (const exit of exits) {
      for (const entry of entries) {
        const path = simplifyPath([...exit.path, point(outerX, entry.y), ...entry.path.slice(1)])
        const score = routedPathScore(path, occupied)
        if (best === null || score < best.score) best = {score, path}
      }
    }
  }
  for (const outerY of [router.ys[0]!, router.ys.at(-1)!]) {
    const exits = router.xs.flatMap((x) => {
      const path = simplifyPath([start, point(x, start.y), point(x, outerY)])
      return orthogonalPathClears(path, router.obstacles) ? [{x, path}] : []
    })
    const entries = router.xs.flatMap((x) => {
      const path = simplifyPath([point(x, outerY), point(x, end.y), end])
      return orthogonalPathClears(path, router.obstacles) ? [{x, path}] : []
    })
    for (const exit of exits) {
      for (const entry of entries) {
        const path = simplifyPath([...exit.path, point(entry.x, outerY), ...entry.path.slice(1)])
        const score = routedPathScore(path, occupied)
        if (best === null || score < best.score) best = {score, path}
      }
    }
  }
  return best === null ? null : (best as Readonly<{score: number; path: readonly LayoutPoint[]}>).path
}

function routePathScore(path: readonly LayoutPoint[]): number {
  return path.slice(1).reduce((total, current, index) =>
    total + manhattan(path[index]!, current), 0) + Math.max(0, path.length - 2) * 12
}

function routedPathScore(
  path: readonly LayoutPoint[],
  occupied: readonly OccupiedSegment[],
): number {
  let crossings = 0
  let unrelatedOverlaps = 0
  for (const candidate of pathSegments(path)) {
    for (const existing of occupied) {
      if (properSegmentIntersection(candidate.start, candidate.end, existing.start, existing.end)) crossings += 1
      if (collinearInteriorOverlap(candidate.start, candidate.end, existing.start, existing.end)) {
        unrelatedOverlaps += 1
      }
    }
  }
  return unrelatedOverlaps * 100_000_000 + crossings * 1_000_000 + routePathScore(path)
}

function pathSegments(path: readonly LayoutPoint[]): Array<Readonly<{start: LayoutPoint; end: LayoutPoint}>> {
  const segments: Array<Readonly<{start: LayoutPoint; end: LayoutPoint}>> = []
  for (let index = 1; index < path.length; index += 1) {
    const start = path[index - 1]!
    const end = path[index]!
    if (!samePoint(start, end)) segments.push({start, end})
  }
  return segments
}

function sampleCurves(curves: readonly TopDownCurveSegment[]): readonly LayoutPoint[] {
  const points: LayoutPoint[] = []
  for (const curve of curves) {
    for (let sample = 0; sample <= 8; sample += 1) {
      if (points.length > 0 && sample === 0) continue
      points.push(cubicPoint(curve, sample / 8))
    }
  }
  return points
}

function properSegmentIntersection(
  firstStart: LayoutPoint,
  firstEnd: LayoutPoint,
  secondStart: LayoutPoint,
  secondEnd: LayoutPoint,
): boolean {
  const firstX = firstEnd.x - firstStart.x
  const firstY = firstEnd.y - firstStart.y
  const secondX = secondEnd.x - secondStart.x
  const secondY = secondEnd.y - secondStart.y
  const denominator = firstX * secondY - firstY * secondX
  if (Math.abs(denominator) < 1e-9) return false
  const offsetX = secondStart.x - firstStart.x
  const offsetY = secondStart.y - firstStart.y
  const firstRatio = (offsetX * secondY - offsetY * secondX) / denominator
  const secondRatio = (offsetX * firstY - offsetY * firstX) / denominator
  const epsilon = 1e-7
  return firstRatio > epsilon && firstRatio < 1 - epsilon &&
    secondRatio > epsilon && secondRatio < 1 - epsilon
}

function collinearInteriorOverlap(
  firstStart: LayoutPoint,
  firstEnd: LayoutPoint,
  secondStart: LayoutPoint,
  secondEnd: LayoutPoint,
): boolean {
  const firstX = firstEnd.x - firstStart.x
  const firstY = firstEnd.y - firstStart.y
  const secondX = secondEnd.x - secondStart.x
  const secondY = secondEnd.y - secondStart.y
  if (Math.abs(firstX * secondY - firstY * secondX) > 1e-7) return false
  const offsetX = secondStart.x - firstStart.x
  const offsetY = secondStart.y - firstStart.y
  if (Math.abs(firstX * offsetY - firstY * offsetX) > 1e-7) return false
  const horizontal = Math.abs(firstX) >= Math.abs(firstY)
  const firstMin = Math.min(horizontal ? firstStart.x : firstStart.y, horizontal ? firstEnd.x : firstEnd.y)
  const firstMax = Math.max(horizontal ? firstStart.x : firstStart.y, horizontal ? firstEnd.x : firstEnd.y)
  const secondMin = Math.min(horizontal ? secondStart.x : secondStart.y, horizontal ? secondEnd.x : secondEnd.y)
  const secondMax = Math.max(horizontal ? secondStart.x : secondStart.y, horizontal ? secondEnd.x : secondEnd.y)
  return Math.max(firstMin, secondMin) < Math.min(firstMax, secondMax) - 1e-7
}

function orthogonalPathClears(
  path: readonly LayoutPoint[],
  obstacles: readonly RectangleBounds[],
): boolean {
  for (let index = 1; index < path.length; index += 1) {
    const start = path[index - 1]!
    const end = path[index]!
    if (start.x !== end.x && start.y !== end.y) return false
    if (start.y === end.y) {
      const left = Math.min(start.x, end.x)
      const right = Math.max(start.x, end.x)
      for (const rectangle of obstacles) {
        if (start.y > rectangle.top && start.y < rectangle.bottom &&
            Math.max(left, rectangle.left) < Math.min(right, rectangle.right)) return false
      }
    } else {
      const top = Math.min(start.y, end.y)
      const bottom = Math.max(start.y, end.y)
      for (const rectangle of obstacles) {
        if (start.x > rectangle.left && start.x < rectangle.right &&
            Math.max(top, rectangle.top) < Math.min(bottom, rectangle.bottom)) return false
      }
    }
  }
  return true
}

function uniqueSorted(values: readonly number[]): number[] {
  return [...new Set(values)].sort((left, right) => left - right)
}

function pointInsideAny(
  x: number,
  y: number,
  obstacles: readonly RectangleBounds[],
): boolean {
  for (const rectangle of obstacles) {
    if (x > rectangle.left && x < rectangle.right && y > rectangle.top && y < rectangle.bottom) return true
  }
  return false
}

function manhattan(left: LayoutPoint, right: LayoutPoint): number {
  return Math.abs(right.x - left.x) + Math.abs(right.y - left.y)
}

class RouteMinHeap {
  readonly #values: Array<Readonly<{state: number; priority: number; cost: number}>> = []

  get size(): number {
    return this.#values.length
  }

  push(state: number, priority: number, cost: number): void {
    const value = {state, priority, cost}
    this.#values.push(value)
    let index = this.#values.length - 1
    while (index > 0) {
      const parent = (index - 1) >> 1
      if (compareRouteHeap(this.#values[parent]!, value) <= 0) break
      this.#values[index] = this.#values[parent]!
      index = parent
    }
    this.#values[index] = value
  }

  pop(): Readonly<{state: number; priority: number; cost: number}> {
    const root = this.#values[0]!
    const tail = this.#values.pop()!
    if (this.#values.length === 0) return root
    let index = 0
    while (true) {
      const left = index * 2 + 1
      if (left >= this.#values.length) break
      const right = left + 1
      const child = right < this.#values.length &&
        compareRouteHeap(this.#values[right]!, this.#values[left]!) < 0 ? right : left
      if (compareRouteHeap(tail, this.#values[child]!) <= 0) break
      this.#values[index] = this.#values[child]!
      index = child
    }
    this.#values[index] = tail
    return root
  }
}

function compareRouteHeap(
  left: Readonly<{state: number; priority: number; cost: number}>,
  right: Readonly<{state: number; priority: number; cost: number}>,
): number {
  return left.priority - right.priority || left.cost - right.cost || left.state - right.state
}

function roundedPathCurves(
  path: readonly LayoutPoint[],
  radius: number,
): readonly [TopDownCurveSegment, ...TopDownCurveSegment[]] {
  if (path.length === 2) return [straightCurve(path[0]!, path[1]!)]
  const curves: TopDownCurveSegment[] = []
  let current = path[0]!
  let startTangent: LayoutPoint | null = null
  for (let index = 1; index < path.length - 1; index += 1) {
    const corner = path[index]!
    const next = path[index + 1]!
    const incomingLength = Math.hypot(corner.x - current.x, corner.y - current.y)
    const outgoingLength = Math.hypot(next.x - corner.x, next.y - corner.y)
    const localRadius = Math.min(radius, incomingLength / 2, outgoingLength / 2)
    const before = moveTowards(corner, current, localRadius)
    const after = moveTowards(corner, next, localRadius)
    const incomingTangent = point(corner.x - before.x, corner.y - before.y)
    if (!samePoint(current, before)) curves.push(tangentLineCurve(current, before, startTangent, incomingTangent))
    if (!samePoint(before, after)) {
      curves.push({startPoint: before, controlPoints: [corner, corner], endPoint: after})
    }
    current = after
    startTangent = point(after.x - corner.x, after.y - corner.y)
  }
  const end = path.at(-1)!
  if (!samePoint(current, end)) curves.push(tangentLineCurve(current, end, startTangent, null))
  return [curves[0] ?? straightCurve(path[0]!, end), ...curves.slice(1)]
}

function tangentLineCurve(
  start: LayoutPoint,
  end: LayoutPoint,
  startTangent: LayoutPoint | null,
  endTangent: LayoutPoint | null,
): TopDownCurveSegment {
  const defaultTangent = point((end.x - start.x) / 3, (end.y - start.y) / 3)
  const startOffset = startTangent ?? defaultTangent
  const endOffset = endTangent ?? defaultTangent
  return {
    startPoint: start,
    controlPoints: [
      point(start.x + startOffset.x, start.y + startOffset.y),
      point(end.x - endOffset.x, end.y - endOffset.y),
    ],
    endPoint: end,
  }
}

function straightCurve(start: LayoutPoint, end: LayoutPoint): TopDownCurveSegment {
  return {
    startPoint: start,
    controlPoints: [
      point(start.x + (end.x - start.x) / 3, start.y + (end.y - start.y) / 3),
      point(start.x + (end.x - start.x) * 2 / 3, start.y + (end.y - start.y) * 2 / 3),
    ],
    endPoint: end,
  }
}

function curveClearsNodes(
  graph: NormalizedGraph,
  placed: Readonly<{nodeX: Float64Array; nodeY: Float64Array}>,
  edge: NormalizedEdge,
  curve: TopDownCurveSegment,
): boolean {
  for (let nodeIndex = 0; nodeIndex < graph.nodes.length; nodeIndex += 1) {
    if (nodeIndex === edge.sourceNodeIndex || nodeIndex === edge.targetNodeIndex) continue
    const node = graph.nodes[nodeIndex]!
    if (cubicIntersectsRectangle(curve, {
      left: placed.nodeX[nodeIndex]!,
      right: placed.nodeX[nodeIndex]! + node.width,
      top: placed.nodeY[nodeIndex]!,
      bottom: placed.nodeY[nodeIndex]! + node.height,
    })) return false
  }
  return true
}

function materialize(
  graph: NormalizedGraph,
  placed: Readonly<{nodeX: Float64Array; nodeY: Float64Array; portX: Float64Array; portY: Float64Array}>,
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
      x: placed.portX[index]! + shiftX,
      y: placed.portY[index]! + shiftY,
      side: sourcePorts.has(index) ? "SOUTH" : "NORTH",
    })
  }
  return {
    direction: "DOWN",
    bounds: {
      x: 0,
      y: 0,
      width: rawBounds.width + graph.options.padding * 2,
      height: rawBounds.height + graph.options.padding * 2,
    },
    nodes: graph.nodes.map((node, index) => ({
      id: node.id,
      x: placed.nodeX[index]! + shiftX,
      y: placed.nodeY[index]! + shiftY,
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
      for (const point of [curve.startPoint, ...curve.controlPoints, curve.endPoint]) {
        left = Math.min(left, point.x)
        top = Math.min(top, point.y)
        right = Math.max(right, point.x)
        bottom = Math.max(bottom, point.y)
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
      const nodes = new Set<number>([target])
      const edgesInCycle = new Set<number>([edgeIndex])
      let current = frame.nodeIndex
      while (current !== target) {
        nodes.add(current)
        const parent = parentEdge[current]!
        if (parent < 0) break
        edgesInCycle.add(parent)
        current = graph.edges[parent]!.sourceNodeIndex
      }
      return {
        nodeIds: [...nodes].map((index) => graph.nodes[index]!.id).sort(),
        edgeIds: [...edgesInCycle].map((index) => graph.edges[index]!.id).sort(),
      }
    }
  }
  return {
    nodeIds: [...unresolved].map((index) => graph.nodes[index]!.id).sort(),
    edgeIds: graph.edges.filter((edge) =>
      unresolved.has(edge.sourceNodeIndex) && unresolved.has(edge.targetNodeIndex)).map(({id}) => id).sort(),
  }
}

type RectangleBounds = Readonly<{left: number; right: number; top: number; bottom: number}>

function cubicPoint(curve: TopDownCurveSegment, t: number): LayoutPoint {
  const u = 1 - t
  return point(
    u ** 3 * curve.startPoint.x + 3 * u ** 2 * t * curve.controlPoints[0].x +
      3 * u * t ** 2 * curve.controlPoints[1].x + t ** 3 * curve.endPoint.x,
    u ** 3 * curve.startPoint.y + 3 * u ** 2 * t * curve.controlPoints[0].y +
      3 * u * t ** 2 * curve.controlPoints[1].y + t ** 3 * curve.endPoint.y,
  )
}

function cubicIntersectsRectangle(
  curve: TopDownCurveSegment,
  rectangle: RectangleBounds,
  depth = 0,
): boolean {
  const points = [curve.startPoint, ...curve.controlPoints, curve.endPoint]
  const left = Math.min(...points.map(({x}) => x))
  const right = Math.max(...points.map(({x}) => x))
  const top = Math.min(...points.map(({y}) => y))
  const bottom = Math.max(...points.map(({y}) => y))
  if (right < rectangle.left || left > rectangle.right || bottom < rectangle.top || top > rectangle.bottom) {
    return false
  }
  if (depth >= 12 || cubicFlatness(curve) <= 0.25) {
    return segmentIntersectsRectangle(curve.startPoint, curve.endPoint, rectangle)
  }
  const [first, second] = splitCubic(curve)
  return cubicIntersectsRectangle(first, rectangle, depth + 1) ||
    cubicIntersectsRectangle(second, rectangle, depth + 1)
}

function splitCubic(curve: TopDownCurveSegment): readonly [TopDownCurveSegment, TopDownCurveSegment] {
  const [controlA, controlB] = curve.controlPoints
  const a = midpoint(curve.startPoint, controlA)
  const b = midpoint(controlA, controlB)
  const c = midpoint(controlB, curve.endPoint)
  const d = midpoint(a, b)
  const e = midpoint(b, c)
  const split = midpoint(d, e)
  return [
    {startPoint: curve.startPoint, controlPoints: [a, d], endPoint: split},
    {startPoint: split, controlPoints: [e, c], endPoint: curve.endPoint},
  ]
}

function cubicFlatness(curve: TopDownCurveSegment): number {
  return Math.max(
    pointLineDistance(curve.controlPoints[0], curve.startPoint, curve.endPoint),
    pointLineDistance(curve.controlPoints[1], curve.startPoint, curve.endPoint),
  )
}

function pointLineDistance(pointValue: LayoutPoint, start: LayoutPoint, end: LayoutPoint): number {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.hypot(dx, dy)
  if (length === 0) return Math.hypot(pointValue.x - start.x, pointValue.y - start.y)
  return Math.abs(dy * pointValue.x - dx * pointValue.y + end.x * start.y - end.y * start.x) / length
}

function segmentIntersectsRectangle(start: LayoutPoint, end: LayoutPoint, rectangle: RectangleBounds): boolean {
  let lower = 0
  let upper = 1
  const dx = end.x - start.x
  const dy = end.y - start.y
  for (const [p, q] of [
    [-dx, start.x - rectangle.left],
    [dx, rectangle.right - start.x],
    [-dy, start.y - rectangle.top],
    [dy, rectangle.bottom - start.y],
  ] as const) {
    if (p === 0) {
      if (q < 0) return false
      continue
    }
    const ratio = q / p
    if (p < 0) lower = Math.max(lower, ratio)
    else upper = Math.min(upper, ratio)
    if (lower > upper) return false
  }
  return true
}

function simplifyPath(values: readonly LayoutPoint[]): readonly LayoutPoint[] {
  const result: LayoutPoint[] = []
  for (const value of values) {
    if (!Number.isFinite(value.x) || !Number.isFinite(value.y)) continue
    const candidate = point(value.x, value.y)
    if (samePoint(result.at(-1), candidate)) continue
    const before = result.at(-2)
    const previous = result.at(-1)
    if (before !== undefined && previous !== undefined && collinear(before, previous, candidate)) {
      result[result.length - 1] = candidate
    } else result.push(candidate)
  }
  return result.length >= 2 ? result : [values[0]!, values.at(-1)!]
}

function collinear(first: LayoutPoint, second: LayoutPoint, third: LayoutPoint): boolean {
  return Math.abs((second.x - first.x) * (third.y - second.y) -
    (second.y - first.y) * (third.x - second.x)) < 1e-7
}

function moveTowards(from: LayoutPoint, to: LayoutPoint, distance: number): LayoutPoint {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy)
  if (length === 0 || distance === 0) return from
  const ratio = Math.min(1, distance / length)
  return point(from.x + dx * ratio, from.y + dy * ratio)
}

function samePoint(left: LayoutPoint | undefined, right: LayoutPoint): boolean {
  return left !== undefined && Math.abs(left.x - right.x) < 1e-7 && Math.abs(left.y - right.y) < 1e-7
}

function midpoint(left: LayoutPoint, right: LayoutPoint): LayoutPoint {
  return point((left.x + right.x) / 2, (left.y + right.y) / 2)
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
  return {x: Object.is(x, -0) ? 0 : x, y: Object.is(y, -0) ? 0 : y}
}

function clean(value: number): number {
  const rounded = Math.round(value * 1_000_000) / 1_000_000
  return Object.is(rounded, -0) ? 0 : rounded
}

function compareIds(left: Readonly<{id: string}>, right: Readonly<{id: string}>): number {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0
}
