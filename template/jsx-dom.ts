import type {JsxSourceElement} from "./jsx-runtime.ts"
import type {jsxEventNames} from "./jsx-events.ts"
import type {
  Element as SemanticElement,
  EventTarget as SemanticEventTarget,
} from "@zavx0z/dom"

type PrimitiveAttributeValue = string | number | bigint | boolean | null | undefined

type ElementTarget = Element | SemanticElement
type EventTargetValue = EventTarget | SemanticEventTarget

type StrictlyEqual<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
    (<Value>() => Value extends Right ? 1 : 2)
    ? true
    : false

type WritableKey<Source, Key extends keyof Source> = StrictlyEqual<
  Pick<Source, Key>,
  {-readonly [Current in Key]: Source[Current]}
> extends true ? Key : never

type PrimitiveWritableKeys<Source> = {
  [Key in keyof Source]-?: Key extends string
    ? Key extends `on${string}` | "className" | "innerHTML" | "outerHTML" | "style"
      ? never
      : WritableKey<Source, Key> extends never
        ? never
        : Source[Key] extends PrimitiveAttributeValue
          ? Key
          : never
    : never
}[keyof Source]

type IntrinsicProperties<Target extends ElementTarget> = Readonly<{
  [Key in PrimitiveWritableKeys<Target>]?: Target[Key] | null | undefined
}>

export type DomEventFor<
  Target extends EventTargetValue,
  NativeEvent extends Event,
> = NativeEvent & Readonly<{
  currentTarget: Target
}>

export type DomEventHandler<
  Target extends EventTargetValue,
  NativeEvent extends Event,
> = (event: DomEventFor<Target, NativeEvent>) => unknown

export type CallbackRef<Target extends EventTargetValue> = (
  target: Target | null
) => void | (() => void)

type EventProperties<Target extends EventTargetValue> = Readonly<{
  [Name in keyof typeof jsxEventNames]?: DomEventHandler<
    Target,
    HTMLElementEventMap[typeof jsxEventNames[Name]]
  > | null | undefined
}> & Readonly<{
  [Name in keyof typeof jsxEventNames as `${Name}Capture`]?: DomEventHandler<
    Target,
    HTMLElementEventMap[typeof jsxEventNames[Name]]
  > | null | undefined
}>

export type JsxChild =
  | JsxSourceElement
  | string
  | number
  | bigint
  | boolean
  | null
  | undefined
  | readonly JsxChild[]

type DataAndAriaProperties = Readonly<{
  [Name: `data-${string}`]: PrimitiveAttributeValue
  [Name: `aria-${string}`]: PrimitiveAttributeValue
}>

export type IntrinsicElementProperties<Target extends ElementTarget> =
  IntrinsicProperties<Target> &
  EventProperties<Target> &
  DataAndAriaProperties &
  Readonly<{
    children?: JsxChild
    ref?: CallbackRef<Target> | null | undefined
    style?: CssStyle | undefined
  }>

type InputAttributeOverrides = Readonly<{
  max?: string | number | null | undefined
  min?: string | number | null | undefined
  step?: string | number | null | undefined
  value?: string | number | null | undefined
}>

export type StandardIntrinsicElements = Readonly<{
  [TagName in keyof HTMLElementTagNameMap]:
    TagName extends "input"
      ? Omit<IntrinsicElementProperties<HTMLInputElement>, keyof InputAttributeOverrides> &
        InputAttributeOverrides
      : IntrinsicElementProperties<HTMLElementTagNameMap[TagName]>
}>

export type TemplateIntrinsicElements = StandardIntrinsicElements & Readonly<{
  "vector-path": IntrinsicElementProperties<HTMLElement> & Readonly<{
    d?: string | null | undefined
  }>
}>
