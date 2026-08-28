import type {Document, Event, HTMLInputElement} from "@zavx0z/dom"
import {projectVisualState} from "./internal/dom-state.ts"
import {rgba8ToColor, uiTheme} from "./theme.ts"

import type {SwitcherProps} from "./switcher-component.tsx"

export type SwitcherController = Readonly<{element: HTMLInputElement; refs: Readonly<{input: HTMLInputElement}>; props: SwitcherProps; update(props: SwitcherProps): void; dispose(): void}>

export const switcherCss = String.raw`
.ui-switcher { box-sizing: border-box; display: block; width: 32px; height: 18px; padding: 2px; border: 1px solid rgb(61 61 61); border-radius: 4px; background: rgb(84 84 84); box-shadow: 0 1px 0 ${rgba8ToColor(uiTheme.material.widgetEmboss)}; color: rgb(230 230 230); }
.ui-switcher[aria-checked="true"] { background: rgb(71 114 179); }
.ui-switcher[data-ui-state="hover"] { border-color: rgb(101 101 101); }
.ui-switcher[data-ui-state="focus"] { border-color: rgb(113 168 255); }
.ui-switcher[disabled] { opacity: 0.5; box-shadow: none; }
`

export function createSwitcher(document: Document, initialProps: SwitcherProps): SwitcherController {
  const input = document.createElement("input")
  input.type = "checkbox"
  input.setAttribute("role", "switch")
  let current = normalize(initialProps)
  let disposed = false
  const visualState = projectVisualState(input, () => current.disabled === true)
  const listener = (event: Event): void => {
    input.setAttribute("aria-checked", String(input.checked))
    current.onChange?.(input.checked, event)
  }
  input.addEventListener("change", listener)
  const update = (props: SwitcherProps): void => {
    if (disposed) throw new Error("Switcher controller is disposed")
    const next = normalize(props)
    input.className = "ui-switcher"
    input.checked = next.checked
    input.disabled = next.disabled === true
    input.title = next.title ?? ""
    input.setAttribute("aria-checked", String(input.checked))
    current = next
    visualState.sync()
  }
  const controller: SwitcherController = Object.freeze({
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

function normalize(props: SwitcherProps): SwitcherProps {
  if (typeof props.checked !== "boolean") throw new TypeError("Switcher checked must be a boolean")
  if (props.disabled !== undefined && typeof props.disabled !== "boolean") throw new TypeError("Switcher disabled must be a boolean")
  return Object.freeze({...props, disabled: props.disabled ?? false})
}
