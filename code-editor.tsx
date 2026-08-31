import {
  buildCodeEditorViewModel,
  codeEditorPalette,
  type CodeEditorProps,
  type CodeEditorSegment
} from "./code-editor-model.ts"

const rootCss = css`
  & {
    box-sizing: border-box;
    display: flex;
    flex-direction: row;
    align-items: flex-start;
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
    line-height: 16px;
  }
`

const gutterCss = css`
  & {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    min-width: 42px;
    height: 100%;
    min-height: 0;
    margin: 0;
    padding: 8px;
    border-right: var(--border-width-control) solid var(--editor-border);
    background: var(--editor-gutter-background);
    color: var(--editor-line-number-content);
  }
`

const lineNumberCss = css`
  & { box-sizing: border-box; display: block; min-width: 24px; height: 16px; min-height: 16px; text-align: right; white-space: nowrap; }
`

const viewportCss = css`
  & {
    box-sizing: border-box;
    display: block;
    min-width: 0;
    height: 100%;
    min-height: 0;
    flex-grow: 1;
    margin: 0;
    padding: 8px 10px;
    overflow: visible;
    background: var(--editor-background);
    color: var(--editor-content);
  }
`

const codeCss = css`& { display: flex; flex-direction: column; min-width: 100%; height: 100%; min-height: 0; }`
const lineCss = css`
  & { display: flex; flex-direction: row; align-items: flex-start; width: 100%; min-width: 0; height: 16px; min-height: 16px; white-space: nowrap; }
`
const tokenCss = css`& { display: block; flex-shrink: 0; white-space: nowrap; }`

function LineNumber(props: Readonly<{index: number}>) {
  return <li data-line-index={String(props.index)} style={lineNumberCss}>{String(props.index + 1)}</li>
}

function TokenSpan(props: Readonly<{segment: CodeEditorSegment}>) {
  return <span
    data-token-key={props.segment.key}
    data-token-category={props.segment.category}
    style={css`
      ${tokenCss}
      & { color: ${props.segment.foreground}; background: ${props.segment.background ?? "transparent"}; }
      `}
  >{props.segment.text}</span>
}

function CodeLine(props: Readonly<{index: number; segments: readonly CodeEditorSegment[]}>) {
  return <span data-line-index={String(props.index)} style={lineCss}>
    {props.segments.map(segment => <TokenSpan key={segment.key} segment={segment} />)}
  </span>
}

export function CodeEditor(props: CodeEditorProps) {
  const view = buildCodeEditorViewModel(props)
  return <section
    role="region"
    aria-label={props.title ?? "Code editor"}
    aria-readonly="true"
    data-language-id={view.resolvedLanguageId}
    data-path={props.path}
    title={props.title}
    style={css`${rootCss}${props.style}`}
  >
    <ul
      aria-hidden="true"
      hidden={props.showLineNumbers === false}
      style={css`${gutterCss}${css`&[hidden] { display: none; }`}`}
    >
      {view.lines.map((_line, index) => <LineNumber key={String(index)} index={index} />)}
    </ul>
    <pre style={viewportCss}>
      <code style={codeCss}>
        {view.lines.map((_line, index) => <CodeLine
          key={String(index)}
          index={index}
          segments={view.segments[index] ?? []}
        />)}
      </code>
    </pre>
  </section>
}

export {buildCodeEditorViewModel, codeEditorPalette} from "./code-editor-model.ts"
export type {CodeEditorProps, CodeEditorSegment, CodeEditorViewModel} from "./code-editor-model.ts"
