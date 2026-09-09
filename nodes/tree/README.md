# Дерево нодов

`@nodes/tree` владеет живой моделью графа: Node, Socket, Link, Frame,
Parameter Store, областями графа, группами, ссылками шаблонов, изменениями,
проекциями и переносимым документом. Модель работает без DOM, Layout и Renderer.
Визуальное представление модели принадлежит `@webxr/nodes`.

## Модель и значения

```typescript
import {Parameter, createNodeTree} from "@nodes/tree"

const value = new Parameter("value", 1)
const tree = createNodeTree({
  nodes: [{id: "source", parameters: [value]}],
})
const unsubscribe = tree.subscribe(change => console.log(change))

value.set(2)
value.set(2) // no-op: revision и подписчики не меняются

unsubscribe()
tree.dispose()
```

Store сохраняет переданную identity Parameter. Значения и presentation metadata
копируются в deeply frozen JSON. Каждый Parameter Store принадлежит ровно одной
ноде дерева. Попытка передать один Store нескольким нодам отклоняется при создании
дерева; отдельные Stores сохраняют независимость.

`getSnapshot()` возвращает стабильный снимок текущей revision; старый снимок
сохраняет прошлые значения. `definition()` содержит живые Stores. `document()`
возвращает сериализуемые `order`/`byId` без подписок и проекций.

## Каталог исполняемых сценариев

Каждый вариант вызывает публичный API, показывает вход и фактический результат.
Кнопка «Повторить сценарий» заново выполняет последовательность. Ожидаемые ошибки
показываются как результаты реального отказа API. Исходный fixture и проверки
связаны с вариантом через ресурсы каталога.

| Категория | Предметы и сценарии |
| --- | --- |
| Модель | Топология и endpoint; вложенные Scope; группы и Frame; снимки; dispose |
| Параметры | set/revision/no-op; единственный владелец и независимые Stores; владение JSON; тип и валидация; адресные подписки |
| Изменения | Initial/append/full; reconcile с сохранением Stores; конфликт revision; added/removed/updated и Parameter delta |
| Проекции | Кэш, previous и очистка; единственный pending на поколение; stale async-результат |
| Шаблоны и экземпляры | Ссылка готовой ноды на NodeTemplate; ссылка Scope на graph template |
| Сохранение | Typed v2 round trip; неверный формат и order/byId; add/replace/remove/test; атомарный отказ и лимиты JSON Patch |
| Валидация | Parameter/Socket equality и Link compatibility; allow/acyclic; направления, endpoints, повтор ID и неизвестная Frame |

Декларации находятся в [каталоге](.storybook/catalog.json), исполняемые
последовательности — в [scenarios.ts](.storybook/stories/scenarios.ts).
Просмотр использует HTML-like TSX в Document, переданном Storybook. Этот
development-only слой не входит в public exports и production-зависимости.

## Шаблоны и NodeType

Существующий `NodeTemplate` содержит `id`, `version`, `kind`, `metadata`.
`instantiateNodeTemplate()` добавляет reference уже собранной ноде и сохраняет
переданные Parameter Stores. `instantiateGraphTemplate()` добавляет reference
Scope и не создаёт тело подграфа. Поэтому шаблон нельзя выдавать за декларацию
состава NodeType или фабрику значений из defaults.

[Договор NodeType](./node-type.md) пока является проектом. Его будущие scenarios
отмечены в [матрице покрытия](../storybook-coverage.md). Каталог показывает
существующие API, а не имитирует ещё отсутствующую материализацию типов.

## Проверки и границы

- [Базовый контракт](./tests/contract.test.ts): identity, внешние Stores, сохранение
  и отсутствие графических зависимостей в production.
- [Основа шаблонов](./tests/template-foundation.test.ts): typed Stores, references,
  round trip и сохранение identity при reconcile.
- [Исполняемые истории](./tests/storybook-model.test.ts): соответствие деклараций,
  наличие ресурсов и ожидаемые результаты каждой группы сценариев.
- [Compiled mount](./tests/storybook-mount.test.ts): все варианты компилируются,
  используют Document host, повторяются по нажатию и освобождают lifecycle.

Визуальное качество Storybook проверяется отдельно через его общий Experience.
Прохождение headless-тестов не является доказательством корректного layout или
paint отображаемого примера.
