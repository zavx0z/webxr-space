import {layoutTopDown} from "@nodes/layout/top-down"
import {TOP_DOWN_REFERENCE_GRAPH, TOP_DOWN_REFERENCE_LABELS} from "../../top-down-fixture.ts"
import {createLayoutDomCase, diagnostic} from "../layout-case.ts"
import type {LayoutDomCaseProvider} from "../layout-provider.ts"

export const dagreLayeredLayoutDomProvider: LayoutDomCaseProvider = Object.freeze({
  ids: Object.freeze(["dagre-layered-default"]),
  createCases() {
    const result = layoutTopDown(TOP_DOWN_REFERENCE_GRAPH)
    return Object.freeze([createLayoutDomCase({
      id: "dagre-layered-default",
      label: "Dagre Layered · Default",
      policy: "dagre-layered",
      result,
      labels: TOP_DOWN_REFERENCE_LABELS,
      diagnostics: [
        diagnostic("curves", "Cubic segments", result.edges.reduce((total, {curves}) => total + curves.length, 0)),
      ],
    })])
  },
  source() {
    return [
      'import {layoutTopDown} from "@nodes/layout/top-down"',
      'import {TOP_DOWN_REFERENCE_GRAPH} from "../top-down-fixture.ts"',
      "",
      "const dagreLayeredResult = layoutTopDown(TOP_DOWN_REFERENCE_GRAPH)",
    ].join("\n")
  },
})
