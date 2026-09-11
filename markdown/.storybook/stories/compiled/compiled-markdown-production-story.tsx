import type {Document} from "@zavx0z/dom"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import type {MarkdownProps} from "@webxr/markdown"
import {
  MarkdownFixture,
  MarkdownWrappingFixture,
  markdownExampleSource,
  markdownWrappingSource,
} from "../../../markdown/tests/markdown.fixture.tsx"
import {mountOwnerStory} from "../story-types.ts"

/**
Монтирует основной сценарий CommonMark, HTML и таблиц в переданном {@link Document} Storybook.
База example.com/docs разрешает относительные ресурсы; исходный пример доступен инспектору.

@param document - Заимствованный semantic Document внешнего Storybook; lifecycle создаваемой истории предоставляет {@link mountOwnerStory}.

@returns Готовая owner story с исходным примером и dispose для последующего снятия.
*/
export function createCompiledMarkdownProductionStory(document: Document) {
  const props = Object.freeze({
    source: markdownExampleSource,
    baseUrl: "https://example.com/docs/",
  } satisfies MarkdownProps)
  return mountOwnerStory(
    document,
    MarkdownFixture as unknown as CompiledTemplate<MarkdownProps>,
    props,
    "markdown",
    source(props.source, false),
  )
}

/**
Монтирует сценарий сравнения переноса и горизонтального переполнения в области шириной 180 CSS px.
Параметр wrap передаётся production {@link @webxr/markdown#Markdown | Markdown} через общий fixture без изменения текста.

@param document - Заимствованный semantic Document внешнего Storybook; lifecycle создаваемой истории предоставляет {@link mountOwnerStory}.

@returns Готовая owner story с исходным примером и dispose для последующего снятия.

@param wrap - Режим production Markdown: true разрешает перенос, false сохраняет горизонтальное переполнение.
*/
export function createCompiledMarkdownWrappingStory(document: Document, wrap = true) {
  return mountOwnerStory(
    document,
    MarkdownWrappingFixture as unknown as CompiledTemplate<Readonly<{wrap: boolean}>>,
    {wrap},
    "markdown",
    source(markdownWrappingSource, true, wrap),
  )
}

/**
Собирает текст примера для инспектора с теми же настройками переноса и размеров, что у сценария.
{@link @webxr/markdown#Markdown | Markdown} экранируется через JSON.stringify и не исполняется при построении примера.

@param value - Полный исходный Markdown для примера; JSON.stringify сохраняет кавычки и переводы строк.

@param wrapping - Выбирает геометрию и оформление wrapping-сценария вместо основного примера.

@param wrap - Значение пропса переноса, записываемое в TypeScript-пример.

@returns Текст для панели исходников, соответствующий выбранной ветке сценария.
*/
function source(value: string, wrapping: boolean, wrap = true): string {
  return [
    'import {Markdown} from "@webxr/markdown"',
    'import {createRoot} from "@zavx0z/component"',
    "",
    `const source = ${JSON.stringify(value)}`,
    "createRoot(container).render(<Markdown",
    "  source={source}",
    `  wrap={${wrap}}`,
    ...(wrapping ? [] : ['  baseUrl="https://example.com/docs/"']),
    "  style={css`",
    `    width: ${wrapping ? 180 : 560}px;`,
    `    height: ${wrapping ? 220 : 400}px;`,
    ...(wrapping ? ["    font-size: 12px;", "    line-height: 18px;"] : ["    padding: 12px;"]),
    "  `}",
    "/>)",
  ].join("\n")
}
