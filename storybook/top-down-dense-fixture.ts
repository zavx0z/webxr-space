import type {TopDownLayoutGraph} from "@nodes/layout/top-down"
import type {TopDownStoryEdgeKind} from "./top-down-fixture.ts"

const RANK_WIDTHS = [8, 9, 13, 11, 5, 7, 1] as const

type MutableEdge = {
  id: string
  kind: TopDownStoryEdgeKind
  source: string
  target: string
}

const nodes = RANK_WIDTHS.flatMap((width, rank) => Array.from({length: width}, (_, index) => ({
  id: `rank-${rank}-node-${String(index).padStart(2, "0")}`,
  width: 180 + (index + rank) % 4 * 20,
  height: 72 + (index * 3 + rank) % 3 * 10,
})))
const idsByRank = RANK_WIDTHS.map((width, rank) =>
  Array.from({length: width}, (_, index) => `rank-${rank}-node-${String(index).padStart(2, "0")}`))
const edges: MutableEdge[] = []
const pairs = new Set<string>()

for (let rank = 1; rank < idsByRank.length; rank += 1) {
  const sources = idsByRank[rank - 1]!
  const targets = idsByRank[rank]!
  for (let index = 0; index < targets.length; index += 1) {
    addEdge("tree", sources[Math.floor(index * sources.length / targets.length)]!, targets[index]!)
  }
}

for (let targetRank = 1; targetRank < idsByRank.length && edgeCount("cross") < 32; targetRank += 1) {
  const targets = idsByRank[targetRank]!
  for (let offset = 1; offset <= 5 && edgeCount("cross") < 32; offset += 1) {
    const sourceRank = Math.max(0, targetRank - 1 - (offset % Math.min(targetRank, 2)))
    const sources = idsByRank[sourceRank]!
    for (let index = 0; index < targets.length && edgeCount("cross") < 32; index += 2) {
      addEdge("cross", sources[(index * 3 + offset) % sources.length]!, targets[index]!)
    }
  }
}

for (let index = 0; index < 7; index += 1) {
  const targetRank = 2 + index % (idsByRank.length - 2)
  const target = idsByRank[targetRank]![index % idsByRank[targetRank]!.length]!
  const root = idsByRank[0]![index % idsByRank[0]!.length]!
  addEdge("shortcut", root, target)
}

if (nodes.length !== 54 || edges.length !== 85) {
  throw new Error(`Dense top-down fixture drifted: ${nodes.length} nodes / ${edges.length} edges`)
}

const nodeById = new Map(nodes.map((node) => [node.id, node]))
const portById = new Map<string, TopDownLayoutGraph["ports"][number]>()
const sourceRatios = independentPortRatios(edges.map(({id, source}) => ({id, nodeId: source})))
const targetRatios = independentPortRatios(edges.map(({id, target}) => ({id, nodeId: target})))
for (const edge of edges) {
  registerPort(portId(edge.source, "out", edge.id), edge.source, sourceRatios.get(edge.id)!)
  registerPort(portId(edge.target, "in", edge.id), edge.target, targetRatios.get(edge.id)!)
}

export const TOP_DOWN_DENSE_GRAPH: TopDownLayoutGraph = Object.freeze({
  nodes: Object.freeze(nodes),
  ports: Object.freeze([...portById.values()].sort((left, right) => left.id.localeCompare(right.id))),
  edges: Object.freeze(edges.map((edge) => ({
    id: edge.id,
    constraint: edge.kind === "tree",
    sourcePortId: portId(edge.source, "out", edge.id),
    targetPortId: portId(edge.target, "in", edge.id),
  }))),
  layoutOptions: {nodeSpacing: 32, layerSpacing: 52, edgeSpacing: 10, padding: 24},
})

export const TOP_DOWN_DENSE_EDGE_KINDS: Readonly<Record<string, TopDownStoryEdgeKind>> =
  Object.freeze(Object.fromEntries(edges.map(({id, kind}) => [id, kind])))

export const TOP_DOWN_DENSE_LABELS: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(nodes.map(({id}) => [id, id.replaceAll("-", " ")])),
)

function addEdge(kind: TopDownStoryEdgeKind, source: string, target: string): void {
  const pair = `${source}\0${target}`
  if (pairs.has(pair)) return
  pairs.add(pair)
  edges.push({
    id: `${kind}-${String(edgeCount(kind) + 1).padStart(2, "0")}-${source}-${target}`,
    kind,
    source,
    target,
  })
}

function edgeCount(kind: TopDownStoryEdgeKind): number {
  return edges.filter((edge) => edge.kind === kind).length
}

function portId(nodeId: string, role: "in" | "out", edgeId: string): string {
  return `${nodeId}/${role}/${edgeId}`
}

function registerPort(id: string, nodeId: string, ratio: number): void {
  if (portById.has(id)) return
  const width = nodeById.get(nodeId)!.width
  portById.set(id, {id, nodeId, x: width * ratio})
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
