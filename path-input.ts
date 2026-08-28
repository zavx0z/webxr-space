import type {Document, Event, HTMLButtonElement, HTMLInputElement, HTMLElement} from "@zavx0z/dom"
import {projectVisualState} from "./internal/dom-state.ts"
import type {PathInputDensity} from "./path-input-component.tsx"

export type PathInputControllerProps = Readonly<{
  value: string
  placeholder?: string | undefined
  disabled?: boolean | undefined
  readOnly?: boolean | undefined
  density?: PathInputDensity | undefined
  title?: string | undefined
  browseTitle?: string | undefined
  className?: string | undefined
  onInput?: ((value: string, event: Event) => void) | undefined
  onChange?: ((value: string, event: Event) => void) | undefined
  onBrowse?: ((event: Event) => void) | undefined
}>
export type PathInputController = Readonly<{element: HTMLElement; refs: Readonly<{root: HTMLElement; input: HTMLInputElement; browseButton: HTMLButtonElement}>; props: PathInputControllerProps; update(props: PathInputControllerProps): void; dispose(): void}>

export const pathInputCss = String.raw`
.ui-path-input { box-sizing: border-box; display: flex; flex-direction: row; min-width: 0; width: 320px; height: 28px; gap: 0; overflow: hidden; border: 1px solid rgb(61 61 61); border-radius: 4px; background: rgb(29 29 29); }
.ui-path-input__input { box-sizing: border-box; display: block; min-width: 0; height: 26px; flex-grow: 1; padding: 3px 7px; border: 0; border-right: 1px solid rgb(61 61 61); border-radius: 0; background: transparent; color: rgb(230 230 230); font-size: 11px; }
.ui-path-input__browse { box-sizing: border-box; display: flex; align-items: center; justify-content: center; width: 30px; height: 26px; padding: 0; border: 0; border-radius: 0; background: rgb(84 84 84); color: rgb(230 230 230); font-size: 12px; }
.ui-path-input__input[data-ui-state="focus"] { background: rgb(34 34 34); }
.ui-path-input__browse[data-ui-state="hover"] { background: rgb(101 101 101); }
.ui-path-input__browse[data-ui-state="active"],
.ui-path-input__browse[data-ui-state="focus"] { background: rgb(71 114 179); }
.ui-path-input--compact { width: 220px; height: 24px; }
.ui-path-input--compact .ui-path-input__input,
.ui-path-input--compact .ui-path-input__browse { height: 22px; }
.ui-path-input [disabled],
.ui-path-input [readonly] { opacity: 0.5; }
`

export function createPathInput(
  document: Document,
  initialProps: PathInputControllerProps
): PathInputController {
  const root = document.createElement("div")
  const input = document.createElement("input")
  const browseButton = document.createElement("button")
  input.type = "text"
  input.className = "ui-path-input__input"
  browseButton.type = "button"
  browseButton.className = "ui-path-input__browse"
  browseButton.appendChild(document.createTextNode("…"))
  root.append(input, browseButton)
  let current = normalize(initialProps)
  let disposed = false
  const blocked = (): boolean => current.disabled === true || current.readOnly === true
  const inputState = projectVisualState(input, blocked)
  const buttonState = projectVisualState(browseButton, blocked)
  const onInput = (event: Event): void => current.onInput?.(input.value, event)
  const onChange = (event: Event): void => current.onChange?.(input.value, event)
  const onBrowse = (event: Event): void => { if (!blocked()) current.onBrowse?.(event) }
  input.addEventListener("input", onInput)
  input.addEventListener("change", onChange)
  browseButton.addEventListener("click", onBrowse)
  const update = (props: PathInputControllerProps): void => {
    if (disposed) throw new Error("PathInput controller is disposed")
    const next = normalize(props)
    current = next
    root.className = ["ui-path-input", `ui-path-input--${next.density}`, next.className ?? ""].filter(Boolean).join(" ")
    root.title = next.title ?? ""
    input.value = next.value
    input.placeholder = next.placeholder ?? ""
    input.disabled = next.disabled === true
    input.readOnly = next.readOnly === true
    input.title = next.title ?? ""
    browseButton.disabled = blocked() || next.onBrowse === undefined
    if (next.onBrowse === undefined) browseButton.setAttribute("hidden", "")
    else browseButton.removeAttribute("hidden")
    browseButton.title = next.browseTitle ?? "Browse"
    inputState.sync()
    buttonState.sync()
  }
  const controller: PathInputController = Object.freeze({
    element: root,
    refs: Object.freeze({root, input, browseButton}),
    get props() { return current },
    update,
    dispose() {
      if (disposed) return
      disposed = true
      input.removeEventListener("input", onInput)
      input.removeEventListener("change", onChange)
      browseButton.removeEventListener("click", onBrowse)
      inputState.dispose()
      buttonState.dispose()
    },
  })
  update(current)
  return controller
}

function normalize(props: PathInputControllerProps): PathInputControllerProps {
  if (typeof props.value !== "string") throw new TypeError("PathInput value must be a string")
  const density = props.density ?? "regular"
  if (density !== "regular" && density !== "compact") throw new Error(`Unknown PathInput density: ${density}`)
  return Object.freeze({...props, density, disabled: props.disabled ?? false, readOnly: props.readOnly ?? false})
}
