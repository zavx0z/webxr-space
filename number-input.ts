import type {Document, Event, HTMLInputElement} from "@zavx0z/dom"
import {resolveWidgetColors, rgba8ToColor, uiTheme} from "./theme.ts"
import {projectVisualState} from "./internal/dom-state.ts"

import type {NumberInputProps} from "./number-input-component.tsx"
export type NumberInputController = Readonly<{element: HTMLInputElement; refs: Readonly<{input: HTMLInputElement}>; props: NumberInputProps; update(props: NumberInputProps): void; dispose(): void}>

const colors = resolveWidgetColors("number")
export const numberInputCss = String.raw`
.ui-number-input { box-sizing: border-box; display: block; min-width: 0; width: 120px; height: 28px; padding: 3px 8px; border: 1px solid ${rgba8ToColor(colors.outline)}; border-radius: 4px; background: ${rgba8ToColor(colors.inner)}; box-shadow: 0 1px 0 ${rgba8ToColor(uiTheme.material.widgetEmboss)}; color: ${rgba8ToColor(colors.text)}; font-size: 12px; text-align: right; }
.ui-number-input[data-ui-state="hover"] { background: rgb(101 101 101); }
.ui-number-input[data-ui-state="focus"] { border-color: rgb(113 168 255); background: rgb(34 34 34); }
.ui-number-input[readonly] { background: rgb(48 48 48); color: rgb(153 153 153); }
.ui-number-input[disabled] { opacity: 0.5; box-shadow: none; }
`

export function createNumberInput(document: Document, initialProps: NumberInputProps): NumberInputController {
  const input = document.createElement("input")
  input.type = "number"
  let current = normalizeNumberInputProps(initialProps)
  let disposed = false
  const visualState = projectVisualState(input, () => current.disabled === true)
  const onInput = (event: Event): void => {
    if (Number.isFinite(input.valueAsNumber)) current.onInput?.(input.valueAsNumber, event)
  }
  const onChange = (event: Event): void => {
    if (Number.isFinite(input.valueAsNumber)) current.onChange?.(input.valueAsNumber, event)
  }
  input.addEventListener("input", onInput)
  input.addEventListener("change", onChange)
  const update = (props: NumberInputProps): void => {
    if (disposed) throw new Error("NumberInput controller is disposed")
    const next = normalizeNumberInputProps(props)
    input.className = "ui-number-input"
    syncNumberAttribute(input, "min", next.min)
    syncNumberAttribute(input, "max", next.max)
    syncNumberAttribute(input, "step", next.step)
    input.valueAsNumber = next.value
    input.disabled = next.disabled === true
    input.readOnly = next.readOnly === true
    input.title = next.title ?? ""
    current = Object.freeze({...next, value: input.valueAsNumber})
    visualState.sync()
  }
  const controller: NumberInputController = Object.freeze({
    element: input,
    refs: Object.freeze({input}),
    get props() { return current },
    update,
    dispose() {
      if (disposed) return
      disposed = true
      input.removeEventListener("input", onInput)
      input.removeEventListener("change", onChange)
      visualState.dispose()
    },
  })
  update(current)
  return controller
}

export function normalizeNumberInputProps(props: NumberInputProps): NumberInputProps {
  assertFinite(props.value, "NumberInput value")
  if (props.min !== undefined) assertFinite(props.min, "NumberInput min")
  if (props.max !== undefined) assertFinite(props.max, "NumberInput max")
  if (props.min !== undefined && props.max !== undefined && props.min > props.max) throw new RangeError("NumberInput min must be at most max")
  if (props.step !== undefined && (!Number.isFinite(props.step) || props.step <= 0)) throw new RangeError("NumberInput step must be positive")
  if (props.softMin !== undefined) assertFinite(props.softMin, "NumberInput softMin")
  if (props.softMax !== undefined) assertFinite(props.softMax, "NumberInput softMax")
  if (props.disabled !== undefined && typeof props.disabled !== "boolean") throw new TypeError("NumberInput disabled must be a boolean")
  if (props.readOnly !== undefined && typeof props.readOnly !== "boolean") throw new TypeError("NumberInput readOnly must be a boolean")
  return Object.freeze({...props, step: props.step ?? 0.1, disabled: props.disabled ?? false, readOnly: props.readOnly ?? false})
}

function syncNumberAttribute(input: HTMLInputElement, name: "min" | "max" | "step", value: number | undefined): void {
  if (value === undefined) input.removeAttribute(name)
  else input.setAttribute(name, String(value))
}

function assertFinite(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(`${label} must be finite`)
}
