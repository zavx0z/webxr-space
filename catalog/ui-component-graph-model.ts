import {
  layoutTopDown,
  type TopDownLayoutGraph,
  type TopDownLayoutResult,
} from "@nodes/layout/top-down"
import type {
  UiComponentGraph,
  UiComponentGraphEdge,
  UiComponentGraphNode,
} from "../scripts/ui-component-graph.ts"

export type UiComponentGraphLayout = Readonly<{
  graph: UiComponentGraph
  input: TopDownLayoutGraph
  result: TopDownLayoutResult
  nodeById: ReadonlyMap<string, UiComponentGraphNode>
  sourceEdgeByLayoutId: ReadonlyMap<string, UiComponentGraphEdge>
  edgeKindByLayoutId: ReadonlyMap<string, UiComponentGraphLayoutEdgeKind>
}>

/** Graph-theoretic presentation role; source `may-call` semantics remain separate. */
export type UiComponentGraphLayoutEdgeKind = "tree" | "cross" | "shortcut"

export const UI_GRAPH_NODE_SIZE = Object.freeze({
  element: Object.freeze({width: 360, height: 220}),
  component: Object.freeze({width: 420, height: 250}),
})

export function createUiComponentGraphLayout(graph: UiComponentGraph): UiComponentGraphLayout {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node] as const))
  const edgeKindBySourcePair = classifyUiComponentGraphEdges(graph)
  const sourceEdgeByLayoutId = new Map<string, UiComponentGraphEdge>()
  const edgeKindByLayoutId = new Map<string, UiComponentGraphLayoutEdgeKind>()
  const portById = new Map<string, TopDownLayoutGraph["ports"][number]>()
  const edges: TopDownLayoutGraph["edges"][number][] = []
  const visualEdges = graph.edges.map((edge) => {
    if (!nodeById.has(edge.from) || !nodeById.has(edge.to)) {
      throw new Error(`UI component graph edge references an unknown node: ${edge.from} -> ${edge.to}`)
    }
    const kind = edgeKindBySourcePair.get(sourcePairKey(edge.from, edge.to))!
    const id = layoutEdgeId(edge, kind)
    return {edge, kind, id, dependency: nodeById.get(edge.to)!, consumer: nodeById.get(edge.from)!}
  })
  const sourceRatios = independentPortRatios(visualEdges.map(({id, dependency}) => ({id, nodeId: dependency.id})))
  const targetRatios = independentPortRatios(visualEdges.map(({id, consumer}) => ({id, nodeId: consumer.id})))
  for (const {edge, kind, id, dependency, consumer} of visualEdges) {
    const sourcePortId = routePortId(dependency.id, "out", id)
    const targetPortId = routePortId(consumer.id, "in", id)
    registerRoutePort(portById, dependency, sourcePortId, sourceRatios.get(id)!)
    registerRoutePort(portById, consumer, targetPortId, targetRatios.get(id)!)
    edges.push({id, constraint: kind === "tree", sourcePortId, targetPortId})
    sourceEdgeByLayoutId.set(id, edge)
    edgeKindByLayoutId.set(id, kind)
  }
  const input: TopDownLayoutGraph = Object.freeze({
    nodes: Object.freeze(graph.nodes.map((node) => Object.freeze({
      id: node.id,
      ...UI_GRAPH_NODE_SIZE[node.layer],
    }))),
    ports: Object.freeze([...portById.values()].sort((left, right) => left.id.localeCompare(right.id))),
    edges: Object.freeze(edges),
    layoutOptions: Object.freeze({
      nodeSpacing: 44,
      layerSpacing: 72,
      edgeSpacing: 12,
      padding: 28,
    }),
  })
  return Object.freeze({
    graph,
    input,
    result: layoutTopDown(input),
    nodeById,
    sourceEdgeByLayoutId,
    edgeKindByLayoutId,
  })
}

export function classifyUiComponentGraphEdges(
  graph: UiComponentGraph,
): ReadonlyMap<string, UiComponentGraphLayoutEdgeKind> {
  const nodeIds = new Set(graph.nodes.map(({id}) => id))
  const visualEdges = graph.edges.map((edge) => ({
    id: sourcePairKey(edge.from, edge.to),
    source: edge.to,
    target: edge.from,
  })).sort((left, right) => left.id.localeCompare(right.id))
  const outgoing = new Map([...nodeIds].map((id) => [id, [] as typeof visualEdges[number][]]))
  const incoming = new Map([...nodeIds].map((id) => [id, [] as typeof visualEdges[number][]]))
  for (const edge of visualEdges) {
    outgoing.get(edge.source)!.push(edge)
    incoming.get(edge.target)!.push(edge)
  }
  const ranks = longestPathRanks(nodeIds, outgoing, incoming)
  const shortcutIds = new Set(visualEdges.flatMap((edge) =>
    hasAlternatePath(edge, outgoing) ? [edge.id] : []))
  const treeIds = new Set<string>()
  for (const target of [...nodeIds].sort()) {
    const candidates = incoming.get(target)!
      .filter(({id}) => !shortcutIds.has(id))
      .sort((left, right) =>
        ranks.get(right.source)! - ranks.get(left.source)! || left.id.localeCompare(right.id))
    if (candidates[0] !== undefined) treeIds.add(candidates[0].id)
  }
  return new Map(visualEdges.map(({id}) => [
    id,
    shortcutIds.has(id) ? "shortcut" : treeIds.has(id) ? "tree" : "cross",
  ]))
}

function longestPathRanks(
  nodeIds: ReadonlySet<string>,
  outgoing: ReadonlyMap<string, readonly Readonly<{source: string; target: string}>[]>,
  incoming: ReadonlyMap<string, readonly Readonly<{source: string; target: string}>[]>,
): ReadonlyMap<string, number> {
  const indegree = new Map([...nodeIds].map((id) => [id, incoming.get(id)!.length]))
  const ranks = new Map([...nodeIds].map((id) => [id, 0]))
  const ready = [...nodeIds].filter((id) => indegree.get(id) === 0).sort()
  let visited = 0
  while (ready.length > 0) {
    const source = ready.shift()!
    visited += 1
    for (const edge of outgoing.get(source)!) {
      ranks.set(edge.target, Math.max(ranks.get(edge.target)!, ranks.get(source)! + 1))
      indegree.set(edge.target, indegree.get(edge.target)! - 1)
      if (indegree.get(edge.target) === 0) insertSorted(ready, edge.target)
    }
  }
  if (visited !== nodeIds.size) throw new Error("UI component graph presentation requires a DAG")
  return ranks
}

function hasAlternatePath(
  skipped: Readonly<{id: string; source: string; target: string}>,
  outgoing: ReadonlyMap<string, readonly Readonly<{id: string; source: string; target: string}>[]>,
): boolean {
  const queue = [skipped.source]
  const seen = new Set(queue)
  while (queue.length > 0) {
    const source = queue.shift()!
    for (const edge of outgoing.get(source)!) {
      if (edge.id === skipped.id) continue
      if (edge.target === skipped.target) return true
      if (seen.has(edge.target)) continue
      seen.add(edge.target)
      queue.push(edge.target)
    }
  }
  return false
}

function insertSorted(values: string[], value: string): void {
  let index = 0
  while (index < values.length && values[index]!.localeCompare(value) < 0) index += 1
  values.splice(index, 0, value)
}

function registerRoutePort(
  portById: Map<string, TopDownLayoutGraph["ports"][number]>,
  node: UiComponentGraphNode,
  id: string,
  ratio: number,
): void {
  if (portById.has(id)) return
  const width = UI_GRAPH_NODE_SIZE[node.layer].width
  portById.set(id, Object.freeze({id, nodeId: node.id, x: width * ratio}))
}

function routePortId(
  nodeId: string,
  role: "in" | "out",
  edgeId: string,
): string {
  return `${nodeId}:${role}:${edgeId}`
}

function independentPortRatios(
  endpoints: readonly Readonly<{id: string; nodeId: string}>[],
): ReadonlyMap<string, number> {
  const idsByNode = new Map<string, string[]>()
  for (const endpoint of endpoints) {
    const ids = idsByNode.get(endpoint.nodeId) ?? []
    ids.push(endpoint.id)
    idsByNode.set(endpoint.nodeId, ids)
  }
  const ratioById = new Map<string, number>()
  for (const ids of idsByNode.values()) {
    ids.sort()
    for (let index = 0; index < ids.length; index += 1) {
      ratioById.set(ids[index]!, ids.length === 1 ? 0.5 : 0.15 + 0.7 * index / (ids.length - 1))
    }
  }
  return ratioById
}

function sourcePairKey(from: string, to: string): string {
  return `${from}\0${to}`
}

function layoutEdgeId(edge: UiComponentGraphEdge, kind: UiComponentGraphLayoutEdgeKind): string {
  return `${kind}:dependency:${edge.to}->consumer:${edge.from}`
}
