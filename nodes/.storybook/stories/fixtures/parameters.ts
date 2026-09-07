import {Parameter, type NodeJsonValue} from "@zavx0z/nodetree"

export const PARAMETER_EXAMPLES = Object.freeze({
  text: {label: "Текст", api: "TextParameter", valueType: "string", value: "Пример", presentation: {placeholder: "Введите текст"}},
  number: {label: "Число", api: "NumberParameter", valueType: "float", value: 2.5, presentation: {step: .25, precision: 2}},
  slider: {label: "Слайдер", api: "SliderParameter", valueType: "float", value: .4, presentation: {interaction: "slider", min: 0, max: 1, step: .05}},
  checkbox: {label: "Флажок", api: "CheckboxParameter", valueType: "boolean", value: true, presentation: {}},
  switch: {label: "Переключатель", api: "SwitchParameter", valueType: "boolean", value: false, presentation: {interaction: "switch"}},
  select: {label: "Список", api: "SelectParameter", valueType: "menu", value: "first", presentation: {options: options()}},
  cycle: {label: "Перебор", api: "CycleParameter", valueType: "menu", value: "first", presentation: {interaction: "cycle", options: options()}},
  "option-group": {label: "Группа вариантов", api: "OptionGroupParameter", valueType: "menu", value: "first", presentation: {interaction: "option-group", options: options()}},
  color: {label: "Цвет", api: "ColorParameter", valueType: "color", value: {r: .25, g: .55, b: .85, a: 1}, presentation: {}},
  vector: {label: "Вектор", api: "VectorParameter", valueType: "vector", value: [1, 2, 3], presentation: {axes: ["X", "Y", "Z"], step: .1}},
  matrix: {label: "Матрица", api: "MatrixParameter", valueType: "matrix", value: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], presentation: {step: .1}},
  path: {label: "Путь", api: "PathParameter", valueType: "path", value: "/assets/example.png", presentation: {}},
  reference: {label: "Ссылка", api: "ReferenceParameter", valueType: "object", value: {id: "object-a", label: "Объект A", kind: "object"}, presentation: {}},
  collection: {label: "Коллекция", api: "CollectionParameter", valueType: "collection", value: "first", presentation: {items: items(), visibleRows: 3}},
  output: {label: "Вывод", api: "OutputParameter", valueType: "custom", value: {message: "Готово", count: 3}, presentation: {}},
})

export type ParameterMechanism = keyof typeof PARAMETER_EXAMPLES

export function parameterFixture(mechanism: ParameterMechanism, variant: string, id = "value") {
  const example = PARAMETER_EXAMPLES[mechanism]
  if (example === undefined) throw new Error(`Неизвестный механизм Parameter: ${mechanism}`)
  const parameter = new Parameter<NodeJsonValue, NodeJsonValue>(id, example.value, {
    ...example.presentation,
    label: example.label,
    disabled: variant === "disabled",
    readOnly: variant === "readonly",
  }, {id: example.valueType, version: 1})
  return parameter
}

function options() {
  return [{key: "first", value: "first", label: "Первый"}, {key: "second", value: "second", label: "Второй"}]
}

function items() {
  return [{id: "first", label: "Первый"}, {id: "second", label: "Второй"}, {id: "third", label: "Третий"}]
}
