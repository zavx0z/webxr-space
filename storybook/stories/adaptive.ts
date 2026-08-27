import {layoutAdaptive} from "@nodes/layout/adaptive"
import {defineStorybookStoryModule} from "@zavx0z/storybook/stories"
import {getStorybookFixture} from "../layout-fixtures.ts"
import {drawLayoutPreview} from "../render-layout-preview.ts"
import {layoutStorySource} from "../story-source.ts"

export function createAdaptiveLayoutStory(fixtureId: string) {
  const fixture = getStorybookFixture(fixtureId)
  if (fixture.policyId !== "adaptive") throw new Error(`Expected adaptive fixture: ${fixtureId}`)
  return defineStorybookStoryModule({
    defaultArgs: {routes: true, ports: true},
    controls: [
      {key: "routes", label: "Маршруты", group: "Слои", kind: "boolean"},
      {key: "ports", label: "Порты", group: "Слои", kind: "boolean"},
    ],
    render(surface, args, frame) {
      drawLayoutPreview(surface, fixture.graph, layoutAdaptive(fixture.graph), frame, {
        showRoutes: args.routes === true,
        showPorts: args.ports === true,
      })
    },
    source() {
      const typescript = [
        'import {layoutAdaptive} from "@nodes/layout/adaptive"',
        "",
        `const graph = ${JSON.stringify(fixture.graph, null, 2)}`,
        "const result = layoutAdaptive(graph)",
      ].join("\n")
      return layoutStorySource("adaptive", typescript)
    },
  })
}
