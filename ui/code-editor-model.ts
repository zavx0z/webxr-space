/** A directional, UTF-16 selection in one editor value, independent of DOM nodes. */
export type CodeEditorRange = Readonly<{anchor: number; head: number}>

export type CodeEditorSnapshot = Readonly<{
  value: string
  /** Monotonic text revision, including composition previews and undo/redo. */
  revision: number
  selections: readonly CodeEditorRange[]
  primary: number
  readOnly: boolean
  composing: boolean
  canUndo: boolean
  canRedo: boolean
}>

export type CodeEditorModelOptions = Readonly<{
  value: string
  readOnly?: boolean
  selections?: readonly CodeEditorRange[]
  primary?: number
  historyLimit?: number
}>

export type CodeEditorMovementUnit = "grapheme" | "word" | "line" | "document"

type EditorState = Readonly<{
  value: string
  selections: readonly CodeEditorRange[]
  primary: number
}>

type NormalizedSelections = Pick<EditorState, "selections" | "primary">
type SelectionEntry = {start: number; end: number; backward: boolean; primary: boolean}
type SegmentedLine = {
  graphemes: readonly number[]
  words: readonly Readonly<{start: number; end: number}>[] | null
}

function textValue(value: string): string {
  if (typeof value !== "string") throw new TypeError("Editor value must be a string")
  return value
}

function lineBounds(value: string, position: number): {start: number; end: number} {
  let start = 0
  let end = value.length
  // Stop at the nearest separator of either kind. Two independent indexOf calls
  // would scan an entire LF-only document looking for an absent CR on each key.
  for (let index = position - 1; index >= 0; index--) {
    const character = value.charCodeAt(index)
    if (character === 10 || character === 13 && value.charCodeAt(index + 1) !== 10) {
      start = index + 1
      break
    }
  }
  for (let index = position; index < value.length; index++) {
    const character = value.charCodeAt(index)
    if (character === 10 || character === 13) {
      end = index + (character === 13 && value.charCodeAt(index + 1) === 10 ? 2 : 1)
      break
    }
  }
  return {start, end}
}

function offset(value: number, length: number): number {
  if (!Number.isSafeInteger(value)) throw new RangeError("Editor offsets must be safe integers")
  return Math.max(0, Math.min(length, value))
}

function normalizeSelections(
  value: string,
  ranges: readonly CodeEditorRange[],
  primary: number,
): NormalizedSelections {
  if (ranges.length === 0) return {selections: Object.freeze([Object.freeze({anchor: 0, head: 0})]), primary: 0}
  if (!Number.isSafeInteger(primary) || primary < 0 || primary >= ranges.length) {
    throw new RangeError("Primary selection must identify an existing range")
  }
  const entries = ranges.map((range, index): SelectionEntry => {
    const anchor = offset(range.anchor, value.length)
    const head = offset(range.head, value.length)
    return {start: Math.min(anchor, head), end: Math.max(anchor, head), backward: anchor > head, primary: index === primary}
  }).sort((left, right) => left.start - right.start || right.end - left.end)
  const groups: SelectionEntry[] = []
  for (const entry of entries) {
    const previous = groups.at(-1)
    const touchesCaret = previous && entry.start === previous.end &&
      (entry.start === entry.end || previous.start === previous.end)
    if (previous && (entry.start < previous.end || touchesCaret)) {
      previous.end = Math.max(previous.end, entry.end)
      if (entry.primary) previous.backward = entry.backward
      previous.primary ||= entry.primary
    } else groups.push({...entry})
  }
  return {
    selections: Object.freeze(groups.map(range => Object.freeze(range.backward
      ? {anchor: range.end, head: range.start}
      : {anchor: range.start, head: range.end}))),
    primary: groups.findIndex(range => range.primary),
  }
}

function sameSelections(left: EditorState, right: EditorState): boolean {
  return left.primary === right.primary && left.selections.length === right.selections.length &&
    left.selections.every((range, index) => range.anchor === right.selections[index]!.anchor &&
      range.head === right.selections[index]!.head)
}

function sameState(left: EditorState, right: EditorState): boolean {
  return left.value === right.value && sameSelections(left, right)
}

/** Apply sorted, non-overlapping replacements against one original value. */
function replaceSelections(state: EditorState, texts: readonly string[]): EditorState {
  const parts: string[] = []
  const ranges: CodeEditorRange[] = []
  let sourceOffset = 0
  let outputOffset = 0
  for (let index = 0; index < state.selections.length; index++) {
    const range = state.selections[index]!
    const start = Math.min(range.anchor, range.head)
    const end = Math.max(range.anchor, range.head)
    const replacement = texts[index]!
    const prefix = state.value.slice(sourceOffset, start)
    parts.push(prefix, replacement)
    outputOffset += prefix.length + replacement.length
    ranges.push({anchor: outputOffset, head: outputOffset})
    sourceOffset = end
  }
  parts.push(state.value.slice(sourceOffset))
  const value = parts.join("")
  return {value, ...normalizeSelections(value, ranges, state.primary)}
}

function mapExternalValue(state: EditorState, value: string): EditorState {
  let start = 0
  let oldEnd = state.value.length
  let newEnd = value.length
  while (start < oldEnd && start < newEnd && state.value[start] === value[start]) start++
  while (oldEnd > start && newEnd > start && state.value[oldEnd - 1] === value[newEnd - 1]) {
    oldEnd--
    newEnd--
  }
  const map = (position: number) => position < start ? position
    : position >= oldEnd ? position + newEnd - oldEnd
    : newEnd
  return {value, ...normalizeSelections(value, state.selections.map(range => ({
    anchor: map(range.anchor), head: map(range.head),
  })), state.primary)}
}

/**
 * Headless, single-value editor transactions. It owns no DOM, input listeners,
 * clipboard, layout or rendering resources. All observers receive frozen snapshots.
 * Text commands affect every normalized range atomically; selection-only changes do
 * not enter history. Composition previews always replace the original selection set.
 */
export class CodeEditorModel {
  #state: EditorState
  #snapshot: CodeEditorSnapshot
  #readOnly: boolean
  #revision = 0
  #historyLimit: number
  #undo: EditorState[] = []
  #redo: EditorState[] = []
  #composition: EditorState | null = null
  #listeners = new Set<(snapshot: CodeEditorSnapshot) => void>()
  #lineSegments = new Map<string, SegmentedLine>()
  #graphemeSegmenter: Intl.Segmenter | null = null
  #wordSegmenter: Intl.Segmenter | null = null
  #preferredColumns: readonly number[] | null = null

  constructor(options: CodeEditorModelOptions) {
    const value = textValue(options.value)
    this.#historyLimit = options.historyLimit ?? 100
    if (!Number.isSafeInteger(this.#historyLimit) || this.#historyLimit < 0) {
      throw new RangeError("Editor historyLimit must be a non-negative integer")
    }
    this.#readOnly = options.readOnly ?? false
    if (typeof this.#readOnly !== "boolean") throw new TypeError("Editor readOnly must be a boolean")
    this.#state = {value, ...normalizeSelections(value, options.selections ?? [{anchor: 0, head: 0}], options.primary ?? 0)}
    this.#snapshot = this.#makeSnapshot()
  }

  get snapshot(): CodeEditorSnapshot {
    return this.#snapshot
  }

  /** Subscribes to subsequent state changes, not an immediate initial emission. */
  subscribe(listener: (snapshot: CodeEditorSnapshot) => void): () => void {
    this.#listeners.add(listener)
    return () => { this.#listeners.delete(listener) }
  }

  setSelections(ranges: readonly CodeEditorRange[], primary = 0): boolean {
    if (this.#composition) return false
    this.#preferredColumns = null
    const next = {...this.#state, ...normalizeSelections(this.#state.value, ranges, primary)}
    if (sameSelections(this.#state, next)) return false
    this.#publish(next)
    return true
  }

  addSelection(range: CodeEditorRange): boolean {
    return this.setSelections([...this.#state.selections, range], this.#state.selections.length)
  }

  selectedText(separator = "\n"): string {
    return this.#state.selections.filter(range => range.anchor !== range.head)
      .map(range => this.#state.value.slice(Math.min(range.anchor, range.head), Math.max(range.anchor, range.head)))
      .join(separator)
  }

  /** Non-extended movement first collapses non-empty ranges towards the direction. */
  move(direction: "backward" | "forward", options: Readonly<{unit?: CodeEditorMovementUnit; extend?: boolean}> = {}): boolean {
    if (this.#composition) return false
    const ranges = this.#state.selections.map(range => {
      const position = !options.extend && range.anchor !== range.head
        ? direction === "backward" ? Math.min(range.anchor, range.head) : Math.max(range.anchor, range.head)
        : this.#boundary(range.head, direction, options.unit ?? "grapheme")
      return {anchor: options.extend ? range.anchor : position, head: position}
    })
    return this.setSelections(ranges, this.#state.primary)
  }

  /** Logical unwrapped-line movement, retaining each caret's desired UTF-16 column across short lines. */
  moveVertical(direction: "up" | "down", options: Readonly<{extend?: boolean}> = {}): boolean {
    if (this.#composition) return false
    const columns: number[] = []
    const value = this.#state.value
    const ranges = this.#state.selections.map((range, index) => {
      const line = this.#lineAt(range.head)
      const column = this.#preferredColumns?.[index] ?? range.head - line.start
      columns.push(column)
      const target = direction === "up" ? this.#lineAt(Math.max(0, line.start - 1)) : this.#lineAt(line.end)
      let end = target.end
      if (value[end - 1] === "\n") end--
      if (value[end - 1] === "\r") end--
      const edge = direction === "up" && line.start === 0 ? 0
        : direction === "down" && line.end === value.length && value[line.end - 1] !== "\n" ? value.length
        : Math.min(end, target.start + column)
      const head = this.#graphemeEdge(edge, "backward")
      return {anchor: options.extend ? range.anchor : head, head}
    })
    const changed = this.setSelections(ranges, this.#state.primary)
    if (ranges.length === this.#state.selections.length) this.#preferredColumns = columns
    return changed
  }

  insertText(text: string): boolean {
    textValue(text)
    if (!this.#canEdit()) return false
    return this.#transact(replaceSelections(this.#state, this.#state.selections.map(() => text)))
  }

  /** Equal-count lines/ranges distribute in source order; otherwise insert the whole payload at every range. */
  paste(payload: string | readonly string[]): boolean {
    const rows = typeof payload === "string" ? payload.split(/\r\n|\r|\n/u) : payload.map(textValue)
    const text = typeof payload === "string" ? payload : rows.join("\n")
    if (!this.#canEdit()) return false
    const texts = rows.length === this.#state.selections.length ? rows : this.#state.selections.map(() => text)
    return this.#transact(replaceSelections(this.#state, texts))
  }

  deleteBackward(unit: CodeEditorMovementUnit = "grapheme"): boolean {
    return this.#delete("backward", unit)
  }

  deleteForward(unit: CodeEditorMovementUnit = "grapheme"): boolean {
    return this.#delete("forward", unit)
  }

  undo(): boolean {
    if (this.#readOnly) return false
    if (this.#composition) return this.cancelComposition()
    const previous = this.#undo.pop()
    if (!previous) return false
    this.#redo.push(this.#state)
    this.#publish(previous)
    return true
  }

  redo(): boolean {
    if (!this.#canEdit()) return false
    const next = this.#redo.pop()
    if (!next) return false
    this.#undo.push(this.#state)
    this.#publish(next)
    return true
  }

  setReadOnly(readOnly: boolean): boolean {
    if (typeof readOnly !== "boolean") throw new TypeError("Editor readOnly must be a boolean")
    if (this.#readOnly === readOnly) return false
    const next = this.#composition ?? this.#state
    this.#composition = null
    this.#readOnly = readOnly
    this.#publish(next)
    return true
  }

  /**
   * External value replacement is not an editor transaction: cancels composition and
   * clears undo/redo. Explicitly reset the caret, or map ranges through the smallest
   * single replacement found using the common prefix/suffix (right-affine boundaries).
   */
  replaceValue(value: string, options: Readonly<{selection: "reset" | "map"}>): boolean {
    textValue(value)
    if (options.selection !== "reset" && options.selection !== "map") throw new TypeError("Explicit replacement selection policy required")
    // Controlled consumers echo composition previews through props. An identical
    // value is not an external edit and must not cancel the ongoing IME session.
    if (value === this.#state.value) return false
    const base = this.#composition ?? this.#state
    const next = options.selection === "map" ? mapExternalValue(base, value)
      : {value, ...normalizeSelections(value, [], 0)}
    this.#composition = null
    this.#undo = []
    this.#redo = []
    this.#publish(next)
    return true
  }

  beginComposition(): boolean {
    if (!this.#canEdit()) return false
    this.#composition = this.#state
    this.#publish(this.#state)
    return true
  }

  updateComposition(text: string): boolean {
    textValue(text)
    if (this.#readOnly || !this.#composition) return false
    const base = this.#composition
    const next = replaceSelections(base, base.selections.map(() => text))
    if (sameState(this.#state, next)) return false
    this.#publish(next)
    return true
  }

  /** Optional final text replaces the preview; one committed composition is one undo step. */
  commitComposition(text?: string): boolean {
    if (text !== undefined) textValue(text)
    if (this.#readOnly || !this.#composition) return false
    const base = this.#composition
    const next = text === undefined ? this.#state : replaceSelections(base, base.selections.map(() => text))
    this.#composition = null
    if (!sameState(base, next)) this.#record(base)
    this.#publish(next)
    return true
  }

  cancelComposition(): boolean {
    const base = this.#composition
    if (!base) return false
    this.#composition = null
    this.#publish(base)
    return true
  }

  #canEdit(): boolean {
    return !this.#readOnly && this.#composition === null
  }

  #delete(direction: "backward" | "forward", unit: CodeEditorMovementUnit): boolean {
    if (!this.#canEdit()) return false
    const ranges = this.#state.selections.map(range => {
      if (range.anchor !== range.head) return range
      const other = this.#boundary(range.head, direction, unit)
      // Programmatic UTF-16 carets may lie inside a grapheme: never delete half of it.
      const head = unit === "grapheme" ? this.#graphemeEdge(range.head, direction === "backward" ? "forward" : "backward") : range.head
      return {anchor: head, head: other}
    })
    const normalized = {...this.#state, ...normalizeSelections(this.#state.value, ranges, this.#state.primary)}
    return this.#transact(replaceSelections(normalized, normalized.selections.map(() => "")))
  }

  #record(previous: EditorState): void {
    if (this.#historyLimit > 0) {
      this.#undo.push(previous)
      if (this.#undo.length > this.#historyLimit) this.#undo.shift()
    }
    this.#redo = []
  }

  #transact(next: EditorState): boolean {
    if (sameState(this.#state, next)) return false
    this.#record(this.#state)
    this.#publish(next)
    return true
  }

  #makeSnapshot(): CodeEditorSnapshot {
    return Object.freeze({...this.#state, revision: this.#revision, readOnly: this.#readOnly,
      composing: this.#composition !== null, canUndo: this.#undo.length > 0, canRedo: this.#redo.length > 0})
  }

  #publish(next: EditorState): void {
    if (next.value !== this.#state.value) {
      this.#revision++
      this.#preferredColumns = null
    }
    this.#state = next
    this.#snapshot = this.#makeSnapshot()
    for (const listener of [...this.#listeners]) listener(this.#snapshot)
  }

  #lineAt(position: number): {start: number; end: number; text: string; segments: SegmentedLine} {
    const value = this.#state.value
    const {start, end} = lineBounds(value, position)
    const text = value.slice(start, end)
    let segments = this.#lineSegments.get(text)
    if (!segments) {
      this.#graphemeSegmenter ??= new Intl.Segmenter(undefined, {granularity: "grapheme"})
      segments = {graphemes: [...this.#graphemeSegmenter.segment(text)].map(segment => segment.index), words: null}
      segments.graphemes = [...segments.graphemes, text.length]
      if (this.#lineSegments.size >= 32) this.#lineSegments.delete(this.#lineSegments.keys().next().value!)
    } else this.#lineSegments.delete(text)
    this.#lineSegments.set(text, segments)
    return {start, end, text, segments}
  }

  #graphemeIndex(boundaries: readonly number[], position: number): number {
    let low = 0
    let high = boundaries.length
    while (low < high) {
      const mid = (low + high) >>> 1
      if (boundaries[mid]! < position) low = mid + 1
      else high = mid
    }
    return low
  }

  #graphemeEdge(position: number, direction: "backward" | "forward"): number {
    const line = this.#lineAt(position)
    const boundaries = line.segments.graphemes
    const local = position - line.start
    const index = this.#graphemeIndex(boundaries, local)
    return boundaries[index] === local ? position
      : line.start + boundaries[direction === "backward" ? index - 1 : index]!
  }

  #boundary(position: number, direction: "backward" | "forward", unit: CodeEditorMovementUnit): number {
    const value = this.#state.value
    if (unit === "document") return direction === "backward" ? 0 : value.length
    if (unit === "line") {
      const line = lineBounds(value, position)
      if (direction === "backward") return line.start
      let end = line.end
      if (value[end - 1] === "\n") end--
      if (value[end - 1] === "\r") end--
      return end
    }
    let line = this.#lineAt(position)
    if (unit === "word") {
      for (;;) {
        this.#wordSegmenter ??= new Intl.Segmenter(undefined, {granularity: "word"})
        line.segments.words ??= [...this.#wordSegmenter.segment(line.text)].filter(segment => segment.isWordLike)
          .map(segment => ({start: segment.index, end: segment.index + segment.segment.length}))
        if (direction === "backward") {
          for (let index = line.segments.words.length - 1; index >= 0; index--) {
            const word = line.segments.words[index]!
            if (line.start + word.start < position) return line.start + word.start
          }
          if (line.start === 0) return 0
          line = this.#lineAt(line.start - 1)
        } else {
          const word = line.segments.words.find(word => line.start + word.end > position)
          if (word) return line.start + word.end
          if (line.end === value.length) return value.length
          line = this.#lineAt(line.end)
        }
      }
    }
    const boundaries = line.segments.graphemes
    const local = position - line.start
    const index = this.#graphemeIndex(boundaries, local)
    if (direction === "backward") {
      if (local === 0 && line.start > 0) return line.start - (value[line.start - 1] === "\n" && value[line.start - 2] === "\r" ? 2 : 1)
      return line.start + boundaries[Math.max(0, index - 1)]!
    }
    return line.start + boundaries[Math.min(boundaries.length - 1, index + Number(boundaries[index] === local))]!
  }
}

export function createCodeEditorModel(options: CodeEditorModelOptions): CodeEditorModel {
  return new CodeEditorModel(options)
}
