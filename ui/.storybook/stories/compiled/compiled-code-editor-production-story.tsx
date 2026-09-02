/** Package-owned external Storybook story support. */
import {
  CodeEditor,
  type CodeEditorProps
} from "@zavx0z/ui/views/code-editor"
import type {
  Document as SemanticDocument,
  Element as SemanticElement,
  HTMLElement as SemanticHTMLElement,
  Node as SemanticNode
} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/component"
import type {RoutedProductionComponentStory} from "../story-types.ts"

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
  const staging = document.createElement("div")
  const root = createRoot(staging)
  root.render(<CodeEditor
    value={props.value}
    readOnly={true}
    languageId={props.languageId}
    path={props.path}
    tokens={props.tokens}
    showLineNumbers={props.showLineNumbers}
    title={props.title}
  />)
  const owner = staging.querySelector("section") as SemanticHTMLElement | null
  if (!owner) {
    root.unmount()
    throw new Error("Compiled CodeEditor story mounted no owner")
  }
  staging.removeChild(owner)
  owner.setAttribute("data-story-component", "code-editor")
  const story = Object.freeze({
    element: owner,
    componentRoot: root,
    props: Object.freeze({...props}) as Readonly<Record<string, unknown>>,
    get source() {
      return Object.freeze({
        html: serialize(owner),
        typescript: source(props)
      })
    },
    dispose() {
      root.unmount()
    }
  })
  return Object.freeze({story})
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

function serialize(element: SemanticElement, depth = 0): string {
  const indent = "  ".repeat(depth)
  const attributes = element.getAttributeNames().sort().map(name =>
    ` ${name}="${escapeHtml(element.getAttribute(name) ?? "")}"`
  ).join("")
  const children = [...element.childNodes].filter(node => node.nodeType === 1 || node.nodeType === 3)
  if (children.length === 0) return `${indent}<${element.localName}${attributes}></${element.localName}>`
  const body = children.map((node: SemanticNode) => node.nodeType === 3
    ? `${"  ".repeat(depth + 1)}${escapeHtml(node.textContent ?? "")}`
    : serialize(node as SemanticHTMLElement, depth + 1)).join("\n")
  return `${indent}<${element.localName}${attributes}>\n${body}\n${indent}</${element.localName}>`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
