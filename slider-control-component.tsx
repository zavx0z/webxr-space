import type {Event, HTMLInputElement} from "@zavx0z/dom"
import {defineStyles, type FunctionComponent, type StyleValue} from "@zavx0z/react"
import {rgba8ToColor, uiTheme} from "./theme.ts"

export type SliderControlProps = Readonly<{
  value: number
  min: number
  max: number
  step?: number | undefined
  disabled?: boolean | undefined
  title?: string | undefined
  style?: StyleValue
  onInput?: ((value: number, event: Event) => void) | undefined
  onChange?: ((value: number, event: Event) => void) | undefined
}>

export const sliderControlStyles = defineStyles("@ui/components/slider-control", {
  root: {
    boxSizing: "border-box",
    display: "block",
    width: 180,
    height: 28,
    padding: "3px 6px",
    border: "1px solid rgb(61 61 61)",
    borderRadius: 4,
    background: "rgb(84 84 84)",
    boxShadow: `0 1px 0 ${rgba8ToColor(uiTheme.material.widgetEmboss)}`,
    color: "rgb(71 114 179)",
    ":hover": {background: "rgb(101 101 101)"},
    ":active": {background: "rgb(71 114 179)"},
    ":focus": {borderColor: "rgb(113 168 255)"},
    ":disabled": {opacity: 0.5, boxShadow: "none"}
  }
})

export const sliderControlComponentCss = sliderControlStyles.cssText

export function SliderControl(props: SliderControlProps) {
  const step = validateSlider(props)
  const onInput = (event: Event) => props.onInput?.(
    (event.target as HTMLInputElement).valueAsNumber,
    event
  )
  const onChange = (event: Event) => props.onChange?.(
    (event.target as HTMLInputElement).valueAsNumber,
    event
  )
  return <input
    type="range"
    min={props.min}
    max={props.max}
    step={step}
    value={props.value}
    disabled={props.disabled === true}
    title={props.title}
    onInput={onInput}
    onChange={onChange}
    style={[sliderControlStyles.root, props.style]}
  />
}

export type SliderControlComponent = FunctionComponent<SliderControlProps>

function validateSlider(props: SliderControlProps): number {
  if (![props.value, props.min, props.max].every(Number.isFinite)) {
    throw new TypeError("SliderControl values must be finite")
  }
  if (props.min >= props.max) throw new RangeError("SliderControl min must be less than max")
  const step = props.step ?? 0.1
  if (!Number.isFinite(step) || step <= 0) throw new RangeError("SliderControl step must be positive")
  return step
}

export * from "./slider-control.ts"
