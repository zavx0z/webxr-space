import type {Event, HTMLSelectElement} from "@zavx0z/dom"

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
  style?: CssStyle | undefined
  onChange?: ((value: string, event: Event) => void) | undefined
}>

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
    style={css`
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
        ${props.style}
      `}
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
