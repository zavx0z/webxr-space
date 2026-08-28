import type {Event} from "@zavx0z/dom"
import {type StyleValue} from "@zavx0z/react"
import {
  ControlGroup,
  controlGroupCss,
  type ControlGroupItem
} from "./control-group.tsx"

export type VectorInputProps = Readonly<{
  value: readonly number[]
  axes?: readonly string[] | undefined
  min?: number | undefined
  max?: number | undefined
  step?: number | undefined
  disabled?: boolean | undefined
  readOnly?: boolean | undefined
  title?: string | undefined
  style?: StyleValue
  onInput?: ((value: readonly number[], event: Event) => void) | undefined
  onChange?: ((value: readonly number[], event: Event) => void) | undefined
}>

const accents = Object.freeze(["x", "y", "z", "w"] as const)

export const vectorInputCss = controlGroupCss

export function VectorInput(props: VectorInputProps) {
  const normalized = normalizeVector(props)
  const emit = (kind: "input" | "change", key: string, source: string, event: Event) => {
    const index = normalized.axes.indexOf(key)
    const value = Number(source)
    if (index < 0 || !Number.isFinite(value)) return
    const next = Object.freeze(normalized.value.map((item, itemIndex) => itemIndex === index ? value : item))
    if (kind === "input") props.onInput?.(next, event)
    else props.onChange?.(next, event)
  }
  const items: readonly ControlGroupItem[] = normalized.value.map((value, index) => ({
    key: normalized.axes[index]!,
    label: normalized.axes[index]!,
    value: String(value),
    type: "number",
    min: props.min,
    max: props.max,
    step: normalized.step,
    accent: accents[index],
    readOnly: props.readOnly === true
  }))
  const onInput = (key: string, value: string, event: Event) => emit("input", key, value, event)
  const onChange = (key: string, value: string, event: Event) => emit("change", key, value, event)
  return <ControlGroup
    items={items}
    disabled={props.disabled === true}
    title={props.title}
    style={props.style}
    onInput={onInput}
    onChange={onChange}
  />
}


function normalizeVector(props: VectorInputProps): Readonly<{
  value: readonly number[]
  axes: readonly string[]
  step: number
}> {
  if (!Array.isArray(props.value) || props.value.length < 2 || props.value.length > 4 || !props.value.every(Number.isFinite)) {
    throw new TypeError("VectorInput value must contain 2 to 4 finite numbers")
  }
  const axes = props.axes ?? ["X", "Y", "Z", "W"].slice(0, props.value.length)
  if (axes.length !== props.value.length || new Set(axes).size !== axes.length || axes.some(axis => typeof axis !== "string" || axis.length === 0)) {
    throw new Error("VectorInput axes must be unique and match value length")
  }
  const step = props.step ?? 0.1
  if (!Number.isFinite(step) || step <= 0) throw new RangeError("VectorInput step must be positive")
  return Object.freeze({
    value: Object.freeze([...props.value]),
    axes: Object.freeze([...axes]),
    step
  })
}
