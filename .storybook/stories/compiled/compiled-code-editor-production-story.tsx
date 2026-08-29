/** Package-owned external Storybook story support. */
import {
  CodeEditor,
  codeEditorCss,
  type CodeEditorProps
} from "@ui/components/code-editor"
import type {Document, Element, HTMLElement, Node} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/react"
import type {RoutedProductionComponentStory} from "../story-types.ts"

export const codeEditorProductionStoryDefaultProps: CodeEditorProps = Object.freeze({
  value: [
    'import {createRoot} from "@zavx0z/react"',
    'import {Button} from "@ui/components/button"',
    "",
    'createRoot(container).render(<Button label="Output" />)'
  ].join("\n"),
  readOnly: true,
  languageId: "typescript",
  showLineNumbers: true,
  title: "Read-only source"
})

export function createCompiledCodeEditorProductionStory(
  document: Document,
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
    style={props.style}
  />)
  const owner = staging.querySelector("section") as HTMLElement | null
  if (!owner) {
    root.unmount()
    throw new Error("Compiled CodeEditor story mounted no owner")
  }
  staging.removeChild(owner)
  owner.setAttribute("data-story-component", "code-editor")
  const story = Object.freeze({
    element: owner,
    props: Object.freeze({...props}) as Readonly<Record<string, unknown>>,
    get source() {
      return Object.freeze({
        html: serialize(owner),
        css: codeEditorCss,
        typescript: source(props)
      })
    },
    dispose() {
      root.unmount()
    }
  })
  return Object.freeze({story, css: codeEditorCss})
}

function source(props: CodeEditorProps): string {
  return [
    'import {CodeEditor, codeEditorCss} from "@ui/components/code-editor"',
    'import {createRoot} from "@zavx0z/react"',
    "",
    "createRoot(container).render(<CodeEditor",
    `  value={${JSON.stringify(props.value)}}`,
    "  readOnly={true}",
    `  languageId={${JSON.stringify(props.languageId ?? "plaintext")}}`,
    "/>)",
    "void codeEditorCss"
  ].join("\n")
}

function serialize(element: Element, depth = 0): string {
  const indent = "  ".repeat(depth)
  const attributes = element.getAttributeNames().sort().map(name =>
    ` ${name}="${escapeHtml(element.getAttribute(name) ?? "")}"`
  ).join("")
  const children = [...element.childNodes].filter(node => node.nodeType === 1 || node.nodeType === 3)
  if (children.length === 0) return `${indent}<${element.localName}${attributes}></${element.localName}>`
  const body = children.map((node: Node) => node.nodeType === 3
    ? `${"  ".repeat(depth + 1)}${escapeHtml(node.textContent ?? "")}`
    : serialize(node as HTMLElement, depth + 1)).join("\n")
  return `${indent}<${element.localName}${attributes}>\n${body}\n${indent}</${element.localName}>`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
