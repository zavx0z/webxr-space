/**
Neutral source facts emitted by the governed Template compiler.

This module identifies authored standard usage but deliberately owns no platform
status, conformance policy, implementation request or capability matrix. Facts
retain literal values, actual host transport and the structured selector shape
already parsed by Template.

@packageDocumentation
*/

import type {Project, Symbol as TypeScriptSymbol} from "typescript/unstable/async"
import {
  SyntaxKind,
  type Node,
  type PropertyAccessExpression,
  type SourceFile,
  type TaggedTemplateExpression,
} from "typescript/unstable/ast"
import {
  isBinaryExpression,
  isCallExpression,
  isIdentifier,
  isJsxAttribute,
  isJsxElement,
  isJsxSelfClosingElement,
  isNoSubstitutionTemplateLiteral,
  isPostfixUnaryExpression,
  isPrefixUnaryExpression,
  isPropertyAccessExpression,
  isTaggedTemplateExpression,
  isTemplateExpression,
  isAssignmentOperator,
} from "typescript/unstable/ast/is"
import {
  parseCssTemplateShape,
  type CssTemplateDeclaration,
} from "../css-shape.ts"
import {
  hostAttributeTransport,
  hostAttributeValue,
  type HostUsageValue,
} from "./host-profile.ts"
import type {JsxTransformSymbols} from "./transform.ts"

export type CapabilityUsagePosition = Readonly<{
  column: number
  line: number
  offset: number
}>

export type CapabilityUsageSource = Readonly<{
  end: CapabilityUsagePosition
  path: string
  start: CapabilityUsagePosition
}>

type CapabilityUsageBase = Readonly<{
  source: CapabilityUsageSource
}>

export type CapabilityUsageValue = HostUsageValue

export type IntrinsicElementCapabilityUsage = CapabilityUsageBase & Readonly<{
  kind: "intrinsic-element"
  profile: "html" | "template-extension"
  tagName: string
}>

export type IntrinsicAttributeCapabilityUsage = CapabilityUsageBase & Readonly<{
  kind: "intrinsic-attribute"
  name: string
  operation: "binding" | "mount" | "style"
  tagName: string
  transport: "content-attribute" | "property" | "style"
  value: CapabilityUsageValue
}>

export type EventCapabilityUsage = CapabilityUsageBase & Readonly<{
  capture: boolean
  eventType: string
  kind: "event"
  propName: string
  tagName: string
}>

export type RefCapabilityUsage = CapabilityUsageBase & Readonly<{
  kind: "ref"
  mode: "callback"
  tagName: string
}>

export type CssPropertyCapabilityUsage = CapabilityUsageBase & Readonly<{
  kind: "css-property"
  name: string
  value: CapabilityUsageValue
}>

export type CssAttributeSelectorCapabilityUsage = CapabilityUsageBase & Readonly<{
  kind: "css-attribute-selector"
  name: string
  value: string | null
}>

export type CssPseudoCapabilityUsage = CapabilityUsageBase & Readonly<{
  kind: "css-pseudo"
  name: string
}>

export type DomMemberCapabilityUsage = CapabilityUsageBase & Readonly<{
  interfaceName: string
  kind: "dom-member"
  memberName: string
  operation: "call" | "read" | "write"
  standardLibrary: "lib.dom"
}>

export type CapabilityUsage =
  | IntrinsicElementCapabilityUsage
  | IntrinsicAttributeCapabilityUsage
  | EventCapabilityUsage
  | RefCapabilityUsage
  | CssPropertyCapabilityUsage
  | CssAttributeSelectorCapabilityUsage
  | CssPseudoCapabilityUsage
  | DomMemberCapabilityUsage

/**
Collects neutral authored standard usage without consulting a platform matrix.

DOM members are admitted only when TypeScript resolves their declarations to
the pinned `lib.dom.d.ts`; same-spelling consumer symbols are ignored.

@param sourceFile - Governed authored source whose UTF-16 offsets are retained.
@param project - Active TypeScript project used for exact symbol resolution.
@param symbols - Symbol identity already established for the same transform.
@returns Immutable usages sorted by source range and stable semantic identity.
*/
export async function collectCapabilityUsages(
  sourceFile: SourceFile,
  project: Project,
  symbols: JsxTransformSymbols,
): Promise<readonly CapabilityUsage[]> {
  const usages: CapabilityUsage[] = []
  const memberAccesses: PropertyAccessExpression[] = []

  visit(sourceFile, node => {
    if (isJsxElement(node) || isJsxSelfClosingElement(node)) {
      collectIntrinsicUsages(node, sourceFile, usages)
    }
    if (isTaggedTemplateExpression(node)) {
      collectCssUsages(node, sourceFile, symbols, usages)
    }
    if (isPropertyAccessExpression(node)) memberAccesses.push(node)
  })

  const memberSymbols = await project.checker.getSymbolAtLocation(
    memberAccesses.map(access => access.name),
  )
  for (let index = 0; index < memberAccesses.length; index += 1) {
    const access = memberAccesses[index]!
    const symbol = memberSymbols[index]
    if (!symbol) continue
    const owner = await standardDomOwner(symbol)
    if (owner === null) continue
    usages.push(Object.freeze({
      interfaceName: owner,
      kind: "dom-member",
      memberName: access.name.text,
      operation: memberOperation(access),
      source: sourceRange(sourceFile, access),
      standardLibrary: "lib.dom",
    }))
  }

  usages.sort(compareUsages)
  return Object.freeze(usages)
}

function collectIntrinsicUsages(
  element: import("typescript/unstable/ast").JsxElement |
    import("typescript/unstable/ast").JsxSelfClosingElement,
  sourceFile: SourceFile,
  usages: CapabilityUsage[],
): void {
  const opening = isJsxElement(element) ? element.openingElement : element
  const tagName = opening.tagName.getText(sourceFile)
  if (!/^[a-z]/.test(tagName)) return
  usages.push(Object.freeze({
    kind: "intrinsic-element",
    profile: tagName.includes("-") ? "template-extension" : "html",
    source: sourceRange(sourceFile, opening.tagName),
    tagName,
  }))
  for (const property of opening.attributes.properties) {
    if (!isJsxAttribute(property)) continue
    const propName = property.name.getText(sourceFile)
    const value = hostAttributeValue(property, sourceFile)
    if (value === null) continue
    const transport = hostAttributeTransport(propName, value.transport)
    const source = sourceRange(sourceFile, property.name)
    if (transport.kind === "event") {
      usages.push(Object.freeze({
        capture: transport.capture,
        eventType: transport.type,
        kind: "event",
        propName,
        source,
        tagName,
      }))
      continue
    }
    if (transport.kind === "ref") {
      usages.push(Object.freeze({kind: "ref", mode: "callback", source, tagName}))
      continue
    }
    if (transport.kind === "unknown-event") continue
    usages.push(Object.freeze({
      kind: "intrinsic-attribute",
      name: standardAttributeName(propName),
      operation: transport.operation,
      source,
      tagName,
      transport: transport.kind,
      value: value.usageValue,
    }))
  }
}

function collectCssUsages(
  tagged: TaggedTemplateExpression,
  sourceFile: SourceFile,
  symbols: JsxTransformSymbols,
  usages: CapabilityUsage[],
): void {
  if (!isIdentifier(tagged.tag)) return
  const symbol = symbols.byNode.get(tagged.tag)
  if (symbol === undefined || !symbols.cssIntrinsicSymbols.has(symbol)) return
  const strings = cssTemplateStrings(tagged)
  if (strings === null) return
  let shape: ReturnType<typeof parseCssTemplateShape>
  try {
    shape = parseCssTemplateShape(strings)
  } catch {
    return
  }
  const source = sourceRange(sourceFile, tagged)
  for (const rule of shape.rules) {
    for (const declaration of rule.declarations) {
      usages.push(Object.freeze({
        kind: "css-property",
        name: declaration.property,
        source,
        value: cssDeclarationUsageValue(declaration),
      }))
    }
    for (const selector of rule.attributeSelectors) {
      usages.push(Object.freeze({
        kind: "css-attribute-selector",
        name: selector.name,
        source,
        value: selector.value,
      }))
    }
    if (rule.pseudoClass !== "") {
      usages.push(Object.freeze({kind: "css-pseudo", name: rule.pseudoClass, source}))
    }
  }
}

function cssDeclarationUsageValue(
  declaration: CssTemplateDeclaration,
): CapabilityUsageValue {
  let value = ""
  for (const segment of declaration.segments) {
    if (segment.type === "slot") return Object.freeze({kind: "dynamic"})
    value += segment.value
  }
  return Object.freeze({
    kind: "static",
    value,
  })
}

function cssTemplateStrings(tagged: TaggedTemplateExpression): readonly string[] | null {
  if (isNoSubstitutionTemplateLiteral(tagged.template)) {
    return Object.freeze([tagged.template.text])
  }
  if (!isTemplateExpression(tagged.template)) return null
  return Object.freeze([
    tagged.template.head.text,
    ...tagged.template.templateSpans.map(span => span.literal.text),
  ])
}

async function standardDomOwner(symbol: TypeScriptSymbol): Promise<string | null> {
  const standard = symbol.declarations.some(declaration =>
    declaration.path.replaceAll("\\", "/").endsWith("/lib.dom.d.ts")
  )
  if (!standard) return null
  return (await symbol.getParent())?.name ?? null
}

function memberOperation(
  access: PropertyAccessExpression,
): "call" | "read" | "write" {
  const parent = access.parent
  if (isCallExpression(parent) && parent.expression === access) return "call"
  if (isBinaryExpression(parent) && parent.left === access &&
    isAssignmentOperator(parent.operatorToken.kind)) return "write"
  if ((isPrefixUnaryExpression(parent) || isPostfixUnaryExpression(parent)) &&
    (parent.operator === SyntaxKind.PlusPlusToken || parent.operator === SyntaxKind.MinusMinusToken)) {
    return "write"
  }
  return "read"
}

function standardAttributeName(name: string): string {
  return name === "htmlFor" ? "for" : name
}

function sourceRange(sourceFile: SourceFile, node: Node): CapabilityUsageSource {
  const start = node.getStart(sourceFile)
  const end = node.getEnd()
  return Object.freeze({
    end: sourcePosition(sourceFile, end),
    path: sourceFile.fileName,
    start: sourcePosition(sourceFile, start),
  })
}

function sourcePosition(sourceFile: SourceFile, offset: number): CapabilityUsagePosition {
  const position = sourceFile.getLineAndCharacterOfPosition(offset)
  return Object.freeze({
    column: position.character + 1,
    line: position.line + 1,
    offset,
  })
}

function compareUsages(left: CapabilityUsage, right: CapabilityUsage): number {
  return left.source.start.offset - right.source.start.offset ||
    left.source.end.offset - right.source.end.offset ||
    left.kind.localeCompare(right.kind) ||
    JSON.stringify(left).localeCompare(JSON.stringify(right))
}

function visit(node: Node, callback: (node: Node) => void): void {
  callback(node)
  node.forEachChild(child => {
    visit(child, callback)
    return undefined
  })
}
