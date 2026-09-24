/** Видимые строки и ограниченная отрисовка общего управляемого дерева. */

export type WindowedTreeItem = Readonly<{
  id: string
  children?: readonly WindowedTreeItem[] | undefined
}>

export type WindowedTreeRow<T extends WindowedTreeItem> = Readonly<{
  item: T
  parentId: string | null
  depth: number
}>

export type WindowedTreeBlock<T extends WindowedTreeItem> = Readonly<{
  kind: "item"
  item: T
  children: readonly WindowedTreeBlock<T>[]
  hidden: boolean
}> | Readonly<{
  kind: "spacer"
  key: string
  rows: number
  hidden: false
}>

/** Разворачивает только раскрытые ветви; полное дерево остаётся у владельца. */
export function visibleTreeRows<T extends WindowedTreeItem>(
  items: readonly T[],
  expanded: ReadonlySet<string>,
): readonly WindowedTreeRow<T>[] {
  const rows: WindowedTreeRow<T>[] = []
  const visit = (children: readonly T[], parentId: string | null, depth: number): void => {
    for (const item of children) {
      rows.push({item, parentId, depth})
      if (expanded.has(item.id)) visit((item.children ?? []) as readonly T[], item.id, depth + 1)
    }
  }
  visit(items, null, 1)
  return rows
}

/** Создаёт строки видимой области и фокуса, сохраняя высоту пропусков. */
export function windowedTreeBlocks<T extends WindowedTreeItem>(
  items: readonly T[],
  rows: readonly WindowedTreeRow<T>[],
  expanded: ReadonlySet<string>,
  start: number,
  size: number,
  focusId: string | null,
): readonly WindowedTreeBlock<T>[] {
  const indexes = new Map(rows.map((row, index) => [row.item.id, index]))
  const visit = (children: readonly T[]): readonly WindowedTreeBlock<T>[] => {
    const blocks: WindowedTreeBlock<T>[] = []
    let skipped = 0
    const flush = () => {
      if (skipped > 0) blocks.push({kind: "spacer", key: `spacer:${blocks.length}:${skipped}`, rows: skipped, hidden: false})
      skipped = 0
    }
    for (const item of children) {
      const index = indexes.get(item.id)
      if (index === undefined) continue
      const descendants = expanded.has(item.id) ? visit((item.children ?? []) as readonly T[]) : []
      const visibleDescendant = descendants.some(child => child.kind === "item")
      if (item.id !== focusId && (index < start || index >= start + size) && !visibleDescendant) {
        skipped += 1 + descendants.reduce((total, child) => total + blockRows(child), 0)
        continue
      }
      flush()
      blocks.push({kind: "item", item, children: descendants, hidden: false})
    }
    flush()
    return blocks
  }
  return visit(items)
}

/** Сохраняет уже созданные строки при поиске и прокрутке. */
export function retainedTreeBlocks<T extends WindowedTreeItem>(
  visible: readonly WindowedTreeBlock<T>[],
  items: readonly T[],
  createdIds: ReadonlySet<string>,
): readonly WindowedTreeBlock<T>[] {
  const retain = (blocks: readonly WindowedTreeBlock<T>[], siblings: readonly T[]): readonly WindowedTreeBlock<T>[] => {
    const present = new Set(blocks.filter(block => block.kind === "item").map(block => block.item.id))
    const result: WindowedTreeBlock<T>[] = blocks.map(block => block.kind === "spacer" ? block : ({
      ...block,
      children: retain(block.children, (block.item.children ?? []) as readonly T[]),
    }))
    for (const item of siblings) {
      if (present.has(item.id) || !createdIds.has(item.id)) continue
      result.push({
        kind: "item",
        item,
        children: retain([], (item.children ?? []) as readonly T[]),
        hidden: true,
      })
    }
    return result
  }
  return retain(visible, items)
}

export function materializedTreeRows<T extends WindowedTreeItem>(blocks: readonly WindowedTreeBlock<T>[]): number {
  return blocks.reduce((total, block) => total + (block.hidden ? 0 : block.kind === "spacer" ? 0 :
    1 + materializedTreeRows(block.children)), 0)
}

/** Считает высоту видимого блока в логических строках. */
function blockRows<T extends WindowedTreeItem>(block: WindowedTreeBlock<T>): number {
  if (block.hidden) return 0
  return block.kind === "spacer" ? block.rows : 1 + block.children.reduce((total, child) => total + blockRows(child), 0)
}
