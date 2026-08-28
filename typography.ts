import type {Document, HTMLSpanElement, Text} from "@zavx0z/dom"
import type {TypographyVariant} from "./typography-component.tsx"

export type TypographyControllerProps = Readonly<{
  text: string
  variant?: TypographyVariant | undefined
  title?: string | undefined
  className?: string | undefined
}>
export type TypographyController = Readonly<{element: HTMLSpanElement; refs: Readonly<{text: Text}>; props: TypographyControllerProps; update(props: TypographyControllerProps): void; dispose(): void}>

export const typographyCss = String.raw`
.ui-typography { display: inline; color: rgb(230 230 230); font-size: 12px; line-height: 16px; }
.ui-typography--title { font-size: 15px; line-height: 20px; }
.ui-typography--subtitle { color: rgb(204 204 204); font-size: 13px; line-height: 18px; }
.ui-typography--caption { color: rgb(153 153 153); font-size: 11px; line-height: 14px; }
`

export function createTypography(
  document: Document,
  initialProps: TypographyControllerProps
): TypographyController {
  const element = document.createElement("span")
  const text = document.createTextNode("")
  element.appendChild(text)
  let current = initialProps
  const update = (props: TypographyControllerProps): void => {
    if (typeof props.text !== "string") throw new TypeError("Typography text must be a string")
    const variant = props.variant ?? "body"
    if (!["title", "subtitle", "body", "caption"].includes(variant)) throw new Error(`Unknown Typography variant: ${variant}`)
    current = Object.freeze({...props, variant})
    element.className = ["ui-typography", `ui-typography--${variant}`, props.className ?? ""].filter(Boolean).join(" ")
    element.title = props.title ?? ""
    if (text.data !== props.text) text.data = props.text
  }
  const controller: TypographyController = Object.freeze({element, refs: Object.freeze({text}), get props() { return current }, update, dispose() {}})
  update(initialProps)
  return controller
}
