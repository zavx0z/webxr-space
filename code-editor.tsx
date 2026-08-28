import {defineStyles} from "@zavx0z/react"
import {
  buildCodeEditorViewModel,
  codeEditorPalette,
  type CodeEditorProps,
  type CodeEditorSegment
} from "./code-editor-model.ts"

export const codeEditorStyles = defineStyles("@ui/components/code-editor", {
  root: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    width: 520,
    height: 220,
    minWidth: 0,
    padding: 0,
    overflow: "auto",
    scrollbarWidth: "thin",
    border: `1px solid ${codeEditorPalette.editorBorder}`,
    borderRadius: 4,
    background: codeEditorPalette.editorBackground,
    color: codeEditorPalette.editorForeground,
    fontSize: 12,
    lineHeight: "16px"
  },
  gutter: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    minWidth: 42,
    height: "100%",
    minHeight: 0,
    margin: 0,
    padding: "8px 8px",
    borderRight: `1px solid ${codeEditorPalette.editorBorder}`,
    background: codeEditorPalette.gutterBackground,
    color: codeEditorPalette.gutterForeground
  },
  hidden: {display: "none"},
  lineNumber: {
    boxSizing: "border-box",
    display: "block",
    minWidth: 24,
    height: 16,
    minHeight: 16,
    textAlign: "right",
    whiteSpace: "nowrap"
  },
  viewport: {
    boxSizing: "border-box",
    display: "block",
    minWidth: 0,
    height: "100%",
    minHeight: 0,
    flexGrow: 1,
    margin: 0,
    padding: "8px 10px",
    overflow: "visible",
    background: codeEditorPalette.editorBackground,
    color: codeEditorPalette.editorForeground
  },
  code: {display: "flex", flexDirection: "column", minWidth: "100%", height: "100%", minHeight: 0},
  line: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%",
    minWidth: 0,
    height: 16,
    minHeight: 16,
    whiteSpace: "nowrap"
  },
  token: {display: "block", flexShrink: 0, whiteSpace: "nowrap"}
})

export const codeEditorCss = codeEditorStyles.cssText

function LineNumber(props: Readonly<{index: number}>) {
  return <li data-line-index={String(props.index)} style={codeEditorStyles.lineNumber}>{String(props.index + 1)}</li>
}

function TokenSpan(props: Readonly<{segment: CodeEditorSegment}>) {
  return <span
    data-token-key={props.segment.key}
    data-token-category={props.segment.category}
    style={[
      codeEditorStyles.token,
      {color: props.segment.foreground, background: props.segment.background}
    ]}
  >{props.segment.text}</span>
}

function CodeLine(props: Readonly<{index: number; segments: readonly CodeEditorSegment[]}>) {
  return <span data-line-index={String(props.index)} style={codeEditorStyles.line}>
    {props.segments.map(segment => <TokenSpan key={segment.key} segment={segment} />)}
  </span>
}

export function CodeEditor(props: CodeEditorProps) {
  const view = buildCodeEditorViewModel(props)
  return <section
    role="region"
    aria-label={props.title ?? "Code editor"}
    data-language-id={view.resolvedLanguageId}
    data-path={props.path}
    title={props.title}
    style={[codeEditorStyles.root, props.style]}
  >
    <ul
      aria-hidden="true"
      style={[codeEditorStyles.gutter, props.showLineNumbers === false && codeEditorStyles.hidden]}
    >
      {view.lines.map((_line, index) => <LineNumber key={String(index)} index={index} />)}
    </ul>
    <pre style={codeEditorStyles.viewport}>
      <code style={codeEditorStyles.code}>
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
