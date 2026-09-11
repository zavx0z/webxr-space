/**
{@link Markdown} отображает документ в одном семантическом article: разбирает source,
составляет блоки через частные компоненты и задаёт общий режим переноса текста.
Блоки кода используют CodeEditor, Mermaid-блоки — отдельный компонент Mermaid.
Разметка остаётся в Document приложения; раскладкой и вводом владеет платформа.

@packageDocumentation
*/
import {useMemo} from "@zavx0z/component"
import {parseMarkdown} from "../parser/src/parser.ts"
import type {MarkdownProps} from "./contract/input.ts"
import {Block} from "./src/blocks.tsx"

export type {MarkdownProps} from "./contract/input.ts"

/**
Отображает CommonMark и разрешённую HTML-проекцию в одном article.
Разбор переиспользуется, пока source/baseUrl не изменились; смена wrap
меняет CSS того же корня. InlineList сохраняет текстовые узлы и семантическое
оформление без декоративных span. Назначение владельца описывает
[Markdown как документ приложения](../README.md).

Размер области задаёт вызывающая композиция через style. Общая тема задаёт
цвета; переносы, выделение, переходы по ссылкам и загрузка изображений
следуют [авторскому контракту приложения](../../PROJECT.md#авторство-и-подключение-приложения).
Техническая граница переносов находится у [строчного потока Renderer](../../renderer/html/inline-flow.md).

@param props - Исходник, база адресов и параметры article согласно {@link MarkdownProps}.

@throws TypeError, если source не строка или переданный wrap не boolean.

@example
```tsx
<Markdown
  source={"# Документ"}
  baseUrl="https://example.com/docs/"
  wrap={true}
/>
```

@remarks
[Проверки Markdown](tests/markdown.test.ts) связывают parser, semantic элементы,
обновление и cleanup; [сквозное выделение](tests/selection.test.ts) проверяет
общий текстовый путь через readonly CodeEditor и соседние блоки.
*/
export function Markdown(props: MarkdownProps) {
  if (props.wrap !== undefined && typeof props.wrap !== "boolean") {
    throw new TypeError("Markdown wrap must be a boolean")
  }
  const markdown = useMemo(() => parseMarkdown({
    source: props.source,
    ...(props.baseUrl === undefined ? {} : {baseUrl: props.baseUrl}),
  }), [props.source, props.baseUrl])
  return <article
    data-markdown=""
    data-wrap={String(props.wrap ?? true)}
    title={props.title}
    style={css`
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      width: 100%;
      min-width: 0;
      overflow: auto;
      color: var(--widget-box-content);
      font-size: var(--font-size-sm);
      line-height: 1.45;
      white-space: normal;

      &[data-wrap="false"] {
        white-space: nowrap;
      }

      ${props.style}
    `}
  >
    {markdown.blocks.map(block => <Block
      key={block.key}
      block={block}
    />)}
  </article>
}
