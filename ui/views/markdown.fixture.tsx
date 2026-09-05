import {Markdown, type MarkdownProps} from "./markdown.tsx"

export const markdownExampleSource = [
  "# Markdown",
  "",
  "Документ внутри общего Display.",
  "",
  "## Содержимое",
  "",
  "Текст с **жирным**, *курсивным*, ***жирным курсивным*** начертанием и [`inline code` внутри ссылки](./README.md).",
  "",
  "- Первый пункт",
  "- Второй пункт",
  "",
  "1. Первый шаг",
  "2. Второй шаг",
  "",
  "## Код",
  "",
  "```typescript",
  'import {Markdown} from "@zavx0z/ui/views/markdown"',
  "",
  'const source = "# Документ"',
  "```",
].join("\n")

/** Renderer reproduction: inline code must participate in paragraph wrapping. */
export const markdownWrappingSource = "Начало абзаца с `inline code` и продолжением, которое должно переноситься по словам в пределах узкой области документа."

export function MarkdownFixture(props: MarkdownProps) {
  return <Markdown
    source={props.source}
    wrap={props.wrap}
    baseUrl={props.baseUrl}
    title={props.title}
    style={css`
      width: 560px;
      height: 400px;
      padding: 12px;

      ${props.style}
    `}
  />
}

export function MarkdownWrappingFixture(props: Readonly<{wrap?: boolean | undefined}>) {
  return <Markdown
    source={markdownWrappingSource}
    wrap={props.wrap}
    style={css`
      width: 180px;
      height: 220px;
      font-size: 12px;
      line-height: 18px;
    `}
  />
}
