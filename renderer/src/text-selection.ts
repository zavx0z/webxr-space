import {Text, textOffsetAtPosition, type Node, type Range, type Selection} from "@zavx0z/dom"
import type {RenderFrame, RenderTextMeasurer, RenderTextSource, TextDisplayItem, RenderClip, RenderTransform, RectDisplayItem} from "./types.ts"
import {pointInClip} from "./interaction.ts"
import {readCanonicalRenderFrameChanges} from "./frame-changes.ts"

type SourceFont = Readonly<{
  fontSize: number
  letterSpacing: number
  fontFamily: string
  fontWeight: number
  fontStyle: "normal" | "italic"
}>
type SourceMetrics = {
  font: SourceFont
  measurer: RenderTextMeasurer | undefined
  boundaries: readonly number[] | null
  advances?: Map<number, number>
}
const metricsBySource = new WeakMap<RenderTextSource, SourceMetrics>()
const graphemes = new Intl.Segmenter(undefined, {granularity: "grapheme"})

/** Private source registration survives retained frame projection by source identity. */
export function createTextSource(
  source: RenderTextSource,
  font: SourceFont,
  measurer?: RenderTextMeasurer,
): RenderTextSource {
  const frozen = Object.freeze({...source, offsets: Object.freeze(source.offsets)})
  metricsBySource.set(frozen, {
    font,
    measurer,
    boundaries: null,
  })
  return frozen
}

export type RenderCaretPosition = Readonly<{offsetNode: Node; offset: number}>
export type RenderRangeRect = Readonly<{
  node: Node
  x: number
  y: number
  width: number
  height: number
  clips: readonly RenderClip[]
  transform: RenderTransform
}>

const textItems = (frame: RenderFrame): readonly TextDisplayItem[] => {
  let value = textItemCache.get(frame.displayList)
  if (value === undefined) {
    value = Object.freeze(frame.displayList.filter((item): item is TextDisplayItem =>
      item.kind === "text" && item.node instanceof Text && item.source !== undefined))
    textItemCache.set(frame.displayList, value)
  }
  return value
}
const textItemCache = new WeakMap<readonly unknown[], readonly TextDisplayItem[]>()
const sourceNodeIndexes = new WeakMap<readonly unknown[], ReadonlyMap<Node, readonly number[]>>()

const textForNode = (frame: RenderFrame, node: Node): readonly TextDisplayItem[] => {
  const source = readCanonicalRenderFrameChanges(frame)?.scroll?.source ?? frame
  let index = sourceNodeIndexes.get(source.displayList)
  if (!index) {
    const built = new Map<Node, number[]>()
    for (let position = 0; position < source.displayList.length; position++) {
      const item = source.displayList[position]!
      if (item.kind !== "text" || item.source === undefined) continue
      const entries = built.get(item.node)
      if (entries) entries.push(position)
      else built.set(item.node, [position])
    }
    index = built
    sourceNodeIndexes.set(source.displayList, index)
  }
  return (index.get(node) ?? []).map(position => frame.displayList[position]!)
    .filter((item): item is TextDisplayItem => item.kind === "text")
}

type TextBandIndex = Readonly<{bands: ReadonlyMap<number, readonly number[]>; broad: readonly number[]}>
const bandIndexes = new WeakMap<readonly unknown[], TextBandIndex>()
const bandHeight = 64

const bandIndex = (frame: RenderFrame): TextBandIndex => {
  const cached = bandIndexes.get(frame.displayList)
  if (cached) return cached
  const bands = new Map<number, number[]>()
  const broad: number[] = []
  for (let index = 0; index < frame.displayList.length; index++) {
    const item = frame.displayList[index]!
    if (item.kind !== "text" || !(item.node instanceof Text) || !item.source || item.source.userSelect === "none") continue
    const top = item.y * item.transform.scaleY + item.transform.translateY
    const bottom = top + item.lineHeight * item.transform.scaleY
    const first = Math.floor(Math.min(top, bottom) / bandHeight)
    const last = Math.floor(Math.max(top, bottom) / bandHeight)
    if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last) || last - first > 128) broad.push(index)
    else for (let band = first; band <= last; band++) {
      const values = bands.get(band)
      if (values) values.push(index)
      else bands.set(band, [index])
    }
  }
  const value = {bands, broad}
  bandIndexes.set(frame.displayList, value)
  return value
}

/** Queries retained source bands before materializing scroll-projected text records. */
const textCandidates = (frame: RenderFrame, top: number, bottom: number): readonly TextDisplayItem[] => {
  const scroll = readCanonicalRenderFrameChanges(frame)?.scroll
  const source = scroll?.source ?? frame
  const index = bandIndex(source)
  const indexes = new Set<number>()
  const collect = (minimum: number, maximum: number, accept: (index: number) => boolean) => {
    for (const value of index.broad) if (accept(value)) indexes.add(value)
    const first = Math.floor(minimum / bandHeight)
    const last = Math.floor(maximum / bandHeight)
    for (let band = first; band <= last; band++) for (const value of index.bands.get(band) ?? []) if (accept(value)) indexes.add(value)
  }
  if (scroll) {
    const inside = (index: number) => index >= scroll.displayStart && index < scroll.displayEnd
    collect(top, bottom, index => !inside(index))
    const dy = scroll.dy * scroll.transform.scaleY
    collect(top + dy, bottom + dy, inside)
  } else collect(top, bottom, () => true)
  return [...indexes].sort((left, right) => left - right).map(index => frame.displayList[index]!)
    .filter((item): item is TextDisplayItem => item.kind === "text")
}

const emptyTextBox = (node: Node): boolean => {
  for (let child = node.firstChild; child !== null; child = child.nextSibling) {
    if (child.nodeType === 1 || child instanceof Text && child.data.length > 0) return false
  }
  return !(node instanceof Text)
}

const emptyBoxIndexes = new WeakMap<readonly unknown[], ReadonlyMap<number, readonly number[]>>()
const emptyBoxCandidates = (frame: RenderFrame, y: number): readonly RenderFrame["boxes"][number][] => {
  const scroll = readCanonicalRenderFrameChanges(frame)?.scroll
  const source = scroll?.source ?? frame
  let bands = emptyBoxIndexes.get(source.boxes)
  if (!bands) {
    const built = new Map<number, number[]>()
    for (let index = 0; index < source.boxes.length; index++) {
      const box = source.boxes[index]!
      if (box.display === "inline" || box.userSelect === "none" || box.width <= 0 || box.height <= 0 || !emptyTextBox(box.node)) continue
      const top = box.contentY * box.transform.scaleY + box.transform.translateY
      const bottom = top + box.contentHeight * box.transform.scaleY
      const first = Math.floor(Math.min(top, bottom) / bandHeight)
      const last = Math.floor(Math.max(top, bottom) / bandHeight)
      if (last - first > 4096) continue
      for (let band = first; band <= last; band++) {
        const values = built.get(band)
        if (values) values.push(index)
        else built.set(band, [index])
      }
    }
    bands = built
    emptyBoxIndexes.set(source.boxes, bands)
  }
  const result: RenderFrame["boxes"][number][] = []
  const indexes = new Set([...(bands.get(Math.floor(y / bandHeight)) ?? []),
    ...(scroll ? bands.get(Math.floor((y + scroll.dy * scroll.transform.scaleY) / bandHeight)) ?? [] : [])])
  for (const index of indexes) {
    const box = frame.boxes[index]
    if (box) result.push(box)
  }
  return result
}

const boundariesFor = (item: TextDisplayItem): readonly number[] => {
  const metrics = item.source === undefined ? undefined : metricsBySource.get(item.source)
  if (metrics?.boundaries !== null && metrics?.boundaries !== undefined) return metrics.boundaries
  const boundaries = Object.freeze([...graphemes.segment(item.text)].map(segment => segment.index).concat(item.text.length))
  if (metrics) metrics.boundaries = boundaries
  return boundaries
}

const advanceAt = (item: TextDisplayItem, offset: number): number => {
  if (offset === 0) return 0
  const metrics = item.source === undefined ? undefined : metricsBySource.get(item.source)
  const cached = metrics?.advances?.get(offset)
  if (cached !== undefined) return cached
  const prefix = item.text.slice(0, offset)
  const count = Array.from(prefix).length
  const advance = metrics?.measurer?.measureTextAdvance(prefix, metrics.font.fontSize, metrics.font.letterSpacing, metrics.font) ??
    Math.max(0, count * item.fontSize * 0.6 + Math.max(0, count - 1) * item.letterSpacing)
  if (metrics) (metrics.advances ??= new Map()).set(offset, advance)
  return advance
}

type VisibleBounds = Readonly<{left: number; top: number; right: number; bottom: number}>
type ResolvedClip = Readonly<{clip: RenderClip; transform: RenderTransform}>

const transformedBounds = (x: number, y: number, width: number, height: number, transform: RenderTransform): VisibleBounds => {
  const left = x * transform.scaleX + transform.translateX
  const top = y * transform.scaleY + transform.translateY
  const right = left + width * transform.scaleX
  const bottom = top + height * transform.scaleY
  return {left: Math.min(left, right), top: Math.min(top, bottom), right: Math.max(left, right), bottom: Math.max(top, bottom)}
}

/** A rounded clip's horizontal section is an interval, including under mirrored scales. */
const clipSlice = ({clip, transform}: ResolvedClip, screenY: number): readonly [number, number] => {
  if (!clip.clipX) return [-Infinity, Infinity]
  let left = clip.x
  let right = clip.x + clip.width
  if (clip.clipY) {
    const y = (screenY - transform.translateY) / transform.scaleY
    const inset = (distance: number, radius: Readonly<{x: number; y: number}>): number => {
      if (radius.x <= 0 || radius.y <= 0 || distance >= radius.y) return 0
      const normalized = 1 - Math.max(0, distance) / radius.y
      return radius.x * (1 - Math.sqrt(Math.max(0, 1 - normalized * normalized)))
    }
    left += Math.max(inset(y - clip.y, clip.radii.topLeft), inset(clip.y + clip.height - y, clip.radii.bottomLeft))
    right -= Math.max(inset(y - clip.y, clip.radii.topRight), inset(clip.y + clip.height - y, clip.radii.bottomRight))
  }
  const a = left * transform.scaleX + transform.translateX
  const b = right * transform.scaleX + transform.translateX
  return [Math.min(a, b), Math.max(a, b)]
}

/** Nearest visible line portion, not the unpainted full-history line rectangle. */
const nearestVisiblePoint = (
  frame: RenderFrame,
  bounds: VisibleBounds,
  clips: readonly RenderClip[],
  x: number,
  y: number,
): Readonly<{x: number; y: number}> | null => {
  let left = Math.max(0, bounds.left)
  let right = Math.min(frame.viewport.width, bounds.right)
  let top = Math.max(0, bounds.top)
  let bottom = Math.min(frame.viewport.height, bounds.bottom)
  const resolved: ResolvedClip[] = []
  for (const clip of clips) {
    const transform = clip.presentationOwner === null || clip.presentationOwner === undefined ? clip.transform
      : frame.presentationTransforms?.get(clip.presentationOwner) ?? clip.transform
    if (transform.scaleX === 0 || transform.scaleY === 0 ||
      ![transform.scaleX, transform.scaleY, transform.translateX, transform.translateY].every(Number.isFinite)) return null
    const box = transformedBounds(clip.x, clip.y, clip.width, clip.height, transform)
    if (clip.clipX) {
      left = Math.max(left, box.left)
      right = Math.min(right, box.right)
    }
    if (clip.clipY) {
      top = Math.max(top, box.top)
      bottom = Math.min(bottom, box.bottom)
    }
    resolved.push({clip, transform})
  }
  if (![left, right, top, bottom].every(Number.isFinite) || right <= left || bottom <= top) return null
  // Clip edges are half-open, and a negative scale swaps which visual edge is excluded.
  const insetX = Math.min(1e-7, (right - left) / 4)
  const insetY = Math.min(1e-7, (bottom - top) / 4)
  left += insetX
  right -= insetX
  top += insetY
  bottom -= insetY
  const slice = (at: number): readonly [number, number] => {
    let start = left
    let end = right
    for (const clip of resolved) {
      const interval = clipSlice(clip, at)
      start = Math.max(start, interval[0])
      end = Math.min(end, interval[1])
    }
    return [start, end]
  }
  const gap = (at: number): number => {
    const [start, end] = slice(at)
    return start - end
  }
  let nearestY = Math.max(top, Math.min(bottom, y))
  if (gap(nearestY) >= 0) {
    // Intersections of rounded rectangles are convex. Their horizontal interval
    // gap is convex in y; this rare corner-only path finds its feasible interval.
    let feasible = (top + bottom) / 2
    if (gap(feasible) >= 0) {
      let low = top
      let high = bottom
      for (let iteration = 0; iteration < 48; iteration += 1) {
        const a = low + (high - low) / 3
        const b = high - (high - low) / 3
        if (gap(a) <= gap(b)) high = b
        else low = a
      }
      feasible = (low + high) / 2
      if (gap(feasible) >= 0) return null
    }
    let outside = nearestY
    for (let iteration = 0; iteration < 48; iteration += 1) {
      const middle = (outside + feasible) / 2
      if (gap(middle) < 0) feasible = middle
      else outside = middle
    }
    nearestY = feasible
  }
  const [start, end] = slice(nearestY)
  const nearestX = Math.max(start, Math.min(end, x))
  return Number.isFinite(nearestX) ? {x: nearestX, y: nearestY} : null
}

/** Exact source offset from the renderer's own shaping advance, never a fixed-width guess. */
export function caretPositionAtPoint(
  frame: RenderFrame,
  x: number,
  y: number,
  options: Readonly<{nearest?: boolean; root?: Node}> = {},
): RenderCaretPosition | null {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  let best: TextDisplayItem | null = null
  let distance = Infinity
  let localX = 0
  let bestY = 0
  let empty: Node | null = null
  for (const box of emptyBoxCandidates(frame, y)) {
    if (options.root && !options.root.contains(box.node)) continue
    const px = (x - box.transform.translateX) / box.transform.scaleX
    const py = (y - box.transform.translateY) / box.transform.scaleY
    if (px >= box.contentX && px <= box.contentX + box.contentWidth && py >= box.contentY && py < box.contentY + box.contentHeight &&
      (frame.hits.get(box.node)?.clips.every(clip => pointInClip(frame, clip, x, y)) ?? true)) empty = box.node
  }
  if (empty) return Object.freeze({offsetNode: empty, offset: 0})
  const rootBox = options.root ? frame.boxByNode.get(options.root) : undefined
  let queryY = Math.max(0, Math.min(frame.viewport.height, y))
  if (options.nearest && rootBox) {
    const visible = nearestVisiblePoint(frame,
      transformedBounds(rootBox.contentX, rootBox.contentY, rootBox.contentWidth, rootBox.contentHeight, rootBox.transform),
      frame.hits.get(rootBox.node)?.clips ?? [], x, y)
    if (visible === null) return null
    queryY = visible.y
  }
  const near = textCandidates(frame, queryY - bandHeight, queryY + bandHeight)
  const consider = (item: TextDisplayItem): TextDisplayItem | undefined => {
    if (item.source?.userSelect === "none" || options.root && !options.root.contains(item.node)) return
    const transform = item.transform
    if (transform.scaleX === 0 || transform.scaleY === 0) return
    const px = (x - transform.translateX) / transform.scaleX
    const py = (y - transform.translateY) / transform.scaleY
    const width = item.width ?? advanceAt(item, item.text.length)
    const inside = px >= item.x && px <= item.x + width && py >= item.y && py < item.y + item.lineHeight
    const clipped = !item.clips.every(clip => pointInClip(frame, clip, x, y))
    if (!options.nearest && (!inside || clipped)) return
    const visible = nearestVisiblePoint(frame, transformedBounds(item.x, item.y, width, item.lineHeight, transform), item.clips, x, y)
    if (visible === null) return
    const dy = Math.abs(visible.y - y)
    const dx = Math.abs(visible.x - x)
    // Prefer the nearest visual line, then the nearest fragment within that line.
    const candidate = dy * 1_000_000 + dx
    if (candidate > distance) return
    distance = candidate
    bestY = visible.y
    localX = (visible.x - transform.translateX) / transform.scaleX - item.x
    return item
  }
  for (const item of near) best = consider(item) ?? best
  if (options.nearest && (best === null || Math.abs(bestY - y) > bandHeight)) {
    for (const item of textCandidates(frame, 0, frame.viewport.height)) best = consider(item) ?? best
  }
  if (best === null || !(best.node instanceof Text) || best.source === undefined) return null
  const boundaries = boundariesFor(best)
  let low = 0
  let high = boundaries.length - 1
  while (low < high) {
    const middle = (low + high) >>> 1
    const left = advanceAt(best, boundaries[middle]!)
    const right = advanceAt(best, boundaries[middle + 1]!)
    if (localX > (left + right) / 2) low = middle + 1
    else high = middle
  }
  return Object.freeze({offsetNode: best.node, offset: best.source.offsets[boundaries[low]!] ?? 0})
}

/** Range geometry in the same local coordinate/clip contract as text paint. */
export function getRangeClientRects(frame: RenderFrame, range: Range, options: Readonly<{caret?: boolean; visibleOnly?: boolean}> = {}): readonly RenderRangeRect[] {
  const result: RenderRangeRect[] = []
  if (range.collapsed && options.caret && !(range.startContainer instanceof Text)) {
    const box = frame.boxByNode.get(range.startContainer)
    if (box && box.userSelect !== "none") {
      const rect = clientRect({node: range.startContainer, x: box.contentX, y: box.contentY, width: 1,
        height: box.contentHeight, transform: box.transform, clips: frame.hits.get(range.startContainer)?.clips ?? Object.freeze([])})
      return Object.freeze(options.visibleOnly && !visibleRangeRect(frame, rect) ? [] : [rect])
    }
  }
  const sameText = range.startContainer === range.endContainer && range.startContainer instanceof Text
  for (const item of sameText ? textForNode(frame, range.startContainer)
    : options.visibleOnly ? textCandidates(frame, 0, frame.viewport.height) : textItems(frame)) {
    if (!(item.node instanceof Text) || item.source === undefined || item.source.userSelect === "none") continue
    if (options.visibleOnly && !visibleItem(frame, item)) continue
    const offsets = item.source.offsets
    const first = offsets[0] ?? 0
    const last = offsets.at(-1) ?? first
    if (!range.intersectsNode(item.node) || range.comparePoint(item.node, last) < 0 || range.comparePoint(item.node, first) > 0) continue
    let start = item.node === range.startContainer ? range.startOffset : first
    let end = item.node === range.endContainer ? range.endOffset : last
    start = Math.max(first, start)
    end = Math.min(last, end)
    if (end < start || end === start && !options.caret) continue
    const boundaries = boundariesFor(item)
    const left = boundaries.findLast(index => (offsets[index] ?? first) <= start) ?? 0
    const right = boundaries.find(index => (offsets[index] ?? last) >= end) ?? item.text.length
    const width = end === start ? 1 / Math.max(Math.abs(item.transform.scaleX), 0.001) : advanceAt(item, right) - advanceAt(item, left)
    if (width <= 0) continue
    result.push(clientRect({node: item.node, x: item.x + advanceAt(item, left), y: item.y, width,
      height: item.lineHeight, clips: item.clips, transform: item.transform}))
    if (range.collapsed) break
  }
  if (result.length === 0 && range.collapsed && options.caret) {
    const equivalent = equivalentCaretRect(frame, range)
    if (equivalent && (!options.visibleOnly || visibleRangeRect(frame, equivalent))) result.push(equivalent)
  }
  return Object.freeze(result)
}

/** Invisible separators and empty component fragments may share a visible DOM boundary. */
const equivalentCaretRect = (frame: RenderFrame, range: Range): RenderRangeRect | null => {
  const offset = textOffsetAtPosition(frame.root, range.startContainer, range.startOffset)
  if (offset === null) return null
  const index = logicalCaretIndex(frame)
  const boxIndex = index.empty.get(offset)
  if (boxIndex !== undefined) {
    const box = frame.boxes[boxIndex]!
    return clientRect({node: box.node, x: box.contentX, y: box.contentY, width: 1, height: box.contentHeight,
      transform: box.transform, clips: frame.hits.get(box.node)?.clips ?? []})
  }
  let low = 0
  let high = index.text.length
  while (low < high) {
    const middle = (low + high) >>> 1
    if (index.text[middle]!.start <= offset) low = middle + 1
    else high = middle
  }
  const candidate = index.text[low - 1]
  if (candidate && candidate.end >= offset) {
    const item = frame.displayList[candidate.index] as TextDisplayItem
    const local = offset - candidate.origin
    const boundary = boundariesFor(item).findLast(index => (item.source!.offsets[index] ?? 0) <= local) ?? 0
    return clientRect({node: item.node, x: item.x + advanceAt(item, boundary), y: item.y,
      width: 1 / Math.max(Math.abs(item.transform.scaleX), 0.001), height: item.lineHeight,
      transform: item.transform, clips: item.clips})
  }
  return null
}

type LogicalCaretIndex = Readonly<{
  empty: ReadonlyMap<number, number>
  text: readonly Readonly<{index: number; origin: number; start: number; end: number}>[]
}>
const logicalCaretIndexes = new WeakMap<readonly unknown[], LogicalCaretIndex>()

const logicalCaretIndex = (frame: RenderFrame): LogicalCaretIndex => {
  const source = readCanonicalRenderFrameChanges(frame)?.scroll?.source ?? frame
  const cached = logicalCaretIndexes.get(source.displayList)
  if (cached) return cached
  const empty = new Map<number, number>()
  const text: Array<Readonly<{index: number; origin: number; start: number; end: number}>> = []
  for (let index = 0; index < source.boxes.length; index++) {
    const box = source.boxes[index]!
    if (box.display === "inline" || box.userSelect === "none" || box.contentHeight <= 0 || !emptyTextBox(box.node)) continue
    const offset = textOffsetAtPosition(frame.root, box.node, 0)
    if (offset !== null && !empty.has(offset)) empty.set(offset, index)
  }
  for (let index = 0; index < source.displayList.length; index++) {
    const item = source.displayList[index]!
    if (item.kind !== "text" || item.source === undefined || item.source.userSelect === "none") continue
    const origin = textOffsetAtPosition(frame.root, item.node, 0)
    if (origin === null) continue
    text.push({index, origin, start: origin + (item.source.offsets[0] ?? 0), end: origin + (item.source.offsets.at(-1) ?? 0)})
  }
  text.sort((left, right) => left.start - right.start)
  const value = {empty, text}
  logicalCaretIndexes.set(source.displayList, value)
  return value
}

const identity = Object.freeze({scaleX: 1, scaleY: 1, translateX: 0, translateY: 0})
const clientRect = (rect: RenderRangeRect): RenderRangeRect => {
  const x1 = rect.x * rect.transform.scaleX + rect.transform.translateX
  const y1 = rect.y * rect.transform.scaleY + rect.transform.translateY
  const x2 = x1 + rect.width * rect.transform.scaleX
  const y2 = y1 + rect.height * rect.transform.scaleY
  return Object.freeze({...rect, x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1), transform: identity})
}

const visibleItem = (frame: RenderFrame, item: TextDisplayItem): boolean => {
  const bounds = clientRect({node: item.node, x: item.x, y: item.y, width: item.width ?? frame.boxByNode.get(item.node)?.width ?? 0,
    height: item.lineHeight, clips: item.clips, transform: item.transform})
  return visibleRangeRect(frame, bounds)
}

const visibleRangeRect = (frame: RenderFrame, bounds: RenderRangeRect): boolean => {
  if (bounds.y + bounds.height < 0 || bounds.y > frame.viewport.height || bounds.x + bounds.width < 0 || bounds.x > frame.viewport.width) return false
  for (const clip of bounds.clips) {
    const transform = clip.presentationOwner === null || clip.presentationOwner === undefined ? clip.transform
      : frame.presentationTransforms?.get(clip.presentationOwner) ?? clip.transform
    const clipped = clientRect({node: bounds.node, x: clip.x, y: clip.y, width: clip.width, height: clip.height, transform, clips: []})
    if (clip.clipX && (bounds.x + bounds.width < clipped.x || bounds.x > clipped.x + clipped.width) ||
      clip.clipY && (bounds.y + bounds.height < clipped.y || bounds.y > clipped.y + clipped.height)) return false
  }
  return true
}

/** Source serialization follows rendered block boundaries, excluding non-selectable UI. */
export function readRenderedSelectionText(frames: RenderFrame | readonly RenderFrame[], selection?: Selection | Range): string {
  const list = Array.isArray(frames) ? frames as readonly RenderFrame[] : [frames as RenderFrame]
  const selected = selection ?? list[0]?.document.getSelection()
  if (!selected) return ""
  const range = "rangeCount" in selected ? selected.rangeCount > 0 ? selected.getRangeAt(0) : null : selected
  if (range === null || range.collapsed) return ""
  const sources = new Map<Node, RenderTextSource>()
  const boxes = new Map<Node, RenderFrame["boxes"][number]>()
  for (const frame of list) {
    for (const item of textItems(frame)) if (item.source) sources.set(item.node, item.source)
    for (const box of frame.boxes) boxes.set(box.node, box)
  }
  const blockOf = (node: Node): Node | null => {
    for (let parent = node.parentNode; parent; parent = parent.parentNode) {
      const box = boxes.get(parent)
      if (box !== undefined && box.display !== "inline") return parent
    }
    return null
  }
  let output = ""
  let previousBlock: Node | null = null
  let emptyBlocks = 0
  let started = false
  let ended = false
  const visit = (node: Node): void => {
    if (ended) return
    if (node instanceof Text) {
      if (node === range.startContainer) started = true
      const included = started
      if (node === range.endContainer) ended = true
      if (!included) return
      const source = sources.get(node) ?? boxes.get(node)
      if (source === undefined || source.userSelect === "none") return
      const start = range.startContainer === node ? range.startOffset : 0
      const end = range.endContainer === node ? range.endOffset : node.data.length
      if (end <= start) {
        if (node === range.endContainer && end === 0 && output !== "" && blockOf(node) !== previousBlock) {
          output += "\n".repeat(emptyBlocks + (output.endsWith("\n") ? 0 : 1))
          emptyBlocks = 0
        }
        return
      }
      const raw = node.data.slice(start, end)
      const text = source.whiteSpace === "pre" ? raw : raw.replace(/[\t\n\f\r ]+/gu, " ")
      if (text === "") return
      const block = blockOf(node)
      if (output !== "" && block !== previousBlock) output += "\n".repeat(emptyBlocks + (output.endsWith("\n") ? 0 : 1))
      emptyBlocks = 0
      output += text
      previousBlock = block
    } else {
      const box = boxes.get(node)
      if (started && output !== "" && box?.display === "block" && box.userSelect !== "none" && box.height > 0 && emptyTextBox(node)) emptyBlocks++
      if (started && "localName" in node && node.localName === "br" && boxes.has(node) && !output.endsWith("\n")) output += "\n"
      const children = node.childNodes
      for (let index = 0; index <= children.length; index++) {
        if (node === range.startContainer && index === range.startOffset) started = true
        if (node === range.endContainer && index === range.endOffset) ended = true
        if (ended) break
        if (index < children.length) visit(children[index]!)
      }
    }
  }
  visit(range.commonAncestorContainer)
  return output + "\n".repeat(emptyBlocks)
}

/** Word selection uses Unicode segmentation across inline element boundaries. */
export function selectTextWordAtPoint(frame: RenderFrame, x: number, y: number): boolean {
  const caret = caretPositionAtPoint(frame, x, y)
  if (caret === null || !(caret.offsetNode instanceof Text)) return false
  const source = textCandidates(frame, y, y).find(item => item.node === caret.offsetNode)?.source
  if (source?.userSelect === "all" && source.selectionRoot) {
    const range = frame.document.createRange()
    range.selectNodeContents(source.selectionRoot)
    frame.document.getSelection().removeAllRanges()
    frame.document.getSelection().addRange(range)
    return true
  }
  let root: Node = caret.offsetNode
  while (root.parentNode && frame.boxByNode.get(root.parentNode)?.display === "inline") root = root.parentNode
  if (root.parentNode) root = root.parentNode
  const nodes: Text[] = []
  const collect = (node: Node) => {
    if (node instanceof Text && frame.boxByNode.get(node)?.userSelect !== "none") nodes.push(node)
    else for (const child of node.childNodes) collect(child)
  }
  collect(root)
  let cursor = 0
  let pointOffset = 0
  const text = nodes.map(node => {
    if (node === caret.offsetNode) pointOffset = cursor + caret.offset
    cursor += node.data.length
    return node.data
  }).join("")
  const words = new Intl.Segmenter(undefined, {granularity: "word"})
  const word = [...words.segment(text)].find(segment => pointOffset >= segment.index && pointOffset < segment.index + segment.segment.length)
  if (!word) return false
  const boundary = (offset: number): RenderCaretPosition => {
    for (const node of nodes) {
      if (offset <= node.data.length) return {offsetNode: node, offset}
      offset -= node.data.length
    }
    return {offsetNode: nodes.at(-1)!, offset: nodes.at(-1)!.data.length}
  }
  const start = boundary(word.index)
  const end = boundary(word.index + word.segment.length)
  frame.document.getSelection().setBaseAndExtent(start.offsetNode, start.offset, end.offsetNode, end.offset)
  return true
}

const border = Object.freeze({widths: Object.freeze({top: 0, right: 0, bottom: 0, left: 0}),
  colors: Object.freeze({top: "transparent", right: "transparent", bottom: "transparent", left: "transparent"}),
  radii: Object.freeze({topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0})})

export function rangeHighlightItems(frame: RenderFrame, range: Range, key: string, color = "#6da4ff", caret = false): readonly RectDisplayItem[] {
  return Object.freeze(getRangeClientRects(frame, range, {caret, visibleOnly: true}).filter(rect => {
    const x = rect.x * rect.transform.scaleX + rect.transform.translateX
    const y = rect.y * rect.transform.scaleY + rect.transform.translateY
    const right = x + rect.width * rect.transform.scaleX
    const bottom = y + rect.height * rect.transform.scaleY
    return Math.max(x, right) >= 0 && Math.min(x, right) <= frame.viewport.width && Math.max(y, bottom) >= 0 && Math.min(y, bottom) <= frame.viewport.height
  }).map((rect, index) => Object.freeze({...rect, kind: "rect" as const, key: `${key}:${index}`, color,
    opacity: range.collapsed ? 1 : 0.35, border, shadow: null})))
}
