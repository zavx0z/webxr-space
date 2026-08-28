import type {Event} from "@zavx0z/dom"
import {defineStyles, type StyleValue} from "@zavx0z/react"
import {Button, buttonCss} from "./button.tsx"
import {SliderControl, sliderControlCss} from "./slider-control.tsx"
import {TextField, textFieldCss} from "./text-field.tsx"

export type ColorChannel = "r" | "g" | "b" | "a"
export type ColorInputValue = Readonly<Record<ColorChannel, number>>
export type ColorInputPresentation = "closed" | "open" | "expanded"

export type ColorInputProps = Readonly<{
  value: ColorInputValue
  label?: string | undefined
  presentation?: ColorInputPresentation | undefined
  disabled?: boolean | undefined
  readOnly?: boolean | undefined
  title?: string | undefined
  style?: StyleValue
  onInput?: ((value: ColorInputValue, event: Event) => void) | undefined
  onChange?: ((value: ColorInputValue, event: Event) => void) | undefined
  onOpenChange?: ((open: boolean, event: Event) => void) | undefined
}>

const channels = Object.freeze(["r", "g", "b", "a"] as const)

export const colorInputStyles = defineStyles("@ui/components/color-input", {
  root: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    width: 280,
    gap: 4,
    padding: 0,
    border: 0,
    color: "rgb(230 230 230)"
  },
  legend: {display: "block", minHeight: 16, color: "rgb(204 204 204)", fontSize: 11},
  trigger: {
    width: "100%",
    height: 28,
    justifyContent: "flex-start",
    padding: "3px 7px"
  },
  openTrigger: {background: "rgb(71 114 179)"},
  picker: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    width: "100%",
    gap: 3,
    padding: 6,
    border: "1px solid rgb(36 36 36)",
    borderRadius: 4,
    background: "rgb(24 24 24)"
  },
  openPicker: {borderColor: "rgb(61 61 61)"},
  expandedPicker: {borderColor: "rgb(71 114 179)"},
  hidden: {display: "none"},
  swatch: {
    boxSizing: "border-box",
    display: "block",
    width: "100%",
    height: 34,
    border: "1px solid rgb(61 61 61)",
    borderRadius: 3
  },
  channel: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    height: 24,
    gap: 3
  },
  channelLabel: {display: "inline", width: 14, color: "rgb(153 153 153)", fontSize: 10, textAlign: "center"},
  number: {
    width: 52,
    minWidth: 52,
    height: 24,
    padding: "2px 4px",
    fontSize: 10,
    textAlign: "right"
  },
  range: {width: 0, minWidth: 0, height: 24, flexGrow: 1, padding: "2px 4px"}
})

export const colorInputCss = [
  buttonCss,
  textFieldCss,
  sliderControlCss,
  colorInputStyles.cssText
].join("\n")

type ColorChannelControlProps = Readonly<{
  channel: ColorChannel
  value: ColorInputValue
  disabled: boolean
  readOnly: boolean
  onInput?: ColorInputProps["onInput"]
  onChange?: ColorInputProps["onChange"]
}>

function ColorChannelControl(props: ColorChannelControlProps) {
  const emit = (kind: "input" | "change", nextValue: number, event: Event) => {
    if (!Number.isFinite(nextValue)) return
    const next = Object.freeze({...props.value, [props.channel]: clamp(nextValue)})
    if (kind === "input") props.onInput?.(next, event)
    else props.onChange?.(next, event)
  }
  const onNumberInput = (value: string, event: Event) => emit("input", Number(value), event)
  const onNumberChange = (value: string, event: Event) => emit("change", Number(value), event)
  const onRangeInput = (value: number, event: Event) => emit("input", value, event)
  const onRangeChange = (value: number, event: Event) => emit("change", value, event)
  return <label data-color-channel={props.channel} style={colorInputStyles.channel}>
    <span style={colorInputStyles.channelLabel}>{props.channel.toUpperCase()}</span>
    <TextField
      type="number"
      value={String(props.value[props.channel])}
      min={0}
      max={1}
      step={0.01}
      disabled={props.disabled}
      readOnly={props.readOnly}
      style={colorInputStyles.number}
      onInput={onNumberInput}
      onChange={onNumberChange}
    />
    <SliderControl
      value={props.value[props.channel]}
      min={0}
      max={1}
      step={0.01}
      disabled={props.disabled || props.readOnly}
      style={colorInputStyles.range}
      onInput={onRangeInput}
      onChange={onRangeChange}
    />
  </label>
}

export function ColorInput(props: ColorInputProps) {
  const normalized = normalizeColorProps(props)
  const open = normalized.presentation !== "closed"
  const locked = props.disabled === true || props.readOnly === true
  const onToggle = (event: Event) => {
    if (!locked) props.onOpenChange?.(!open, event)
  }
  return <fieldset
    disabled={props.disabled === true}
    title={props.title}
    style={[colorInputStyles.root, props.style]}
  >
    <legend style={colorInputStyles.legend}>{props.label ?? "Color"}</legend>
    <Button
      label={rgbaLabel(normalized.value)}
      disabled={locked}
      selected={open}
      aria-expanded={String(open)}
      style={[colorInputStyles.trigger, open && colorInputStyles.openTrigger]}
      onClick={onToggle}
    />
    <div style={[
      colorInputStyles.picker,
      normalized.presentation === "closed" && colorInputStyles.hidden,
      normalized.presentation === "open" && colorInputStyles.openPicker,
      normalized.presentation === "expanded" && colorInputStyles.expandedPicker
    ]}>
      <div style={[colorInputStyles.swatch, {background: rgbaCss(normalized.value)}]}></div>
      {channels.map(channel => <ColorChannelControl
        key={channel}
        channel={channel}
        value={normalized.value}
        disabled={props.disabled === true}
        readOnly={props.readOnly === true}
        onInput={props.onInput}
        onChange={props.onChange}
      />)}
    </div>
  </fieldset>
}


function normalizeColorProps(props: ColorInputProps): Readonly<{
  value: ColorInputValue
  presentation: ColorInputPresentation
}> {
  if (!props.value || typeof props.value !== "object") throw new TypeError("ColorInput value must be an object")
  const value = Object.freeze({
    r: unit(props.value.r, "r"),
    g: unit(props.value.g, "g"),
    b: unit(props.value.b, "b"),
    a: unit(props.value.a, "a")
  })
  const presentation = props.presentation ?? "closed"
  if (presentation !== "closed" && presentation !== "open" && presentation !== "expanded") {
    throw new Error(`Unknown ColorInput presentation: ${presentation}`)
  }
  return Object.freeze({value, presentation})
}

function unit(value: number, channel: string): number {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`ColorInput ${channel} must be between 0 and 1`)
  }
  return value
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function byte(value: number): number {
  return Math.round(value * 255)
}

function rgbaLabel(value: ColorInputValue): string {
  return `RGBA ${byte(value.r)}, ${byte(value.g)}, ${byte(value.b)}, ${Math.round(value.a * 100)}%`
}

function rgbaCss(value: ColorInputValue): string {
  return `rgba(${byte(value.r)}, ${byte(value.g)}, ${byte(value.b)}, ${Math.round(value.a * 1000) / 1000})`
}
