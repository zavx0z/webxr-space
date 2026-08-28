import type {Event} from "@zavx0z/dom"
import {defineStyles, type StyleValue} from "@zavx0z/react"
import {rgba8ToColor, uiTheme} from "./theme.ts"

export type SwitcherProps = Readonly<{
  checked: boolean
  disabled?: boolean | undefined
  title?: string | undefined
  style?: StyleValue
  onChange?: ((checked: boolean, event: Event) => void) | undefined
}>

export const switcherStyles = defineStyles("@ui/components/switcher", {
  root: {
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    width: 32,
    height: 18,
    padding: 2,
    border: "1px solid rgb(61 61 61)",
    borderRadius: 4,
    background: "rgb(84 84 84)",
    boxShadow: `0 1px 0 ${rgba8ToColor(uiTheme.material.widgetEmboss)}`,
    overflow: "clip",
    ":hover": {borderColor: "rgb(101 101 101)"},
    ":focus": {borderColor: "rgb(113 168 255)"},
    ":disabled": {opacity: 0.5, boxShadow: "none"}
  },
  checked: {background: "rgb(71 114 179)"},
  thumb: {
    display: "block",
    width: 12,
    height: 12,
    borderRadius: 6,
    background: "rgb(230 230 230)"
  },
  thumbChecked: {transform: "translateX(14px)"}
})

export const switcherCss = switcherStyles.cssText

export function Switcher(props: SwitcherProps) {
  const onClick = (event: Event) => props.onChange?.(!props.checked, event)
  return <button
    type="button"
    role="switch"
    aria-checked={String(props.checked)}
    disabled={props.disabled === true}
    title={props.title}
    onClick={onClick}
    style={[
      switcherStyles.root,
      props.checked && switcherStyles.checked,
      props.style
    ]}
  >
    <span style={[
      switcherStyles.thumb,
      props.checked && switcherStyles.thumbChecked
    ]}></span>
  </button>
}
