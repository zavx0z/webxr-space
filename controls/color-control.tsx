import type {Event, HTMLElement, ToggleEvent} from "@zavx0z/dom"
import {useCallback} from "@zavx0z/react"
import {Button} from "../button.tsx"
import {SliderControl} from "./slider-control.tsx"
import {TextControl} from "./text-control.tsx"

export type ColorChannel = "r" | "g" | "b" | "a"
export type ColorControlValue = Readonly<Record<ColorChannel, number>>
export type ColorControlHsva = Readonly<{h: number; s: number; v: number; a: number}>
export type ColorControlPresentation = "closed" | "open" | "expanded"

export type ColorControlProps = Readonly<{
  value: ColorControlValue
  label?: string | undefined
  presentation?: ColorControlPresentation | undefined
  disabled?: boolean | undefined
  readOnly?: boolean | undefined
  title?: string | undefined
  style?: CssStyle | undefined
  onInput?: ((value: ColorControlValue, event: Event) => void) | undefined
  onChange?: ((value: ColorControlValue, event: Event) => void) | undefined
  onOpenChange?: ((open: boolean, event: Event) => void) | undefined
}>

type HsvaChannel = "h" | "s" | "v" | "a"

const channels = ["h", "s", "v", "a"] as const
const checkerCells = "10101010010101011010101001010101"

const triggerStyle: CssStyle = css`& { width: 100%; height: 28px; justify-content: flex-start; padding: 3px 7px; }`
const openTriggerStyle: CssStyle = css`& { background: var(--widget-active-background); }`
const hexStyle: CssStyle = css`& { width: 92px; min-width: 92px; height: 24px; text-transform: uppercase; }`
const numberStyle: CssStyle = css`& { width: 56px; min-width: 56px; height: 24px; padding: 2px 4px; font-size: 10px; text-align: right; }`
const rangeStyle: CssStyle = css`& { width: 0; min-width: 0; height: 24px; flex-grow: 1; padding: 2px 4px; }`

function CheckerCell(props: Readonly<{dark: boolean}>) {
  return <span
    data-dark={props.dark ? "true" : undefined}
    style={css`
      & { display: block; width: 12.5%; height: 25%; background: rgb(var(--surface-550)); }
      &[data-dark="true"] { background: rgb(var(--surface-750)); }
    `}
  ></span>
}

function ColorSwatch(props: Readonly<{value: ColorControlValue; expanded: boolean}>) {
  return <div data-color-swatch="" data-expanded={props.expanded ? "true" : undefined} style={css`
    & { box-sizing: border-box; position: relative; display: block; width: 0; min-width: 0; height: 34px; flex-grow: 1; border: var(--border-width-control) solid var(--widget-regular-outline); border-radius: 3px; overflow: clip; }
    &[data-expanded="true"] { height: 48px; }
  `}>
    <div aria-hidden="true" style={css`
      & { position: absolute; inset: 0; display: flex; flex-direction: row; flex-wrap: wrap; width: 100%; height: 100%; overflow: clip; }
    `}>{checkerCells.split("").map((dark, index) => <CheckerCell
      key={index}
      dark={dark > "0"}
    />)}</div>
    <span aria-hidden="true" style={css`
      & { position: absolute; inset: 0; display: block; background: ${rgbaCss(props.value)}; }
    `}></span>
  </div>
}

type ColorChannelControlProps = Readonly<{
  channel: HsvaChannel
  hsva: ColorControlHsva
  disabled: boolean
  readOnly: boolean
  onInput?: ColorControlProps["onInput"]
  onChange?: ColorControlProps["onChange"]
}>

function ColorChannelControl(props: ColorChannelControlProps) {
  const displayValue = colorChannelDisplayValue(props.channel, props.hsva)
  const maximum = props.channel === "h" ? 360 : 1
  const step = props.channel === "h" ? 1 : 0.01
  const emit = (kind: "input" | "change", nextValue: number, event: Event) => {
    if (!Number.isFinite(nextValue)) return
    const nextHsva = Object.freeze({
      ...props.hsva,
      [props.channel]: props.channel === "h" ? wrapUnit(nextValue / 360) : clampUnit(nextValue)
    })
    const next = colorControlHsvaToValue(nextHsva)
    if (kind === "input") props.onInput?.(next, event)
    else props.onChange?.(next, event)
  }
  const onNumberControl = (value: string, event: Event) => emit("input", Number(value), event)
  const onNumberChange = (value: string, event: Event) => emit("change", Number(value), event)
  const onRangeInput = (value: number, event: Event) => emit("input", value, event)
  const onRangeChange = (value: number, event: Event) => emit("change", value, event)
  return <label data-color-channel={props.channel} style={css`
    & { box-sizing: border-box; display: flex; flex-direction: row; align-items: center; width: 100%; height: 24px; gap: 3px; }
  `}>
    <span style={css`
      & { display: inline; width: 14px; color: var(--widget-text-content-readonly); font-size: var(--font-size-2xs); text-align: center; }
    `}>{props.channel.toUpperCase()}</span>
    <TextControl
      type="number"
      value={String(displayValue)}
      min={0}
      max={maximum}
      step={step}
      disabled={props.disabled}
      readOnly={props.readOnly}
      aria-label={`${props.channel.toUpperCase()} channel`}
      style={numberStyle}
      onInput={onNumberControl}
      onChange={onNumberChange}
    />
    <SliderControl
      value={displayValue}
      min={0}
      max={maximum}
      step={step}
      disabled={props.disabled || props.readOnly}
      title={`${props.channel.toUpperCase()} channel`}
      style={rangeStyle}
      onInput={onRangeInput}
      onChange={onRangeChange}
    />
  </label>
}

export function ColorControl(props: ColorControlProps) {
  const normalized = normalizeColorProps(props)
  const open = normalized.presentation !== "closed"
  const popoverOpen = normalized.presentation === "open"
  const expanded = normalized.presentation === "expanded"
  const locked = props.disabled === true || props.readOnly === true
  const hsva = colorControlValueToHsva(normalized.value)
  const bindEditor = useCallback((element: HTMLElement | null) => {
    if (!element?.isConnected) return
    const trigger = element.parentElement?.querySelector("button") as HTMLElement | null
    if (!trigger?.isConnected) return
    if (popoverOpen) element.showPopover({source: trigger})
    else if (element.popover !== null) element.hidePopover()
  }, [normalized.presentation])
  const onToggle = (event: Event) => {
    if (!locked) props.onOpenChange?.(!open, event)
  }
  const onEditorToggle = (event: Event) => {
    const showing = (event as ToggleEvent).newState === "open"
    if (showing !== popoverOpen) props.onOpenChange?.(showing, event)
  }
  const emitHex = (kind: "input" | "change", text: string, event: Event) => {
    const next = parseColorControlValue(text)
    if (next === null || locked) return
    if (kind === "input") props.onInput?.(next, event)
    else props.onChange?.(next, event)
  }
  const onHexInput = (value: string, event: Event) => emitHex("input", value, event)
  const onHexChange = (value: string, event: Event) => emitHex("change", value, event)

  return <fieldset
    disabled={props.disabled === true}
    title={props.title}
    data-color-control=""
    data-presentation={normalized.presentation}
    style={css`
      & { box-sizing: border-box; display: flex; flex-direction: column; width: 280px; gap: 4px; padding: 0; border: 0; color: var(--widget-regular-content); }
      ${props.style}
    `}
  >
    <legend style={css`
      & { display: block; min-height: 16px; color: var(--widget-list-content); font-size: var(--font-size-xs); }
    `}>{props.label ?? "Color"}</legend>
    <Button
      label={formatColorControlValue(normalized.value)}
      disabled={locked}
      selected={open}
      aria-expanded={String(open)}
      style={css`${triggerStyle}${open && openTriggerStyle}`}
      onClick={onToggle}
    />
    <div ref={bindEditor} style={css`
      & {
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        width: 280px;
        gap: 3px;
        padding: 6px;
        border: var(--border-width-control) solid var(--widget-popup-outline);
        border-radius: 4px;
        background: var(--widget-popup-background);
      }
      &[data-presentation="open"] { border-color: var(--widget-regular-outline); }
      &[data-presentation="expanded"] { gap: 5px; border-color: var(--widget-focus-outline); }
    `} popover={expanded ? undefined : "auto"} data-presentation={normalized.presentation}
      role="group" aria-label="Color editor" onToggle={onEditorToggle}>
      <div style={css`
        & { box-sizing: border-box; display: flex; flex-direction: row; align-items: center; width: 100%; gap: 4px; }
      `} data-expanded={expanded ? "true" : undefined}>
        <ColorSwatch value={normalized.value} expanded={expanded} />
        <TextControl
          value={formatColorControlValue(normalized.value)}
          disabled={props.disabled === true}
          readOnly={props.readOnly === true}
          aria-label="Hex color"
          style={hexStyle}
          onInput={onHexInput}
          onChange={onHexChange}
        />
      </div>
      {channels.map(channel => <ColorChannelControl
        key={channel}
        channel={channel}
        hsva={hsva}
        disabled={props.disabled === true}
        readOnly={props.readOnly === true}
        onInput={props.onInput}
        onChange={props.onChange}
      />)}
    </div>
  </fieldset>
}

/** Normalizes partial RGBA input into an immutable unit-range value. */
export function normalizeColorControlValue(value: Partial<ColorControlValue>): ColorControlValue {
  return Object.freeze({
    r: clampUnit(value.r ?? 0),
    g: clampUnit(value.g ?? 0),
    b: clampUnit(value.b ?? 0),
    a: clampUnit(value.a ?? 1)
  })
}

/** Formats normalized RGB or RGBA as exact two-digit hexadecimal channels. */
export function formatColorControlValue(value: Partial<ColorControlValue>, includeAlpha = true): string {
  const color = normalizeColorControlValue(value)
  const channel = (entry: number): string => Math.round(entry * 255).toString(16).padStart(2, "0").toUpperCase()
  return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}${includeAlpha ? channel(color.a) : ""}`
}

/** Parses exact six- or eight-digit RGB(A) hexadecimal text. */
export function parseColorControlValue(value: string): ColorControlValue | null {
  const hex = value.trim().replace(/^#/, "")
  if (!/^[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?$/.test(hex)) return null
  const channel = (offset: number): number => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255
  return normalizeColorControlValue({
    r: channel(0),
    g: channel(2),
    b: channel(4),
    a: hex.length === 8 ? channel(6) : 1
  })
}

/** Converts normalized RGBA to immutable hue/saturation/value/alpha. */
export function colorControlValueToHsva(value: Partial<ColorControlValue>): ColorControlHsva {
  const color = normalizeColorControlValue(value)
  const maximum = Math.max(color.r, color.g, color.b)
  const minimum = Math.min(color.r, color.g, color.b)
  const delta = maximum - minimum
  let hue = 0
  if (delta > 0) {
    if (maximum === color.r) hue = ((color.g - color.b) / delta) % 6
    else if (maximum === color.g) hue = (color.b - color.r) / delta + 2
    else hue = (color.r - color.g) / delta + 4
    hue /= 6
  }
  return Object.freeze({
    h: wrapUnit(hue),
    s: maximum <= 0 ? 0 : delta / maximum,
    v: maximum,
    a: color.a
  })
}

/** Converts normalized HSVA to a new immutable RGBA value. */
export function colorControlHsvaToValue(value: Partial<ColorControlHsva>): ColorControlValue {
  const hue = wrapUnit(value.h ?? 0) * 6
  const saturation = clampUnit(value.s ?? 0)
  const brightness = clampUnit(value.v ?? 0)
  const chroma = brightness * saturation
  const secondary = chroma * (1 - Math.abs((hue % 2) - 1))
  const match = brightness - chroma
  const sector = Math.floor(hue) % 6
  const rgb = sector === 0 ? [chroma, secondary, 0]
    : sector === 1 ? [secondary, chroma, 0]
      : sector === 2 ? [0, chroma, secondary]
        : sector === 3 ? [0, secondary, chroma]
          : sector === 4 ? [secondary, 0, chroma]
            : [chroma, 0, secondary]
  return normalizeColorControlValue({
    r: rgb[0]! + match,
    g: rgb[1]! + match,
    b: rgb[2]! + match,
    a: value.a ?? 1
  })
}

function normalizeColorProps(props: ColorControlProps): Readonly<{
  value: ColorControlValue
  presentation: ColorControlPresentation
}> {
  if (!props.value || typeof props.value !== "object") throw new TypeError("ColorControl value must be an object")
  const value = normalizeColorControlValue(props.value)
  const presentation = props.presentation ?? "closed"
  if (presentation !== "closed" && presentation !== "open" && presentation !== "expanded") {
    throw new Error(`Unknown ColorControl presentation: ${presentation}`)
  }
  return {value, presentation}
}

function colorChannelDisplayValue(channel: HsvaChannel, value: ColorControlHsva): number {
  return channel === "h"
    ? Math.round(value.h * 360)
    : Math.round(value[channel] * 1_000_000) / 1_000_000
}

function clampUnit(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0))
}

function wrapUnit(value: number): number {
  if (!Number.isFinite(value)) return 0
  return ((value % 1) + 1) % 1
}

function byte(value: number): number {
  return Math.round(value * 255)
}

function rgbaCss(value: ColorControlValue): string {
  return `rgba(${byte(value.r)}, ${byte(value.g)}, ${byte(value.b)}, ${Math.round(value.a * 1000) / 1000})`
}
