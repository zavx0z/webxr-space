import type {Event} from "@zavx0z/dom"
import {
  clampUnit,
  colorChannelDisplayValue,
  colorHsvaToValue,
  colorValueToHsva,
  formatColorValue,
  normalizeColorValue,
  parseColorValue,
  rgbaCss,
  wrapUnit,
  type ColorHsva,
  type ColorValue
} from "../src/color/value.ts"
import {NumberField} from "./number-field.tsx"
import {SliderField} from "./slider-field.tsx"
import {TextField} from "./text-field.tsx"

export type ColorPickerFieldValue = ColorValue
export type ColorPickerFieldProps = Readonly<{
  label?: string | undefined
  value: ColorPickerFieldValue
  disabled?: boolean | undefined
  readOnly?: boolean | undefined
  title?: string | undefined
  style?: CssStyle | undefined
  onInput?: ((value: ColorPickerFieldValue, event: Event) => void) | undefined
  onChange?: ((value: ColorPickerFieldValue, event: Event) => void) | undefined
}>

type HsvaChannel = "h" | "s" | "v" | "a"
const channels = ["h", "s", "v", "a"] as const
const checkerCells = "10101010010101011010101001010101"
const hexStyle: CssStyle = css`& { width: 92px; min-width: 92px; --text-field-width: 92px; --text-field-height: 24px; --text-field-transform: uppercase; }`
const numberStyle: CssStyle = css`& { width: 56px; min-width: 56px; --number-field-width: 56px; --number-field-height: 24px; --number-field-padding: 2px 4px; --number-field-font-size: 10px; --number-field-text-align: right; }`
const rangeStyle: CssStyle = css`& { width: 0; min-width: 0; flex-grow: 1; --slider-field-width: 100%; --slider-field-height: 24px; --slider-field-padding: 2px 4px; }`

function CheckerCell(props: Readonly<{dark: boolean}>) {
  return <span data-dark={props.dark ? "true" : undefined} style={css`
    & { display: block; width: 12.5%; height: 25%; background: rgb(var(--surface-550)); }
    &[data-dark="true"] { background: rgb(var(--surface-750)); }
  `}></span>
}

function ColorSwatch(props: Readonly<{value: ColorPickerFieldValue}>) {
  return <div data-color-swatch="" style={css`
    & { box-sizing: border-box; position: relative; display: block; width: 0; min-width: 0; height: 48px; flex-grow: 1; border: var(--border-width-control) solid var(--widget-regular-outline); border-radius: 3px; overflow: clip; }
  `}>
    <div style={css`& { position: absolute; inset: 0; display: flex; flex-direction: row; flex-wrap: wrap; width: 100%; height: 100%; overflow: clip; }`}>{checkerCells.split("").map((dark, index) => <CheckerCell key={index} dark={dark > "0"} />)}</div>
    <span style={css`& { position: absolute; inset: 0; display: block; background: ${rgbaCss(props.value)}; }`}></span>
  </div>
}

type ColorChannelFieldProps = Readonly<{
  channel: HsvaChannel
  hsva: ColorHsva
  disabled: boolean
  readOnly: boolean
  onInput?: ColorPickerFieldProps["onInput"]
  onChange?: ColorPickerFieldProps["onChange"]
}>

function ColorChannelField(props: ColorChannelFieldProps) {
  const value = colorChannelDisplayValue(props.channel, props.hsva)
  const maximum = props.channel === "h" ? 360 : 1
  const step = props.channel === "h" ? 1 : 0.01
  const nextValue = (next: number): ColorPickerFieldValue => colorHsvaToValue(Object.freeze({
    ...props.hsva,
    [props.channel]: props.channel === "h" ? wrapUnit(next / 360) : clampUnit(next)
  }))
  return <div data-color-channel={props.channel} style={css`
    & { box-sizing: border-box; display: flex; flex-direction: row; align-items: center; width: 100%; height: 24px; gap: 3px; }
  `}>
    <span style={css`& { display: inline; width: 14px; color: var(--widget-text-content-readonly); font-size: var(--font-size-2xs); text-align: center; }`}>{props.channel.toUpperCase()}</span>
    <NumberField value={value} min={0} max={maximum} step={step} disabled={props.disabled} readOnly={props.readOnly} style={numberStyle} onInput={(next, event) => props.onInput?.(nextValue(next), event)} onChange={(next, event) => props.onChange?.(nextValue(next), event)} />
    <SliderField value={value} min={0} max={maximum} step={step} disabled={props.disabled} readOnly={props.readOnly} style={rangeStyle} onInput={(next, event) => props.onInput?.(nextValue(next), event)} onChange={(next, event) => props.onChange?.(nextValue(next), event)} />
  </div>
}

export function ColorPickerField(props: ColorPickerFieldProps) {
  if (!props.value || typeof props.value !== "object") throw new TypeError("ColorPickerField value must be an object")
  const value = normalizeColorValue(props.value)
  const hsva = colorValueToHsva(value)
  const hasLabel = props.label !== undefined
  const emitHex = (kind: "input" | "change", text: string, event: Event) => {
    const next = parseColorValue(text)
    if (next === null || props.disabled === true || props.readOnly === true) return
    if (kind === "input") props.onInput?.(next, event)
    else props.onChange?.(next, event)
  }
  return <div
    data-has-label={hasLabel ? "true" : undefined}
    title={props.title}
    style={css`
      & { box-sizing: border-box; display: flex; flex-direction: row; align-items: flex-start; width: auto; min-width: 0; padding: 0; color: var(--widget-list-content); }
      &[data-has-label="true"] { width: 100%; gap: 4px; }
      ${props.style}
    `}
  >
    <span hidden={!hasLabel} style={css`
      & { box-sizing: border-box; display: flex; align-items: center; width: 40%; min-width: 0; height: 28px; color: var(--widget-list-content); font-size: var(--font-size-sm); }
      &[hidden] { display: none; }
    `}>{props.label ?? ""}</span>
    <div data-color-picker-field="" data-labelled={hasLabel ? "true" : undefined} data-readonly={props.readOnly === true ? "true" : undefined} style={css`
      & { box-sizing: border-box; display: flex; flex-direction: column; width: 280px; min-width: 0; gap: 5px; padding: 6px; border: var(--border-width-control) solid var(--widget-focus-outline); border-radius: 4px; background: var(--widget-popup-background); }
      &[data-labelled="true"] { width: 0; flex-grow: 1; }
      &[data-readonly="true"] { color: var(--widget-text-content-readonly); }
    `}>
      <div style={css`& { box-sizing: border-box; display: flex; flex-direction: row; align-items: center; width: 100%; gap: 4px; }`}>
        <ColorSwatch value={value} />
        <TextField value={formatColorValue(value)} disabled={props.disabled} readOnly={props.readOnly} style={hexStyle} onInput={(text, event) => emitHex("input", text, event)} onChange={(text, event) => emitHex("change", text, event)} />
      </div>
      {channels.map(channel => <ColorChannelField key={channel} channel={channel} hsva={hsva} disabled={props.disabled === true} readOnly={props.readOnly === true} onInput={props.onInput} onChange={props.onChange} />)}
    </div>
  </div>
}
