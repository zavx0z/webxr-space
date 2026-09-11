import {Mermaid} from "../../mermaid/index.tsx"
import type {
  MarkdownBlock,
  MarkdownInline,
  MarkdownTableRow,
  MarkdownTableCell,
} from "../../parser/src/parser.ts"
import {Divider} from "@zavx0z/ui/divider"
import {CodeEditor} from "@zavx0z/ui/views/code-editor"
import type {InlineListProps, ListProps} from "../types/blocks.ts"

const headingStyle = css`
  display: block;
  margin: 0 0 8px;
  color: var(--widget-regular-content);
  font-weight: 700;
`

/**
Выводит heading уровня 1 как семантический h1 с общим строчным содержимым.
Уровень выбран {@link Block} по модели parser, а оформление принадлежит Markdown.

@param props - Подготовленное строчное содержимое согласно {@link InlineListProps}; уровень задаёт вызывающий {@link Block}.
*/
function Heading1(props: InlineListProps) {
  return <h1
    style={css`
      ${headingStyle}

      font-size: 24px;
      line-height: 30px;
    `}
  >
    <InlineList content={props.content} />
  </h1>
}

/**
Выводит heading уровня 2 как семантический h2 с общим строчным содержимым.
Уровень выбран {@link Block} по модели parser, а оформление принадлежит Markdown.

@param props - Подготовленное строчное содержимое согласно {@link InlineListProps}; уровень задаёт вызывающий {@link Block}.
*/
function Heading2(props: InlineListProps) {
  return <h2
    style={css`
      ${headingStyle}

      font-size: 20px;
      line-height: 26px;
    `}
  >
    <InlineList content={props.content} />
  </h2>
}

/**
Выводит heading уровня 3 как семантический h3 с общим строчным содержимым.
Уровень выбран {@link Block} по модели parser, а оформление принадлежит Markdown.

@param props - Подготовленное строчное содержимое согласно {@link InlineListProps}; уровень задаёт вызывающий {@link Block}.
*/
function Heading3(props: InlineListProps) {
  return <h3
    style={css`
      ${headingStyle}

      font-size: 18px;
      line-height: 24px;
    `}
  >
    <InlineList content={props.content} />
  </h3>
}

/**
Выводит heading уровня 4 как семантический h4 с общим строчным содержимым.
Уровень выбран {@link Block} по модели parser, а оформление принадлежит Markdown.

@param props - Подготовленное строчное содержимое согласно {@link InlineListProps}; уровень задаёт вызывающий {@link Block}.
*/
function Heading4(props: InlineListProps) {
  return <h4
    style={css`
      ${headingStyle}

      font-size: 16px;
      line-height: 22px;
    `}
  >
    <InlineList content={props.content} />
  </h4>
}

/**
Выводит heading уровня 5 как семантический h5 с общим строчным содержимым.
Уровень выбран {@link Block} по модели parser, а оформление принадлежит Markdown.

@param props - Подготовленное строчное содержимое согласно {@link InlineListProps}; уровень задаёт вызывающий {@link Block}.
*/
function Heading5(props: InlineListProps) {
  return <h5
    style={css`
      ${headingStyle}

      font-size: 14px;
      line-height: 20px;
    `}
  >
    <InlineList content={props.content} />
  </h5>
}

/**
Выводит heading уровня 6 как семантический h6 с общим строчным содержимым.
Уровень выбран {@link Block} по модели parser, а оформление принадлежит Markdown.

@param props - Подготовленное строчное содержимое согласно {@link InlineListProps}; уровень задаёт вызывающий {@link Block}.
*/
function Heading6(props: InlineListProps) {
  return <h6
    style={css`
      ${headingStyle}

      font-size: 12px;
      line-height: 18px;
    `}
  >
    <InlineList content={props.content} />
  </h6>
}

/**
Выводит строчный код как текст внутри code без разбора HTML и без отдельного редактора.

@param props - Поле `value` содержит исходный текст inline-кода, уже извлечённый parser.
*/
function InlineCode(props: Readonly<{value: string}>) {
  return <code
    style={css`
      display: inline;
      color: var(--editor-content);
      font-family: monospace;
    `}
  >
    {props.value}
  </code>
}

/**
Выводит проверенную parser ссылку с рекурсивно оформленной подписью.
Для absolute http/https-адреса выставляет noreferrer; переход обрабатывает платформа.

@param props - `href` уже проверен parser; `content` содержит {@link MarkdownInline}, а `external` включает noreferrer.
*/
function InlineLink(props: Readonly<{content: readonly MarkdownInline[]; href: string; external: boolean}>) {
  return <a
    href={props.href}
    rel={props.external ? "noreferrer" : undefined}
    style={css`
      display: inline;
      color: var(--widget-toolbar-content-selected);
    `}
  >
    <InlineList content={props.content} />
  </a>
}

/**
Сохраняет семантику strong и вложенное строчное оформление через {@link InlineList}.

@param props - Подготовленные {@link InlineListProps}; дочерние ссылки и inline-код сохраняют свою семантику.
*/
function Strong(props: InlineListProps) {
  return <strong
    style={css`
      font-weight: 700;
    `}
  >
    <InlineList content={props.content} />
  </strong>
}

/**
Сохраняет семантику em и вложенное строчное оформление через {@link InlineList}.

@param props - Подготовленные {@link InlineListProps}; вложенные фрагменты передаются без повторного разбора.
*/
function Emphasis(props: InlineListProps) {
  return <em
    style={css`
      font-style: italic;
    `}
  >
    <InlineList content={props.content} />
  </em>
}

/**
Составляет зачёркнутое содержимое в s, не теряя вложенных ссылок и фрагментов.

@param props - Подготовленные {@link InlineListProps}, включая вложенное оформление и ссылки.
*/
function Strike(props: InlineListProps) {
  return <s
    style={css`
      text-decoration: line-through;
    `}
  >
    <InlineList content={props.content} />
  </s>
}

/**
Материализует явный перенос parser как br в общем потоке текста.
*/
function InlineBreak() {
  return <br />
}

/**
Передаёт проверенные parser адрес и размеры в img.
Ограничивает изображение шириной родителя; загрузкой ресурса владеет платформа.

@param props - Поле `image` содержит ветку image из {@link MarkdownInline}; width/height передаются в CSS px без повторной проверки.
*/
function InlineImage(props: Readonly<{image: Extract<MarkdownInline, {kind: "image"}>}>) {
  return <img
    src={props.image.src}
    alt={props.image.alt}
    title={props.image.title}
    width={props.image.width}
    height={props.image.height}
    style={css`
      max-width: 100%;
      object-fit: contain;
    `}
  />
}

/**
Выбирает частный строчный компонент по kind; обычный текст остаётся текстовым узлом.

@param props - Один фрагмент {@link MarkdownInline}; дискриминатор kind выбирает единственную ветку представления.
*/
function Inline(props: Readonly<{inline: MarkdownInline}>) {
  const text = props.inline.kind === "text" ? props.inline.value : ""
  return <>
    {text}
    {props.inline.kind === "code" ? <InlineCode value={props.inline.value} /> : null}
    {props.inline.kind === "strong" ? <Strong content={props.inline.content} /> : null}
    {props.inline.kind === "em" ? <Emphasis content={props.inline.content} /> : null}
    {props.inline.kind === "strike" ? <Strike content={props.inline.content} /> : null}
    {props.inline.kind === "break" ? <InlineBreak /> : null}
    {props.inline.kind === "image" ? <InlineImage image={props.inline} /> : null}
    {props.inline.kind === "link" ? <InlineLink
      content={props.inline.content}
      href={props.inline.href}
      external={props.inline.external}
    /> : null}
  </>
}

/**
Выводит фрагменты в исходном порядке с их parser-ключами, без дополнительной оболочки.

@param props - Последовательность {@link InlineListProps.content} с parser-ключами для повторного JSX render.
*/
function InlineList(props: InlineListProps) {
  return <>
    {props.content.map(inline => <Inline
      key={inline.key}
      inline={inline}
    />)}
  </>
}

/**
Оформляет paragraph единым p и передаёт его фрагменты в {@link InlineList}.

@param props - Строчные фрагменты {@link InlineListProps}; внешние отступы принадлежат этому paragraph.
*/
function Paragraph(props: InlineListProps) {
  return <p
    style={css`
      display: block;
      margin: 0 0 8px;
    `}
  >
    <InlineList content={props.content} />
  </p>
}

/**
Соединяет начальный абзац и оставшиеся блоки одного li, сохраняя вложенные списки.

@param props - Поле `item` из {@link ListProps.items}: первый paragraph в content, последующие и вложенные блоки в blocks.
*/
function ListItem(props: Readonly<{item: ListProps["items"][number]}>) {
  return <li
    style={css`
      display: block;
    `}
  >
    <InlineList content={props.item.content} />
    {props.item.blocks.map(block => <Block
      key={block.key}
      block={block}
    />)}
  </li>
}

const listStyle = css`
  display: flex;
  flex-direction: column;
  margin: 0 0 8px;
  padding-left: 20px;
`

/**
Выводит ol с начальным номером parser и ключами исходных элементов списка.

@param props - Элементы {@link ListProps} и `start` из parser: положительное безопасное целое, обычно 1. Компонент число не валидирует.
*/
function OrderedList(props: ListProps & Readonly<{start: number}>) {
  return <ol
    data-markdown-list="ordered"
    start={props.start}
    style={css`${listStyle}`}
  >
    {props.items.map(item => <ListItem
      key={item.key}
      item={item}
    />)}
  </ol>
}

/**
Выводит ul с теми же элементами и отступами, что используются для ordered-списка.

@param props - Элементы {@link ListProps} в исходном порядке; начальный номер для этой ветки не используется.
*/
function UnorderedList(props: ListProps) {
  return <ul
    data-markdown-list="unordered"
    style={css`${listStyle}`}
  >
    {props.items.map(item => <ListItem
      key={item.key}
      item={item}
    />)}
  </ul>
}

/**
Показывает fenced-код в существующем {@link CodeEditor} только для чтения.
Язык приходит из parser; {@link Mermaid}-ветку выбирает {@link Block} до вызова этого компонента.

Высота auto определяется строками и отступами готового редактора; колонка номеров
и прокрутка следуют [правилам CodeEditor](../../../ui/views/code-editor.md).
Исходные пробелы и переводы строк сохраняются в общем текстовом пути.

@param props - `value` сохраняет текст кода, `languageId` выбирает подсветку {@link CodeEditor}; редактирование отключено.
*/
function CodeBlock(props: Readonly<{languageId: string; value: string}>) {
  return <CodeEditor
    value={props.value}
    readOnly={true}
    languageId={props.languageId}
    style={css`
      width: 100%;
      height: auto;
      margin-bottom: 8px;
    `}
  />
}

/**
Создаёт семантический blockquote и рекурсивно выводит вложенные блоки.

@param props - Поле `blocks` содержит вложенные {@link MarkdownBlock} с собственными parser-ключами.
*/
function BlockQuote(props: Readonly<{blocks: readonly MarkdownBlock[]}>) {
  return <blockquote
    style={css`
      display: block;
      margin: 8px 0;
      padding-left: 12px;
      border-left: 2px solid var(--widget-box-outline);
    `}
  >
    {props.blocks.map(block => <Block
      key={block.key}
      block={block}
    />)}
  </blockquote>
}

/**
Проецирует разрешённый div из HTML в группу блоков.
Выравнивание включается через data-align и статические CSS selectors.

@param props - Вложенные {@link MarkdownBlock} и допустимый align: left, center или right. При отсутствии align применяется обычный cascade.
*/
function HtmlGroup(props: Readonly<{blocks: readonly MarkdownBlock[]; align?: "left" | "center" | "right" | undefined}>) {
  return <div
    data-align={props.align}
    style={css`
      display: block;

      &[data-align="center"] {
        text-align: center;
      }

      &[data-align="right"] {
        text-align: right;
      }

      &[data-align="left"] {
        text-align: left;
      }
    `}
  >
    {props.blocks.map(block => <Block
      key={block.key}
      block={block}
    />)}
  </div>
}

const tableCellStyle = css`
  box-sizing: border-box;
  display: block;
  flex: 1 1 0;
  min-width: 0;
  padding: 6px 8px;
  border: 1px solid var(--widget-regular-outline);
  text-align: left;

  &[data-align="center"] {
    text-align: center;
  }

  &[data-align="right"] {
    text-align: right;
  }
`

/**
Выводит содержимое ячейки thead как th с областью col и разрешённым выравниванием.

@param props - Ячейка {@link MarkdownTableCell}; её выравнивание передаётся в data-align, содержимое — в {@link InlineList}.
*/
function TableHeaderCell(props: Readonly<{cell: MarkdownTableCell}>) {
  return <th
    scope="col"
    data-align={props.cell.align}
    style={css`
      ${tableCellStyle}

      font-weight: 700;
      background: var(--widget-regular-background);
    `}
  >
    <InlineList content={props.cell.content} />
  </th>
}

/**
Выводит ячейку tbody как td с общим оформлением таблицы и строчным содержимым.

@param props - Ячейка {@link MarkdownTableCell} без роли заголовка; выравнивание уже нормализовано parser.
*/
function TableDataCell(props: Readonly<{cell: MarkdownTableCell}>) {
  return <td
    data-align={props.cell.align}
    style={css`${tableCellStyle}`}
  >
    <InlineList content={props.cell.content} />
  </td>
}

/**
Выбирает th или td по роли секции; сама модель ячейки общая для обеих веток.

@param props - Ячейка {@link MarkdownTableCell}; header=true выбирает th, отсутствие или false — td.
*/
function TableCell(props: Readonly<{cell: MarkdownTableCell; header?: boolean | undefined}>) {
  return <>
    {props.header ? <TableHeaderCell cell={props.cell} /> : <TableDataCell cell={props.cell} />}
  </>
}

/**
Составляет строку таблицы из ячеек с parser-ключами и общей ролью заголовка.

@param props - Строка {@link MarkdownTableRow}; header передаёт общую роль всем её ячейкам.
*/
function TableRow(props: Readonly<{row: MarkdownTableRow; header?: boolean | undefined}>) {
  return <tr
    style={css`
      display: flex;
      flex-direction: row;
      flex-shrink: 0;
    `}
  >
    {props.row.cells.map(cell => <TableCell
      key={cell.key}
      cell={cell}
      header={props.header}
    />)}
  </tr>
}

/**
Выводит строки секции по их ключам без промежуточного DOM-контейнера.

@param props - Массив {@link MarkdownTableRow}; header=true используется для секции thead.
*/
function TableRows(props: Readonly<{rows: readonly MarkdownTableRow[]; header?: boolean}>) {
  return <>
    {props.rows.map(row => <TableRow
      key={row.key}
      row={row}
      header={props.header}
    />)}
  </>
}

/**
Собирает семантические table, thead и tbody из раздельных секций модели parser.
Строки используют flex-ячейки равной ширины; высоту определяет перенесённый текст.
Расчёт размеров принадлежит [flex-раскладке Renderer](../../../renderer/html/flex-layout.md).

[Табличный сценарий Markdown](../tests/markdown.test.ts) проверяет длинный текст
в ячейках на готовой production-композиции без фиксированных высот строк.

@param props - Ветка table из {@link MarkdownBlock}; head и body уже разделены parser.
*/
function MarkdownTable(props: Readonly<{table: Extract<MarkdownBlock, {kind: "table"}>}>) {
  return <table
    style={css`
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      width: 100%;
      margin: 0 0 8px;
    `}
  >
    <thead
      style={css`
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
      `}
    >
      <TableRows
        rows={props.table.head}
        header={true}
      />
    </thead>
    <tbody
      style={css`
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
      `}
    >
      <TableRows rows={props.table.body} />
    </tbody>
  </table>
}

/**
Выбирает представление блочного union и сохраняет общий контейнер data-markdown-block.
Fenced-код с языком mermaid без учёта регистра передаёт {@link Mermaid}; остальные языки — {@link CodeBlock}.

@param props - Один {@link MarkdownBlock}; heading использует уровень 1–6, а остальные ветки выбираются по kind. Значения созданы parser и повторно не валидируются.
*/
export function Block(props: Readonly<{block: MarkdownBlock}>) {
  const block = props.block
  return <div
    data-markdown-block={block.kind}
    style={css`
      min-width: 0;
      flex-shrink: 0;
    `}
  >
    {block.kind === "heading" && block.level === 1 ? <Heading1
      content={block.content}
    /> : null}
    {block.kind === "heading" && block.level === 2 ? <Heading2
      content={block.content}
    /> : null}
    {block.kind === "heading" && block.level === 3 ? <Heading3
      content={block.content}
    /> : null}
    {block.kind === "heading" && block.level === 4 ? <Heading4
      content={block.content}
    /> : null}
    {block.kind === "heading" && block.level === 5 ? <Heading5
      content={block.content}
    /> : null}
    {block.kind === "heading" && block.level === 6 ? <Heading6
      content={block.content}
    /> : null}
    {block.kind === "paragraph" ? <Paragraph content={block.content} /> : null}
    {block.kind === "list" && block.ordered ? <OrderedList
      items={block.items}
      start={block.start}
    /> : null}
    {block.kind === "list" && !block.ordered ? <UnorderedList items={block.items} /> : null}
    {block.kind === "code" && block.languageId.toLowerCase() === "mermaid" ? <Mermaid
      source={block.value}
    /> : null}
    {block.kind === "code" && block.languageId.toLowerCase() !== "mermaid" ? <CodeBlock
      languageId={block.languageId}
      value={block.value}
    /> : null}
    {block.kind === "quote" ? <BlockQuote blocks={block.blocks} /> : null}
    {block.kind === "group" ? <HtmlGroup
      blocks={block.blocks}
      align={block.align}
    /> : null}
    {block.kind === "rule" ? <Divider /> : null}
    {block.kind === "table" ? <MarkdownTable table={block} /> : null}
  </div>
}

