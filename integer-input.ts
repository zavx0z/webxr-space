import type {Document, Event, HTMLInputElement} from "@zavx0z/dom"
import {createNumberInput, numberInputCss, type NumberInputController} from "./number-input.ts"
import type {NumberInputProps} from "./number-input-component.tsx"

import type {IntegerInputProps} from "./integer-input-component.tsx"
export type IntegerInputController = Readonly<{element: HTMLInputElement; refs: Readonly<{input: HTMLInputElement}>; props: IntegerInputProps; update(props: IntegerInputProps): void; dispose(): void}>

export const integerInputCss = `${numberInputCss}\n.ui-integer-input { text-align: right; }`

export function createIntegerInput(document: Document, initialProps: IntegerInputProps): IntegerInputController {
  let current = normalize(initialProps)
  const base: NumberInputController = createNumberInput(document, toNumberProps(current))
  const update = (props: IntegerInputProps): void => {
    const next = normalize(props)
    base.update(toNumberProps(next))
    current = Object.freeze({...next, value: Math.round(base.props.value)})
  }
  const controller: IntegerInputController = Object.freeze({element: base.element, refs: base.refs, get props() { return current }, update, dispose: base.dispose})
  update(current)
  return controller
}

function normalize(props: IntegerInputProps): IntegerInputProps {
  if (!Number.isFinite(props.value)) throw new TypeError("IntegerInput value must be finite")
  const step = props.step ?? 1
  if (!Number.isInteger(step) || step <= 0) throw new RangeError("IntegerInput step must be a positive integer")
  return Object.freeze({...props, value: Math.round(props.value), step})
}

function toNumberProps(props: IntegerInputProps): NumberInputProps {
  return props
}
