import {
  ClipboardEvent,
  DataTransfer,
  Document,
  Element,
  HTMLElement,
  HTMLInputElement,
  HTMLTextAreaElement,
  InputEvent,
  readDocumentTextHighlights,
  subscribeDocumentTextHighlights,
  sealDataTransfer,
  type Range,
  type Node,
} from "@zavx0z/dom"

export type ClipboardResult = Readonly<{
  status: "copied" | "pasted" | "empty" | "cancelled" | "stale" | "unavailable" | "error"
  message?: string
}>

export type ClipboardMenuState = Readonly<{
  open: boolean
  x: number
  y: number
  canCopy: boolean
  canPaste: boolean
  pending: boolean
  error: string | null
}>

export type ClipboardAccess = Readonly<{
  readText(): Promise<string>
  writeText(text: string): Promise<void>
}>

type TextControl = HTMLInputElement | HTMLTextAreaElement
type SelectionBoundary = Readonly<{anchorNode: Node | null; anchorOffset: number; focusNode: Node | null; focusOffset: number}>
type Target = Readonly<{
  element: Element | null
  control: TextControl | null
  value: string | null
  start: number
  end: number
  direction: "forward" | "backward" | "none"
  range: Range | null
  backward: boolean
  text: string
  version: number
  selection: SelectionBoundary
  additional: readonly SelectionBoundary[]
}>

export type DocumentClipboardController = Readonly<{
  document: Document
  getSnapshot(): ClipboardMenuState
  subscribe(listener: () => void): () => void
  configure(readSelectionText: () => string, synchronize: () => void, menuPoint?: (target: Element | null) => Readonly<{x: number; y: number}>): void
  openContextMenu(target: Element | null, point?: Readonly<{x: number; y: number}>): boolean
  close(): void
  copy(): Promise<ClipboardResult>
  paste(): Promise<ClipboardResult>
  handleNative(event: globalThis.ClipboardEvent, target?: Element | null): boolean
  dispose(): void
}>
const documentControllers = new WeakMap<Document, DocumentClipboardController>()

/** Reads the existing Experience command owner; never creates another controller. */
export function getDocumentClipboardController(document: Document): DocumentClipboardController | null {
  return documentControllers.get(document) ?? null
}

/** One command owner for native clipboard events, keyboard and a caller-owned menu. */
export function createDocumentClipboardController(
  document: Document,
  options: Readonly<{
    access?: ClipboardAccess
    readSelectionText?: () => string
    requestFrame?: () => void
    synchronizeInput?: () => void
  }> = {},
): DocumentClipboardController {
  if (documentControllers.has(document)) throw new Error("Document already has a clipboard controller")
  const listeners = new Set<() => void>()
  const pasteWatches = new Set<() => void>()
  const clearPasteWatches = () => { for (const release of [...pasteWatches]) release() }
  let disposed = false
  let saved: Target | null = null
  let operation = 0
  let readText = options.readSelectionText ?? (() => document.getSelection().toString())
  let synchronizeInput = options.synchronizeInput ?? (() => {})
  let resolveMenuPoint: (target: Element | null) => Readonly<{x: number; y: number}> = () => ({x: 0, y: 0})
  let state: ClipboardMenuState = Object.freeze({
    open: false, x: 0, y: 0, canCopy: false, canPaste: false, pending: false, error: null,
  })
  const publish = (change: Partial<ClipboardMenuState>) => {
    state = Object.freeze({...state, ...change})
    for (const listener of listeners) listener()
    options.requestFrame?.()
  }
  const access = () => {
    const clipboard = options.access ?? globalThis.navigator?.clipboard
    if (!clipboard) throw new Error("Системный буфер обмена недоступен")
    return clipboard
  }
  const capture = (node: Element | null): Target => {
    let element = node
    while (element !== null && !isTextControl(element) && !isEditable(element)) {
      if (element instanceof HTMLElement && element.contentEditable === "false") break
      element = element.parentElement
    }
    if (element !== null && isEditable(element)) {
      while (element.parentElement !== null && isEditable(element.parentElement)) element = element.parentElement
    }
    element ??= node
    const control = element !== null && isTextControl(element) ? element : null
    const selection = document.getSelection()
    const range = selection.rangeCount === 0 ? null : selection.getRangeAt(0).cloneRange()
    const start = control?.selectionStart ?? 0
    const end = control?.selectionEnd ?? start
    return Object.freeze({
      element,
      control,
      value: control?.value ?? (element !== null && isEditable(element) ? element.textContent : null),
      start,
      end,
      direction: control?.selectionDirection ?? "none",
      range,
      backward: selection.direction === "backward",
      text: control === null ? readText() : control.value.slice(start, end),
      version: document.version,
      selection: readSelectionBoundary(document),
      additional: additionalSelections(document, element),
    })
  }
  const sameSelection = (target: Target): boolean => {
    if (target.control) return target.control.selectionStart === target.start && target.control.selectionEnd === target.end &&
      (target.control.selectionDirection ?? "none") === target.direction
    if (!sameBoundary(target.selection, readSelectionBoundary(document))) return false
    const additional = additionalSelections(document, target.element)
    return target.additional.length === additional.length && target.additional.every((range, index) => sameBoundary(range, additional[index]!))
  }
  const current = () => saved ?? capture(document.activeElement)
  const valid = (target: Target) => !disposed && (target.element === null ||
    target.element.ownerDocument === document && target.element.isConnected)
  const restore = (target: Target) => {
    if (target.element instanceof HTMLElement) target.element.focus({preventScroll: true})
    if (target.control !== null) {
      target.control.setSelectionRange(target.start, target.end, target.direction)
    } else if (target.range !== null) {
      const range = target.range
      document.getSelection().setBaseAndExtent(
        target.backward ? range.endContainer : range.startContainer,
        target.backward ? range.endOffset : range.startOffset,
        target.backward ? range.startContainer : range.endContainer,
        target.backward ? range.startOffset : range.endOffset,
      )
    }
    synchronizeInput()
  }
  const copiedData = (target: Target, type: "copy" | "cut" = "copy", data = new DataTransfer()): Readonly<{data: DataTransfer; accepted: boolean}> | null => {
    if (!valid(target)) return null
    const accepted = (target.element ?? document).dispatchEvent(new ClipboardEvent(type, {
      bubbles: true, cancelable: true, composed: true, clipboardData: data,
    }))
    // Cancelled copy may supply a replacement, per ClipboardEvent's default-action contract.
    if (!accepted && data.types.length === 0) return null
    if (accepted && target.text.length > 0) data.setData("text/plain", target.text)
    return {data, accepted}
  }
  const pasteData = (target: Target, data: DataTransfer): ClipboardResult => {
    if (!valid(target) || target.control !== null && target.control.value !== target.value ||
      target.control === null && target.element?.textContent !== target.value) return {status: "stale"}
    if (target.element === null || !canPasteInto(target.element)) return {status: "unavailable"}
    restore(target)
    sealDataTransfer(data)
    const accepted = target.element.dispatchEvent(new ClipboardEvent("paste", {
      bubbles: true, cancelable: true, composed: true, clipboardData: data,
    }))
    if (!accepted) return {status: "cancelled"}
    const text = data.getData("text/plain")
    if (text.length === 0) return {status: "empty"}
    const beforeInput = new InputEvent("beforeinput", {
      bubbles: true, cancelable: true, composed: true, inputType: "insertFromPaste", data: text, dataTransfer: data,
    })
    if (!target.element.dispatchEvent(beforeInput)) {
      synchronizeInput()
      options.requestFrame?.()
      const changed = target.control !== null ? target.control.value !== target.value : target.element.textContent !== target.value
      return {status: changed ? "pasted" : "cancelled"}
    }
    document.transaction(() => {
      if (target.control !== null) {
        target.control.value = target.control.value.slice(0, target.start) + text + target.control.value.slice(target.end)
        target.control.setSelectionRange(target.start + text.length, target.start + text.length)
      } else {
        const range = document.getSelection().rangeCount === 0 ? document.createRange() : document.getSelection().getRangeAt(0)
        if (!target.element!.contains(range.startContainer) || !target.element!.contains(range.endContainer)) {
          range.selectNodeContents(target.element!)
          range.collapse(false)
        }
        range.deleteContents()
        const node = document.createTextNode(text)
        range.insertNode(node)
        document.getSelection().collapse(node, node.length)
      }
      target.element!.dispatchEvent(new InputEvent("input", {
        bubbles: true, composed: true, inputType: "insertFromPaste", data: text,
      }))
    })
    synchronizeInput()
    options.requestFrame?.()
    return {status: "pasted"}
  }
  const finish = (id: number, result: ClipboardResult): ClipboardResult => {
    if (disposed || id !== operation) return result
    if (result.status === "error" || result.status === "unavailable" || result.status === "stale") {
      publish({pending: false, error: result.message ?? "Цель команды изменилась или недоступна"})
    } else {
      saved = null
      publish({open: false, pending: false, error: null})
    }
    return result
  }
  const controller = Object.freeze({
    document,
    getSnapshot: () => state,
    subscribe(listener: () => void) {
      if (disposed) throw new Error("Clipboard controller is disposed")
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    configure(readSelectionText: () => string, synchronize: () => void, menuPoint?: (target: Element | null) => Readonly<{x: number; y: number}>) {
      readText = readSelectionText
      synchronizeInput = synchronize
      if (menuPoint !== undefined) resolveMenuPoint = menuPoint
    },
    openContextMenu(target: Element | null, position?: Readonly<{x: number; y: number}>): boolean {
      if (disposed || listeners.size === 0) return false
      const point = position ?? resolveMenuPoint(target)
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return false
      saved = capture(target)
      clearPasteWatches()
      operation++
      const hasAdditionalSelection = saved.element !== null && readDocumentTextHighlights(document).some(highlight =>
        !highlight.range.collapsed && saved!.element!.contains(highlight.range.startContainer) && saved!.element!.contains(highlight.range.endContainer))
      publish({open: true, x: point.x, y: point.y, canCopy: saved.text.length > 0 || hasAdditionalSelection,
        canPaste: saved.element !== null && canPasteInto(saved.element), pending: false, error: null})
      return true
    },
    close() {
      clearPasteWatches()
      operation++
      const target = saved
      saved = null
      if (target !== null && valid(target)) restore(target)
      publish({open: false, pending: false, error: null})
    },
    async copy(): Promise<ClipboardResult> {
      if (disposed) return {status: "unavailable"}
      const target = current()
      clearPasteWatches()
      const id = ++operation
      publish({pending: true, error: null})
      try {
        const copied = copiedData(target)
        if (copied === null) return finish(id, {status: "cancelled"})
        const {data} = copied
        const text = data.getData("text/plain")
        if (text.length === 0) return finish(id, {status: "empty"})
        await access().writeText(text)
        return finish(id, {status: "copied"})
      } catch (error) {
        return finish(id, {status: "error", message: error instanceof Error ? error.message : String(error)})
      }
    },
    async paste(): Promise<ClipboardResult> {
      if (disposed) return {status: "unavailable"}
      const target = current()
      if (target.element === null || !canPasteInto(target.element)) return {status: "unavailable"}
      clearPasteWatches()
      const id = ++operation
      publish({pending: true, error: null})
      let selectionChanged = !sameSelection(target)
      const checkSelection = () => { if (!selectionChanged && !sameSelection(target)) selectionChanged = true }
      document.addEventListener("selectionchange", checkSelection)
      const releaseHighlights = subscribeDocumentTextHighlights(document, checkSelection)
      const releaseControl = document.subscribeStateChanges(batch => {
        if (target.control && batch.records.some(record => record.target === target.control &&
          (record.type === "input" || record.type === "textarea") && (record.property === "selection" || record.property === "value"))) selectionChanged = true
      })
      const stopWatching = () => {
        document.removeEventListener("selectionchange", checkSelection)
        releaseHighlights()
        releaseControl()
        pasteWatches.delete(stopWatching)
      }
      pasteWatches.add(stopWatching)
      try {
        const text = await access().readText()
        if (disposed || id !== operation) return {status: "stale"}
        if (selectionChanged || !sameSelection(target)) return finish(id, {status: "stale"})
        const data = new DataTransfer()
        data.setData("text/plain", text)
        return finish(id, pasteData(target, data))
      } catch (error) {
        return finish(id, {status: "error", message: error instanceof Error ? error.message : String(error)})
      } finally {
        stopWatching()
      }
    },
    /** Uses the trusted native ClipboardEvent payload; no permission-prompting read is needed. */
    handleNative(event: globalThis.ClipboardEvent, target = document.activeElement): boolean {
      if (disposed || event.defaultPrevented) return false
      const snapshot = capture(target)
      if (event.type === "copy" || event.type === "cut") {
        if (event.clipboardData === null) return false
        if (event.type === "cut" && (snapshot.element === null || !canPasteInto(snapshot.element))) return false
        let copied: Readonly<{data: DataTransfer; accepted: boolean}> | null
        try {
          // Native payload writes happen synchronously inside semantic setData,
          // before a custom cut handler may commit deletion. A denied handoff
          // therefore cannot delete the editor value or add an undo transaction.
          copied = copiedData(snapshot, event.type, new NativeClipboardDataTransfer(event.clipboardData))
        } catch (error) {
          event.preventDefault()
          publish({pending: false, error: error instanceof Error ? error.message : String(error)})
          return true
        }
        if (copied === null) {
          event.preventDefault()
          return true
        }
        if (copied.data.types.length === 0) return false
        const {accepted} = copied
        event.preventDefault()
        if (event.type === "cut" && accepted && snapshot.element !== null) {
          const input = new InputEvent("beforeinput", {
            bubbles: true, cancelable: true, composed: true, inputType: "deleteByCut", data: null,
          })
          if (snapshot.element.dispatchEvent(input)) {
            document.transaction(() => {
              if (snapshot.control !== null) {
                snapshot.control.value = snapshot.control.value.slice(0, snapshot.start) + snapshot.control.value.slice(snapshot.end)
                snapshot.control.setSelectionRange(snapshot.start, snapshot.start)
              } else if (snapshot.range !== null) {
                snapshot.range.deleteContents()
                document.getSelection().collapse(snapshot.range.startContainer, snapshot.range.startOffset)
              }
              snapshot.element!.dispatchEvent(new InputEvent("input", {
                bubbles: true, composed: true, inputType: "deleteByCut", data: null,
              }))
            })
          }
          synchronizeInput()
          options.requestFrame?.()
        }
        return true
      }
      if (event.type !== "paste" || event.clipboardData === null || snapshot.element === null || !canPasteInto(snapshot.element)) return false
      const data = new DataTransfer()
      data.setData("text/plain", event.clipboardData.getData("text/plain"))
      event.preventDefault()
      pasteData(snapshot, data)
      return true
    },
    dispose() {
      clearPasteWatches()
      disposed = true
      operation++
      saved = null
      listeners.clear()
      documentControllers.delete(document)
    },
  })
  documentControllers.set(document, controller)
  return controller
}

/** Standard string payload with a synchronous native handoff, not an editor command adapter. */
class NativeClipboardDataTransfer extends DataTransfer {
  constructor(private readonly native: globalThis.DataTransfer) { super() }
  override setData(format: string, value: string): void {
    super.setData(format, value)
    this.native.setData(String(format), String(value))
  }
  override clearData(format?: string): void {
    super.clearData(format)
    this.native.clearData(format)
  }
}

function readSelectionBoundary(document: Document): SelectionBoundary {
  const selection = document.getSelection()
  return {anchorNode: selection.anchorNode, anchorOffset: selection.anchorOffset,
    focusNode: selection.focusNode, focusOffset: selection.focusOffset}
}

function additionalSelections(document: Document, element: Element | null): readonly SelectionBoundary[] {
  if (!element) return []
  return readDocumentTextHighlights(document).filter(highlight => element.contains(highlight.range.startContainer) && element.contains(highlight.range.endContainer))
    .map(({range}) => ({anchorNode: range.startContainer, anchorOffset: range.startOffset,
      focusNode: range.endContainer, focusOffset: range.endOffset}))
}

function sameBoundary(left: SelectionBoundary, right: SelectionBoundary): boolean {
  return left.anchorNode === right.anchorNode && left.anchorOffset === right.anchorOffset &&
    left.focusNode === right.focusNode && left.focusOffset === right.focusOffset
}

function isTextControl(element: Element): element is TextControl {
  return element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement && element.selectionStart !== null
}

function isEditable(element: Element): element is HTMLElement {
  return element instanceof HTMLElement && element.isContentEditable
}

function canPasteInto(element: Element): boolean {
  if (isTextControl(element)) return !element.disabled && !element.readOnly
  return isEditable(element)
}
