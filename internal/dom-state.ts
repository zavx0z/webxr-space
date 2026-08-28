import type {Event, HTMLElement} from "@zavx0z/dom"

export type DomVisualState = "idle" | "hover" | "active" | "focus"

export type VisualStateProjection = Readonly<{
  sync(): void
  dispose(): void
}>

export function projectVisualState(
  element: HTMLElement,
  isDisabled: () => boolean,
): VisualStateProjection {
  let hovered = false
  let pressed = false
  let focused = false
  const apply = (): void => {
    const state: DomVisualState = focused ? "focus" : pressed ? "active" : hovered ? "hover" : "idle"
    element.setAttribute("data-ui-state", isDisabled() ? "idle" : state)
  }
  const enter = (): void => {
    hovered = true
    apply()
  }
  const leave = (): void => {
    hovered = false
    pressed = false
    apply()
  }
  const down = (): void => {
    if (!isDisabled()) pressed = true
    apply()
  }
  const up = (): void => {
    pressed = false
    apply()
  }
  const focus = (): void => {
    focused = true
    apply()
  }
  const blur = (): void => {
    focused = false
    pressed = false
    apply()
  }
  const listeners: readonly [string, (event: Event) => void][] = [
    ["pointerenter", enter],
    ["pointerleave", leave],
    ["pointerdown", down],
    ["pointerup", up],
    ["pointercancel", up],
    ["focus", focus],
    ["blur", blur],
  ]
  for (const [type, listener] of listeners) element.addEventListener(type, listener)
  apply()
  return Object.freeze({
    sync: apply,
    dispose() {
      for (const [type, listener] of listeners) element.removeEventListener(type, listener)
    },
  })
}
