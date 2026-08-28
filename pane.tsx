import {defineStyles, type StyleValue} from "@zavx0z/react"
import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import {resolveWidgetColors, rgba8ToColor, uiTheme} from "./theme.ts"

export type PaneVariant = "filled" | "outlined" | "transparent"
export type PaneTextContent = string | number | bigint | boolean | null | undefined

export type PaneProps = Readonly<{
  content?: PaneTextContent
  children?: JsxSourceElement | null | undefined
  variant?: PaneVariant | undefined
  title?: string | undefined
  active?: boolean | undefined
  style?: StyleValue
}>

const box = resolveWidgetColors("box")

export const paneStyles = defineStyles("@ui/components/pane", {
  root: {
    boxSizing: "border-box",
    display: "block",
    minWidth: 0,
    padding: 8,
    overflow: "hidden",
    border: `1px solid ${rgba8ToColor(box.outline)}`,
    borderRadius: 4,
    background: rgba8ToColor(box.inner),
    color: rgba8ToColor(box.text)
  },
  outlined: {background: "transparent"},
  transparent: {borderColor: "transparent", background: "transparent"},
  active: {borderColor: rgba8ToColor(uiTheme.material.editorOutlineActive)}
})

export const paneCss = paneStyles.cssText

export function Pane(props: PaneProps) {
  if (props.children != null && props.content != null) {
    throw new Error("Pane accepts either authored children or primitive content, not both")
  }
  const variant = props.variant ?? "filled"
  return <section
    title={props.title}
    style={[
      paneStyles.root,
      variant === "outlined" && paneStyles.outlined,
      variant === "transparent" && paneStyles.transparent,
      props.active === true && paneStyles.active,
      props.style
    ]}
  >{props.children}{props.content}</section>
}
