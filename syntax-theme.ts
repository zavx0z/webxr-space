import islandsDarkTheme from "./themes/islands-dark.color-theme.json"

export type SyntaxTokenColorRule = Readonly<{
  name?: string
  scope?: string | readonly string[]
  settings?: Readonly<{
    foreground?: string
    fontStyle?: string
  }>
}>

export type SyntaxColorTheme = Readonly<{
  name?: string
  type?: string
  colors?: Readonly<Record<string, string>>
  tokenColors?: readonly SyntaxTokenColorRule[]
}>

export const activeSyntaxTheme = islandsDarkTheme as SyntaxColorTheme
export const activeSyntaxThemeName = activeSyntaxTheme.name ?? "Islands Dark"

export function resolveSyntaxScopeColorHex(
  scopes: readonly string[],
  fallback?: string,
): string | undefined {
  const color = foregroundFor(activeSyntaxTheme, scopes)
    ?? fallback
    ?? activeSyntaxTheme.colors?.["editor.foreground"]
  const normalized = normalizeHexColor(color)
  return normalized === undefined ? undefined : `#${normalized}`
}

function foregroundFor(
  theme: SyntaxColorTheme,
  selectors: readonly string[],
): string | undefined {
  const rules = theme.tokenColors ?? []
  for (const exact of [true, false]) {
    for (const selector of selectors) {
      for (let index = rules.length - 1; index >= 0; index -= 1) {
        const rule = rules[index]
        const foreground = rule?.settings?.foreground
        if (foreground === undefined) continue
        if (ruleScopes(rule?.scope).some((scope) => matchesScope(scope, selector, exact))) {
          return foreground
        }
      }
    }
  }
  return undefined
}

function ruleScopes(scope: string | readonly string[] | undefined): readonly string[] {
  const values = typeof scope === "string" ? [scope] : scope ?? []
  const scopes: string[] = []
  for (const value of values) {
    for (const part of value.split(",")) {
      const trimmed = part.trim()
      if (trimmed.length > 0) scopes.push(trimmed)
    }
  }
  return Object.freeze(scopes)
}

function matchesScope(scope: string, selector: string, exact: boolean): boolean {
  if (scope === selector) return true
  for (const part of scope.split(/\s+|>/u)) {
    const trimmed = part.trim()
    if (trimmed === selector) return true
    if (!exact && (
      trimmed.startsWith(`${selector}.`)
      || selector.startsWith(`${trimmed}.`)
    )) return true
  }
  return false
}

function normalizeHexColor(value: string | undefined): string | undefined {
  const raw = value?.trim()
  if (raw === undefined) return undefined
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/iu.exec(raw)
  if (match === null) return undefined
  const body = match[1]!
  if (body.length === 3) {
    return body.split("").map((character) => character + character).join("").toLowerCase()
  }
  return body.toLowerCase()
}
