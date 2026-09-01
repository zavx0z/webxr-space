import type {Event, HTMLInputElement} from "@zavx0z/dom"

export type SliderControlProps = Readonly<{
  value: number
  min: number
  max: number
  step?: number | undefined
  disabled?: boolean | undefined
  title?: string | undefined
  style?: CssStyle | undefined
  onInput?: ((value: number, event: Event) => void) | undefined
  onChange?: ((value: number, event: Event) => void) | undefined
}>

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
    style={css`
        & {
          box-sizing: border-box;
          display: block;
          width: 180px;
          height: var(--control-height-large);
          padding: 3px 6px;
          border: var(--border-width-control) solid var(--widget-regular-outline);
          border-radius: 4px;
          background: var(--widget-regular-background);
          box-shadow: 0 1px 0 var(--material-widget-emboss);
          color: var(--widget-regular-background-selected);
        }
        &:hover { background: var(--widget-hover-background); }
        &:active { background: var(--widget-active-background); }
        &:focus { border-color: var(--widget-focus-outline); }
        &:disabled { opacity: 0.5; box-shadow: none; }
        ${props.style}
      `}
  />
}


function validateSlider(props: SliderControlProps): number {
  if (![props.value, props.min, props.max].every(Number.isFinite)) {
    throw new TypeError("SliderControl values must be finite")
  }
  if (props.min >= props.max) throw new RangeError("SliderControl min must be less than max")
  const step = props.step ?? 0.1
  if (!Number.isFinite(step) || step <= 0) throw new RangeError("SliderControl step must be positive")
  return step
}
