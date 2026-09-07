import type {Document} from "./src/document.ts"
import type {Element} from "./src/element.ts"
import type {Node} from "./src/node.ts"
import type {ScrollBehavior} from "./src/html-element.ts"
import {domError} from "./src/internal/errors.ts"

export type ScrollLogicalPosition = "start" | "center" | "end" | "nearest"
export type ScrollIntoViewOptions = Readonly<{
  behavior?: ScrollBehavior
  block?: ScrollLogicalPosition
  inline?: ScrollLogicalPosition
}>
export type DocumentScrollIntoViewRequest = Readonly<{
  id: number
  target: Element
  block: ScrollLogicalPosition
  inline: ScrollLogicalPosition
  behavior: "auto" | "instant"
}>
type Pending = Readonly<Omit<DocumentScrollIntoViewRequest, "target"> & {target: WeakRef<Element>}> & {mounted: boolean}
type State = {
  next: number
  pending: Map<number, Pending>
  byTarget: WeakMap<Element, number>
  listeners: Set<(request: DocumentScrollIntoViewRequest) => void>
  unsubscribe: (() => void) | null
}
const states = new WeakMap<Document, State>()

function stateFor(document: Document): State {
  let state = states.get(document)
  if (!state) {
    state = {next: 0, pending: new Map(), byTarget: new WeakMap(), listeners: new Set(), unsubscribe: null}
    states.set(document, state)
  }
  return state
}

function prune(document: Document, state: State): void {
  for (const [id, request] of state.pending) {
    const target = request.target.deref()
    if (!target || target.ownerDocument !== document || request.mounted && !target.isConnected) {
      state.pending.delete(id)
      if (target) state.byTarget.delete(target)
    } else if (target.isConnected) request.mounted = true
  }
  if (state.pending.size === 0 && state.unsubscribe !== null) {
    state.unsubscribe()
    state.unsubscribe = null
  }
}

const alignment = (value: unknown, fallback: ScrollLogicalPosition): ScrollLogicalPosition => {
  if (value === undefined) return fallback
  if (value === "start" || value === "center" || value === "end" || value === "nearest") return value
  throw new TypeError(`Unsupported scroll alignment ${String(value)}`)
}

/** Element owns the intent; the renderer fulfills it after a real layout exists. */
export function requestElementScrollIntoView(target: Element, value?: boolean | ScrollIntoViewOptions | null): void {
  const options = typeof value === "boolean" ? {block: value ? "start" as const : "end" as const} : value ?? {}
  if (typeof options !== "object") throw new TypeError("scrollIntoView options must be a boolean or object")
  const behavior: unknown = options.behavior ?? "auto"
  if (behavior === "smooth") throw domError("NotSupportedError", "Smooth scrolling is not implemented")
  if (behavior !== "auto" && behavior !== "instant") throw new TypeError(`Unsupported scroll behavior ${String(behavior)}`)
  const block = alignment(options.block, "start")
  const inline = alignment(options.inline, "nearest")
  const document = target.ownerDocument
  if (document === null) return
  const state = stateFor(document)
  prune(document, state)
  const previous = state.byTarget.get(target)
  if (previous !== undefined) state.pending.delete(previous)
  const id = ++state.next
  const request = Object.freeze({id, target, block, inline, behavior})
  state.pending.set(id, {...request, target: new WeakRef(target), mounted: target.isConnected})
  state.byTarget.set(target, id)
  state.unsubscribe ??= document.subscribeMutations(() => prune(document, state))
  for (const listener of [...state.listeners]) listener(request)
}

export function readDocumentScrollIntoViewRequests(document: Document, root?: Node): readonly DocumentScrollIntoViewRequest[] {
  const state = states.get(document)
  if (!state) return Object.freeze([])
  prune(document, state)
  const requests: DocumentScrollIntoViewRequest[] = []
  for (const request of state.pending.values()) {
    const target = request.target.deref()
    if (!target || root !== undefined && !root.contains(target)) continue
    requests.push(Object.freeze({id: request.id, target, block: request.block, inline: request.inline, behavior: request.behavior}))
  }
  return Object.freeze(requests)
}

export function completeDocumentScrollIntoViewRequest(document: Document, id: number): void {
  const state = states.get(document)
  const request = state?.pending.get(id)
  if (!state || !request) return
  state.pending.delete(id)
  const target = request.target.deref()
  if (target && state.byTarget.get(target) === id) state.byTarget.delete(target)
  prune(document, state)
}

export function clearDocumentScrollIntoViewRequests(document: Document, root: Node): void {
  for (const request of readDocumentScrollIntoViewRequests(document, root)) completeDocumentScrollIntoViewRequest(document, request.id)
}

export function subscribeDocumentScrollIntoViewRequests(document: Document, listener: (request: DocumentScrollIntoViewRequest) => void): () => void {
  const state = stateFor(document)
  state.listeners.add(listener)
  return () => { state.listeners.delete(listener) }
}
