import type {
  Document,
  HTMLLIElement,
  HTMLUListElement,
  HTMLElement,
  Node,
  Text,
} from "@zavx0z/dom"
import {
  buildCodeEditorViewModel,
  codeEditorPalette,
  type CodeEditorProps,
  type CodeEditorSegment,
  type CodeEditorViewModel,
} from "./code-editor-model.ts"

export {buildCodeEditorViewModel, codeEditorPalette} from "./code-editor-model.ts"
export type {CodeEditorProps, CodeEditorSegment, CodeEditorViewModel} from "./code-editor-model.ts"

export type CodeEditorRefs = Readonly<{
  root: HTMLElement
  gutter: HTMLUListElement
  viewport: HTMLElement
  code: HTMLElement
  lineNumbers: ReadonlyMap<string, HTMLLIElement>
  lines: ReadonlyMap<string, HTMLElement>
  tokens: ReadonlyMap<string, HTMLElement>
}>

export type CodeEditorController = Readonly<{
  element: HTMLElement
  refs: CodeEditorRefs
  props: CodeEditorProps
  update(props: CodeEditorProps): void
  dispose(): void
}>

const {editorBackground, editorForeground, gutterBackground, gutterForeground, editorBorder} = codeEditorPalette

export const codeEditorCss = String.raw`
.ui-code-editor {
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
  border: 1px solid ${editorBorder};
  border-radius: 4px;
  background: ${editorBackground};
  color: ${editorForeground};
  font-size: 12px;
  line-height: 16px;
}

.ui-code-editor__gutter {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-width: 42px;
  min-height: 100%;
  margin: 0;
  padding: 8px 8px;
  border-right: 1px solid ${editorBorder};
  background: ${gutterBackground};
  color: ${gutterForeground};
}

.ui-code-editor__line-number {
  box-sizing: border-box;
  display: block;
  min-width: 24px;
  height: 16px;
  min-height: 16px;
  text-align: right;
  white-space: nowrap;
}

.ui-code-editor__viewport {
  box-sizing: border-box;
  display: block;
  min-width: 0;
  height: 100%;
  min-height: 0;
  flex-grow: 1;
  margin: 0;
  padding: 8px 10px;
  overflow: visible;
  background: ${editorBackground};
  color: ${editorForeground};
}

.ui-code-editor__code {
  display: flex;
  flex-direction: column;
  min-width: 100%;
  min-height: 100%;
}

.ui-code-editor__line {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  min-width: 100%;
  height: 16px;
  min-height: 16px;
  white-space: nowrap;
}

.ui-code-editor__token {
  display: block;
  flex-shrink: 0;
  white-space: nowrap;
}
`

type TokenEntry = {
  element: HTMLElement
  text: Text
}

type LineEntry = {
  number: HTMLLIElement
  numberText: Text
  line: HTMLElement
  tokens: Map<string, TokenEntry>
}

export function createCodeEditor(
  document: Document,
  initialProps: CodeEditorProps,
): CodeEditorController {
  const root = document.createElement("section")
  const gutter = document.createElement("ul")
  const viewport = document.createElement("pre")
  const code = document.createElement("code")
  const entries = new Map<string, LineEntry>()
  const lineNumbers = new Map<string, HTMLLIElement>()
  const lines = new Map<string, HTMLElement>()
  const tokens = new Map<string, HTMLElement>()
  let currentProps: CodeEditorProps = Object.freeze({value: "", readOnly: true})
  let disposed = false

  root.className = "ui-code-editor"
  root.setAttribute("role", "region")
  root.setAttribute("aria-readonly", "true")
  gutter.className = "ui-code-editor__gutter"
  gutter.setAttribute("aria-hidden", "true")
  viewport.className = "ui-code-editor__viewport"
  code.className = "ui-code-editor__code"
  viewport.appendChild(code)
  root.append(gutter, viewport)

  const update = (props: CodeEditorProps): void => {
    if (disposed) throw new Error("CodeEditor controller is disposed")
    const normalized = buildCodeEditorViewModel(props)
    syncRoot(root, gutter, normalized)
    syncLines(document, gutter, code, entries, lineNumbers, lines, tokens, normalized)
    currentProps = normalized.props
  }

  const refs: CodeEditorRefs = Object.freeze({
    root,
    gutter,
    viewport,
    code,
    lineNumbers,
    lines,
    tokens,
  })
  const controller: CodeEditorController = Object.freeze({
    element: root,
    refs,
    get props() { return currentProps },
    update,
    dispose() {
      disposed = true
    },
  })
  update(initialProps)
  return controller
}

function syncRoot(
  root: HTMLElement,
  gutter: HTMLUListElement,
  normalized: CodeEditorViewModel,
): void {
  const {props, resolvedLanguageId} = normalized
  root.className = "ui-code-editor"
  root.setAttribute("data-language-id", resolvedLanguageId)
  syncOptionalAttribute(root, "data-path", props.path)
  syncOptionalTitle(root, props.title)
  if (props.showLineNumbers === false) gutter.setAttribute("hidden", "")
  else gutter.removeAttribute("hidden")
}

function syncLines(
  document: Document,
  gutter: HTMLUListElement,
  code: HTMLElement,
  entries: Map<string, LineEntry>,
  lineNumbers: Map<string, HTMLLIElement>,
  lines: Map<string, HTMLElement>,
  tokens: Map<string, HTMLElement>,
  normalized: CodeEditorViewModel,
): void {
  const retained = new Set(normalized.lines.map((_line, index) => String(index)))
  for (const [key, entry] of entries) {
    if (retained.has(key)) continue
    entry.number.parentNode?.removeChild(entry.number)
    entry.line.parentNode?.removeChild(entry.line)
    for (const tokenKey of entry.tokens.keys()) tokens.delete(`${key}:${tokenKey}`)
    entries.delete(key)
    lineNumbers.delete(key)
    lines.delete(key)
  }

  const orderedNumbers: HTMLLIElement[] = []
  const orderedLines: HTMLElement[] = []
  for (let index = 0; index < normalized.lines.length; index += 1) {
    const key = String(index)
    let entry = entries.get(key)
    if (entry === undefined) {
      const number = document.createElement("li")
      const numberText = document.createTextNode("")
      const line = document.createElement("span")
      number.className = "ui-code-editor__line-number"
      number.setAttribute("data-line-index", key)
      number.appendChild(numberText)
      line.className = "ui-code-editor__line"
      line.setAttribute("data-line-index", key)
      entry = {number, numberText, line, tokens: new Map()}
      entries.set(key, entry)
      lineNumbers.set(key, number)
      lines.set(key, line)
    }
    const label = String(index + 1)
    if (entry.numberText.data !== label) entry.numberText.data = label
    syncLineTokens(document, key, entry, tokens, normalized.segments[index] ?? [])
    orderedNumbers.push(entry.number)
    orderedLines.push(entry.line)
  }
  reconcileChildren(gutter, orderedNumbers)
  reconcileChildren(code, orderedLines)
}

function syncLineTokens(
  document: Document,
  lineKey: string,
  line: LineEntry,
  allTokens: Map<string, HTMLElement>,
  segments: readonly CodeEditorSegment[],
): void {
  const retained = new Set(segments.map(({key}) => key))
  for (const [key, entry] of line.tokens) {
    if (retained.has(key)) continue
    entry.element.parentNode?.removeChild(entry.element)
    line.tokens.delete(key)
    allTokens.delete(`${lineKey}:${key}`)
  }
  const ordered: HTMLElement[] = []
  for (const segment of segments) {
    let entry = line.tokens.get(segment.key)
    if (entry === undefined) {
      const element = document.createElement("span")
      const text = document.createTextNode("")
      element.className = "ui-code-editor__token"
      element.setAttribute("data-token-key", segment.key)
      element.appendChild(text)
      entry = {element, text}
      line.tokens.set(segment.key, entry)
      allTokens.set(`${lineKey}:${segment.key}`, element)
    }
    entry.element.setAttribute("data-token-category", segment.category)
    const style = segment.background === undefined
      ? `color:${segment.foreground}`
      : `color:${segment.foreground};background:${segment.background}`
    if (entry.element.getAttribute("style") !== style) entry.element.setAttribute("style", style)
    if (entry.text.data !== segment.text) entry.text.data = segment.text
    ordered.push(entry.element)
  }
  reconcileChildren(line.line, ordered)
}

function syncOptionalTitle(element: HTMLElement, value: string | undefined): void {
  if (value === undefined) {
    if (element.hasAttribute("title")) element.removeAttribute("title")
    return
  }
  if (element.title !== value || !element.hasAttribute("title")) element.title = value
}

function syncOptionalAttribute(element: HTMLElement, name: string, value: string | undefined): void {
  if (value === undefined) {
    if (element.hasAttribute(name)) element.removeAttribute(name)
    return
  }
  if (element.getAttribute(name) !== value) element.setAttribute(name, value)
}

function reconcileChildren(parent: Node, ordered: readonly Node[]): void {
  const retained = new Set(ordered)
  for (const child of [...parent.childNodes]) {
    if (!retained.has(child)) parent.removeChild(child)
  }
  let reference = parent.firstChild
  for (const child of ordered) {
    if (child === reference) {
      reference = reference.nextSibling
      continue
    }
    parent.insertBefore(child, reference)
  }
}
