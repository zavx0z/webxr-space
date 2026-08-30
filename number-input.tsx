import type {
  Event,
  HTMLInputElement,
  KeyboardEvent,
  PointerEvent
} from "@zavx0z/dom"
import {useRef} from "@zavx0z/react"
import {IconButton} from "./button.tsx"
import {minusIcon, plusIcon} from "./icon-assets.ts"

export type NumberInputProps = Readonly<{
  value: number
  min?: number | undefined
  max?: number | undefined
  softMin?: number | undefined
  softMax?: number | undefined
  step?: number | undefined
  disabled?: boolean | undefined
  readOnly?: boolean | undefined
  title?: string | undefined
  decrementTitle?: string | undefined
  incrementTitle?: string | undefined
  style?: CssStyle | undefined
  onInput?: ((value: number, event: Event) => void) | undefined
  onChange?: ((value: number, event: Event) => void) | undefined
}>

type ScrubState = Readonly<{startX: number; startValue: number}>

const stepButtonStyle: CssStyle = css`
  & { width: 18px; min-width: 18px; height: 20px; padding: 2px; border: none; border-radius: 0; background: transparent; box-shadow: none; }
`

export function NumberInput(props: NumberInputProps) {
  const scrub = useRef<ScrubState | null>(null)
  const editBaseline = useRef(props.value)
  const step = props.step ?? 0.1
  const locked = props.disabled === true || props.readOnly === true

  const propose = (value: number, event: Event) => {
    if (!locked && Number.isFinite(value)) props.onInput?.(normalizeValue(value, props), event)
  }
  const onInput = (event: Event) => {
    const value = (event.target as HTMLInputElement).valueAsNumber
    if (Number.isFinite(value)) propose(value, event)
  }
  const onChange = (event: Event) => {
    const value = (event.target as HTMLInputElement).valueAsNumber
    if (!locked && Number.isFinite(value)) props.onChange?.(normalizeValue(value, props), event)
  }
  const onFocus = () => {
    editBaseline.current = props.value
  }
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape" || locked) return
    event.preventDefault()
    props.onInput?.(editBaseline.current, event)
  }
  const onPointerDown = (event: PointerEvent) => {
    if (locked) return
    scrub.current = Object.freeze({startX: event.clientX, startValue: props.value})
  }
  const onPointerMove = (event: PointerEvent) => {
    const active = scrub.current
    if (!active || locked) return
    const precision = event.shiftKey ? 0.1 : 1
    let value = active.startValue + (event.clientX - active.startX) * step * precision / 4
    if (event.ctrlKey) value = Math.round(value / step) * step
    propose(value, event)
  }
  const endScrub = () => {
    scrub.current = null
  }
  const decrease = (event: Event) => propose(props.value - step, event)
  const increase = (event: Event) => propose(props.value + step, event)

  return <div
    title={props.title}
    aria-disabled={String(props.disabled === true)}
    style={css`
        & {
          box-sizing: border-box;
          display: flex;
          flex-direction: row;
          align-items: center;
          width: 120px;
          height: var(--control-height-medium);
          gap: 0;
          padding: 0;
          border: var(--border-width-control) solid var(--widget-number-outline);
          border-radius: 3px;
          background: var(--widget-number-background);
          box-shadow: 0 1px 0 var(--material-widget-emboss);
          overflow: clip;
        }
        &:focus-within { border-color: var(--widget-focus-outline); }
        &[aria-disabled="true"] { opacity: 0.5; box-shadow: none; }
        ${props.style}
      `}
  >
    <IconButton
      label="Decrease"
      iconSrc={minusIcon}
      title={props.decrementTitle ?? "Decrease"}
      disabled={locked}
      style={stepButtonStyle}
      onClick={decrease}
    />
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
      onPointerCancel={endScrub}
      style={css`
          & {
            box-sizing: border-box;
            display: block;
            width: 82px;
            height: 20px;
            min-width: 0;
            padding: 2px 4px;
            border: none;
            border-radius: 0;
            background: transparent;
            color: var(--widget-number-content);
            font-size: var(--font-size-xs);
            line-height: var(--line-height-control);
            text-align: right;
            overflow: clip;
          }
          &:hover { background: var(--widget-hover-background); }
          &:focus { background: var(--widget-number-background-focus); }
        &[readonly] {
            background: var(--widget-number-background-readonly);
            color: var(--widget-number-content-readonly);
        }
      `}
    />
    <IconButton
      label="Increase"
      iconSrc={plusIcon}
      title={props.incrementTitle ?? "Increase"}
      disabled={locked}
      style={stepButtonStyle}
      onClick={increase}
    />
  </div>
}


function normalizeValue(value: number, props: NumberInputProps): number {
  const hardMin = props.min ?? Number.NEGATIVE_INFINITY
  const hardMax = props.max ?? Number.POSITIVE_INFINITY
  const softMin = props.softMin ?? hardMin
  const softMax = props.softMax ?? hardMax
  const minimum = Math.max(hardMin, softMin)
  const maximum = Math.min(hardMax, softMax)
  const clamped = Math.min(maximum, Math.max(minimum, value))
  const precision = decimalPlaces(props.step ?? 0.1)
  return Number(clamped.toFixed(Math.min(12, precision + 2)))
}

function decimalPlaces(value: number): number {
  const source = String(value)
  const exponent = /e-(\d+)$/i.exec(source)?.[1]
  if (exponent !== undefined) return Number(exponent)
  return source.includes(".") ? source.length - source.indexOf(".") - 1 : 0
}
