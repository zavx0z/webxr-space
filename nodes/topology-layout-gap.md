# Согласованная модель и раскладка

Исходная гонка исправлена 8 сентября 2026 в `@webxr/nodes`.
`NODES-CATALOG-006` проходит с прежними ожиданиями новой ноды и сохранения Element.

## Передача геометрии

GraphView и GraphEditor используют одну принятую пару snapshot/layout.
Подписки читают её состояние, а геометрия строится во время render из этой пары.
Начальный Fit и кнопка «Вписать» используют ту же геометрию.

Существующий `layout={result}` сохраняется: новый immutable LayoutResult
связывается с текущей моделью. Для структурного изменения родитель передаёт
следующий результат. Заранее рассчитанный superset по-прежнему допускает append,
если прежние Nodes/Frames/Links неизменны и все новые Node/порты уже имеют
геометрию. ID индексируются один раз.

Если прежняя геометрия не покрывает изменение, наступает pending.
`data-layout-pending="true"` и `aria-busy="true"` обозначают ожидание;
сцена скрыта и не принимает ввод. Прежние компоненты сохраняются.
Все callbacks также проверяют активный input и исходную topology, включая
случай поздней доставки старого результата после нового.
Готовая пара возвращает сцену без remount уцелевших Nodes, input и Store.

Последняя принятая презентация сохраняется после commit. Ошибка подготовки
новой geometry не заменяет её незакоммиченным render.
Прежний pending input нельзя мутировать на месте и выдавать за новый результат.

## Асинхронный расчёт

`createNodeTreeLayout` из `@webxr/nodes/view/tree` захватывает snapshot
до вызова владельца числовой раскладки:

```ts
try {
  const layout = await createNodeTreeLayout(store, snapshot =>
    computeLayout(snapshot)
  )
  publishLayout(layout)
} catch (error) {
  if (!(error instanceof StaleNodeTreeLayoutError)) throw error
}
```

`publishLayout` — обычная передача в prop `layout` NodeTree или NodeEditor.
`computeLayout` выбирает приложение: это может быть Layout или Worker.
Nodes не выбирает алгоритм и не создаёт второй NodeTree.

`NodeTreeLayout` содержит snapshot и проверенную, скопированную immutable
geometry. Runtime привязывает результат к тому же Store. Самодельный объект
и результат другого Store отвергаются.

Изменение topology **или значения** во время вычисления отвергает результат
через `StaleNodeTreeLayoutError`. Уже принятая bound-пара также становится
pending при изменении исходного snapshot: геометрия может зависеть от значений,
например размера Matrix. Raw LayoutResult сохраняет topology-only подписку.

Гарантия относится к актуальности источника. Параллельные вычисления одного
неизменившегося snapshot для разных viewport/context не упорядочиваются этой
функцией. Выбор актуального контекста и отмена Worker принадлежат приложению.
Существующий `NodeTree.project(...cacheKey...)` также остаётся доступен.

Для connected Socket используется публичный `socketKey(nodeId, socketId)`.
`nodeSocketLayoutPortId` обозначает порт Layout и имеет другую область.

## Проверки

[layout-coherence.test.ts](tests/layout-coherence.test.ts) покрывает:

- append/remove в GraphView и GraphEditor, Element/input/Parameter identity и Fit;
- async B→A с отбрасыванием A, смену value revision;
- pending input/selection/Fit, remove+add адреса с новым Parameter;
- позднюю доставку уже готового старого результата и возобновление нового;
- неверную текущую geometry, precomputed append, чужие/поддельные результаты;
- Link add/remove при сохраняющейся параллельной связи.

[Исходная регрессия](tests/storybook-components.test.ts) сохраняется как
`NODES-CATALOG-006`. [Пример](.storybook/stories/compiled/component-stories.tsx)
`components/node-tree/topology` показывает рабочее добавление ноды.

## Отдельное ограничение несвязанных портов

[Fixed](layout/algorithms/fixed/src/index.ts) и [Adaptive](layout/algorithms/adaptive/src/index.ts) исключают
порты, не участвующие ни в одном Link. [Nodes](shared/projection/geometry.ts)
пока требует геометрию каждого объявленного Socket. Поэтому удаление
**последнего** Link при сохранении Socket может дать
`Layout Port geometry is missing: source/out`.

Это воспроизводится новым расчётом графа с Socket и пустым `edges`, затем
передачей результата в Nodes. Это отдельное расхождение договора, не гонка.
В текущих тестах удаления используются граф без Socket либо сохраняющийся
параллельный Link; приёмка всех произвольных несвязанных портов не заявлена.

Layout, Component, Renderer, DOM, Template и Engine для исправления гонки
не изменялись. Управляющие белые кнопки историй заменены штатными UI Button.
