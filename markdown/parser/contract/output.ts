import type {MarkdownBlock} from "../../shared/types/model.ts"

/**
Результат {@link @webxr/markdown/parser#parseMarkdown | parseMarkdown} для отображения
документа и поиска его ресурсов. Корневой объект заморожен; модель не содержит живых HTML-узлов.

@property blocks - Корневые {@link MarkdownBlock} в порядке документа.
Пустой исходник даёт пустой массив. Позиционные ключи сохраняют структуру разбора,
но не являются смещениями в исходном тексте.

@example
```ts
const output: MarkdownDocument = {blocks: []}
```
*/
export interface MarkdownDocument {
  readonly blocks: readonly MarkdownBlock[]
}
