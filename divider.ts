import type {Document, HTMLElement} from "@zavx0z/dom"
import type {DividerVariant} from "./divider-component.tsx"

export type DividerControllerProps = Readonly<{
  variant?: DividerVariant | undefined
  title?: string | undefined
  className?: string | undefined
}>
export type DividerController = Readonly<{element: HTMLElement; props: DividerControllerProps; update(props: DividerControllerProps): void; dispose(): void}>

export const dividerCss = String.raw`
.ui-divider { box-sizing: border-box; display: block; width: 100%; height: 1px; margin: 4px 0; border: 0; background: rgb(22 22 22); }
.ui-divider--inset { width: 96%; margin-left: 16px; }
.ui-divider--middle { width: 90%; margin-left: 16px; }
`

export function createDivider(
  document: Document,
  initialProps: DividerControllerProps = {}
): DividerController {
  const element = document.createElement("hr")
  let current = initialProps
  const update = (props: DividerControllerProps): void => {
    const variant = props.variant ?? "full-width"
    if (!["full-width", "inset", "middle"].includes(variant)) throw new Error(`Unknown Divider variant: ${variant}`)
    current = Object.freeze({...props, variant})
    element.className = ["ui-divider", `ui-divider--${variant}`, props.className ?? ""].filter(Boolean).join(" ")
    element.title = props.title ?? ""
  }
  const controller: DividerController = Object.freeze({element, get props() { return current }, update, dispose() {}})
  update(initialProps)
  return controller
}
