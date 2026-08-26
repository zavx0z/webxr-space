import {describe, expect, test} from "bun:test"
import graph from "../graphs/ui-component-graph.json"
import type {UiComponentGraph} from "../scripts/ui-component-graph.ts"
import {createUiComponentGraphLayout, UI_GRAPH_NODE_SIZE} from "./ui-component-graph-model.ts"

const typedGraph = graph as unknown as UiComponentGraph

describe("UI component graph top-down adapter", () => {
  test("reverses may-call edges to dependency → consumer presentation", () => {
    const layout = createUiComponentGraphLayout(typedGraph)
    const source = typedGraph.edges.find(({from, to}) =>
      from === "@ui/components/pane#Pane" && to === "@ui/elements/div#div")
    expect(source).toBeDefined()
    const edge = layout.input.edges.find(({id}) => id ===
      `dependency:${source!.to}->consumer:${source!.from}`)
    expect(edge).toBeDefined()
    const sourcePort = layout.input.ports.find(({id}) => id === edge!.sourcePortId)
    const targetPort = layout.input.ports.find(({id}) => id === edge!.targetPortId)
    expect(sourcePort?.nodeId).toBe("@ui/elements/div#div")
    expect(targetPort?.nodeId).toBe("@ui/components/pane#Pane")
    expect(sourcePort?.x).toBe(UI_GRAPH_NODE_SIZE.element.width / 2)
    expect(targetPort?.x).toBe(UI_GRAPH_NODE_SIZE.component.width / 2)
  })

  test("preserves every intrinsic node and produces orthogonal DOWN geometry", () => {
    const layout = createUiComponentGraphLayout(typedGraph)
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
      const section = edge.sections[0]
      expect(section).toBeDefined()
      const points = [section!.startPoint, ...section!.bendPoints, section!.endPoint]
      for (let index = 1; index < points.length; index += 1) {
        const previous = points[index - 1]!
        const current = points[index]!
        expect(current.x === previous.x || current.y === previous.y).toBeTrue()
      }
    }
  })
})
