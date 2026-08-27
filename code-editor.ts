import type {
  Document,
  HTMLLIElement,
  HTMLUListElement,
  HTMLElement,
  Node,
  Text,
} from "@zavx0z/dom"
import {
  resolveLanguageHighlighter,
  type Token,
  type Tokens,
} from "@zavx0z/highlighter"
import {
  activeSyntaxTheme,
  resolveSyntaxScopeColorHex,
} from "./syntax-theme.ts"

export type CodeEditorProps = Readonly<{
  value: string
  readOnly: true
  languageId?: string
  path?: string
  tokens?: Tokens
  showLineNumbers?: boolean
  title?: string
  className?: string
}>

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

const editorBackground = themeColor("editor.background", "#191a1c")
const editorForeground = themeColor("editor.foreground", "#bcbec4")
const gutterBackground = themeColor("editorGutter.background", editorBackground)
const gutterForeground = themeColor("editorLineNumber.foreground", "#4b5059")
const editorBorder = themeColor("editorIndentGuide.background", "#323438")

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

type NormalizedToken = Readonly<{
  s: number
  e: number
  c: string
  fg?: string
  bg?: string
}>

type Segment = Readonly<{
  key: string
  start: number
  end: number
  category: string
  text: string
  foreground: string
  background?: string
}>

type NormalizedProps = Readonly<{
  props: CodeEditorProps
  lines: readonly string[]
  segments: readonly (readonly Segment[])[]
  resolvedLanguageId: string
}>

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
    const normalized = normalizeProps(props)
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
  normalized: NormalizedProps,
): void {
  const {props, resolvedLanguageId} = normalized
  root.className = props.className === undefined
    ? "ui-code-editor"
    : `ui-code-editor ${props.className}`
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
  normalized: NormalizedProps,
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
  segments: readonly Segment[],
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

function normalizeProps(props: CodeEditorProps): NormalizedProps {
  if (typeof props !== "object" || props === null) throw new TypeError("CodeEditor props must be an object")
  if (typeof props.value !== "string") throw new TypeError("CodeEditor value must be a string")
  if (props.readOnly !== true) throw new TypeError("CodeEditor readOnly must be true")
  if (props.languageId !== undefined) assertNonEmpty(props.languageId, "CodeEditor languageId")
  if (props.path !== undefined) assertNonEmpty(props.path, "CodeEditor path")
  if (props.showLineNumbers !== undefined && typeof props.showLineNumbers !== "boolean") {
    throw new TypeError("CodeEditor showLineNumbers must be a boolean")
  }
  if (props.title !== undefined && typeof props.title !== "string") throw new TypeError("CodeEditor title must be a string")
  if (props.className !== undefined && typeof props.className !== "string") throw new TypeError("CodeEditor className must be a string")
  const value = normalizeLineEndings(props.value)
  const lines = Object.freeze(value.split("\n"))
  const resolved = props.tokens === undefined
    ? tokenize(lines, props.languageId, props.path)
    : Object.freeze({tokens: normalizeTokens(props.tokens, lines, false), languageId: props.languageId ?? "supplied"})
  const className = props.className?.trim().replace(/\s+/g, " ")
  const snapshot: CodeEditorProps = Object.freeze({
    value,
    readOnly: true,
    ...(props.languageId === undefined ? {} : {languageId: props.languageId}),
    ...(props.path === undefined ? {} : {path: props.path}),
    ...(props.tokens === undefined ? {} : {tokens: resolved.tokens as Tokens}),
    showLineNumbers: props.showLineNumbers ?? true,
    ...(props.title === undefined ? {} : {title: props.title}),
    ...(className === undefined || className === "" ? {} : {className}),
  })
  return Object.freeze({
    props: snapshot,
    lines,
    segments: Object.freeze(lines.map((line, index) => segmentsFor(line, resolved.tokens[index] ?? []))),
    resolvedLanguageId: resolved.languageId,
  })
}

function tokenize(
  lines: readonly string[],
  languageId: string | undefined,
  path: string | undefined,
): Readonly<{tokens: readonly (readonly NormalizedToken[])[]; languageId: string}> {
  const highlighter = resolveLanguageHighlighter({
    ...(languageId === undefined ? {} : {languageId}),
    ...(path === undefined ? {} : {path}),
    fallbackLanguageId: "plaintext",
  })
  const tokens = highlighter.tokenize(lines, {resolveForeground: resolveSyntaxScopeColorHex})
  return Object.freeze({tokens: normalizeTokens(tokens, lines, true), languageId: highlighter.id})
}

function normalizeTokens(
  tokens: Tokens,
  lines: readonly string[],
  normalizeOverlaps: boolean,
): readonly (readonly NormalizedToken[])[] {
  if (!Array.isArray(tokens) || tokens.length !== lines.length) {
    throw new RangeError("CodeEditor tokens must contain exactly one row per line")
  }
  return Object.freeze(tokens.map((row, lineIndex) => {
    if (!Array.isArray(row)) throw new TypeError(`CodeEditor tokens row ${lineIndex} must be an array`)
    const normalized = row.map((token, tokenIndex) => normalizeToken(token, lineIndex, tokenIndex, lines[lineIndex]!.length))
      .sort((left, right) => left.s - right.s || right.e - left.e)
    const flattened: NormalizedToken[] = []
    let end = 0
    for (const token of normalized) {
      if (token.s < end && !normalizeOverlaps) throw new RangeError(`CodeEditor tokens overlap on line ${lineIndex}`)
      const start = normalizeOverlaps ? Math.max(end, token.s) : token.s
      if (token.e <= start) continue
      const next = start === token.s ? token : Object.freeze({...token, s: start})
      flattened.push(next)
      end = next.e
    }
    return Object.freeze(flattened)
  }))
}

function normalizeToken(
  token: Token,
  lineIndex: number,
  tokenIndex: number,
  lineLength: number,
): NormalizedToken {
  if (typeof token !== "object" || token === null) throw new TypeError(`CodeEditor token ${lineIndex}:${tokenIndex} must be an object`)
  if (!Number.isSafeInteger(token.s) || !Number.isSafeInteger(token.e) || token.s < 0 || token.e <= token.s || token.e > lineLength) {
    throw new RangeError(`CodeEditor token ${lineIndex}:${tokenIndex} has an invalid range`)
  }
  assertNonEmpty(token.c, `CodeEditor token ${lineIndex}:${tokenIndex} category`)
  if (token.fg !== undefined) assertHexColor(token.fg, `CodeEditor token ${lineIndex}:${tokenIndex} foreground`)
  if (token.bg !== undefined) assertBackgroundColor(token.bg, `CodeEditor token ${lineIndex}:${tokenIndex} background`)
  return Object.freeze({
    s: token.s,
    e: token.e,
    c: token.c,
    ...(token.fg === undefined ? {} : {fg: normalizeHexColor(token.fg)}),
    ...(token.bg === undefined ? {} : {bg: normalizeBackgroundColor(token.bg)}),
  })
}

function segmentsFor(line: string, tokens: readonly NormalizedToken[]): readonly Segment[] {
  const segments: Segment[] = []
  let cursor = 0
  for (const token of tokens) {
    if (token.s > cursor) segments.push(segment(line, cursor, token.s, "plain"))
    segments.push(segment(line, token.s, token.e, token.c, token.fg, token.bg))
    cursor = token.e
  }
  if (cursor < line.length) segments.push(segment(line, cursor, line.length, "plain"))
  return Object.freeze(segments)
}

function segment(
  line: string,
  start: number,
  end: number,
  category: string,
  foreground?: string,
  background?: string,
): Segment {
  const color = foreground ?? categoryColor(category)
  const prefix = category === "plain" ? "gap" : "token"
  return Object.freeze({
    key: `${prefix}:${start}:${end}:${category}`,
    start,
    end,
    category,
    text: line.slice(start, end),
    foreground: color,
    ...(background === undefined ? {} : {background}),
  })
}

function categoryColor(category: string): string {
  const scope = ({
    k: "keyword.control",
    s: "string.quoted",
    n: "constant.numeric",
    c: "comment",
    t: "entity.name.type",
    f: "entity.name.function",
    p: "punctuation",
    d: "variable.other",
  } as Readonly<Record<string, string>>)[category] ?? category
  return resolveSyntaxScopeColorHex([scope], editorForeground) ?? editorForeground
}

function themeColor(key: string, fallback: string): string {
  const value = activeSyntaxTheme.colors?.[key]
  return value === undefined || !isHexColor(value) ? fallback : normalizeHexColor(value)
}

function normalizeLineEndings(value: string): string {
  return value.replaceAll("\r\n", "\n").replaceAll("\r", "\n")
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

function assertNonEmpty(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) throw new TypeError(`${label} must not be empty`)
}

function assertHexColor(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !isHexColor(value)) throw new TypeError(`${label} must be a hex color`)
}

function assertBackgroundColor(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string" || !isBackgroundColor(value)) {
    throw new TypeError(`${label} must be a supported CSS color`)
  }
}

function isHexColor(value: string): boolean {
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/iu.test(value.trim())
}

function normalizeHexColor(value: string): string {
  const body = value.trim().slice(1).toLowerCase()
  if (body.length !== 3) return `#${body}`
  return `#${body.split("").map((character) => character + character).join("")}`
}

function isBackgroundColor(value: string): boolean {
  const color = value.trim()
  return isHexColor(color) || /^rgba?\(\s*[+\-.\d%]+(?:\s*(?:,|\/|\s)\s*[+\-.\d%]+){2,3}\s*\)$/iu.test(color)
}

function normalizeBackgroundColor(value: string): string {
  return isHexColor(value) ? normalizeHexColor(value) : value.trim()
}
