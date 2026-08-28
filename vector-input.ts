import type {Document, Event, HTMLElement, HTMLInputElement} from "@zavx0z/dom"
import {controlGroupCss, createControlGroup, type ControlGroupController} from "./control-group.ts"
import type {ControlGroupProps} from "./control-group-component.tsx"

import type {VectorInputProps} from "./vector-input-component.tsx"
export type VectorInputController = Readonly<{element: HTMLElement; refs: Readonly<{root: HTMLElement; inputs: ReadonlyMap<string, HTMLInputElement>}>; props: VectorInputProps; update(props: VectorInputProps): void; dispose(): void}>

export const vectorInputCss = `${controlGroupCss}\n.ui-vector-input .ui-control-group__label[data-axis="x"] { color: rgb(255 51 82); }`

export function createVectorInput(document: Document, initialProps: VectorInputProps): VectorInputController {
  let current = normalize(initialProps)
  const emit = (kind: "input" | "change", key: string, value: string, event: Event): void => {
    const index = current.axes!.indexOf(key)
    const number = Number(value)
    if (index < 0 || !Number.isFinite(number)) return
    const next = current.value.map((item, itemIndex) => itemIndex === index ? number : item)
    if (kind === "input") current.onInput?.(Object.freeze(next), event)
    else current.onChange?.(Object.freeze(next), event)
  }
  const base = createControlGroup(document, toGroup(current, emit))
  const update = (props: VectorInputProps): void => {
    const next = normalize(props)
    base.update(toGroup(next, emit))
    base.element.className = "ui-control-group ui-vector-input"
    current = next
  }
  const controller: VectorInputController = Object.freeze({element: base.element, refs: Object.freeze({root: base.element, inputs: base.refs.inputs}), get props() { return current }, update, dispose: base.dispose})
  update(current)
  return controller
}

function normalize(props: VectorInputProps): VectorInputProps {
  if (!Array.isArray(props.value) || props.value.length < 2 || props.value.length > 4 || !props.value.every(Number.isFinite)) throw new TypeError("VectorInput value must contain 2 to 4 finite numbers")
  const axes = props.axes ?? ["X", "Y", "Z", "W"].slice(0, props.value.length)
  if (axes.length !== props.value.length || new Set(axes).size !== axes.length || axes.some((axis) => typeof axis !== "string" || axis.length === 0)) throw new Error("VectorInput axes must be unique and match value length")
  return Object.freeze({...props, value: Object.freeze([...props.value]), axes: Object.freeze([...axes]), step: props.step ?? 0.1, disabled: props.disabled ?? false, readOnly: props.readOnly ?? false})
}

function toGroup(props: VectorInputProps, emit: (kind: "input" | "change", key: string, value: string, event: Event) => void): ControlGroupProps {
  return {
    ...(props.title === undefined ? {} : {title: props.title}),
    disabled: props.disabled === true,
    items: props.value.map((value, index) => ({key: props.axes![index]!, label: props.axes![index]!, value: String(value), type: "number", readOnly: props.readOnly === true})),
    onInput: (key, value, event) => emit("input", key, value, event),
    onChange: (key, value, event) => emit("change", key, value, event),
  }
}
