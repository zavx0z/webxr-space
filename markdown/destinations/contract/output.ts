/**
Результат {@link @webxr/markdown/destinations#markdownDestinations | markdownDestinations}.
Объект и массив адресов заморожены; файловые и сетевые ресурсы не загружаются.

@property destinations - Уникальные разрешённые href/src в порядке первого обнаружения.
Содержит адреса ссылок и изображений из вложенных блоков, таблиц и оформления.
При отсутствии адресов возвращается пустой массив.

@example
```ts
const output: MarkdownDestinationsOutput = {destinations: ["./guide.md"]}
```
*/
export interface MarkdownDestinationsOutput {
  readonly destinations: readonly string[]
}
