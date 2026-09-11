import type {MarkdownBlock, MarkdownInline} from "../../parser/src/parser.ts"

/**
Вход частных компонентов строчного содержимого на основе {@link MarkdownInline}.

@property content - Уже разобранные фрагменты, передаваемые в [общую строчную композицию](../src/blocks.tsx) без повторного parse.
Ключи фрагментов сохраняют identity при обновлении JSX-списка.
*/
export type InlineListProps = Readonly<{
  content: readonly MarkdownInline[]
}>

/**
Общая часть входа обеих форм list из {@link MarkdownBlock}.
Начальный номер передаётся отдельно только упорядоченному списку.

@property items - Элементы list из модели parser, без копирования и изменения порядка.
[Представление элемента списка](../src/blocks.tsx) выводит начальное строчное содержимое, затем оставшиеся блоки.
*/
export type ListProps = Readonly<{
  items: Extract<MarkdownBlock, {kind: "list"}>["items"]
}>
