import type {Element} from "@zavx0z/dom"
import {isImmutableArray} from "./immutable-array.ts"
import type {DisplayItem, RenderFrame, RenderTransform} from "./types.ts"

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
}>

type StoredCanonicalRenderFrameChanges = Readonly<{
  previous: WeakRef<RenderFrame>
  indexes: readonly number[]
  operations?: readonly CanonicalRenderFrameOperation[]
  scroll?: CanonicalScrollProjection
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
  })
}

export function recordCanonicalRenderFrameChanges(
  frame: RenderFrame,
  previous: RenderFrame,
  indexes: readonly number[],
  operations?: readonly CanonicalRenderFrameOperation[],
  scroll?: CanonicalScrollProjection,
): void {
  canonicalDisplayChanges.set(frame, Object.freeze({
    previous: new WeakRef(previous),
    indexes: isImmutableArray(indexes) ? indexes : Object.freeze([...indexes]),
    ...(operations === undefined ? {} : {
      operations: Object.freeze(operations.map((operation) => Object.freeze({...operation}))),
    }),
    ...(scroll === undefined ? {} : {scroll: Object.freeze({...scroll})}),
  }))
}

/** Renderer builders publish immutable owned records; arbitrary composers do not. */
export function recordRendererOwnedFrameChanges(
  ...args: Parameters<typeof recordCanonicalRenderFrameChanges>
): void {
  recordCanonicalRenderFrameChanges(...args)
  markRendererOwnedFrame(args[0])
}
