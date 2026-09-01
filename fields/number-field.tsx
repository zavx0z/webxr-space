import type {
  Event,
  HTMLInputElement,
  KeyboardEvent,
  PointerEvent
} from "@zavx0z/dom"
import {useRef} from "@zavx0z/react"
import {
  resolveNumberDragRange,
  scrubNumberRawValue,
  snapNumberValue
} from "../src/number/scrub.ts"
import {
  normalizeNumberValue,
  numberFillPercentage,
  numberPointerStep,
  stepNumberValue,
  type NumberRange
} from "../src/number/value.ts"

export type NumberFieldProps = Readonly<{
  label?: string | undefined
  value: number
  min?: number | undefined
  max?: number | undefined
  softMin?: number | undefined
  softMax?: number | undefined
  step?: number | undefined
  disabled?: boolean | undefined
  readOnly?: boolean | undefined
  title?: string | undefined
  style?: CssStyle | undefined
  onInput?: ((value: number, event: Event) => void) | undefined
  onChange?: ((value: number, event: Event) => void) | undefined
}>

type ActiveScrub = Readonly<{
  target: HTMLInputElement
  pointerId: number
  origin: number
  current: number
  rawCurrent: number
  startX: number
  lastX: number
  changed: boolean
  dragRange: NumberRange
}>

export function NumberField(props: NumberFieldProps) {
  const scrub = useRef<ActiveScrub | null>(null)
  const editBaseline = useRef(props.value)
  const hasLabel = props.label !== undefined
  const step = numberPointerStep(props)
  const locked = props.disabled === true || props.readOnly === true
  const fillPercentage = numberFillPercentage(props.value, props.min, props.max)

  const propose = (value: number, event: Event) => {
    if (!locked && Number.isFinite(value)) props.onInput?.(normalizeNumberValue(value, props), event)
  }
  const onInput = (event: Event) => {
    const value = (event.target as HTMLInputElement).valueAsNumber
    if (Number.isFinite(value)) propose(value, event)
  }
  const onChange = (event: Event) => {
    const value = (event.target as HTMLInputElement).valueAsNumber
    if (!locked && Number.isFinite(value)) props.onChange?.(normalizeNumberValue(value, props), event)
  }
  const onFocus = () => {
    editBaseline.current = props.value
  }
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || locked) return
    event.preventDefault()
    releaseScrubCapture(scrub.current)
    scrub.current = null
    props.onInput?.(editBaseline.current, event)
  }
  const onPointerDown = (event: PointerEvent) => {
    if (locked) return
    const target = event.currentTarget as HTMLInputElement
    target.setPointerCapture(event.pointerId)
    const origin = normalizeNumberValue(props.value, props)
    editBaseline.current = origin
    scrub.current = Object.freeze({
      target,
      pointerId: event.pointerId,
      origin,
      current: origin,
      rawCurrent: origin,
      startX: event.clientX,
      lastX: event.clientX,
      changed: false,
      dragRange: resolveNumberDragRange(origin, props)
    })
  }
  const onPointerMove = (event: PointerEvent) => {
    const active = scrub.current
    if (!active || locked) return
    const rawCurrent = scrubNumberRawValue(
      active.rawCurrent,
      event.clientX - active.lastX,
      event.clientX - active.startX,
      active.dragRange,
      event.shiftKey
    )
    const projected = event.ctrlKey
      ? snapNumberValue(rawCurrent, active.dragRange, event.shiftKey)
      : rawCurrent
    const current = normalizeNumberValue(projected, props)
    scrub.current = Object.freeze({
      ...active,
      current,
      rawCurrent,
      lastX: event.clientX,
      changed: active.changed || current !== active.current
    })
    if (current !== active.current) props.onInput?.(current, event)
  }
  const endScrub = (event: PointerEvent) => {
    const active = scrub.current
    releaseScrubCapture(active)
    scrub.current = null
    if (!locked && active?.changed === true) props.onChange?.(active.current, event)
  }
  const cancelScrub = (event: PointerEvent) => {
    const active = scrub.current
    releaseScrubCapture(active)
    scrub.current = null
    if (!locked && active?.changed === true) props.onInput?.(active.origin, event)
  }
  const stepAtEdge = (direction: -1 | 1, event: Event) => {
    if (locked) return
    const next = stepNumberValue(props.value, direction, props)
    props.onInput?.(next, event)
    props.onChange?.(next, event)
  }
  const decrease = (event: Event) => stepAtEdge(-1, event)
  const increase = (event: Event) => stepAtEdge(1, event)

  return <div
    data-has-label={hasLabel ? "true" : undefined}
    title={props.title}
    style={css`
      & { box-sizing: border-box; display: flex; flex-direction: row; align-items: flex-start; width: auto; min-width: 0; padding: 0; color: var(--widget-list-content); }
      &[data-has-label="true"] { width: 100%; min-height: 28px; gap: 4px; }
      ${props.style}
    `}
  >
    <span hidden={!hasLabel} style={css`
      & { box-sizing: border-box; display: flex; align-items: center; width: var(--field-label-width, 40%); min-width: 0; height: 28px; color: var(--field-label-content, var(--widget-list-content)); font-size: var(--font-size-sm); }
      &[hidden] { display: none; }
    `}>{props.label ?? ""}</span>
    <div
      data-number-field-value=""
      data-labelled={hasLabel ? "true" : undefined}
      data-readonly={props.readOnly === true ? "true" : undefined}
      style={css`
        & { box-sizing: border-box; position: relative; display: block; width: var(--number-field-width, 120px); height: var(--number-field-height, var(--control-height-medium)); min-width: 0; padding: 0; border-width: var(--number-field-border-width, var(--border-width-control)); border-style: solid; border-color: var(--number-field-outline, var(--widget-number-outline)); border-radius: var(--number-field-radius, 3px); background: var(--number-field-background, var(--widget-number-background)); box-shadow: var(--number-field-shadow, 0 1px 0 var(--material-widget-emboss)); overflow: clip; }
        &[data-labelled="true"] { width: 0; flex-grow: 1; }
        &:hover { background: var(--widget-hover-background); }
        &:focus-within { border-color: var(--widget-focus-outline); background: var(--widget-number-background-focus); }
        &[data-readonly="true"] { color: var(--widget-number-content-readonly); }
        ${props.disabled === true && css`& { opacity: 0.5; box-shadow: none; }`}
      `}
    >
      <span data-number-fill="" hidden={fillPercentage === null} style={css`
        & { position: absolute; left: 0; top: 0; display: block; width: ${fillPercentage ?? 0}%; height: 100%; background: var(--widget-number-fill); }
        &[hidden] { display: none; }
      `}></span>
      <input
        type="number"
        value={props.value}
        min={props.min}
        max={props.max}
        step={step}
        disabled={props.disabled === true}
        readOnly={props.readOnly === true}
        onInput={onInput}
        onChange={onChange}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endScrub}
        onPointerCancel={cancelScrub}
        style={css`
          & { box-sizing: border-box; position: relative; z-index: 1; display: block; width: 100%; height: 100%; min-width: 0; padding: var(--number-field-padding, 2px 7px); border: 0 solid transparent; border-radius: 0; background: transparent; color: var(--widget-number-content); font-size: var(--number-field-font-size, var(--font-size-xs)); line-height: var(--line-height-control); text-align: var(--number-field-text-align, right); overflow: clip; cursor: ew-resize; }
          &[readonly] { color: var(--widget-number-content-readonly); cursor: default; }
        `}
      />
      <button type="button" disabled={locked} onClick={decrease} style={css`
        & { position: absolute; left: 0; top: 0; z-index: 2; display: block; width: 16px; height: 100%; padding: 0; border: 0 solid transparent; background: transparent; color: transparent; box-shadow: none; }
      `}></button>
      <button type="button" disabled={locked} onClick={increase} style={css`
        & { position: absolute; right: 0; top: 0; z-index: 2; display: block; width: 16px; height: 100%; padding: 0; border: 0 solid transparent; background: transparent; color: transparent; box-shadow: none; }
      `}></button>
    </div>
  </div>
}

function releaseScrubCapture(active: ActiveScrub | null): void {
  if (active?.target.hasPointerCapture(active.pointerId) === true) {
    active.target.releasePointerCapture(active.pointerId)
  }
}
