import type {Document} from "./src/document.ts"
import type {Node} from "./src/node.ts"
import {Event} from "./src/event.ts"
import {domError} from "./src/internal/errors.ts"
import {subscribeRange} from "./src/internal/live-ranges.ts"
import {Range, compareRangeBoundaries, nodeLength, validateBoundary} from "./range.ts"

export type SelectionDirection = "forward" | "backward" | "none"

/** One Document selection, never a collection of editor cursors. */
export class Selection {
  private range: Range | null = null
  private orientation: SelectionDirection = "none"
  private releaseRange: (() => void) | null = null
  private eventScheduled = false

  constructor(private readonly document: Document) {}

  get anchorNode(): Node | null {
    const node = this.orientation === "backward" ? this.range?.endContainer ?? null : this.range?.startContainer ?? null
    return node?.getRootNode() === this.document ? node : null
  }
  get anchorOffset(): number {
    if (!this.anchorNode) return 0
    return this.orientation === "backward" ? this.range?.endOffset ?? 0 : this.range?.startOffset ?? 0
  }
  get focusNode(): Node | null {
    const node = this.orientation === "backward" ? this.range?.startContainer ?? null : this.range?.endContainer ?? null
    return node?.getRootNode() === this.document ? node : null
  }
  get focusOffset(): number {
    if (!this.focusNode) return 0
    return this.orientation === "backward" ? this.range?.startOffset ?? 0 : this.range?.endOffset ?? 0
  }
  get isCollapsed(): boolean { return this.anchorNode === this.focusNode && this.anchorOffset === this.focusOffset }
  get rangeCount(): number { return this.range && this.anchorNode && this.focusNode ? 1 : 0 }
  get type(): "None" | "Caret" | "Range" { return this.rangeCount ? this.isCollapsed ? "Caret" : "Range" : "None" }
  get direction(): SelectionDirection { return this.orientation }

  getRangeAt(index: number): Range {
    if (Number(index) !== 0 || !this.range || this.rangeCount === 0) throw domError("IndexSizeError", "Selection has no range at this index")
    return this.range
  }

  addRange(range: Range): void {
    if (!(range instanceof Range)) throw new TypeError("Selection.addRange requires a semantic Range")
    if (this.rangeCount !== 0 || range.startContainer.getRootNode() !== this.document) return
    this.replace(range, "none")
  }

  removeRange(range: Range): void {
    if (range !== this.range) throw domError("NotFoundError", "The Range is not in this Selection")
    this.removeAllRanges()
  }

  removeAllRanges(): void { this.replace(null, "none") }
  empty(): void { this.removeAllRanges() }

  collapse(node: Node | null, offset = 0): void {
    if (node === null) return this.removeAllRanges()
    const point = validateBoundary(node, offset)
    if (node.getRootNode() !== this.document) return
    const range = this.document.createRange()
    range.setStart(node, point.offset)
    range.collapse(true)
    this.replace(range, "none")
  }

  setPosition(node: Node | null, offset = 0): void { this.collapse(node, offset) }

  collapseToStart(): void {
    if (!this.range) throw domError("InvalidStateError", "The Selection is empty")
    this.collapse(this.range.startContainer, this.range.startOffset)
  }

  collapseToEnd(): void {
    if (!this.range) throw domError("InvalidStateError", "The Selection is empty")
    this.collapse(this.range.endContainer, this.range.endOffset)
  }

  extend(node: Node, offset = 0): void {
    const focus = validateBoundary(node, offset)
    if (node.getRootNode() !== this.document) return
    if (!this.range || !this.anchorNode) throw domError("InvalidStateError", "The Selection is empty")
    this.setBaseAndExtent(this.anchorNode, this.anchorOffset, focus.node, focus.offset)
  }

  setBaseAndExtent(anchorNode: Node, anchorOffset: number, focusNode: Node, focusOffset: number): void {
    const anchor = validateBoundary(anchorNode, anchorOffset)
    const focus = validateBoundary(focusNode, focusOffset)
    if (anchorNode.getRootNode() !== this.document || focusNode.getRootNode() !== this.document) return
    const comparison = compareRangeBoundaries(anchor, focus)
    const range = this.document.createRange()
    const start = comparison > 0 ? focus : anchor
    const end = comparison > 0 ? anchor : focus
    range.setStart(start.node, start.offset)
    range.setEnd(end.node, end.offset)
    this.replace(range, comparison > 0 ? "backward" : comparison < 0 ? "forward" : "none")
  }

  selectAllChildren(node: Node): void {
    validateBoundary(node, 0)
    if (node.getRootNode() !== this.document) return
    this.setBaseAndExtent(node, 0, node, nodeLength(node))
  }

  containsNode(node: Node, allowPartialContainment = false): boolean {
    if (!this.range || node.getRootNode() !== this.document) return false
    if (allowPartialContainment) return this.range.intersectsNode(node)
    if (!node.parentNode) return false
    const index = node.parentNode.childNodes.indexOf(node)
    return this.range.comparePoint(node.parentNode, index) === 0 &&
      this.range.comparePoint(node.parentNode, index + 1) === 0
  }

  deleteFromDocument(): void { this.range?.deleteContents() }
  toString(): string { return this.range?.toString() ?? "" }

  private replace(range: Range | null, direction: SelectionDirection): void {
    if (range === this.range && direction === this.orientation) return
    this.releaseRange?.()
    this.range = range
    this.orientation = direction
    this.releaseRange = range ? subscribeRange(range, reordered => {
      if (reordered) this.orientation = this.orientation === "backward" ? "forward" : "backward"
      this.scheduleChange()
    }) : null
    this.scheduleChange()
  }

  private scheduleChange(): void {
    if (this.eventScheduled) return
    this.eventScheduled = true
    queueMicrotask(() => {
      this.eventScheduled = false
      this.document.dispatchEvent(new Event("selectionchange"))
    })
  }
}
