import type {Document} from "@zavx0z/dom"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import type {MarkdownProps} from "@zavx0z/ui/views/markdown"
import {
  MarkdownFixture,
  MarkdownWrappingFixture,
  markdownExampleSource,
  markdownWrappingSource,
} from "../../../views/markdown.fixture.tsx"
import {mountOwnerStory} from "../story-types.ts"

export function createCompiledMarkdownProductionStory(document: Document) {
  const props: MarkdownProps = Object.freeze({
    source: markdownExampleSource,
    baseUrl: "https://example.com/docs/",
  })
  return mountOwnerStory(
    document,
    MarkdownFixture as unknown as CompiledTemplate<MarkdownProps>,
    props,
    "markdown",
    source(props.source, false),
  )
}

export function createCompiledMarkdownWrappingStory(document: Document, wrap = true) {
  return mountOwnerStory(
    document,
    MarkdownWrappingFixture as unknown as CompiledTemplate<Readonly<{wrap: boolean}>>,
    {wrap},
    "markdown",
    source(markdownWrappingSource, true, wrap),
  )
}

function source(value: string, wrapping: boolean, wrap = true): string {
  return [
    'import {Markdown} from "@zavx0z/ui/views/markdown"',
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
