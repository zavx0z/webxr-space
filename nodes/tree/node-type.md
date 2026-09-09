# NodeType: договор типа и экземпляра

Статус: проект договора для первого среза NodeType, 7 сентября 2026.
Декларации и операции ниже ещё не являются production API. Проверенная основа
отдельно закреплена в [template-foundation.test.ts](./tests/template-foundation.test.ts).
Полный план показа находится в [матрице Storybook](../storybook-coverage.md).

## Назначение и владельцы

NodeType описывает переиспользуемый вид одной ноды. Экземпляр хранит конкретные
Parameter Store и развёрнутые Socket; его значения изменяются независимо от
других экземпляров того же типа. Тип позволяет создавать и проверять этот
состав по одному описанию.

| Ответственность | Владелец |
| --- | --- |
| Декларация типа, создание экземпляров и проверка их структуры | `@nodes/tree` |
| Значения, revisions, подписки, topology и сериализация | Существующие `Parameter` и `NodeTree` |
| Production TSX-представление ноды, сокетов и параметров | `@webxr/nodes`, `@nodes/sockets`, `@nodes/parameters` |
| Универсальные поля и их взаимодействия | `@zavx0z/ui` |
| Связь прикладного типа с прикладным компонентом | Приложение через публичную точку расширения Nodes |
| Раскладка по готовой числовой геометрии | `@nodes/layout` |
| Геометрия произвольного компонента из его TSX/CSS | `@zavx0z/template`, согласно [PROJECT](../../PROJECT.md#долгосрочная-цель-сборки-tsx) |

NodeType не выполняет вычисления графа. Семантика предметных операций остаётся
у приложения. Тип не хранит Store, listeners, component functions или Renderer.

## Существующая основа

В [node-tree.ts](./model/node-tree/src/index.ts) уже есть:

```ts
type NodeTemplate = Readonly<{
  id: string
  version: number
  kind: "node" | "graph"
  metadata?: NodeJsonValue
}>

type NodeInstanceReference = Readonly<{
  id: string
  templateId: string
  templateVersion: number
  localId: string
}>
```

`instantiateNodeTemplate()` получает уже собранную Node и сохраняет переданные
Parameter Store. Независимые значения из декларации он не создаёт.
`hydrateNodeTree()` восстанавливает развёрнутый документ без каталога типов.
При добавлении в NodeTree один Parameter Store может принадлежать только одной
ноде. Повторное использование того же объекта в другой Node отвергается до
публикации дерева; сохранение ссылки в helper не отменяет эту проверку.

Проверенные ограничения текущего состояния:

- В одном дереве допускается одна версия каждого `template.id`.
- `Parameter.id`, `presentation` и `valueType` неизменяемы; изменяются
  `value` и `revision`.
- `reconcile()` сохраняет точный объект Store для уцелевшего
  `(nodeId, parameterId)`.
- `NodeValueType` обозначает тип значения. `SocketKind` обозначает визуальный
  вид endpoint. Эти понятия имеют собственные обязанности.
- `GraphScope`, `NodeGroup` и `Frame` описывают соответственно область графа,
  логическую группу и рамку. Graph-template создаёт scope, но не разворачивает
  содержимое подграфа.

## Предлагаемые решения первого среза

### Идентичность

Использовать существующую `NodeTemplate` с `kind: "node"` как единственную
сохраняемую идентичность NodeType. NodeType расширяет её структурной декларацией;
экземпляр использует существующий `Node.instance`. Дополнительного `typeId`
в Node и новой версии документа только ради этой ссылки не требуется.

Здесь NodeTemplate не получает дополнительный смысл пользовательского preset.
Если появится отдельная потребность в preset из значений или сборке нескольких
типов, она потребует своего договора. Graph-template остаётся отдельным
существующим механизмом.

### Структура и значения

Декларация задаёт упорядоченные Parameters и Sockets. ID локален внутри ноды
и сохраняет смысл независимо от позиции в массиве. Каждый новый экземпляр
получает собственные Store и собственные копии начальных JSON-значений.
Parameter IDs уникальны среди Parameters ноды, Socket IDs — среди её Sockets.
Одинаковый ID у Parameter и Socket допустим: это разные области идентичности.

Связанный Socket ссылается на `parameterId`: его `valueType` выводится из
декларации Parameter. Самостоятельный Socket задаёт `valueType` непосредственно.
Так одно авторское описание типа значения не дублируется в двух местах.

Для первого среза обязательный валидатор передаётся явно и применяется как к
defaults и overrides, так и к последующим `Parameter.set()`. Существующая
`NodeValueType {id, version}` сама по себе не содержит runtime-валидатор.

### Property и конфигурация

В первой версии тип имеет фиксированную структуру. Отдельная сущность Property,
новый value Store или массовое преобразование исторических Properties в
Parameters в этот договор не входят.

Наблюдаемое значение уже может быть Parameter без Socket. Это возможность
существующей модели, а не определение всех Properties. Значения, которые меняют
декларацию ноды, рассматриваются в следующем срезе вместе с атомарной операцией
изменения topology. Первый API не получает `compose(config)` без такого договора.

### Публичная форма

Предлагаемая TypeScript-форма использует существующие типы пакета. Это описание
будущего API; исполняемые fixtures пока используют текущие production API.

```ts
type ParameterDeclaration = Readonly<{
  id: string
  defaultValue: NodeJsonValue
  valueType: NodeValueType
  presentation?: NodeJsonValue
}>

type SocketDeclaration = Readonly<{
  id: string
  direction: SocketDirection
  side?: SocketSide
  metadata?: NodeJsonValue
}> & (
  | Readonly<{
      parameterId: string
      valueType?: never
    }>
  | Readonly<{
      parameterId?: never
      valueType: NodeValueType
    }>
)

type NodeType = Readonly<{
  template: NodeTemplate & Readonly<{kind: "node"}>
  parameters: readonly ParameterDeclaration[]
  sockets: readonly SocketDeclaration[]
}>

type NodeTypeInstantiation = Readonly<{
  id: string
  instance: TemplateInstanceIdentity
  initialValues?: Readonly<Record<string, NodeJsonValue>>
  frameId?: string
  scopeId?: string
  groupId?: string
  metadata?: NodeJsonValue
}>

declare function instantiateNodeType(
  type: NodeType,
  input: NodeTypeInstantiation,
  validate: NonNullable<FoundationNodeTreeOptions["validateParameterValue"]>,
): Node<Parameter<NodeJsonValue, NodeJsonValue>>
```

Первый срез принимает декларацию непосредственно. Глобальный изменяемый реестр
не является обязательной частью этой операции. Приложение может хранить свой
неизменяемый каталог и разрешать точные `templateId/templateVersion`.

До создания Store проверяются duplicate IDs, неизвестные initialValues,
`parameterId` без декларации, некорректные типы/defaults/overrides и существующие
правила направлений/сторон. `null` и отсутствие override различаются.
Порядок деклараций сохраняется. Ошибка не публикует частично созданную Node.

## Два конкретных примера

### Числовое значение

Тип `example/number-source@1` содержит Parameter `value` с default `0` и
типом значения `float@1`; Socket `out` направлен вправо и ссылается на `value`.

Создаются экземпляры `source-a` и `source-b`. Для A начальное значение равно
`2`, для B используется default. Изменение A на `7` оставляет B равным `0`
и не уведомляет подписчиков его Parameter. У обоих одинаковая template identity,
но разные instance identity и Store.

История проходит полный путь: описание → создание → NodeTree → production
NodeEditor → ввод → сохранение → восстановление. Вычисление значения из Link
этот пример не предполагает.

### Пара чисел

Тип `example/number-pair@1` содержит `first` и `second`, defaults `0` и `1`,
Sockets `first-out → first` и `second-out → second`. В фиксированном составе
проверяются два адресуемых значения и две независимые связи.

Его обычный показ использует существующие production Parameters. Отдельный
вариант должен выбрать прикладной компонент с другой композицией через общий
NodeEditor. Два типа с разным числом стандартных строк доказывают модельный
каталог, но ещё не доказывают расширение компонентами.

Произвольное расположение полей допустимо после получения числовой геометрии
из той же TSX-реализации. Ручной двойник `Component + Layout` и измерение DOM
после отрисовки не закрывают эту приёмку.

## Представление и восстановление

Nodes получает явный способ разрешить сохранённую type identity в production
компонент. Приложение владеет связыванием типа с импортированным компонентом.
Точная сигнатура этого способа должна учитывать общий compiled geometry contract;
первый headless срез её существование не имитирует.

Компонент работает с существующим Store экземпляра. Standard Node остаётся
production-владельцем своего обычного представления. Ноды без NodeType остаются
допустимыми для действующих проекций потребителей.

Сохранение содержит развёрнутые значения, Parameters/Sockets и instance reference.
Generic hydration продолжает читать этот документ без прикладного кода.
JSON сохраняет идентичность типа значения, но не runtime-валидатор.
Без `options.validateParameterValue` generic hydration создаёт обычные Parameter;
проверка последующих `set()` исходного экземпляра сама не восстанавливается.
Type-aware восстановление заново получает валидатор от приложения.
Type-aware создание и редактирование явно отказывают при неизвестном типе
или несовместимом составе; они не выбирают похожий тип и не восстанавливают
потерянное значение из default молча.

Типизированная проверка документа требует отдельной операции: существующий
`hydrateNodeTree()` проверяет generic model, но не структурную NodeType declaration.
Миграция версий не входит в первый API. Текущее ограничение одной версии
`template.id` сохраняется до отдельной поведенчески проверенной смены договора.

## Изменение структуры: следующий срез

Изменение конфигурации готовит полную следующую definition до публикации.
Уцелевшие Parameters сохраняют точные Store; Socket/Link сохраняют идентификаторы.
Defaults применяются только к новым Parameters. No-op сохраняет revisions.

Предлагаемая начальная политика удаления связанного Socket — отказ с указанием
затронутых Links. Приложение может отдельно передать явное удаление этих Links
в той же операции. Автоматического reconnect по позиции или похожему имени нет.

Потребуется отдельно доказать:

- отсутствие промежуточного состояния между config value и topology;
- отказ по stale `expectedRevision` до изменения модели;
- согласованное уведомление подписчиков после успешной операции;
- правила возврата временно удалённых Parameters и их значений;
- миграцию `valueType` или неизменяемой presentation у прежнего ID.

`Parameter.set()` с последующим `reconcile()` не доказывают атомарность такой
операции. Текущая проверка surviving Store также запрещает заменить Parameter
новым объектом под прежним ID ради обновления его presentation.

## Проверяемая приёмка

| ID | Результат | Текущее evidence / статус |
| --- | --- | --- |
| NT-01 | Известная template identity и точный Parameter Store сохраняются | `NODETREE-TEMPLATE-001` |
| NT-02 | Две явно созданные независимые Store не влияют друг на друга | `NODETREE-TEMPLATE-002`; автоматическое создание из декларации ещё требуется |
| NT-03 | Неизвестная версия и две версии одного template.id отвергаются | `NODETREE-TEMPLATE-003` |
| NT-04 | Runtime validation действует после создания Parameter | `NODETREE-TEMPLATE-004` |
| NT-05 | Типы связанного Parameter/Socket и Link согласованы | `NODETREE-TEMPLATE-005` |
| NT-06 | v2 round trip сохраняет templates/instances/scopes/groups и значения | `NODETREE-TEMPLATE-006` |
| NT-07 | Reconcile сохраняет уцелевшие Store; no-op и отказ не публикуют изменения | `NODETREE-TEMPLATE-007`, `NODETREE-TEMPLATE-008` |
| NT-08 | Defaults, overrides и declaration errors проверяются до публикации Node | Будущий NodeType production test |
| NT-09 | Второй и третий прикладной тип подключаются через публичный договор | Будущий NodeType и Nodes integration test |
| NT-10 | Другая TSX-композиция имеет точную числовую геометрию из того же компонента | Generic Template capability и Nodes integration; не заявлено выполненным |
| NT-11 | Type-aware round trip проверяет сохранённую структуру и неизвестные типы | Будущая структурная проверка; generic hydrate её не заменяет |
| NT-12 | Изменяемая структура атомарна и сохраняет surviving identities/Links | Следующий NodeType/NodeTree срез |

Тесты текущей основы не названы реализацией NodeType. Storybook будет показывать
их как templates/instances/value types до появления новых production операций.

## Источники решений

- [Исследование и требования NodeType](codex://threads/01a03d8c-ba85-7b52-bbf1-e6bfe4214676):
  требование типа/экземпляра, компонентного расширения и одной реализации;
  прошлые registry остаются предложениями.
- [Актуальное исследование Storybook](codex://threads/01a07cdb-80f5-73a1-a300-98d3756b4688):
  inventory, ограничения и согласованный порядок срезов.
- [Parameter](./model/parameter/src/index.ts), [NodeTree](./model/node-tree/src/index.ts), [foundation](./shared/foundation.ts),
  [serialization](./persistence/serialization/src/index.ts), [Nodes projection](../node-tree/src/node-tree.tsx).
