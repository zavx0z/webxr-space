# @webxr/typedoc

Самостоятельный справочник экспортируемых TypeScript-типов в HTML-like/WebGPU UI.
TypeDoc служит визуальным ориентиром: пакет npm `typedoc` не используется.
Декларации, сигнатуры и поля остаются структурированными данными. Публичный
`@webxr/markdown` отображает только описания и примеры. Сигнатуры, типы полей
и defaults показывает готовый `CodeEditor` из `@zavx0z/ui/views/code-editor`
с TypeScript-подсветкой, в режиме чтения и без номеров строк. Токенизатор
и палитра принадлежат существующим Highlighter/UI; собственных копий нет.

Публичные входы:

- `@webxr/typedoc` — компонент `TypeDoc` и тип `TypeDocProps`.
- `@webxr/typedoc/model` — сериализуемые `TypeDocDocument`, декларации, поля и результат анализа.
- `@webxr/typedoc/parser` — `analyzeTypeDoc(root, path)` через API TypeScript 7.

Parser выполняется на стороне инструмента сборки. Готовый `document` передаётся
компоненту; UI не загружает компилятор, не исполняет документируемый исходник
и не преобразует всю модель в Markdown.

```tsx
import {TypeDoc, type TypeDocProps} from "@webxr/typedoc"

export function ContractPanel(props: TypeDocProps) {
  return <section
    style={css`
      width: 100%;
      height: 100%;
      min-width: 0;
      min-height: 0;
      overflow: auto;
    `}
  >
    <TypeDoc
      document={props.document}
      title={props.title}
    />
  </section>
}
```

Компонент монтируется внутри существующего Display или HUD. Его единственный
корень — `article[data-typedoc]`; дополнительных Document, Canvas, Renderer
или циклов кадров нет. Высотой и основной прокруткой управляет родитель.
Опциональный `title` заменяет видимый заголовок из `document.name`, `style`
применяется последним к корневому article. Общую тему
`@zavx0z/ui/themes/theme.css` подключает Experience своим stylesheet link.

Секции показывают вид и имя декларации, исходную сигнатуру, поля с типами,
признак необязательности, авторские значения по умолчанию и примеры. Значения
по умолчанию отображаются как текст и не вычисляются. Ключи деклараций — их
экспортируемые имена, ключи полей — имена внутри декларации. Новый снимок
сохраняет корневой Element и элементы с прежними ключами, в том числе при
перестановке. Пустой документ получает явное сообщение.

## Проверки и ограничение переноса

`bun test typedoc/tests/view.test.ts` проверяет production TSX через Template
compiler, semantic Document и настоящий HTML Renderer. Проверки охватывают
Markdown, optional/default, обновление и перестановку элементов, а также resize
800 → 240 → 800 CSS px с переносом обычных описаний и родительской прокруткой.

Длинные сигнатуры, типы и defaults сохраняют исходный текст и получают
локальную горизонтальную прокрутку готового CodeEditor. Они не расширяют
внешний article. Проверка Renderer подтверждает scroll extent и смещение
текста при прокрутке, сохраняя identity элемента. Отдельная проверка требует
цветных semantic token runs и различающихся цветов в display list сигнатуры,
а также подсветки типов и defaults; одного `languageId` для неё недостаточно.

Текущий Renderer сводит `white-space: pre-wrap` к `pre` и не разрывает длинное
слово. Исходное воспроизведение до подключения CodeEditor: один `code` с
длинным `contractDocument.declarations[0].members[2].type` из
`tests/view.fixture.ts` внутри области 240px, CSS
`white-space: pre-wrap; overflow-wrap: anywhere`.
Ожидаются строки внутри доступной ширины; фактически длинный тип остаётся
одной строкой. Поэтому справочник использует обычную горизонтальную прокрутку
кода. Источник ограничения: `renderer/html/src/css.ts`, `parseWhiteSpace`;
граница поддержки описана в `renderer/html/inline-flow.md`. Владелец —
`@renderer/html`. Платформенный код не изменялся; ручные разрывы типов,
собственный parser и layout не добавлены.

Зелёные проверки структуры и геометрии не подтверждают визуальную приёмку
WebGPU. Storybook и экранная проверка выполняются отдельно потребителем.
