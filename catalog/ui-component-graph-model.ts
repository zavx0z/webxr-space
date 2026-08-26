import {
  layoutCoffmanGraham,
  type CoffmanGrahamLayoutGraph,
  type CoffmanGrahamLayoutResult,
} from "@nodes/layout/coffman-graham"
import type {
  UiComponentGraph,
  UiComponentGraphEdge,
  UiComponentGraphNode,
} from "../scripts/ui-component-graph.ts"

export type UiComponentGraphLayout = Readonly<{
  graph: UiComponentGraph
  input: CoffmanGrahamLayoutGraph
  result: CoffmanGrahamLayoutResult
  nodeById: ReadonlyMap<string, UiComponentGraphNode>
  sourceEdgeByLayoutId: ReadonlyMap<string, UiComponentGraphEdge>
}>

export const UI_GRAPH_NODE_SIZE = Object.freeze({
  element: Object.freeze({width: 360, height: 220}),
  component: Object.freeze({width: 420, height: 250}),
})

export function createUiComponentGraphLayout(graph: UiComponentGraph): UiComponentGraphLayout {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node] as const))
  const sourceEdgeByLayoutId = new Map<string, UiComponentGraphEdge>()
  const portById = new Map<string, CoffmanGrahamLayoutGraph["ports"][number]>()
  const edges: CoffmanGrahamLayoutGraph["edges"][number][] = []
  const visualEdges = graph.edges.map((edge) => {
    if (!nodeById.has(edge.from) || !nodeById.has(edge.to)) {
      throw new Error(`UI component graph edge references an unknown node: ${edge.from} -> ${edge.to}`)
    }
    const id = layoutEdgeId(edge)
    return {edge, id, dependency: nodeById.get(edge.to)!, consumer: nodeById.get(edge.from)!}
  })
  const sourceRatios = independentPortRatios(visualEdges.map(({id, dependency}) => ({id, nodeId: dependency.id})))
  const targetRatios = independentPortRatios(visualEdges.map(({id, consumer}) => ({id, nodeId: consumer.id})))
  for (const {edge, id, dependency, consumer} of visualEdges) {
    const sourcePortId = routePortId(dependency.id, "out", id)
    const targetPortId = routePortId(consumer.id, "in", id)
    registerRoutePort(portById, dependency, sourcePortId, sourceRatios.get(id)!)
    registerRoutePort(portById, consumer, targetPortId, targetRatios.get(id)!)
    edges.push({id, sourcePortId, targetPortId})
    sourceEdgeByLayoutId.set(id, edge)
  }
  const input: CoffmanGrahamLayoutGraph = Object.freeze({
    nodes: Object.freeze(graph.nodes.map((node) => Object.freeze({
      id: node.id,
      ...UI_GRAPH_NODE_SIZE[node.layer],
    }))),
    ports: Object.freeze([...portById.values()].sort((left, right) => left.id.localeCompare(right.id))),
    edges: Object.freeze(edges),
    layoutOptions: Object.freeze({
      maxNodesPerLayer: 4,
      nodeSpacing: 44,
      layerSpacing: 72,
      edgeSpacing: 12,
      padding: 28,
    }),
  })
  return Object.freeze({
    graph,
    input,
    result: layoutCoffmanGraham(input),
    nodeById,
    sourceEdgeByLayoutId,
  })
}

function registerRoutePort(
  portById: Map<string, CoffmanGrahamLayoutGraph["ports"][number]>,
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

function layoutEdgeId(edge: UiComponentGraphEdge): string {
  return `dependency:${edge.to}->consumer:${edge.from}`
}
