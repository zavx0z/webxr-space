import type {Event, HTMLInputElement} from "@zavx0z/dom"

export type SliderFieldProps = Readonly<{
  label?: string | undefined
  value: number
  min: number
  max: number
  step?: number | undefined
  disabled?: boolean | undefined
  readOnly?: boolean | undefined
  title?: string | undefined
  style?: CssStyle | undefined
  onInput?: ((value: number, event: Event) => void) | undefined
  onChange?: ((value: number, event: Event) => void) | undefined
}>

export function SliderField(props: SliderFieldProps) {
  const step = validateSliderField(props)
  const hasLabel = props.label !== undefined
  const readValue = (event: Event): number => (event.target as HTMLInputElement).valueAsNumber
  const restore = (event: Event): void => {
    (event.target as HTMLInputElement).valueAsNumber = props.value
  }
  const onInput = (event: Event) => {
    if (props.readOnly === true) return restore(event)
    props.onInput?.(readValue(event), event)
  }
  const onChange = (event: Event) => {
    if (props.readOnly === true) return restore(event)
    props.onChange?.(readValue(event), event)
  }
  return <label
    data-has-label={hasLabel ? "true" : undefined}
    title={props.title}
    style={css`
      & { box-sizing: border-box; display: flex; flex-direction: row; align-items: flex-start; width: auto; min-width: 0; padding: 0; color: var(--widget-list-content); }
      &[data-has-label="true"] { width: 100%; min-height: 28px; gap: 4px; }
      ${props.style}
    `}
  >
    <span hidden={!hasLabel} style={css`
      & { box-sizing: border-box; display: flex; align-items: center; width: 40%; min-width: 0; height: 28px; color: var(--widget-list-content); font-size: var(--font-size-sm); }
      &[hidden] { display: none; }
    `}>{props.label ?? ""}</span>
    <input
      data-slider-field-value=""
      data-labelled={hasLabel ? "true" : undefined}
      data-readonly={props.readOnly === true ? "true" : undefined}
      type="range"
      min={props.min}
      max={props.max}
      step={step}
      value={props.value}
      disabled={props.disabled === true}
      onInput={onInput}
      onChange={onChange}
      style={css`
        & { box-sizing: border-box; display: block; width: var(--slider-field-width, 180px); height: var(--slider-field-height, var(--control-height-large)); padding: var(--slider-field-padding, 3px 6px); border: var(--border-width-control) solid var(--widget-regular-outline); border-radius: 4px; background: var(--widget-regular-background); box-shadow: 0 1px 0 var(--material-widget-emboss); color: var(--widget-regular-background-selected); }
        &[data-labelled="true"] { width: 0; flex-grow: 1; }
        &:hover { background: var(--widget-hover-background); }
        &:active { background: var(--widget-active-background); }
        &:focus { border-color: var(--widget-focus-outline); }
        &:disabled { opacity: 0.5; box-shadow: none; }
        &[data-readonly="true"] { color: var(--widget-text-content-readonly); }
      `}
    />
  </label>
}

function validateSliderField(props: SliderFieldProps): number {
  if (![props.value, props.min, props.max].every(Number.isFinite)) {
    throw new TypeError("SliderField values must be finite")
  }
  if (props.min >= props.max) throw new RangeError("SliderField min must be less than max")
  const step = props.step ?? 0.1
  if (!Number.isFinite(step) || step <= 0) throw new RangeError("SliderField step must be positive")
  return step
}
