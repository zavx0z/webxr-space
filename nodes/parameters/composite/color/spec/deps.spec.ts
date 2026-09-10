import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {buildComponentDependencyGraph, type ComponentDependencyGraph} from "../../../../../fixtures/dependency-graph.ts"

const root = resolve(import.meta.dir, "../../../../..")

// Статический эталон включает все ветви собственного JSX и транзитивные компоненты.
// JSX, переданный потребителем через children, принадлежит графу его автора.
test.each([
  {
    name: "ColorParameter",
    file: "nodes/parameters/composite/color/index.tsx",
    expected: {
      "nodes/parameters/composite/color/index.tsx#ColorParameter": {
        uses: ["nodes/parameters/shared/layout/index.tsx#ParameterLayout","ui/fields/color-field.tsx#ColorField"],
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
      "ui/buttons/button.tsx#Button": {
        uses: [],
        elements: ["button","img","span"],
      },
      "ui/fields/color-field.tsx#ColorField": {
        uses: ["ui/buttons/button.tsx#Button","ui/fields/color-picker-field.tsx#ColorPickerField"],
        elements: ["div","span"],
      },
      "ui/fields/color-picker-field.tsx#CheckerCell": {
        uses: [],
        elements: ["span"],
      },
      "ui/fields/color-picker-field.tsx#ColorChannelField": {
        uses: ["ui/fields/number-field.tsx#NumberField","ui/fields/slider-field.tsx#SliderField"],
        elements: ["div","span"],
      },
      "ui/fields/color-picker-field.tsx#ColorPickerField": {
        uses: ["ui/fields/color-picker-field.tsx#ColorChannelField","ui/fields/color-picker-field.tsx#ColorSwatch","ui/fields/text-field.tsx#TextField"],
        elements: ["div","span"],
      },
      "ui/fields/color-picker-field.tsx#ColorSwatch": {
        uses: ["ui/fields/color-picker-field.tsx#CheckerCell"],
        elements: ["div","span"],
      },
      "ui/fields/number-field.tsx#NumberField": {
        uses: [],
        elements: ["button","div","input","span"],
      },
      "ui/fields/slider-field.tsx#SliderField": {
        uses: [],
        elements: ["input","label","span"],
      },
      "ui/fields/text-field.tsx#TextField": {
        uses: [],
        elements: ["input","label","span"],
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
