import type {Event} from "@zavx0z/dom"
import {defineStyles, type FunctionComponent, type StyleValue} from "@zavx0z/react"
import {TextField, textFieldComponentCss} from "./text-field-component.tsx"
import {rgba8ToColor, uiTheme} from "./theme.ts"

export type ControlGroupItem = Readonly<{
  key: string
  label: string
  value: string
  type?: "text" | "number" | undefined
  min?: number | undefined
  max?: number | undefined
  step?: number | undefined
  accent?: "x" | "y" | "z" | "w" | undefined
  disabled?: boolean | undefined
  readOnly?: boolean | undefined
  title?: string | undefined
}>

export type ControlGroupProps = Readonly<{
  items: readonly ControlGroupItem[]
  disabled?: boolean | undefined
  title?: string | undefined
  style?: StyleValue
  onInput?: ((key: string, value: string, event: Event) => void) | undefined
  onChange?: ((key: string, value: string, event: Event) => void) | undefined
}>

export const controlGroupStyles = defineStyles("@ui/components/control-group", {
  root: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "row",
    minWidth: 0,
    height: 28,
    gap: 0,
    padding: 0,
    border: "1px solid rgb(61 61 61)",
    borderRadius: 4,
    overflow: "clip",
    background: "rgb(84 84 84)",
    boxShadow: `0 1px 0 ${rgba8ToColor(uiTheme.material.widgetEmboss)}`,
    ":focus-within": {borderColor: "rgb(113 168 255)"}
  },
  disabled: {opacity: 0.5, boxShadow: "none"},
  cell: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    height: 26,
    flexGrow: 1,
    borderRight: "1px solid rgb(61 61 61)",
    background: "rgb(84 84 84)",
    ":hover": {background: "rgb(101 101 101)"},
    ":focus-within": {background: "rgb(34 34 34)"}
  },
  lastCell: {borderRight: 0},
  label: {
    display: "inline",
    width: 18,
    color: "rgb(204 204 204)",
    fontSize: 10,
    textAlign: "center"
  },
  x: {color: "rgb(255 51 82)"},
  y: {color: "rgb(83 179 67)"},
  z: {color: "rgb(62 127 255)"},
  w: {color: "rgb(204 204 204)"},
  input: {
    width: 0,
    minWidth: 0,
    height: 26,
    flexGrow: 1,
    padding: "3px 5px",
    border: "none",
    borderRadius: 0,
    background: "transparent",
    boxShadow: "none",
    fontSize: 11,
    textAlign: "right",
    ":hover": {background: "transparent", borderColor: "transparent"},
    ":focus": {background: "transparent", borderColor: "transparent"}
  }
})

export const controlGroupComponentCss = `${textFieldComponentCss}\n${controlGroupStyles.cssText}`

type ControlGroupCellProps = Readonly<{
  item: ControlGroupItem
  disabled: boolean
  last: boolean
  onInput?: ControlGroupProps["onInput"]
  onChange?: ControlGroupProps["onChange"]
}>

function ControlGroupCell(props: ControlGroupCellProps) {
  const onInput = (value: string, event: Event) => props.onInput?.(props.item.key, value, event)
  const onChange = (value: string, event: Event) => props.onChange?.(props.item.key, value, event)
  return <label
    data-control-key={props.item.key}
    title={props.item.title ?? props.item.label}
    style={[controlGroupStyles.cell, props.last && controlGroupStyles.lastCell]}
  >
    <span style={[
      controlGroupStyles.label,
      props.item.accent === "x" && controlGroupStyles.x,
      props.item.accent === "y" && controlGroupStyles.y,
      props.item.accent === "z" && controlGroupStyles.z,
      props.item.accent === "w" && controlGroupStyles.w
    ]}>{props.item.label}</span>
    <TextField
      type={props.item.type ?? "text"}
      value={props.item.value}
      min={props.item.min}
      max={props.item.max}
      step={props.item.step}
      disabled={props.disabled || props.item.disabled === true}
      readOnly={props.item.readOnly === true}
      title={props.item.title ?? props.item.label}
      style={controlGroupStyles.input}
      onInput={onInput}
      onChange={onChange}
    />
  </label>
}

export function ControlGroup(props: ControlGroupProps) {
  assertControlGroupItems(props.items)
  return <div
    title={props.title}
    aria-disabled={String(props.disabled === true)}
    style={[
      controlGroupStyles.root,
      props.disabled === true && controlGroupStyles.disabled,
      props.style
    ]}
  >
    {props.items.map((item, index) => <ControlGroupCell
      key={item.key}
      item={item}
      disabled={props.disabled === true}
      last={index === props.items.length - 1}
      onInput={props.onInput}
      onChange={props.onChange}
    />)}
  </div>
}

export type ControlGroupComponent = FunctionComponent<ControlGroupProps>

function assertControlGroupItems(items: readonly ControlGroupItem[]): void {
  if (!Array.isArray(items) || items.length === 0) {
    throw new TypeError("ControlGroup items must be a non-empty array")
  }
  const keys = new Set<string>()
  for (const item of items) {
    if (typeof item.key !== "string" || item.key.length === 0) {
      throw new TypeError("ControlGroup item key must not be empty")
    }
    if (keys.has(item.key)) throw new Error(`ControlGroup item key must be unique: ${item.key}`)
    keys.add(item.key)
    if (typeof item.label !== "string" || typeof item.value !== "string") {
      throw new TypeError("ControlGroup item label and value must be strings")
    }
    if (item.type !== undefined && item.type !== "text" && item.type !== "number") {
      throw new Error(`Unknown ControlGroup item type: ${item.type}`)
    }
    if (item.accent !== undefined && item.accent !== "x" && item.accent !== "y" && item.accent !== "z" && item.accent !== "w") {
      throw new Error(`Unknown ControlGroup item accent: ${item.accent}`)
    }
  }
}

export * from "./control-group.ts"
