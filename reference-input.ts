import type {Document, Event, HTMLButtonElement, HTMLElement, Text} from "@zavx0z/dom"
import {projectVisualState} from "./internal/dom-state.ts"
import type {
  ReferenceInputDensity,
  ReferenceInputValue
} from "./reference-input-component.tsx"

export type ReferenceInputControllerProps = Readonly<{
  value: ReferenceInputValue | null
  placeholder?: string | undefined
  title?: string | undefined
  disabled?: boolean | undefined
  readOnly?: boolean | undefined
  density?: ReferenceInputDensity | undefined
  className?: string | undefined
  onActivate?: ((event: Event) => void) | undefined
  onPick?: ((event: Event) => void) | undefined
  onClear?: ((event: Event) => void) | undefined
}>
export type ReferenceInputController = Readonly<{
  element: HTMLElement
  refs: Readonly<{root: HTMLElement; valueButton: HTMLButtonElement; valueText: Text; pickButton: HTMLButtonElement; clearButton: HTMLButtonElement}>
  props: ReferenceInputControllerProps
  update(props: ReferenceInputControllerProps): void
  dispose(): void
}>

export const referenceInputCss = String.raw`
.ui-reference-input { box-sizing: border-box; display: flex; flex-direction: row; min-width: 0; width: 260px; height: 28px; gap: 0; overflow: hidden; border: 1px solid rgb(61 61 61); border-radius: 4px; background: rgb(84 84 84); }
.ui-reference-input__value,
.ui-reference-input__action { box-sizing: border-box; display: flex; align-items: center; height: 26px; padding: 3px 7px; border: 0; border-right: 1px solid rgb(61 61 61); border-radius: 0; background: transparent; color: rgb(230 230 230); font-size: 11px; }
.ui-reference-input__value { min-width: 0; flex-grow: 1; justify-content: flex-start; }
.ui-reference-input__action { width: 28px; justify-content: center; }
.ui-reference-input__action[data-action="clear"] { border-right: 0; }
.ui-reference-input button[data-ui-state="hover"] { background: rgb(101 101 101); }
.ui-reference-input button[data-ui-state="active"],
.ui-reference-input button[data-ui-state="focus"] { background: rgb(71 114 179); }
.ui-reference-input--compact { width: 190px; height: 24px; }
.ui-reference-input--compact button { height: 22px; }
.ui-reference-input [hidden] { display: none; }
.ui-reference-input button[disabled] { opacity: 0.5; }
`

export function createReferenceInput(
  document: Document,
  initialProps: ReferenceInputControllerProps
): ReferenceInputController {
  const root = document.createElement("div")
  const valueButton = document.createElement("button")
  const valueText = document.createTextNode("")
  const pickButton = document.createElement("button")
  const clearButton = document.createElement("button")
  valueButton.type = "button"
  pickButton.type = "button"
  clearButton.type = "button"
  valueButton.className = "ui-reference-input__value"
  pickButton.className = "ui-reference-input__action"
  clearButton.className = "ui-reference-input__action"
  pickButton.setAttribute("data-action", "pick")
  clearButton.setAttribute("data-action", "clear")
  valueButton.appendChild(valueText)
  pickButton.appendChild(document.createTextNode("…"))
  clearButton.appendChild(document.createTextNode("×"))
  root.append(valueButton, pickButton, clearButton)
  let current = normalize(initialProps)
  let disposed = false
  const blocked = (): boolean => current.disabled === true || current.readOnly === true
  const valueState = projectVisualState(valueButton, blocked)
  const pickState = projectVisualState(pickButton, blocked)
  const clearState = projectVisualState(clearButton, blocked)
  const activate = (event: Event): void => { if (!blocked()) current.onActivate?.(event) }
  const pick = (event: Event): void => { if (!blocked()) current.onPick?.(event) }
  const clear = (event: Event): void => { if (!blocked() && current.value !== null) current.onClear?.(event) }
  valueButton.addEventListener("click", activate)
  pickButton.addEventListener("click", pick)
  clearButton.addEventListener("click", clear)
  const update = (props: ReferenceInputControllerProps): void => {
    if (disposed) throw new Error("ReferenceInput controller is disposed")
    const next = normalize(props)
    current = next
    root.className = ["ui-reference-input", `ui-reference-input--${next.density}`, next.className ?? ""].filter(Boolean).join(" ")
    root.title = next.title ?? next.value?.kind ?? ""
    const isBlocked = blocked()
    valueButton.disabled = isBlocked || next.onActivate === undefined
    pickButton.disabled = isBlocked || next.onPick === undefined
    clearButton.disabled = isBlocked || next.value === null || next.onClear === undefined
    syncHidden(pickButton, next.onPick === undefined)
    syncHidden(clearButton, next.value === null || next.onClear === undefined)
    valueButton.title = next.value?.kind ?? next.title ?? ""
    pickButton.title = "Choose reference"
    clearButton.title = "Clear reference"
    const label = next.value?.label ?? next.placeholder ?? "Not selected"
    if (valueText.data !== label) valueText.data = label
    valueState.sync()
    pickState.sync()
    clearState.sync()
  }
  const controller: ReferenceInputController = Object.freeze({
    element: root,
    refs: Object.freeze({root, valueButton, valueText, pickButton, clearButton}),
    get props() { return current },
    update,
    dispose() {
      if (disposed) return
      disposed = true
      valueButton.removeEventListener("click", activate)
      pickButton.removeEventListener("click", pick)
      clearButton.removeEventListener("click", clear)
      valueState.dispose()
      pickState.dispose()
      clearState.dispose()
    },
  })
  update(current)
  return controller
}

function syncHidden(element: HTMLElement, hidden: boolean): void {
  if (hidden) element.setAttribute("hidden", "")
  else element.removeAttribute("hidden")
}

function normalize(props: ReferenceInputControllerProps): ReferenceInputControllerProps {
  if (props.value !== null) {
    if (typeof props.value.id !== "string" || props.value.id.length === 0) throw new TypeError("ReferenceInput value id must not be empty")
    if (typeof props.value.label !== "string") throw new TypeError("ReferenceInput value label must be a string")
  }
  const density = props.density ?? "regular"
  if (density !== "regular" && density !== "compact") throw new Error(`Unknown ReferenceInput density: ${density}`)
  return Object.freeze({...props, value: props.value === null ? null : Object.freeze({...props.value}), density, disabled: props.disabled ?? false, readOnly: props.readOnly ?? false})
}
