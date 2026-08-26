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
}>

export const UI_GRAPH_NODE_SIZE = Object.freeze({
  element: Object.freeze({width: 360, height: 220}),
  component: Object.freeze({width: 420, height: 250}),
})

export function createUiComponentGraphLayout(graph: UiComponentGraph): UiComponentGraphLayout {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node] as const))
  const sourceEdgeByLayoutId = new Map<string, UiComponentGraphEdge>()
  const ports: TopDownLayoutGraph["ports"][number][] = []
  const edges: TopDownLayoutGraph["edges"][number][] = []
  for (const edge of graph.edges) {
    if (!nodeById.has(edge.from) || !nodeById.has(edge.to)) {
      throw new Error(`UI component graph edge references an unknown node: ${edge.from} -> ${edge.to}`)
    }
    const id = layoutEdgeId(edge)
    const dependency = nodeById.get(edge.to)!
    const consumer = nodeById.get(edge.from)!
    const sourcePortId = `${id}:dependency`
    const targetPortId = `${id}:consumer`
    ports.push({
      id: sourcePortId,
      nodeId: dependency.id,
      x: UI_GRAPH_NODE_SIZE[dependency.layer].width / 2,
    })
    ports.push({
      id: targetPortId,
      nodeId: consumer.id,
      x: UI_GRAPH_NODE_SIZE[consumer.layer].width / 2,
    })
    edges.push({id, sourcePortId, targetPortId})
    sourceEdgeByLayoutId.set(id, edge)
  }
  const input: TopDownLayoutGraph = Object.freeze({
    nodes: Object.freeze(graph.nodes.map((node) => Object.freeze({
      id: node.id,
      ...UI_GRAPH_NODE_SIZE[node.layer],
    }))),
    ports: Object.freeze(ports),
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
  })
}

function layoutEdgeId(edge: UiComponentGraphEdge): string {
  return `dependency:${edge.to}->consumer:${edge.from}`
}
