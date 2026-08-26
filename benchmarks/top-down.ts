import {arch, platform} from "node:os"
import {layoutTopDown, type TopDownLayoutGraph} from "@nodes/layout/top-down"
import {TOP_DOWN_REFERENCE_GRAPH} from "../storybook/top-down-fixture.ts"
import {TOP_DOWN_DENSE_GRAPH} from "../storybook/top-down-dense-fixture.ts"

const sourceHash = await hashSources([
  new URL("../src/top-down.ts", import.meta.url),
  new URL("../src/top-down/curve-solver.ts", import.meta.url),
  new URL("../types/top-down.ts", import.meta.url),
])
const cases = [
  benchmarkCase("reference-19x20", TOP_DOWN_REFERENCE_GRAPH, 10, 50),
  benchmarkCase("dense-54x85", TOP_DOWN_DENSE_GRAPH, 3, 12),
  benchmarkCase("layered-96", layeredGraph(8, 12), 2, 8),
]

console.log(JSON.stringify({
  schemaVersion: 1,
  policy: "@nodes/layout/top-down",
  runtime: {
    bun: Bun.version,
    platform: platform(),
    arch: arch(),
    sourceHash,
  },
  cases,
}, null, 2))

function benchmarkCase(
  id: string,
  graph: TopDownLayoutGraph,
  warmupCount: number,
  sampleCount: number,
) {
  for (let index = 0; index < warmupCount; index += 1) layoutTopDown(graph)
  const heapBefore = process.memoryUsage().heapUsed
  const samples: number[] = []
  let result = layoutTopDown(graph)
  for (let index = 0; index < sampleCount; index += 1) {
    const startedAt = performance.now()
    result = layoutTopDown(graph)
    samples.push(performance.now() - startedAt)
  }
  const heapAfter = process.memoryUsage().heapUsed
  const ordered = [...samples].sort((left, right) => left - right)
  return {
    id,
    input: {
      nodes: graph.nodes.length,
      ports: graph.ports.length,
      edges: graph.edges.length,
      sha256: hashJson(graph),
    },
    geometrySha256: hashJson(result),
    warmupCount,
    sampleCount,
    samplesMs: samples,
    minMs: ordered[0]!,
    medianMs: percentile(ordered, 0.5),
    p95Ms: percentile(ordered, 0.95),
    maxMs: ordered.at(-1)!,
    heapDeltaBytes: heapAfter - heapBefore,
  }
}

function layeredGraph(rankCount: number, rankWidth: number): TopDownLayoutGraph {
  const nodes = Array.from({length: rankCount * rankWidth}, (_, index) => ({
    id: `node-${String(index).padStart(4, "0")}`,
    width: 120 + index % 5 * 8,
    height: 54 + index % 3 * 6,
  }))
  const edgeNodes: Array<{id: string; sourceIndex: number; targetIndex: number}> = []
  for (let rank = 0; rank < rankCount - 1; rank += 1) {
    for (let column = 0; column < rankWidth; column += 1) {
      const sourceIndex = rank * rankWidth + column
      edgeNodes.push({
        id: `edge-${String(edgeNodes.length).padStart(5, "0")}`,
        sourceIndex,
        targetIndex: (rank + 1) * rankWidth + column,
      })
    }
  }
  for (let column = 0; column < rankWidth; column += 4) {
    edgeNodes.push({
      id: `edge-${String(edgeNodes.length).padStart(5, "0")}`,
      sourceIndex: column,
      targetIndex: (rankCount - 1) * rankWidth + column,
    })
  }
  const sourceRatios = benchmarkPortRatios(edgeNodes.map(({id, sourceIndex}) => ({id, nodeIndex: sourceIndex})))
  const targetRatios = benchmarkPortRatios(edgeNodes.map(({id, targetIndex}) => ({id, nodeIndex: targetIndex})))
  const ports: TopDownLayoutGraph["ports"][number][] = []
  const edges = edgeNodes.map(({id, sourceIndex, targetIndex}) => {
    const sourcePortId = `${nodes[sourceIndex]!.id}/out/${id}`
    const targetPortId = `${nodes[targetIndex]!.id}/in/${id}`
    ports.push({id: sourcePortId, nodeId: nodes[sourceIndex]!.id, x: nodes[sourceIndex]!.width * sourceRatios.get(id)!})
    ports.push({id: targetPortId, nodeId: nodes[targetIndex]!.id, x: nodes[targetIndex]!.width * targetRatios.get(id)!})
    return {id, sourcePortId, targetPortId}
  })
  return {
    nodes,
    ports,
    edges,
    layoutOptions: {nodeSpacing: 28, layerSpacing: 48, edgeSpacing: 10, padding: 24},
  }
}

function benchmarkPortRatios(
  endpoints: readonly Readonly<{id: string; nodeIndex: number}>[],
): ReadonlyMap<string, number> {
  const idsByNode = new Map<number, string[]>()
  for (const endpoint of endpoints) {
    const ids = idsByNode.get(endpoint.nodeIndex) ?? []
    ids.push(endpoint.id)
    idsByNode.set(endpoint.nodeIndex, ids)
  }
  const result = new Map<string, number>()
  for (const ids of idsByNode.values()) {
    ids.sort()
    for (let index = 0; index < ids.length; index += 1) {
      result.set(ids[index]!, ids.length === 1 ? 0.5 : 0.35 + 0.3 * index / (ids.length - 1))
    }
  }
  return result
}

function percentile(ordered: readonly number[], fraction: number): number {
  return ordered[Math.min(ordered.length - 1, Math.floor((ordered.length - 1) * fraction))]!
}

function hashJson(value: unknown): string {
  return new Bun.CryptoHasher("sha256").update(JSON.stringify(value)).digest("hex")
}

async function hashSources(urls: readonly URL[]): Promise<string> {
  const hash = new Bun.CryptoHasher("sha256")
  for (const url of urls) hash.update(await Bun.file(url).text())
  return hash.digest("hex")
}
