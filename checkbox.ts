import type {Document, Event, HTMLInputElement} from "@zavx0z/dom"
import {resolveWidgetColors, rgba8ToColor, uiTheme} from "./theme.ts"
import {projectVisualState} from "./internal/dom-state.ts"

import type {CheckboxProps} from "./checkbox-component.tsx"
export type CheckboxController = Readonly<{element: HTMLInputElement; refs: Readonly<{input: HTMLInputElement}>; props: CheckboxProps; update(props: CheckboxProps): void; dispose(): void}>

const option = resolveWidgetColors("option")
const checked = resolveWidgetColors("option", {selected: true})
export const checkboxCss = String.raw`
.ui-checkbox { box-sizing: border-box; display: block; width: 18px; height: 18px; padding: 0; border: 1px solid ${rgba8ToColor(option.outline)}; border-radius: 3px; background: ${rgba8ToColor(option.inner)}; box-shadow: 0 1px 0 ${rgba8ToColor(uiTheme.material.widgetEmboss)}; color: ${rgba8ToColor(option.item)}; }
.ui-checkbox[aria-checked="true"],
.ui-checkbox[aria-checked="mixed"] { background: ${rgba8ToColor(checked.inner)}; color: ${rgba8ToColor(checked.text)}; }
.ui-checkbox[data-ui-state="hover"] { border-color: rgb(101 101 101); }
.ui-checkbox[data-ui-state="focus"] { border-color: rgb(113 168 255); }
.ui-checkbox[disabled] { opacity: 0.5; box-shadow: none; }
`

export function createCheckbox(document: Document, initialProps: CheckboxProps): CheckboxController {
  const input = document.createElement("input")
  input.type = "checkbox"
  let current = normalize(initialProps)
  let disposed = false
  const visualState = projectVisualState(input, () => current.disabled === true)
  const listener = (event: Event): void => {
    input.setAttribute("aria-checked", input.indeterminate ? "mixed" : String(input.checked))
    current.onChange?.(input.checked, event)
  }
  input.addEventListener("change", listener)
  const update = (props: CheckboxProps): void => {
    if (disposed) throw new Error("Checkbox controller is disposed")
    const next = normalize(props)
    input.className = "ui-checkbox"
    input.checked = next.checked
    input.indeterminate = next.indeterminate === true
    input.disabled = next.disabled === true
    input.title = next.title ?? ""
    input.setAttribute("aria-checked", input.indeterminate ? "mixed" : String(input.checked))
    current = next
    visualState.sync()
  }
  const controller: CheckboxController = Object.freeze({
    element: input,
    refs: Object.freeze({input}),
    get props() { return current },
    update,
    dispose() {
      if (disposed) return
      disposed = true
      input.removeEventListener("change", listener)
      visualState.dispose()
    },
  })
  update(current)
  return controller
}

function normalize(props: CheckboxProps): CheckboxProps {
  if (typeof props.checked !== "boolean") throw new TypeError("Checkbox checked must be a boolean")
  if (props.indeterminate !== undefined && typeof props.indeterminate !== "boolean") throw new TypeError("Checkbox indeterminate must be a boolean")
  if (props.disabled !== undefined && typeof props.disabled !== "boolean") throw new TypeError("Checkbox disabled must be a boolean")
  return Object.freeze({...props, indeterminate: props.indeterminate ?? false, disabled: props.disabled ?? false})
}
