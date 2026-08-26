import {beforeAll, describe, expect, test} from "bun:test"
import {
  buildUiComponentGraph,
  serializeUiComponentGraph,
  type UiComponentGraph,
} from "./ui-component-graph.ts"

const root = new URL("..", import.meta.url).pathname
let graph: UiComponentGraph

beforeAll(async () => {
  graph = await buildUiComponentGraph({superprojectRoot: root})
}, 20_000)

describe("automatic UI component may-call graph", () => {
  test("distinguishes symbol calls from module imports", async () => {
    expect(nodeIds(graph)).toContain("@ui/components/pane#Pane")
    expect(nodeIds(graph)).toContain("@ui/components/pane#PaneTitle")
    expect(nodeIds(graph)).toContain("@ui/components/pane#Paper")
    expect(edgeIds(graph)).toContain("@ui/components/pane#Pane -> @ui/elements/div#div")
    expect(edgeIds(graph)).toContain("@ui/components/pane#PaneTitle -> @ui/elements/text#h2")
    expect(edgeIds(graph)).toContain("@ui/components/pane#Paper -> @ui/components/pane#Pane")
    expect(edgeIds(graph)).not.toContain("@ui/components/pane#Pane -> @ui/elements/text#h2")
  })

  test("resolves aliases and collapses private helper chains", async () => {
    const edges = edgeIds(graph)

    expect(edges).toContain("@ui/components/button#Button -> @ui/elements/button#button")
    expect(edges).toContain("@ui/components/button#IconButton -> @ui/components/button#Button")
    expect(edges).toContain("@ui/components/field#Field -> @ui/components/number-input#NumberInput")
    expect(edges).toContain("@ui/components/field#Field -> @ui/components/integer-input#IntegerInput")
    expect(edges).toContain("@ui/components/field#Field -> @ui/components/typography#Typography")

    const fieldEdge = graph.edges.find(({from, to}) =>
      from === "@ui/components/field#Field" && to === "@ui/components/number-input#NumberInput")
    expect(fieldEdge).toBeDefined()
    expect(fieldEdge!.evidence[0]!.chain.length).toBeGreaterThan(1)
  })

  test("keeps helpers, types, barrels and external repositories outside", async () => {
    const exports = graph.nodes.map(({exportName}) => exportName)

    expect(exports).not.toContain("normalizeNumberInputValue")
    expect(exports).not.toContain("createTextFieldState")
    expect(exports).not.toContain("focusInput")
    expect(exports).not.toContain("tableScrollTo")
    expect(exports).not.toContain("DivProps")
    expect(graph.nodes.some(({id}) => id.startsWith("@ui/components#"))).toBeFalse()
    expect(graph.nodes.some(({id}) => id.startsWith("@zavx0z/"))).toBeFalse()
    expect(graph.nodes.some(({id}) => id.startsWith("@nodes/"))).toBeFalse()
  })

  test("records deterministic relative evidence and source identity", async () => {
    const second = await buildUiComponentGraph({superprojectRoot: root})

    expect(serializeUiComponentGraph(graph)).toBe(serializeUiComponentGraph(second))
    expect(graph.source.path).toBe("projects/ui")
    expect(graph.source.revision).toMatch(/^[0-9a-f]{40}$/)
    expect(graph.source.digestSha256).toMatch(/^[0-9a-f]{64}$/)
    expect(graph.nodes.length).toBeGreaterThan(20)
    expect(graph.edges.length).toBeGreaterThan(20)
    for (const node of graph.nodes) {
      expect(node.declaration.path.startsWith("/")).toBeFalse()
      expect(node.declaration.line).toBeGreaterThan(0)
      expect(node.declaration.column).toBeGreaterThan(0)
    }
    for (const edge of graph.edges) {
      for (const {chain} of edge.evidence) {
        expect(chain.length).toBeGreaterThan(0)
        for (const step of chain) expect(step.location.path.startsWith("/")).toBeFalse()
      }
    }
  }, 20_000)
})

function nodeIds(graph: UiComponentGraph): string[] {
  return graph.nodes.map(({id}) => id)
}

function edgeIds(graph: UiComponentGraph): string[] {
  return graph.edges.map(({from, to}) => `${from} -> ${to}`)
}
