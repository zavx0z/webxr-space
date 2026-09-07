import type {Element} from "@zavx0z/dom"

export type FrameIndexRange = Readonly<{start: number; end: number}>
export type FrameSpliceRange = Readonly<{start: number; count: number}>
export type RetainedFrameRange = Readonly<{
  previousStart: number
  nextStart: number
  count: number
  dx: number
  dy: number
}>

/** All ranges address displayList; bounds are half-open and use exact predecessor indexes. */
export type CanonicalStructuralSplice = Readonly<{
  owner: Element
  previousRange: FrameIndexRange
  nextRange: FrameIndexRange
  retained: readonly RetainedFrameRange[]
  inserted: readonly FrameSpliceRange[]
  removed: readonly FrameSpliceRange[]
}>

export type StructuralSourceBlock = Readonly<{
  source: object
  start: number
  count: number
  dx: number
  dy: number
}>

/** Pure range derivation. The caller must obtain blocks from Renderer-owned stream state. */
export function structuralFrameRanges(
  owner: Element,
  previousRange: FrameIndexRange,
  nextRange: FrameIndexRange,
  previous: readonly StructuralSourceBlock[],
  next: readonly StructuralSourceBlock[],
): CanonicalStructuralSplice | null {
  if (!validBlocks(previousRange, previous) || !validBlocks(nextRange, next)) return null
  const before = new Map(previous.map(block => [block.source, block]))
  const after = new Set<object>()
  const retained: RetainedFrameRange[] = []
  const inserted: FrameSpliceRange[] = []
  const removed: FrameSpliceRange[] = []
  let lastPreviousEnd = previousRange.start
  for (const block of next) {
    after.add(block.source)
    const old = before.get(block.source)
    if (old !== undefined && old.count !== block.count) return null
    if (block.count === 0) continue
    if (old === undefined) {
      appendRange(inserted, block.start, block.count)
      continue
    }
    if (old.start < lastPreviousEnd) return null
    lastPreviousEnd = old.start + old.count
    const dx = block.dx - old.dx
    const dy = block.dy - old.dy
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null
    const last = retained.at(-1)
    if (last && last.previousStart + last.count === old.start && last.nextStart + last.count === block.start && last.dx === dx && last.dy === dy) {
      retained[retained.length - 1] = Object.freeze({...last, count: last.count + block.count})
    } else retained.push(Object.freeze({previousStart: old.start, nextStart: block.start, count: block.count, dx, dy}))
  }
  for (const block of previous) if (block.count > 0 && !after.has(block.source)) appendRange(removed, block.start, block.count)
  if (retained.length === 0 || retained.length + inserted.length + removed.length > 128) return null
  return Object.freeze({owner,
    previousRange: Object.freeze({...previousRange}), nextRange: Object.freeze({...nextRange}),
    retained: Object.freeze(retained), inserted: Object.freeze(inserted), removed: Object.freeze(removed),
  })
}

function validBlocks(range: FrameIndexRange, blocks: readonly StructuralSourceBlock[]): boolean {
  if (!Number.isSafeInteger(range.start) || !Number.isSafeInteger(range.end) || range.start < 0 || range.end < range.start) return false
  let end = range.start
  const sources = new Set<object>()
  for (const block of blocks) {
    if (sources.has(block.source) || block.source === null || typeof block.source !== "object" ||
      !Number.isSafeInteger(block.start) || !Number.isSafeInteger(block.count) || block.count < 0 || block.start !== end ||
      !Number.isFinite(block.dx) || !Number.isFinite(block.dy)) return false
    sources.add(block.source)
    end += block.count
    if (!Number.isSafeInteger(end) || end > range.end) return false
  }
  return end === range.end
}

function appendRange(ranges: FrameSpliceRange[], start: number, count: number): void {
  const previous = ranges.at(-1)
  if (previous && previous.start + previous.count === start) ranges[ranges.length - 1] = Object.freeze({...previous, count: previous.count + count})
  else ranges.push(Object.freeze({start, count}))
}
