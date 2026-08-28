import {type FunctionComponent} from "@zavx0z/react"
import {
  Checkbox,
  checkboxComponentCss,
  type CheckboxProps
} from "./checkbox-component.tsx"

export type ProgressCheckboxProps = CheckboxProps

export const progressCheckboxComponentCss = checkboxComponentCss

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

export type ProgressCheckboxComponent = FunctionComponent<ProgressCheckboxProps>

export * from "./progress-checkbox.ts"
