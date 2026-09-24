# Универсальные виджеты

Editor, Terminal и Tree принадлежат UI. Они используют один Document вызывающего
Experience, общую тему и стандартные события. Виджет не создаёт Root, Canvas,
Renderer, сервер, файловую модель или debugger session. Interpreter компонует их
из TSX и передаёт данные/команды, а не монтирует или перекрашивает их DOM вручную.

Все три виджета по умолчанию заполняют размеры родителя, имеют `min-width: 0` и
`min-height: 0`. Приложение задаёт только структурный Flex и размеры области;
отдельный app stylesheet или appearance overrides для работы не требуются.
`Window layout="fill"` также заполняет родителя, сохраняя прежний floating default.

Общая шапка принимает `title`, `subtitle`, `status`, `statusTone`, `actions`.
Действие содержит `id`, `label`, необязательные `iconSrc`, `badge`, `disabled`,
`selected`, `tone`, `badgeTone`, `dividerAfter` и callback `onAction(event)`.
Тона — состояния UI, не Git/debugger значения. Кнопки, Badge и Divider остаются
их существующими production-компонентами, палитра принадлежит теме.

## Editor

`@zavx0z/ui/widgets/editor` компонует CodeEditor и общую шапку. Принимает его
value/readOnly/model/languageId/path/tokens и callbacks. `onSave(value,event)`
обрабатывает ⌘/Ctrl+S, `onSubmit(value,event)` — ⌘/Ctrl+Enter; что именно сохранить
или выполнить решает приложение. CodeEditorModel владеет транзакциями текста.

`onReady(handle | null)` предоставляет focus/isFocused, getSelection/setSelections
в UTF-16 offsets и scrollToLine. Readonly selection читается из Document.Selection;
при межблочном выделении возвращается только пересечение с кодом без изменения
глобального диапазона. Программное выделение readonly отображает основной Range.
Прокрутка вызывает общий `Element.scrollIntoView`, без расчётов line-height/viewport
в приложении. Дополнительные диапазоны editable принадлежат общей модели.

`lineDecorations` содержит уникальный нулевой индекс `line`, `lineTone`,
`markerTone`, `gutterTone`, `title`. Тона `neutral/info/success/warning/error`
выбирают общую UI-палитру. Это нейтральные состояния строки; назначение метки
определяет потребитель. `onLineNumberClick` сообщает нулевой индекс и событие.

## Terminal

`@zavx0z/ui/widgets/terminal` принимает TerminalModel либо controlled `lines`
с `{id, runs:[{text,color?,background?,bold?}]}`, а также controlled `input`,
`inputEnabled`, `onInput` и `onSubmit`. Обычный текст вывода выделяется общим DOM
механизмом. Меню и системное копирование не реализуются заново.

`inputMode="stream"` сообщает завершённый ввод через `onData(data, source)`
(`keyboard` или `paste`) и восстанавливает пустое controlled поле. IME previews
не отправляются как отдельные команды; завершение отправляется один раз.
Enter/Backspace/Tab отправляют CR/DEL/TAB; interrupt не перехватывает уже
выделенный обычный текст. Протокол процесса и смысл команд остаются у приложения.
`onReady` предоставляет focus/isFocused. `followOutput` по умолчанию включает
общий scrollIntoView последней строки; false оставляет прокрутку пользователю.

`@zavx0z/ui/terminal-model` переносит общий ANSI subset из прежнего terminal:
CR/LF/backspace/tab, SGR 8/bright цветов и bold, очистка/перемещение курсора,
DSR и device replies, потоковый UTF-8 и ограниченный scrollback. Модель не является
полным VT/xterm emulator. `onReply` возвращает ответ протокола без отправки в процесс.
write/writeln/clear/toText и subscribe доступны независимо от DOM.

## Tree

`@zavx0z/ui/widgets/tree` отображает настоящую вложенную иерархию tree/treeitem/group.
Элемент содержит `id`, `label`, optional `children`, `iconSrc`, `detail`, `title`,
`disabled`, `muted`, `tone`, `actions`. `expandable` позволяет раскрыть ленивый узел
до получения children: приложение реагирует на onExpandedChange и обновляет данные.

expandedKeys и selectedKeys controlled. selectionMode multiple включает Ctrl/Meta
toggle и Shift-range. Стрелки, Home/End, Enter и Space работают по видимым узлам;
disabled не выбираются. `muted` только приглушает оформление. Двойной клик/Enter
передаются в onActivate(id,event). Действия строки получают доступное имя из
`label` даже при одной иконке. Дерево ничего не знает о файлах или remote object IDs.

`embedded` показывает тот же Tree внутри панели вызывающего приложения без
встроенного заголовка и рамки. При `selectionFollowsFocus: false` стрелки
перемещают фокус, сохраняя выбранные ключи: приложение решает, когда выбор
означает переход или открытие. Узел с `selectable: false` остаётся доступным
для фокуса и раскрытия. `current` помечает текущую страницу независимо от
обычного выбора.

Для больших иерархий optional `windowing` ограничивает число смонтированных
строк. Ранее созданные строки могут сохранять identity вне окна; `retainedItems`
позволяет удержать их при фильтрации. Обычный Tree обходится без этого режима.
Поиск, загрузка детей, адреса переходов и хранение состояния принадлежат
вызывающему приложению.

## Примеры и проверки

Маршруты `components/widgets/editor/basic/default`,
`components/widgets/terminal/basic/default`, `components/widgets/tree/basic/default`
показывают production-компоненты на русском без app CSS и второго меню.
`ui/tests/widgets.test.ts`, `ui/tests/terminal-model.test.ts` и
`ui/tests/widget-stories.test.ts` проверяют те же публичные контракты.
