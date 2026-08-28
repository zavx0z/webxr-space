import type {Event} from "@zavx0z/dom"
import {
  defineStyles,
  type StyleValue
} from "@zavx0z/react"
import {resolveWidgetColors, rgba8ToColor, uiTheme} from "./theme.ts"

export type ButtonVariant = "text" | "outlined" | "contained" | "glass"
export type ButtonTone = "neutral" | "primary" | "success" | "warning" | "error"
export type ButtonSize = "small" | "medium" | "large"
export type ButtonIconPosition = "start" | "end"

export type ButtonProps = Readonly<{
  label: string
  variant?: ButtonVariant | undefined
  tone?: ButtonTone | undefined
  size?: ButtonSize | undefined
  disabled?: boolean | undefined
  selected?: boolean | undefined
  "aria-expanded"?: boolean | string | undefined
  "aria-label"?: string | undefined
  "aria-controls"?: string | undefined
  title?: string | undefined
  iconSrc?: string | undefined
  startIcon?: string | undefined
  endIcon?: string | undefined
  iconPosition?: ButtonIconPosition | undefined
  iconOnly?: boolean | undefined
  iconSize?: number | undefined
  style?: StyleValue
  onClick?: ((event: Event) => void) | undefined
}>

export type IconButtonProps = Readonly<{
  label: string
  iconSrc: string
  variant?: ButtonVariant | undefined
  tone?: ButtonTone | undefined
  size?: ButtonSize | undefined
  disabled?: boolean | undefined
  selected?: boolean | undefined
  title?: string | undefined
  iconSize?: number | undefined
  style?: StyleValue
  onClick?: ((event: Event) => void) | undefined
}>

const regular = resolveWidgetColors("regular")
const selected = resolveWidgetColors("regular", {selected: true})

export const buttonStyles = defineStyles("@ui/components/button", {
  root: {
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 92,
    minWidth: 22,
    height: 22,
    gap: 3,
    padding: "2px 6px",
    border: `1px solid ${rgba8ToColor(regular.outline)}`,
    borderRadius: 3,
    background: rgba8ToColor(regular.inner),
    boxShadow: `0 1px 0 ${rgba8ToColor(uiTheme.material.widgetEmboss)}`,
    color: rgba8ToColor(regular.text),
    fontSize: 11,
    lineHeight: 1,
    overflow: "clip",
    ":hover": {background: "rgb(101 101 101)"},
    ":active": {
      background: rgba8ToColor(selected.inner),
      color: rgba8ToColor(selected.text)
    },
    ":focus": {borderColor: "rgb(113 168 255)"},
    ":disabled": {opacity: 0.5, boxShadow: "none"}
  },
  text: {borderColor: "transparent", background: "transparent", boxShadow: "none"},
  outlined: {background: "transparent", boxShadow: "none"},
  glass: {background: "rgba(84, 84, 84, 0.72)"},
  small: {width: 76, height: 18, minWidth: 18, padding: "1px 5px", fontSize: 11},
  large: {width: 112, height: 28, minWidth: 28, padding: "3px 8px", fontSize: 12},
  primary: {background: "rgb(71 114 179)"},
  success: {background: rgba8ToColor(uiTheme.state.success)},
  warning: {background: rgba8ToColor(uiTheme.state.warning)},
  error: {background: rgba8ToColor(uiTheme.state.error)},
  selected: {
    background: rgba8ToColor(selected.inner),
    color: rgba8ToColor(selected.text)
  },
  icon: {width: 14, height: 14, objectFit: "contain", flexShrink: 0},
  label: {
    display: "inline",
    minWidth: 0,
    overflow: "clip",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis"
  }
})

export const buttonCss = buttonStyles.cssText

export function Button(props: ButtonProps) {
  const variant = props.variant ?? "contained"
  const tone = props.tone ?? "neutral"
  const size = props.size ?? "medium"
  const position = props.iconPosition ?? (
    props.endIcon !== undefined && props.startIcon === undefined ? "end" : "start"
  )
  const sharedIcon = props.iconSrc ?? ""
  const startIcon = props.startIcon ?? (position === "start" ? sharedIcon : "")
  const endIcon = props.endIcon ?? (position === "end" ? sharedIcon : "")
  const iconSize = props.iconSize ?? 14
  const showLabel = props.iconOnly !== true && props.label.length > 0

  return <button
    type="button"
    title={props.title}
    disabled={props.disabled === true}
    aria-pressed={props.selected === undefined ? undefined : String(props.selected)}
    aria-expanded={props["aria-expanded"]}
    aria-label={props["aria-label"]}
    aria-controls={props["aria-controls"]}
    onClick={props.onClick}
    style={[
      buttonStyles.root,
      variant === "text" && buttonStyles.text,
      variant === "outlined" && buttonStyles.outlined,
      variant === "glass" && buttonStyles.glass,
      size === "small" && buttonStyles.small,
      size === "large" && buttonStyles.large,
      variant === "contained" && tone === "primary" && buttonStyles.primary,
      variant === "contained" && tone === "success" && buttonStyles.success,
      variant === "contained" && tone === "warning" && buttonStyles.warning,
      variant === "contained" && tone === "error" && buttonStyles.error,
      props.selected === true && buttonStyles.selected,
      props.style
    ]}
  >
    <img
      src={startIcon}
      alt=""
      width={iconSize}
      height={iconSize}
      style={[buttonStyles.icon, startIcon === "" && {display: "none"}]}
    />
    <span style={[buttonStyles.label, !showLabel && {display: "none"}]}>{props.label}</span>
    <img
      src={endIcon}
      alt=""
      width={iconSize}
      height={iconSize}
      style={[buttonStyles.icon, endIcon === "" && {display: "none"}]}
    />
  </button>
}

export function IconButton(props: IconButtonProps) {
  return <Button
    label={props.label}
    iconSrc={props.iconSrc}
    iconPosition="start"
    iconOnly={true}
    iconSize={props.iconSize}
    variant={props.variant ?? "text"}
    tone={props.tone}
    size={props.size}
    disabled={props.disabled}
    selected={props.selected}
    title={props.title ?? props.label}
    style={props.style}
    onClick={props.onClick}
  />
}
