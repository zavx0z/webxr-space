import {
  resolveLanguageHighlighter,
  type Token,
  type Tokens
} from "@zavx0z/highlighter"
import type {StyleValue} from "@zavx0z/react"
import {
  activeSyntaxTheme,
  resolveSyntaxScopeColorHex
} from "./syntax-theme.ts"

export type CodeEditorProps = Readonly<{
  value: string
  readOnly: true
  languageId?: string | undefined
  path?: string | undefined
  tokens?: Tokens | undefined
  showLineNumbers?: boolean | undefined
  title?: string | undefined
  style?: StyleValue
}>

type NormalizedToken = Readonly<{
  s: number
  e: number
  c: string
  fg?: string | undefined
  bg?: string | undefined
}>

export type CodeEditorSegment = Readonly<{
  key: string
  start: number
  end: number
  category: string
  text: string
  foreground: string
  background?: string | undefined
}>

export type CodeEditorViewModel = Readonly<{
  props: CodeEditorProps
  lines: readonly string[]
  segments: readonly (readonly CodeEditorSegment[])[]
  resolvedLanguageId: string
}>

const editorBackground = themeColor("editor.background", "#191a1c")
const editorForeground = themeColor("editor.foreground", "#bcbec4")
const gutterBackground = themeColor("editorGutter.background", editorBackground)
const gutterForeground = themeColor("editorLineNumber.foreground", "#4b5059")
const editorBorder = themeColor("editorIndentGuide.background", "#323438")

export const codeEditorPalette = Object.freeze({
  editorBackground,
  editorForeground,
  gutterBackground,
  gutterForeground,
  editorBorder
})

export function buildCodeEditorViewModel(props: CodeEditorProps): CodeEditorViewModel {
  if (typeof props !== "object" || props === null) throw new TypeError("CodeEditor props must be an object")
  if (typeof props.value !== "string") throw new TypeError("CodeEditor value must be a string")
  if (props.readOnly !== true) throw new TypeError("CodeEditor readOnly must be true")
  if (props.languageId !== undefined) assertNonEmpty(props.languageId, "CodeEditor languageId")
  if (props.path !== undefined) assertNonEmpty(props.path, "CodeEditor path")
  if (props.showLineNumbers !== undefined && typeof props.showLineNumbers !== "boolean") {
    throw new TypeError("CodeEditor showLineNumbers must be a boolean")
  }
  if (props.title !== undefined && typeof props.title !== "string") throw new TypeError("CodeEditor title must be a string")
  const value = normalizeLineEndings(props.value)
  const lines = Object.freeze(value.split("\n"))
  const resolved = props.tokens === undefined
    ? tokenize(lines, props.languageId, props.path)
    : Object.freeze({tokens: normalizeTokens(props.tokens, lines, false), languageId: props.languageId ?? "supplied"})
  const snapshot: CodeEditorProps = Object.freeze({
    value,
    readOnly: true,
    ...(props.languageId === undefined ? {} : {languageId: props.languageId}),
    ...(props.path === undefined ? {} : {path: props.path}),
    ...(props.tokens === undefined ? {} : {tokens: resolved.tokens as Tokens}),
    showLineNumbers: props.showLineNumbers ?? true,
    ...(props.title === undefined ? {} : {title: props.title}),
    ...(props.style === undefined ? {} : {style: props.style})
  })
  return Object.freeze({
    props: snapshot,
    lines,
    segments: Object.freeze(lines.map((line, index) => segmentsFor(line, resolved.tokens[index] ?? []))),
    resolvedLanguageId: resolved.languageId
  })
}

function tokenize(
  lines: readonly string[],
  languageId: string | undefined,
  path: string | undefined
): Readonly<{tokens: readonly (readonly NormalizedToken[])[]; languageId: string}> {
  const highlighter = resolveLanguageHighlighter({
    ...(languageId === undefined ? {} : {languageId}),
    ...(path === undefined ? {} : {path}),
    fallbackLanguageId: "plaintext"
  })
  const tokens = highlighter.tokenize(lines, {resolveForeground: resolveSyntaxScopeColorHex})
  return Object.freeze({tokens: normalizeTokens(tokens, lines, true), languageId: highlighter.id})
}

function normalizeTokens(
  tokens: Tokens,
  lines: readonly string[],
  normalizeOverlaps: boolean
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
  lineLength: number
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
    ...(token.bg === undefined ? {} : {bg: normalizeBackgroundColor(token.bg)})
  })
}

function segmentsFor(line: string, tokens: readonly NormalizedToken[]): readonly CodeEditorSegment[] {
  const segments: CodeEditorSegment[] = []
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
  background?: string
): CodeEditorSegment {
  const color = foreground ?? categoryColor(category)
  const prefix = category === "plain" ? "gap" : "token"
  return Object.freeze({
    key: `${prefix}:${start}:${end}:${category}`,
    start,
    end,
    category,
    text: line.slice(start, end),
    foreground: color,
    ...(background === undefined ? {} : {background})
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
    d: "variable.other"
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
  return `#${body.split("").map(character => character + character).join("")}`
}

function isBackgroundColor(value: string): boolean {
  const color = value.trim()
  return isHexColor(color) || /^rgba?\(\s*[+\-.\d%]+(?:\s*(?:,|\/|\s)\s*[+\-.\d%]+){2,3}\s*\)$/iu.test(color)
}

function normalizeBackgroundColor(value: string): string {
  return isHexColor(value) ? normalizeHexColor(value) : value.trim()
}
