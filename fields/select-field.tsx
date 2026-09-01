import type {Event, HTMLSelectElement} from "@zavx0z/dom"
import {
  findSelectionOption,
  selectionExceptionalLabel,
  validateSelectionOptions,
  validateSelectionState,
  type SelectionState
} from "../src/selection/options.ts"

export type SelectFieldOption = Readonly<{
  key: string
  value: string
  label: string
  description?: string | undefined
  disabled?: boolean | undefined
  title?: string | undefined
}>
export type SelectFieldDensity = "regular" | "compact"
export type SelectFieldState = SelectionState
export type SelectFieldProps = Readonly<{
  label?: string | undefined
  value: string
  options?: readonly SelectFieldOption[] | undefined
  state?: SelectFieldState | undefined
  density?: SelectFieldDensity | undefined
  disabled?: boolean | undefined
  readOnly?: boolean | undefined
  title?: string | undefined
  style?: CssStyle | undefined
  onChange?: ((value: string, event: Event) => void) | undefined
}>

function SelectOption(props: Readonly<{option: SelectFieldOption; selected: boolean; hidden: boolean}>) {
  return <option
    value={props.option.value}
    selected={props.selected}
    disabled={props.option.disabled === true}
    hidden={props.hidden}
    title={props.option.title ?? props.option.description}
  >
    {props.option.label}
  </option>
}

export function SelectField(props: SelectFieldProps) {
  if (typeof props.value !== "string") throw new TypeError("SelectField value must be a string")
  validateSelectionState(props.state)
  const options = props.options === undefined ? undefined : validateSelectionOptions(props.options)
  const density = props.density ?? "regular"
  if (density !== "regular" && density !== "compact") throw new Error(`Unknown SelectField density: ${density}`)
  const exceptionalLabel = selectionExceptionalLabel(props.state, options)
  const selected = options === undefined ? undefined : findSelectionOption(props.value, options)
  const displayedOptions: readonly SelectFieldOption[] = selected === undefined && exceptionalLabel === undefined
    ? [Object.freeze({key: "__invalid__", value: props.value, label: props.value, disabled: true}), ...(options ?? [])]
    : options ?? []
  const hasLabel = props.label !== undefined
  const onChange = (event: Event) => {
    const select = event.target as HTMLSelectElement
    if (props.readOnly === true) {
      select.value = props.value
      return
    }
    props.onChange?.(select.value, event)
  }
  return <label
    data-has-label={hasLabel ? "true" : undefined}
    title={props.title}
    style={css`
      box-sizing: border-box;
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      width: auto;
      min-width: 0;
      padding: 0;
      color: var(--widget-list-content);

      &[data-has-label="true"] {
        width: 100%;
        min-height: 28px;
        gap: 4px;
      }

      ${props.style}
    `}
  >
    <span
      hidden={!hasLabel}
      style={css`
        box-sizing: border-box;
        display: flex;
        align-items: center;
        width: 40%;
        min-width: 0;
        height: 28px;
        color: var(--widget-list-content);
        font-size: var(--font-size-sm);

        &[hidden] {
          display: none;
        }
      `}
    >
      {props.label ?? ""}
    </span>
    <select
      data-density={density}
      data-labelled={hasLabel ? "true" : undefined}
      data-readonly={props.readOnly === true ? "true" : undefined}
      disabled={props.disabled === true || exceptionalLabel !== undefined}
      title={selected?.description ?? props.title}
      onChange={onChange}
      style={css`
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

        &[data-labelled="true"] {
          width: 0;
          flex-grow: 1;
        }

        &:hover {
          background: var(--widget-hover-background);
        }

        &:active {
          border-color: var(--widget-focus-outline);
          background: var(--widget-text-background-focus);
        }

        &:focus {
          border-color: var(--widget-focus-outline);
          background: var(--widget-text-background-focus);
        }

        &:disabled {
          opacity: 0.5;
          box-shadow: none;
        }

        &[data-density="compact"] {
          height: var(--control-height-medium);
          padding: 2px 6px;
          font-size: var(--font-size-xs);
        }

        &[data-readonly="true"] {
          color: var(--widget-text-content-readonly);
        }
      `}
    >
      <optgroup label="">
        <option
          value=""
          selected={exceptionalLabel !== undefined}
          disabled={true}
          hidden={exceptionalLabel === undefined}
        >
          {exceptionalLabel ?? ""}
        </option>
        {displayedOptions.map(option => <SelectOption
          key={option.key}
          option={option}
          selected={exceptionalLabel === undefined && option.value === props.value}
          hidden={exceptionalLabel !== undefined}
        />)}
      </optgroup>
    </select>
  </label>
}
