import {Node} from "./src/node.ts"
import {CharacterData} from "./src/character-data.ts"
import {Text} from "./src/text.ts"
import {Element} from "./src/element.ts"
import type {Document} from "./src/document.ts"
import type {DocumentFragment} from "./src/document-fragment.ts"
import {domError} from "./src/internal/errors.ts"
import {
  notifyRange,
  registerLiveRange,
  updateLiveRange,
} from "./src/internal/live-ranges.ts"
import type {RangeMutation} from "./src/internal/live-ranges.ts"
import {textPositionIndex} from "./src/internal/text-position-index.ts"
import {textOffsetAtPosition} from "./text-position.ts"
import {validateRangeInsertion} from "./src/internal/range-insertion.ts"

export type RangeBoundary = Readonly<{node: Node; offset: number}>
export type StaticRangeInit = Readonly<{
  startContainer: Node
  startOffset: number
  endContainer: Node
  endOffset: number
}>

/** DOM tree positions, independent of layout, tokenization and presentation. */
export abstract class AbstractRange {
  protected start: RangeBoundary
  protected end: RangeBoundary

  protected constructor(start: RangeBoundary, end: RangeBoundary) {
    this.start = start
    this.end = end
  }

  get startContainer(): Node { return this.start.node }
  get startOffset(): number { return this.start.offset }
  get endContainer(): Node { return this.end.node }
  get endOffset(): number { return this.end.offset }
  get collapsed(): boolean { return sameBoundary(this.start, this.end) }
}

/** A snapshot: unlike Range its boundaries do not move with subsequent DOM edits. */
export class StaticRange extends AbstractRange {
  constructor(init: StaticRangeInit) {
    assertNode(init.startContainer)
    assertNode(init.endContainer)
    super(
      {node: init.startContainer, offset: unsignedLong(init.startOffset)},
      {node: init.endContainer, offset: unsignedLong(init.endOffset)},
    )
  }
}

/**
 * Live DOM range. Construct with the explicitly owned Document, or use
 * Document.createRange(): this platform has no ambient global Document.
 */
export class Range extends AbstractRange {
  static readonly START_TO_START = 0
  static readonly START_TO_END = 1
  static readonly END_TO_END = 2
  static readonly END_TO_START = 3
  readonly START_TO_START = Range.START_TO_START
  readonly START_TO_END = Range.START_TO_END
  readonly END_TO_END = Range.END_TO_END
  readonly END_TO_START = Range.END_TO_START
  private document: Document
  private unregister: () => void

  constructor(document: Document) {
    super({node: document, offset: 0}, {node: document, offset: 0})
    this.document = document
    this.unregister = registerLiveRange(document, this)
  }

  get commonAncestorContainer(): Node {
    let node = this.start.node
    while (!node.contains(this.end.node)) {
      if (!node.parentNode) return node
      node = node.parentNode
    }
    return node
  }

  setStart(node: Node, offset: number): void {
    const point = validateBoundary(node, offset)
    const end = node.getRootNode() !== this.end.node.getRootNode() ||
      compareRangeBoundaries(point, this.end) > 0 ? point : this.end
    this.replace(point, end)
  }

  setEnd(node: Node, offset: number): void {
    const point = validateBoundary(node, offset)
    const start = node.getRootNode() !== this.start.node.getRootNode() ||
      compareRangeBoundaries(point, this.start) < 0 ? point : this.start
    this.replace(start, point)
  }

  setStartBefore(node: Node): void { const point = outside(node, false); this.setStart(point.node, point.offset) }
  setStartAfter(node: Node): void { const point = outside(node, true); this.setStart(point.node, point.offset) }
  setEndBefore(node: Node): void { const point = outside(node, false); this.setEnd(point.node, point.offset) }
  setEndAfter(node: Node): void { const point = outside(node, true); this.setEnd(point.node, point.offset) }

  collapse(toStart = false): void {
    const point = toStart ? this.start : this.end
    this.replace(point, point)
  }

  selectNode(node: Node): void {
    this.replace(outside(node, false), outside(node, true))
  }

  selectNodeContents(node: Node): void {
    assertNode(node)
    this.replace({node, offset: 0}, {node, offset: nodeLength(node)})
  }

  compareBoundaryPoints(how: number, sourceRange: Range): -1 | 0 | 1 {
    if (![0, 1, 2, 3].includes(how)) throw domError("NotSupportedError", "Unknown boundary comparison mode")
    const left = how === 0 || how === 3 ? this.start : this.end
    const right = how === 0 || how === 1 ? sourceRange.start : sourceRange.end
    return compareRangeBoundaries(left, right)
  }

  comparePoint(node: Node, offset: number): -1 | 0 | 1 {
    const point = validateBoundary(node, offset)
    if (compareRangeBoundaries(point, this.start) < 0) return -1
    if (compareRangeBoundaries(point, this.end) > 0) return 1
    return 0
  }

  isPointInRange(node: Node, offset: number): boolean {
    if (node.getRootNode() !== this.start.node.getRootNode()) return false
    return this.comparePoint(node, offset) === 0
  }

  intersectsNode(node: Node): boolean {
    if (node.getRootNode() !== this.start.node.getRootNode()) return false
    if (!node.parentNode) return true
    return compareRangeBoundaries(outside(node, false), this.end) < 0 &&
      compareRangeBoundaries(outside(node, true), this.start) > 0
  }

  cloneRange(): Range {
    const clone = new Range(this.document)
    clone.replace(this.start, this.end)
    return clone
  }

  /** Kept as a specified no-op. Live range lifetime follows reachability, not detach(). */
  detach(): void {}

  override toString(): string {
    if (this.collapsed) return ""
    const ancestor = this.commonAncestorContainer
    const index = textPositionIndex(ancestor)
    const from = textOffsetAtPosition(ancestor, this.start.node, this.start.offset)
    const to = textOffsetAtPosition(ancestor, this.end.node, this.end.offset)
    if (from === null || to === null || from === to) return ""
    let low = 0
    let high = index.texts.length
    while (low < high) {
      const middle = (low + high) >>> 1
      if (index.texts[middle]!.end <= from) low = middle + 1
      else high = middle
    }
    let value = ""
    for (let position = low; position < index.texts.length; position += 1) {
      const entry = index.texts[position]!
      if (entry.start >= to) break
      value += entry.node.data.slice(Math.max(0, from - entry.start), Math.min(entry.end, to) - entry.start)
    }
    return value
  }

  cloneContents(): DocumentFragment { return this.processContents("clone") }
  extractContents(): DocumentFragment { return this.processContents("extract") }

  deleteContents(): void {
    if (this.collapsed) return
    this.document.transaction(() => this.removeSelectedContents())
  }

  insertNode(node: Node): void {
    const wasCollapsed = this.collapsed
    const start = this.start
    const startText = start.node instanceof Text ? start.node : null
    const parent = startText ? startText.parentNode : start.node
    if (!parent || start.node.nodeType === Node.COMMENT_NODE || node === start.node) {
      throw domError("HierarchyRequestError", "Range insertion requires a parent that can contain nodes")
    }
    if (node === parent || node.contains(parent) || node.nodeType === Node.DOCUMENT_NODE) {
      throw domError("HierarchyRequestError", "Invalid range insertion")
    }
    parent[validateRangeInsertion](node, startText ?? parent.childNodes[start.offset] ?? null)
    const count = node.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? node.childNodes.length : 1
    this.document.transaction(() => {
      let reference: Node | null = startText ? startText.splitText(start.offset) : parent.childNodes[start.offset] ?? null
      if (node === reference) reference = reference.nextSibling
      let offset = reference ? parent.childNodes.indexOf(reference) : parent.childNodes.length
      // Account for a sibling move without performing an explicit removal:
      // insertBefore owns the platform's state-preserving same-Document reparent.
      if (node.parentNode === parent && parent.childNodes.indexOf(node) < offset) offset -= 1
      parent.insertBefore(node, reference)
      if (wasCollapsed) this.setEnd(parent, offset + count)
    })
  }

  surroundContents(newParent: Node): void {
    if (newParent.nodeType !== Node.ELEMENT_NODE) {
      throw domError("InvalidNodeTypeError", "The surrounding node must be an Element")
    }
    if (newParent.contains(this.start.node) || newParent.contains(this.end.node)) {
      throw domError("HierarchyRequestError", "The surrounding node cannot contain the Range boundaries")
    }
    const ancestor = this.commonAncestorContainer
    const partialNonText = (node: Node): boolean => {
      if (node === ancestor) return false
      if (!(node instanceof Text) && node.contains(this.start.node) !== node.contains(this.end.node)) return true
      return node.childNodes.some(partialNonText)
    }
    if (ancestor.childNodes.some(partialNonText)) {
      throw domError("InvalidStateError", "Range partially contains a non-Text node")
    }
    this.document.transaction(() => {
      const contents = this.extractContents()
      while (newParent.firstChild) newParent.removeChild(newParent.firstChild)
      this.insertNode(newParent)
      newParent.appendChild(contents)
      this.selectNode(newParent)
    })
  }

  [updateLiveRange](mutation: RangeMutation): void {
    const update = (point: RangeBoundary): RangeBoundary => {
      if (mutation.type === "insert") {
        return point.node === mutation.parent && point.offset > mutation.index
          ? {node: point.node, offset: point.offset + 1} : point
      }
      if (mutation.type === "remove") {
        if (!mutation.preserve && mutation.node.contains(point.node)) {
          return {node: mutation.parent, offset: mutation.index}
        }
        return point.node === mutation.parent && point.offset > mutation.index
          ? {node: point.node, offset: point.offset - 1} : point
      }
      if (mutation.type === "split") {
        if (point.node === mutation.node && point.offset > mutation.offset && mutation.parent) {
          return {node: mutation.next, offset: point.offset - mutation.offset}
        }
        if (point.node === mutation.parent && point.offset === mutation.index + 1) {
          return {node: point.node, offset: point.offset + 1}
        }
        return point
      }
      if (point.node !== mutation.node || point.offset <= mutation.offset) return point
      if (point.offset <= mutation.offset + mutation.removed) return {node: point.node, offset: mutation.offset}
      return {node: point.node, offset: point.offset + mutation.added - mutation.removed}
    }
    let start = update(this.start)
    let end = update(this.end)
    const reordered = mutation.type === "insert" &&
      start.node.getRootNode() === end.node.getRootNode() && compareRangeBoundaries(start, end) > 0
    if (reordered) [start, end] = [end, start]
    this.replace(start, end, reordered)
  }

  private replace(start: RangeBoundary, end: RangeBoundary, reordered = false): void {
    if (sameBoundary(start, this.start) && sameBoundary(end, this.end)) return
    this.start = start
    this.end = end
    const document = documentOf(start.node)
    if (document !== this.document) {
      this.unregister()
      this.document = document
      this.unregister = registerLiveRange(document, this)
    }
    notifyRange(this, reordered)
  }

  private selectedNodes(): Node[] {
    const selected: Node[] = []
    const ancestor = this.commonAncestorContainer
    const visit = (node: Node): void => {
      if (node !== ancestor && node.parentNode &&
        compareRangeBoundaries(outside(node, false), this.start) >= 0 &&
        compareRangeBoundaries(outside(node, true), this.end) <= 0) {
        selected.push(node)
        return
      }
      for (const child of node.childNodes) visit(child)
    }
    visit(ancestor)
    return selected
  }

  private removeSelectedContents(): void {
    const start = this.start
    const end = this.end
    if (start.node === end.node && start.node instanceof CharacterData) {
      start.node.deleteData(start.offset, end.offset - start.offset)
      this.collapse(true)
      return
    }
    let collapse = start
    if (!start.node.contains(end.node)) {
      let reference = start.node
      while (reference.parentNode && !reference.parentNode.contains(end.node)) reference = reference.parentNode
      collapse = outside(reference, true)
    }
    // A separate live marker tracks the collapse point while siblings are removed.
    const marker = this.document.createRange()
    marker.setStart(collapse.node, collapse.offset)
    marker.collapse(true)
    const nodes = this.selectedNodes()
    if (start.node instanceof CharacterData) start.node.deleteData(start.offset, start.node.length - start.offset)
    for (const node of nodes) node.parentNode?.removeChild(node)
    if (end.node instanceof CharacterData) end.node.deleteData(0, end.offset)
    this.replace(
      {node: marker.startContainer, offset: marker.startOffset},
      {node: marker.startContainer, offset: marker.startOffset},
    )
  }

  private processContents(mode: "clone" | "extract"): DocumentFragment {
    const fragment = this.document.createDocumentFragment()
    if (this.collapsed) return fragment
    const start = this.start
    const end = this.end
    const ancestor = this.commonAncestorContainer
    const copies = new Map<Node, Node>()
    const copy = (node: Node): Node | null => {
      if (node instanceof CharacterData) {
        if (compareRangeBoundaries({node, offset: node.length}, start) <= 0 ||
          compareRangeBoundaries({node, offset: 0}, end) >= 0) return null
        const from = node === start.node ? start.offset : 0
        const to = node === end.node ? end.offset : node.length
        const clone = node instanceof Text
          ? this.document.createTextNode(node.data.slice(from, to))
          : this.document.createComment(node.data.slice(from, to))
        copies.set(node, clone)
        return clone
      }
      if (node !== ancestor && !this.intersectsNode(node)) return null
      const clone = node instanceof Element ? this.document.createElement(node.localName) : this.document.createDocumentFragment()
      if (node instanceof Element && clone instanceof Element) {
        for (const name of node.getAttributeNames()) clone.setAttribute(name, node.getAttribute(name)!)
      }
      copies.set(node, clone)
      for (const child of node.childNodes) {
        const clonedChild = copy(child)
        if (clonedChild) clone.appendChild(clonedChild)
      }
      return clone
    }
    if (ancestor instanceof CharacterData) {
      const cloned = copy(ancestor)
      if (cloned) fragment.appendChild(cloned)
      if (mode === "extract") this.deleteContents()
      return fragment
    }
    const full = mode === "extract" ? this.selectedNodes() : []
    for (const child of ancestor.childNodes) {
      const cloned = copy(child)
      if (cloned) fragment.appendChild(cloned)
    }
    if (mode === "extract") {
      this.document.transaction(() => {
        // Fully selected subtrees retain their original node identity in the fragment.
        // Keep their clone locations before mutating the source tree.
        const locations = full.map(node => ({node, clone: copies.get(node)}))
        this.deleteContents()
        for (const {node, clone} of locations) {
          if (clone?.parentNode) clone.parentNode.replaceChild(node, clone)
        }
      })
    }
    return fragment
  }
}

export function nodeLength(node: Node): number {
  return node instanceof CharacterData ? node.length : node.childNodes.length
}

export function validateBoundary(node: Node, offset: number): RangeBoundary {
  assertNode(node)
  offset = unsignedLong(offset)
  if (offset > nodeLength(node)) throw domError("IndexSizeError", "Range offset exceeds node length")
  return {node, offset}
}

/** Compare two DOM boundaries in one tree; not a screen-coordinate comparison. */
export function compareRangeBoundaries(left: RangeBoundary, right: RangeBoundary): -1 | 0 | 1 {
  if (left.node === right.node) return left.offset < right.offset ? -1 : left.offset > right.offset ? 1 : 0
  if (left.node.getRootNode() !== right.node.getRootNode()) {
    throw domError("WrongDocumentError", "Range boundaries belong to different trees")
  }
  if (left.node.contains(right.node)) {
    let child = right.node
    while (child.parentNode !== left.node) child = child.parentNode!
    return left.node.childNodes.indexOf(child) < left.offset ? 1 : -1
  }
  if (right.node.contains(left.node)) return compareRangeBoundaries(right, left) === 1 ? -1 : 1
  let leftChild = left.node
  let parent = leftChild.parentNode!
  while (!parent.contains(right.node)) {
    leftChild = parent
    parent = parent.parentNode!
  }
  let rightChild = right.node
  while (rightChild.parentNode !== parent) rightChild = rightChild.parentNode!
  for (let child = parent.firstChild; child; child = child.nextSibling) {
    if (child === leftChild) return -1
    if (child === rightChild) return 1
  }
  throw domError("InvalidStateError", "Invalid DOM boundary ancestry")
}

function sameBoundary(left: RangeBoundary, right: RangeBoundary): boolean {
  return left.node === right.node && left.offset === right.offset
}

function outside(node: Node, after: boolean): RangeBoundary {
  const parent = node.parentNode
  if (!parent) throw domError("InvalidNodeTypeError", "Range boundary node has no parent")
  return {node: parent, offset: parent.childNodes.indexOf(node) + Number(after)}
}

function assertNode(node: Node): void {
  if (!(node instanceof Node)) throw new TypeError("A Range boundary must be a semantic Node")
}

function documentOf(node: Node): Document {
  return node.nodeType === Node.DOCUMENT_NODE ? node as Document : node.ownerDocument!
}

function unsignedLong(value: number): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Math.trunc(numeric) >>> 0 : 0
}
