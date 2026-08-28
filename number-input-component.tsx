import type {
  Event,
  HTMLInputElement,
  KeyboardEvent,
  PointerEvent
} from "@zavx0z/dom"
import {defineStyles, useRef, type FunctionComponent, type StyleValue} from "@zavx0z/react"
import {IconButton} from "./button-component.tsx"
import {uiIcons} from "./icons.ts"
import {resolveWidgetColors, rgba8ToColor, uiTheme} from "./theme.ts"

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
  style?: StyleValue
  onInput?: ((value: number, event: Event) => void) | undefined
  onChange?: ((value: number, event: Event) => void) | undefined
}>

type ScrubState = Readonly<{startX: number; startValue: number}>

const colors = resolveWidgetColors("number")

export const numberInputStyles = defineStyles("@ui/components/number-input", {
  root: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    width: 120,
    height: 22,
    gap: 0,
    padding: 0,
    border: `1px solid ${rgba8ToColor(colors.outline)}`,
    borderRadius: 3,
    background: rgba8ToColor(colors.inner),
    boxShadow: `0 1px 0 ${rgba8ToColor(uiTheme.material.widgetEmboss)}`,
    overflow: "clip",
    ":focus-within": {borderColor: "rgb(113 168 255)"}
  },
  input: {
    boxSizing: "border-box",
    display: "block",
    width: 82,
    height: 20,
    minWidth: 0,
    padding: "2px 4px",
    border: "none",
    borderRadius: 0,
    background: "transparent",
    color: rgba8ToColor(colors.text),
    fontSize: 11,
    lineHeight: 1,
    textAlign: "right",
    overflow: "clip",
    ":hover": {background: "rgb(101 101 101)"},
    ":focus": {background: "rgb(34 34 34)"}
  },
  disabled: {opacity: 0.5, boxShadow: "none"},
  readOnly: {background: "rgb(48 48 48)", color: "rgb(153 153 153)"}
})

export const numberInputComponentCss = numberInputStyles.cssText

const stepButtonStyle: StyleValue = Object.freeze({
  width: 18,
  minWidth: 18,
  height: 20,
  padding: 2,
  border: "none",
  borderRadius: 0,
  background: "transparent",
  boxShadow: "none"
})

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
    style={[
      numberInputStyles.root,
      props.disabled === true && numberInputStyles.disabled,
      props.style
    ]}
  >
    <IconButton
      label="Decrease"
      iconSrc={uiIcons.minus}
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
      style={[
        numberInputStyles.input,
        props.readOnly === true && numberInputStyles.readOnly
      ]}
    />
    <IconButton
      label="Increase"
      iconSrc={uiIcons.plus}
      title={props.incrementTitle ?? "Increase"}
      disabled={locked}
      style={stepButtonStyle}
      onClick={increase}
    />
  </div>
}

export type NumberInputComponent = FunctionComponent<NumberInputProps>

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

export * from "./number-input.ts"
