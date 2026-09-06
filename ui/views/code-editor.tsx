import {useMemo} from "@zavx0z/component"
import {
  assertCodeEditorProps,
  buildCodeEditorViewModel,
  resolveCodeEditorHighlighter,
  type CodeEditorProps,
  type CodeEditorSegment
} from "../src/code-editor/model.ts"
import {codeEditorPaintRuns, type CodeEditorPaintRun} from "../src/code-editor/paint-runs.ts"

function LineNumber(props: Readonly<{index: number}>) {
  return <li
    data-line-index={String(props.index)}
    style={css`
      box-sizing: border-box;
      display: block;
      min-width: 24px;
      height: 16px;
      min-height: 16px;
      text-align: right;
      white-space: nowrap;
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

function CodeLine(props: Readonly<{index: number; segments: readonly CodeEditorSegment[]}>) {
  const runs = codeEditorPaintRuns(props.segments)
  return <span
    data-line-index={String(props.index)}
    style={css`
      display: block;
      width: 100%;
      min-width: 0;
      height: 16px;
      min-height: 16px;
      white-space: pre;
    `}
  >
    {runs.map(run => <CodeRun
      key={run.key}
      run={run}
    />)}
  </span>
}

export function CodeEditor(props: CodeEditorProps) {
  assertCodeEditorProps(props)
  const highlighter = props.tokens === undefined ? resolveCodeEditorHighlighter(props.languageId, props.path) : null
  // Supplied token arrays can be mutable. Only automatic highlighting is memoized.
  const automatic = useMemo(() => props.tokens === undefined ? buildCodeEditorViewModel(props) : null,
    [props.value, props.languageId, props.path, highlighter, highlighter?.tokenize, props.tokens === undefined])
  const view = automatic ?? buildCodeEditorViewModel(props)
  return <section
    role="region"
    aria-label={props.title ?? "Code editor"}
    aria-readonly="true"
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
      line-height: 16px;

      ${props.style}
    `}
  >
    <ul
      aria-hidden="true"
      hidden={props.showLineNumbers === false}
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

        &[hidden] {
          display: none;
        }
      `}
    >
      {view.lines.map((_line, index) => <LineNumber key={String(index)} index={index} />)}
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
        style={css`
          display: flex;
          flex-direction: column;
          min-width: 100%;
          min-height: 0;
        `}
      >
        {view.lines.map((_line, index) => <CodeLine
          key={String(index)}
          index={index}
          segments={view.segments[index] ?? []}
        />)}
      </code>
    </pre>
  </section>
}

export {buildCodeEditorViewModel, codeEditorPalette} from "../src/code-editor/model.ts"
export type {CodeEditorProps, CodeEditorSegment, CodeEditorViewModel} from "../src/code-editor/model.ts"
