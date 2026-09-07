import type {HTMLElement} from "@zavx0z/dom/html-element"
import type {InputEvent} from "@zavx0z/dom/input-event"
import type {CompositionEvent} from "@zavx0z/dom/composition-event"
import type {KeyboardEvent} from "@zavx0z/dom/keyboard-event"
import type {PointerEvent} from "@zavx0z/dom/pointer-event"
import type {ClipboardEvent} from "@zavx0z/dom/clipboard-event"
import type {Event, EventListener} from "@zavx0z/dom"
import {textOffsetAtPosition, textPositionAtOffset} from "@zavx0z/dom/text-position"
import {clearDocumentTextHighlights, setDocumentTextHighlights} from "@zavx0z/dom/text-highlights"
import {CodeEditorModel, type CodeEditorRange} from "../../code-editor-model.ts"
import {Range} from "@zavx0z/dom/range"
import type {CodeEditorHandle, CodeEditorSelectionSet} from "./model.ts"

export type CodeEditorInteraction = Readonly<{sync(): void; dispose(): void}>

/** Public widget selection port. Readonly snapshots project, never replace, cross-block Document selection. */
export function createCodeEditorHandle(
  root: HTMLElement,
  model: CodeEditorModel,
  onChange: (selection: CodeEditorSelectionSet) => void,
): Readonly<{handle: CodeEditorHandle; dispose(): void}> {
  const document = root.ownerDocument!
  let disposed = false
  let setting = false
  const read = (): CodeEditorSelectionSet => {
    const state = model.snapshot
    if (!state.readOnly) return Object.freeze({selections: state.selections, primary: state.primary})
    const selected = document.getSelection()
    const range = selected.rangeCount ? selected.getRangeAt(0) : null
    const previous = state.selections[state.primary]?.head ?? 0
    let anchor = previous
    let head = previous
    if (range && range.intersectsNode(root)) {
      const contents = document.createRange()
      contents.selectNodeContents(root)
      const start = range.compareBoundaryPoints(Range.START_TO_START, contents) < 0 ? 0
        : textOffsetAtPosition(root, range.startContainer, range.startOffset) ?? 0
      const end = range.compareBoundaryPoints(Range.END_TO_END, contents) > 0 ? state.value.length
        : textOffsetAtPosition(root, range.endContainer, range.endOffset) ?? state.value.length
      anchor = selected.direction === "backward" ? end : start
      head = selected.direction === "backward" ? start : end
    }
    return Object.freeze({primary: 0, selections: Object.freeze([Object.freeze({anchor, head})])})
  }
  let previous = read()
  const emit = () => {
    if (disposed || setting) return
    const next = read()
    if (previous.primary === next.primary && previous.selections.length === next.selections.length &&
      previous.selections.every((range, index) => range.anchor === next.selections[index]!.anchor && range.head === next.selections[index]!.head)) return
    previous = next
    onChange(next)
  }
  const handle: CodeEditorHandle = Object.freeze({
    focus() { root.focus({preventScroll: true}) },
    isFocused() { return document.activeElement === root },
    getSelection: read,
    scrollToLine(line, options = {}) {
      if (!Number.isSafeInteger(line) || line < 0) throw new RangeError("Editor line must be a non-negative integer")
      root.querySelector(`[data-line-index="${line}"]`)?.scrollIntoView({block: options.block ?? "nearest", inline: "nearest"})
    },
    setSelections(selections, primary = 0) {
      setting = true
      try {
        model.setSelections(selections, primary)
        if (model.snapshot.readOnly) {
          const range = model.snapshot.selections[model.snapshot.primary]!
          const anchor = textPositionAtOffset(root, range.anchor)
          const head = textPositionAtOffset(root, range.head)
          document.getSelection().setBaseAndExtent(anchor.node, anchor.offset, head.node, head.offset)
        }
      } finally { setting = false }
      emit()
    },
  })
  const onSelectionChange = () => { if (model.snapshot.readOnly) emit() }
  document.addEventListener("selectionchange", onSelectionChange)
  const release = model.subscribe(emit)
  return {handle, dispose() {
    disposed = true
    release()
    document.removeEventListener("selectionchange", onSelectionChange)
  }}
}

/** Binds one semantic editing host to the shared model; it never listens to native window/canvas input. */
export function attachCodeEditorInteraction(root: HTMLElement, model: CodeEditorModel): CodeEditorInteraction {
  const document = root.ownerDocument!
  const owner = {}
  let disposed = false
  let syncing = false
  let additive: readonly CodeEditorRange[] | null = null
  let selectionGesture: Readonly<{pointerId: number}> | null = null
  let lastComposition: string | null = null
  let mirrored: CodeEditorRange | null = null
  let renderedValue = model.snapshot.value
  const listeners: Array<Readonly<{type: string; listener: EventListener}>> = []

  const readPrimary = (): CodeEditorRange | null => {
    const selection = document.getSelection()
    if (!selection.anchorNode || !selection.focusNode) return null
    const anchor = textOffsetAtPosition(root, selection.anchorNode, selection.anchorOffset)
    const head = textOffsetAtPosition(root, selection.focusNode, selection.focusOffset)
    return anchor === null || head === null ? null : {anchor, head}
  }

  const project = () => {
    if (disposed || model.snapshot.readOnly || renderedValue !== model.snapshot.value) return
    const active = document.activeElement
    if (active !== root && (!active || !root.contains(active))) return
    const snapshot = model.snapshot
    const primary = snapshot.selections[snapshot.primary]!
    syncing = true
    try {
      const anchor = textPositionAtOffset(root, primary.anchor)
      const head = textPositionAtOffset(root, primary.head)
      mirrored = primary
      document.getSelection().setBaseAndExtent(anchor.node, anchor.offset, head.node, head.offset)
      const ranges = snapshot.selections.filter((_range, index) => index !== snapshot.primary).map(range => {
        const start = textPositionAtOffset(root, Math.min(range.anchor, range.head))
        const end = textPositionAtOffset(root, Math.max(range.anchor, range.head))
        const highlight = document.createRange()
        highlight.setStart(start.node, start.offset)
        highlight.setEnd(end.node, end.offset)
        return highlight
      })
      setDocumentTextHighlights(document, owner, ranges)
    } finally { syncing = false }
  }

  const selectionChanged = () => {
    if (disposed || syncing || model.snapshot.composing) return
    const primary = readPrimary()
    if (!primary) {
      mirrored = null
      clearDocumentTextHighlights(document, owner)
      return
    }
    if (mirrored?.anchor === primary.anchor && mirrored.head === primary.head) return
    mirrored = primary
    if (additive) model.setSelections([...additive, primary], additive.length)
    else model.setSelections([primary])
  }

  const beforeInput = (event: InputEvent) => {
    if (event.defaultPrevented || model.snapshot.readOnly) return
    const text = event.dataTransfer?.getData("text/plain") ?? event.data ?? ""
    switch (event.inputType) {
      case "insertCompositionText":
        event.preventDefault()
        if (!model.snapshot.composing) model.beginComposition()
        model.updateComposition(text)
        return
      case "deleteCompositionText":
        event.preventDefault()
        if (model.snapshot.composing) model.updateComposition("")
        return
      case "insertFromComposition":
        event.preventDefault()
        if (model.snapshot.composing) model.commitComposition(text)
        else if (lastComposition !== text) model.insertText(text)
        lastComposition = null
        return
      case "insertText":
      case "insertReplacementText":
        event.preventDefault()
        model.insertText(text)
        return
      case "insertParagraph":
      case "insertLineBreak":
        event.preventDefault()
        model.insertText("\n")
        return
      case "insertFromPaste":
        event.preventDefault()
        model.paste(text)
        return
      case "deleteContentBackward":
      case "deleteWordBackward":
      case "deleteSoftLineBackward":
      case "deleteHardLineBackward":
        event.preventDefault()
        model.deleteBackward(event.inputType === "deleteWordBackward" ? "word"
          : event.inputType.endsWith("LineBackward") ? "line" : "grapheme")
        return
      case "deleteContentForward":
      case "deleteWordForward":
      case "deleteSoftLineForward":
      case "deleteHardLineForward":
        event.preventDefault()
        model.deleteForward(event.inputType === "deleteWordForward" ? "word"
          : event.inputType.endsWith("LineForward") ? "line" : "grapheme")
        return
      case "deleteByCut":
      case "deleteContent":
        event.preventDefault()
        model.insertText("")
        return
      case "historyUndo":
      case "historyRedo":
        event.preventDefault()
        if (event.inputType === "historyUndo") model.undo()
        else model.redo()
        return
      default:
        // This plaintext model owns all edits, including unsupported rich-text commands.
        // Do not let a native/default mutation desynchronize the keyed TSX text tree.
        event.preventDefault()
    }
  }

  const keyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.isComposing || model.snapshot.composing) return
    const command = event.metaKey || event.ctrlKey
    const extend = event.shiftKey
    const key = event.key.toLowerCase()
    if (command && key === "a") {
      event.preventDefault()
      model.setSelections([{anchor: 0, head: model.snapshot.value.length}])
    } else if (command && (key === "z" || key === "y")) {
      event.preventDefault()
      if (key === "y" || extend) model.redo()
      else model.undo()
    } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault()
      model.move(event.key === "ArrowLeft" ? "backward" : "forward", {
        unit: event.metaKey ? "line" : event.ctrlKey || event.altKey ? "word" : "grapheme", extend,
      })
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault()
      model.move(event.key === "Home" ? "backward" : "forward", {unit: command ? "document" : "line", extend})
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault()
      if (command) model.move(event.key === "ArrowUp" ? "backward" : "forward", {unit: "document", extend})
      else model.moveVertical(event.key === "ArrowUp" ? "up" : "down", {extend})
    } else if (event.key === "Escape" && model.snapshot.selections.length > 1) {
      event.preventDefault()
      model.setSelections([model.snapshot.selections[model.snapshot.primary]!])
    }
    // Character, Backspace/Delete, Enter, Tab and clipboard keys are not synthesized
    // here. Browser's one input lifecycle forwards their beforeinput/clipboard events.
  }

  const copy = (event: ClipboardEvent) => {
    if (event.defaultPrevented || !event.clipboardData) return
    const text = model.selectedText()
    if (text === "") return
    event.clipboardData.setData("text/plain", text)
    event.preventDefault()
    if (event.type === "cut" && !model.snapshot.readOnly) model.insertText("")
  }

  const listen = <T extends Event>(type: string, callback: (event: T) => void) => {
    const listener: EventListener = event => callback(event as T)
    listeners.push({type, listener})
    root.addEventListener(type, listener)
  }
  listen<InputEvent>("beforeinput", beforeInput)
  listen<KeyboardEvent>("keydown", keyDown)
  listen<ClipboardEvent>("copy", copy)
  listen<ClipboardEvent>("cut", copy)
  listen<CompositionEvent>("compositionstart", () => {
    lastComposition = null
    model.beginComposition()
  })
  listen<CompositionEvent>("compositionupdate", event => {
    if (model.snapshot.composing) model.updateComposition(event.data)
  })
  listen<CompositionEvent>("compositionend", event => {
    lastComposition = event.data
    if (event.data === "") model.cancelComposition()
    else model.commitComposition(event.data)
  })
  listen<PointerEvent>("pointerdown", event => {
    if (event.button !== 0) return
    selectionGesture = {pointerId: event.pointerId}
    lastComposition = null
    additive = event.altKey || event.metaKey ? [...model.snapshot.selections] : null
    if (additive === null && model.snapshot.selections.length > 1) {
      model.setSelections([model.snapshot.selections[model.snapshot.primary]!])
    }
  })
  const endSelectionGesture = (event: Event) => {
    const gesture = selectionGesture
    if (!gesture || (event as PointerEvent).pointerId !== gesture.pointerId) return
    const clear = () => {
      if (disposed || selectionGesture !== gesture) return
      selectionGesture = null
      additive = null
    }
    // The final pointerup default can queue selectionchange after event dispatch.
    // A parent can capture the pointer, so completion belongs to this Document.
    if (event.type === "pointerup") queueMicrotask(() => { queueMicrotask(clear) })
    else clear()
  }
  document.addEventListener("pointerup", endSelectionGesture, true)
  document.addEventListener("pointercancel", endSelectionGesture, true)
  listen("focus", project)
  document.addEventListener("selectionchange", selectionChanged)
  const unsubscribe = model.subscribe(project)
  const sync = () => {
    renderedValue = model.snapshot.value
    project()
  }
  sync()
  return {sync, dispose() {
    if (disposed) return
    disposed = true
    selectionGesture = null
    additive = null
    unsubscribe()
    document.removeEventListener("selectionchange", selectionChanged)
    document.removeEventListener("pointerup", endSelectionGesture, true)
    document.removeEventListener("pointercancel", endSelectionGesture, true)
    for (const {type, listener} of listeners) root.removeEventListener(type, listener)
    clearDocumentTextHighlights(document, owner)
  }}
}
