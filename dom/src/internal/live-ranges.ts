import type {Document} from "../document.ts"
import type {Node} from "../node.ts"

export type RangeMutation =
  | {type: "insert"; parent: Node; index: number}
  | {type: "remove"; parent: Node; node: Node; index: number; preserve: boolean}
  | {type: "data"; node: Node; offset: number; removed: number; added: number}
  | {type: "split"; node: Node; next: Node; offset: number; parent: Node | null; index: number}

export const updateLiveRange = Symbol("update-live-range")
export type LiveRange = {[updateLiveRange](mutation: RangeMutation): void}

const ranges = new WeakMap<Document, Set<WeakRef<LiveRange>>>()
const subscribers = new WeakMap<object, Set<(reordered: boolean) => void>>()
const rangeFinalizer = new FinalizationRegistry<{entries: Set<WeakRef<LiveRange>>; reference: WeakRef<LiveRange>}>(
  ({entries, reference}) => entries.delete(reference),
)

export function hasDocumentRanges(document: Document | null): boolean {
  return document !== null && (ranges.get(document)?.size ?? 0) > 0
}

export function registerLiveRange(document: Document, range: LiveRange): () => void {
  let entries = ranges.get(document)
  if (!entries) ranges.set(document, entries = new Set())
  const reference = new WeakRef(range)
  entries.add(reference)
  rangeFinalizer.register(range, {entries, reference}, reference)
  return () => {
    entries.delete(reference)
    rangeFinalizer.unregister(reference)
  }
}

export function updateDocumentRanges(document: Document | null, mutation: RangeMutation): void {
  if (!document) return
  const entries = ranges.get(document)
  if (!entries) return
  for (const reference of entries) {
    const range = reference.deref()
    if (range) range[updateLiveRange](mutation)
    else entries.delete(reference)
  }
}

export function subscribeRange(range: object, callback: (reordered: boolean) => void): () => void {
  let entries = subscribers.get(range)
  if (!entries) subscribers.set(range, entries = new Set())
  entries.add(callback)
  return () => entries.delete(callback)
}

export function notifyRange(range: object, reordered = false): void {
  for (const callback of subscribers.get(range) ?? []) callback(reordered)
}
