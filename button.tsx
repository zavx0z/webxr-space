import type {Event} from "@zavx0z/dom"

export type ButtonVariant = "text" | "outlined" | "contained" | "glass"
export type ButtonTone = "neutral" | "primary" | "success" | "warning" | "error"
export type ButtonSize = "small" | "medium" | "large"
export type ButtonIconPosition = "start" | "end"

export type ButtonProps = Readonly<{
  label: string
  variant?: ButtonVariant | undefined
  tone?: ButtonTone | undefined
  size?: ButtonSize | undefined
  disabled?: boolean | undefined
  selected?: boolean | undefined
  role?: string | undefined
  tabIndex?: number | undefined
  "aria-expanded"?: boolean | string | undefined
  "aria-haspopup"?: string | undefined
  "aria-label"?: string | undefined
  "aria-selected"?: boolean | string | undefined
  "aria-controls"?: string | undefined
  title?: string | undefined
  iconSrc?: string | undefined
  startIcon?: string | undefined
  endIcon?: string | undefined
  iconPosition?: ButtonIconPosition | undefined
  iconOnly?: boolean | undefined
  iconSize?: number | undefined
  style?: CssStyle | undefined
  onClick?: ((event: Event) => void) | undefined
  onKeyDown?: ((event: Event) => void) | undefined
}>

export type IconButtonProps = Readonly<{
  label: string
  iconSrc: string
  variant?: ButtonVariant | undefined
  tone?: ButtonTone | undefined
  size?: ButtonSize | undefined
  disabled?: boolean | undefined
  selected?: boolean | undefined
  title?: string | undefined
  iconSize?: number | undefined
  style?: CssStyle | undefined
  onClick?: ((event: Event) => void) | undefined
}>

export function Button(props: ButtonProps) {
  const variant = props.variant ?? "contained"
  const tone = props.tone ?? "neutral"
  const size = props.size ?? "medium"
  const position = props.iconPosition ?? (
    props.endIcon !== undefined && props.startIcon === undefined ? "end" : "start"
  )
  const sharedIcon = props.iconSrc ?? ""
  const startIcon = props.startIcon ?? (position === "start" ? sharedIcon : "")
  const endIcon = props.endIcon ?? (position === "end" ? sharedIcon : "")
  const iconSize = props.iconSize ?? 14
  const showLabel = props.iconOnly !== true && props.label.length > 0

  return <button
    type="button"
    title={props.title}
    disabled={props.disabled === true}
    role={props.role}
    tabIndex={props.tabIndex ?? 0}
    aria-pressed={props.selected === undefined ? undefined : String(props.selected)}
    aria-expanded={props["aria-expanded"]}
    aria-haspopup={props["aria-haspopup"]}
    aria-label={props["aria-label"]}
    aria-selected={props["aria-selected"]}
    aria-controls={props["aria-controls"]}
    data-variant={variant}
    data-tone={tone}
    data-size={size}
    onClick={props.onClick}
    onKeyDown={props.onKeyDown}
    style={css`
        & {
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 92px;
          min-width: 22px;
          height: var(--control-height-medium);
          gap: var(--control-content-gap);
          padding: 2px 6px;
          border: var(--border-width-control) solid var(--widget-regular-outline);
          border-radius: 3px;
          background: var(--widget-regular-background);
          box-shadow: 0 1px 0 var(--material-widget-emboss);
          color: var(--widget-regular-content);
          font-size: var(--font-size-xs);
          line-height: var(--line-height-control);
          overflow: clip;
        }
        &:hover {
          background: var(--widget-hover-background);
        }
        &:active {
          background: var(--widget-regular-background-selected);
          color: var(--widget-regular-content-selected);
        }
        &:focus {
          border-color: var(--widget-focus-outline);
        }
        &:disabled {
          opacity: 0.5;
          box-shadow: none;
        }
        &[data-variant="text"] { border-color: transparent; background: transparent; box-shadow: none; }
        &[data-variant="outlined"] { background: transparent; box-shadow: none; }
        &[data-variant="glass"] { background: var(--widget-regular-background-glass); }
        &[data-size="small"] { width: 76px; height: var(--control-height-small); min-width: 18px; padding: 1px 5px; font-size: var(--font-size-xs); }
        &[data-size="large"] { width: 112px; height: var(--control-height-large); min-width: 28px; padding: 3px 8px; font-size: var(--font-size-sm); }
        &[data-variant="contained"][data-tone="primary"] { background: var(--widget-regular-background-selected); }
        &[data-variant="contained"][data-tone="success"] { background: var(--state-success); }
        &[data-variant="contained"][data-tone="warning"] { background: var(--state-warning); }
        &[data-variant="contained"][data-tone="error"] { background: var(--state-error); }
        &[aria-pressed="true"] { background: var(--widget-regular-background-selected); color: var(--widget-regular-content-selected); }
        &[aria-pressed="true"]:hover { background: var(--widget-regular-background-selected); }
        ${props.style}
      `}
  >
    <img
      src={startIcon}
      alt=""
      aria-hidden="true"
      width={iconSize}
      height={iconSize}
      hidden={startIcon === ""}
      style={css`
          & {
            width: var(--control-icon-size);
            height: var(--control-icon-size);
            object-fit: contain;
            flex-shrink: 0;
          }
          &[hidden] { display: none; }
        `}
    />
    <span hidden={!showLabel} style={css`
        & {
          display: inline;
          min-width: 0;
          overflow: clip;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        &[hidden] { display: none; }
      `}>{props.label}</span>
    <img
      src={endIcon}
      alt=""
      aria-hidden="true"
      width={iconSize}
      height={iconSize}
      hidden={endIcon === ""}
      style={css`
          & {
            width: var(--control-icon-size);
            height: var(--control-icon-size);
            object-fit: contain;
            flex-shrink: 0;
          }
          &[hidden] { display: none; }
        `}
    />
  </button>
}

export function IconButton(props: IconButtonProps) {
  return <Button
    label={props.label}
    iconSrc={props.iconSrc}
    iconPosition="start"
    iconOnly={true}
    iconSize={props.iconSize}
    variant={props.variant ?? "text"}
    tone={props.tone}
    size={props.size}
    disabled={props.disabled}
    selected={props.selected}
    title={props.title ?? props.label}
    aria-label={props.label}
    style={props.style}
    onClick={props.onClick}
  />
}
