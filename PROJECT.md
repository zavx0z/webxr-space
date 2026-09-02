# Visual monorepo

## Цель

Одна визуальная платформа без потери действующего поведения Engine, Renderer,
UI и Node.

## Главный закон

Один Experience владеет одним `Document`, Canvas, `Space`, `ViewPoint`, вводом
и циклом кадров.

```text
Document
└── Space
    ├── ViewPoint
    ├── Mesh
    │   ├── Geometry
    │   └── Material
    ├── Display
    ├── HUD
    └── UI и Node-компоненты
```

Engine и WebGPU хранят только производное представление элементов `Document`,
а не второй главный граф.

## Пакеты

Все пакеты находятся прямо в корне и используют Bun 1.4 и TypeScript 7.

| Каталог | Пакет | Ответственность |
| --- | --- | --- |
| `engine` | `@zavx0z/engine` | Объекты сцены, геометрия, материалы, математика и анимация без WebGPU |
| `dom` | `@zavx0z/dom` | `Document`, элементы, атрибуты, события, focus и состояние полей |
| `template` | `@zavx0z/template` | Компилятор TSX и формат готового шаблона |
| `component` | `@zavx0z/component` | Состояние компонентов, hooks, context, эффекты и очистка |
| `renderer` | `@zavx0z/renderer` | CSS, размеры, раскладка, прокрутка, список рисования и hit без GPU |
| `webgpu` | `@zavx0z/webgpu` | Shaders, buffers, textures, uploads и рисование |
| `browser` | `@zavx0z/browser` | Canvas, resize, input, RAF и общий цикл кадров |
| `space` | `@zavx0z/space` | `Space`, `ViewPoint`, `Mesh`, `Geometry`, `Material`, `Display` и `HUD` |
| `ui` | `@zavx0z/ui` | Универсальные UI-компоненты, тема и иконки |
| `nodetree` | `@zavx0z/nodetree` | Живая модель `NodeTree`, Parameter stores, снимки и сохранение |
| `layout` | `@zavx0z/layout` | Алгоритмы расположения нод и Worker |
| `nodes` | `@zavx0z/nodes` | Визуальные NodeTree, NodeEditor, Frame, Node, Parameter, Socket и Link |

## Модули пакета

Публичный модуль содержит настоящую реализацию владельца, а не переэкспорт
скрытого файла.

`src/` используется только для внутренней механики. Код группируется по
назначению. `src/shared` допустим только для кода, который используют минимум
два независимых владельца. `misc`, `common`, `utils`, общий `src/index.ts` и
импорты чужого `src/**` запрещены.

### UI

```text
ui/
├── buttons/
├── fields/
├── menus/
├── surfaces/
├── views/
├── feedback/
├── widgets/
├── themes/
├── src/
├── tests/
└── .storybook/
```

`FieldGroup` остаётся в `fields`. `OptionGroupField` относится к `buttons` и
становится `ToggleButtonGroup`. `Inspector` относится к `widgets`.

### Nodes

```text
nodes/
├── node-tree.tsx
├── node-editor.tsx
├── frame.tsx
├── node.tsx
├── parameter.tsx
├── socket.tsx
├── link.tsx
├── src/
├── tests/
└── .storybook/
```

Каждый публичный TSX является настоящим владельцем. Скрытые `NodeCard`,
`ParameterRow` и `SocketPort` не подменяют публичные Node, Parameter и Socket.

## Проверки

Проверки одного пакета находятся в `<package>/tests/`. Общие проверки находятся
в корневом `/tests/`:

```text
tests/
├── architecture/
├── experience/
├── migration/
└── acceptance/
```

Проверки являются требованиями к архитектуре. `todo` не считается выполненным
требованием.

## Пока не переносим

`@nodes/editor` и DOM inspector остаются в исходных репозиториях до появления
подтверждённого производственного потребителя.

## Исходники

```text
projects/engine  a3032d9
projects/ui      90c7708
projects/node    6aef6ab
../renderer      e428e64
../template      671d19f
```

## Запрещено

- приблизительно переписывать старую логику;
- одновременно переносить, переименовывать и менять поведение;
- удалять старый код до полной проверки нового;
- создавать второй `Document`, Canvas, Space или главный граф;
- добавлять обходы в UI и Node вместо исправления платформы;
- считать одни зелёные тесты полной приёмкой;
- выполнять push без отдельного указания.
