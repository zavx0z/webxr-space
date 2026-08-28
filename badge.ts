import type {Document, HTMLSpanElement, Text} from "@zavx0z/dom"
import {rgba8ToColor, uiTheme} from "./theme.ts"
import type {BadgeTone} from "./badge-component.tsx"

export type BadgeControllerProps = Readonly<{
  label: string
  tone?: BadgeTone | undefined
  title?: string | undefined
  className?: string | undefined
}>
export type BadgeController = Readonly<{element: HTMLSpanElement; refs: Readonly<{text: Text}>; props: BadgeControllerProps; update(props: BadgeControllerProps): void; dispose(): void}>

export const badgeCss = String.raw`
.ui-badge { box-sizing: border-box; display: inline; min-height: 20px; padding: 2px 6px; border: 1px solid rgb(61 61 61); border-radius: 3px; background: rgb(48 48 48); color: rgb(230 230 230); font-size: 11px; }
.ui-badge--info { background: ${rgba8ToColor(uiTheme.state.info)}; }
.ui-badge--success { background: ${rgba8ToColor(uiTheme.state.success)}; }
.ui-badge--warning { background: ${rgba8ToColor(uiTheme.state.warning)}; }
.ui-badge--error { background: ${rgba8ToColor(uiTheme.state.error)}; }
`

export function createBadge(document: Document, initialProps: BadgeControllerProps): BadgeController {
  const element = document.createElement("span")
  const text = document.createTextNode("")
  element.appendChild(text)
  let current = initialProps
  const update = (props: BadgeControllerProps): void => {
    if (typeof props.label !== "string") throw new TypeError("Badge label must be a string")
    const tone = props.tone ?? "neutral"
    if (!["neutral", "info", "success", "warning", "error"].includes(tone)) throw new Error(`Unknown Badge tone: ${tone}`)
    current = Object.freeze({...props, tone})
    element.className = ["ui-badge", `ui-badge--${tone}`, props.className ?? ""].filter(Boolean).join(" ")
    element.title = props.title ?? ""
    if (text.data !== props.label) text.data = props.label
  }
  const controller: BadgeController = Object.freeze({element, refs: Object.freeze({text}), get props() { return current }, update, dispose() {}})
  update(initialProps)
  return controller
}
