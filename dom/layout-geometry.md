# Локальное измерение до показа

DOM предоставляет дробную геометрию для любого компонента текущего Document.
HTML Renderer вычисляет её из существующего CPU layout; Browser доставляет
наблюдения перед рисованием общего кадра. Graph, Nodes и числовой Layout
не являются частью этой платформенной реализации.

## Публичный договор

```ts
import {observeElementLayout, readElementLayoutRect} from "@zavx0z/dom/geometry"

const rect = element.getLayoutRect(relativeTo)
const same = readElementLayoutRect(element, relativeTo)
const stop = observeElementLayout(element, rect => {
  // rect содержит актуальные числа либо null при отсутствии геометрии.
}, {relativeTo})
```

Авторский JSX обязан использовать браузерные глобальные `Element`, `HTMLElement`
и конкретные `HTML*Element` из `lib.dom`. Он не импортирует DOM implementation
classes для props/refs и не приводит refs через `unknown` к semantic типам.
Обычный `useRef<HTMLElement | null>` напрямую подходит для method, helper и
observer, включая `relativeTo`. Проверки `instanceof` в компонентах не нужны.
Template mapping обычных HTML tags сохраняет `HTMLElementTagNameMap` браузера.

Централизованное расширение `declare global interface Element` находится в
[geometry.ts](geometry.ts), у владельца DOM, и подключается при импорте DOM или
geometry API. Оно добавляет только `getLayoutRect`; существующие браузерные типы
не копируются. `ElementGeometryTarget` на входе helper позволяет использовать
как авторский глобальный тип, так и semantic Element инфраструктуры, без второй
авторской системы типов. Внутри того же модуля `requireGeometryElement` проверяет
реальный semantic Element до чтения его полей или обращения к provider.

Расширение действует в авторском профиле WebXR: правильно типизированный ref
этого профиля в runtime получает semantic Element текущего Experience. Это не
установка метода в настоящий native DOM: `window.document` и его prototypes
не меняются. Переданный в helper настоящий native Element или поддельный объект
отклоняется с TypeError. Для native страницы сохраняется её обычный DOM API.

Метод и функция возвращают `DOMRectReadOnly | null`, структурно совместимый
с браузерным `DOMRectReadOnly`; автору не нужен импорт implementation type.
Аргумент `relativeTo` и объект options необязательны.

- `width`/`height` — объединение border-box фрагментов, включая padding и border,
  без margin, shadow и clipping. Единица — CSS px, точность — JavaScript number,
  без целочисленного округления и округления по DPR. Для одиночного бокса
  возвращаются исходные width/height layout: дробное перемещение не меняет
  размер из-за вычисления `(x + width) - x`.
- `x`/`y` — координаты до применения CSS transforms и Browser projection
  относительно локального viewport текущего projection root. Прокрутка входит
  в координаты. При `relativeTo` вычитается левый верхний угол его border-box;
  общий scroll предка поэтому сокращается. Внутренний scroll между элементами
  остаётся видимым в результате.
- Transforms и пространственная камера не масштабируют эти числа. Изменение
  самого CSS containing block или layout constraints может менять раскладку
  даже при изменении transform — обычная семантика CSS сохраняется.
- `null` означает detached, отсутствие готового geometry provider или layout
  бокса, в том числе `display:none`. Настоящий бокс нулевого размера возвращает
  прямоугольник. `visibility:hidden` сохраняет размеры, исключая собственный
  paint и hit; потомок с явным `visibility:visible` может быть видимым.
- `relativeTo` из другого Document вызывает TypeError. Разные активные
  projection owners вызывают Error: вычитать несвязанные координаты нельзя.
  Если один из боксов ещё недоступен, результат равен null.
- Каждый результат независим от следующих чтений. Изменять его размеры нельзя.
  `getBoundingClientRect()` сохраняет свою viewport-relative семантику с
  transforms и пространственной проекцией.

Это явное расширение WebXR DOM, а не заявление поддержки стандартного метода
с таким именем. [CSSOM View offsetWidth](https://drafts.csswg.org/cssom-view/#dom-htmlelement-offsetwidth)
имеет тип `long` и не сохраняет дробную геометрию.
[Resize Observer](https://drafts.csswg.org/resize-observer/#resize-observer-entry-interface)
предоставляет наблюдаемые размеры, но не синхронное чтение позиции относительно
другого элемента. Здесь не реализуется полная совместимость ResizeObserver
или GeometryUtils/getBoxQuads.

## Актуальность и lifecycle

Чтение синхронно обновляет dirty CPU layout. Оно использует те же caches,
stylesheet revisions и invalidation, что следующий render; отдельного расчёта
размеров или GPU submission нет. Текст, стили, CSS font selection, custom
properties, ограничения ширины, viewport и same-Document reparent учитываются
следующим чтением. Изменяемый внешний источник метрик должен вызвать
существующий `DocumentRenderer.invalidate(root)`; чтение не обнаруживает
произвольное изменение стороннего объекта само по себе. Browser начинает
работать с уже загруженными font/fontFaces и готовыми stylesheet links.

`observeElementLayout` устанавливается из существующего `useLayoutEffect`
после присоединения refs и возвращает идемпотентную отписку для cleanup.
Первый `useLayoutEffect` в Browser выполняется до готовности provider: прямое
чтение там может дать null. Подписка переживает этот этап и получает первое
наблюдение после подключения текущих проекций, до первого GPU submission.

В каждом общем кадре Browser:

1. Синхронизирует проекции, viewport и обычные `useFrame` callbacks.
2. Завершает накопленные обновления component root и синхронизирует проекции.
3. Читает все наблюдаемые рамки, затем доставляет callbacks вне расчёта layout.
4. После callbacks делает component flush и повторяет наблюдение до стабильности.
5. Передаёт готовое представление в GPU.

Новый hook не требуется. Callback может читать геометрию и синхронно менять
состояние: изменения применяются до показа. Асинхронный расчёт кадр не задерживает:
компонент сохраняет `visibility:hidden` до принятия собственного результата.
Платформа не принимает решения о generation/cancellation результата потребителя.

Callback повторяется при изменении `x/y/width/height`, доступности или geometry
owner. При равной итоговой рамке смена текста/темы сама по себе не вызывает его.
Размер дочернего элемента нужно наблюдать отдельно, если рамка родителя не
меняется. Пространственный pan/zoom без изменения CSS layout повторных
измерительных callbacks не вызывает. Новая подписка запрашивает существующий
общий frame loop; собственного RAF или второго Document нет.

Рекурсивная доставка запрещена. Более 32 изменяющих geometry проходов одного
кадра завершаются ошибкой до GPU submission, чтобы бесконечная обратная связь
не показывала промежуточный результат. Это договор WebXR, не алгоритм loop
handling стандартного ResizeObserver.

Headless host сам вызывает `flushDocumentLayoutObservers(document)` и завершает
свои component updates перед следующим проходом. Browser делает это автоматически.
`registerDocumentGeometryReader` принимает дополнительный layout reader и
освобождается при Renderer dispose. Наблюдение принадлежит компоненту и снимается
его cleanup, а не dispose отдельной проекции: это сохраняет подписку при reparent.

## Поведенческие доказательства

В актуальном checkout нет owner `support.json`, generated capability matrix или
отдельного capability workflow для этих пакетов. Доказательства привязаны к
исходникам и устойчивым идентификаторам тестов; они не означают полную CSS coverage.

| Договор | Проверка |
| --- | --- |
| `DOM-LAYOUT-RECT-001/002/003/004` | [DOM](tests/layout-geometry.test.ts): дроби, null, ownership, snapshot, подписка до provider, cleanup, проверка runtime входа и защита от рекурсии |
| `RENDERER-LAYOUT-RECT-001/002/003/004` | [HTML Renderer](../renderer/html/tests/layout-rect.test.ts): flex/text/padding/border/font/constraints, transforms, projection, cache, scroll, reparent |
| `RENDERER-LAYOUT-VISIBILITY-001` | [HTML Renderer](../renderer/html/tests/layout-rect.test.ts): hidden сохраняет layout, убирает paint/hit, visible descendant override |
| `BRW-LAYOUT-RECT-001` | [Browser](../browser/tests/layout-measurement.test.ts) и [compiled TSX](../browser/tests/layout-measurement.fixture.tsx): обычные native-typed refs без cast, HUD/Display providers, загруженный шрифт, первый кадр, async pending, state flush и отсутствие submission при чтении |

Проверки Browser подменяют GPU submission, native input host и scheduling,
сохраняя настоящий HTML Renderer, backend, проекции и component lifecycle.
Они доказывают порядок и содержимое кадра, но не визуальную приёмку GraphView
или Mermaid в Storybook.
