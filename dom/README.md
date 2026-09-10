# DOM

`@zavx0z/dom` — семантическая модель документа WebXR. Пакет хранит элементы,
текст, атрибуты, отношения дерева и состояние взаимодействия, с которыми
работают компоненты, Renderer и Browser.

## Ответственность

- Document создаёт узлы и определяет принадлежность элементов одному документу.
- Node и Element поддерживают изменение дерева, атрибуты и поиск элементов.
- EventTarget и классы событий обеспечивают обработчики и распространение событий.
- HTML-элементы хранят фокус, состояние полей и запрошенную прокрутку.
- Range и Selection описывают выделение через узлы и текстовые смещения.
- Реестры stylesheet и уведомления об изменениях связывают документ
  с компиляцией, компонентами и отрисовкой.

DOM не вычисляет CSS-раскладку и не рисует в GPU. Renderer получает документ
и вычисляет его представление; Browser организует Canvas, ввод и кадры
приложения. Дерево DOM остаётся общим для Display, HUD и пространственной сцены.

## Публичные точки входа

Основной импорт — `@zavx0z/dom`: Document, элементы, события и работа с деревом.
Отдельные публичные пути перечислены в `package.json#exports`, включая
`@zavx0z/dom/display`, `@zavx0z/dom/range` и `@zavx0z/dom/selection`.

Display является элементом этого документа. Его физические размеры задаются
атрибутами, разрешение — CSS, а вычисленные параметры публикуются платформой.
Подробное описание находится в TSDoc модуля `display/index.ts` и документации
его публичных объявлений.

## Размер и положение элемента

`element.getBoundingClientRect()` возвращает новый `DOMRect`: `x`, `y`,
`width`, `height`, `top`, `right`, `bottom`, `left`. Это рамка элемента в
CSS-пикселях относительно viewport; она включает padding и border, учитывает
прокрутку и поддерживаемые преобразования. Margin и тень в размер не входят.
Изменение полученного прямоугольника не меняет элемент.

```ts
const rect = element.getBoundingClientRect()
const width = rect.width
const height = rect.height
```

Метод определён на Element, поэтому доступен и у HTMLElement. Геометрию
вычисляет HTML Renderer; Browser переводит её в координаты viewport Canvas.
Чтение синхронно обновляет грязную раскладку, но не запускает GPU-рисование.
После изменения текста, CSS или переноса между HUD и Display следующий вызов
получает актуальную геометрию того же элемента. Отсоединённый элемент, элемент
без Renderer или без layout-бокса (`display:none`) возвращает нулевой прямоугольник.
`visibility:hidden` сохраняет геометрию. Clipping не обрезает возвращаемую рамку.

`DOMRect`, `DOMRectReadOnly` и `DOMRectInit` доступны из основного импорта.
`@zavx0z/dom/geometry` содержит также подключение поставщика геометрии для
Renderer: один активный поставщик на projection root, освобождаемый при dispose.
При вложенных регистрациях используется ближайший предок.

Контракт соответствует [алгоритму CSSOM View](https://drafts.csswg.org/cssom-view/#dom-element-getboundingclientrect)
в пределах поддерживаемой CSS-раскладки Renderer. Он не добавляет новые виды
CSS transforms, SVG-геометрию или методы `getClientRects`/`offsetWidth`/`clientWidth`.
Экранный размер после масштабирования нельзя напрямую считать исходным размером
ноды для раскладки графа.

Поведенческие примеры: [DOM](tests/geometry.test.ts),
[HTML Renderer](../renderer/html/tests/bounding-client-rect.test.ts),
[перенос HUD ↔ Display](../browser/tests/projection-input.test.ts).

## Измерение до показа

`Element.getLayoutRect(relativeTo?)` и `readElementLayoutRect` возвращают
дробный `DOMRectReadOnly | null` до CSS transforms и Browser projection.
`observeElementLayout` из `@zavx0z/dom/geometry` доставляет изменение рамки
перед кадром; подписку можно установить в первом `useLayoutEffect`, когда
provider ещё не готов. Browser завершает вызванные callback обновления
компонентов до GPU submission. `visibility:hidden` сохраняет измеряемый бокс.

Обычный авторский `HTMLElement` ref подходит напрямую. Расширение браузерного
`Element` и runtime-проверка semantic объекта принадлежат `geometry.ts`.
Компоненты не импортируют implementation classes и не приводят refs к ним.
Расширение относится к профилю WebXR; настоящий native DOM не изменяется.

[Полный договор, координаты, ограничения и evidence](layout-geometry.md).

## Документация и проверки

Этот README описывает пакет целиком. В Storybook выбор директории `display`
показывает модульный TSDoc из `display/index.ts`; README внутри обычной
директории не подставляется вместо него.

Проверки общего DOM находятся в `tests`, проверки Display — в `display/tests`.
Команда `bun run check` из директории пакета выполняет проверку типов и тесты.
Состояние прохождения тестов относится к конкретному запуску и версии кода.

Общее устройство приложения описано в [требованиях WebXR](../PROJECT.md).
