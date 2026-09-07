import {Node} from "./src/node.ts"
import type {RangeBoundary} from "./range.ts"
import {textPositionIndex} from "./src/internal/text-position-index.ts"

/**
 * Nonstandard shared mapping of a DOM boundary to raw UTF-16 Text content.
 * Actual LF characters count; elements, comments and visual wrapping add nothing.
 * Returns null for a boundary outside root or an invalid offset.
 */
export function textOffsetAtPosition(root: Node, node: Node, offset: number): number | null {
  if (!Number.isInteger(offset) || offset < 0) return null
  const entry = textPositionIndex(root).nodes.get(node)
  if (!entry) return null
  if (node.nodeType === Node.TEXT_NODE) return offset <= entry.end - entry.start ? entry.start + offset : null
  if (node.nodeType === Node.COMMENT_NODE) return offset <= (node.nodeValue?.length ?? 0) ? entry.start : null
  return entry.children[offset] ?? null
}

/**
 * Inverse raw-text mapping, clamped to the available text. At an exact boundary
 * the preceding Text end is preferred. Empty content maps to (root, 0).
 */
export function textPositionAtOffset(root: Node, offset: number): RangeBoundary {
  const index = textPositionIndex(root)
  const normalized = Number(offset)
  const target = Math.max(0, Math.min(index.length, Number.isFinite(normalized) ? Math.trunc(normalized) : 0))
  if (!index.texts.length) return {node: root, offset: 0}
  let low = 0
  let high = index.texts.length - 1
  while (low < high) {
    const middle = (low + high) >>> 1
    if (index.texts[middle]!.end < target) low = middle + 1
    else high = middle
  }
  const entry = index.texts[low]!
  return {node: entry.node, offset: target - entry.start}
}
