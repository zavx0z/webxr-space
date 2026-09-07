import {HTMLElement, textOffsetAtPosition, textPositionAtOffset, type Document, type Node, type Range} from "@zavx0z/dom"
import {caretPositionAtPoint, getRangeClientRects, readCanonicalRenderFrameChanges, type PointerInput, type RenderFrame} from "@zavx0z/renderer"

export type DocumentSelectionKeyInput = Readonly<{
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  isComposing?: boolean
  defaultPrevented?: boolean
  preventDefault(): void
}>

type Position = Readonly<{node: Node; offset: number}>
type Drag = Readonly<{root: Node; pointer: PointerInput; selectionRoot: Node}>

/** Uses the Experience's existing keyboard dispatch and frame tick; owns no listeners or clock. */
export function createDocumentSelectionInput(options: Readonly<{
  document: Document
  readFrames(): readonly RenderFrame[]
  readActiveFrame?(): RenderFrame | null
  isSelectionActive(root: Node, pointerId: number): boolean
  requestFrame(): void
}>) {
  const document = options.document
  let preferredX: number | null = null
  let drag: Drag | null = null
  let caretRange: Range | null = null
  let disposed = false
  let textCache: Readonly<{root: Node; source: RenderFrame["displayList"]; text: string;
    graphemes: readonly number[]; words: readonly number[]}> | null = null

  const currentFrame = (): RenderFrame | null => {
    const focus = document.getSelection().focusNode
    return options.readFrames().find(frame => focus !== null && frame.root.contains(focus)) ??
      options.readActiveFrame?.() ?? options.readFrames()[0] ?? null
  }

  const ignoredKeyboardTarget = (): boolean => {
    const active = document.activeElement
    return active instanceof HTMLElement && (active.isContentEditable ||
      ["input", "textarea", "select"].includes(active.localName))
  }

  function keyDown(input: DocumentSelectionKeyInput): boolean {
    if (disposed || input.defaultPrevented || input.isComposing || ignoredKeyboardTarget()) return false
    const modifier = input.metaKey || input.ctrlKey
    const selection = document.getSelection()
    if (modifier && !input.altKey && input.key.toLowerCase() === "a") {
      const root = options.readActiveFrame?.()?.root ?? currentFrame()?.root ?? document.documentElement
      if (root === null || root === undefined) return false
      selection.selectAllChildren(root)
      preferredX = null
      input.preventDefault()
      options.requestFrame()
      return true
    }
    if (!input.shiftKey || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(input.key) ||
      selection.anchorNode === null || selection.focusNode === null) return false
    const frame = currentFrame()
    if (frame === null) return false
    const focus = {node: selection.focusNode, offset: selection.focusOffset}
    const root = selectionBoundary(frame, selection.anchorNode)
    let next: Position | null = null
    const home = input.key === "Home" || input.key === "ArrowLeft" && input.metaKey
    const end = input.key === "End" || input.key === "ArrowRight" && input.metaKey
    const vertical = input.key === "ArrowUp" || input.key === "ArrowDown"
    if (modifier && (input.key === "Home" || input.key === "End") || input.metaKey && vertical) {
      next = textPositionAtOffset(root, input.key === "Home" || input.key === "ArrowUp" ? 0 : Number.MAX_SAFE_INTEGER)
      preferredX = null
    } else if (home || end || vertical) {
      caretRange ??= document.createRange()
      caretRange.setStart(focus.node, focus.offset)
      caretRange.collapse(true)
      const rect = getRangeClientRects(frame, caretRange, {caret: true})[0]
      if (!rect) return false
      const x = home ? -1_000_000_000 : end ? 1_000_000_000 : preferredX ?? rect.x
      const y = rect.y + rect.height / 2 + (vertical ? (input.key === "ArrowUp" ? -rect.height : rect.height) : 0)
      const point = caretPositionAtPoint(frame, x, y, {nearest: true, root})
      if (point) next = {node: point.offsetNode, offset: point.offset}
      preferredX = vertical ? x : null
    } else {
      const offset = textOffsetAtPosition(root, focus.node, focus.offset)
      if (offset === null) return false
      const source = readCanonicalRenderFrameChanges(frame)?.scroll?.source.displayList ?? frame.displayList
      if (textCache?.root !== root || textCache.source !== source) {
        const text = root.textContent ?? ""
        textCache = {root, source, text,
          graphemes: [...new Intl.Segmenter(undefined, {granularity: "grapheme"}).segment(text)].map(segment => segment.index),
          words: [...new Intl.Segmenter(undefined, {granularity: "word"}).segment(text)]
            .filter(segment => segment.isWordLike).flatMap(segment => [segment.index, segment.index + segment.segment.length]),
        }
      }
      const backward = input.key === "ArrowLeft"
      const positions = input.ctrlKey || input.altKey
        ? textCache.words : textCache.graphemes
      let low = 0
      let high = positions.length
      while (low < high) {
        const middle = (low + high) >>> 1
        if (positions[middle]! < offset || !backward && positions[middle] === offset) low = middle + 1
        else high = middle
      }
      const boundary = backward ? positions[low - 1] ?? 0 : positions[low] ?? textCache.text.length
      next = textPositionAtOffset(root, boundary)
      preferredX = null
    }
    if (next === null) return false
    selection.setBaseAndExtent(selection.anchorNode, selection.anchorOffset, next.node, next.offset)
    input.preventDefault()
    options.requestFrame()
    return true
  }

  function updatePointer(frame: RenderFrame, pointer: PointerInput, selectionActive: boolean): void {
    if (disposed || !selectionActive || frame.document !== document) {
      if (drag?.pointer.pointerId === pointer.pointerId || !selectionActive) drag = null
      return
    }
    const anchor = document.getSelection().anchorNode
    if (anchor === null || !frame.root.contains(anchor)) return
    drag = {root: frame.root, pointer: Object.freeze({...pointer}), selectionRoot: selectionBoundary(frame, anchor)}
    preferredX = null
    options.requestFrame()
  }

  function clearPointer(pointerId?: number): void {
    if (pointerId === undefined || (drag?.pointer.pointerId ?? 1) === pointerId) drag = null
  }

  function advance(elapsedMs: number): boolean {
    if (disposed || drag === null || !Number.isFinite(elapsedMs) || elapsedMs <= 0) return false
    const current = drag
    if (!options.isSelectionActive(current.root, current.pointer.pointerId ?? 1)) {
      drag = null
      return false
    }
    const selection = document.getSelection()
    const anchor = selection.anchorNode
    if (anchor === null || !current.selectionRoot.contains(anchor)) {
      drag = null
      return false
    }
    const frame = options.readFrames().find(frame => frame.root === current.root)
    if (!frame) return false
    const elapsed = Math.min(elapsedMs, 50) / 1000
    for (let node: Node | null = anchor instanceof HTMLElement ? anchor : anchor.parentElement;
      node !== null && current.root.contains(node); node = node.parentNode) {
      if (!(node instanceof HTMLElement)) continue
      const scroll = frame.scrolls.get(node)
      const box = frame.boxByNode.get(node)
      if (!scroll || !box || box.transform.scaleX === 0 || box.transform.scaleY === 0) continue
      const x = (current.pointer.clientX - box.transform.translateX) / box.transform.scaleX
      const y = (current.pointer.clientY - box.transform.translateY) / box.transform.scaleY
      const left = box.x + box.border.widths.left
      const top = box.y + box.border.widths.top
      const outsideX = x < left ? x - left : x > left + scroll.clientWidth ? x - left - scroll.clientWidth : 0
      const outsideY = y < top ? y - top : y > top + scroll.clientHeight ? y - top - scroll.clientHeight : 0
      const velocity = (distance: number) => Math.sign(distance) * Math.min(1200, Math.abs(distance) * 24)
      const nextLeft = Math.max(0, Math.min(scroll.maxScrollLeft, scroll.scrollLeft + velocity(outsideX) * elapsed))
      const nextTop = Math.max(0, Math.min(scroll.maxScrollTop, scroll.scrollTop + velocity(outsideY) * elapsed))
      const dx = nextLeft - scroll.scrollLeft
      const dy = nextTop - scroll.scrollTop
      if (dx === 0 && dy === 0) continue
      document.transaction(() => {
        node.scrollLeft = nextLeft
        node.scrollTop = nextTop
        // The current frame precedes this scroll. Compensate its retained geometry
        // by the exact scroll delta when resolving the newly exposed text boundary.
        const point = caretPositionAtPoint(frame,
          current.pointer.clientX + dx * box.transform.scaleX,
          current.pointer.clientY + dy * box.transform.scaleY,
          {nearest: true, root: current.selectionRoot})
        if (point) selection.setBaseAndExtent(anchor, selection.anchorOffset, point.offsetNode, point.offset)
      })
      options.requestFrame()
      return true
    }
    return false
  }

  return Object.freeze({keyDown, updatePointer, clearPointer, advance, dispose() {
    disposed = true
    drag = null
    caretRange = null
    textCache = null
  }})
}

function selectionBoundary(frame: RenderFrame, anchor: Node): Node {
  for (let node: Node | null = anchor; node !== null && frame.root.contains(node); node = node.parentNode) {
    const mode = frame.boxByNode.get(node)?.userSelect
    if (mode === "contain" || mode === "all" &&
      (node.parentNode === null || frame.boxByNode.get(node.parentNode)?.userSelect !== "all")) return node
  }
  return frame.root
}
