import type {Event} from "@zavx0z/dom"
import {
  NumberControl,
  type NumberControlProps
} from "./number-control.tsx"

export type IntegerControlProps = Omit<
  NumberControlProps,
  "value" | "numberKind" | "step" | "onInput" | "onChange"
> & Readonly<{
  value: number
  step?: number | undefined
  onInput?: ((value: number, event: Event) => void) | undefined
  onChange?: ((value: number, event: Event) => void) | undefined
}>

export function IntegerControl(props: IntegerControlProps) {
  const onInput = (value: number, event: Event) => props.onInput?.(Math.round(value), event)
  const onChange = (value: number, event: Event) => props.onChange?.(Math.round(value), event)
  return <NumberControl
    value={Math.round(props.value)}
    numberKind="integer"
    min={props.min}
    max={props.max}
    softMin={props.softMin}
    softMax={props.softMax}
    step={props.step ?? 1}
    disabled={props.disabled}
    readOnly={props.readOnly}
    title={props.title}
    style={props.style}
    onInput={onInput}
    onChange={onChange}
  />
}
