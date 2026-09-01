import type {Event} from "@zavx0z/dom"

export type SwitcherProps = Readonly<{
  checked: boolean
  disabled?: boolean | undefined
  title?: string | undefined
  style?: CssStyle | undefined
  onChange?: ((checked: boolean, event: Event) => void) | undefined
}>

export function Switcher(props: SwitcherProps) {
  const onClick = (event: Event) => props.onChange?.(!props.checked, event)
  return <button
    type="button"
    role="switch"
    aria-checked={String(props.checked)}
    disabled={props.disabled === true}
    title={props.title}
    onClick={onClick}
    style={css`
        & {
          box-sizing: border-box;
          display: flex;
          align-items: center;
          width: 32px;
          height: 18px;
          padding: 2px;
          border: var(--border-width-control) solid var(--widget-regular-outline);
          border-radius: 4px;
          background: var(--widget-regular-background);
          box-shadow: 0 1px 0 var(--material-widget-emboss);
          overflow: clip;
        }
        &:hover { border-color: var(--widget-hover-outline); }
        &:focus { border-color: var(--widget-focus-outline); }
        &:disabled { opacity: 0.5; box-shadow: none; }
        &[aria-checked="true"] { background: var(--widget-regular-background-selected); }
        ${props.style}
      `}
  >
    <span data-checked={props.checked ? "true" : undefined} style={css`
        & {
          display: block;
          width: 12px;
          height: 12px;
          border-radius: 6px;
          background: var(--widget-regular-content);
        }
        &[data-checked="true"] { transform: translateX(14px); }
      `}></span>
  </button>
}
