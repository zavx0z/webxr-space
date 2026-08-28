import type {Event, HTMLInputElement} from "@zavx0z/dom"
import {defineStyles, type StyleValue} from "@zavx0z/react"
import {resolveWidgetColors, rgba8ToColor, uiTheme} from "./theme.ts"

export type CheckboxProps = Readonly<{
  checked: boolean
  indeterminate?: boolean | undefined
  disabled?: boolean | undefined
  title?: string | undefined
  style?: StyleValue
  onChange?: ((checked: boolean, event: Event) => void) | undefined
}>

const option = resolveWidgetColors("option")
const selected = resolveWidgetColors("option", {selected: true})

export const checkboxStyles = defineStyles("@ui/components/checkbox", {
  root: {
    boxSizing: "border-box",
    display: "block",
    width: 18,
    height: 18,
    padding: 0,
    border: `1px solid ${rgba8ToColor(option.outline)}`,
    borderRadius: 3,
    background: rgba8ToColor(option.inner),
    boxShadow: `0 1px 0 ${rgba8ToColor(uiTheme.material.widgetEmboss)}`,
    color: rgba8ToColor(option.item),
    ":checked": {
      background: rgba8ToColor(selected.inner),
      color: rgba8ToColor(selected.text)
    },
    ":indeterminate": {
      background: rgba8ToColor(selected.inner),
      color: rgba8ToColor(selected.text)
    },
    ":hover": {borderColor: "rgb(101 101 101)"},
    ":focus": {borderColor: "rgb(113 168 255)"},
    ":disabled": {opacity: 0.5, boxShadow: "none"}
  }
})

export const checkboxCss = checkboxStyles.cssText

export function Checkbox(props: CheckboxProps) {
  const onChange = (event: Event) => props.onChange?.(
    (event.target as HTMLInputElement).checked,
    event
  )
  return <input
    type="checkbox"
    checked={props.checked}
    indeterminate={props.indeterminate === true}
    disabled={props.disabled === true}
    title={props.title}
    aria-checked={props.indeterminate === true ? "mixed" : String(props.checked)}
    onChange={onChange}
    style={[checkboxStyles.root, props.style]}
  />
}
