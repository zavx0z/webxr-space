import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {buildComponentDependencyGraph, type ComponentDependencyGraph} from "../../../../fixtures/dependency-graph.ts"

const root = resolve(import.meta.dir, "../../../..")

// Статический эталон включает все ветви собственного JSX и транзитивные компоненты.
// JSX, переданный потребителем через children, принадлежит графу его автора.
test.each([
  {
    name: "Socket",
    file: "nodes/sockets/socket/index.tsx",
    expected: {
      "nodes/sockets/socket/index.tsx#Socket": {
        uses: [],
        elements: ["button","span"],
      },
    },
  },
] satisfies {
  name: string,
  file: string,
  expected: ComponentDependencyGraph
}[])("[COMPONENT-DEPENDENCIES] $name: полный статический граф JSX", async ({name, file, expected}) => {
  const graph = await buildComponentDependencyGraph(root, {
    file: resolve(root, file),
    name,
  })

  expect(graph, `Статический граф JSX ${name} должен совпадать с эталоном без пропущенных или лишних компонентов, связей и нативных элементов`).toEqual(expected)
}, 30_000)
