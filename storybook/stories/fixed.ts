import {layoutFixed} from "@nodes/layout/fixed"
import {defineStorybookStoryModule} from "@zavx0z/storybook/stories"
import {getStorybookFixture} from "../layout-fixtures.ts"
import {drawLayoutPreview} from "../render-layout-preview.ts"
import {layoutStorySource} from "../story-source.ts"

export function createFixedLayoutStory(fixtureId: string) {
  const fixture = getStorybookFixture(fixtureId)
  if (fixture.policyId !== "fixed") throw new Error(`Expected fixed fixture: ${fixtureId}`)
  return defineStorybookStoryModule({
    defaultArgs: {routes: true, ports: true},
    controls: [
      {key: "routes", label: "Маршруты", group: "Слои", kind: "boolean"},
      {key: "ports", label: "Порты", group: "Слои", kind: "boolean"},
    ],
    render(surface, args, frame) {
      drawLayoutPreview(surface, fixture.graph, layoutFixed(fixture.graph), frame, {
        showRoutes: args.routes === true,
        showPorts: args.ports === true,
      })
    },
    source() {
      const typescript = [
        'import {layoutFixed} from "@nodes/layout/fixed"',
        "",
        `const graph = ${JSON.stringify(fixture.graph, null, 2)}`,
        "const result = layoutFixed(graph)",
      ].join("\n")
      return layoutStorySource("fixed", typescript)
    },
  })
}
