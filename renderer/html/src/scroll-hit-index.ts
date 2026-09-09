import {readCanonicalRenderFrameChanges} from "./frame-changes.ts"
import type {HitMetadata, RenderFrame} from "./types.ts"

type Bounds = Readonly<{index: number; left: number; top: number; right: number; bottom: number}>
type HitIndex = Readonly<{cells: ReadonlyMap<string, readonly Bounds[]>; broad: readonly Bounds[]; paths: readonly number[]}>
const indexes = new WeakMap<readonly HitMetadata[], HitIndex>()
const cellSize = 64
const maximumCells = 256

function indexFor(hits: readonly HitMetadata[]): HitIndex {
  const cached = indexes.get(hits)
  if (cached !== undefined) return cached
  const cells = new Map<string, Bounds[]>()
  const broad: Bounds[] = []
  const paths: number[] = []
  for (let index = 0; index < hits.length; index++) {
    const hit = hits[index]!
    if (hit.path !== undefined) {
      paths.push(index)
      continue
    }
    const {scaleX, scaleY, translateX, translateY} = hit.transform
    const x1 = hit.x * scaleX + translateX
    const x2 = (hit.x + hit.width) * scaleX + translateX
    const y1 = hit.y * scaleY + translateY
    const y2 = (hit.y + hit.height) * scaleY + translateY
    const bounds = {index, left: Math.min(x1, x2), right: Math.max(x1, x2), top: Math.min(y1, y2), bottom: Math.max(y1, y2)}
    const left = Math.floor(bounds.left / cellSize)
    const right = Math.floor(bounds.right / cellSize)
    const top = Math.floor(bounds.top / cellSize)
    const bottom = Math.floor(bounds.bottom / cellSize)
    if (![left, right, top, bottom].every(Number.isSafeInteger) ||
      (right - left + 1) * (bottom - top + 1) > maximumCells) {
      broad.push(bounds)
      continue
    }
    for (let x = left; x <= right; x++) for (let y = top; y <= bottom; y++) {
      const key = `${x}:${y}`
      const entries = cells.get(key)
      if (entries === undefined) cells.set(key, [bounds])
      else entries.push(bounds)
    }
  }
  const result = {cells, broad, paths}
  indexes.set(hits, result)
  return result
}

function candidates(index: HitIndex, x: number, y: number): number[] {
  const result = [...index.paths]
  const contains = (bounds: Bounds) => {
    if (x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom) result.push(bounds.index)
  }
  for (const bounds of index.cells.get(`${Math.floor(x / cellSize)}:${Math.floor(y / cellSize)}`) ?? []) contains(bounds)
  for (const bounds of index.broad) contains(bounds)
  return result
}

/** Candidate pruning only: exact clipping, fragments, paths and paint ownership still use the shared hit policy. */
export function scrollHitCandidates(frame: RenderFrame, x: number, y: number): readonly number[] | undefined {
  const scroll = readCanonicalRenderFrameChanges(frame)?.scroll
  if (scroll?.source.hitOrder === undefined || frame.hitOrder === undefined ||
    scroll.source.hitOrder.length !== frame.hitOrder.length) return undefined
  const index = indexFor(scroll.source.hitOrder)
  const inside = (value: number) => value >= scroll.hitStart && value < scroll.hitEnd
  const fixed = candidates(index, x, y).filter(value => !inside(value))
  const moved = candidates(index, x + scroll.dx * scroll.transform.scaleX, y + scroll.dy * scroll.transform.scaleY).filter(inside)
  return [...new Set([...fixed, ...moved])].sort((left, right) => left - right)
}
