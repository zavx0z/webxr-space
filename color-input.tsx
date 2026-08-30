import type {Event} from "@zavx0z/dom"
import {Button} from "./button.tsx"
import {SliderControl} from "./slider-control.tsx"
import {TextField} from "./text-field.tsx"

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
  style?: CssStyle | undefined
  onInput?: ((value: ColorInputValue, event: Event) => void) | undefined
  onChange?: ((value: ColorInputValue, event: Event) => void) | undefined
  onOpenChange?: ((open: boolean, event: Event) => void) | undefined
}>

const channels = Object.freeze(["r", "g", "b", "a"] as const)

const triggerStyle: CssStyle = css`& { width: 100%; height: 28px; justify-content: flex-start; padding: 3px 7px; }`
const openTriggerStyle: CssStyle = css`& { background: var(--widget-active-background); }`
const numberStyle: CssStyle = css`& { width: 52px; min-width: 52px; height: 24px; padding: 2px 4px; font-size: 10px; text-align: right; }`
const rangeStyle: CssStyle = css`& { width: 0; min-width: 0; height: 24px; flex-grow: 1; padding: 2px 4px; }`

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
  return <label data-color-channel={props.channel} style={css`
    & { box-sizing: border-box; display: flex; flex-direction: row; align-items: center; width: 100%; height: 24px; gap: 3px; }
  `}>
    <span style={css`
      & { display: inline; width: 14px; color: var(--widget-text-content-readonly); font-size: var(--font-size-2xs); text-align: center; }
    `}>{props.channel.toUpperCase()}</span>
    <TextField
      type="number"
      value={String(props.value[props.channel])}
      min={0}
      max={1}
      step={0.01}
      disabled={props.disabled}
      readOnly={props.readOnly}
      style={numberStyle}
      onInput={onNumberInput}
      onChange={onNumberChange}
    />
    <SliderControl
      value={props.value[props.channel]}
      min={0}
      max={1}
      step={0.01}
      disabled={props.disabled || props.readOnly}
      style={rangeStyle}
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
    style={css`
        & { box-sizing: border-box; display: flex; flex-direction: column; width: 280px; gap: 4px; padding: 0; border: 0; color: var(--widget-regular-content); }
        ${props.style}
      `}
  >
    <legend style={css`
      & { display: block; min-height: 16px; color: var(--widget-list-content); font-size: var(--font-size-xs); }
    `}>{props.label ?? "Color"}</legend>
    <Button
      label={rgbaLabel(normalized.value)}
      disabled={locked}
      selected={open}
      aria-expanded={String(open)}
      style={css`${triggerStyle}${open && openTriggerStyle}`}
      onClick={onToggle}
    />
    <div data-presentation={normalized.presentation} style={css`
        & {
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          width: 100%;
          gap: 3px;
          padding: 6px;
          border: var(--border-width-control) solid var(--widget-popup-outline);
          border-radius: 4px;
          background: var(--widget-popup-background);
        }
        &[data-presentation="closed"] { display: none; }
        &[data-presentation="open"] { border-color: var(--widget-regular-outline); }
        &[data-presentation="expanded"] { border-color: var(--widget-focus-outline); }
      `}>
      <div style={css`
          & { box-sizing: border-box; display: block; width: 100%; height: 34px; border: var(--border-width-control) solid var(--widget-regular-outline); border-radius: 3px; }
          & { background: ${rgbaCss(normalized.value)}; }
        `}></div>
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
