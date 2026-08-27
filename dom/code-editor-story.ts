import {
  Element,
  Text,
  type Document,
  type HTMLElement,
  type Node,
} from "@zavx0z/dom"
import {
  codeEditorCss,
  createCodeEditor,
  type CodeEditorController,
  type CodeEditorProps,
} from "@ui/components/code-editor"

export type CodeEditorStoryArgs = Readonly<{
  value: string
  languageId: string
  path: string
  showLineNumbers: boolean
  title: string
}>

export type CodeEditorStorySource = Readonly<{
  html: string
  css: string
  typescript: string
}>

export type CodeEditorDomStory = Readonly<{
  element: HTMLElement
  controller: CodeEditorController
  args: CodeEditorStoryArgs
  source: CodeEditorStorySource
  update(args: CodeEditorStoryArgs): void
  dispose(): void
}>

export const codeEditorStoryDefaultArgs: CodeEditorStoryArgs = Object.freeze({
  value: [
    "const output = document.createElement(\"button\")",
    "output.textContent = \"Output\"",
    "output.title = \"Rendered by WebGPU\"",
    "document.appendChild(output)",
  ].join("\n"),
  languageId: "typescript",
  path: "output.ts",
  showLineNumbers: true,
  title: "TypeScript source",
})

export function createCodeEditorStory(
  document: Document,
  initialArgs: CodeEditorStoryArgs = codeEditorStoryDefaultArgs,
): CodeEditorDomStory {
  const initial = normalizeArgs(initialArgs)
  const controller = createCodeEditor(document, editorProps(initial))
  let currentArgs = initial
  let disposed = false

  const update = (args: CodeEditorStoryArgs): void => {
    if (disposed) throw new Error("CodeEditor story is disposed")
    const next = normalizeArgs(args)
    controller.update(editorProps(next))
    currentArgs = next
  }

  const story: CodeEditorDomStory = Object.freeze({
    element: controller.element,
    controller,
    get args() { return currentArgs },
    get source() {
      return Object.freeze({
        html: serializeNode(controller.element),
        css: codeEditorCss,
        typescript: renderTypeScript(currentArgs),
      })
    },
    update,
    dispose() {
      if (disposed) return
      disposed = true
      controller.dispose()
    },
  })
  return story
}

function editorProps(args: CodeEditorStoryArgs): CodeEditorProps {
  return Object.freeze({
    value: args.value,
    readOnly: true,
    languageId: args.languageId,
    path: args.path,
    showLineNumbers: args.showLineNumbers,
    title: args.title,
  })
}

function normalizeArgs(args: CodeEditorStoryArgs): CodeEditorStoryArgs {
  if (typeof args !== "object" || args === null) throw new TypeError("CodeEditor story args must be an object")
  assertString(args.value, "CodeEditor story value")
  assertNonEmpty(args.languageId, "CodeEditor story languageId")
  assertNonEmpty(args.path, "CodeEditor story path")
  if (typeof args.showLineNumbers !== "boolean") throw new TypeError("CodeEditor story showLineNumbers must be a boolean")
  assertString(args.title, "CodeEditor story title")
  return Object.freeze({...args})
}

function serializeNode(node: Node): string {
  if (node instanceof Text) return escapeText(node.data)
  if (!(node instanceof Element)) throw new TypeError(`Unsupported CodeEditor source node: ${node.nodeName}`)
  const attributes = node.getAttributeNames()
    .sort()
    .map((name) => {
      const value = node.getAttribute(name) ?? ""
      if ((name === "hidden" || name === "disabled" || name === "readonly") && value === "") return ` ${name}`
      return ` ${name}="${escapeAttribute(value)}"`
    })
    .join("")
  const content = [...node.childNodes].map(serializeNode).join("")
  return `<${node.localName}${attributes}>${content}</${node.localName}>`
}

function renderTypeScript(args: CodeEditorStoryArgs): string {
  return [
    'import {createDocument} from "@zavx0z/dom"',
    'import {createCodeEditor} from "@ui/components/code-editor"',
    "",
    "const document = createDocument()",
    "const editor = createCodeEditor(document, {",
    `  value: ${JSON.stringify(args.value)},`,
    "  readOnly: true,",
    `  languageId: ${JSON.stringify(args.languageId)},`,
    `  path: ${JSON.stringify(args.path)},`,
    `  showLineNumbers: ${args.showLineNumbers},`,
    `  title: ${JSON.stringify(args.title)},`,
    "})",
    "document.appendChild(editor.element)",
  ].join("\n")
}

function escapeText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

function escapeAttribute(value: string): string {
  return escapeText(value).replaceAll('"', "&quot;")
}

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string") throw new TypeError(`${label} must be a string`)
}

function assertNonEmpty(value: unknown, label: string): asserts value is string {
  assertString(value, label)
  if (value.trim().length === 0) throw new TypeError(`${label} must not be empty`)
}
