import {describe, expect, test} from "bun:test"
import {fileURLToPath} from "node:url"
import graph from "../graphs/ui-component-graph.json"
import type {UiComponentGraph} from "../scripts/ui-component-graph.ts"
import {
  createUiComponentGraphLayout,
  UI_GRAPH_NODE_SIZE,
} from "./ui-component-graph-model.ts"

const typedGraph = graph as unknown as UiComponentGraph

describe("UI component graph Coffman–Graham adapter", () => {
  test("reverses may-call edges to dependency → consumer presentation", () => {
    const layout = createUiComponentGraphLayout(typedGraph)
    const source = typedGraph.edges.find(({from, to}) =>
      from === "@ui/components/pane#Pane" && to === "@ui/elements/div#div")
    expect(source).toBeDefined()
    const entry = [...layout.sourceEdgeByLayoutId].find(([, edge]) => edge === source)
    expect(entry).toBeDefined()
    const edge = layout.input.edges.find(({id}) => id === entry![0])
    expect(edge).toBeDefined()
    const sourcePort = layout.input.ports.find(({id}) => id === edge!.sourcePortId)
    const targetPort = layout.input.ports.find(({id}) => id === edge!.targetPortId)
    expect(sourcePort?.nodeId).toBe("@ui/elements/div#div")
    expect(targetPort?.nodeId).toBe("@ui/components/pane#Pane")
    expect(sourcePort!.x).toBeGreaterThanOrEqual(UI_GRAPH_NODE_SIZE.element.width * 0.15)
    expect(sourcePort!.x).toBeLessThanOrEqual(UI_GRAPH_NODE_SIZE.element.width * 0.85)
    expect(targetPort!.x).toBeGreaterThanOrEqual(UI_GRAPH_NODE_SIZE.component.width * 0.15)
    expect(targetPort!.x).toBeLessThanOrEqual(UI_GRAPH_NODE_SIZE.component.width * 0.85)
    expect(edge!.id).toBe(`dependency:${source!.to}->consumer:${source!.from}`)
    expect(edge).not.toHaveProperty("constraint")
  })

  test("keeps all relations in one layout edge type with independent ports", () => {
    const layout = createUiComponentGraphLayout(typedGraph)

    expect(layout.input.ports).toHaveLength(170)
    expect(JSON.stringify(layout.input.edges)).not.toMatch(/tree|cross|shortcut|constraint/)
    for (const role of [":in:", ":out:"] as const) {
      const portsByNode = Map.groupBy(layout.input.ports.filter(({id}) => id.includes(role)), ({nodeId}) => nodeId)
      for (const ports of portsByNode.values()) expect(new Set(ports.map(({x}) => x)).size).toBe(ports.length)
    }
    expect(layout.sourceEdgeByLayoutId.size).toBe(typedGraph.edges.length)
  })

  test("bounds every Coffman–Graham layer to four real nodes", () => {
    const layout = createUiComponentGraphLayout(typedGraph)
    const nodesByLayer = Map.groupBy(layout.result.nodes, (node) => node.y + node.height / 2)

    expect(layout.input.layoutOptions?.maxNodesPerLayer).toBe(4)
    expect(Math.max(...[...nodesByLayer.values()].map((nodes) => nodes.length))).toBeLessThanOrEqual(4)
    expect(layout.result.bounds).toEqual({x: 0, y: 0, width: 5734, height: 4850})
    expect(new Bun.CryptoHasher("sha256").update(JSON.stringify(layout.result)).digest("hex"))
      .toBe("2dc9ef61a493268f226bc5d26aebd7fa73817f3d4314eef08d62208c27b78927")
  })

  test("preserves every intrinsic node and produces one cubic DOWN connection type", () => {
    const layout = createUiComponentGraphLayout(typedGraph)
    const inputEdgeById = new Map(layout.input.edges.map((edge) => [edge.id, edge]))
    const portById = new Map(layout.result.ports.map((port) => [port.id, port]))
    expect(layout.result.direction).toBe("DOWN")
    expect(layout.result.nodes.length).toBe(typedGraph.nodes.length)
    expect(layout.result.edges.length).toBe(typedGraph.edges.length)
    for (const node of layout.result.nodes) {
      const source = layout.nodeById.get(node.id)
      expect(source).toBeDefined()
      expect(node.width).toBe(UI_GRAPH_NODE_SIZE[source!.layer].width)
      expect(node.height).toBe(UI_GRAPH_NODE_SIZE[source!.layer].height)
    }
    for (const edge of layout.result.edges) {
      const input = inputEdgeById.get(edge.id)!
      const source = portById.get(input.sourcePortId)!
      const target = portById.get(input.targetPortId)!
      expect(edge.curves.length).toBeGreaterThan(0)
      expect(edge.curves[0]!.startPoint).toEqual({x: source.x, y: source.y})
      expect(edge.curves.at(-1)!.endPoint).toEqual({x: target.x, y: target.y})
      expect(edge.curves.every(({controlPoints}) => controlPoints.length === 2)).toBeTrue()
    }
  })

  test("bundles only the exact Coffman–Graham production policy", async () => {
    const build = await Bun.build({
      entrypoints: [fileURLToPath(new URL("./ui-component-graph-model.ts", import.meta.url))],
      target: "browser",
      format: "esm",
      minify: true,
    })
    expect(build.success, build.logs.map(({message}) => message).join("\n")).toBeTrue()
    expect(build.outputs).toHaveLength(1)
    const bytes = new Uint8Array(await build.outputs[0]!.arrayBuffer())
    const source = new TextDecoder().decode(bytes)

    expect(source).toContain("COFFMAN_GRAHAM_CYCLE_DETECTED")
    expect(source).not.toContain("TOP_DOWN_CYCLE_DETECTED")
    expect(source).not.toContain("NO_LEGAL_LAYOUT")
    expect({
      bytes: bytes.byteLength,
      gzipBytes: Bun.gzipSync(bytes).byteLength,
      sha256: new Bun.CryptoHasher("sha256").update(bytes).digest("hex"),
    }).toEqual({
      bytes: 32_085,
      gzipBytes: 10_961,
      sha256: "459ed1e50e43a07221d517f7b4e0674d344d45cef016edfdb2a2f71460993af8",
    })
  })
})
