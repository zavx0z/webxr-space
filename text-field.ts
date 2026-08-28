import type {Document, Event, HTMLInputElement} from "@zavx0z/dom"
import {resolveWidgetColors, rgba8ToColor, uiTheme} from "./theme.ts"
import {projectVisualState} from "./internal/dom-state.ts"

import type {TextFieldProps, TextFieldType} from "./text-field-component.tsx"
export type TextFieldController = Readonly<{
  element: HTMLInputElement
  refs: Readonly<{input: HTMLInputElement}>
  props: TextFieldProps
  update(props: TextFieldProps): void
  dispose(): void
}>

const colors = resolveWidgetColors("text")
export const textFieldCss = String.raw`
.ui-text-field { box-sizing: border-box; display: block; min-width: 0; height: 28px; padding: 3px 8px; border: 1px solid ${rgba8ToColor(colors.outline)}; border-radius: 4px; background: ${rgba8ToColor(colors.inner)}; box-shadow: 0 1px 0 ${rgba8ToColor(uiTheme.material.widgetEmboss)}; color: ${rgba8ToColor(colors.text)}; font-size: 12px; }
.ui-text-field[data-ui-state="hover"] { border-color: rgb(89 89 89); }
.ui-text-field[data-ui-state="focus"] { border-color: rgb(113 168 255); }
.ui-text-field[readonly] { background: rgb(40 40 40); color: rgb(153 153 153); }
.ui-text-field[disabled] { opacity: 0.5; box-shadow: none; }
`

export function createTextField(document: Document, initialProps: TextFieldProps): TextFieldController {
  const input = document.createElement("input")
  let current = normalize(initialProps)
  let disposed = false
  const visualState = projectVisualState(input, () => current.disabled === true)
  const onInput = (event: Event): void => current.onInput?.(input.value, event)
  const onChange = (event: Event): void => current.onChange?.(input.value, event)
  input.addEventListener("input", onInput)
  input.addEventListener("change", onChange)

  const update = (props: TextFieldProps): void => {
    if (disposed) throw new Error("TextField controller is disposed")
    const next = normalize(props)
    input.className = "ui-text-field"
    input.type = next.type ?? "text"
    input.value = next.value
    input.placeholder = next.placeholder ?? ""
    input.disabled = next.disabled === true
    input.readOnly = next.readOnly === true
    input.title = next.title ?? ""
    current = next
    visualState.sync()
  }
  const controller: TextFieldController = Object.freeze({
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

function normalize(props: TextFieldProps): TextFieldProps {
  if (typeof props.value !== "string") throw new TypeError("TextField value must be a string")
  const type = props.type ?? "text"
  if (!["text", "search", "password", "email", "url"].includes(type)) throw new Error(`Unknown TextField type: ${type}`)
  if (props.disabled !== undefined && typeof props.disabled !== "boolean") throw new TypeError("TextField disabled must be a boolean")
  if (props.readOnly !== undefined && typeof props.readOnly !== "boolean") throw new TypeError("TextField readOnly must be a boolean")
  return Object.freeze({...props, type, disabled: props.disabled ?? false, readOnly: props.readOnly ?? false})
}
