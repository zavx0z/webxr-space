/** Сравнивает сохранённые MCP measurements с независимым upstream; не обращается к браузеру. */
import {dirname, resolve} from "node:path"

const root = resolve(import.meta.dir, "../../../..")
const mermaid = Bun.resolveSync("mermaid", resolve(root, "markdown"))
const layoutPath = Bun.resolveSync("dagre-d3-es/src/dagre/layout.js", dirname(mermaid))
const packageRoot = resolve(dirname(layoutPath), "../..")
if ((await Bun.file(resolve(packageRoot, "package.json")).json()).version !== "7.0.14") throw new Error("Изменилась версия oracle")
const {layout} = await import(layoutPath)
const {Graph} = await import(resolve(packageRoot, "src/graphlib/index.js"))
const path = resolve(import.meta.dir, "live-markdown.json")
const observed = await Bun.file(path).json() as {
  nodes: readonly Readonly<{id: string; x: number; y: number; width: number; height: number}>[]
  comparison?: unknown
}
const pairs = [['ContentNode', 'ContentSurface'], ['ContentNode', 'ParameterNode'], ['ContentNode', 'Pane'], ['ParameterNode', 'ParameterNodeContents'], ['ParameterNode', 'Pane'], ['DiagramNode', 'Pane'], ['DiagramNode', 'Typography']]
const graph = new Graph({multigraph: true, compound: true}).setGraph({rankdir: 'TB', nodesep: 50, ranksep: 50, edgesep: 20, marginx: 8, marginy: 8})
for (const node of observed.nodes) graph.setNode(node.id, {width: node.width, height: node.height})
pairs.forEach(([a, b], i) => graph.setEdge(a, b, {minlen: 1, weight: 1, width: 0, height: 0, labelpos: 'c'}, `edge-${i}`))
layout(graph)
const expected = observed.nodes.map(node => ({id: node.id, x: graph.node(node.id).x - node.width / 2, y: graph.node(node.id).y - node.height / 2}))
const maxDelta = Math.max(...expected.flatMap(node => {
  const actual = observed.nodes.find(value => value.id === node.id)!
  return [Math.abs(actual.x - node.x), Math.abs(actual.y - node.y)]
}))
if (!Number.isFinite(maxDelta) || maxDelta > 1e-6) throw new Error(`Live placement mismatch: ${maxDelta}`)
observed.comparison = {oracle: 'dagre-d3-es7.0.14, measured live dimensions, not Desktop replay', expected, maxDelta, passed: true}
await Bun.write(path, JSON.stringify(observed, null, 2) + '\n')
console.log(JSON.stringify(observed.comparison, null, 2))
