/**
Синхронный разбор CommonMark и таблиц в безопасную модель документа.
Публичный вход принимает текст и базу адресов; частная HTML-проекция и правила
допустимых тегов находятся в src, общая модель используется также представлением
Markdown и сбором адресов ресурсов.

@packageDocumentation
*/
import MarkdownIt from "markdown-it"
import {parseFragment} from "parse5"
import {blocks} from "./src/projection.ts"
import type {ParseMarkdownOptions} from "./contract/input.ts"
import type {MarkdownDocument} from "./contract/output.ts"

export type {ParseMarkdownOptions} from "./contract/input.ts"
export type {MarkdownDocument} from "./contract/output.ts"

const parser = new MarkdownIt("commonmark", {html: true}).enable("table")

/**
Синхронно разбирает CommonMark и таблицы в замороженную модель без живого DOM.
HTML проходит через инертное дерево parse5 и разрешённую проекцию.

@param options - Исходный текст и необязательная база адресов согласно {@link ParseMarkdownOptions}.

@returns Корневые блоки в порядке документа, пригодные для отображения и поиска ресурсов.

@throws TypeError при нестроковом source.

@example
```ts
const document = parseMarkdown({source: "# Заголовок", baseUrl: "/docs/"})
```
*/
export function parseMarkdown(options: ParseMarkdownOptions): MarkdownDocument {
  if (typeof options.source !== "string") throw new TypeError("Markdown source must be text")
  const html = parseFragment(parser.render(options.source))
  return Object.freeze({blocks: blocks(html.childNodes, options.baseUrl, "block", 0)})
}
