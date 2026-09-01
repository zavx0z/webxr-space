import type {
  Expression,
  Identifier,
  Node,
  ObjectLiteralExpression,
  PropertyName,
  SourceFile,
} from "typescript/unstable/ast"
import {skipOuterExpressions, SyntaxKind} from "typescript/unstable/ast"
import {
  isArrayLiteralExpression,
  isBinaryExpression,
  isComputedPropertyName,
  isFalseLiteral,
  isIdentifier,
  isNoSubstitutionTemplateLiteral,
  isNullLiteral,
  isNumericLiteral,
  isObjectLiteralExpression,
  isOmittedExpression,
  isParenthesizedExpression,
  isPropertyAssignment,
  isShorthandPropertyAssignment,
  isSpreadAssignment,
  isSpreadElement,
  isStringLiteral,
} from "typescript/unstable/ast/is"
import {JsxCompileError} from "./errors.ts"
import {encodeCompiledStyleText} from "../style-codec.ts"
import type {
  CssTemplateDeclaration,
  CssTemplateRule,
  CssTemplateShape,
} from "../css-shape.ts"
import type {TaggedTemplateSegment} from "../tagged-template.ts"

export type JsxStylePrimitiveKind = "bigint" | "nullish" | "number" | "string" | "unsupported"

export type CompiledCssTemplateSource = Readonly<{
  expressions: readonly Expression[]
  shape: CssTemplateShape
}>

export type CompiledStyleFragment = Readonly<{
  attributeName: `data-z-${string}`
  condition: string | null
  cssTextExpression: string
  id: string
  sourceCssTextExpression: string | null
}>

export type CompiledStyleExtraction = Readonly<{
  fragments: readonly CompiledStyleFragment[]
  residualExpression: string | null
}>

export type StyleExtractionContext = Readonly<{
  nextIdentity(source: string): Readonly<{
    attributeName: `data-z-${string}`
    id: string
  }>
  primitiveKinds: ReadonlyMap<Node, JsxStylePrimitiveKind>
  isPassThrough(expression: Expression): boolean
  resolveCssTemplate?(expression: Expression): CompiledCssTemplateSource | null
  styleEncoder: string
  sourceFile: SourceFile
  sourcePath: string
  symbols: ReadonlyMap<Node, number>
  unstableSymbols: ReadonlySet<number>
}>

export type ComponentStyleExtractionContext = Readonly<{
  primitiveKinds: ReadonlyMap<Node, JsxStylePrimitiveKind>
  isPassThrough(expression: Expression): boolean
  resolveCssTemplate(expression: Expression): CompiledCssTemplateSource | null
  styleEncoder: string
  sourceFile: SourceFile
  sourcePath: string
}>

type CssValue = Readonly<{code: string; encodedCode: string; empty: boolean}>
type CssDeclaration = Readonly<{property: string; value: CssValue}>
type CssRule = Readonly<{declarations: readonly CssDeclaration[]; pseudo: string}>
type ObjectExtraction = Readonly<{
  rules: readonly CssRule[]
  residualExpression: string | null
}>
type CssValueContext = Pick<
  StyleExtractionContext | ComponentStyleExtractionContext,
  "primitiveKinds" | "sourceFile" | "sourcePath" | "styleEncoder"
>

const supportedPseudos: ReadonlySet<string> = new Set([
  ":active",
  ":checked",
  ":disabled",
  ":focus",
  ":focus-within",
  ":hover",
  ":indeterminate",
])

export function extractCompiledStyle(
  expression: Expression,
  context: StyleExtractionContext,
): CompiledStyleExtraction {
  const value = unwrap(expression)
  const cssTemplate = context.resolveCssTemplate?.(value) ?? null
  if (cssTemplate) return extractCssTemplate(cssTemplate, null, context)
  if (isObjectLiteralExpression(value) || isArrayLiteralExpression(value) || logicalStaticObject(value)) {
    throw compileError(context, "style objects and arrays are unsupported; author css tagged templates")
  }
  if (context.isPassThrough(value)) {
    return Object.freeze({fragments: Object.freeze([]), residualExpression: value.getText(context.sourceFile)})
  }
  throw compileError(context, "intrinsic style authoring requires a css tagged template or direct props.style")
}

/** Lowers one caller-facing component style prop to base-only inline CSS. */
export function extractComponentStyle(
  expression: Expression,
  context: ComponentStyleExtractionContext,
): string {
  const value = unwrap(expression)
  const cssTemplate = context.resolveCssTemplate(value)
  if (cssTemplate) return componentCssTemplateExpression(cssTemplate, context)
  if (isObjectLiteralExpression(value) || isArrayLiteralExpression(value) || logicalStaticObject(value)) {
    throw componentCompileError(context, "component style objects and arrays are unsupported; author one css tagged template")
  }
  if (context.isPassThrough(value)) return value.getText(context.sourceFile)
  throw componentCompileError(context, "component style prop requires css tagged template or direct props.style")
}

function extractCssTemplate(
  source: CompiledCssTemplateSource,
  condition: string | null,
  context: StyleExtractionContext,
): CompiledStyleExtraction {
  const fragments: CompiledStyleFragment[] = []
  const residual: string[] = []
  let rules: CssRule[] = []
  const flushRules = (): void => {
    if (!rules.some(rule => rule.declarations.length > 0)) {
      rules = []
      return
    }
    const identity = context.nextIdentity(serializeRules("data-z-style-scope", rules))
    fragments.push(Object.freeze({
      ...identity,
      condition,
      cssTextExpression: serializeRules(identity.attributeName, rules),
      sourceCssTextExpression: serializeAuthoredRules(rules),
    }))
    rules = []
  }

  for (let itemIndex = 0; itemIndex < source.shape.items.length; itemIndex += 1) {
    const item = source.shape.items[itemIndex]!
    if (item.type === "fragment") {
      flushRules()
      const nested = extractNestedCssFragment(
        source.expressions[item.index]!,
        condition,
        itemIndex === source.shape.items.length - 1,
        context,
      )
      fragments.push(...nested.fragments)
      if (nested.residualExpression !== null) residual.push(nested.residualExpression)
      continue
    }
    const rule = item as CssTemplateRule
    const declarations: CssDeclaration[] = []
    for (const declaration of rule.declarations) {
      const expressions = declaration.segments
        .filter(segment => segment.type === "slot")
        .map(segment => source.expressions[segment.index]!)
      const stable = expressions.every(expression => isModuleStable(expression, context))
      if (!stable) {
        if (rule.pseudo !== "") {
          throw compileError(
            context,
          `style selector &${rule.pseudo} declaration ${declaration.property} cannot depend on props or component state`,
          )
        }
        residual.push(cssInlineDeclarationExpression(declaration, source.expressions, context))
        continue
      }
      const value = cssTemplateValue(declaration.segments, source.expressions, context)
      if (!value.empty) declarations.push(Object.freeze({property: declaration.property, value}))
    }
    rules.push(Object.freeze({pseudo: rule.pseudo, declarations: Object.freeze(declarations)}))
  }
  flushRules()
  return Object.freeze({
    fragments: Object.freeze(fragments),
    residualExpression: residual.length === 0
      ? null
      : condition === null
        ? `[${residual.join(", ")}]`
        : `(${condition}) && [${residual.join(", ")}]`,
  })
}

function extractNestedCssFragment(
  expression: Expression,
  condition: string | null,
  final: boolean,
  context: StyleExtractionContext,
): CompiledStyleExtraction {
  const value = unwrap(expression)
  if (isNullLiteral(value) || isFalseLiteral(value) || isUndefinedIdentifier(value)) {
    return Object.freeze({fragments: Object.freeze([]), residualExpression: null})
  }
  const nested = context.resolveCssTemplate?.(value) ?? null
  if (nested !== null) return extractCssTemplate(nested, condition, context)
  const conditional = logicalCssTemplate(value, context)
  if (conditional !== null) {
    return extractCssTemplate(
      conditional.source,
      combineConditions(condition, conditional.condition),
      context,
    )
  }
  if (context.isPassThrough(value)) {
    if (!final) throw compileError(context, "props.style CSS fragment must be final")
    return Object.freeze({
      fragments: Object.freeze([]),
      residualExpression: value.getText(context.sourceFile)
    })
  }
  throw compileError(
    context,
    "CSS rule fragments require nested css, condition && css, false, null, undefined, or final props.style",
  )
}

function combineConditions(left: string | null, right: string): string {
  return left === null ? right : `(${left}) && (${right})`
}

function componentCssTemplateExpression(
  source: CompiledCssTemplateSource,
  context: ComponentStyleExtractionContext,
): string {
  const values: string[] = []
  for (let itemIndex = 0; itemIndex < source.shape.items.length; itemIndex += 1) {
    const item = source.shape.items[itemIndex]!
    if (item.type === "rule") {
      if (item.pseudo !== "") {
        throw componentCompileError(context, `component style prop rejects selector &${item.pseudo}`)
      }
      for (const declaration of item.declarations) {
        values.push(cssInlineDeclarationExpression(declaration, source.expressions, context))
      }
      continue
    }
    const expression = unwrap(source.expressions[item.index]!)
    if (isNullLiteral(expression) || isFalseLiteral(expression) || isUndefinedIdentifier(expression)) continue
    const nested = context.resolveCssTemplate(expression)
    if (nested !== null) {
      values.push(componentCssTemplateExpression(nested, context))
      continue
    }
    const conditional = componentLogicalCssTemplate(expression, context)
    if (conditional !== null) {
      values.push(`(${conditional.condition}) && ${componentCssTemplateExpression(conditional.source, context)}`)
      continue
    }
    if (context.isPassThrough(expression)) {
      if (itemIndex !== source.shape.items.length - 1) {
        throw componentCompileError(context, "props.style CSS fragment must be final")
      }
      values.push(expression.getText(context.sourceFile))
      continue
    }
    throw componentCompileError(
      context,
      "component CSS fragments require nested css, condition && css, false, null, undefined, or final props.style",
    )
  }
  return `[${values.join(", ")}]`
}

function componentLogicalCssTemplate(
  expression: Expression,
  context: ComponentStyleExtractionContext,
): Readonly<{condition: string; source: CompiledCssTemplateSource}> | null {
  if (!isBinaryExpression(expression) ||
    expression.operatorToken.kind !== SyntaxKind.AmpersandAmpersandToken) return null
  const source = context.resolveCssTemplate(unwrap(expression.right))
  return source === null
    ? null
    : Object.freeze({condition: expression.left.getText(context.sourceFile), source})
}

function cssTemplateValue(
  segments: readonly TaggedTemplateSegment[],
  expressions: readonly Expression[],
  context: CssValueContext,
): CssValue {
  const parts: string[] = []
  const encodedParts: string[] = []
  for (const segment of segments) {
    if (segment.type === "static") {
      appendStatic(parts, segment.value)
      appendStatic(encodedParts, encodeCompiledStyleText(segment.value))
      continue
    }
    const expression = expressions[segment.index]!
    const value = unwrap(expression)
    const kind = context.primitiveKinds.get(value) ?? "unsupported"
    if (kind === "nullish") {
      if (segments.length === 1) {
        return Object.freeze({
          code: JSON.stringify(""),
          encodedCode: JSON.stringify(""),
          empty: true
        })
      }
      throw compileError(context, "nullish CSS interpolation must occupy the complete declaration value")
    }
    if (kind !== "string" && kind !== "number" && kind !== "bigint") {
      throw compileError(context, "CSS template interpolation must resolve to a primitive value")
    }
    const code = `String(${value.getText(context.sourceFile)})`
    parts.push(code)
    encodedParts.push(`${context.styleEncoder}(${code})`)
  }
  return Object.freeze({
    code: parts.length === 0 ? JSON.stringify("") : parts.join(" + "),
    encodedCode: encodedParts.length === 0 ? JSON.stringify("") : encodedParts.join(" + "),
    empty: parts.length === 0,
  })
}

function cssInlineDeclarationExpression(
  declaration: CssTemplateDeclaration,
  expressions: readonly Expression[],
  context: CssValueContext,
): string {
  const value = cssTemplateValue(declaration.segments, expressions, context)
  return `${JSON.stringify(`${declaration.property}: `)} + ${value.code}`
}

function withCondition(
  extraction: CompiledStyleExtraction,
  condition: string,
): CompiledStyleExtraction {
  return Object.freeze({
    fragments: Object.freeze(extraction.fragments.map(fragment => Object.freeze({
      ...fragment,
      condition: fragment.condition === null
        ? condition
        : `(${condition}) && (${fragment.condition})`,
    }))),
    residualExpression: extraction.residualExpression === null
      ? null
      : `(${condition}) && ${extraction.residualExpression}`,
  })
}

function extractArray(
  elements: readonly Expression[],
  context: StyleExtractionContext,
): CompiledStyleExtraction {
  const fragments: CompiledStyleFragment[] = []
  const residual: string[] = []
  for (const element of elements) {
    if (isOmittedExpression(element)) continue
    if (isSpreadElement(element)) {
      throw compileError(context, "style arrays cannot contain spreads")
    }
    const value = unwrap(element)
    if (isNullLiteral(value) || isFalseLiteral(value) || isUndefinedIdentifier(value)) continue
    const extracted = extractCompiledStyle(value, context)
    fragments.push(...extracted.fragments)
    if (extracted.residualExpression !== null) residual.push(extracted.residualExpression)
  }
  return Object.freeze({
    fragments: Object.freeze(fragments),
    residualExpression: residual.length === 0 ? null : `[${residual.join(", ")}]`,
  })
}

function extractObject(
  object: ObjectLiteralExpression,
  condition: string | null,
  context: StyleExtractionContext,
): CompiledStyleExtraction {
  const parsed = parseObject(object, context)
  const fragments: CompiledStyleFragment[] = []
  if (parsed.rules.some(rule => rule.declarations.length > 0)) {
    const identity = context.nextIdentity(serializeRules("data-z-style-scope", parsed.rules))
    fragments.push(Object.freeze({
      ...identity,
      condition,
      cssTextExpression: serializeRules(identity.attributeName, parsed.rules),
      sourceCssTextExpression: serializeAuthoredRules(parsed.rules),
    }))
  }
  return Object.freeze({
    fragments: Object.freeze(fragments),
    residualExpression: parsed.residualExpression === null
      ? null
      : condition === null
        ? parsed.residualExpression
        : `(${condition}) && ${parsed.residualExpression}`,
  })
}

function parseObject(
  object: ObjectLiteralExpression,
  context: StyleExtractionContext,
): ObjectExtraction {
  const base: CssDeclaration[] = []
  const pseudos: CssRule[] = []
  const residual: string[] = []
  for (const property of object.properties) {
    if (isSpreadAssignment(property)) throw compileError(context, "style objects cannot contain spreads")
    if (!isPropertyAssignment(property) && !isShorthandPropertyAssignment(property)) {
      throw compileError(context, "style objects support only property assignments")
    }
    if (isComputedPropertyName(property.name)) {
      throw compileError(context, "style objects cannot contain computed property names")
    }
    const sourceName = propertyName(property.name, context)
    const initializer = isPropertyAssignment(property) ? property.initializer : property.name
    if (sourceName.startsWith(":")) {
      if (!supportedPseudos.has(sourceName)) {
        throw compileError(context, `unsupported style pseudo ${sourceName}`)
      }
      const pseudoValue = unwrap(initializer)
      if (!isObjectLiteralExpression(pseudoValue)) {
        throw compileError(context, `style pseudo ${sourceName} must be a static declaration object`)
      }
      pseudos.push(Object.freeze({
        pseudo: sourceName,
        declarations: Object.freeze(parsePseudoDeclarations(pseudoValue, sourceName, context)),
      }))
      continue
    }
    const cssName = cssPropertyName(sourceName, context)
    if (!isModuleStable(initializer, context)) {
      residual.push(property.getText(context.sourceFile))
      continue
    }
    const value = cssValue(cssName, initializer, context)
    if (!value.empty) base.push(Object.freeze({property: cssName, value}))
  }
  const rules: CssRule[] = [Object.freeze({pseudo: "", declarations: Object.freeze(base)}), ...pseudos]
  return Object.freeze({
    rules: Object.freeze(rules),
    residualExpression: residual.length === 0 ? null : `{${residual.join(", ")}}`,
  })
}

function parsePseudoDeclarations(
  object: ObjectLiteralExpression,
  pseudo: string,
  context: StyleExtractionContext,
): CssDeclaration[] {
  const declarations: CssDeclaration[] = []
  for (const property of object.properties) {
    if (isSpreadAssignment(property)) {
      throw compileError(context, `style pseudo ${pseudo} cannot contain spreads`)
    }
    if (!isPropertyAssignment(property) && !isShorthandPropertyAssignment(property)) {
      throw compileError(context, `style pseudo ${pseudo} supports only property assignments`)
    }
    if (isComputedPropertyName(property.name)) {
      throw compileError(context, `style pseudo ${pseudo} cannot contain computed property names`)
    }
    const sourceName = propertyName(property.name, context)
    if (sourceName.startsWith(":")) {
      throw compileError(context, `style pseudo ${pseudo} cannot nest ${sourceName}`)
    }
    const initializer = isPropertyAssignment(property) ? property.initializer : property.name
    if (!isModuleStable(initializer, context)) {
      throw compileError(context, `style pseudo ${pseudo}.${sourceName} cannot depend on props or component state`)
    }
    const cssName = cssPropertyName(sourceName, context)
    const value = cssValue(cssName, initializer, context)
    if (!value.empty) declarations.push(Object.freeze({property: cssName, value}))
  }
  return declarations
}

function cssValue(
  property: string,
  expression: Expression,
  context: StyleExtractionContext,
): CssValue {
  const value = unwrap(expression)
  if (isStringLiteral(value) || isNoSubstitutionTemplateLiteral(value)) {
    return Object.freeze({
      code: JSON.stringify(value.text),
      encodedCode: JSON.stringify(encodeCompiledStyleText(value.text)),
      empty: value.text.length === 0
    })
  }
  if (isNumericLiteral(value)) {
    const number = Number(value.text)
    const serialized = number === 0 || unitless(property) || property.startsWith("--")
      ? String(number)
      : `${number}px`
    return Object.freeze({
      code: JSON.stringify(serialized),
      encodedCode: JSON.stringify(encodeCompiledStyleText(serialized)),
      empty: false
    })
  }
  if (isNullLiteral(value) || isUndefinedIdentifier(value)) {
    return Object.freeze({code: JSON.stringify(""), encodedCode: JSON.stringify(""), empty: true})
  }
  const kind = context.primitiveKinds.get(value) ?? "unsupported"
  if (kind === "nullish") {
    return Object.freeze({code: JSON.stringify(""), encodedCode: JSON.stringify(""), empty: true})
  }
  if (kind === "string") {
    const code = `String(${value.getText(context.sourceFile)})`
    return Object.freeze({code, encodedCode: `${context.styleEncoder}(${code})`, empty: false})
  }
  if (kind === "number") {
    const source = `String(${value.getText(context.sourceFile)})`
    const code = unitless(property) || property.startsWith("--") ? source : `${source} + "px"`
    return Object.freeze({
      code,
      encodedCode: `${context.styleEncoder}(${code})`,
      empty: false,
    })
  }
  throw compileError(context, `style property ${property} must resolve to string, number, null, or undefined`)
}

function serializeRules(attributeName: string, rules: readonly CssRule[]): string {
  const parts: string[] = []
  for (const rule of rules) {
    if (rule.declarations.length === 0) continue
    appendStatic(parts, encodeCompiledStyleText(`[${attributeName}]${rule.pseudo}{`))
    for (let index = 0; index < rule.declarations.length; index += 1) {
      const declaration = rule.declarations[index]!
      if (index > 0) appendStatic(parts, encodeCompiledStyleText(";"))
      appendStatic(parts, encodeCompiledStyleText(`${declaration.property}:`))
      parts.push(declaration.value.encodedCode)
    }
    appendStatic(parts, encodeCompiledStyleText("}"))
  }
  return parts.length === 0 ? JSON.stringify("") : parts.join(" + ")
}

function serializeAuthoredRules(rules: readonly CssRule[]): string {
  const parts: string[] = []
  for (const rule of rules) {
    if (rule.declarations.length === 0) continue
    if (rule.pseudo !== "") appendStatic(parts, `&${rule.pseudo}{`)
    for (let index = 0; index < rule.declarations.length; index += 1) {
      const declaration = rule.declarations[index]!
      if (index > 0) appendStatic(parts, ";")
      appendStatic(parts, `${declaration.property}:`)
      parts.push(declaration.value.code)
    }
    appendStatic(parts, rule.pseudo === "" ? ";" : "}")
  }
  return parts.length === 0 ? JSON.stringify("") : parts.join(" + ")
}

function appendStatic(parts: string[], value: string): void {
  if (value.length === 0) return
  const previous = parts.at(-1)
  if (previous?.startsWith('"') && previous.endsWith('"')) {
    const decoded = JSON.parse(previous) as string
    parts[parts.length - 1] = JSON.stringify(decoded + value)
    return
  }
  parts.push(JSON.stringify(value))
}

function propertyName(name: PropertyName, context: StyleExtractionContext): string {
  if (isIdentifier(name) || isStringLiteral(name) || isNoSubstitutionTemplateLiteral(name)) {
    return name.text
  }
  throw compileError(context, "style property names must be identifiers or string literals")
}

function cssPropertyName(value: string, context: StyleExtractionContext): string {
  if (!/^(?:--[a-zA-Z0-9_-]+|-?(?:[a-z][a-zA-Z0-9]*|[a-z][a-z0-9-]*))$/.test(value)) {
    throw compileError(context, `invalid style property ${value}`)
  }
  return value.startsWith("--") ? value : value.replace(/[A-Z]/g, character => `-${character.toLowerCase()}`)
}

function unitless(property: string): boolean {
  return property === "flex" || property === "opacity" || property === "z-index" ||
    property === "line-height" || property === "flex-grow" || property === "flex-shrink" ||
    property === "font-weight"
}

function logicalStaticObject(
  expression: Expression,
): Readonly<{condition: string; object: ObjectLiteralExpression}> | null {
  if (!isBinaryExpression(expression) ||
    expression.operatorToken.kind !== SyntaxKind.AmpersandAmpersandToken) return null
  const right = unwrap(expression.right)
  if (!isObjectLiteralExpression(right)) return null
  return Object.freeze({condition: expression.left.getText(expression.getSourceFile()), object: right})
}

function logicalCssTemplate(
  expression: Expression,
  context: StyleExtractionContext,
): Readonly<{condition: string; source: CompiledCssTemplateSource}> | null {
  if (!isBinaryExpression(expression) ||
    expression.operatorToken.kind !== SyntaxKind.AmpersandAmpersandToken) return null
  const right = unwrap(expression.right)
  const source = context.resolveCssTemplate?.(right) ?? null
  if (!source) return null
  return Object.freeze({condition: expression.left.getText(context.sourceFile), source})
}

function isModuleStable(expression: Expression, context: StyleExtractionContext): boolean {
  let stable = true
  visit(expression, node => {
    if (!stable || !isIdentifier(node)) return
    const id = context.symbols.get(node)
    if (id !== undefined && context.unstableSymbols.has(id)) stable = false
  })
  return stable
}

function isUndefinedIdentifier(expression: Expression): expression is Identifier {
  return isIdentifier(expression) && expression.text === "undefined"
}

function unwrap(expression: Expression): Expression {
  let value = expression
  while (isParenthesizedExpression(value)) value = value.expression
  return skipOuterExpressions(value)
}

function visit(node: Node, callback: (node: Node) => void): void {
  callback(node)
  node.forEachChild(child => {
    visit(child, callback)
    return undefined
  })
}

function compileError(context: Readonly<{sourcePath: string}>, message: string): JsxCompileError {
  return new JsxCompileError(message, context.sourcePath)
}

function componentCompileError(
  context: ComponentStyleExtractionContext,
  message: string,
): JsxCompileError {
  return compileError(context, message)
}
