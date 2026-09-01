import type {Event} from "@zavx0z/dom"

export type SwitchFieldProps = Readonly<{
  label?: string | undefined
  checked: boolean
  disabled?: boolean | undefined
  readOnly?: boolean | undefined
  title?: string | undefined
  style?: CssStyle | undefined
  onChange?: ((checked: boolean, event: Event) => void) | undefined
}>

export function SwitchField(props: SwitchFieldProps) {
  const hasLabel = props.label !== undefined
  const onClick = (event: Event) => {
    if (props.readOnly !== true) props.onChange?.(!props.checked, event)
  }
  return <div
    data-has-label={hasLabel ? "true" : undefined}
    title={props.title}
    style={css`
      & { box-sizing: border-box; display: flex; flex-direction: row; align-items: flex-start; width: auto; min-width: 0; padding: 0; color: var(--widget-list-content); }
      &[data-has-label="true"] { width: 100%; min-height: 28px; gap: 4px; }
      ${props.style}
    `}
  >
    <span hidden={!hasLabel} style={css`
      & { box-sizing: border-box; display: flex; align-items: center; width: 40%; min-width: 0; height: 28px; color: var(--widget-list-content); font-size: var(--font-size-sm); }
      &[hidden] { display: none; }
    `}>{props.label ?? ""}</span>
    <span data-labelled={hasLabel ? "true" : undefined} style={css`
      & { box-sizing: border-box; display: flex; align-items: flex-start; min-width: 0; }
      &[data-labelled="true"] { min-height: 28px; padding-top: 5px; flex-grow: 1; }
    `}>
      <button
        type="button"
        role="switch"
        aria-checked={String(props.checked)}
        disabled={props.disabled === true}
        data-readonly={props.readOnly === true ? "true" : undefined}
        onClick={onClick}
        style={css`
          & { box-sizing: border-box; display: flex; align-items: center; width: 32px; height: 18px; padding: 2px; border: var(--border-width-control) solid var(--widget-regular-outline); border-radius: 4px; background: var(--widget-regular-background); box-shadow: 0 1px 0 var(--material-widget-emboss); overflow: clip; }
          &:hover { border-color: var(--widget-hover-outline); }
          &:focus { border-color: var(--widget-focus-outline); }
          &:disabled { opacity: 0.5; box-shadow: none; }
          &[aria-checked="true"] { background: var(--widget-regular-background-selected); }
          &[data-readonly="true"] { color: var(--widget-text-content-readonly); }
        `}
      >
        <span data-checked={props.checked ? "true" : undefined} style={css`
          & { display: block; width: 12px; height: 12px; border-radius: 6px; background: var(--widget-regular-content); }
          &[data-checked="true"] { transform: translateX(14px); }
        `}></span>
      </button>
    </span>
  </div>
}
