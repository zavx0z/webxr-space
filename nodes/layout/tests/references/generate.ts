/** Ручное обновление upstream oracle. Не вызывается тестами; версия и хеши сохраняются рядом. */
import {dirname, resolve} from "node:path"
import {createHash} from "node:crypto"

const root = resolve(import.meta.dir, "../../../..")
const mermaid = Bun.resolveSync("mermaid", resolve(root, "markdown"))
const layoutPath = Bun.resolveSync("dagre-d3-es/src/dagre/layout.js", dirname(mermaid))
const packageRoot = resolve(dirname(layoutPath), "../..")
const metadata = await Bun.file(resolve(packageRoot, "package.json")).json()
if (metadata.version !== "7.0.14") throw new Error(`Неподтверждённый oracle ${metadata.version}`)
const {layout} = await import(layoutPath)
const {Graph} = await import(resolve(packageRoot, "src/graphlib/index.js"))
const seven = [["ContentNode", "ContentSurface"], ["ContentNode", "ParameterNode"], ["ContentNode", "Pane"], ["ParameterNode", "ParameterNodeContents"], ["ParameterNode", "Pane"], ["DiagramNode", "Pane"], ["DiagramNode", "Typography"]]
const cases = [
  {name: "seven-uniform", links: seven},
  {name: "seven-varied", links: seven, widths: [130, 148, 146, 68, 212, 132, 118], heights: [44, 44, 44, 44, 44, 44, 44]},
  {name: "asymmetric", links: seven, widths: [87.125, 151.7, 246, 35, 133, 60, 298], heights: [27, 111, 36.25, 78, 94, 19, 47]},
  {name: "diamond", links: [["A", "B"], ["A", "C"], ["B", "D"], ["C", "D"]]},
  {name: "long-edge", links: [["A", "B"], ["B", "C"], ["C", "D"], ["A", "D"]]},
  {name: "disconnected", links: [["A", "B"], ["C", "D"]], isolated: ["E"]},
  {name: "parallel", links: [["A", "B"], ["A", "B"]]},
  {name: "fanout-12", links: Array.from({length: 12}, (_, i) => ["A", `N${i}`])},
  {name: "numeric-ids", links: [["10", "2"], ["10", "1"], ["2", "3"], ["1", "3"]]},
  {name: "reordered-edges", links: [...seven].reverse()},
]
const fixtures = cases.map(fixture => {
  const nodes = [...new Set(fixture.links.flat().concat(fixture.isolated ?? []))].map((id, i) => ({
    id, width: fixture.widths?.[i] ?? 210, height: fixture.heights?.[i] ?? 64,
  }))
  const edges = fixture.links.map(([sourceNodeId, targetNodeId], i) => ({id: `edge-${i}`, sourceNodeId, targetNodeId}))
  const graph = new Graph({multigraph: true, compound: true}).setGraph({rankdir: "TB", nodesep: 50, ranksep: 50, edgesep: 20, marginx: 8, marginy: 8})
  for (const node of nodes) graph.setNode(node.id, {...node})
  for (const edge of edges) graph.setEdge(edge.sourceNodeId, edge.targetNodeId, {minlen: 1, weight: 1, width: 0, height: 0, labelpos: "c"}, edge.id)
  layout(graph)
  return {
    name: fixture.name,
    input: {attachment: "contour", nodes, edges},
    expected: {
      nodes: nodes.map(node => ({...node, x: graph.node(node.id).x - node.width / 2, y: graph.node(node.id).y - node.height / 2})),
      edges: edges.map(edge => ({id: edge.id, points: graph.edge(edge.sourceNodeId, edge.targetNodeId, edge.id).points})),
      bounds: {x: 0, y: 0, width: graph.graph().width, height: graph.graph().height},
    },
  }
})
const hashes: Record<string, string> = {}
for await (const path of new Bun.Glob("src/{dagre,graphlib}/**/*.js").scan({cwd: packageRoot})) {
  hashes[path] = createHash("sha256").update(new Uint8Array(await Bun.file(resolve(packageRoot, path)).arrayBuffer())).digest("hex")
}
await Bun.write(resolve(import.meta.dir, "dagre-7.0.14.json"), JSON.stringify({
  provenance: {package: metadata.name, version: metadata.version, source: "https://github.com/tbo47/dagre-es", desktopReference: "26.903.61454 build8378 / Mermaid11.16.0", scope: "upstream flat numeric surrogate; synthetic dimensions, not Desktop replay or screenshot metrics", hashes}, fixtures,
}, null, 2) + "\n")
