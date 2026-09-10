import {Graph, type GraphLabel, type NodeLabel, type EdgeLabel} from "@dagrejs/dagre"

// Адаптация плоского order из dagre-d3-es 7.0.14: см. LICENSE.dagre-order.md.
// Контракт TopDown исключает compound nodes; dummy nodes длинных рёбер участвуют полностью.
type LayoutGraph = Graph<GraphLabel, NodeLabel, EdgeLabel>
type LayerGraph = Graph<{root: string}, NodeLabel, EdgeLabel>
type Entry = {vs: string[]; i: number; barycenter?: number; weight?: number}

/** Старый crossing-minimizing order: первый лучший результат и единый bias каждого sweep. */
export function orderFlatGraph(graph: LayoutGraph): void {
  const ids = graph.nodes()
  if (ids.some(id => graph.children(id).length > 0)) throw new Error("TopDown order принимает только плоский граф")
  if (ids.length === 0) return
  const maxRank = Math.max(...ids.map(id => graph.node(id).rank!))
  const matrix = (): string[][] => {
    const layers: string[][] = Array.from({length: maxRank + 1}, () => [])
    for (const id of ids) layers[graph.node(id).rank!]![graph.node(id).order!] = id
    return layers
  }
  const assign = (layers: string[][]): void => {
    layers.forEach(layer => layer.forEach((id, order) => { graph.node(id).order = order }))
  }
  const initial: string[][] = Array.from({length: maxRank + 1}, () => [])
  const seen = new Set<string>()
  const visit = (id: string): void => {
    if (seen.has(id)) return
    seen.add(id)
    initial[graph.node(id).rank!]!.push(id)
    graph.successors(id)?.forEach(visit)
  }
  const down = Array.from({length: maxRank}, (_, i) => layerGraph(graph, i + 1, "inEdges"))
  const up = Array.from({length: maxRank}, (_, i) => layerGraph(graph, maxRank - 1 - i, "outEdges"))
  ids.slice().sort((a, b) => graph.node(a).rank! - graph.node(b).rank!).forEach(visit)
  assign(initial)
  let best = initial
  let bestCrossings = Infinity
  for (let sweep = 0, unchanged = 0; unchanged < 4; sweep += 1, unchanged += 1) {
    for (const layer of sweep % 2 ? down : up) {
      sortLayer(layer, sweep % 4 >= 2).forEach((id, order) => { layer.node(id).order = order })
    }
    const layers = matrix()
    const crossings = crossCount(graph, layers)
    if (crossings < bestCrossings) {
      unchanged = 0
      bestCrossings = crossings
      best = layers.map(layer => layer.slice())
    }
  }
  assign(best)
}

function layerGraph(graph: LayoutGraph, rank: number, relationship: "inEdges" | "outEdges"): LayerGraph {
  let root = "_topdown_order_root"
  while (graph.hasNode(root)) root += "_"
  const layer: LayerGraph = new Graph<{root: string}, NodeLabel, EdgeLabel>({compound: true})
    .setGraph({root})
    .setDefaultNodeLabel(id => graph.node(id))
  for (const id of graph.nodes()) {
    if (graph.node(id).rank !== rank) continue
    layer.setNode(id)
    layer.setParent(id, root)
    for (const edge of graph[relationship](id) ?? []) {
      const neighbor = edge.v === id ? edge.w : edge.v
      layer.setEdge(neighbor, id, {weight: graph.edge(edge).weight! + (layer.edge(neighbor, id)?.weight ?? 0)})
    }
  }
  return layer
}

function sortLayer(graph: LayerGraph, biasRight: boolean): string[] {
  // resolveConflicts при пустом constraint graph посещает источники через pop.
  // Сохраняем этот порядок и исходные индексы, включая integer-like IDs.
  const entries = Object.values(Object.fromEntries(graph.children(graph.graph().root).map((id, i) => {
    const edges = graph.inEdges(id) ?? []
    const weight = edges.reduce((sum, edge) => sum + graph.edge(edge).weight!, 0)
    const sum = edges.reduce((sum, edge) => sum + graph.edge(edge).weight! * graph.node(edge.v).order!, 0)
    const entry: Entry = {vs: [id], i, ...(edges.length ? {weight, barycenter: sum / weight} : {})}
    return [id, entry]
  }))).reverse()
  const sortable = entries.filter(entry => entry.barycenter !== undefined)
  const unsortable = entries.filter(entry => entry.barycenter === undefined).sort((a, b) => b.i - a.i)
  sortable.sort((a, b) => a.barycenter! - b.barycenter! || (biasRight ? b.i - a.i : a.i - b.i))
  const result: string[] = []
  let index = 0
  const consume = (): void => {
    while (unsortable.length && unsortable.at(-1)!.i <= index) {
      result.push(...unsortable.pop()!.vs)
      index += 1
    }
  }
  consume()
  for (const entry of sortable) {
    index += entry.vs.length
    result.push(...entry.vs)
    consume()
  }
  return result
}

function crossCount(graph: LayoutGraph, layers: string[][]): number {
  let crossings = 0
  for (let rank = 1; rank < layers.length; rank += 1) {
    const south = layers[rank]!
    const positions = new Map(south.map((id, i) => [id, i]))
    const entries = layers[rank - 1]!.flatMap(id => (graph.outEdges(id) ?? [])
      .map(edge => ({pos: positions.get(edge.w)!, weight: graph.edge(edge).weight!}))
      .sort((a, b) => a.pos - b.pos))
    let size = 1
    while (size < south.length) size *= 2
    const first = size - 1
    const tree = new Float64Array(size * 2 - 1)
    for (const entry of entries) {
      let index = entry.pos + first
      tree[index] = tree[index]! + entry.weight
      let sum = 0
      while (index > 0) {
        if (index % 2) sum += tree[index + 1]!
        index = (index - 1) >> 1
        tree[index] = tree[index]! + entry.weight
      }
      crossings += entry.weight * sum
    }
  }
  return crossings
}
