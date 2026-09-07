# Общий ввод, выделение и clipboard

Root создаёт один DocumentClipboardController. `root.clipboard`,
`useSpace(state => state.clipboard)` и
`getDocumentClipboardController(document)` относятся к одному объекту.
Повторное создание controller для того же Document отклоняется;
dispose освобождает регистрацию. Native keyboard и clipboard handlers
снимаются вместе с Browser Root.

ClipboardMenu является UI-компонентом, смонтированным один раз в HUD.
Он получает controller через структурный command port без импорта Browser.
Правый клик и ContextMenu/Shift+F10 открывают меню, не меняя сохранённые
границы выбранного текста. Copy/Paste доступны по состоянию цели.
Copy без текста не затирает системный буфер. Paste в read-only текст запрещён.

Нативный copy/cut/paste использует ClipboardEvent и переданный браузером
DataTransfer; меню вызывает тот же semantic command path через системные
readText/writeText. Вставка получает read-only payload и проходит beforeinput.
Control использует value/selectionStart/selectionEnd. Plaintext editing host
использует DOM Range. Компонент может отменить default и выполнить одну
собственную текстовую транзакцию через semantic события. HTML paste не
исполняется: текущий write/read menu path — text/plain.

Открытие меню сохраняет Element, диапазон и исходный текст. Изменение меню
не делает цель устаревшей. Изменение целевого текста, его отключение,
dispose или закрытие меню во время async read отменяют применение вставки.
Отказ clipboard permission не изменяет текст или диапазоны и показывается
в меню. Native copy/cut не запускает асинхронную permission API.

## Native proxy и IME

Прокси принадлежит Browser, а не редактору. Нативное событие proxy и default
изменение semantic Document — разные действия. Semantic beforeinput для
plaintext host отменяем до применения нашего default. Если native IME event
неотменяем, proxy всё ещё может измениться, но его следующий input не
применяет второй раз уже обработанную semantic транзакцию. Во время
composition Browser не переписывает native proxy. Финальный повторный
unkeyed insertText той же composition не дублирует commit; следующая
настоящая клавиша начинает новую операцию.

Общий document-selection-input использует существующий Root frame tick
для drag-autoscroll, а не свой RAF или timer. Клавиатурное выделение обычного
текста не перехватывает работу сфокусированных editable hosts и полей.

Преобразование native pointer coordinates в HUD/Display сохраняет Control,
Alt, Shift и Meta. Модификаторы принадлежат исходному событию: Browser не
теряет их при смене системы координат, а компонент получает их через обычный
semantic PointerEvent. Поэтому Shift-selection и Alt/Meta-мультикурсор
используют один путь с немодифицированным перетаскиванием.

Проверки: `tests/clipboard.test.ts`, `tests/document-selection-input.test.ts`,
`tests/native-editor-selection.test.ts`, `../ui/tests/clipboard-menu.test.ts`,
`../ui/tests/code-editor-browser.test.ts`.
