import type {Document} from "./src/document.ts"
import {Range} from "./range.ts"
import {subscribeRange} from "./src/internal/live-ranges.ts"

export type DocumentTextHighlightOptions = Readonly<{color?: string; caretColor?: string}>
export type DocumentTextHighlight = DocumentTextHighlightOptions & Readonly<{owner: object; range: Range}>
type Entry = {highlights: readonly DocumentTextHighlight[]; release: () => void}
type State = {owners: Map<object, Entry>; snapshot: readonly DocumentTextHighlight[]; subscribers: Set<() => void>}
const states = new WeakMap<Document, State>()

/**
 * Nonstandard platform decoration transport for additional editor ranges.
 * It does not change Document.Selection, focus, input routing, or DOM contents.
 * Owners must clear their entry when unmounted. Live Range changes notify consumers.
 */
export function setDocumentTextHighlights(
  document: Document,
  owner: object,
  ranges: readonly Range[],
  options: DocumentTextHighlightOptions = {},
): void {
  if ((typeof owner !== "object" && typeof owner !== "function") || owner === null) {
    throw new TypeError("A text highlight owner must be an object")
  }
  for (const range of ranges) {
    if (!(range instanceof Range) ||
      (range.startContainer !== document && range.startContainer.ownerDocument !== document) ||
      (range.endContainer !== document && range.endContainer.ownerDocument !== document)) {
      throw new TypeError("Text highlight ranges must belong to this Document")
    }
  }
  if (!ranges.length) return clearDocumentTextHighlights(document, owner)
  const state = ensureState(document)
  state.owners.get(owner)?.release()
  const highlights = Object.freeze(ranges.map(range => Object.freeze({
    owner,
    range,
    ...(options.color === undefined ? {} : {color: String(options.color)}),
    ...(options.caretColor === undefined ? {} : {caretColor: String(options.caretColor)}),
  })))
  const releases = ranges.map(range => subscribeRange(range, () => notify(state)))
  state.owners.set(owner, {highlights, release: () => releases.forEach(release => release())})
  refresh(state)
}

export function clearDocumentTextHighlights(document: Document, owner: object): void {
  const state = states.get(document)
  const entry = state?.owners.get(owner)
  if (!state || !entry) return
  entry.release()
  state.owners.delete(owner)
  refresh(state)
}

export function readDocumentTextHighlights(document: Document): readonly DocumentTextHighlight[] {
  return states.get(document)?.snapshot ?? empty
}

export function subscribeDocumentTextHighlights(document: Document, callback: () => void): () => void {
  const state = ensureState(document)
  state.subscribers.add(callback)
  return () => state.subscribers.delete(callback)
}

const empty = Object.freeze([])

function ensureState(document: Document): State {
  let state = states.get(document)
  if (!state) states.set(document, state = {owners: new Map(), snapshot: empty, subscribers: new Set()})
  return state
}

function refresh(state: State): void {
  state.snapshot = Object.freeze([...state.owners.values()].flatMap(entry => entry.highlights))
  notify(state)
}

function notify(state: State): void {
  for (const subscriber of [...state.subscribers]) subscriber()
}
