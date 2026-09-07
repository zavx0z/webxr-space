# Выделение, текстовые позиции и clipboard-события

`@zavx0z/dom` владеет состоянием, но не геометрией выделения.
`Document.getSelection()` возвращает один объект `Selection` на документ.
Он содержит один живой `Range` или не содержит диапазонов; редакторские
мультикурсоры не расширяют этот стандартный объект до несовместимой коллекции.

`Range` и `StaticRange` наследуют `AbstractRange`, не `Node`. Граница — это
semantic Node и UTF-16 offset: для CharacterData смещение в данных, для
контейнера индекс между детьми. `Range.toString()` возвращает сырой текст;
блочные разделители, `user-select`, видимость и формат clipboard определяются
выше, там, где доступны CSS и отображение.

## Поддерживаемое основание

- `Document.createRange`, `getSelection`; boundary setters, сравнения,
  `cloneRange`, `cloneContents`, `extractContents`, `deleteContents`,
  `insertNode`, `surroundContents`, `toString`.
- Anchor/focus, направление, `collapse`, `extend`, `setBaseAndExtent`,
  `selectAllChildren`, `containsNode`, добавление/удаление единственного диапазона.
- Изменение границ при CharacterData edits, `Text.splitText`, вставке,
  удалении, замене детей и принятии узлов другим Document.
- Существующий закон платформы: связанный same-Document reparent сохраняет
  границы внутри перемещаемого поддерева. Если их порядок поменялся, Range
  нормализуется, а Selection сохраняет исходные anchor/focus сменой направления.
  Явный `removeChild` переносит границы из удаляемого поддерева в бывший parent.
- `selectionchange` объединяется в одну microtask и не создаёт DOM mutation,
  layout или новый frame loop. Состояние читается синхронно после изменения.
- `HTMLElement.contentEditable` / `isContentEditable`: отражение и наследование
  `true`, `false`, `plaintext-only`, `inherit`; editing host фокусируем.
  Этот контракт сам по себе не выполняет rich-text редактирование.
- `ClipboardEvent`, строковые `DataTransfer.getData/setData/clearData/types`,
  `InputEvent.dataTransfer`. `sealDataTransfer` — явный служебный переход к
  read-only payload перед Browser-dispatch события вставки.

## Служебные платформенные контракты

`@zavx0z/dom/text-position` содержит общую пару
`textOffsetAtPosition(root, node, offset)` / `textPositionAtOffset(root, offset)`.
Она считает настоящий Text, включая буквальные LF, без искусственных переносов
между элементами и без комментариев. Индекс принадлежит root, сбрасывается
синхронно при структурных и текстовых изменениях, но не при scroll/style.
Повторное определение позиции не обходит заново каждую токеновую обёртку.

`@zavx0z/dom/text-highlights` — **нестандартный транспорт декораций**, а не
подмена Selection API или реализация CSS Custom Highlight API. Владелец
регистрирует дополнительные `Range`, включая collapsed carets; Renderer
подписывается и строит общую геометрию. Владелец обязан удалить свою регистрацию
при unmount. Здесь нет клавиатуры, clipboard, редакторских транзакций или GPU.

## Границы покрытия

Это проверенный DOM-range срез, не объявление полной реализации browser DOM.
У платформы пока нет ShadowRoot/DocumentType/Attr nodes, поэтому их range
алгоритмы и composed selections не заявляются. `getClientRects`,
`getBoundingClientRect`, `createContextualFragment`, `Selection.modify`,
`contenteditable` rich HTML commands и DataTransfer files/items не добавляются
как пустые методы. CSS geometry и selection paint принадлежат Renderer;
системный clipboard и общий ввод — Browser; multi-cursor транзакции — UI-модели
редактора. Конструктор `Range` требует явный Document, поскольку ambient realm
в этом пакете отсутствует; авторский путь — `document.createRange()`.

Исходные нормы: [DOM Ranges](https://dom.spec.whatwg.org/#ranges),
[Selection API](https://w3c.github.io/selection-api/),
[HTML editing](https://html.spec.whatwg.org/multipage/interaction.html#contenteditable),
[Clipboard API](https://www.w3.org/TR/clipboard-apis/).

Behavioral evidence: `tests/range-selection.test.ts`,
`tests/clipboard-editable.test.ts`; прежние DOM contracts продолжают проверяться.
