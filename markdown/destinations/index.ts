/**
Сбор адресов ресурсов из той же безопасной модели, которую показывает Markdown.
Разбор принадлежит parser, обход модели — частному помощнику; разрешение файлов
и загрузка ресурсов остаются у вызывающего инструмента.

@packageDocumentation
*/
import {parseMarkdown} from "../parser/index.ts"
import {collectDestinations} from "./src/collect.ts"
import type {MarkdownDestinationsInput} from "./contract/input.ts"
import type {MarkdownDestinationsOutput} from "./contract/output.ts"

export type {MarkdownDestinationsInput} from "./contract/input.ts"
export type {MarkdownDestinationsOutput} from "./contract/output.ts"

/**
Собирает ссылки и изображения из исходника без загрузки и повторного разрешения адресов.

@param input - Исходный Markdown согласно {@link MarkdownDestinationsInput}.
@returns Уникальные адреса по {@link MarkdownDestinationsOutput}, в порядке обхода модели.
@throws TypeError при нестроковом source.

@example
```ts
const {destinations} = markdownDestinations({source: "[Документ](./guide.md)"})
```
*/
export function markdownDestinations(input: MarkdownDestinationsInput): MarkdownDestinationsOutput {
  return Object.freeze({destinations: collectDestinations(parseMarkdown({source: input.source}).blocks)})
}
