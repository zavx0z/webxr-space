import {CodeEditor, type CodeEditorProps} from "./code-editor.tsx"

export type CodeEditorFixtureProps = CodeEditorProps

export function CodeEditorFixture(props: CodeEditorFixtureProps) {
  return <CodeEditor
    value={props.value}
    readOnly={props.readOnly}
    languageId={props.languageId}
    path={props.path}
    title={props.title}
    showLineNumbers={props.showLineNumbers}
    tokens={props.tokens}
    style={props.style}
  />
}
