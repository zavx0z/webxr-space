# Выделение текста

Renderer использует единственный `Document.Selection` из DOM. Компоненты
Markdown, код и обычные абзацы не создают собственное выделение. Дополнительные
редакторские диапазоны поступают через DOM transport `text-highlights` и не
изменяют стандартное однодиапазонное выделение документа.

## Договор

- `caretPositionAtPoint(frame, x, y)` возвращает DOM-границу `offsetNode/offset`.
  Смещения — UTF-16, движения указателем не разделяют графемы. Для пустого
  блока граница принадлежит самому Element. `nearest` используется при
  перетаскивании, `root` ограничивает поиск авторской областью.
- `getRangeClientRects(frame, range)` возвращает прямоугольники в координатах
  viewport данной проекции. Их `transform` единичный, исходная цепочка clips
  сохранена. Полная геометрия не обрезается до viewport; `visibleOnly` ограничивает
  подготовку видимыми фрагментами, а точную rounded-обрезку выполняет WebGPU.
- `readRenderedSelectionText(frames, selection)` сериализует диапазон в
  семантическом порядке одного Document, учитывая блочные границы, `br`, `pre`
  и исключённые из выделения участки. Передача всех текущих проекций позволяет
  копировать диапазон между ними; порядок массива кадров не меняет порядок текста.
- `selectTextWordAtPoint(frame, x, y)` выбирает Unicode-слово, в том числе через
  границы inline-элементов. Browser вызывает его после принятого `dblclick`.

Используются CSS `user-select: text/none/all/contain` и used-value `auto`:
`none`/`all` распространяются на потомков с `auto`, явный `text` их переопределяет.
`all` задаёт атомарное выделение, `contain` ограничивает начатый внутри жест.
Номера строк и другие служебные подписи исключаются CSS, не `aria-hidden`.

InteractionController доставляет pointer-событие компоненту до default action.
`preventDefault()` сохраняет авторское владение жестом. Правый клик не изменяет
выделение. Shift-click сохраняет anchor. Перетаскивание текста по ссылке не
активирует её после изменения диапазона. Native input/textarea продолжают
использовать свою модель выделения значения.

Pending `Element.setPointerCapture` обрабатывается до выбора получателя
`pointermove`, `pointerup` и `pointercancel`, в том числе если capture был задан
между событиями. Передача capture другому semantic Element завершает прежний
default-жест выделения, textarea либо range-input. Уже выбранный текст и фокус
не сбрасываются. Захват исходным получателем не отключает его default-жест;
авторское управление остаётся возможным через `preventDefault`.

После передачи, release или удаления получателя старое выделение не возобновляется
до нового `pointerdown`. Передача не порождает click прежнего контрола.
Hover при представленном кадре остаётся у захватившего Element. Up/cancel/dispose
освобождают capture и состояние жеста через существующий Document lifecycle.
Чтение `selectionPointerId` синхронизирует pending capture: Browser может прекратить
автоскролл на ближайшем общем кадре без нового движения указателя.

## Производительность и владельцы

`InlineFragment.sourceOffsets` сохраняет связь каждого отрисованного смещения
с исходным Text до схлопывания пробелов и переноса строк. Подсветка не зависит
от количества highlighter-токенов и не изменяет DOM или TSX.

Невидимые LF-разделители и пустые Text из fragments могут описывать ту же
позицию, что начало следующего блока. Общий индекс DOM-смещений сопоставляет
такую границу с видимым текстом либо пустой строкой; компонент не вычисляет
координаты каретки самостоятельно.

Метрики графем вычисляются лениво тем же font measurer, что и layout. Повторные
движения используют сохранённые метрики. Индекс горизонтальных полос выбирает
видимые текстовые записи в исходном retained frame до материализации scroll
projection. Изменение selection не вызывает токенизацию и layout.

`composeFrame` добавляет отдельный `RenderFrame.textHighlights`, не меняя
`displayList`, boxes и hits. Это прямоугольники подсветки и кареток с общей
цепочкой clipping; WebGPU сохраняет основной текст и его geometry. Свернутое
выделение read-only текста не рисует каретку; активный contenteditable — рисует.

Browser подписывается на `selectionchange` и DOM text-highlights transport,
запрашивает общий demand-кадр и повторно вызывает `composeFrame`. Renderer
не создаёт RAF, Canvas, таймеры clipboard или второй semantic tree. Clipboard,
IME, клавиатурные команды редактирования и обслуживание непрерывного
автоскролла остаются у общего Browser lifecycle.

`../browser/src/document-selection-input.ts` предоставляет команды общего
выделения и шаг автоскролла без собственных listeners, таймеров и RAF. Его
вызывает существующий Browser lifecycle; активные input/textarea/contenteditable
сохраняют собственные клавиатурные операции редактирования.

Поведенческие проверки: `tests/document-selection.test.ts`.
Передача capture: `tests/pointer-capture-selection.test.ts` и
`../browser/tests/selection-capture.test.ts` с настоящим Browser/Renderer вводом.
Проверки удержания GPU-проекции: `../webgpu/tests/text-highlights.test.ts`.

Сохранение полной истории при потоковом обновлении: [streaming-text.md](streaming-text.md).
