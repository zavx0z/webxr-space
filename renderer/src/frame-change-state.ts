import type {Element} from "@zavx0z/dom"
import {isImmutableArray} from "./immutable-array.ts"
import type {DisplayItem, RenderFrame, RenderTransform} from "./types.ts"
import type {CanonicalStructuralSplice} from "./frame-structural.ts"

export type CanonicalScrollProjection = Readonly<{
  owner: Element
  source: RenderFrame
  dx: number
  dy: number
  transform: RenderTransform
  displayStart: number
  displayEnd: number
  hitStart: number
  hitEnd: number
  clipDepth: number
}>

export type CanonicalRenderFrameOperation = Readonly<{
  fromIndex: number
  toIndex: number
  count: 1
  replacement: DisplayItem
}>

export type CanonicalRenderFrameChanges = Readonly<{
  previous: RenderFrame
  indexes: readonly number[]
  operations?: readonly CanonicalRenderFrameOperation[]
  scroll?: CanonicalScrollProjection
  structural?: CanonicalStructuralSplice
}>

type StoredCanonicalRenderFrameChanges = Readonly<{
  previous: WeakRef<RenderFrame>
  indexes: readonly number[]
  operations?: readonly CanonicalRenderFrameOperation[]
  scroll?: CanonicalScrollProjection
  structural?: CanonicalStructuralSplice
}>

const canonicalDisplayChanges = new WeakMap<RenderFrame, StoredCanonicalRenderFrameChanges>()
const rendererOwnedFrames = new WeakSet<RenderFrame>()

/** Private producer registration, never exposed by a package export. */
export function markRendererOwnedFrame(frame: RenderFrame): void {
  rendererOwnedFrames.add(frame)
}

/** Reads provenance without structurally trusting caller-authored frozen objects. */
export function isRendererOwnedFrame(frame: RenderFrame): boolean {
  return rendererOwnedFrames.has(frame)
}

export function readCanonicalRenderFrameChangeState(
  frame: RenderFrame,
): CanonicalRenderFrameChanges | null {
  const stored = canonicalDisplayChanges.get(frame)
  if (stored === undefined) return null
  const previous = stored.previous.deref()
  if (previous === undefined) {
    canonicalDisplayChanges.delete(frame)
    return null
  }
  return Object.freeze({
    previous,
    indexes: stored.indexes,
    ...(stored.operations === undefined ? {} : {operations: stored.operations}),
    ...(stored.scroll === undefined ? {} : {scroll: stored.scroll}),
    ...(stored.structural === undefined ? {} : {structural: stored.structural}),
  })
}

export function recordCanonicalRenderFrameChanges(
  frame: RenderFrame,
  previous: RenderFrame,
  indexes: readonly number[],
  operations?: readonly CanonicalRenderFrameOperation[],
  scroll?: CanonicalScrollProjection,
  structural?: CanonicalStructuralSplice,
): void {
  canonicalDisplayChanges.set(frame, Object.freeze({
    previous: new WeakRef(previous),
    indexes: isImmutableArray(indexes) ? indexes : Object.freeze([...indexes]),
    ...(operations === undefined ? {} : {
      operations: Object.freeze(operations.map((operation) => Object.freeze({...operation}))),
    }),
    ...(scroll === undefined ? {} : {scroll: Object.freeze({...scroll})}),
    ...(structural === undefined ? {} : {structural: Object.freeze({...structural,
      previousRange: Object.freeze({...structural.previousRange}), nextRange: Object.freeze({...structural.nextRange}),
      retained: Object.freeze(structural.retained.map(range => Object.freeze({...range}))),
      inserted: Object.freeze(structural.inserted.map(range => Object.freeze({...range}))),
      removed: Object.freeze(structural.removed.map(range => Object.freeze({...range}))),
    })}),
  }))
}

/** Renderer builders publish immutable owned records; arbitrary composers do not. */
export function recordRendererOwnedFrameChanges(
  ...args: Parameters<typeof recordCanonicalRenderFrameChanges>
): void {
  recordCanonicalRenderFrameChanges(...args)
  markRendererOwnedFrame(args[0])
}
