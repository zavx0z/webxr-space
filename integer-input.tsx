import type {Event} from "@zavx0z/dom"
import {
  NumberInput,
  type NumberInputProps
} from "./number-input.tsx"

export type IntegerInputProps = Omit<
  NumberInputProps,
  "value" | "step" | "onInput" | "onChange"
> & Readonly<{
  value: number
  step?: number | undefined
  onInput?: ((value: number, event: Event) => void) | undefined
  onChange?: ((value: number, event: Event) => void) | undefined
}>

export function IntegerInput(props: IntegerInputProps) {
  const onInput = (value: number, event: Event) => props.onInput?.(Math.round(value), event)
  const onChange = (value: number, event: Event) => props.onChange?.(Math.round(value), event)
  return <NumberInput
    value={Math.round(props.value)}
    min={props.min}
    max={props.max}
    softMin={props.softMin}
    softMax={props.softMax}
    step={props.step ?? 1}
    disabled={props.disabled}
    readOnly={props.readOnly}
    title={props.title}
    decrementTitle={props.decrementTitle}
    incrementTitle={props.incrementTitle}
    style={props.style}
    onInput={onInput}
    onChange={onChange}
  />
}
