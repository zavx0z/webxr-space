/** Package-owned external Storybook story support. */
import {
  CodeEditor,
  type CodeEditorProps
} from "@zavx0z/ui/views/code-editor"
import type {Document as SemanticDocument} from "@zavx0z/dom"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import {mountOwnerStory, type RoutedProductionComponentStory} from "../story-types.ts"

export const codeEditorProductionStoryDefaultProps: CodeEditorProps = Object.freeze({
  value: [
    'import {createRoot} from "@zavx0z/component"',
    'import {Button} from "@zavx0z/ui/buttons/button"',
    "",
    'createRoot(container).render(<Button label="Output" />)'
  ].join("\n"),
  readOnly: true,
  languageId: "typescript",
  showLineNumbers: true,
  title: "Read-only source"
})

export function createCompiledCodeEditorProductionStory(
  document: SemanticDocument,
  props: CodeEditorProps = codeEditorProductionStoryDefaultProps
): RoutedProductionComponentStory {
  return mountOwnerStory(
    document,
    CodeEditor as unknown as CompiledTemplate<CodeEditorProps>,
    props,
    "code-editor",
    source(props),
  )
}

function source(props: CodeEditorProps): string {
  return [
    'import {CodeEditor} from "@zavx0z/ui/views/code-editor"',
    'import {createRoot} from "@zavx0z/component"',
    "",
    "createRoot(container).render(<CodeEditor",
    `  value={${JSON.stringify(props.value)}}`,
    "  readOnly={true}",
    `  languageId={${JSON.stringify(props.languageId ?? "plaintext")}}`,
    "/>)"
  ].join("\n")
}
