import type {Event} from "@zavx0z/dom"
import {normalizeVectorValue, updateVectorValue} from "../src/vector/value.ts"
import {FieldGroup} from "./field-group.tsx"
import {NumberField} from "./number-field.tsx"

export type VectorFieldProps = Readonly<{
  label?: string | undefined
  value: readonly number[]
  axes?: readonly string[] | undefined
  min?: number | undefined
  max?: number | undefined
  step?: number | undefined
  disabled?: boolean | undefined
  readOnly?: boolean | undefined
  title?: string | undefined
  style?: CssStyle | undefined
  onInput?: ((value: readonly number[], event: Event) => void) | undefined
  onChange?: ((value: readonly number[], event: Event) => void) | undefined
}>

export function VectorField(props: VectorFieldProps) {
  const normalized = normalizeVectorValue(props.value, props.axes, props.step)
  const onInput = (index: number, value: number, event: Event) => {
    props.onInput?.(updateVectorValue(normalized.value, index, value), event)
  }
  const onChange = (index: number, value: number, event: Event) => {
    props.onChange?.(updateVectorValue(normalized.value, index, value), event)
  }
  return <FieldGroup
    label={props.label}
    title={props.title}
    style={props.style}
  >
    {normalized.value.map((value, index) => <NumberField
      key={normalized.axes[index]!}
      label={normalized.axes[index]!}
      value={value}
      min={props.min}
      max={props.max}
      step={normalized.step}
      disabled={props.disabled}
      readOnly={props.readOnly}
      style={css`
        width: 0;
        min-width: 0;
        height: 26px;
        flex-grow: 1;
        --field-label-width: 18px;
        --number-field-width: 100%;
        --number-field-height: 26px;
        --number-field-border-width: 0px;
        --number-field-radius: 0px;
        --number-field-shadow: none;

        ${index === 0 && css`
          --field-label-content: rgb(var(--axis-x-500));
        `}

        ${index === 1 && css`
          --field-label-content: rgb(var(--axis-y-500));
        `}

        ${index === 2 && css`
          --field-label-content: rgb(var(--axis-z-500));
        `}

        ${index === 3 && css`
          --field-label-content: var(--widget-list-content);
        `}

        ${index < normalized.value.length - 1 && css`
          border-right: var(--border-width-control) solid var(--widget-regular-outline);
        `}
      `}
      onInput={(next, event) => onInput(index, next, event)}
      onChange={(next, event) => onChange(index, next, event)}
    />)}
  </FieldGroup>
}
