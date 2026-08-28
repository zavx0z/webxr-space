import type {Event, HTMLSelectElement} from "@zavx0z/dom"
import {defineStyles, type StyleValue} from "@zavx0z/react"
import {rgba8ToColor, uiTheme} from "./theme.ts"

export type EnumInputOption = Readonly<{
  key: string
  value: string
  label: string
  disabled?: boolean | undefined
  title?: string | undefined
}>

export type EnumInputProps = Readonly<{
  value: string
  options: readonly EnumInputOption[]
  disabled?: boolean | undefined
  title?: string | undefined
  style?: StyleValue
  onChange?: ((value: string, event: Event) => void) | undefined
}>

export const enumInputStyles = defineStyles("@ui/components/enum-input", {
  root: {
    boxSizing: "border-box",
    display: "block",
    minWidth: 0,
    width: 180,
    height: 28,
    padding: "3px 8px",
    border: "1px solid rgb(61 61 61)",
    borderRadius: 4,
    background: "rgb(84 84 84)",
    boxShadow: `0 1px 0 ${rgba8ToColor(uiTheme.material.widgetEmboss)}`,
    color: "rgb(230 230 230)",
    fontSize: 12,
    ":hover": {background: "rgb(101 101 101)"},
    ":active": {borderColor: "rgb(113 168 255)", background: "rgb(34 34 34)"},
    ":focus": {borderColor: "rgb(113 168 255)", background: "rgb(34 34 34)"},
    ":disabled": {opacity: 0.5, boxShadow: "none"}
  }
})

export const enumInputCss = enumInputStyles.cssText

function EnumOption(props: Readonly<{option: EnumInputOption; selected: boolean}>) {
  return <option
    value={props.option.value}
    selected={props.selected}
    disabled={props.option.disabled === true}
    title={props.option.title}
  >{props.option.label}</option>
}

export function EnumInput(props: EnumInputProps) {
  assertEnumProps(props)
  const onChange = (event: Event) => props.onChange?.(
    (event.target as HTMLSelectElement).value,
    event
  )
  return <select
    disabled={props.disabled === true}
    title={props.title}
    onChange={onChange}
    style={[enumInputStyles.root, props.style]}
  >
    {props.options.map(option => <EnumOption
      key={option.key}
      option={option}
      selected={option.value === props.value}
    />)}
  </select>
}


function assertEnumProps(props: EnumInputProps): void {
  if (typeof props.value !== "string") throw new TypeError("EnumInput value must be a string")
  if (!Array.isArray(props.options) || props.options.length === 0) {
    throw new TypeError("EnumInput options must be a non-empty array")
  }
  const keys = new Set<string>()
  const values = new Set<string>()
  for (const option of props.options) {
    if (typeof option.key !== "string" || option.key.length === 0) {
      throw new TypeError("EnumInput option key must not be empty")
    }
    if (keys.has(option.key)) throw new Error(`EnumInput option key must be unique: ${option.key}`)
    keys.add(option.key)
    if (typeof option.value !== "string" || typeof option.label !== "string") {
      throw new TypeError("EnumInput option value and label must be strings")
    }
    if (values.has(option.value)) throw new Error(`EnumInput option value must be unique: ${option.value}`)
    values.add(option.value)
  }
  if (!values.has(props.value)) throw new Error(`EnumInput value has no option: ${props.value}`)
}
