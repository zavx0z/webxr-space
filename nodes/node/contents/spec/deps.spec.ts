import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {buildComponentDependencyGraph, type ComponentDependencyGraph} from "../../../../fixtures/dependency-graph.ts"

const root = resolve(import.meta.dir, "../../../..")

// Полный статический эталон включает все ветви JSX и транзитивные компоненты.
test.each([
  {
    "name": "ParameterNodeContents",
    "file": "nodes/node/contents/index.tsx",
    "expected": {
      "nodes/node/contents/index.tsx#ParameterNodeContents": {
        "uses": [
          "nodes/parameters/shared/parameter/index.tsx#Parameter",
          "nodes/sockets/socket/index.tsx#Socket",
          "ui/buttons/button.tsx#Button",
          "ui/buttons/button.tsx#IconButton"
        ],
        "elements": [
          "header",
          "section",
          "small",
          "strong"
        ]
      },
      "nodes/parameters/boolean/checkbox/index.tsx#CheckboxParameter": {
        "uses": [
          "nodes/parameters/shared/layout/index.tsx#ParameterLayout",
          "ui/fields/checkbox-field.tsx#CheckboxField"
        ],
        "elements": []
      },
      "nodes/parameters/boolean/switch/index.tsx#SwitchParameter": {
        "uses": [
          "nodes/parameters/shared/layout/index.tsx#ParameterLayout",
          "ui/fields/switch-field.tsx#SwitchField"
        ],
        "elements": []
      },
      "nodes/parameters/choice/cycle/index.tsx#CycleParameter": {
        "uses": [
          "nodes/parameters/shared/layout/index.tsx#ParameterLayout",
          "ui/fields/cycle-field.tsx#CycleField"
        ],
        "elements": []
      },
      "nodes/parameters/choice/option-group/index.tsx#OptionGroupParameter": {
        "uses": [
          "nodes/parameters/shared/layout/index.tsx#ParameterLayout",
          "ui/buttons/toggle-button-group.tsx#ToggleButtonGroup"
        ],
        "elements": []
      },
      "nodes/parameters/choice/select/index.tsx#SelectParameter": {
        "uses": [
          "nodes/parameters/shared/layout/index.tsx#ParameterLayout",
          "ui/fields/select-field.tsx#SelectField"
        ],
        "elements": []
      },
      "nodes/parameters/collections/collection/index.tsx#CollectionParameter": {
        "uses": [
          "nodes/parameters/shared/layout/index.tsx#ParameterLayout",
          "ui/fields/collection-field.tsx#CollectionField"
        ],
        "elements": []
      },
      "nodes/parameters/composite/color/index.tsx#ColorParameter": {
        "uses": [
          "nodes/parameters/shared/layout/index.tsx#ParameterLayout",
          "ui/fields/color-field.tsx#ColorField"
        ],
        "elements": []
      },
      "nodes/parameters/composite/matrix/index.tsx#MatrixParameter": {
        "uses": [
          "nodes/parameters/shared/layout/index.tsx#ParameterLayout",
          "ui/fields/matrix-field.tsx#MatrixField"
        ],
        "elements": []
      },
      "nodes/parameters/composite/vector/index.tsx#VectorParameter": {
        "uses": [
          "nodes/parameters/shared/layout/index.tsx#ParameterLayout",
          "ui/fields/vector-field.tsx#VectorField"
        ],
        "elements": []
      },
      "nodes/parameters/numeric/number/index.tsx#NumberParameter": {
        "uses": [
          "nodes/parameters/shared/layout/index.tsx#ParameterLayout",
          "ui/fields/number-field.tsx#NumberField"
        ],
        "elements": []
      },
      "nodes/parameters/numeric/slider/index.tsx#SliderParameter": {
        "uses": [
          "nodes/parameters/shared/layout/index.tsx#ParameterLayout",
          "ui/fields/slider-field.tsx#SliderField"
        ],
        "elements": []
      },
      "nodes/parameters/output/output/index.tsx#OutputParameter": {
        "uses": [
          "nodes/parameters/shared/layout/index.tsx#ParameterLayout",
          "nodes/parameters/shared/output/index.tsx#ParameterOutput"
        ],
        "elements": []
      },
      "nodes/parameters/references/path/index.tsx#PathParameter": {
        "uses": [
          "nodes/parameters/shared/layout/index.tsx#ParameterLayout",
          "ui/fields/path-field.tsx#PathField"
        ],
        "elements": []
      },
      "nodes/parameters/references/reference/index.tsx#ReferenceParameter": {
        "uses": [
          "nodes/parameters/shared/layout/index.tsx#ParameterLayout",
          "ui/fields/reference-field.tsx#ReferenceField"
        ],
        "elements": []
      },
      "nodes/parameters/shared/endpoints/index.tsx#ParameterEndpoints": {
        "uses": [
          "nodes/sockets/socket/index.tsx#Socket"
        ],
        "elements": [
          "span"
        ]
      },
      "nodes/parameters/shared/label/index.tsx#ParameterLabel": {
        "uses": [],
        "elements": [
          "span"
        ]
      },
      "nodes/parameters/shared/layout/index.tsx#ParameterLayout": {
        "uses": [
          "nodes/parameters/shared/endpoints/index.tsx#ParameterEndpoints",
          "nodes/parameters/shared/label/index.tsx#ParameterLabel"
        ],
        "elements": [
          "div",
          "span"
        ]
      },
      "nodes/parameters/shared/output/index.tsx#ParameterOutput": {
        "uses": [],
        "elements": [
          "output"
        ]
      },
      "nodes/parameters/shared/parameter/index.tsx#Parameter": {
        "uses": [
          "nodes/parameters/boolean/checkbox/index.tsx#CheckboxParameter",
          "nodes/parameters/boolean/switch/index.tsx#SwitchParameter",
          "nodes/parameters/choice/cycle/index.tsx#CycleParameter",
          "nodes/parameters/choice/option-group/index.tsx#OptionGroupParameter",
          "nodes/parameters/choice/select/index.tsx#SelectParameter",
          "nodes/parameters/collections/collection/index.tsx#CollectionParameter",
          "nodes/parameters/composite/color/index.tsx#ColorParameter",
          "nodes/parameters/composite/matrix/index.tsx#MatrixParameter",
          "nodes/parameters/composite/vector/index.tsx#VectorParameter",
          "nodes/parameters/numeric/number/index.tsx#NumberParameter",
          "nodes/parameters/numeric/slider/index.tsx#SliderParameter",
          "nodes/parameters/output/output/index.tsx#OutputParameter",
          "nodes/parameters/references/path/index.tsx#PathParameter",
          "nodes/parameters/references/reference/index.tsx#ReferenceParameter",
          "nodes/parameters/text/text/index.tsx#TextParameter"
        ],
        "elements": []
      },
      "nodes/parameters/text/text/index.tsx#TextParameter": {
        "uses": [
          "nodes/parameters/shared/layout/index.tsx#ParameterLayout",
          "ui/fields/text-field.tsx#TextField"
        ],
        "elements": []
      },
      "nodes/sockets/socket/index.tsx#Socket": {
        "uses": [],
        "elements": [
          "button",
          "span"
        ]
      },
      "ui/buttons/button.tsx#Button": {
        "uses": [],
        "elements": [
          "button",
          "img",
          "span"
        ]
      },
      "ui/buttons/button.tsx#IconButton": {
        "uses": [
          "ui/buttons/button.tsx#Button"
        ],
        "elements": []
      },
      "ui/buttons/toggle-button-group.tsx#ToggleButtonGroup": {
        "uses": [
          "ui/buttons/button.tsx#Button"
        ],
        "elements": [
          "div",
          "span"
        ]
      },
      "ui/fields/checkbox-field.tsx#CheckboxField": {
        "uses": [],
        "elements": [
          "input",
          "label",
          "span"
        ]
      },
      "ui/fields/collection-field.tsx#CollectionField": {
        "uses": [
          "ui/buttons/button.tsx#IconButton",
          "ui/views/list.tsx#List"
        ],
        "elements": [
          "div",
          "span"
        ]
      },
      "ui/fields/color-field.tsx#ColorField": {
        "uses": [
          "ui/buttons/button.tsx#Button",
          "ui/fields/color-picker-field.tsx#ColorPickerField"
        ],
        "elements": [
          "div",
          "span"
        ]
      },
      "ui/fields/color-picker-field.tsx#CheckerCell": {
        "uses": [],
        "elements": [
          "span"
        ]
      },
      "ui/fields/color-picker-field.tsx#ColorChannelField": {
        "uses": [
          "ui/fields/number-field.tsx#NumberField",
          "ui/fields/slider-field.tsx#SliderField"
        ],
        "elements": [
          "div",
          "span"
        ]
      },
      "ui/fields/color-picker-field.tsx#ColorPickerField": {
        "uses": [
          "ui/fields/color-picker-field.tsx#ColorChannelField",
          "ui/fields/color-picker-field.tsx#ColorSwatch",
          "ui/fields/text-field.tsx#TextField"
        ],
        "elements": [
          "div",
          "span"
        ]
      },
      "ui/fields/color-picker-field.tsx#ColorSwatch": {
        "uses": [
          "ui/fields/color-picker-field.tsx#CheckerCell"
        ],
        "elements": [
          "div",
          "span"
        ]
      },
      "ui/fields/cycle-field.tsx#CycleField": {
        "uses": [
          "ui/buttons/button.tsx#Button",
          "ui/fields/cycle-field.tsx#CycleOption"
        ],
        "elements": [
          "div",
          "span"
        ]
      },
      "ui/fields/cycle-field.tsx#CycleOption": {
        "uses": [
          "ui/buttons/button.tsx#Button"
        ],
        "elements": []
      },
      "ui/fields/field-group.tsx#FieldGroup": {
        "uses": [],
        "elements": [
          "div",
          "span"
        ]
      },
      "ui/fields/matrix-field.tsx#MatrixField": {
        "uses": [
          "ui/fields/matrix-field.tsx#MatrixRow"
        ],
        "elements": [
          "div",
          "span"
        ]
      },
      "ui/fields/matrix-field.tsx#MatrixRow": {
        "uses": [
          "ui/fields/field-group.tsx#FieldGroup",
          "ui/fields/number-field.tsx#NumberField"
        ],
        "elements": []
      },
      "ui/fields/number-field.tsx#NumberField": {
        "uses": [],
        "elements": [
          "button",
          "div",
          "input",
          "span"
        ]
      },
      "ui/fields/path-field.tsx#PathField": {
        "uses": [
          "ui/buttons/button.tsx#IconButton",
          "ui/fields/text-field.tsx#TextField"
        ],
        "elements": [
          "div",
          "span"
        ]
      },
      "ui/fields/reference-field.tsx#ReferenceField": {
        "uses": [
          "ui/buttons/button.tsx#Button",
          "ui/buttons/button.tsx#IconButton"
        ],
        "elements": [
          "div",
          "span"
        ]
      },
      "ui/fields/select-field.tsx#SelectField": {
        "uses": [
          "ui/fields/select-field.tsx#SelectOption"
        ],
        "elements": [
          "label",
          "optgroup",
          "option",
          "select",
          "span"
        ]
      },
      "ui/fields/select-field.tsx#SelectOption": {
        "uses": [],
        "elements": [
          "option"
        ]
      },
      "ui/fields/slider-field.tsx#SliderField": {
        "uses": [],
        "elements": [
          "input",
          "label",
          "span"
        ]
      },
      "ui/fields/switch-field.tsx#SwitchField": {
        "uses": [],
        "elements": [
          "button",
          "div",
          "span"
        ]
      },
      "ui/fields/text-field.tsx#TextField": {
        "uses": [],
        "elements": [
          "input",
          "label",
          "span"
        ]
      },
      "ui/fields/vector-field.tsx#VectorField": {
        "uses": [
          "ui/fields/field-group.tsx#FieldGroup",
          "ui/fields/number-field.tsx#NumberField"
        ],
        "elements": []
      },
      "ui/views/list.tsx#EmptyListRow": {
        "uses": [],
        "elements": [
          "li"
        ]
      },
      "ui/views/list.tsx#List": {
        "uses": [
          "ui/views/list.tsx#EmptyListRow",
          "ui/views/list.tsx#ListRow"
        ],
        "elements": [
          "ul"
        ]
      },
      "ui/views/list.tsx#ListRow": {
        "uses": [],
        "elements": [
          "img",
          "li",
          "span"
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
}, 30_000)
