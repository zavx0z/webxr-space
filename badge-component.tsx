import {defineStyles, type FunctionComponent, type StyleValue} from "@zavx0z/react"
import {rgba8ToColor, uiTheme} from "./theme.ts"

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "error"

export type BadgeProps = Readonly<{
  label: string
  tone?: BadgeTone | undefined
  title?: string | undefined
  style?: StyleValue
}>

export const badgeStyles = defineStyles("@ui/components/badge", {
  root: {
    boxSizing: "border-box",
    display: "inline",
    minHeight: 20,
    padding: "2px 6px",
    border: "1px solid rgb(61 61 61)",
    borderRadius: 3,
    background: "rgb(48 48 48)",
    color: "rgb(230 230 230)",
    fontSize: 11
  },
  info: {background: rgba8ToColor(uiTheme.state.info)},
  success: {background: rgba8ToColor(uiTheme.state.success)},
  warning: {background: rgba8ToColor(uiTheme.state.warning)},
  error: {background: rgba8ToColor(uiTheme.state.error)}
})

export const badgeComponentCss = badgeStyles.cssText

export function Badge(props: BadgeProps) {
  const tone = props.tone ?? "neutral"
  return <span
    title={props.title}
    style={[
      badgeStyles.root,
      tone === "info" && badgeStyles.info,
      tone === "success" && badgeStyles.success,
      tone === "warning" && badgeStyles.warning,
      tone === "error" && badgeStyles.error,
      props.style
    ]}
  >{props.label}</span>
}

export type BadgeComponent = FunctionComponent<BadgeProps>

export * from "./badge.ts"
