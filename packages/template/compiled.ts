import type {
  Comment,
  Document,
  Element,
  EventListenerOptions,
  Node,
  Text
} from "@zavx0z/dom"
export {
  decodeCompiledStyleText,
  encodeCompiledStyleText
} from "./style-codec.ts"
import {decodeCompiledStyleText} from "./style-codec.ts"

const templateBrand = Symbol.for("@zavx0z/template/compiled-template")
const bindingBrand = Symbol.for("@zavx0z/template/compiled-binding")

export type BindingValues = unknown[]

export type CompiledMount = Readonly<{
  bindings: readonly HostBinding[]
  nodes: readonly Node[]
}>

export type CompiledStyleSheet = Readonly<{
  id: string
  cssText: string
  source?: CompiledStyleSheetSource
}>

export type CompiledStyleSheetSource = Readonly<{
  kind: "authored-css"
  moduleId: string
  componentName: string
  cssText: string
}>

export type CompiledTemplateDefinition<Props> = Readonly<{
  bindingCount: number
  displayName?: string
  styleSheets?: readonly CompiledStyleSheet[]
  mount(document: Document): CompiledMount
  render(props: Readonly<Props>, values: BindingValues): void
}>

export interface CompiledTemplate<Props = unknown> {
  readonly bindingCount: number
  readonly displayName: string
  readonly styleSheets: readonly CompiledStyleSheet[]
  mount(document: Document): CompiledMount
  render(props: Readonly<Props>, values: BindingValues): void
}

/** Materializes one compact compiler transport into the ordinary stylesheet ABI. */
export function compiledStyleSheet(
  id: string,
  encodedCssText: string,
  source?: CompiledStyleSheetSource,
): CompiledStyleSheet {
  return Object.freeze({
    id,
    cssText: decodeCompiledStyleText(encodedCssText),
    ...(source === undefined ? {} : {source})
  })
}

export type TextBinding = Readonly<{
  kind: "text"
  target: Text
}>

export type PropertyBinding = Readonly<{
  kind: "property"
  name: string
  target: Element
}>

export type StyleBinding = Readonly<{
  kind: "style"
  target: Element
}>

export type EventBinding = Readonly<{
  capture: boolean
  kind: "event"
  target: Element
  type: string
}>

export type RefBinding = Readonly<{
  kind: "ref"
  target: Node
}>

export type ChildBinding = Readonly<{
  end: Comment
  kind: "child"
  start: Comment
}>

export type ConditionalBinding = Readonly<{
  end: Comment
  kind: "conditional"
  start: Comment
}>

export type KeyedBinding = Readonly<{
  end: Comment
  kind: "keyed"
  start: Comment
}>

export type HostBinding =
  | TextBinding
  | PropertyBinding
  | StyleBinding
  | EventBinding
  | RefBinding
  | ChildBinding
  | ConditionalBinding
  | KeyedBinding

export function defineCompiledTemplate<Props>(
  definition: CompiledTemplateDefinition<Props>
): CompiledTemplate<Props> {
  const bindingCount = Number(definition.bindingCount)
  if (!Number.isSafeInteger(bindingCount) || bindingCount < 0) {
    throw new TypeError("Compiled template bindingCount must be a non-negative safe integer")
  }
  if (typeof definition.mount !== "function" || typeof definition.render !== "function") {
    throw new TypeError("Compiled template requires mount and render functions")
  }
  const styleSheets = compiledStyleSheets(definition.styleSheets ?? [])
  return Object.freeze({
    [templateBrand]: true as const,
    bindingCount,
    displayName: definition.displayName ?? "CompiledTemplate",
    styleSheets,
    mount: definition.mount,
    render: definition.render
  })
}

export function bindText(target: Text): TextBinding {
  return Object.freeze({[bindingBrand]: true as const, kind: "text" as const, target})
}

export function bindProperty(target: Element, name: string): PropertyBinding {
  const propertyName = String(name)
  if (propertyName.length === 0) throw new TypeError("A host property binding requires a name")
  return Object.freeze({
    [bindingBrand]: true as const,
    kind: "property" as const,
    name: propertyName,
    target
  })
}

export function bindStyle(target: Element): StyleBinding {
  return Object.freeze({[bindingBrand]: true as const, kind: "style" as const, target})
}

export function bindEvent(
  target: Element,
  type: string,
  options: EventListenerOptions = {}
): EventBinding {
  const eventType = String(type)
  if (eventType.length === 0) throw new TypeError("An event binding requires an event type")
  return Object.freeze({
    [bindingBrand]: true as const,
    capture: options.capture ?? false,
    kind: "event" as const,
    target,
    type: eventType
  })
}

export function bindRef(target: Node): RefBinding {
  return Object.freeze({[bindingBrand]: true as const, kind: "ref" as const, target})
}

export function bindChild(start: Comment, end: Comment): ChildBinding {
  return rangeBinding("child", start, end)
}

export function bindConditional(start: Comment, end: Comment): ConditionalBinding {
  return rangeBinding("conditional", start, end)
}

export function bindKeyed(start: Comment, end: Comment): KeyedBinding {
  return rangeBinding("keyed", start, end)
}

export function writeBinding(values: BindingValues, slot: number, value: unknown): void {
  if (!Number.isSafeInteger(slot) || slot < 0 || slot >= values.length) {
    throw new RangeError(`Binding slot ${slot} is outside the compiled template`)
  }
  values[slot] = value
}

export function isCompiledTemplate(value: unknown): value is CompiledTemplate<unknown> {
  return !!value && typeof value === "object" &&
    (value as Record<PropertyKey, unknown>)[templateBrand] === true
}

export function isHostBinding(value: unknown): value is HostBinding {
  return !!value && typeof value === "object" &&
    (value as Record<PropertyKey, unknown>)[bindingBrand] === true
}

function compiledStyleSheets(source: readonly CompiledStyleSheet[]): readonly CompiledStyleSheet[] {
  if (!Array.isArray(source)) throw new TypeError("Compiled template styleSheets must be an array")
  const byId = new Map<string, CompiledStyleSheet>()
  for (const value of source) {
    if (!value || typeof value !== "object") {
      throw new TypeError("A compiled stylesheet must be an object")
    }
    if (typeof value.id !== "string" || value.id.trim().length === 0) {
      throw new TypeError("A compiled stylesheet requires a non-empty id string")
    }
    const id = value.id.trim()
    if (typeof value.cssText !== "string") {
      throw new TypeError(`Compiled stylesheet ${id} requires string cssText`)
    }
    const styleSource = compiledStyleSheetSource(id, value.source)
    const previous = byId.get(id)
    if (previous) {
      if (previous.cssText !== value.cssText) {
        throw new TypeError(`Compiled stylesheet ${id} has conflicting cssText`)
      }
      if (!sameCompiledStyleSheetSource(previous.source, styleSource)) {
        throw new TypeError(`Compiled stylesheet ${id} has conflicting source metadata`)
      }
      continue
    }
    byId.set(id, Object.freeze({
      id,
      cssText: value.cssText,
      ...(styleSource === undefined ? {} : {source: styleSource})
    }))
  }
  return Object.freeze([...byId.values()])
}

function compiledStyleSheetSource(
  id: string,
  source: CompiledStyleSheetSource | undefined
): CompiledStyleSheetSource | undefined {
  if (source === undefined) return undefined
  if (!source || typeof source !== "object" || source.kind !== "authored-css") {
    throw new TypeError(`Compiled stylesheet ${id} has invalid source metadata`)
  }
  if (
    typeof source.moduleId !== "string" || source.moduleId.trim() === "" ||
    typeof source.componentName !== "string" || source.componentName.trim() === "" ||
    typeof source.cssText !== "string"
  ) throw new TypeError(`Compiled stylesheet ${id} has invalid authored CSS source`)
  return Object.freeze({
    kind: "authored-css",
    moduleId: source.moduleId.trim(),
    componentName: source.componentName.trim(),
    cssText: source.cssText
  })
}

const sameCompiledStyleSheetSource = (
  left: CompiledStyleSheetSource | undefined,
  right: CompiledStyleSheetSource | undefined
): boolean =>
  left === right || (
    left !== undefined && right !== undefined &&
    left.kind === right.kind &&
    left.moduleId === right.moduleId &&
    left.componentName === right.componentName &&
    left.cssText === right.cssText
  )

function rangeBinding<Kind extends "child" | "conditional" | "keyed">(
  kind: Kind,
  start: Comment,
  end: Comment
): Extract<HostBinding, {kind: Kind}> {
  if (start === end) throw new TypeError("A compiled range requires distinct anchors")
  return Object.freeze({
    [bindingBrand]: true as const,
    end,
    kind,
    start
  }) as Extract<HostBinding, {kind: Kind}>
}
