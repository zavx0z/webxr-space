import type {Event, HTMLInputElement} from "@zavx0z/dom"

export type CheckboxProps = Readonly<{
  checked: boolean
  indeterminate?: boolean | undefined
  disabled?: boolean | undefined
  title?: string | undefined
  style?: CssStyle | undefined
  onChange?: ((checked: boolean, event: Event) => void) | undefined
}>

export function Checkbox(props: CheckboxProps) {
  const onChange = (event: Event) => props.onChange?.(
    (event.target as HTMLInputElement).checked,
    event
  )
  return <input
    type="checkbox"
    checked={props.checked}
    indeterminate={props.indeterminate === true}
    disabled={props.disabled === true}
    title={props.title}
    aria-checked={props.indeterminate === true ? "mixed" : String(props.checked)}
    onChange={onChange}
    style={css`
        & {
          box-sizing: border-box;
          display: block;
          width: 18px;
          height: 18px;
          padding: 0;
          border: var(--border-width-control) solid var(--widget-option-outline);
          border-radius: 3px;
          background: var(--widget-option-background);
          box-shadow: 0 1px 0 var(--material-widget-emboss);
          color: var(--widget-option-content);
        }
        &:checked {
          background: var(--widget-option-background-selected);
          color: var(--widget-option-content-selected);
        }
        &:indeterminate {
          background: var(--widget-option-background-selected);
          color: var(--widget-option-content-selected);
        }
        &:hover { border-color: var(--widget-hover-outline); }
        &:focus { border-color: var(--widget-focus-outline); }
        &:disabled { opacity: 0.5; box-shadow: none; }
        ${props.style}
      `}
  />
}
