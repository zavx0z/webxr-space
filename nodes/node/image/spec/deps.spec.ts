import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {buildComponentDependencyGraph, type ComponentDependencyGraph} from "../../../../fixtures/dependency-graph.ts"

const root = resolve(import.meta.dir, "../../../..")

// Полный статический эталон включает все ветви JSX и транзитивные компоненты.
test.each([
  {
    "name": "ContentImage",
    "file": "nodes/node/image/index.tsx",
    "expected": {
      "nodes/node/image/index.tsx#ContentImage": {
        "uses": [],
        "elements": [
          "img"
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
