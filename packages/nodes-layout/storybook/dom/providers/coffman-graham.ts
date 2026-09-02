import {layoutCoffmanGraham} from "@nodes/layout/coffman-graham"
import {TOP_DOWN_DENSE_GRAPH, TOP_DOWN_DENSE_LABELS} from "../../top-down-dense-fixture.ts"
import {createLayoutDomCase, diagnostic} from "../layout-case.ts"
import type {LayoutDomCaseProvider} from "../layout-provider.ts"

const graph = Object.freeze({
  ...TOP_DOWN_DENSE_GRAPH,
  layoutOptions: Object.freeze({...TOP_DOWN_DENSE_GRAPH.layoutOptions, maxNodesPerLayer: 4}),
})

export const coffmanGrahamLayoutDomProvider: LayoutDomCaseProvider = Object.freeze({
  ids: Object.freeze(["coffman-graham-default"]),
  createCases() {
    const result = layoutCoffmanGraham(graph)
    const layers = Map.groupBy(result.nodes, (node) => node.y + node.height / 2)
    const maxLayerWidth = Math.max(...[...layers.values()].map((nodes) => nodes.length))
    return Object.freeze([createLayoutDomCase({
      id: "coffman-graham-default",
      label: "Coffman–Graham · W = 4",
      policy: "coffman-graham",
      result,
      labels: TOP_DOWN_DENSE_LABELS,
      diagnostics: [
        diagnostic("max-layer-width", "Max layer width", maxLayerWidth),
        diagnostic("crossings", "Crossing bridges", result.crossings.length),
      ],
    })])
  },
  source() {
    return [
      'import {layoutCoffmanGraham} from "@nodes/layout/coffman-graham"',
      'import {TOP_DOWN_DENSE_GRAPH} from "../top-down-dense-fixture.ts"',
      "",
      "const graph = {...TOP_DOWN_DENSE_GRAPH, layoutOptions: {...TOP_DOWN_DENSE_GRAPH.layoutOptions, maxNodesPerLayer: 4}}",
      "const coffmanGrahamResult = layoutCoffmanGraham(graph)",
    ].join("\n")
  },
})
