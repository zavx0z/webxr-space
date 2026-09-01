import {
  containsTaggedTemplateMarker,
  getTaggedTemplateShape,
  joinTaggedTemplateSource,
  parseTaggedTemplateSegments,
  readTaggedTemplateMarker,
  type TaggedTemplateSegment,
} from "./tagged-template.ts"

export type CssTemplateDeclaration = Readonly<{
  property: string
  segments: readonly TaggedTemplateSegment[]
}>

export type CssTemplateAttributeSelector = Readonly<{
  name: string
  value: string | null
}>

export type CssTemplateRule = Readonly<{
  attributeSelectors: readonly CssTemplateAttributeSelector[]
  type: "rule"
  pseudo: string
  pseudoClass: string
  declarations: readonly CssTemplateDeclaration[]
}>

export type CssTemplateFragment = Readonly<{
  type: "fragment"
  index: number
}>

export type CssTemplateItem = CssTemplateRule | CssTemplateFragment

export type CssTemplatePseudo =
  | ":active"
  | ":checked"
  | ":disabled"
  | ":focus"
  | ":focus-within"
  | ":hover"
  | ":indeterminate"

export type CssTemplateShape = Readonly<{
  items: readonly CssTemplateItem[]
  rules: readonly CssTemplateRule[]
  fragmentSlots: readonly number[]
  slotCount: number
}>

const cssShapeFrontend = Symbol("@zavx0z/template/css-shape")
const supportedPseudos: ReadonlySet<string> = new Set<CssTemplatePseudo>([
  ":active",
  ":checked",
  ":disabled",
  ":focus",
  ":focus-within",
  ":hover",
  ":indeterminate",
])

export function getCssTemplateShape(strings: TemplateStringsArray): CssTemplateShape {
  return getTaggedTemplateShape(strings, cssShapeFrontend, parseCssTemplateShape)
}

export function parseCssTemplateShape(strings: readonly string[]): CssTemplateShape {
  const slotCount = strings.length - 1
  const source = removeCssComments(joinTaggedTemplateSource(strings))
  const rules: CssTemplateRule[] = []
  const items: CssTemplateItem[] = []
  const fragmentSlots: number[] = []
  const seenSlots = new Set<number>()
  let directDeclarations: CssTemplateDeclaration[] = []
  const flushDirectDeclarations = (): void => {
    if (directDeclarations.length === 0) return
    const rule = Object.freeze({
      attributeSelectors: Object.freeze([]),
      type: "rule" as const,
      pseudo: "",
      pseudoClass: "",
      declarations: Object.freeze(directDeclarations),
    })
    rules.push(rule)
    items.push(rule)
    directDeclarations = []
  }
  let cursor = 0
  while (true) {
    cursor = skipWhitespace(source, cursor)
    if (cursor >= source.length) break
    const fragment = readTaggedTemplateMarker(source, cursor, slotCount)
    if (fragment !== null) {
      const afterFragment = skipWhitespace(source, fragment.end)
      if (source[afterFragment] === ":") {
        throw new Error("CSS property names cannot contain interpolations")
      }
      flushDirectDeclarations()
      if (seenSlots.has(fragment.index)) throw new Error(`Duplicate CSS interpolation ${fragment.index}`)
      seenSlots.add(fragment.index)
      fragmentSlots.push(fragment.index)
      items.push(Object.freeze({type: "fragment", index: fragment.index}))
      cursor = fragment.end
      continue
    }
    const boundary = findTopLevelBoundary(source, cursor)
    if (boundary.type === "close") {
      throw new Error("Scoped CSS contains an unexpected closing brace")
    }
    if (boundary.type === "open") {
      flushDirectDeclarations()
      const selector = source.slice(cursor, boundary.index).trim()
      const parsedSelector = parseScopedSelector(selector)
      const close = findRuleClose(source, boundary.index + 1)
      const declarations = parseDeclarations(
        source.slice(boundary.index + 1, close),
        slotCount,
        seenSlots,
      )
      if (declarations.length === 0) throw new Error(`Scoped CSS selector ${selector} has no declarations`)
      const rule = Object.freeze({
        attributeSelectors: parsedSelector.attributeSelectors,
        type: "rule" as const,
        pseudo: parsedSelector.suffix,
        pseudoClass: parsedSelector.pseudoClass,
        declarations: Object.freeze(declarations)
      })
      rules.push(rule)
      items.push(rule)
      cursor = close + 1
      continue
    }
    const end = boundary.type === "semicolon" ? boundary.index : source.length
    const declaration = parseDeclaration(source.slice(cursor, end), slotCount, seenSlots)
    directDeclarations.push(declaration)
    cursor = boundary.type === "semicolon" ? boundary.index + 1 : source.length
  }
  flushDirectDeclarations()
  if (items.length === 0) throw new Error("A css template requires at least one declaration, scoped rule, or fragment")
  for (let index = 0; index < slotCount; index += 1) {
    if (!seenSlots.has(index)) {
      throw new Error(`CSS interpolation ${index} must occur in a declaration value or between rules`)
    }
  }
  return Object.freeze({
    items: Object.freeze(items),
    rules: Object.freeze(rules),
    fragmentSlots: Object.freeze(fragmentSlots),
    slotCount
  })
}

function parseDeclarations(
  source: string,
  slotCount: number,
  seenSlots: Set<number>,
): CssTemplateDeclaration[] {
  const declarations: CssTemplateDeclaration[] = []
  for (const entry of splitCss(source, ";")) {
    const value = entry.trim()
    if (value.length === 0) continue
    declarations.push(parseDeclaration(value, slotCount, seenSlots))
  }
  return declarations
}

function parseDeclaration(
  source: string,
  slotCount: number,
  seenSlots: Set<number>,
): CssTemplateDeclaration {
  const value = source.trim()
  const colon = findCssSeparator(value, ":")
  if (colon < 0) throw new Error(`Scoped CSS declaration is missing a colon: ${value}`)
  const property = value.slice(0, colon).trim()
  const declarationValue = value.slice(colon + 1).trim()
  if (containsTaggedTemplateMarker(property)) {
    throw new Error("CSS property names cannot contain interpolations")
  }
  if (!/^(?:--[a-zA-Z0-9_-]+|-?[a-z][a-z0-9-]*)$/.test(property)) {
    throw new Error(`Invalid scoped CSS property ${property}`)
  }
  if (declarationValue.length === 0) {
    throw new Error(`Scoped CSS property ${property} requires a value`)
  }
  const segments = parseTaggedTemplateSegments(declarationValue, slotCount)
  for (const segment of segments) {
    if (segment.type !== "slot") continue
    if (seenSlots.has(segment.index)) throw new Error(`Duplicate CSS interpolation ${segment.index}`)
    seenSlots.add(segment.index)
  }
  return Object.freeze({property, segments: Object.freeze(segments)})
}

function parseScopedSelector(value: string): Readonly<{
  attributeSelectors: readonly CssTemplateAttributeSelector[]
  pseudoClass: string
  suffix: string
}> {
  if (containsTaggedTemplateMarker(value)) throw new Error("CSS selectors cannot contain interpolations")
  if (value === "&") {
    throw new Error(
      "Redundant component CSS selector & { ... }; write base declarations directly and remove the & { } wrapper",
    )
  }
  if (!value.startsWith("&")) {
    throw new Error(`Component CSS selector must start with &: ${value}`)
  }
  let cursor = 1
  let suffix = ""
  const attributeSelectors: CssTemplateAttributeSelector[] = []
  while (value[cursor] === "[") {
    const match = /^\[([a-zA-Z_][a-zA-Z0-9_.:-]*)(?:=(["'])([^"'\\\]]*)\2)?\]/.exec(
      value.slice(cursor),
    )
    if (match === null) throw new Error(`Unsupported component CSS selector ${value}`)
    const name = match[1]!.toLowerCase()
    const attributeValue = match[3]
    attributeSelectors.push(Object.freeze({
      name,
      value: attributeValue ?? null,
    }))
    suffix += attributeValue === undefined
      ? `[${name}]`
      : `[${name}=${JSON.stringify(attributeValue)}]`
    cursor += match[0].length
  }
  const pseudo = value.slice(cursor)
  if (pseudo !== "" && !supportedPseudos.has(pseudo)) {
    throw new Error(`Unsupported component CSS selector ${value}`)
  }
  if (suffix === "" && pseudo === "") throw new Error(`Unsupported component CSS selector ${value}`)
  return Object.freeze({
    attributeSelectors: Object.freeze(attributeSelectors),
    pseudoClass: pseudo,
    suffix: `${suffix}${pseudo}`,
  })
}

type TopLevelBoundary = Readonly<{
  index: number
  type: "close" | "open" | "semicolon"
}> | Readonly<{
  type: "end"
}>

function findTopLevelBoundary(source: string, start: number): TopLevelBoundary {
  let quote: "\"" | "'" | null = null
  let parentheses = 0
  for (let cursor = start; cursor < source.length; cursor += 1) {
    const character = source[cursor]
    if (quote) {
      if (character === "\\") cursor += 1
      else if (character === quote) quote = null
      continue
    }
    if (character === "\"" || character === "'") {
      quote = character
      continue
    }
    if (character === "(") parentheses += 1
    else if (character === ")") {
      parentheses -= 1
      if (parentheses < 0) throw new Error("Scoped CSS contains an unexpected closing parenthesis")
    } else if (parentheses === 0 && character === "{") {
      return Object.freeze({type: "open", index: cursor})
    } else if (parentheses === 0 && character === "}") {
      return Object.freeze({type: "close", index: cursor})
    } else if (parentheses === 0 && character === ";") {
      return Object.freeze({type: "semicolon", index: cursor})
    }
  }
  if (quote) throw new Error("Scoped CSS contains an unclosed string")
  if (parentheses !== 0) throw new Error("Scoped CSS contains unbalanced parentheses")
  return Object.freeze({type: "end"})
}

function findRuleClose(source: string, start: number): number {
  let quote: "\"" | "'" | null = null
  let parentheses = 0
  for (let cursor = start; cursor < source.length; cursor += 1) {
    const character = source[cursor]
    if (quote) {
      if (character === "\\") cursor += 1
      else if (character === quote) quote = null
      continue
    }
    if (character === "\"" || character === "'") {
      quote = character
      continue
    }
    if (character === "(") parentheses += 1
    else if (character === ")") {
      parentheses -= 1
      if (parentheses < 0) throw new Error("Scoped CSS contains an unexpected closing parenthesis")
    } else if (character === "{" && parentheses === 0) {
      throw new Error("Nested component CSS rules are unsupported")
    } else if (character === "}" && parentheses === 0) return cursor
  }
  throw new Error("Scoped CSS rule is missing a closing brace")
}

function splitCss(source: string, separator: string): string[] {
  const result: string[] = []
  let quote: "\"" | "'" | null = null
  let parentheses = 0
  let start = 0
  for (let cursor = 0; cursor < source.length; cursor += 1) {
    const character = source[cursor]
    if (quote) {
      if (character === "\\") cursor += 1
      else if (character === quote) quote = null
      continue
    }
    if (character === "\"" || character === "'") {
      quote = character
      continue
    }
    if (character === "(") parentheses += 1
    else if (character === ")") parentheses -= 1
    else if (character === separator && parentheses === 0) {
      result.push(source.slice(start, cursor))
      start = cursor + 1
    }
  }
  if (quote) throw new Error("Scoped CSS contains an unclosed string")
  if (parentheses !== 0) throw new Error("Scoped CSS contains unbalanced parentheses")
  result.push(source.slice(start))
  return result
}

function findCssSeparator(source: string, separator: string): number {
  let quote: "\"" | "'" | null = null
  let parentheses = 0
  for (let cursor = 0; cursor < source.length; cursor += 1) {
    const character = source[cursor]
    if (quote) {
      if (character === "\\") cursor += 1
      else if (character === quote) quote = null
      continue
    }
    if (character === "\"" || character === "'") quote = character
    else if (character === "(") parentheses += 1
    else if (character === ")") parentheses -= 1
    else if (character === separator && parentheses === 0) return cursor
  }
  return -1
}

function removeCssComments(source: string): string {
  let result = ""
  let quote: "\"" | "'" | null = null
  for (let cursor = 0; cursor < source.length; cursor += 1) {
    const character = source[cursor]!
    if (quote) {
      result += character
      if (character === "\\" && cursor + 1 < source.length) result += source[++cursor]
      else if (character === quote) quote = null
      continue
    }
    if (character === "\"" || character === "'") {
      quote = character
      result += character
      continue
    }
    if (character === "/" && source[cursor + 1] === "*") {
      const end = source.indexOf("*/", cursor + 2)
      if (end < 0) throw new Error("Scoped CSS contains an unclosed comment")
      result += " "
      cursor = end + 1
      continue
    }
    result += character
  }
  return result
}

function skipWhitespace(source: string, start: number): number {
  let cursor = start
  while (cursor < source.length && /\s/.test(source[cursor]!)) cursor += 1
  return cursor
}
