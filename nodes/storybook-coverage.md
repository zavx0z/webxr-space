# Полнота Storybook нодовой системы

Структурная миграция 2026-09-09 завершена: [новая проверка](structure-acceptance.json).
Пакет `@webxr/nodes` содержит 27 вариантов, `@nodes/parameters` — 122,
`@nodes/sockets` — 114, `@nodes/tree` — 25, `@nodes/layout` — 26.
В историческом обходе были проверены 314 вариантов. Текущий состав — 322. Компоненты находятся в своих `src`, общий код —
в пакетном `shared`; категории и принадлежность предметов определяются структурой.
Далее сохранена подробная матрица предыдущего среза; её числа и результаты
относятся к указанным историческим датам, а не к новой иерархии пакетов.

Исторический обход начальных состояний 2026-09-07: [машиночитаемая приёмка](storybook-acceptance.json)
содержит 403 успешно показанных начальных маршрута: корни пакетов, категории,
предметы и 314 вариантов. Пять timeout открытия подтверждены последующим
exact-view inspect; в итоговой проверке трёх пакетов consoleErrors и diagnostics
пустые. Это приёмка начального показа, а не всех возможных взаимодействий.

После исправления согласования 2026-09-08 Nodes: 36 pass / 0 fail,
3408 assertions и typecheck. Предыдущие проверки NodeTree — 21 pass /
681 assertions; Layout — 15 pass / 438 assertions.
Typecheck всех трёх пакетов проходит. Отдельно скомпилированы 60 показанных
Source-примеров настоящим Template compiler.
Исходный `NODES-CATALOG-006` теперь проходит; 11 дополнительных регрессий
проверяют source-bound layout, pending-ввод и устаревшие результаты.
[Договор и отдельное ограничение несвязанных портов](topology-layout-gap.md).

Матрица текущего среза от 2026-09-07. Она сопоставляет публичные экспорты
`@webxr/nodes`, `@nodes/tree` и `@nodes/layout` с реализацией,
объявленными сценариями, выполненными проверками и оставшимися пробелами.
Каталоги наполнены; NodeType остаётся проектом договора. Наличие маршрута,
успешной компиляции или mount-теста не означает полной визуальной приёмки.

Основание — [PROJECT](../PROJECT.md), публичные manifests
[Nodes](package.json), [NodeTree](tree/package.json),
[Layout](layout/package.json), package-owned каталоги и перечисленные ниже
исходники. Новые истории используют production API; headless-модель и алгоритмы
показывают свои реальные входы и результаты через development-only TSX.

## Состояние каталога

Состав после перехода 2026-09-09: 322 варианта. Приведённая ниже историческая
browser-приёмка 314 вариантов относится к состоянию 2026-09-07; она не заменяет
проверку изменённых компонентов.

| Пакет | Категории | Компоненты / предметы | Варианты |
| --- | ---: | ---: | ---: |
| @webxr/nodes | 2 | 6 | 21 |
| @nodes/node | 2 | 4 | 14 |
| @nodes/sockets | 1 | 19 | 114 |
| @nodes/parameters | 1 | 15 | 122 |
| @nodes/tree | 7 | 20 | 25 |
| @nodes/layout | 3 | 11 | 26 |

NodeType как декларация состава и defaults остаётся проектом. Для выбора
импортированного TSX-компонента теперь есть `NodeTreeProps.nodeViews`.

Первоначальная live-проверка общего обзора `nodes/layout` выявила ошибку
`Пример нодовой раскладки смонтирован вне host-owned DisplayElement`.
[Runtime истории](.storybook/runtime.ts) проверяет Display после `present`.
Порядок подключения aggregate исправлен владельцем Storybook; новые истории
не обходят эту проверку. Generic regression находится в
[aggregate-mount-lifecycle.test.ts](../../storybook/runtime/aggregate-mount-lifecycle.test.ts):
один и тот же adapter проверяет Display ancestor непосредственно после
`present` в отдельной истории и общем обзоре. В текущем срезе все три пакета
собраны MCP; Nodes layout открылся, fit и capture выполнены с нулём console errors.
Последующий обход всех уровней каталога зафиксирован в приёмке выше.

### Выполненные проверки и границы evidence

| Уровень | Результат | Что остаётся за пределами результата |
| --- | --- | --- |
| Nodes package tests | 36 pass / 0 fail, 3408 assertions; исходная регрессия и 11 coherence tests проходят | Ограничение несвязанных портов описано отдельно |
| Nodes Source | 60 показанных TSX-модулей скомпилированы настоящим Template compiler | Это компиляция примеров; она не исполняет каждый пример как отдельное приложение |
| NodeTree полный check | 21 pass, 681 assertions, typecheck успешен, включая compiled mount | Полная матрица пользовательских взаимодействий отдельно не заявлена |
| NodeTree compiled mount | `NODETREE-STORYBOOK-MOUNT`: все 25 вариантов монтируются, повторяются, сохраняют keyed row identity и освобождаются в Document host | Semantic mount дополнен начальным browser-обходом |
| Layout package check | 15 pass, 438 assertions, typecheck успешен | Числовая корректность не доказывает интеграцию вертикальных алгоритмов в Nodes |
| Storybook MCP build | Все три пакета успешно собраны | Build дополняется отдельной browser-приёмкой |
| Browser: начальный показ | 403 маршрута, включая все 314 variants, ready/presented; итоговая диагностика и console errors пустые | Начальный показ не доказывает все взаимодействия; известный topology trigger не принят |
| Browser: Nodes | Layout fit/capture успешны, console errors = 0; ввод текста сохранил semantic `node:110`, изменил canonical value и revision до 1, console errors = 0 | Полная матрица клавиш/жестов и пользовательских состояний отдельно не принята |
| Browser: Layout Worker | Все четыре exact Worker и transport lifecycle отработали; error/fault сценарии также прошли начальный показ | Не является нагрузочной приёмкой Worker |

Исторические счётчики каталога давали 314 вариантов суммарно. Browser-обход начального показа
завершён и записан по точным route/revision. Исправление исходной гонки и отдельное ограничение несвязанных портов описаны в
[topology-layout-gap.md](topology-layout-gap.md). Исправлен production-владелец Nodes; Component, Renderer, DOM, Template,
Engine и Layout не менялись.

### Сохраняемые маршруты

Все пути ниже уже существуют внутри пакета `@webxr/nodes`.
Объявления находятся в [catalog](.storybook/catalog.json),
исполняемые descriptors — в [subjects/layout.ts](.storybook/stories/subjects/layout.ts).

| Маршрут | Сценарий | Существующая проверка |
| --- | --- | --- |
| `layout/fixed/baseline/right` | Fixed, альбомная область, 4 Node, 2 Frame, 3 Link | `NODES-STORYBOOK-001`, `NODES-STORYBOOK-002` |
| `layout/fixed/baseline/down` | Fixed, портретная область, 4 Node, 2 Frame, 3 Link | Те же |
| `layout/adaptive/shared/right` | Adaptive, общий двунаправленный Socket, альбомная область | Те же |
| `layout/adaptive/shared/down` | Adaptive, общий двунаправленный Socket, портретная область | Те же |
| `layout/adaptive/compound/right` | Adaptive, 2 составных Frame, альбомная область | Те же |
| `layout/adaptive/compound/down` | Adaptive, 2 составных Frame, портретная область | Те же |

Проверки [storybook-layouts.test.ts](tests/storybook-layouts.test.ts)
подтверждают декларации, вызов Layout, монтирование production NodeEditor,
число сущностей, наличие кнопки fit, передачу стилей и очистку. Они не проверяют
жесты, редактирование Parameters, все виды Socket или порядок подключения
в общем обзоре. Все шесть маршрутов сохранены. Новые Socket/Parameter/component
сценарии проверяются отдельно в
[storybook-components.test.ts](tests/storybook-components.test.ts).

## Правила каталога

- Категория → конкретный предмет → применимые варианты. В категории «Сокеты»
  перечисляются конкретные kinds, в «Параметры» — механизмы взаимодействия.
- Пути относительны к пакету строки. Например, `sockets/boolean/states`
  существует внутри `@webxr/nodes`. `<variant>` задаёт семейство объявленных
  вариантов, перечисленных ниже. Будущие маршруты NodeType и недостающие
  сценарии явно помечены как план.
- Каждый предмет получает содержательный обзор, настоящую production-композицию,
  описание публичного API, исходники и связанные проверки. Обзор собирает
  те же сценарии, которые можно открыть отдельно.
- Визуальные компоненты показывает Nodes; состояние и модель — NodeTree;
  числовые входы/результаты и Worker — Layout. Headless-владелец не обязан
  заводить публичный TSX-компонент ради страницы документации.
- Одна страница Storybook сохраняет один Document, Canvas, Space, ViewPoint
  и общий input/frame lifecycle. Истории Nodes находятся в host-owned Display.
- Универсальный Field остаётся у UI. История Parameter проверяет его композицию
  со Store и Socket, не копирует реализацию Field.

## Nodes: Socket

Все 19 kinds реализованы публичным [Socket](socket.tsx) через
`SOCKET_KINDS`, `SOCKET_PRESETS` и `socketPreset`. Каждый вид имеет шесть
объявленных вариантов; `NODES-CATALOG-002` монтирует все виды, направления,
формы и состояния. `NODES-CATALOG-004` проверяет активацию Boolean Socket
с сохранением semantic Element. Это не browser-приёмка каждого состояния.

| Kind / предмет | Preset shape | Объявленное семейство маршрутов |
| --- | --- | --- |
| `boolean` | `circle` | `sockets/boolean/<variant>` |
| `float` | `circle` | `sockets/float/<variant>` |
| `integer` | `circle` | `sockets/integer/<variant>` |
| `vector` | `circle` | `sockets/vector/<variant>` |
| `rotation` | `diamond` | `sockets/rotation/<variant>` |
| `color` | `circle` | `sockets/color/<variant>` |
| `string` | `circle` | `sockets/string/<variant>` |
| `menu` | `diamond` | `sockets/menu/<variant>` |
| `object` | `circle` | `sockets/object/<variant>` |
| `collection` | `square` | `sockets/collection/<variant>` |
| `image` | `circle` | `sockets/image/<variant>` |
| `material` | `circle` | `sockets/material/<variant>` |
| `texture` | `circle` | `sockets/texture/<variant>` |
| `geometry` | `diamond` | `sockets/geometry/<variant>` |
| `matrix` | `square` | `sockets/matrix/<variant>` |
| `shader` | `circle` | `sockets/shader/<variant>` |
| `bundle` | `square-dot` | `sockets/bundle/<variant>` |
| `closure` | `diamond-dot` | `sockets/closure/<variant>` |
| `custom` | `circle-dot` | `sockets/custom/<variant>` |

Варианты каждого предмета: `input`, `output`, `bidirectional`, `shapes`,
`states`, `presentation`. Они показывают стороны, `endpoint`/`row`, обычный,
connected, selected и disabled Socket. Форма — независимый prop, а не новый
тип значения. `shapes` показывает все восемь значений `SOCKET_SHAPES`: `circle`,
`square`, `diamond`, `circle-dot`, `square-dot`, `diamond-dot`, `line`,
`volume-grid`. В каждой истории форм сравнение относится к одному выбранному
kind; отдельные виды значения из сочетаний kind/shape не создаются.

## Nodes: Parameter

Все механизмы ниже реализованы в [parameter.tsx](parameter.tsx).
Публичный `Parameter` выбирает представление из `ParameterSnapshot` через
`resolveProjectedParameterPresentation`; `projectedParameterFieldHeight`
использует тот же выбор. Отдельные компоненты `TextParameter` и остальные
принимают собственные props для авторской композиции. Все 15 механизмов
объявлены в каталоге и проходят compiled mount в `NODES-CATALOG-003`.

| Механизм / публичный компонент | UI-владелец | Evidence геометрии | Объявленное семейство маршрутов |
| --- | --- | --- | --- |
| Text / `TextParameter` | [TextField](../ui/fields/text-field.tsx) | `NODES-PROJECTED-GEOMETRY-001` | `parameters/text/<variant>` |
| Number / `NumberParameter` | [NumberField](../ui/fields/number-field.tsx) | `…-001` | `parameters/number/<variant>` |
| Slider / `SliderParameter` | [SliderField](../ui/fields/slider-field.tsx) | `…-001`, fallback `…-007` | `parameters/slider/<variant>` |
| Checkbox / `CheckboxParameter` | [CheckboxField](../ui/fields/checkbox-field.tsx) | `…-001` | `parameters/checkbox/<variant>` |
| Switch / `SwitchParameter` | [SwitchField](../ui/fields/switch-field.tsx) | `…-001` | `parameters/switch/<variant>` |
| Select / `SelectParameter` | [SelectField](../ui/fields/select-field.tsx) | `…-001`, resolver `…-007` | `parameters/select/<variant>` |
| Cycle / `CycleParameter` | [CycleField](../ui/fields/cycle-field.tsx) | `…-001` | `parameters/cycle/<variant>` |
| Option group / `OptionGroupParameter` | [ToggleButtonGroup](../ui/buttons/toggle-button-group.tsx) | `…-001` | `parameters/option-group/<variant>` |
| Color / `ColorParameter` | [ColorField](../ui/fields/color-field.tsx) | `…-001` | `parameters/color/<variant>` |
| Vector / `VectorParameter` | [VectorField](../ui/fields/vector-field.tsx) | `…-001` | `parameters/vector/<variant>` |
| Matrix / `MatrixParameter` | [MatrixField](../ui/fields/matrix-field.tsx) | `…-002`: 2×2, 3×3, 4×4 | `parameters/matrix/<variant>` |
| Path / `PathParameter` | [PathField](../ui/fields/path-field.tsx) | `…-001` | `parameters/path/<variant>` |
| Reference / `ReferenceParameter` | [ReferenceField](../ui/fields/reference-field.tsx) | `…-001`, resolver `…-007` | `parameters/reference/<variant>` |
| Collection / `CollectionParameter` | [CollectionField](../ui/fields/collection-field.tsx) | `…-003`: visibleRows; resolver `…-007` | `parameters/collection/<variant>` |
| Output / `OutputParameter` | Текстовое значение в Nodes | `…-001` | `parameters/output/<variant>` |

Префикс сокращённых IDs в таблице — `NODES-PROJECTED-GEOMETRY`;
точные проверки находятся в [projected-node-geometry.test.ts](tests/projected-node-geometry.test.ts).
Они проверяют числовой план и resolver, не редактирование смонтированного Field.
Варианты: `field`, `input`, `output`, `both`, `connected`, `disabled`,
`readonly`, `projected`; у Output отдельный `readonly` не объявлен, поскольку
сам компонент только для чтения. Matrix, Vector и Collection дополнены
вариантом `geometry`. Compiled mount всех вариантов и ввод текста проверены
в `NODES-CATALOG-003`, `NODES-CATALOG-004`; browser-ввод подтверждён для Text.
Для Number `float`/`integer`, для Vector `vector`/`rotation`, для Select
`enum`/`menu` являются вариантами значения и настройки существующего механизма.

| Сквозная возможность | Реализация / текущее evidence | Объявленный сценарий и оставшаяся проверка |
| --- | --- | --- |
| Авторские props и проекция snapshot | `Parameter`, 15 компонентов; `NODES-006`, `NODES-CATALOG-003` | `parameters/<mechanism>/field` и `…/projected` монтируют production-композиции с одним Store. Визуальное сопоставление каждого механизма ещё не зафиксировано |
| Живой внешний Store и события | `ParameterProps.store`, `onInput`, `onChange`; `NODES-CATALOG-004` и browser-ввод Text | `parameters/text/field`: значение и revision изменяются, input сохраняет identity. Полный набор механизмов ввода ещё требует взаимодействий |
| Socket связан с Parameter | `ParameterEndpoint`, `connectedSocketKeys`; `NODES-PROJECTED-GEOMETRY-004`, mount `NODES-CATALOG-003` | `parameters/matrix/connected` существует; автоматическое переключение connect/disconnect с проверкой возврата многорядного Field ещё не закреплено |
| Состояния и видимость | `disabled`, `readOnly`, `hidden` в авторских props; projected presentation поддерживает свой набор | `…/disabled`, `…/readonly` объявлены. Проверка отсутствия изменений при каждом виде пользовательского ввода и отдельное покрытие hidden остаются |
| Многорядность и отступы | `NODES-PROJECTED-GEOMETRY-002`, `…-003`, `…-005`; `NODES-METRICS-003`, `NODES-CATALOG-003` | `parameters/{matrix,vector,collection}/geometry`: размеры и visibleRows показаны. Pixel-приёмка соответствия TSX числовому плану с соседями ещё не заявлена |

## Nodes: композиция и редактор

| Публичная возможность | Реализация | Текущее evidence | Объявленный маршрут / оставшаяся приёмка |
| --- | --- | --- | --- |
| Node: шапка, категория, выбранное/скрытое/свёрнутое состояние | [ParameterNode](node/parameter/index.tsx), `ParameterNodeProps` | `NODES-001`, `NODES-STORYBOOK-002`, `NODES-CATALOG-005` | `components/node/{basic,empty,states,collapsed}`; mount пройден, полный browser-набор переключений ещё не принят |
| Node: preview и авторские children | [ContentNode](node/content/index.tsx), `ContentNodeProps` | Compiled production mount `NODES-CATALOG-005` | `components/node/preview`, `components/node/authored-content`; одновременно children и projected Parameters не передаются |
| Числовая геометрия Node и порты | [planProjectedNodeGeometry](node/shared/geometry.ts), [metrics](node/shared/metrics.ts), `nodeSocketLayoutPortId` из [view/tree.ts](view/tree.ts) | `NODES-METRICS-001..003`, `NODES-PROJECTED-GEOMETRY-001..007` | Общий код пакета, не отдельный визуальный subject. `components/node/empty`, `…/basic` и Parameter geometry показывают часть состояний |
| Состав шести компонентов Node | `node/{diagram,parameter,content,image,surface,contents}/index.tsx` | `spec/deps.spec.ts` каждого компонента проверяет полный граф через общий `fixtures/dependency-graph.ts` | Физические каталоги задают модули; ручной раздел зависимостей не создаётся. Общая проверка Storybook выполняется после интеграции |
| Frame: оформление, вложенность, выбор, children | [Frame](frame/index.tsx) | `NODES-STORYBOOK-002`, `NODES-CATALOG-005` | `components/frame/{basic,nested,states}` монтируются; полная проверка выбора/identity через взаимодействие ещё не зафиксирована |
| Link: polyline/cubic, цвет kind, состояния, активация | [Link](link/index.tsx), `LinkRoute`, `createCubicLinkRoute`, `projectLinkRoute` | `NODES-STORYBOOK-002`, `NODES-CATALOG-005` | `components/link/{orthogonal,cubic,states,disabled}` монтируются; browser-проверка границ и попадания по кривой ещё остаётся |
| Link: внешний Store | `LinkProps.store` в [link.tsx](link/index.tsx) | Compiled mount `NODES-CATALOG-005` | `components/link/live-store` существует; отдельные assertions route-update и сохранения Element ещё не заявлены |
| NodeTree: проекция единственного Store с LayoutResult | [NodeTree](view/tree.ts), `NodeTreeStore`, `NodeTreeProps` | `NODES-004`, `NODES-STORYBOOK-002`, `NODES-CATALOG-005..006`, `NODES-LAYOUT-COHERENCE-001..011` | `components/node-tree/live-store` показывает значения. `components/node-tree/topology` добавляет Node с сохранением identity; source-bound `createNodeTreeLayout` и pending описаны в [договоре](topology-layout-gap.md) |
| NodeTree: viewport, отсечение, transform | `viewport`, `materializeCulled`, `transform` в [node-tree.tsx](view/tree.ts) | Compiled mount `NODES-CATALOG-005` | `components/node-tree/viewport` существует; точные assertions отсечения, overscan и возврата ещё не заявлены |
| NodeTree: выбор, collapse, preview, события Socket/Parameter | [NodeTreeProps](view/tree.ts) | Compiled mount `NODES-CATALOG-005` | `components/node-tree/interaction` существует; полный набор callbacks по исходным сущностям требует приёмки |
| NodeEditor: fit, панорамирование, zoom/pinch, сетка | [NodeEditor](editor/index.tsx) | `NODES-STORYBOOK-002`, `NODES-CATALOG-005`; browser fit/capture с console errors = 0 | `components/node-editor/navigation`, `…/readonly`; pointer/wheel/pinch и границы масштаба ещё не приняты полностью |
| NodeEditor: собственное/управляемое состояние | [NodeEditorProps](editor/index.tsx): transform, selection, collapsedNodeIds, previewNodeIds | Compiled mount `NODES-CATALOG-005` | `components/node-editor/controlled` существует; полный договор изменения управляемых props/callbacks ещё требует приёмки |
| NodeEditor: выбор алгоритма во внешней композиции | [compiled-layout-story.tsx](.storybook/stories/compiled/compiled-layout-story.tsx) | Fixed/Adaptive и все шесть маршрутов | Сохранить `layout/*`; этот consumer не переносит алгоритмы из Layout в Nodes |

Общие проверки [contract.test.ts](tests/contract.test.ts): `NODES-001` —
компиляция семи публичных TSX; `NODES-002` — отсутствие скрытых замен владельцев;
`NODES-003` — отсутствие создания платформенных owners; `NODES-004` —
потребление переданного Store; `NODES-005` — публичные импорты;
`NODES-006` — единый resolver. Они сохраняются как границы, но не заменяют
поведенческие сценарии таблицы.

## NodeTree: модель и состояние

Все маршруты этой таблицы объявлены внутри `@nodes/tree`.
Проверки основы — [contract.test.ts](tree/tests/contract.test.ts) и
[template-foundation.test.ts](tree/tests/template-foundation.test.ts).
Содержимое результатов всех 25 сценариев проверяет
[storybook-model.test.ts](tree/tests/storybook-model.test.ts), а их
настоящую компиляцию, монтирование, повтор и cleanup —
[storybook-mount.test.ts](tree/tests/storybook-mount.test.ts).
`NODETREE-TEMPLATE-001`–`NODETREE-TEMPLATE-008` используют существующие production
операции и вручную собранные fixtures; фабрика NodeType из декларации ими не реализована.

| Публичная возможность | Реализация | Текущее evidence | Объявленные маршруты и сценарии |
| --- | --- | --- | --- |
| Node, Socket, Link, Frame и стабильные идентификаторы | [NodeTree](tree/model/node-tree/src/index.ts), [createNodeTree](tree/shared/foundation.ts) | `NODETREE-001`, `NODETREE-STORYBOOK-002` | `model/topology/baseline`: один graph, адреса endpoint и identity Store |
| GraphScope и NodeGroup, вложенные области и группы | [node-tree.ts](tree/model/node-tree/src/index.ts), [валидация](tree/shared/foundation.ts) | `NODETREE-TEMPLATE-006`, `NODETREE-STORYBOOK-002`: nested Scope и две вложенные группы/Frame | `model/scopes/nested`, `model/groups/nested`: scope/group/frame имеют разный смысл; произвольно глубокая иерархия отдельно не принята |
| Parameter Store: identity, set, revision, snapshot, subscribe | [Parameter](tree/model/parameter/src/index.ts) | `NODETREE-001..002`, `NODETREE-TEMPLATE-001..004`, `NODETREE-STORYBOOK-003` | `parameters/store/updates`, `parameters/store/shared`: no-op/unsubscribe, отказ общего Store у двух нод и независимость отдельных Stores |
| NodeJsonValue: владение неизменяемым JSON и сравнение | `ownNodeJsonValue`, `equalNodeJsonValue` в [parameter.ts](tree/model/parameter/src/index.ts) | `NODETREE-STORYBOOK-003`: deep freeze, копия, structural equality, отказ NaN | `parameters/value/ownership`: мутация исходного объекта не изменяет Store |
| NodeValueType и runtime-валидация значения | `ownNodeValueType`, [createValidatedParameter](tree/shared/foundation.ts) | `NODETREE-TEMPLATE-004`, `…-006`, `NODETREE-STORYBOOK-003`, `…-007` | `parameters/value-type/validation`: допустимый set и отказ без публикации; валидатор сохраняется после hydrate |
| Типы Socket, направления, совместимость и циклы | `FoundationNodeTreeOptions`, `validateFoundationDefinition` в [foundation.ts](tree/shared/foundation.ts) | `NODETREE-TEMPLATE-005`, `NODETREE-STORYBOOK-008`: equality, Link policy, allow/acyclic, неверное направление и endpoints | `validation/links/types`, `validation/topology/cycles`, `validation/topology/references` |
| Определение, снимок и ID-addressed document | `definition`, `snapshot`, `getSnapshot`, `document`, `toJSON` в [NodeTree](tree/model/node-tree/src/index.ts) | `NODETREE-001..003`, `NODETREE-STORYBOOK-002` | `model/snapshots/identity`: стабильный snapshot до записи, сохранение старого значения, live Store и portable document |
| External Store для дерева и отдельного Parameter | [createNodeTreeExternalStore](tree/shared/foundation.ts) | `NODETREE-002`, `NODETREE-STORYBOOK-003` | `parameters/subscriptions/scoped`: точные счётчики адресной/общей подписки и unsubscribe |
| Topology Store: initial / append-node / full | `getTopologySnapshot`, `getTopologyUpdate`, `subscribeTopology` в [foundation.ts](tree/shared/foundation.ts) | `NODETREE-STORYBOOK-004`: initial → append-node → full, value write не уведомляет topology | `changes/topology/append`: delta и точная область обновления; это headless evidence, не закрытие Nodes Layout gap |
| Reconcile, expectedRevision, сохранение Stores | `NodeTree.reconcile`, `NodeTreeRevisionConflictError` в [node-tree.ts](tree/model/node-tree/src/index.ts) | `NODETREE-TEMPLATE-007..008`, `NODETREE-STORYBOOK-004`: append/remove/no-op, отказ замене Store и stale revision | `changes/reconcile/identity`, `changes/reconcile/conflict`: уцелевший Store сохраняется |
| Delta и подписки на изменения | `subscribeDelta`, `NodeTreeDelta`, [diffNodeTreeDefinitions](tree/shared/foundation.ts) | `NODETREE-STORYBOOK-004`: точные added/removed/updated и Parameter event; no-op не публикуется | `changes/delta/entities`: добавление Node, изменение metadata, удаление Link и запись Parameter |
| Проекции: generation, cache, previous, stale result | `NodeTree.project`, `clearProjectionCache`, `StaleNodeTreeProjectionError`; [типы](tree/model/projection/src/index.ts) | `NODETREE-STORYBOOK-005`: cache/previous/clear, общий pending и stale rejection | `projections/cache/reuse`, `projections/generation/stale`: immutable generation и отказ старому async-результату |
| NodeTemplate и ссылка экземпляра | [типы](tree/model/node-tree/src/index.ts), [instantiateNodeTemplate](tree/shared/foundation.ts) | `NODETREE-TEMPLATE-001..003`, `NODETREE-STORYBOOK-006` | `templates/node/reference`: готовые ноды получают reference, отдельно переданные Stores сохраняются; defaults не материализуются |
| Graph Template и экземпляр Scope | [instantiateGraphTemplate](tree/shared/foundation.ts) | `NODETREE-TEMPLATE-006`, `NODETREE-STORYBOOK-006` | `templates/graph/reference`: subgraph Scope получает reference; функция не создаёт внутренний граф |
| Сохранение и восстановление текущего формата | [serializeNodeTreeDocument, hydrateNodeTree](tree/persistence/serialization/src/index.ts), [формат документа](tree/model/node-tree/src/document.ts) | `NODETREE-003`, `NODETREE-TEMPLATE-006`, `NODETREE-STORYBOOK-007` | `serialization/document/roundtrip`, `serialization/document/invalid`: v2, независимый Store, order/byId, неизвестный формат, scopes/groups/templates |
| Ограниченный JSON Patch | [applyJsonPatch, encodeJsonPointerToken, JsonPatchError, JSON_PATCH_LIMITS](tree/persistence/json-patch/src/index.ts) | `NODETREE-STORYBOOK-007`: четыре операции, escaping, immutable source, atomic test failure и operation limit | `serialization/json-patch/operations`, `serialization/json-patch/atomic-error`; move/copy не объявлены, все лимиты path/depth отдельно не покрыты |
| Освобождение lifecycle | `NodeTree.dispose`, unsubscribe в [node-tree.ts](tree/model/node-tree/src/index.ts) и [parameter.ts](tree/model/parameter/src/index.ts) | `NODETREE-STORYBOOK-002`, `…-003`, `NODETREE-STORYBOOK-MOUNT` | `model/lifecycle/dispose`: прекращение уведомлений, idempotent dispose, caller-owned Parameter остаётся жив, reconcile отклоняется |

`NODETREE-004` сохраняет headless и предметно-нейтральную границу пакета.
Документация модели не должна вводить зависимости на Nodes, Layout, UI или
Browser в production NodeTree.

Уточнение прежнего исследования: `instantiateNodeTemplate()` сохраняет переданный
Store, но canonical NodeTree запрещает использовать один Parameter сразу в двух
нодах дерева (`Parameter is shared by multiple Nodes`). Маршрут `…/store/shared`
называется «Единственный владелец Store» и показывает реальный отказ aliasing,
затем два независимых Store. Общая identity не является разрешённым способом
связать значения нескольких нод.

## Layout: алгоритмы и Worker

Все маршруты этой таблицы объявлены внутри `@nodes/layout`.
Существующие интеграционные примеры внутри Nodes остаются у Nodes.

| Публичная возможность | Реализация | Текущее evidence | Объявленные маршруты и сценарии |
| --- | --- | --- | --- |
| Fixed: source EAST / target WEST | [layoutFixed, resolveFixedLayoutGraph](layout/algorithms/fixed/src/index.ts) | `LAYOUT-001..002`, `LAYOUT-STORYBOOK-002..003`; два Nodes baseline mount | `algorithms/fixed/{baseline,down,compound,invalid}`: RIGHT/DOWN, containment, повторяемость, immutable input и конфликт ролей порта |
| Общий numeric protocol: compound nodes, порты, edges, options, bounds | [LayoutGraph, LayoutResult](layout/protocol/types/src/protocol.ts) | `LAYOUT-STORYBOOK-002..003` | `protocol/graph/compound`, `protocol/result/geometry`: числовые размеры, стороны и sections; viewport принадлежит входу |
| Adaptive: capability in/out/inout и allowedSides | [layoutAdaptive, layoutAdaptiveWithDiagnostics](layout/algorithms/adaptive/src/index.ts) | `LAYOUT-STORYBOOK-002..003`, четыре Nodes adaptive mount | `algorithms/adaptive/{shared,down,compound}`: один общий Socket, допустимые стороны и направление |
| Adaptive: bounded search, диагностика и witness ошибки | `ADAPTIVE_CANDIDATE_BUDGET`, `AdaptiveLayoutError` в [adaptive.ts](layout/algorithms/adaptive/src/index.ts) | `LAYOUT-STORYBOOK-002..003`: candidate budget, выбранные стороны, `PORT_HAS_NO_ALLOWED_SIDE` | `algorithms/adaptive/diagnostics`, `algorithms/adaptive/no-assignment` |
| TopDown: flat DAG, NORTH/SOUTH, цепочки cubic curves | [layoutTopDown](layout/algorithms/top-down/src/index.ts), [protocol](layout/protocol/types/src/top-down.ts) | `LAYOUT-STORYBOOK-002`, `…-004`, `LAYOUT-STORYBOOK-MOUNT`; NodeEditor-интеграции нет | `algorithms/top-down/baseline`, `algorithms/top-down/cycle`: стороны, связность cubic curves и typed cycle witness |
| Coffman–Graham: слои с ограничением ширины | [layoutCoffmanGraham](layout/algorithms/coffman-graham/src/index.ts), [protocol](layout/protocol/types/src/coffman-graham.ts) | `LAYOUT-STORYBOOK-002`, `…-004`: NORTH/SOUTH, curves, ограничение размера слоя; NodeEditor-интеграции нет | `algorithms/coffman-graham/{baseline,narrow,cycle}`: числовой result, ширина слоя и witness |
| Fixed Worker client/executor | [client](layout/algorithms/fixed/src/worker/client.ts), [executor](layout/algorithms/fixed/src/worker/executor.ts) | `LAYOUT-003..004`, `LAYOUT-STORYBOOK-WORKER` Fixed; browser equivalence ready/presented | `workers/fixed/{equivalence,failure}`: отдельный Worker, direct/result equality, generation и сериализованный отказ |
| Adaptive Worker client/executor | [client](layout/algorithms/adaptive/src/worker/client.ts), [executor](layout/algorithms/adaptive/src/worker/executor.ts) | `LAYOUT-STORYBOOK-WORKER` Adaptive; browser equivalence ready/presented | `workers/adaptive/{equivalence,failure}`: result, diagnostics equality и serialized witness |
| TopDown Worker client/executor | [client](layout/algorithms/top-down/src/worker/client.ts), [executor](layout/algorithms/top-down/src/worker/executor.ts) | `LAYOUT-STORYBOOK-WORKER` TopDown; browser equivalence ready/presented | `workers/top-down/{equivalence,failure}`: result и cycle error |
| Coffman–Graham Worker client/executor | [client](layout/algorithms/coffman-graham/src/worker/client.ts), [executor](layout/algorithms/coffman-graham/src/worker/executor.ts) | `LAYOUT-STORYBOOK-WORKER` Coffman–Graham; browser equivalence ready/presented | `workers/coffman-graham/{equivalence,failure}`: result и cycle error |
| Общий transport: pending requests, cancelBefore, dispose, ошибки | [WorkerTransportClient, WorkerRemoteError](layout/execution/worker/src/transport.ts), [envelope types](layout/execution/worker/src/types/worker.ts) | `LAYOUT-STORYBOOK-TRANSPORT`: generation, cancel/dispose настоящего Worker; fault injection явно обозначен test double | `workers/transport/lifecycle`, `…/faults`: request IDs, mismatch, remote/error events, postMessage failure, terminate и listener cleanup |

Текущие tests: [contract.test.ts](layout/tests/contract.test.ts),
[package-boundary.test.ts](layout/tests/package-boundary.test.ts),
[storybook.test.ts](layout/tests/storybook.test.ts),
[storybook-mount.test.ts](layout/tests/storybook-mount.test.ts).
Исторические `LAYOUT-001..004` относятся к Fixed; новое evidence остальных
алгоритмов и Worker приведено отдельно. `LAYOUT-STATIC-001` запрещает старые
dev-only CSS exports, поэтому новый каталог не восстанавливает их в production.

TopDown и Coffman–Graham доступны как числовые алгоритмы, но текущий
[NodeTreeProps.layout](view/tree.ts) принимает `LayoutResult` с WEST/EAST.
Публичный [SocketSide](socket.tsx) содержит только `left`/`right`.
Хотя отдельный Link уже умеет cubic routes, этого недостаточно для полной
интеграции алгоритмов с NORTH/SOUTH: согласно [PROJECT](../PROJECT.md), нужен
самостоятельный production-договор Nodes для портов и проекции результата.
Объявленные страницы алгоритмов показывают реальные числовые результаты;
рисунок, обходящий NodeEditor, не считается закрытием этой интеграции.

## NodeType: отсутствующее поведение отдельным блоком

Минимальный проект API и два конкретных сценария описаны в
[NodeType: договор типа и экземпляра](tree/node-type.md).
Это отдельный проект договора; каталог и production API он не добавляет.

`NodeValueType` описывает тип значения, `SocketKind` — визуальный preset,
`NodeTemplate` — identity/version/kind/metadata. Ни одно из них сейчас не
описывает состав нового типа ноды. `instantiateNodeTemplate` получает уже
собранные Parameters/Sockets и сохраняет переданные Stores. Поэтому NodeType
нельзя объявить выполненным существующим примером template reference.
Прошедшие `NODETREE-TEMPLATE-001`–`NODETREE-TEMPLATE-008` закрепляют только эту
основу: два независимо переданных Store не доказывают создание двух экземпляров
из одной декларации defaults, а generic v2 hydrate не доказывает type-aware restore.

| Необходимое поведение | Предлагаемый владелец | Текущая опора / пробел | План сценария после реализации |
| --- | --- | --- | --- |
| Декларация типа и defaults → экземпляр | NodeTree | Основа проверена `NODETREE-TEMPLATE-001`, `NODETREE-TEMPLATE-002`; материализации из декларации нет | `nodetree: node-types/instances/independent`: один тип, два экземпляра, независимые Stores |
| Тип → production TSX-представление | Nodes | `nodeViews` принимает импортированный компонент по ID ноды; выбор из предметного типа делает приложение | `nodes: node-types/presentation/extension`: второй тип с другой композицией через публичное расширение |
| Изменение состава типа/режима | NodeTree; отображение Nodes | Reconcile/no-op/conflict проверены `NODETREE-TEMPLATE-007`, `NODETREE-TEMPLATE-008`; декларации состава и правил смены режима нет | `nodetree: node-types/structure/change`, `nodes: node-types/structure/change`: уцелевшие Parameters и Links сохраняют identity |
| Восстановление и версии типа | NodeTree | Template versions и typed v2 проверены `NODETREE-TEMPLATE-003`, `NODETREE-TEMPLATE-006`; type-aware resolver и миграции типа отсутствуют | `nodetree: node-types/serialization/roundtrip`, `…/unknown-type`, `…/version` |
| Тип подграфа и интерфейс входов/выходов | NodeTree; отображение Nodes | GraphScope/reference проверены `NODETREE-TEMPLATE-006`; они не материализуют тело подграфа | `nodetree: node-types/subgraph/instances` после отдельного договора |
| Конфигурация / Property / Parameter | Договор NodeType | [Первый срез](tree/node-type.md) предлагает фиксированный состав; решение о динамической конфигурации ещё требуется | Сначала конкретный пример конфигурации, затем адресный сценарий изменения; второй Store не вводится |
| Числовая геометрия нестандартного Field | Template; потребители UI/Nodes | [PROJECT](../PROJECT.md) фиксирует отсутствующий generic compiled numeric plan | Отдельный срез платформенного владельца; ручная парная реализация Field + Layout не закрывает расширяемость |

Эта таблица фиксирует требования к покрытию и границы владельцев. Она не
утверждает API реестров и не превращает будущие маршруты в существующие истории.

## Условие завершения наполнения

Исходная гонка и белые кнопки историй исправлены. Полное закрытие всех
возможностей Nodes не заявлено: остаётся отдельный договор несвязанных портов
и не весь browser-набор взаимодействий пройден. Полный обход начального показа
314 вариантов и финальный NodeTree check завершены.
NodeType и интеграция вертикальных Layout требуют отдельных реализационных
срезов, перечисленных выше.

1. Каждый публичный предмет этой матрицы либо имеет работающий маршрут,
   либо явно остаётся в списке подтверждённых пробелов с владельцем и repro.
2. Исходные шесть маршрутов сохранены; package/category/subject/variant
   открываются, общий обзор использует те же реальные истории.
3. Проверены взаимодействия, изменения Store и cleanup; число элементов
   при mount и успешный typecheck не заменяют эти проверки.
4. Визуальный результат проверен в едином Experience через Storybook MCP;
   у числовых алгоритмов и Worker показаны настоящие входы, результаты и ошибки.
5. Coverage пересмотрено по публичным exports и фактическим assertions:
   новые возможности не скрыты в одном layout-примере и не обозначены готовыми
   на основании одной компиляции.


Пакет `@nodes/node` владеет DiagramNode, ParameterNode и ContentNode и их каталогом.
Новые проверки `NODE-COMPOSITION-001..004` и `NODES-COMPOSITION-GRAPH` подтверждают
независимое сворачивание, сохранение содержимого и сокетов, совпадение их геометрии
и смешанный граф. Прежние маршруты `components/node/*` перенесены в этот пакет.
