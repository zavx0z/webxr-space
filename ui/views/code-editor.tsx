import {memo, useCallback, useLayoutEffect, useMemo, useRef, useSyncExternalStore} from "@zavx0z/component"
import type {HTMLElement as SemanticHTMLElement} from "@zavx0z/dom/html-element"
import {createCodeEditorModel} from "../code-editor-model.ts"
import {
  assertCodeEditorProps,
  buildCodeEditorViewModel,
  resolveCodeEditorHighlighter,
  type CodeEditorProps,
  type CodeEditorSegment,
  type CodeEditorHandle,
  type CodeEditorLineDecoration,
} from "../src/code-editor/model.ts"
import {codeEditorPaintRuns, type CodeEditorPaintRun} from "../src/code-editor/paint-runs.ts"
import {attachCodeEditorInteraction, createCodeEditorHandle, type CodeEditorInteraction} from "../src/code-editor/interaction.ts"

function LineNumber(props: Readonly<{index: number; decoration: CodeEditorLineDecoration | undefined}>) {
  return <li
    data-line-index={String(props.index)}
    data-tone={props.decoration?.gutterTone}
    title={props.decoration?.title}
    style={css`
      box-sizing: border-box;
      display: block;
      min-width: 24px;
      height: var(--code-editor-line-height, 16px);
      min-height: var(--code-editor-line-height, 16px);
      text-align: right;
      white-space: nowrap;

      &[data-tone="info"] {
        background: var(--state-info);
      }

      &[data-tone="success"] {
        background: var(--state-success);
      }

      &[data-tone="warning"] {
        background: var(--state-warning);
      }

      &[data-tone="error"] {
        background: var(--state-error);
      }
    `}
  >
    {String(props.index + 1)}
  </li>
}

function StyledCodeRun(props: Readonly<{run: CodeEditorPaintRun}>) {
  return <span
    data-token-key={props.run.key}
    data-token-category={props.run.category}
    style={css`
      display: inline;
      white-space: pre;
      color: ${props.run.foreground};
      background: ${props.run.background ?? "transparent"};
    `}
  >
    {props.run.text}
  </span>
}

function CodeRun(props: Readonly<{run: CodeEditorPaintRun}>) {
  const plain = props.run.inheritForeground === true && props.run.background === undefined
  const text = plain ? props.run.text : ""
  return <>
    {text}
    {!plain ? <StyledCodeRun run={props.run} /> : null}
  </>
}

function CodeLine(props: Readonly<{index: number; separator: string; segments: readonly CodeEditorSegment[]; decoration: CodeEditorLineDecoration | undefined}>) {
  const runs = codeEditorPaintRuns(props.segments)
  return <>
    {props.separator}
    <span
      data-line-index={String(props.index)}
      data-line-tone={props.decoration?.lineTone}
      data-marker-tone={props.decoration?.markerTone}
      title={props.decoration?.title}
      style={css`
        box-sizing: border-box;
        display: block;
        width: 100%;
        min-width: 0;
        height: var(--code-editor-line-height, 16px);
        min-height: var(--code-editor-line-height, 16px);
        white-space: pre;
        padding-left: 2px;
        border-left-width: 0;
        border-left-style: solid;
        border-left-color: transparent;

        &[data-line-tone="info"] {
          background: var(--state-info);
        }

        &[data-line-tone="success"] {
          background: var(--state-success);
        }

        &[data-line-tone="warning"] {
          background: var(--state-warning);
        }

        &[data-line-tone="error"] {
          background: var(--state-error);
        }

        &[data-marker-tone="info"] {
          padding-left: 0;
          border-left-width: 2px;
          border-left-color: var(--state-info);
        }

        &[data-marker-tone="success"] {
          padding-left: 0;
          border-left-width: 2px;
          border-left-color: var(--state-success);
        }

        &[data-marker-tone="warning"] {
          padding-left: 0;
          border-left-width: 2px;
          border-left-color: var(--state-warning);
        }

        &[data-marker-tone="error"] {
          padding-left: 0;
          border-left-width: 2px;
          border-left-color: var(--state-error);
        }
      `}
    >
      {runs.map(run => <CodeRun
        key={run.key}
        run={run}
      />)}
    </span>
  </>
}

const MemoLineNumber = memo(LineNumber)
const MemoCodeLine = memo(CodeLine, (previous, next) => previous.index === next.index &&
  previous.decoration?.lineTone === next.decoration?.lineTone && previous.decoration?.markerTone === next.decoration?.markerTone &&
  previous.decoration?.gutterTone === next.decoration?.gutterTone && previous.decoration?.title === next.decoration?.title &&
  previous.separator === next.separator && previous.segments.length === next.segments.length &&
  previous.segments.every((segment, index) => {
    const candidate = next.segments[index]!
    return segment.key === candidate.key && segment.text === candidate.text &&
      segment.foreground === candidate.foreground && segment.background === candidate.background &&
      segment.inheritForeground === candidate.inheritForeground
  }))

export function CodeEditor(props: CodeEditorProps) {
  assertCodeEditorProps(props)
  const ownedModel = useMemo(() => createCodeEditorModel({value: props.value, readOnly: props.readOnly}), [])
  const model = props.model ?? ownedModel
  const code = useRef<HTMLElement | null>(null)
  const interaction = useRef<CodeEditorInteraction | null>(null)
  const handle = useRef<CodeEditorHandle | null>(null)
  const callback = useRef(props.onChange)
  callback.current = props.onChange
  const externalUpdate = useRef(false)
  const subscribe = useCallback((listener: () => void) => model.subscribe(listener), [model])
  const getValue = useCallback(() => model.snapshot.value, [model])
  const value = useSyncExternalStore(subscribe, getValue)
  useLayoutEffect(() => {
    if (model.snapshot.readOnly && !props.readOnly && handle.current) {
      const selected = handle.current.getSelection()
      model.setSelections(selected.selections, selected.primary)
    }
    model.setReadOnly(props.readOnly)
  }, [model, props.readOnly])
  useLayoutEffect(() => {
    externalUpdate.current = true
    try {
      model.replaceValue(props.value, {selection: "map"})
    } finally { externalUpdate.current = false }
  }, [model, props.value])
  useLayoutEffect(() => {
    if (props.readOnly || !code.current) return
    const binding = attachCodeEditorInteraction(code.current as unknown as SemanticHTMLElement, model)
    interaction.current = binding
    return () => {
      binding.dispose()
      interaction.current = null
    }
  }, [model, props.readOnly])
  useLayoutEffect(() => { interaction.current?.sync() }, [model, value])
  useLayoutEffect(() => {
    if (!code.current || !props.onReady && !props.onSelectionChange) return
    const port = createCodeEditorHandle(code.current as unknown as SemanticHTMLElement, model, selection => props.onSelectionChange?.(selection))
    handle.current = port.handle
    props.onReady?.(port.handle)
    return () => {
      port.dispose()
      handle.current = null
      props.onReady?.(null)
    }
  }, [model, props.onReady, props.onSelectionChange])
  useLayoutEffect(() => {
    let previous = model.snapshot.value
    return model.subscribe(snapshot => {
      if (snapshot.value === previous) return
      previous = snapshot.value
      if (!externalUpdate.current) callback.current?.(snapshot.value)
    })
  }, [model])
  // Supplied tokens describe props.value, not an unacknowledged local edit.
  const tokens = value === props.value ? props.tokens : undefined
  const highlighter = tokens === undefined ? resolveCodeEditorHighlighter(props.languageId, props.path) : null
  // Supplied token arrays can be mutable. Only automatic highlighting is memoized.
  const automatic = useMemo(() => tokens === undefined ? buildCodeEditorViewModel({...props, value, tokens}) : null,
    [value, props.languageId, props.path, highlighter, highlighter?.tokenize, tokens === undefined])
  const view = automatic ?? buildCodeEditorViewModel({...props, value, tokens})
  const decorations = new Map<number, CodeEditorLineDecoration>()
  for (const decoration of props.lineDecorations ?? []) {
    if (!Number.isSafeInteger(decoration.line) || decoration.line < 0 || decorations.has(decoration.line)) {
      throw new RangeError("CodeEditor line decorations require unique non-negative line indices")
    }
    decorations.set(decoration.line, decoration)
  }
  return <section
    ref={props.ref}
    contentEditable="false"
    role="region"
    aria-label={props.title ?? "Code editor"}
    aria-readonly={String(props.readOnly)}
    data-language-id={view.resolvedLanguageId}
    data-path={props.path}
    title={props.title}
    style={css`
      box-sizing: border-box;
      display: flex;
      flex-direction: row;
      align-items: stretch;
      width: 520px;
      height: 220px;
      min-width: 0;
      padding: 0;
      overflow: auto;
      scrollbar-width: thin;
      border: var(--border-width-control) solid var(--editor-border);
      border-radius: 4px;
      background: var(--editor-background);
      color: var(--editor-content);
      font-size: var(--font-size-sm);
      font-family: monospace;
      line-height: var(--code-editor-line-height, 16px);

      ${props.style}
    `}
  >
    <ul
      aria-hidden="true"
      hidden={props.showLineNumbers === false}
      onClick={event => {
        const target = event.target as HTMLElement | null
        const row = target?.closest?.("li[data-line-index]")
        if (row?.parentElement !== event.currentTarget) return
        props.onLineNumberClick?.(Number(row.getAttribute("data-line-index")), event)
      }}
      style={css`
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        min-width: 42px;
        flex-shrink: 0;
        min-height: 0;
        margin: 0;
        padding: 8px;
        border-right: var(--border-width-control) solid var(--editor-border);
        background: var(--editor-gutter-background);
        color: var(--editor-line-number-content);
        user-select: none;

        &[hidden] {
          display: none;
        }
      `}
    >
      {view.lines.map((_line, index) => <MemoLineNumber
        key={String(index)}
        index={index}
        decoration={decorations.get(index)}
      />)}
    </ul>
    <pre
      style={css`
        box-sizing: border-box;
        display: block;
        min-width: 0;
        min-height: 0;
        flex-grow: 1;
        margin: 0;
        padding: 8px 10px;
        overflow: visible;
        background: var(--editor-background);
        color: var(--editor-content);
      `}
    >
      <code
        ref={code}
        contentEditable={props.readOnly ? "false" : "plaintext-only"}
        role={props.readOnly ? undefined : "textbox"}
        aria-multiline={props.readOnly ? undefined : "true"}
        style={css`
          display: block;
          min-width: 100%;
          min-height: 0;
          white-space: normal;
        `}
      >
        {view.lines.map((_line, index) => <MemoCodeLine
          key={String(index)}
          index={index}
          decoration={decorations.get(index)}
          separator={index === 0 ? "" : view.lineEndings[index - 1] ?? ""}
          segments={view.segments[index] ?? []}
        />)}
      </code>
    </pre>
  </section>
}

export {buildCodeEditorViewModel, codeEditorPalette} from "../src/code-editor/model.ts"
export type {CodeEditorProps, CodeEditorSegment, CodeEditorViewModel, CodeEditorHandle, CodeEditorSelectionSet, CodeEditorLineDecoration} from "../src/code-editor/model.ts"
