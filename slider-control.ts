import type {Document, Event, HTMLInputElement} from "@zavx0z/dom"
import {projectVisualState} from "./internal/dom-state.ts"
import {rgba8ToColor, uiTheme} from "./theme.ts"

import type {SliderControlProps} from "./slider-control-component.tsx"
export type SliderControlController = Readonly<{element: HTMLInputElement; refs: Readonly<{input: HTMLInputElement}>; props: SliderControlProps; update(props: SliderControlProps): void; dispose(): void}>

export const sliderControlCss = String.raw`
.ui-slider-control { box-sizing: border-box; display: block; width: 180px; height: 28px; padding: 3px 6px; border: 1px solid rgb(61 61 61); border-radius: 4px; background: rgb(84 84 84); box-shadow: 0 1px 0 ${rgba8ToColor(uiTheme.material.widgetEmboss)}; color: rgb(71 114 179); }
.ui-slider-control[data-ui-state="hover"] { background: rgb(101 101 101); }
.ui-slider-control[data-ui-state="active"] { background: rgb(71 114 179); }
.ui-slider-control[data-ui-state="focus"] { border-color: rgb(113 168 255); }
.ui-slider-control[disabled] { opacity: 0.5; box-shadow: none; }
`

export function createSliderControl(document: Document, initialProps: SliderControlProps): SliderControlController {
  const input = document.createElement("input")
  input.type = "range"
  let current = normalize(initialProps)
  let disposed = false
  const visualState = projectVisualState(input, () => current.disabled === true)
  const onInput = (event: Event): void => current.onInput?.(input.valueAsNumber, event)
  const onChange = (event: Event): void => current.onChange?.(input.valueAsNumber, event)
  input.addEventListener("input", onInput)
  input.addEventListener("change", onChange)
  const update = (props: SliderControlProps): void => {
    if (disposed) throw new Error("SliderControl controller is disposed")
    const next = normalize(props)
    input.className = "ui-slider-control"
    input.min = String(next.min)
    input.max = String(next.max)
    input.step = String(next.step)
    input.valueAsNumber = next.value
    input.disabled = next.disabled === true
    input.title = next.title ?? ""
    current = Object.freeze({...next, value: input.valueAsNumber})
    visualState.sync()
  }
  const controller: SliderControlController = Object.freeze({
    element: input,
    refs: Object.freeze({input}),
    get props() { return current },
    update,
    dispose() {
      if (disposed) return
      disposed = true
      input.removeEventListener("input", onInput)
      input.removeEventListener("change", onChange)
      visualState.dispose()
    },
  })
  update(current)
  return controller
}

function normalize(props: SliderControlProps): SliderControlProps {
  if (![props.value, props.min, props.max].every(Number.isFinite)) throw new TypeError("SliderControl values must be finite")
  if (props.min >= props.max) throw new RangeError("SliderControl min must be less than max")
  const step = props.step ?? 0.1
  if (!Number.isFinite(step) || step <= 0) throw new RangeError("SliderControl step must be positive")
  return Object.freeze({...props, step, disabled: props.disabled ?? false})
}
