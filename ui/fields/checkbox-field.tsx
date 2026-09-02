import {fieldMetric, labelledFieldHeight} from "../src/fields/layout.ts"

export type CheckboxFieldProps = Readonly<{
  label?: string | undefined
  checked: boolean
  indeterminate?: boolean | undefined
  disabled?: boolean | undefined
  readOnly?: boolean | undefined
  title?: string | undefined
  style?: CssStyle | undefined
  onChange?: ((checked: boolean, event: Event) => void) | undefined
}>

export const checkboxFieldLayout = Object.freeze({
  height(options: Readonly<{label?: boolean | undefined}> = {}): number {
    return labelledFieldHeight(fieldMetric("field-checkbox-height"), options.label === true)
  }
})

export function CheckboxField(props: CheckboxFieldProps) {
  const hasLabel = props.label !== undefined
  const onChange = (input: HTMLInputElement, event: Event) => {
    if (props.readOnly === true) {
      input.checked = props.checked
      input.indeterminate = props.indeterminate === true
      return
    }
    props.onChange?.(input.checked, event)
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
        min-height: var(--field-label-height);
        gap: var(--field-label-gap);
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
        height: var(--field-label-height);
        color: var(--widget-list-content);
        font-size: var(--font-size-sm);

        &[hidden] {
          display: none;
        }
      `}
    >
      {props.label ?? ""}
    </span>
    <span
      data-labelled={hasLabel ? "true" : undefined}
      style={css`
        box-sizing: border-box;
        display: flex;
        align-items: flex-start;
        min-width: 0;

        &[data-labelled="true"] {
          min-height: var(--field-label-height);
          padding-top: var(--field-labelled-choice-padding-top);
          flex-grow: 1;
        }
      `}
    >
      <input
        type="checkbox"
        checked={props.checked}
        indeterminate={props.indeterminate === true}
        disabled={props.disabled === true}
        data-readonly={props.readOnly === true ? "true" : undefined}
        onChange={event => onChange(event.currentTarget, event)}
        style={css`
          box-sizing: border-box;
          display: block;
          width: 16px;
          height: var(--field-checkbox-height);
          padding: 0;
          border: var(--border-width-control) solid var(--widget-option-outline);
          border-radius: var(--radius-small);
          background: var(--widget-option-background);
          box-shadow: 0 1px 0 var(--material-widget-emboss);
          color: var(--widget-option-content);

          &:checked {
            background: var(--widget-option-background-selected);
            color: var(--widget-option-content-selected);
          }

          &:indeterminate {
            background: var(--widget-option-background-selected);
            color: var(--widget-option-content-selected);
          }

          &:hover {
            border-color: var(--widget-hover-outline);
          }

          &:focus {
            border-color: var(--widget-focus-outline);
          }

          &:disabled {
            opacity: 0.5;
            box-shadow: none;
          }

          &[data-readonly="true"] {
            color: var(--widget-text-content-readonly);
          }
        `}
      />
    </span>
  </label>
}
