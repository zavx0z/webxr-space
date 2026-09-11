import type {MarkdownBlock, MarkdownInline} from "../../shared/types/model.ts"

/**
Обходит уже разобранную модель и собирает уникальные href/src в порядке обнаружения.
Вложенные списки, оформление и обе секции таблицы участвуют в том же обходе.

@param blocks - Блоки общего parser, без повторного разбора и разрешения адресов.
@returns Замороженный массив адресов; повторные вхождения сохраняют позицию первого.
*/
export function collectDestinations(blocks: readonly MarkdownBlock[]): readonly string[] {
  const destinations = new Set<string>()
  /**
  Добавляет адреса текущих строчных фрагментов и рекурсивно обходит вложенное оформление.

  @param items - Фрагменты {@link MarkdownInline} из общего parser; адреса добавляются в захваченный Set.
  */
  const visitInline = (items: readonly MarkdownInline[]): void => {
    for (const item of items) {
      if (item.kind === "image") destinations.add(item.src)
      if (item.kind === "link") destinations.add(item.href)
      if ("content" in item) visitInline(item.content)
    }
  }
  /**
  Обходит ресурсы во всех ветках блоков, включая обе секции таблицы и элементы списка.

  @param items - Последовательность {@link MarkdownBlock}; обход дополняет общий набор destinations.
  */
  const visitBlocks = (items: readonly MarkdownBlock[]): void => {
    for (const item of items) {
      if ("content" in item) visitInline(item.content)
      if ("blocks" in item) visitBlocks(item.blocks)
      if (item.kind === "table") for (const row of [...item.head, ...item.body]) {
        for (const cell of row.cells) visitInline(cell.content)
      }
      if (item.kind === "list") for (const entry of item.items) {
        visitInline(entry.content)
        visitBlocks(entry.blocks)
      }
    }
  }
  visitBlocks(blocks)
  return Object.freeze([...destinations])
}
