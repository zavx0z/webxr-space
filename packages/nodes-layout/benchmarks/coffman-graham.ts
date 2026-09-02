import {arch, platform} from "node:os"
import {
  layoutCoffmanGraham,
  type CoffmanGrahamLayoutGraph,
} from "@nodes/layout/coffman-graham"
import {TOP_DOWN_DENSE_GRAPH} from "../storybook/top-down-dense-fixture.ts"

const sourceHash = await hashSources([
  new URL("../src/coffman-graham.ts", import.meta.url),
  new URL("../src/coffman-graham/solver.ts", import.meta.url),
  new URL("../types/coffman-graham.ts", import.meta.url),
])
const cases = [
  benchmarkCase("width-bounded-54x85", TOP_DOWN_DENSE_GRAPH, 3, 12),
  benchmarkCase("layered-128", layeredGraph(16, 8), 2, 8),
  benchmarkCase("policy-budget-512", layeredGraph(32, 16), 2, 8),
]

console.log(JSON.stringify({
  schemaVersion: 1,
  policy: "@nodes/layout/coffman-graham",
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
  graph: CoffmanGrahamLayoutGraph,
  warmupCount: number,
  sampleCount: number,
) {
  for (let index = 0; index < warmupCount; index += 1) layoutCoffmanGraham(graph)
  const heapBefore = process.memoryUsage().heapUsed
  const samples: number[] = []
  let result = layoutCoffmanGraham(graph)
  for (let index = 0; index < sampleCount; index += 1) {
    const startedAt = performance.now()
    result = layoutCoffmanGraham(graph)
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

function layeredGraph(rankCount: number, rankWidth: number): CoffmanGrahamLayoutGraph {
  const nodes = Array.from({length: rankCount * rankWidth}, (_, index) => ({
    id: `node-${String(index).padStart(4, "0")}`,
    width: 120 + index % 5 * 8,
    height: 54 + index % 3 * 6,
  }))
  const links: Array<{id: string; sourceIndex: number; targetIndex: number}> = []
  for (let rank = 0; rank < rankCount - 1; rank += 1) {
    for (let column = 0; column < rankWidth; column += 1) {
      links.push({
        id: `edge-${String(links.length).padStart(5, "0")}`,
        sourceIndex: rank * rankWidth + column,
        targetIndex: (rank + 1) * rankWidth + column,
      })
    }
  }
  const ports: CoffmanGrahamLayoutGraph["ports"][number][] = []
  const edges = links.map(({id, sourceIndex, targetIndex}) => {
    const sourcePortId = `${nodes[sourceIndex]!.id}/out/${id}`
    const targetPortId = `${nodes[targetIndex]!.id}/in/${id}`
    ports.push({id: sourcePortId, nodeId: nodes[sourceIndex]!.id, x: nodes[sourceIndex]!.width / 2})
    ports.push({id: targetPortId, nodeId: nodes[targetIndex]!.id, x: nodes[targetIndex]!.width / 2})
    return {id, sourcePortId, targetPortId}
  })
  return {
    nodes,
    ports,
    edges,
    layoutOptions: {maxNodesPerLayer: 4, nodeSpacing: 28, layerSpacing: 48, edgeSpacing: 10, padding: 24},
  }
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
