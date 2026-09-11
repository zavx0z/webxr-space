import type {DefaultTreeAdapterTypes} from "parse5"

/** Инертный узел parse5 для [проекции Markdown](../src/projection.ts), без связи с Document приложения. */
export type HtmlNode = DefaultTreeAdapterTypes.ChildNode

/** Элемент parse5 с именем тега и атрибутами после проверки вида {@link HtmlNode}. */
export type HtmlElement = DefaultTreeAdapterTypes.Element
