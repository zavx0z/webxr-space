import { processTemplateLiteralAttribute, resolveDataPath } from "../parser"
import type { ParseContext } from "../parser.t"
import type { ValueStyle, ValueStyleObject } from "./style.t"

const SIMPLE_PATH_PATTERN = /^[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*$/
const STATIC_IDENTIFIERS = new Set(["true", "false", "null", "undefined"])

type ParsedKey = {
  key: string
  nextIndex: number
}

type ParsedValue = {
  value: string
  nextIndex: number
}

const skipWhitespace = (source: string, start: number): number => {
  let index = start
  while (index < source.length && /\s/.test(source[index] || "")) index++
  return index
}

const readQuotedKey = (source: string, start: number): ParsedKey | null => {
  const quote = source[start]
  if (quote !== '"' && quote !== "'") return null

  let index = start + 1
  while (index < source.length) {
    if (source[index] === "\\") {
      index += 2
      continue
    }
    if (source[index] === quote) {
      return {
        key: source.slice(start + 1, index),
        nextIndex: index + 1,
      }
    }
    index++
  }

  return null
}

const readStyleKey = (source: string, start: number): ParsedKey | null => {
  const index = skipWhitespace(source, start)
  const quoted = readQuotedKey(source, index)
  if (quoted) return quoted

  let cursor = index
  while (cursor < source.length && source[cursor] !== ":" && source[cursor] !== "}") cursor++

  const key = source.slice(index, cursor).trim()
  return key ? { key, nextIndex: cursor } : null
}

const readStyleValue = (source: string, start: number): ParsedValue => {
  const valueStart = skipWhitespace(source, start)
  let quote: '"' | "'" | "`" | null = null
  let braces = 0
  let brackets = 0
  let parentheses = 0
  let index = valueStart

  while (index < source.length) {
    const character = source[index]

    if (quote) {
      if (character === "\\") {
        index += 2
        continue
      }
      if (character === quote) quote = null
      index++
      continue
    }

    if (character === '"' || character === "'" || character === "`") {
      quote = character
      index++
      continue
    }

    if (character === "{") braces++
    else if (character === "}") {
      if (braces === 0 && brackets === 0 && parentheses === 0) break
      braces--
    } else if (character === "[") brackets++
    else if (character === "]") brackets--
    else if (character === "(") parentheses++
    else if (character === ")") parentheses--
    else if (character === "," && braces === 0 && brackets === 0 && parentheses === 0) break

    index++
  }

  return {
    value: source.slice(valueStart, index).trim(),
    nextIndex: index,
  }
}

const unwrapStaticString = (value: string): string | null => {
  const quote = value[0]
  if ((quote !== '"' && quote !== "'") || value[value.length - 1] !== quote) return null
  return value.slice(1, -1)
}

const parseStyleValue = (value: string, ctx: ParseContext): ValueStyle => {
  if (value.startsWith("{") && value.endsWith("}")) return parseStyleObject(value, ctx)

  const staticString = unwrapStaticString(value)
  if (staticString !== null) return staticString

  if (value.startsWith("`") && value.endsWith("`")) {
    return processTemplateLiteralAttribute(value, ctx) || value.slice(1, -1)
  }

  if (SIMPLE_PATH_PATTERN.test(value) && !STATIC_IDENTIFIERS.has(value)) {
    return { data: resolveDataPath(value, ctx) }
  }

  const expression = processTemplateLiteralAttribute(value.includes("${") ? value : `\${${value}}`, ctx)
  return expression || value
}

const parseStyleObject = (source: string, ctx: ParseContext): ValueStyleObject => {
  const style: ValueStyleObject = {}
  let index = skipWhitespace(source, 0)

  if (source[index] === "{") index++

  while (index < source.length) {
    index = skipWhitespace(source, index)
    if (source[index] === "}") break
    if (source[index] === ",") {
      index++
      continue
    }

    const parsedKey = readStyleKey(source, index)
    if (!parsedKey) break

    index = skipWhitespace(source, parsedKey.nextIndex)
    if (source[index] !== ":") break

    const parsedValue = readStyleValue(source, index + 1)
    if (parsedValue.value) style[parsedKey.key] = parseStyleValue(parsedValue.value, ctx)

    index = parsedValue.nextIndex
    if (source[index] === ",") index++
  }

  return style
}

/**
Parses a JavaScript-like style object without evaluating it.

Object values are traversed recursively, so quoted selectors and nested
at-rules remain ordinary syntax keys. Leaf values use the same static, path and
expression descriptors as other attributes.

@param str - Authored object literal, with or without the outer braces.
@param ctx - Current path and map context used to resolve dynamic bindings.
@returns Recursive style syntax, or `null` for an empty object.
*/
export const processStyleAttributes = (
  str: string,
  ctx: ParseContext = { pathStack: [], level: 0 }
): ValueStyleObject | null => {
  const source = str.trim()
  if (!source) return null

  const style = parseStyleObject(source.startsWith("{") ? source : `{${source}}`, ctx)
  return Object.keys(style).length > 0 ? style : null
}
