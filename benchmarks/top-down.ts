import {arch, platform} from "node:os"
import {layoutTopDown, type TopDownLayoutGraph} from "@nodes/layout/top-down"
import {TOP_DOWN_REFERENCE_GRAPH} from "../storybook/top-down-fixture.ts"

const sourceHash = await hashSources([
  new URL("../src/top-down.ts", import.meta.url),
  new URL("../src/top-down/solver.ts", import.meta.url),
  new URL("../types/top-down.ts", import.meta.url),
])
const cases = [
  benchmarkCase("reference-19x20", TOP_DOWN_REFERENCE_GRAPH, 80, 400),
  benchmarkCase("layered-512", layeredGraph(16, 32), 10, 60),
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
  const ports = nodes.flatMap((node, index) => [
    ...(index >= rankWidth ? [{id: `${node.id}/in`, nodeId: node.id, x: node.width / 2}] : []),
    ...(index < nodes.length - rankWidth ? [{id: `${node.id}/out`, nodeId: node.id, x: node.width / 2}] : []),
  ])
  const edges: Array<{id: string; sourcePortId: string; targetPortId: string}> = []
  for (let rank = 0; rank < rankCount - 1; rank += 1) {
    for (let column = 0; column < rankWidth; column += 1) {
      const sourceIndex = rank * rankWidth + column
      for (const targetColumn of [column, (column + 1) % rankWidth]) {
        const targetIndex = (rank + 1) * rankWidth + targetColumn
        edges.push({
          id: `edge-${String(edges.length).padStart(5, "0")}`,
          sourcePortId: `${nodes[sourceIndex]!.id}/out`,
          targetPortId: `${nodes[targetIndex]!.id}/in`,
        })
      }
    }
  }
  for (let column = 0; column < rankWidth; column += 4) {
    edges.push({
      id: `edge-${String(edges.length).padStart(5, "0")}`,
      sourcePortId: `${nodes[column]!.id}/out`,
      targetPortId: `${nodes[(rankCount - 1) * rankWidth + column]!.id}/in`,
    })
  }
  return {
    nodes,
    ports,
    edges,
    layoutOptions: {nodeSpacing: 28, layerSpacing: 48, edgeSpacing: 10, padding: 24},
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
