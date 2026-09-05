/**
Тип авторского JSX до компиляции в CompiledTemplate.

В этом профиле свободный document внутри компонента или custom hook имеет
стандартный DOM-тип. Компилятор захватывает Document конкретного ComponentRoot,
не меняя native browser globals. Скомпилированные callbacks сохраняют эту ссылку.
Сами JSX-объекты не должны доходить до runtime без компиляции.

@packageDocumentation
*/
export type JsxSourceElement = Readonly<{
  readonly "@zavx0z/template/jsx-source-element": true
}>

import type {
  CssSourceValue,
  CssTemplateValue
} from "./css.ts"
import type {TemplateIntrinsicElements} from "./jsx-dom.ts"

export type {
  CallbackRef,
  DomEventFor,
  DomEventHandler,
  IntrinsicElementProperties,
  JsxChild,
  StandardIntrinsicElements,
  TemplateIntrinsicElements,
} from "./jsx-dom.ts"

export interface CssCompilerIntrinsic {
  readonly "@zavx0z/template/css-compiler-intrinsic": true
  (strings: TemplateStringsArray, ...values: readonly CssTemplateValue[]): CssSourceValue & string
}

declare global {
  /** Build-time scoped CSS intrinsic supplied by the Template JSX profile. */
  var css: CssCompilerIntrinsic
  interface CssStyle extends CssSourceValue {}
}

export namespace JSX {
  export type Element = JsxSourceElement
  export type ElementType = keyof IntrinsicElements | ((props: any) => Element)
  export interface ElementChildrenAttribute {
    children: unknown
  }
  export interface IntrinsicAttributes {
    key?: string | number
  }
  export interface IntrinsicElements extends TemplateIntrinsicElements {}
}

export function jsx(): never {
  return uncompiledJsx()
}

export function jsxs(): never {
  return uncompiledJsx()
}

export function Fragment(): never {
  return uncompiledJsx()
}

function uncompiledJsx(): never {
  throw new Error(
    "JSX reached @zavx0z/template/jsx-runtime without the @zavx0z/template compiler",
  )
}
