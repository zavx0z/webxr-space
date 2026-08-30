import type {Event, HTMLInputElement} from "@zavx0z/dom"

export type TextFieldType = "text" | "number" | "search" | "password" | "email" | "url"

export type TextFieldProps = Readonly<{
  value: string
  type?: TextFieldType | undefined
  placeholder?: string | undefined
  min?: number | undefined
  max?: number | undefined
  step?: number | undefined
  disabled?: boolean | undefined
  readOnly?: boolean | undefined
  title?: string | undefined
  "aria-label"?: string | undefined
  style?: CssStyle | undefined
  onInput?: ((value: string, event: Event) => void) | undefined
  onChange?: ((value: string, event: Event) => void) | undefined
}>

export function TextField(props: TextFieldProps) {
  const onInput = (event: Event) => props.onInput?.(
    (event.target as HTMLInputElement).value,
    event
  )
  const onChange = (event: Event) => props.onChange?.(
    (event.target as HTMLInputElement).value,
    event
  )
  return <input
    type={props.type ?? "text"}
    value={props.value}
    placeholder={props.placeholder}
    min={props.min}
    max={props.max}
    step={props.step}
    disabled={props.disabled === true}
    readOnly={props.readOnly === true}
    title={props.title}
    aria-label={props["aria-label"]}
    onInput={onInput}
    onChange={onChange}
    style={css`
        & {
          box-sizing: border-box;
          display: block;
          min-width: 0;
          width: 160px;
          height: var(--control-height-medium);
          padding: 2px 6px;
          border: var(--border-width-control) solid var(--text-field-outline, var(--widget-text-outline));
          border-radius: 3px;
          background: var(--text-field-background, var(--widget-text-background));
          box-shadow: var(--text-field-shadow, 0 1px 0 var(--material-widget-emboss));
          color: var(--text-field-content, var(--widget-text-content));
          font-size: var(--font-size-xs);
          line-height: var(--line-height-control);
          overflow: clip;
        }
        &:hover { border-color: var(--text-field-hover-outline, var(--widget-text-outline-hover)); }
        &:focus {
          border-color: var(--text-field-focus-outline, var(--widget-focus-outline));
          background: var(--text-field-focus-background, var(--text-field-background, var(--widget-text-background)));
        }
        &:disabled { opacity: 0.5; box-shadow: none; }
        &[readonly] {
          background: var(--widget-text-background-readonly);
          color: var(--widget-text-content-readonly);
        }
        ${props.style}
      `}
  />
}
