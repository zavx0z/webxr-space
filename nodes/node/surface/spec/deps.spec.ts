import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {buildComponentDependencyGraph, type ComponentDependencyGraph} from "../../../../fixtures/dependency-graph.ts"

const root = resolve(import.meta.dir, "../../../..")

// Полный статический эталон включает все ветви JSX и транзитивные компоненты.
test.each([
  {
    "name": "ContentSurface",
    "file": "nodes/node/surface/index.tsx",
    "expected": {
      "nodes/node/image/index.tsx#ContentImage": {
        "uses": [],
        "elements": [
          "img"
        ]
      },
      "nodes/node/surface/index.tsx#ContentSurface": {
        "uses": [
          "nodes/node/image/index.tsx#ContentImage"
        ],
        "elements": [
          "section"
        ]
      }
    }
  },
] satisfies {
  name: string,
  file: string,
  expected: ComponentDependencyGraph
}[])("[NODE-DEPENDENCIES] $name: полный граф компонентов и нативных элементов", async ({name, file, expected}) => {
  const graph = await buildComponentDependencyGraph(root, {
    file: resolve(root, file),
    name,
  })

  expect(graph, `Полный граф зависимостей ${name} должен совпадать с эталоном без пропущенных или лишних компонентов, связей и нативных элементов`).toEqual(expected)
})
