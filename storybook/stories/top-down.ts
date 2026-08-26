import {layoutTopDown} from "@nodes/layout/top-down"
import {defineStorybookStoryModule} from "@zavx0z/storybook/stories"
import {
  TOP_DOWN_REFERENCE_GRAPH,
  TOP_DOWN_REFERENCE_LABELS,
} from "../top-down-fixture.ts"
import {
  TOP_DOWN_DENSE_GRAPH,
  TOP_DOWN_DENSE_LABELS,
} from "../top-down-dense-fixture.ts"
import {drawLayoutPreview} from "../render-layout-preview.ts"

export function createTopDownLayoutStory(scenario: "reference" | "dense" = "reference") {
  const fixture = scenario === "dense"
    ? {
        graph: TOP_DOWN_DENSE_GRAPH,
        labels: TOP_DOWN_DENSE_LABELS,
      }
    : {
        graph: TOP_DOWN_REFERENCE_GRAPH,
        labels: TOP_DOWN_REFERENCE_LABELS,
      }
  return defineStorybookStoryModule({
    defaultArgs: {routes: true, ports: true},
    controls: [
      {key: "routes", label: "Маршруты", group: "Слои", kind: "boolean"},
      {key: "ports", label: "Порты", group: "Слои", kind: "boolean"},
    ],
    render(surface, args, frame) {
      drawLayoutPreview(surface, fixture.graph, layoutTopDown(fixture.graph), frame, {
        showRoutes: args.routes === true,
        showPorts: args.ports === true,
        labels: fixture.labels,
      })
    },
    source() {
      return [
        'import {layoutTopDown} from "@nodes/layout/top-down"',
        "",
        `const graph = ${JSON.stringify(fixture.graph, null, 2)}`,
        "const result = layoutTopDown(graph)",
      ].join("\n")
    },
  })
}
