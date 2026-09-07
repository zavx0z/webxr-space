import {memo, useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore} from "@zavx0z/component"
import {textOffsetAtPosition} from "@zavx0z/dom/text-position"
import {Range} from "@zavx0z/dom/range"
import type {Node as SemanticNode} from "@zavx0z/dom"
import {TextField} from "../fields/text-field.tsx"
import {WidgetHeader, type WidgetHeaderProps} from "../src/shared/widget-header.tsx"
import type {TerminalLine, TerminalModel, TerminalRun} from "../terminal-model.ts"

export type TerminalTextPosition = Readonly<{line: number; col: number}>
export type TerminalSelectionSnapshot = Readonly<{
  anchor: TerminalTextPosition
  focus: TerminalTextPosition
  start: TerminalTextPosition
  end: TerminalTextPosition
  text: string
}>
export type TerminalHandle = Readonly<{
  focus(): void
  isFocused(): boolean
  getSelection(): TerminalSelectionSnapshot | null
  getOutputScrollPosition(): Readonly<{left: number; top: number}>
}>
export type TerminalProps = WidgetHeaderProps & Readonly<{
  model?: TerminalModel | undefined
  lines?: readonly TerminalLine[] | undefined
  input: string
  inputEnabled?: boolean | undefined
  showInput?: boolean | undefined
  inputMode?: "line" | "stream" | undefined
  followOutput?: boolean | undefined
  placeholder?: string | undefined
  onInput?: ((value: string, event: InputEvent) => void) | undefined
  onData?: ((data: string, source: "keyboard" | "paste") => void) | undefined
  onSubmit?: ((value: string, event: KeyboardEvent) => void) | undefined
  onKeyDown?: ((event: KeyboardEvent) => void) | undefined
  onFocusChange?: ((focused: boolean) => void) | undefined
  onReady?: ((handle: TerminalHandle | null) => void) | undefined
  style?: CssStyle | undefined
}>

function TerminalTextRun(props: Readonly<{run: TerminalRun}>) {
  const plain = !props.run.color && !props.run.background && !props.run.bold
  const text = plain ? props.run.text : ""
  return <>
    {text}
    {!plain ? <TerminalStyledRun run={props.run} /> : null}
  </>
}
function TerminalStyledRun(props: Readonly<{run: TerminalRun}>) {
  return <span
    style={css`
      white-space: pre;
      color: ${props.run.color ?? "inherit"};
      background: ${props.run.background ?? "transparent"};
      font-weight: ${props.run.bold ? 700 : 400};
    `}
  >
    {props.run.text}
  </span>
}
function TerminalLineView(props: Readonly<{line: TerminalLine; separator: string}>) {
  return <>
    {props.separator}
    <div
      data-terminal-line={props.line.id}
      style={css`
        display: block;
        min-height: 18px;
        white-space: pre;
        line-height: 18px;
      `}
    >
      {props.line.runs.map((run, index) => <TerminalTextRun
        key={String(index)}
        run={run}
      />)}
    </div>
  </>
}
const MemoTerminalLine = memo(TerminalLineView)
const emptyLines = Object.freeze([])

/** Generic terminal view. ANSI decoding belongs to TerminalModel; transport remains caller-owned. */
export function Terminal(props: TerminalProps) {
  const inputHost = useRef<HTMLDivElement | null>(null)
  const output = useRef<HTMLDivElement | null>(null)
  const composing = useRef(false)
  const finalComposition = useRef<string | null>(null)
  const [, restoreInput] = useState(0)
  const subscribe = useCallback((listener: () => void) => props.model?.subscribe(listener) ?? (() => {}), [props.model])
  const readLines = useCallback(() => props.model?.snapshot.lines ?? props.lines ?? emptyLines, [props.model, props.lines])
  const lines = useSyncExternalStore(subscribe, readLines)
  const currentLines = useRef(lines)
  currentLines.current = lines
  const selectionSource = useRef<Readonly<{lines: readonly TerminalLine[]; text: string; starts: readonly number[]}> | null>(null)
  useLayoutEffect(() => {
    if (props.followOutput !== false) output.current?.lastElementChild?.scrollIntoView({block: "end", inline: "nearest"})
  }, [lines, props.followOutput])
  useLayoutEffect(() => {
    const handle = Object.freeze({
      focus() { inputHost.current?.querySelector<HTMLInputElement>("input")?.focus({preventScroll: true}) },
      isFocused() { return inputHost.current?.querySelector("input") === document.activeElement },
      getSelection(): TerminalSelectionSnapshot | null {
        const root = output.current
        const selection = document.getSelection()
        if (!root || !selection || selection.isCollapsed || !selection.anchorNode || !selection.focusNode) return null
        const range = selection.getRangeAt(0)
        if (!range.intersectsNode(root)) return null
        if (selectionSource.current?.lines !== currentLines.current) {
          const starts = [0]
          const text = currentLines.current.map(line => line.runs.map(run => run.text).join("")).join("\n")
          for (let index = 0; index < text.length; index++) if (text[index] === "\n") starts.push(index + 1)
          selectionSource.current = {lines: currentLines.current, text, starts}
        }
        const {text, starts} = selectionSource.current
        const contents = document.createRange()
        contents.selectNodeContents(root)
        const start = range.compareBoundaryPoints(Range.START_TO_START, contents) < 0 ? 0
          : textOffsetAtPosition(root as unknown as SemanticNode, range.startContainer as unknown as SemanticNode, range.startOffset) ?? 0
        const end = range.compareBoundaryPoints(Range.END_TO_END, contents) > 0 ? text.length
          : textOffsetAtPosition(root as unknown as SemanticNode, range.endContainer as unknown as SemanticNode, range.endOffset) ?? text.length
        if (start === end) return null
        const anchor = selection.direction === "backward" ? end : start
        const focus = selection.direction === "backward" ? start : end
        const position = (offset: number): TerminalTextPosition => {
          let low = 0
          let high = starts.length - 1
          while (low < high) {
            const middle = Math.ceil((low + high) / 2)
            if (starts[middle]! <= offset) low = middle
            else high = middle - 1
          }
          return Object.freeze({line: low, col: offset - starts[low]!})
        }
        return Object.freeze({
          anchor: position(anchor),
          focus: position(focus),
          start: position(Math.min(anchor, focus)),
          end: position(Math.max(anchor, focus)),
          text: text.slice(Math.min(anchor, focus), Math.max(anchor, focus)),
        })
      },
      getOutputScrollPosition() { return Object.freeze({left: output.current?.scrollLeft ?? 0, top: output.current?.scrollTop ?? 0}) },
    })
    props.onReady?.(handle)
    return () => props.onReady?.(null)
  }, [props.onReady])
  const reset = () => restoreInput(revision => revision + 1)
  const onInput = (value: string, event: InputEvent) => {
    if (props.inputMode !== "stream") { props.onInput?.(value, event); return }
    if (composing.current || event.isComposing) return
    const compositionCommit = event.inputType === "insertText" || event.inputType === "insertFromComposition"
    if (compositionCommit && finalComposition.current !== null && (event.data === finalComposition.current || value === finalComposition.current)) {
      finalComposition.current = null
      reset()
      return
    }
    finalComposition.current = null
    if (value !== "") props.onData?.(value, event.inputType === "insertFromPaste" ? "paste" : "keyboard")
    reset()
  }
  const onKeyDown = (event: KeyboardEvent) => {
    props.onKeyDown?.(event)
    if (event.defaultPrevented || props.inputEnabled === false || event.isComposing) return
    finalComposition.current = null
    if (props.inputMode !== "stream") {
      if (event.key === "Enter") { event.preventDefault(); props.onSubmit?.(props.input, event) }
      return
    }
    const data = event.key === "Enter" ? "\r" : event.key === "Backspace" ? "\x7f" : event.key === "Tab" ? "\t"
      : (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c" && document.getSelection()?.toString() === "" ? "\x03" : ""
    if (data === "") return
    event.preventDefault()
    props.onData?.(data, "keyboard")
  }
  return <section
    aria-label={props.title}
    data-widget="terminal"
    onKeyDown={event => {
      if (!inputHost.current?.contains(event.target as Node)) props.onKeyDown?.(event)
    }}
    style={css`
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      min-width: 0;
      min-height: 0;
      overflow: hidden;
      border: var(--border-width-control) solid var(--widget-toolbar-outline);
      border-radius: 6px;
      background: var(--editor-background);
      color: var(--editor-content);

      ${props.style}
    `}
  >
    <WidgetHeader
      title={props.title}
      subtitle={props.subtitle}
      status={props.status}
      statusTone={props.statusTone}
      actions={props.actions}
    />
    <div
      ref={output}
      role="log"
      aria-label={`${props.title} output`}
      contentEditable="false"
      style={css`
        box-sizing: border-box;
        display: block;
        flex-grow: 1;
        min-width: 0;
        min-height: 0;
        overflow: auto;
        padding: 8px;
        white-space: normal;
        font-family: monospace;
        font-size: 13px;
      `}
    >
      {lines.map((line, index) => <MemoTerminalLine
        key={line.id}
        line={line}
        separator={index === 0 ? "" : "\n"}
      />)}
    </div>
    <div
      ref={inputHost}
      hidden={props.showInput === false}
      onKeyDown={onKeyDown}
      onFocusIn={() => props.onFocusChange?.(true)}
      onFocusOut={() => props.onFocusChange?.(false)}
      onCompositionStart={() => { composing.current = true; finalComposition.current = null }}
      onCompositionEnd={event => {
        composing.current = false
        if (props.inputMode !== "stream") return
        finalComposition.current = event.data
        if (event.data !== "") props.onData?.(event.data, "keyboard")
        reset()
      }}
      style={css`
        display: flex;
        width: 100%;
        min-height: 24px;
        padding: 4px;
        box-sizing: border-box;

        &[hidden] {
          display: none;
        }
      `}
    >
      <TextField
        value={props.inputMode === "stream" ? "" : props.input}
        disabled={props.inputEnabled === false}
        placeholder={props.placeholder}
        title={`${props.title} input`}
        onInput={onInput}
        style={css`
          width: 100%;
          --text-field-width: 100%;
        `}
      />
    </div>
  </section>
}
