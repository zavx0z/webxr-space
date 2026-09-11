/**
Вход {@link @webxr/markdown/destinations#markdownDestinations | markdownDestinations}
для поиска ссылок и изображений по правилам общего Markdown parser.

@property source - Исходный Markdown; HTML не исполняется.
Относительные адреса сохраняются без разрешения относительно базы.
Нестроковое значение приводит к TypeError.

@example
```ts
const input: MarkdownDestinationsInput = {source: "[Документ](./guide.md)"}
```
*/
export interface MarkdownDestinationsInput {
  readonly source: string
}
