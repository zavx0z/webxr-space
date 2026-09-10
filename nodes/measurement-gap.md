# Измерение графа до показа

Первоначальный пробел публичной локальной геометрии закрыт в DOM/HTML Renderer/Browser.
GraphView теперь поддерживает полный цикл реального измерения и размещения до
первого видимого кадра. Готовая числовая `scene` остаётся отдельным поддерживаемым входом.

## Публичная композиция

- `GraphView` принимает `input` с компонентами нод без размеров и `layout` —
  синхронную или асинхронную функцию над `GraphMeasurement[]`.
- Компонент ноды получает `intrinsic`, необязательный `rect` и `elementRef`.
  Ref имеет обычный авторский браузерный тип. До размещения rect отсутствует;
  после него x/y задают позицию, а естественные CSS-размеры сохраняются.
- `GraphEditor.measureLayout(snapshot, presentation, measurements)` передаёт
  реальные размеры и Socket anchors выбранной числовой политике. Прежний
  `layout` с готовой геометрией или функцией сохраняет совместимость.
- Для собственного просмотра модели `@webxr/nodes/view/tree` экспортирует
  `useMeasuredNodeTreePresentation`; он составляет тот же GraphView, не второй renderer.

## Один lifecycle

GraphView один раз монтирует реальные элементы текущего Document. В существующем
useLayoutEffect он подписывается на `observeElementLayout`, используя
`readElementLayoutRect` из публичного DOM API. До получения всех размеров и
принятия результата сцена имеет visibility:hidden; измеряемые элементы не получают
hidden/display:none. Временного клона, дополнительного Document, Canvas или Renderer нет.

CSS отвечает за текст, padding, border, flex и авторские ограничения.
При изменении результата измерения начинается новое поколение. Поздний результат
предыдущего поколения или отключённого источника игнорируется. Адаптер модели
дополнительно использует createNodeTreeLayout для привязки к точному snapshot/Store.
Новые позиции и маршруты применяются к тем же Elements. При подготовке следующего
результата прежние Links/Frames сохраняются скрытыми, а ноды получают новое содержимое.

Числовой результат не задаёт ширину содержащего блока измеряемых нод: иначе
выход раскладки менял бы её собственные входные ограничения. В режиме scroll
горизонтальное переполнение определяется настоящими размещёнными потомками.
Pan/zoom меняет только projection, а не локальные измерения. Font/theme/content
и доступные CSS-ограничения могут менять размеры и запускать следующую раскладку.

Наблюдение anchors выполняется относительно настоящего корневого Element ноды.
Реальные контролы ParameterNode растягиваются через обе границы Pane при auto width,
сохраняя согласованность WEST/EAST точек. Правила Fixed/Adaptive/TopDown не изменены.

## Авторские типы и точность

[Публичный договор платформы](../dom/layout-geometry.md) расширяет глобальный lib.dom
Element и принимает обычные HTMLElement refs. В компонентах нет implementation DOM
imports или double assertions для refs. Runtime validation находится в DOM owner.
Для одного layout box платформа сохраняет исходные дробные width/height, не вычисляя
их через вычитание абсолютных координат; положение не создаёт ложный resize.
GraphView не округляет размеры и не читает RenderFrame.boxByNode в production.

## Поведенческие доказательства

- [Browser GraphView](view/tests/browser.test.ts), GRAPH-PREPAINT: настоящий Browser
  root и compiled GraphView в HUD/Display, sync/async первый результат. Каждый
  видимый GPU submission имеет принятые реальные размеры и позиции; async font
  update скрывает граф до принятия, обычное чтение не делает GPU submission.
  Позднее появление GraphView и асинхронный разбор настоящего Markdown проверяются
  только через callbacks, заказанные Browser.requestFrame, без ручного render
  после Promise. Проверен и component root со staging/reparent в том же Document.
- [Измеряемый источник и модель](view/tests/measured.test.ts): разные длины подписей,
  font resize, async generations, pan/zoom без повторного layout, сохранение Node,
  Socket и Link при collapse, сравнение концов маршрутов с настоящими anchors.
- [Mermaid](../markdown/markdown/tests/mermaid.test.ts): измеренный flowchart вместо
  одинакового 210x64, четыре направления, круг, source updates и identity.
  Семь нод/семь связей исходной дискуссии проверяют передачу реальных размеров,
  координат и маршрутов действующему TopDown.
- [Авторский контракт](tests/author-dom-contract.test.ts): AST guard ограничен
  авторскими public TSX; [ref fixture](view/tests/ref-contract.fixture.ts) фиксирует
  исходную несовместимость implementation types и правильный CallbackRef<HTMLElement>.

Это не доказательство совпадения с Codex Desktop. Сохранённое исследование версии
26.903.61454/build8378 с Mermaid11.16 остаётся reference snapshot. Порядок Dagre,
contour intersections и rounded routing ради parity в этом срезе не менялись:
их доработка требует отдельного исследования и решения. Модельный adapter сохраняет
свой существующий горизонтальный socket protocol; общий GraphView уже отображает
готовые cubic/orthogonal маршруты выбранных числовых политик.
