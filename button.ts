import type {Document, Event, HTMLButtonElement, Text} from "@zavx0z/dom"
import {resolveWidgetColors, rgba8ToColor, uiTheme} from "./theme.ts"
import {projectVisualState} from "./internal/dom-state.ts"
import type {
  ButtonProps,
  ButtonSize,
  ButtonTone,
  ButtonVariant
} from "./button-component.tsx"

export type ButtonController = Readonly<{
  element: HTMLButtonElement
  refs: Readonly<{button: HTMLButtonElement; text: Text}>
  props: ButtonProps
  update(props: ButtonProps): void
  dispose(): void
}>

const regular = resolveWidgetColors("regular")
const selected = resolveWidgetColors("regular", {selected: true})

export const buttonCss = String.raw`
.ui-button {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 92px;
  min-width: 0;
  height: 28px;
  padding: 4px 10px;
  border: 1px solid ${rgba8ToColor(regular.outline)};
  border-radius: 4px;
  background: ${rgba8ToColor(regular.inner)};
  box-shadow: 0 1px 0 ${rgba8ToColor(uiTheme.material.widgetEmboss)};
  color: ${rgba8ToColor(regular.text)};
  font-size: 12px;
}
.ui-button[data-ui-state="hover"] { background: rgb(101 101 101); }
.ui-button[data-ui-state="active"],
.ui-button[aria-pressed="true"] { background: ${rgba8ToColor(selected.inner)}; color: ${rgba8ToColor(selected.text)}; }
.ui-button[data-ui-state="focus"] { border-color: rgb(113 168 255); }
.ui-button--text { border-color: transparent; background: transparent; box-shadow: none; }
.ui-button--outlined { background: transparent; box-shadow: none; }
.ui-button--small { width: 76px; height: 24px; padding: 3px 8px; font-size: 11px; }
.ui-button--large { width: 112px; height: 32px; padding: 5px 12px; font-size: 13px; }
.ui-button--primary.ui-button--contained { background: rgb(71 114 179); }
.ui-button--success.ui-button--contained { background: ${rgba8ToColor(uiTheme.state.success)}; }
.ui-button--warning.ui-button--contained { background: ${rgba8ToColor(uiTheme.state.warning)}; }
.ui-button--error.ui-button--contained { background: ${rgba8ToColor(uiTheme.state.error)}; }
.ui-button[disabled] { opacity: 0.5; box-shadow: none; }
`

export function createButton(document: Document, initialProps: ButtonProps): ButtonController {
  const button = document.createElement("button")
  const text = document.createTextNode("")
  button.setAttribute("type", "button")
  button.appendChild(text)
  let current = normalize(initialProps)
  let disposed = false
  const visualState = projectVisualState(button, () => current.disabled === true)
  const onClick = (event: Event): void => {
    if (!current.disabled) current.onClick?.(event)
  }
  button.addEventListener("click", onClick)

  const update = (props: ButtonProps): void => {
    if (disposed) throw new Error("Button controller is disposed")
    const next = normalize(props)
    const classes = ["ui-button", `ui-button--${next.variant}`, `ui-button--${next.tone}`, `ui-button--${next.size}`]
    button.className = classes.join(" ")
    button.disabled = next.disabled === true
    button.setAttribute("aria-pressed", String(next.selected === true))
    button.title = next.title ?? ""
    if (text.data !== next.label) text.data = next.label
    current = next
    visualState.sync()
  }

  const controller: ButtonController = Object.freeze({
    element: button,
    refs: Object.freeze({button, text}),
    get props() { return current },
    update,
    dispose() {
      if (disposed) return
      disposed = true
      button.removeEventListener("click", onClick)
      visualState.dispose()
    },
  })
  update(current)
  return controller
}

function normalize(props: ButtonProps): ButtonProps {
  if (typeof props.label !== "string") throw new TypeError("Button label must be a string")
  const variant = props.variant ?? "contained"
  const tone = props.tone ?? "neutral"
  const size = props.size ?? "medium"
  if (!["text", "outlined", "contained", "glass"].includes(variant)) throw new Error(`Unknown Button variant: ${variant}`)
  if (!["neutral", "primary", "success", "warning", "error"].includes(tone)) throw new Error(`Unknown Button tone: ${tone}`)
  if (!["small", "medium", "large"].includes(size)) throw new Error(`Unknown Button size: ${size}`)
  if (props.disabled !== undefined && typeof props.disabled !== "boolean") throw new TypeError("Button disabled must be a boolean")
  if (props.selected !== undefined && typeof props.selected !== "boolean") throw new TypeError("Button selected must be a boolean")
  return Object.freeze({...props, variant, tone, size, disabled: props.disabled ?? false, selected: props.selected ?? false})
}
