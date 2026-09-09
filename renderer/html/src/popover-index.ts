import {HTMLElement, getPopoverVisibilityState, type MutationBatch, type Node, type StateChangeBatch} from "@zavx0z/dom"

/** Derived projection-local top-layer membership; existing Renderer subscriptions supply changes. */
export function createPopoverIndex(root: Node) {
  const candidates = new Set<HTMLElement>()
  let ordered: readonly HTMLElement[] | null = null
  const update = (node: Node): void => {
    if (!(node instanceof HTMLElement)) return
    if (root.contains(node) && node.popover !== null && node[getPopoverVisibilityState]() === "showing") candidates.add(node)
    else candidates.delete(node)
  }
  const collect = (node: Node): void => {
    update(node)
    for (let child = node.firstChild; child !== null; child = child.nextSibling) collect(child)
  }
  collect(root)
  return {
    mutations(batch: MutationBatch): void {
      for (const record of batch.records) {
        if (record.type === "childList") {
          for (const node of record.addedNodes) if (root.contains(node)) collect(node)
          ordered = null
        } else if (record.type === "attributes" && record.attributeName === "popover") {
          update(record.target)
          ordered = null
        }
      }
    },
    states(batch: StateChangeBatch): void {
      for (const record of batch.records) if (record.type === "popover") {
        update(record.target)
        ordered = null
      }
    },
    read(): readonly HTMLElement[] {
      if (ordered !== null) return ordered
      for (const node of candidates) if (!root.contains(node) || node.popover === null ||
        node[getPopoverVisibilityState]() !== "showing") candidates.delete(node)
      ordered = Object.freeze([...candidates].sort(treeOrder))
      return ordered
    },
    clear(): void { candidates.clear(); ordered = null },
  }
}

function treeOrder(left: Node, right: Node): number {
  if (left === right) return 0
  const leftPath: Node[] = []
  const rightPath: Node[] = []
  for (let node: Node | null = left; node !== null; node = node.parentNode) leftPath.push(node)
  for (let node: Node | null = right; node !== null; node = node.parentNode) rightPath.push(node)
  let a = leftPath.length - 1
  let b = rightPath.length - 1
  while (a >= 0 && b >= 0 && leftPath[a] === rightPath[b]) { a--; b-- }
  if (a < 0) return -1
  if (b < 0) return 1
  for (let node: Node | null = leftPath[a]!; node !== null; node = node.nextSibling) if (node === rightPath[b]) return -1
  return 1
}
