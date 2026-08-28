import type {Document, HTMLElement, Node, Text} from "@zavx0z/dom"
import {resolveWidgetColors, rgba8ToColor, uiTheme} from "./theme.ts"
import type {
  PaneTextContent,
  PaneVariant
} from "./pane-component.tsx"
export type PaneContent = PaneTextContent | Node | readonly Node[]
export type PaneControllerProps = Readonly<{
  content?: PaneContent | undefined
  variant?: PaneVariant | undefined
  title?: string | undefined
  active?: boolean | undefined
  className?: string | undefined
}>
export type PaneController = Readonly<{
  element: HTMLElement
  refs: Readonly<{root: HTMLElement}>
  props: PaneControllerProps
  update(props: PaneControllerProps): void
  dispose(): void
}>

const box = resolveWidgetColors("box")
export const paneCss = String.raw`
.ui-pane { box-sizing: border-box; display: block; min-width: 0; padding: 8px; overflow: hidden; border: 1px solid ${rgba8ToColor(box.outline)}; border-radius: 4px; background: ${rgba8ToColor(box.inner)}; color: ${rgba8ToColor(box.text)}; }
.ui-pane--outlined { background: transparent; }
.ui-pane--transparent { border-color: transparent; background: transparent; }
.ui-pane[data-active="true"] { border-color: ${rgba8ToColor(uiTheme.material.editorOutlineActive)}; }
`

export function createPane(
  document: Document,
  initialProps: PaneControllerProps = {}
): PaneController {
  const root = document.createElement("section")
  let text: Text | null = null
  let current = normalize(initialProps)
  const update = (props: PaneControllerProps): void => {
    const next = normalize(props)
    root.className = ["ui-pane", `ui-pane--${next.variant}`, next.className ?? ""].filter(Boolean).join(" ")
    root.title = next.title ?? ""
    root.setAttribute("data-active", String(next.active === true))
    if (
      typeof next.content === "string" ||
      typeof next.content === "number" ||
      typeof next.content === "bigint" ||
      typeof next.content === "boolean" ||
      next.content === null
    ) {
      if (text === null) text = document.createTextNode("")
      const content = next.content === null || typeof next.content === "boolean"
        ? ""
        : String(next.content)
      if (text.data !== content) text.data = content
      if (root.firstChild !== text || root.childNodes.length !== 1) root.replaceChildren(text)
    } else {
      text = null
      const nodes = next.content === undefined ? [] : Array.isArray(next.content) ? next.content : [next.content]
      root.replaceChildren(...nodes)
    }
    current = next
  }
  const controller: PaneController = Object.freeze({element: root, refs: Object.freeze({root}), get props() { return current }, update, dispose() {}})
  update(current)
  return controller
}

function normalize(props: PaneControllerProps): PaneControllerProps {
  const variant = props.variant ?? "filled"
  if (!["filled", "outlined", "transparent"].includes(variant)) throw new Error(`Unknown Pane variant: ${variant}`)
  return Object.freeze({...props, variant, active: props.active ?? false})
}
