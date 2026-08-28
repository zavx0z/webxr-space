import type {Document, Event, HTMLButtonElement, HTMLFieldSetElement, HTMLInputElement, HTMLLabelElement, HTMLElement, Text} from "@zavx0z/dom"
import {projectVisualState, type VisualStateProjection} from "./internal/dom-state.ts"

import type {ColorChannel, ColorInputProps, ColorInputValue} from "./color-input-component.tsx"
export type ColorInputRefs = Readonly<{
  root: HTMLFieldSetElement
  trigger: HTMLButtonElement
  triggerText: Text
  picker: HTMLElement
  swatch: HTMLElement
  numberInputs: ReadonlyMap<ColorChannel, HTMLInputElement>
  rangeInputs: ReadonlyMap<ColorChannel, HTMLInputElement>
}>
export type ColorInputController = Readonly<{element: HTMLFieldSetElement; refs: ColorInputRefs; props: ColorInputProps; update(props: ColorInputProps): void; dispose(): void}>

export const colorInputCss = String.raw`
.ui-color-input { box-sizing: border-box; display: flex; flex-direction: column; width: 280px; gap: 4px; padding: 0; border: 0; color: rgb(230 230 230); }
.ui-color-input__legend { display: block; min-height: 16px; color: rgb(204 204 204); font-size: 11px; }
.ui-color-input__trigger { box-sizing: border-box; display: flex; align-items: center; justify-content: flex-start; width: 100%; height: 28px; padding: 3px 7px; border: 1px solid rgb(61 61 61); border-radius: 4px; background: rgb(84 84 84); color: rgb(230 230 230); font-size: 11px; }
.ui-color-input__trigger[data-ui-state="hover"] { background: rgb(101 101 101); }
.ui-color-input__trigger[data-ui-state="active"],
.ui-color-input__trigger[data-ui-state="focus"],
.ui-color-input[data-presentation="open"] .ui-color-input__trigger { background: rgb(71 114 179); }
.ui-color-input__picker { box-sizing: border-box; display: flex; flex-direction: column; width: 100%; gap: 3px; padding: 6px; border: 1px solid rgb(36 36 36); border-radius: 4px; background: rgb(24 24 24); }
.ui-color-input[data-presentation="open"] .ui-color-input__picker { border-color: rgb(61 61 61); }
.ui-color-input[data-presentation="expanded"] .ui-color-input__picker { border-color: rgb(71 114 179); }
.ui-color-input__swatch { box-sizing: border-box; display: block; width: 100%; height: 34px; border: 1px solid rgb(61 61 61); border-radius: 3px; background: rgb(71 114 179); }
.ui-color-input__channel { box-sizing: border-box; display: flex; flex-direction: row; align-items: center; width: 100%; height: 24px; gap: 3px; }
.ui-color-input__channel-label { display: inline; width: 14px; color: rgb(153 153 153); font-size: 10px; text-align: center; }
.ui-color-input__number { box-sizing: border-box; display: block; width: 52px; height: 24px; padding: 2px 4px; border: 1px solid rgb(61 61 61); border-radius: 3px; background: rgb(29 29 29); color: rgb(230 230 230); font-size: 10px; text-align: right; }
.ui-color-input__range { box-sizing: border-box; display: block; min-width: 0; height: 24px; flex-grow: 1; padding: 2px 4px; border: 1px solid rgb(61 61 61); border-radius: 3px; background: rgb(84 84 84); color: rgb(71 114 179); }
.ui-color-input input[data-ui-state="hover"] { border-color: rgb(101 101 101); }
.ui-color-input input[data-ui-state="focus"] { border-color: rgb(113 168 255); background: rgb(34 34 34); }
.ui-color-input [hidden] { display: none; }
.ui-color-input[disabled],
.ui-color-input input[disabled] { opacity: 0.5; }
`

const channels = Object.freeze(["r", "g", "b", "a"] as const)
type InputEntry = {number: HTMLInputElement; range: HTMLInputElement; listeners: readonly ((event: Event) => void)[]; states: readonly VisualStateProjection[]}

export function createColorInput(document: Document, initialProps: ColorInputProps): ColorInputController {
  const root = document.createElement("fieldset")
  const legend = document.createElement("legend")
  const legendText = document.createTextNode("")
  const trigger = document.createElement("button")
  const triggerText = document.createTextNode("")
  const picker = document.createElement("div")
  const swatch = document.createElement("div")
  const entries = new Map<ColorChannel, InputEntry>()
  const numberInputs = new Map<ColorChannel, HTMLInputElement>()
  const rangeInputs = new Map<ColorChannel, HTMLInputElement>()
  root.className = "ui-color-input"
  legend.className = "ui-color-input__legend"
  trigger.className = "ui-color-input__trigger"
  trigger.type = "button"
  picker.className = "ui-color-input__picker"
  swatch.className = "ui-color-input__swatch"
  legend.appendChild(legendText)
  trigger.appendChild(triggerText)
  picker.appendChild(swatch)
  root.append(legend, trigger, picker)
  let current = normalize(initialProps)
  let disposed = false
  const blocked = (): boolean => current.disabled === true || current.readOnly === true
  const triggerState = projectVisualState(trigger, blocked)
  const triggerClick = (event: Event): void => current.onOpenChange?.(current.presentation === "closed", event)
  trigger.addEventListener("click", triggerClick)

  for (const channel of channels) {
    const label = document.createElement("label")
    const labelText = document.createElement("span")
    const number = document.createElement("input")
    const range = document.createElement("input")
    label.className = "ui-color-input__channel"
    labelText.className = "ui-color-input__channel-label"
    labelText.appendChild(document.createTextNode(channel.toUpperCase()))
    number.className = "ui-color-input__number"
    number.type = "number"
    number.min = "0"
    number.max = "1"
    number.step = "0.01"
    range.className = "ui-color-input__range"
    range.type = "range"
    range.min = "0"
    range.max = "1"
    range.step = "0.01"
    label.append(labelText, number, range)
    picker.appendChild(label)
    const emit = (kind: "input" | "change", source: HTMLInputElement, event: Event): void => {
      if (!Number.isFinite(source.valueAsNumber)) return
      const next = Object.freeze({...current.value, [channel]: clamp(source.valueAsNumber)})
      if (kind === "input") current.onInput?.(next, event)
      else current.onChange?.(next, event)
    }
    const numberInput = (event: Event): void => emit("input", number, event)
    const numberChange = (event: Event): void => emit("change", number, event)
    const rangeInput = (event: Event): void => emit("input", range, event)
    const rangeChange = (event: Event): void => emit("change", range, event)
    number.addEventListener("input", numberInput)
    number.addEventListener("change", numberChange)
    range.addEventListener("input", rangeInput)
    range.addEventListener("change", rangeChange)
    entries.set(channel, {
      number,
      range,
      listeners: [numberInput, numberChange, rangeInput, rangeChange],
      states: [projectVisualState(number, blocked), projectVisualState(range, blocked)],
    })
    numberInputs.set(channel, number)
    rangeInputs.set(channel, range)
  }

  const update = (props: ColorInputProps): void => {
    if (disposed) throw new Error("ColorInput controller is disposed")
    const next = normalize(props)
    current = next
    root.className = "ui-color-input"
    root.setAttribute("data-presentation", next.presentation ?? "closed")
    root.disabled = next.disabled === true
    root.title = next.title ?? ""
    legendText.data = next.label ?? "Color"
    triggerText.data = rgbaLabel(next.value)
    trigger.disabled = blocked()
    trigger.setAttribute("aria-expanded", String(next.presentation !== "closed"))
    if (next.presentation === "closed") picker.setAttribute("hidden", "")
    else picker.removeAttribute("hidden")
    swatch.setAttribute("style", `background:${rgbaCss(next.value)}`)
    for (const channel of channels) {
      const entry = entries.get(channel)!
      entry.number.valueAsNumber = next.value[channel]
      entry.range.valueAsNumber = next.value[channel]
      entry.number.disabled = blocked()
      entry.number.readOnly = next.readOnly === true
      entry.range.disabled = blocked()
      for (const state of entry.states) state.sync()
    }
    triggerState.sync()
  }
  const refs: ColorInputRefs = Object.freeze({root, trigger, triggerText, picker, swatch, numberInputs, rangeInputs})
  const controller: ColorInputController = Object.freeze({
    element: root,
    refs,
    get props() { return current },
    update,
    dispose() {
      if (disposed) return
      disposed = true
      trigger.removeEventListener("click", triggerClick)
      triggerState.dispose()
      for (const entry of entries.values()) {
        entry.number.removeEventListener("input", entry.listeners[0]!)
        entry.number.removeEventListener("change", entry.listeners[1]!)
        entry.range.removeEventListener("input", entry.listeners[2]!)
        entry.range.removeEventListener("change", entry.listeners[3]!)
        for (const state of entry.states) state.dispose()
      }
    },
  })
  update(current)
  return controller
}

function normalize(props: ColorInputProps): ColorInputProps {
  const value = Object.freeze({r: unit(props.value.r, "r"), g: unit(props.value.g, "g"), b: unit(props.value.b, "b"), a: unit(props.value.a, "a")})
  const presentation = props.presentation ?? "closed"
  if (!["closed", "open", "expanded"].includes(presentation)) throw new Error(`Unknown ColorInput presentation: ${presentation}`)
  return Object.freeze({...props, value, presentation, disabled: props.disabled ?? false, readOnly: props.readOnly ?? false})
}

function unit(value: number, channel: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError(`ColorInput ${channel} must be between 0 and 1`)
  return value
}

function clamp(value: number): number { return Math.max(0, Math.min(1, value)) }
function byte(value: number): number { return Math.round(value * 255) }
function rgbaLabel(value: ColorInputValue): string { return `RGBA ${byte(value.r)}, ${byte(value.g)}, ${byte(value.b)}, ${Math.round(value.a * 100)}%` }
function rgbaCss(value: ColorInputValue): string { return `rgba(${byte(value.r)}, ${byte(value.g)}, ${byte(value.b)}, ${Math.round(value.a * 1000) / 1000})` }
