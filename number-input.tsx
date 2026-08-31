import type {
  Event,
  HTMLInputElement,
  KeyboardEvent,
  PointerEvent
} from "@zavx0z/dom"
import {useRef} from "@zavx0z/react"

export type NumberInputProps = Readonly<{
  value: number
  numberKind?: "float" | "integer" | undefined
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

export type NumberInputValueOptions = Pick<
  NumberInputProps,
  "numberKind" | "min" | "max" | "softMin" | "softMax" | "step"
>

export type NumberInputSoftRange = Readonly<{min: number; max: number}>

type ActiveScrub = Readonly<{
  target: HTMLInputElement
  pointerId: number
  origin: number
  current: number
  rawCurrent: number
  startX: number
  lastX: number
  changed: boolean
  dragRange: NumberInputSoftRange
}>

export function NumberInput(props: NumberInputProps) {
  const scrub = useRef<ActiveScrub | null>(null)
  const editBaseline = useRef(props.value)
  const step = numberPointerStep(props)
  const locked = props.disabled === true || props.readOnly === true
  const fillPercentage = numberInputFillPercentage(props.value, props.min, props.max)

  const propose = (value: number, event: Event) => {
    if (!locked && Number.isFinite(value)) props.onInput?.(normalizeNumberInputValue(value, props), event)
  }
  const onInput = (event: Event) => {
    const value = (event.target as HTMLInputElement).valueAsNumber
    if (Number.isFinite(value)) propose(value, event)
  }
  const onChange = (event: Event) => {
    const value = (event.target as HTMLInputElement).valueAsNumber
    if (!locked && Number.isFinite(value)) props.onChange?.(normalizeNumberInputValue(value, props), event)
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
    const origin = normalizeNumberInputValue(props.value, props)
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
      dragRange: resolveNumberInputDragRange(origin, props)
    })
  }
  const onPointerMove = (event: PointerEvent) => {
    const active = scrub.current
    if (!active || locked) return
    const rawCurrent = scrubNumberInputRawValue(
      active.rawCurrent,
      event.clientX - active.lastX,
      event.clientX - active.startX,
      active.dragRange,
      props,
      event.shiftKey
    )
    const projected = event.ctrlKey
      ? snapLinearNumberInputValue(rawCurrent, active.dragRange, event.shiftKey)
      : rawCurrent
    const current = normalizeNumberInputValue(projected, props)
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
    const next = stepNumberInputValue(props.value, direction, props)
    props.onInput?.(next, event)
    props.onChange?.(next, event)
  }
  const decrease = (event: Event) => stepAtEdge(-1, event)
  const increase = (event: Event) => stepAtEdge(1, event)

  return <div
    title={props.title}
    aria-disabled={String(locked)}
    style={css`
      & {
        box-sizing: border-box;
        position: relative;
        display: block;
        width: 120px;
        height: var(--control-height-medium);
        min-width: 0;
        padding: 0;
        border: var(--border-width-control) solid var(--widget-number-outline);
        border-radius: 3px;
        background: var(--widget-number-background);
        box-shadow: 0 1px 0 var(--material-widget-emboss);
        overflow: clip;
      }
      &:hover { background: var(--widget-hover-background); }
      &:focus-within { border-color: var(--widget-focus-outline); background: var(--widget-number-background-focus); }
      &[aria-disabled="true"] { opacity: 0.5; box-shadow: none; }
      ${props.style}
    `}
  >
    <span
      data-number-fill=""
      hidden={fillPercentage === null}
      aria-hidden="true"
      style={css`
        & { position: absolute; left: 0; top: 0; display: block; width: ${fillPercentage ?? 0}%; height: 100%; background: var(--widget-number-fill); }
      `}
    ></span>
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
        & { box-sizing: border-box; position: relative; z-index: 1; display: block; width: 100%; height: 100%; min-width: 0; padding: 2px 7px; border: 0 solid transparent; border-radius: 0; background: transparent; color: var(--widget-number-content); font-size: var(--font-size-xs); line-height: var(--line-height-control); text-align: right; overflow: clip; cursor: ew-resize; }
        &[readonly] { color: var(--widget-number-content-readonly); cursor: default; }
      `}
    />
    <button
      type="button"
      aria-label="Decrease"
      disabled={locked}
      onClick={decrease}
      style={css`
        & { position: absolute; left: 0; top: 0; z-index: 2; display: block; width: 16px; height: 100%; padding: 0; border: 0 solid transparent; background: transparent; color: transparent; box-shadow: none; }
      `}
    ></button>
    <button
      type="button"
      aria-label="Increase"
      disabled={locked}
      onClick={increase}
      style={css`
        & { position: absolute; right: 0; top: 0; z-index: 2; display: block; width: 16px; height: 100%; padding: 0; border: 0 solid transparent; background: transparent; color: transparent; box-shadow: none; }
      `}
    ></button>
  </div>
}

/** Returns hard-range visual progress without changing value or soft-range semantics. */
export function numberInputFillPercentage(
  value: number,
  minimum: number | undefined,
  maximum: number | undefined
): number | null {
  if (!Number.isFinite(value) || !Number.isFinite(minimum) || !Number.isFinite(maximum) || maximum! <= minimum!) {
    return null
  }
  return Math.min(100, Math.max(0, (value - minimum!) / (maximum! - minimum!) * 100))
}


/** Keeps controlled text/value normalization independent from pointer-only soft bounds. */
export function normalizeNumberInputValue(
  value: number,
  options: NumberInputValueOptions = {}
): number {
  const minimum = finiteBound(options.min, Number.NEGATIVE_INFINITY)
  const maximum = Math.max(minimum, finiteBound(options.max, Number.POSITIVE_INFINITY))
  const finite = Number.isFinite(value) ? value : finiteBound(options.min, 0)
  const clamped = Math.min(maximum, Math.max(minimum, finite))
  const step = validStep(options.step)
  const stepBase = Number.isFinite(minimum) ? minimum : 0
  const stepped = step === undefined
    ? clamped
    : stepBase + Math.round((clamped - stepBase) / step) * step
  const normalized = Math.min(maximum, Math.max(minimum, stepped))
  return options.numberKind === "integer" ? Math.round(normalized) : rounded(normalized)
}

/** Resolves finite pointer bounds inside the hard range without changing value normalization. */
export function resolveNumberInputSoftRange(
  value: number,
  options: NumberInputValueOptions = {}
): NumberInputSoftRange {
  const hardMin = finiteBound(options.min, Number.NEGATIVE_INFINITY)
  const hardMax = Math.max(hardMin, finiteBound(options.max, Number.POSITIVE_INFINITY))
  const center = normalizeNumberInputValue(value, options)
  const step = numberPointerStep(options)
  const adaptiveSpan = numberPointerAdaptiveSpan(options)
  let minimum = Number.isFinite(options.softMin)
    ? options.softMin!
    : Number.isFinite(hardMin)
      ? hardMin
      : center - adaptiveSpan / 2
  let maximum = Number.isFinite(options.softMax)
    ? options.softMax!
    : Number.isFinite(hardMax)
      ? hardMax
      : center + adaptiveSpan / 2
  if (minimum > maximum) [minimum, maximum] = [maximum, minimum]
  minimum = Math.max(hardMin, minimum)
  maximum = Math.min(hardMax, maximum)
  if (minimum > maximum) minimum = maximum
  if (minimum === maximum) {
    if (maximum + step <= hardMax) maximum += step
    else if (minimum - step >= hardMin) minimum -= step
  }
  return Object.freeze({min: minimum, max: maximum})
}

/** Applies one source-ordered horizontal scrub increment through a frozen soft range. */
export function scrubNumberInputValue(
  value: number,
  deltaX: number,
  distanceX: number,
  options: NumberInputValueOptions = {},
  shift = false,
  ctrl = false
): number {
  const range = resolveNumberInputDragRange(value, options)
  const raw = scrubNumberInputRawValue(value, deltaX, distanceX, range, options, shift)
  const candidate = ctrl ? snapLinearNumberInputValue(raw, range, shift) : raw
  return normalizeNumberInputValue(candidate, options)
}

/** Applies the reference linear Ctrl snap law for the active frozen soft range. */
export function snapLinearNumberInputValue(
  value: number,
  range: NumberInputSoftRange,
  small = false
): number {
  if (!Number.isFinite(value) || value === range.min || value === range.max) return value
  const span = range.max - range.min
  if (!Number.isFinite(span) || span <= 0) return value
  const baseIncrement = span < 2.1 ? 0.1 : span < 21 ? 1 : 10
  const increment = baseIncrement * (small ? 0.1 : 1)
  const snapped = roundHalfAwayFromZero(value / increment) * increment
  return rounded(Math.min(range.max, Math.max(range.min, snapped)))
}

/** Applies one side-button step through the pointer soft range and hard value law. */
export function stepNumberInputValue(
  value: number,
  direction: -1 | 1,
  options: NumberInputValueOptions = {}
): number {
  const range = resolveNumberInputSoftRange(value, options)
  const candidate = normalizeNumberInputValue(value + numberPointerStep(options) * direction, options)
  return direction < 0 ? Math.max(range.min, candidate) : Math.min(range.max, candidate)
}

function scrubNumberInputRawValue(
  value: number,
  deltaX: number,
  distanceX: number,
  range: NumberInputSoftRange,
  options: NumberInputValueOptions,
  shift: boolean
): number {
  const softSpan = range.max - range.min
  if (softSpan <= 0 || !Number.isFinite(deltaX) || !Number.isFinite(distanceX)) {
    return Math.min(range.max, Math.max(range.min, value))
  }
  let divisor = 500
  let scale = 1
  if (options.numberKind === "integer") {
    if (softSpan > 600) divisor = softSpan ** 0.75
    else if (softSpan < 25) divisor = 50
    else if (softSpan < 100) divisor = 100
    if (softSpan > 129) scale = Math.abs(distanceX) / 250
    scale = Math.max(scale, 0.5)
  }
  else if (softSpan > 11) scale = Math.abs(distanceX) / 500
  if (shift) scale /= 10
  return Math.min(range.max, Math.max(range.min, value + (deltaX / divisor) * scale * softSpan))
}

function resolveNumberInputDragRange(
  value: number,
  options: NumberInputValueOptions
): NumberInputSoftRange {
  const range = resolveNumberInputSoftRange(value, options)
  const span = range.max - range.min
  const maximumSpan = numberPointerAdaptiveSpan(options)
  if (span <= maximumSpan) return range
  const center = normalizeNumberInputValue(value, options)
  let minimum = center - maximumSpan / 2
  let maximum = center + maximumSpan / 2
  if (minimum < range.min) {
    minimum = range.min
    maximum = minimum + maximumSpan
  }
  else if (maximum > range.max) {
    maximum = range.max
    minimum = maximum - maximumSpan
  }
  return Object.freeze({min: minimum, max: maximum})
}

function numberPointerStep(options: NumberInputValueOptions): number {
  return validStep(options.step) ?? 0.1
}

function numberPointerAdaptiveSpan(options: NumberInputValueOptions): number {
  return options.numberKind === "integer"
    ? 2000
    : 20_000 * Math.min(numberPointerStep(options), 0.1)
}

function validStep(value: number | undefined): number | undefined {
  return Number.isFinite(value) && value! > 0 ? value : undefined
}

function finiteBound(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? value! : fallback
}

function rounded(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000
}

function roundHalfAwayFromZero(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value)
}

function releaseScrubCapture(active: ActiveScrub | null): void {
  if (active?.target.hasPointerCapture(active.pointerId) === true) {
    active.target.releasePointerCapture(active.pointerId)
  }
}
