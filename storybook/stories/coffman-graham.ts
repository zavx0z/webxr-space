import {layoutCoffmanGraham} from "@nodes/layout/coffman-graham"
import {defineStorybookStoryModule} from "@zavx0z/storybook/stories"
import {
  TOP_DOWN_DENSE_GRAPH,
  TOP_DOWN_DENSE_LABELS,
} from "../top-down-dense-fixture.ts"
import {drawLayoutPreview} from "../render-layout-preview.ts"

export function createCoffmanGrahamLayoutStory() {
  const graph = {
    ...TOP_DOWN_DENSE_GRAPH,
    layoutOptions: {...TOP_DOWN_DENSE_GRAPH.layoutOptions, maxNodesPerLayer: 4},
  }
  return defineStorybookStoryModule({
    defaultArgs: {routes: true, ports: true},
    controls: [
      {key: "routes", label: "Маршруты", group: "Слои", kind: "boolean"},
      {key: "ports", label: "Порты", group: "Слои", kind: "boolean"},
    ],
    render(surface, args, frame) {
      drawLayoutPreview(surface, graph, layoutCoffmanGraham(graph), frame, {
        showRoutes: args.routes === true,
        showPorts: args.ports === true,
        labels: TOP_DOWN_DENSE_LABELS,
      })
    },
    source() {
      return [
        'import {layoutCoffmanGraham} from "@nodes/layout/coffman-graham"',
        "",
        `const graph = ${JSON.stringify(graph, null, 2)}`,
        "const result = layoutCoffmanGraham(graph)",
      ].join("\n")
    },
  })
}
