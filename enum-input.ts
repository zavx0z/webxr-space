import type {Document, Event, HTMLSelectElement, HTMLOptionElement, Text} from "@zavx0z/dom"
import {projectVisualState} from "./internal/dom-state.ts"
import {rgba8ToColor, uiTheme} from "./theme.ts"

import type {EnumInputOption, EnumInputProps} from "./enum-input-component.tsx"
export type EnumInputController = Readonly<{element: HTMLSelectElement; refs: Readonly<{select: HTMLSelectElement; options: ReadonlyMap<string, HTMLOptionElement>}>; props: EnumInputProps; update(props: EnumInputProps): void; dispose(): void}>

export const enumInputCss = String.raw`
.ui-enum-input { box-sizing: border-box; display: block; min-width: 0; width: 180px; height: 28px; padding: 3px 8px; border: 1px solid rgb(61 61 61); border-radius: 4px; background: rgb(84 84 84); box-shadow: 0 1px 0 ${rgba8ToColor(uiTheme.material.widgetEmboss)}; color: rgb(230 230 230); font-size: 12px; }
.ui-enum-input[data-ui-state="hover"] { background: rgb(101 101 101); }
.ui-enum-input[data-ui-state="active"],
.ui-enum-input[data-ui-state="focus"] { border-color: rgb(113 168 255); background: rgb(34 34 34); }
.ui-enum-input[disabled] { opacity: 0.5; box-shadow: none; }
`

type Entry = {element: HTMLOptionElement; text: Text}

export function createEnumInput(document: Document, initialProps: EnumInputProps): EnumInputController {
  const select = document.createElement("select")
  const entries = new Map<string, Entry>()
  const options = new Map<string, HTMLOptionElement>()
  let current = normalize(initialProps)
  let disposed = false
  const visualState = projectVisualState(select, () => current.disabled === true)
  const listener = (event: Event): void => current.onChange?.(select.value, event)
  select.addEventListener("change", listener)
  const update = (props: EnumInputProps): void => {
    if (disposed) throw new Error("EnumInput controller is disposed")
    const next = normalize(props)
    const retained = new Set(next.options.map(({key}) => key))
    for (const [key, entry] of entries) {
      if (retained.has(key)) continue
      entry.element.remove()
      entries.delete(key)
      options.delete(key)
    }
    const ordered: HTMLOptionElement[] = []
    for (const option of next.options) {
      let entry = entries.get(option.key)
      if (entry === undefined) {
        const element = document.createElement("option")
        const text = document.createTextNode("")
        element.setAttribute("data-option-key", option.key)
        element.appendChild(text)
        entry = {element, text}
        entries.set(option.key, entry)
        options.set(option.key, element)
      }
      entry.element.value = option.value
      entry.element.disabled = option.disabled === true
      entry.element.title = option.title ?? ""
      if (entry.text.data !== option.label) entry.text.data = option.label
      ordered.push(entry.element)
    }
    select.replaceChildren(...ordered)
    select.value = next.value
    select.disabled = next.disabled === true
    select.title = next.title ?? ""
    select.className = "ui-enum-input"
    current = Object.freeze({...next, value: select.value})
    visualState.sync()
  }
  const controller: EnumInputController = Object.freeze({
    element: select,
    refs: Object.freeze({select, options}),
    get props() { return current },
    update,
    dispose() {
      if (disposed) return
      disposed = true
      select.removeEventListener("change", listener)
      visualState.dispose()
    },
  })
  update(current)
  return controller
}

function normalize(props: EnumInputProps): EnumInputProps {
  if (typeof props.value !== "string") throw new TypeError("EnumInput value must be a string")
  if (!Array.isArray(props.options) || props.options.length === 0) throw new TypeError("EnumInput options must be a non-empty array")
  const keys = new Set<string>()
  const values = new Set<string>()
  const options = props.options.map((option) => {
    if (typeof option.key !== "string" || option.key.length === 0) throw new TypeError("EnumInput option key must not be empty")
    if (keys.has(option.key)) throw new Error(`EnumInput option key must be unique: ${option.key}`)
    keys.add(option.key)
    if (typeof option.value !== "string" || typeof option.label !== "string") throw new TypeError("EnumInput option value and label must be strings")
    if (values.has(option.value)) throw new Error(`EnumInput option value must be unique: ${option.value}`)
    values.add(option.value)
    return Object.freeze({...option, disabled: option.disabled ?? false})
  })
  if (!values.has(props.value)) throw new Error(`EnumInput value has no option: ${props.value}`)
  return Object.freeze({...props, options: Object.freeze(options), disabled: props.disabled ?? false})
}
