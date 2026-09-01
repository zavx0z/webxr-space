import type {Event} from "@zavx0z/dom"
import {TextControl} from "./text-control.tsx"

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
  style?: CssStyle | undefined
  onInput?: ((key: string, value: string, event: Event) => void) | undefined
  onChange?: ((key: string, value: string, event: Event) => void) | undefined
}>

const inputStyle: CssStyle = css`
  & { width: 0; min-width: 0; height: 26px; flex-grow: 1; padding: 3px 5px; border: none; border-radius: 0; background: transparent; box-shadow: none; font-size: 11px; text-align: right; --text-control-hover-outline: transparent; --text-control-focus-outline: transparent; --text-control-focus-background: transparent; }
`

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
    data-last={props.last ? "true" : undefined}
    title={props.item.title ?? props.item.label}
    style={css`
        & {
          box-sizing: border-box;
          display: flex;
          flex-direction: row;
          align-items: center;
          min-width: 0;
          height: 26px;
          flex-grow: 1;
          border-right: var(--border-width-control) solid var(--widget-regular-outline);
          background: var(--widget-regular-background);
        }
        &:hover { background: var(--widget-hover-background); }
        &:focus-within { background: var(--widget-number-background-focus); }
        &[data-last="true"] { border-right: 0; }
      `}
  >
    <span data-accent={props.item.accent} style={css`
        & { display: inline; width: 18px; color: var(--widget-list-content); font-size: var(--font-size-2xs); text-align: center; }
        &[data-accent="x"] { color: rgb(var(--axis-x-500)); }
        &[data-accent="y"] { color: rgb(var(--axis-y-500)); }
        &[data-accent="z"] { color: rgb(var(--axis-z-500)); }
      `}>{props.item.label}</span>
    <TextControl
      type={props.item.type ?? "text"}
      value={props.item.value}
      min={props.item.min}
      max={props.item.max}
      step={props.item.step}
      disabled={props.disabled || props.item.disabled === true}
      readOnly={props.item.readOnly === true}
      title={props.item.title ?? props.item.label}
      style={inputStyle}
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
    style={css`
        & {
          box-sizing: border-box;
          display: flex;
          flex-direction: row;
          min-width: 0;
          height: var(--control-height-large);
          gap: 0;
          padding: 0;
          border: var(--border-width-control) solid var(--widget-regular-outline);
          border-radius: 4px;
          overflow: clip;
          background: var(--widget-regular-background);
          box-shadow: 0 1px 0 var(--material-widget-emboss);
        }
        &:focus-within { border-color: var(--widget-focus-outline); }
        &[aria-disabled="true"] { opacity: 0.5; box-shadow: none; }
        ${props.style}
      `}
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
