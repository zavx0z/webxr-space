import {useMemo} from "@zavx0z/component"
import {CodeEditor, type CodeEditorProps} from "../views/code-editor.tsx"
import {createCodeEditorModel} from "../code-editor-model.ts"
import {WidgetHeader, type WidgetHeaderProps} from "../src/shared/widget-header.tsx"

export type EditorProps = CodeEditorProps & WidgetHeaderProps & Readonly<{
  onSave?: ((value: string, event: KeyboardEvent) => void) | undefined
  onSubmit?: ((value: string, event: KeyboardEvent) => void) | undefined
}>

/** Responsive editor widget; commands carry text, never file/debugger/process semantics. */
export function Editor(props: EditorProps) {
  const ownedModel = useMemo(() => createCodeEditorModel({value: props.value, readOnly: props.readOnly}), [])
  const model = props.model ?? ownedModel
  return <section
    data-widget="editor"
    aria-label={props.title}
    onKeyDown={event => {
      if (event.defaultPrevented || event.isComposing || !event.metaKey && !event.ctrlKey) return
      if (event.key.toLowerCase() === "s" && props.onSave) {
        event.preventDefault()
        props.onSave(model.snapshot.value, event)
      } else if (event.key === "Enter" && props.onSubmit) {
        event.preventDefault()
        props.onSubmit(model.snapshot.value, event)
      }
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
    <CodeEditor
      value={props.value}
      readOnly={props.readOnly}
      model={model}
      languageId={props.languageId}
      path={props.path}
      tokens={props.tokens}
      showLineNumbers={props.showLineNumbers}
      title={props.title}
      lineDecorations={props.lineDecorations}
      onLineNumberClick={props.onLineNumberClick}
      onChange={props.onChange}
      onReady={props.onReady}
      onSelectionChange={props.onSelectionChange}
      ref={props.ref}
      style={css`
        --code-editor-line-height: 18px;
        font-size: 13px;
        flex-grow: 1;
        width: 100%;
        height: 0;
        min-height: 0;
        border: 0;
        border-radius: 0;
      `}
    />
  </section>
}
