import {
  SyntaxKind,
  type Expression,
  type JsxAttribute,
  type SourceFile,
} from "typescript/unstable/ast"
import {
  isFalseLiteral,
  isJsxExpression,
  isNoSubstitutionTemplateLiteral,
  isNumericLiteral,
  isPrefixUnaryExpression,
  isStringLiteral,
  isTrueLiteral,
} from "typescript/unstable/ast/is"
import {jsxEventNames, type JsxEventName} from "../jsx-events.ts"

const propertyNames: ReadonlySet<string> = new Set([
  "checked",
  "indeterminate",
  "selected",
  "selectedIndex",
  "tabIndex",
  "value",
])

export type HostUsageValue =
  | Readonly<{kind: "dynamic"}>
  | Readonly<{
    kind: "static"
    value: boolean | number | string
  }>

export type HostAttributeValue =
  | Readonly<{
    expression: string
    staticValue: string | true
    transport: "static"
    usageValue: HostUsageValue
  }>
  | Readonly<{
    expression: string
    transport: "dynamic"
    usageValue: HostUsageValue
  }>

export type HostAttributeTransport =
  | Readonly<{
    kind: "content-attribute"
    operation: "binding" | "mount"
  }>
  | Readonly<{
    kind: "event"
    capture: boolean
    operation: "binding"
    type: string
  }>
  | Readonly<{
    kind: "property"
    operation: "binding"
  }>
  | Readonly<{
    kind: "ref"
    operation: "binding"
  }>
  | Readonly<{
    kind: "style"
    operation: "style"
  }>
  | Readonly<{
    kind: "unknown-event"
  }>

export function hostAttributeValue(
  attribute: JsxAttribute,
  sourceFile: SourceFile,
): HostAttributeValue | null {
  const initializer = attribute.initializer
  if (!initializer) {
    return Object.freeze({
      expression: "true",
      staticValue: true,
      transport: "static",
      usageValue: staticUsageValue(true),
    })
  }
  if (isStringLiteral(initializer)) {
    return Object.freeze({
      expression: JSON.stringify(initializer.text),
      staticValue: initializer.text,
      transport: "static",
      usageValue: staticUsageValue(initializer.text),
    })
  }
  if (!isJsxExpression(initializer) || !initializer.expression) return null
  return Object.freeze({
    expression: initializer.expression.getText(sourceFile),
    transport: "dynamic",
    usageValue: expressionUsageValue(initializer.expression),
  })
}

export function hostAttributeTransport(
  name: string,
  sourceTransport: HostAttributeValue["transport"],
): HostAttributeTransport {
  if (name === "ref") return Object.freeze({kind: "ref", operation: "binding"})
  if (name === "style") return Object.freeze({kind: "style", operation: "style"})
  if (propertyNames.has(name)) {
    return Object.freeze({kind: "property", operation: "binding"})
  }
  if (!/^on[A-Z]/.test(name)) {
    return Object.freeze({
      kind: "content-attribute",
      operation: sourceTransport === "static" ? "mount" : "binding",
    })
  }
  const event = hostEventBinding(name)
  return event === null
    ? Object.freeze({kind: "unknown-event"})
    : Object.freeze({kind: "event", operation: "binding", ...event})
}

export type HostEventBinding = Readonly<{
  capture: boolean
  type: string
}>

export function hostEventBinding(name: string): HostEventBinding | null {
  const direct = jsxEventNames[name as JsxEventName]
  if (direct !== undefined) return Object.freeze({capture: false, type: direct})
  if (!name.endsWith("Capture")) return null
  const authoredName = name.slice(0, -"Capture".length)
  const type = jsxEventNames[authoredName as JsxEventName]
  return type === undefined ? null : Object.freeze({capture: true, type})
}

function expressionUsageValue(expression: Expression): HostUsageValue {
  if (isStringLiteral(expression) || isNoSubstitutionTemplateLiteral(expression)) {
    return staticUsageValue(expression.text)
  }
  if (isNumericLiteral(expression)) return staticUsageValue(Number(expression.text))
  if (isTrueLiteral(expression)) return staticUsageValue(true)
  if (isFalseLiteral(expression)) return staticUsageValue(false)
  if (isPrefixUnaryExpression(expression) && isNumericLiteral(expression.operand)) {
    const number = Number(expression.operand.text)
    if (expression.operator === SyntaxKind.MinusToken) return staticUsageValue(-number)
    if (expression.operator === SyntaxKind.PlusToken) return staticUsageValue(number)
  }
  return Object.freeze({kind: "dynamic"})
}

function staticUsageValue(value: boolean | number | string): HostUsageValue {
  return Object.freeze({kind: "static", value})
}
