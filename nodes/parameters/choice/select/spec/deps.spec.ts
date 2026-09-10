import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {buildComponentDependencyGraph, type ComponentDependencyGraph} from "../../../../../fixtures/dependency-graph.ts"

const root = resolve(import.meta.dir, "../../../../..")

// Статический эталон включает все ветви собственного JSX и транзитивные компоненты.
// JSX, переданный потребителем через children, принадлежит графу его автора.
test.each([
  {
    name: "SelectParameter",
    file: "nodes/parameters/choice/select/index.tsx",
    expected: {
      "nodes/parameters/choice/select/index.tsx#SelectParameter": {
        uses: ["nodes/parameters/shared/layout/index.tsx#ParameterLayout","ui/fields/select-field.tsx#SelectField"],
        elements: [],
      },
      "nodes/parameters/shared/endpoints/index.tsx#ParameterEndpoints": {
        uses: ["nodes/sockets/socket/index.tsx#Socket"],
        elements: ["span"],
      },
      "nodes/parameters/shared/label/index.tsx#ParameterLabel": {
        uses: [],
        elements: ["span"],
      },
      "nodes/parameters/shared/layout/index.tsx#ParameterLayout": {
        uses: ["nodes/parameters/shared/endpoints/index.tsx#ParameterEndpoints","nodes/parameters/shared/label/index.tsx#ParameterLabel"],
        elements: ["div","span"],
      },
      "nodes/sockets/socket/index.tsx#Socket": {
        uses: [],
        elements: ["button","span"],
      },
      "ui/fields/select-field.tsx#SelectField": {
        uses: ["ui/fields/select-field.tsx#SelectOption"],
        elements: ["label","optgroup","option","select","span"],
      },
      "ui/fields/select-field.tsx#SelectOption": {
        uses: [],
        elements: ["option"],
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
