import {Markdown, type MarkdownProps} from "./markdown.tsx"

/** Renderer reproduction: row height must contain text wrapped at the final cell width. */
export const markdownTableWrappingSource = [
  "| Алгоритм | Вход | Результат и ограничения |",
  "| --- | --- | --- |",
  "| [Fixed](./algorithms/fixed/src/index.ts) | Измеренные ноды, `y` портов, связи, viewport, spacing | `RIGHT` / `DOWN`, источник `EAST`, приёмник `WEST`, ортогональные sections. Один порт с конфликтующими ролями отклоняется |",
  "| [Adaptive](./algorithms/adaptive/src/index.ts) | Тот же граф с `capability` и `allowedSides` | Одна сторона для каждого точного сокета, включая общий. Возвращает bounds, sections и диагностику ограниченного поиска |",
  "| [TopDown](./algorithms/top-down/src/index.ts) | Плоский DAG и `x` портов без viewport | `SOUTH` → `NORTH`, единые цепочки cubic curves. Цикл возвращает typed witness |",
  "| [Coffman–Graham](./algorithms/coffman-graham/src/index.ts) | DAG, `x` портов и `maxNodesPerLayer` | Ограниченные по ширине слои, cubic curves и массив crossings. Цикл возвращает typed witness |",
].join("\n")

export const markdownExampleSource = [
  "# Markdown",
  "",
  "Документ внутри общего Display.",
  "",
  "| Возможность | Пример | Статус |",
  "| :--- | :---: | ---: |",
  "| **Таблица** | `inline code` | Готово |",
  "| [Ссылка](./README.md) | Текст с переносом по ширине колонки | Да |",
  "",
  "## Перенос в таблице",
  "",
  markdownTableWrappingSource,
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
