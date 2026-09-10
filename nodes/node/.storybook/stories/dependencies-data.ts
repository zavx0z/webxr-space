/** Связи компонентов подтверждены исходным кодом и используются только документацией этого пакета. */
export type DependencyScope = "nodes" | "parameter"
export type DependencyComponent = Readonly<{
  id: string
  owner: "node" | "parameters" | "sockets" | "ui"
  source: string
  description: string
  uses: readonly string[]
}>

export const dependencyComponents: readonly DependencyComponent[] = [
  {
    "id": "ContentNode",
    "owner": "node",
    "source": "nodes/node/content/index.tsx",
    "description": "Добавляет произвольное JSX-содержимое к ParameterNode. Содержимое и параметры можно сворачивать независимо.",
    "uses": [
      "Pane",
      "ContentSurface",
      "ParameterNode"
    ]
  },
  {
    "id": "ParameterNode",
    "owner": "node",
    "source": "nodes/node/parameter/index.tsx",
    "description": "Нода с шапкой и готовыми параметрами. Pane оформляет поверхность; ParameterNodeContents собирает её содержимое.",
    "uses": [
      "Pane",
      "ParameterNodeContents"
    ]
  },
  {
    "id": "DiagramNode",
    "owner": "node",
    "source": "nodes/node/diagram/index.tsx",
    "description": "Показывает описание на всю площадь. В этой схеме каждый прямоугольник — настоящий DiagramNode.",
    "uses": [
      "Pane",
      "Typography"
    ]
  },
  {
    "id": "ContentSurface",
    "owner": "node",
    "source": "nodes/node/content/surface/index.tsx",
    "description": "Внутренняя область произвольного содержимого. Принимает children; изображение — только один из поддерживаемых вариантов.",
    "uses": [
      "ContentImage"
    ]
  },
  {
    "id": "ContentImage",
    "owner": "node",
    "source": "nodes/node/content/image/index.tsx",
    "description": "Необязательное отображение изображения внутри области содержимого. Не ограничивает ContentNode только изображениями.",
    "uses": []
  },
  {
    "id": "ParameterNodeContents",
    "owner": "node",
    "source": "nodes/node/parameter/contents/index.tsx",
    "description": "Внутренняя часть ParameterNode: кнопки шапки, готовые параметры и самостоятельные сокеты.",
    "uses": [
      "Button",
      "IconButton",
      "Parameter",
      "Socket"
    ]
  },
  {
    "id": "Parameter",
    "owner": "parameters",
    "source": "nodes/parameters/shared/parameter/index.tsx",
    "description": "Адаптер данных: выбирает готовый компонент параметра по его виду. Здесь подробно показан путь числового параметра; другие виды не раскрыты. Это не класс хранения значения из @nodes/tree.",
    "uses": [
      "NumberParameter"
    ]
  },
  {
    "id": "NumberParameter",
    "owner": "parameters",
    "source": "nodes/parameters/numeric/number/index.tsx",
    "description": "Готовый числовой параметр. Собирает общее оформление параметра и готовое числовое поле UI.",
    "uses": [
      "ParameterLayout",
      "NumberField"
    ]
  },
  {
    "id": "ParameterLayout",
    "owner": "parameters",
    "source": "nodes/parameters/shared/layout/index.tsx",
    "description": "Размещает подпись, переданное поле и сокеты. Значение не хранит.",
    "uses": [
      "ParameterEndpoints",
      "ParameterLabel"
    ]
  },
  {
    "id": "ParameterEndpoints",
    "owner": "parameters",
    "source": "nodes/parameters/shared/endpoints/index.tsx",
    "description": "Показывает сокеты нужной стороны, сохраняя их идентификаторы.",
    "uses": [
      "Socket"
    ]
  },
  {
    "id": "ParameterLabel",
    "owner": "parameters",
    "source": "nodes/parameters/shared/label/index.tsx",
    "description": "Подпись параметра. Учитывает подключение, скрытие и подсказку.",
    "uses": []
  },
  {
    "id": "Socket",
    "owner": "sockets",
    "source": "nodes/sockets/socket/index.tsx",
    "description": "Один адресуемый вход или выход. Показывает форму и состояние, передаёт активацию приложению.",
    "uses": []
  },
  {
    "id": "Pane",
    "owner": "ui",
    "source": "ui/surfaces/pane.tsx",
    "description": "Общий контейнер с фоном, границей и отступами. Не добавляет шапку или модель ноды.",
    "uses": []
  },
  {
    "id": "Typography",
    "owner": "ui",
    "source": "ui/typography.tsx",
    "description": "Общий компонент текста.",
    "uses": []
  },
  {
    "id": "Button",
    "owner": "ui",
    "source": "ui/buttons/button.tsx",
    "description": "Готовая кнопка. В ParameterNodeContents управляет сворачиванием.",
    "uses": []
  },
  {
    "id": "IconButton",
    "owner": "ui",
    "source": "ui/buttons/button.tsx",
    "description": "Готовая кнопка с иконкой для дополнительных действий в шапке.",
    "uses": [
      "Button"
    ]
  },
  {
    "id": "NumberField",
    "owner": "ui",
    "source": "ui/fields/number-field.tsx",
    "description": "Числовое поле UI: показ, ввод и изменение числа. Хранение значения остаётся у переданного Store.",
    "uses": []
  }
]

export const dependencyScopes: Readonly<Record<DependencyScope, readonly string[]>> = {
  nodes: ["ContentNode", "ParameterNode", "DiagramNode", "Pane", "Typography", "ContentSurface", "ParameterNodeContents"],
  parameter: ["ParameterNodeContents", "Parameter", "NumberParameter", "ParameterLayout", "ParameterEndpoints", "ParameterLabel", "NumberField", "Socket", "Button", "IconButton"],
}

export function dependencyGraph(scope: DependencyScope) {
  const ids = new Set(dependencyScopes[scope])
  const components = dependencyComponents.filter(component => ids.has(component.id))
  const relations = components.flatMap(component => component.uses
    .filter(id => ids.has(id))
    .map(id => ({id: `${component.id}->${id}`, from: component.id, to: id})))
  return {components, relations}
}

export const ownerNames = {
  node: "@nodes/node — компоненты нод",
  parameters: "@nodes/parameters — готовые параметры",
  sockets: "@nodes/sockets — сокеты",
  ui: "@zavx0z/ui — общие компоненты",
} as const
