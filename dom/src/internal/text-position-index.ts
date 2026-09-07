import type {Node} from "../node.ts"
import type {Text} from "../text.ts"

export type TextPositionIndex = Readonly<{
  length: number
  nodes: ReadonlyMap<Node, Readonly<{start: number; end: number; children: readonly number[]}>>
  texts: readonly Readonly<{node: Text; start: number; end: number}>[]
}>

const indexes = new WeakMap<Node, TextPositionIndex>()

export function invalidateTextPositionIndexes(node: Node): void {
  for (let current: Node | null = node; current; current = current.parentNode) indexes.delete(current)
}

export function textPositionIndex(root: Node): TextPositionIndex {
  const cached = indexes.get(root)
  if (cached) return cached
  let length = 0
  const nodes = new Map<Node, Readonly<{start: number; end: number; children: readonly number[]}>>()
  const texts: {node: Text; start: number; end: number}[] = []
  const visit = (node: Node): void => {
    const start = length
    const children = [start]
    if (node.nodeType === 3) {
      length += node.nodeValue?.length ?? 0
      texts.push({node: node as Text, start, end: length})
    } else {
      for (let child = node.firstChild; child; child = child.nextSibling) {
        visit(child)
        children.push(length)
      }
    }
    nodes.set(node, {start, end: length, children})
  }
  visit(root)
  const index = {length, nodes, texts}
  indexes.set(root, index)
  return index
}
