import type {Event, HTMLInputElement} from "@zavx0z/dom"
import {defineStyles, type FunctionComponent, type StyleValue} from "@zavx0z/react"
import {resolveWidgetColors, rgba8ToColor, uiTheme} from "./theme.ts"

export type TextFieldType = "text" | "number" | "search" | "password" | "email" | "url"

export type TextFieldProps = Readonly<{
  value: string
  type?: TextFieldType | undefined
  placeholder?: string | undefined
  min?: number | undefined
  max?: number | undefined
  step?: number | undefined
  disabled?: boolean | undefined
  readOnly?: boolean | undefined
  title?: string | undefined
  "aria-label"?: string | undefined
  style?: StyleValue
  onInput?: ((value: string, event: Event) => void) | undefined
  onChange?: ((value: string, event: Event) => void) | undefined
}>

const colors = resolveWidgetColors("text")

export const textFieldStyles = defineStyles("@ui/components/text-field", {
  root: {
    boxSizing: "border-box",
    display: "block",
    minWidth: 0,
    width: 160,
    height: 22,
    padding: "2px 6px",
    border: `1px solid ${rgba8ToColor(colors.outline)}`,
    borderRadius: 3,
    background: rgba8ToColor(colors.inner),
    boxShadow: `0 1px 0 ${rgba8ToColor(uiTheme.material.widgetEmboss)}`,
    color: rgba8ToColor(colors.text),
    fontSize: 11,
    lineHeight: 1,
    overflow: "clip",
    ":hover": {borderColor: "rgb(89 89 89)"},
    ":focus": {borderColor: "rgb(113 168 255)"},
    ":disabled": {opacity: 0.5, boxShadow: "none"}
  },
  readOnly: {background: "rgb(40 40 40)", color: "rgb(153 153 153)"}
})

export const textFieldComponentCss = textFieldStyles.cssText

export function TextField(props: TextFieldProps) {
  const onInput = (event: Event) => props.onInput?.(
    (event.target as HTMLInputElement).value,
    event
  )
  const onChange = (event: Event) => props.onChange?.(
    (event.target as HTMLInputElement).value,
    event
  )
  return <input
    type={props.type ?? "text"}
    value={props.value}
    placeholder={props.placeholder}
    min={props.min}
    max={props.max}
    step={props.step}
    disabled={props.disabled === true}
    readOnly={props.readOnly === true}
    title={props.title}
    aria-label={props["aria-label"]}
    onInput={onInput}
    onChange={onChange}
    style={[
      textFieldStyles.root,
      props.readOnly === true && textFieldStyles.readOnly,
      props.style
    ]}
  />
}

export type TextFieldComponent = FunctionComponent<TextFieldProps>

export * from "./text-field.ts"
