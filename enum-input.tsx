import type {Event, HTMLSelectElement} from "@zavx0z/dom"
import {Button} from "./button.tsx"

export type EnumInputOption = Readonly<{
  key: string
  value: string
  label: string
  description?: string | undefined
  disabled?: boolean | undefined
  iconSrc?: string | undefined
  title?: string | undefined
}>

export type EnumInputDensity = "regular" | "compact"
export type EnumInputPresentation = "cycle" | "expanded"
export type EnumInputState = "ready" | "undefined" | "error"

export type EnumInputProps = Readonly<{
  value: string
  options?: readonly EnumInputOption[] | undefined
  presentation?: EnumInputPresentation | undefined
  state?: EnumInputState | undefined
  density?: EnumInputDensity | undefined
  disabled?: boolean | undefined
  readOnly?: boolean | undefined
  popupLabel?: string | undefined
  title?: string | undefined
  style?: CssStyle | undefined
  onChange?: ((value: string, event: Event) => void) | undefined
}>

const selectCss = css`
  & {
    box-sizing: border-box;
    display: block;
    min-width: 0;
    width: 180px;
    height: var(--control-height-large);
    padding: 3px 8px;
    border: var(--border-width-control) solid var(--widget-regular-outline);
    border-radius: 4px;
    background: var(--widget-regular-background);
    box-shadow: 0 1px 0 var(--material-widget-emboss);
    color: var(--widget-regular-content);
    font-size: var(--font-size-sm);
  }
  &:hover { background: var(--widget-hover-background); }
  &:active {
    border-color: var(--widget-focus-outline);
    background: var(--widget-text-background-focus);
  }
  &:focus {
    border-color: var(--widget-focus-outline);
    background: var(--widget-text-background-focus);
  }
  &:disabled { opacity: 0.5; box-shadow: none; }
  &[data-density="compact"] { height: var(--control-height-medium); padding: 2px 6px; font-size: var(--font-size-xs); }
  &[aria-readonly="true"] { color: var(--widget-text-content-readonly); }
`

const expandedOptionStyle: CssStyle = css`
  & { width: 0; min-width: 44px; flex-grow: 1; border-radius: 3px; }
`

function EnumOption(props: Readonly<{option: EnumInputOption; selected: boolean; hidden: boolean}>) {
  return <option
    value={props.option.value}
    selected={props.selected}
    disabled={props.option.disabled === true}
    hidden={props.hidden}
    title={props.option.title ?? props.option.description}
    data-icon-src={props.option.iconSrc}
  >{props.option.label}</option>
}

function ExpandedEnumOption(props: Readonly<{
  option: EnumInputOption
  selected: boolean
  locked: boolean
  onChange?: EnumInputProps["onChange"]
}>) {
  const onClick = (event: Event) => {
    if (!props.locked && props.option.disabled !== true) props.onChange?.(props.option.value, event)
  }
  return <Button
    label={props.option.label}
    startIcon={props.option.iconSrc}
    title={props.option.title ?? props.option.description}
    selected={props.selected}
    disabled={props.locked || props.option.disabled === true}
    style={expandedOptionStyle}
    onClick={onClick}
  />
}

function EnumOptions(props: Readonly<{
  options: readonly EnumInputOption[]
  value: string
  exceptionalLabel?: string | undefined
}>) {
  return <optgroup label="">
    <option
      value=""
      selected={props.exceptionalLabel !== undefined}
      disabled={true}
      hidden={props.exceptionalLabel === undefined}
    >{props.exceptionalLabel ?? ""}</option>
    {props.options.map(option => <EnumOption
      key={option.key}
      option={option}
      selected={props.exceptionalLabel === undefined && option.value === props.value}
      hidden={props.exceptionalLabel !== undefined}
    />)}
  </optgroup>
}

function ExpandedEnumOptions(props: Readonly<{
  options: readonly EnumInputOption[]
  value: string
  locked: boolean
  onChange?: EnumInputProps["onChange"]
}>) {
  return <div data-enum-options="" style={css`
    & { box-sizing: border-box; display: flex; flex-direction: row; width: 100%; min-width: 0; gap: inherit; }
  `}>{props.options.map(option => <ExpandedEnumOption
    key={option.key}
    option={option}
    selected={option.value === props.value}
    locked={props.locked}
    onChange={props.onChange}
  />)}</div>
}

export function EnumInput(props: EnumInputProps) {
  assertEnumProps(props)
  const presentation = props.presentation ?? "cycle"
  const density = props.density ?? "regular"
  const exceptionalLabel = enumInputExceptionalLabel(props)
  const options = props.options ?? []
  const locked = props.disabled === true || props.readOnly === true
  const selected = findEnumInputOption(props.value, options)
  const displayedOptions = selected === undefined
    ? [Object.freeze({key: "__invalid__", value: props.value, label: props.value, disabled: true}), ...options]
    : options
  const onChange = (event: Event) => {
    const select = event.target as HTMLSelectElement
    if (locked) {
      select.value = props.value
      return
    }
    props.onChange?.(select.value, event)
  }
  return <div
    data-enum-input=""
    data-value={props.value}
    data-presentation={presentation}
    data-density={density}
    data-state={exceptionalLabel === undefined ? "ready" : props.state ?? (props.options === undefined ? "undefined" : "empty")}
    role={exceptionalLabel === undefined && presentation === "expanded" ? "radiogroup" : undefined}
    aria-label={props.popupLabel ?? props.title}
    style={css`
      & { box-sizing: border-box; display: block; width: 180px; min-width: 0; }
      &[data-presentation="expanded"] { width: 100%; }
      ${props.style}
    `}
  >
    <div
      data-enum-expanded=""
      data-density={density}
      hidden={exceptionalLabel !== undefined || presentation !== "expanded"}
      role="radiogroup"
      aria-label={props.popupLabel ?? props.title ?? "Options"}
      aria-disabled={String(props.disabled === true)}
      aria-readonly={String(props.readOnly === true)}
      title={props.title}
      style={css`
        & { box-sizing: border-box; display: flex; flex-direction: row; width: 100%; min-width: 0; gap: var(--space-1); }
        &[data-density="compact"] { gap: 2px; }
        &[hidden] { display: none; }
      `}
    >
      <ExpandedEnumOptions
        options={options}
        value={props.value}
        locked={locked}
        onChange={props.onChange}
      />
    </div>
    <select
      data-enum-cycle=""
      data-density={density}
      hidden={exceptionalLabel === undefined && presentation !== "cycle"}
      disabled={props.disabled === true || exceptionalLabel !== undefined}
      aria-readonly={String(props.readOnly === true)}
      aria-label={props.popupLabel}
      title={selected?.description ?? props.title}
      onChange={onChange}
      style={css`${selectCss}${css`& { width: 100%; } &[hidden] { display: none; }`}`}
    >
      <EnumOptions options={displayedOptions} value={props.value} exceptionalLabel={exceptionalLabel} />
    </select>
  </div>
}

/** Returns the exact immutable option selected by a stable controlled value. */
export function findEnumInputOption(
  value: string,
  options: readonly EnumInputOption[]
): EnumInputOption | undefined {
  return options.find(option => option.value === value)
}

/** Cycles stable option values while preserving the established invalid-value behavior. */
export function nextEnumInputValue(
  value: string,
  options: readonly EnumInputOption[],
  step = 1
): string {
  if (options.length === 0) return value
  const current = options.findIndex(option => option.value === value)
  const start = current < 0 ? 0 : current
  const index = ((start + step) % options.length + options.length) % options.length
  return options[index]!.value
}

function enumInputExceptionalLabel(props: EnumInputProps): string | undefined {
  if (props.state === "error") return "Menu Error"
  if (props.state === "undefined" || props.options === undefined) return "Menu Undefined"
  if (props.options.length === 0) return "No Items"
  return undefined
}

function assertEnumProps(props: EnumInputProps): void {
  if (typeof props.value !== "string") throw new TypeError("EnumInput value must be a string")
  if (props.presentation !== undefined && props.presentation !== "cycle" && props.presentation !== "expanded") {
    throw new Error(`Unknown EnumInput presentation: ${props.presentation}`)
  }
  if (props.state !== undefined && props.state !== "ready" && props.state !== "undefined" && props.state !== "error") {
    throw new Error(`Unknown EnumInput state: ${props.state}`)
  }
  if (props.options === undefined) return
  if (!Array.isArray(props.options)) throw new TypeError("EnumInput options must be an array")
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
}
