import {layoutTopDown} from "@nodes/layout/top-down"
import {defineStorybookStoryModule} from "@zavx0z/storybook/stories"
import {
  TOP_DOWN_REFERENCE_GRAPH,
  TOP_DOWN_REFERENCE_LABELS,
} from "../top-down-fixture.ts"
import {drawLayoutPreview} from "../render-layout-preview.ts"

export function createTopDownLayoutStory() {
  return defineStorybookStoryModule({
    defaultArgs: {routes: true, ports: true},
    controls: [
      {key: "routes", label: "Маршруты", group: "Слои", kind: "boolean"},
      {key: "ports", label: "Порты", group: "Слои", kind: "boolean"},
    ],
    render(surface, args, frame) {
      drawLayoutPreview(surface, TOP_DOWN_REFERENCE_GRAPH, layoutTopDown(TOP_DOWN_REFERENCE_GRAPH), frame, {
        showRoutes: args.routes === true,
        showPorts: args.ports === true,
        labels: TOP_DOWN_REFERENCE_LABELS,
      })
    },
    source() {
      return [
        'import {layoutTopDown} from "@nodes/layout/top-down"',
        "",
        `const graph = ${JSON.stringify(TOP_DOWN_REFERENCE_GRAPH, null, 2)}`,
        "const result = layoutTopDown(graph)",
      ].join("\n")
    },
  })
}
