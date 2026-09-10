import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {buildComponentDependencyGraph, type ComponentDependencyGraph} from "../../../../fixtures/dependency-graph.ts"

const root = resolve(import.meta.dir, "../../../..")

test.each([
  {
    name: "DiagramNode",
    file: "nodes/node/diagram/index.tsx",
    expected: {
      // Typography передаётся в children компонента Pane, но используется в JSX DiagramNode.
      "nodes/node/diagram/index.tsx#DiagramNode": {
        uses: ["ui/surfaces/pane.tsx#Pane", "ui/typography.tsx#Typography"],
        elements: ["article"],
      },
      "ui/surfaces/pane.tsx#Pane": {uses: [], elements: ["section"]},
      "ui/typography.tsx#Typography": {uses: [], elements: ["span"]},
    },
  },
] satisfies {
  name: string,
  file: string,
  expected: ComponentDependencyGraph
}[])("[DIAGRAM-DEPENDENCIES] $name: полный граф компонентов и нативных элементов", async ({name, file, expected}) => {
  const graph = await buildComponentDependencyGraph(root, {
    file: resolve(root, file),
    name,
  })

  expect(graph, `Полный граф зависимостей ${name} должен совпадать с ожидаемым составом без пропущенных или лишних компонентов, связей и нативных элементов`).toEqual(expected)
})