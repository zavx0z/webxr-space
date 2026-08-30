import {
  Checkbox,
  type CheckboxProps
} from "./checkbox.tsx"

export type ProgressCheckboxProps = CheckboxProps

export function ProgressCheckbox(props: ProgressCheckboxProps) {
  return <Checkbox
    checked={props.checked}
    indeterminate={props.indeterminate}
    disabled={props.disabled}
    title={props.title}
    style={props.style}
    onChange={props.onChange}
  />
}
