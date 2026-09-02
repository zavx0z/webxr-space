import {getCssTemplateShape} from "./css-shape.ts"

const cssTemplateResultType = Symbol("@zavx0z/template/css-result")
const cssRuntimeGuard = "@zavx0z/template/css-runtime-guard"
const cssSourceValueMarker = "@zavx0z/template/css-source-value"

export type CssSourceValue = Readonly<{
  readonly "@zavx0z/template/css-source-value": true
}>

export type CssStyleValue =
  | CssSourceValue
  | false
  | null
  | undefined

export type CssDeclarationValue = string | number | bigint | null | undefined
export type CssTemplateValue = CssStyleValue | CssDeclarationValue

export interface CssTemplateResult extends CssSourceValue {
  readonly strings: TemplateStringsArray
  readonly values: readonly CssTemplateValue[]
  readonly [cssTemplateResultType]: true
}

/** Captures one parsed scoped CSS template and its ordered live values. */
export function css(
  strings: TemplateStringsArray,
  ...values: readonly CssTemplateValue[]
): CssTemplateResult {
  const shape = getCssTemplateShape(strings)
  if (values.length !== shape.slotCount) throw new Error("CSS template value count does not match its shape")
  const fragmentSlots = new Set(shape.fragmentSlots)
  for (let index = 0; index < values.length; index += 1) {
    if (fragmentSlots.has(index)) assertCssStyleValue(values[index])
    else assertCssDeclarationValue(values[index])
  }
  const result = {} as CssTemplateResult
  Object.defineProperties(result, {
    [cssSourceValueMarker]: {value: true},
    [cssRuntimeGuard]: {
      enumerable: true,
      get(): never {
        throw new Error(
          "A css template reached a generic runtime style binding; enable scoped Template compiler lowering",
        )
      },
    },
    [cssTemplateResultType]: {value: true},
    strings: {value: strings},
    values: {value: Object.freeze([...values])},
  })
  return Object.freeze(result)
}

export function isCssTemplateResult(value: unknown): value is CssTemplateResult {
  return !!value && typeof value === "object" &&
    (value as Partial<CssTemplateResult>)[cssTemplateResultType] === true
}

function assertCssDeclarationValue(value: CssTemplateValue): void {
  if (value === null || value === undefined || typeof value === "string" || typeof value === "bigint") return
  if (typeof value === "number" && Number.isFinite(value)) return
  throw new TypeError("CSS declaration interpolations require finite primitive values")
}

function assertCssStyleValue(value: CssTemplateValue): void {
  if (value === false || value === null || value === undefined) return
  if (isCssTemplateResult(value)) return
  throw new TypeError("CSS rule fragments require css templates, false, null, or undefined")
}
