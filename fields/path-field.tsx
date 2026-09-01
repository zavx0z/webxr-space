import type {Event} from "@zavx0z/dom"
import {IconButton} from "../button.tsx"
import {folderIcon} from "../icon-assets.ts"
import {TextField} from "./text-field.tsx"

export type PathFieldDensity = "regular" | "compact"
export type PathFieldProps = Readonly<{
  label?: string | undefined
  value: string
  placeholder?: string | undefined
  disabled?: boolean | undefined
  readOnly?: boolean | undefined
  density?: PathFieldDensity | undefined
  title?: string | undefined
  browseTitle?: string | undefined
  style?: CssStyle | undefined
  onInput?: ((value: string, event: Event) => void) | undefined
  onChange?: ((value: string, event: Event) => void) | undefined
  onBrowse?: ((event: Event) => void) | undefined
}>

export function PathField(props: PathFieldProps) {
  if (typeof props.value !== "string") throw new TypeError("PathField value must be a string")
  const density = props.density ?? "regular"
  if (density !== "regular" && density !== "compact") throw new Error(`Unknown PathField density: ${density}`)
  const hasLabel = props.label !== undefined
  const browseUnavailable = props.onBrowse === undefined
  return <div
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
    <div
      data-labelled={hasLabel ? "true" : undefined}
      data-density={density}
      data-readonly={props.readOnly === true ? "true" : undefined}
      style={css`
        box-sizing: border-box;
        display: flex;
        flex-direction: row;
        min-width: 0;
        width: 320px;
        height: var(--control-height-large);
        gap: 0;
        padding: 0;
        overflow: clip;
        border: var(--border-width-control) solid var(--widget-regular-outline);
        border-radius: 4px;
        background: var(--widget-text-background);
        box-shadow: 0 1px 0 var(--material-widget-emboss);

        &[data-labelled="true"] {
          width: 0;
          flex-grow: 1;
        }

        &[data-density="compact"] {
          width: 220px;
          height: 24px;
        }

        &[data-labelled="true"][data-density="compact"] {
          width: 0;
        }
      `}
    >
      <TextField
        value={props.value}
        placeholder={props.placeholder}
        disabled={props.disabled}
        readOnly={props.readOnly}
        title={props.title}
        style={css`
          width: 0;
          min-width: 0;
          flex-grow: 1;
          border-right: 1px solid var(--widget-regular-outline);
          --text-field-width: 100%;
          --text-field-height: 26px;
          --text-field-padding: 3px 7px;
          --text-field-border-width: 0px;
          --text-field-radius: 0px;
          --text-field-shadow: none;
          --text-field-font-size: 11px;
          --text-field-background: transparent;
          --text-field-hover-outline: transparent;
          --text-field-focus-outline: transparent;
          --text-field-focus-background: var(--widget-text-background-focus);

          ${density === "compact" && css`
            --text-field-height: 22px;
          `}

          ${props.readOnly === true && css`
            opacity: 0.5;
          `}
        `}
        onInput={props.onInput}
        onChange={props.onChange}
      />
      <IconButton
        label="Browse"
        iconSrc={folderIcon}
        variant="contained"
        title={props.browseTitle ?? "Browse"}
        disabled={props.disabled === true || props.readOnly === true || browseUnavailable}
        style={css`
          width: 30px;
          min-width: 30px;
          height: 26px;
          padding: 0;
          border: none;
          border-radius: 0;
          box-shadow: none;
          color: var(--widget-regular-content);
          font-size: 12px;

          ${density === "compact" && css`
            height: 22px;
          `}

          ${browseUnavailable && css`
            display: none;
          `}
        `}
        onClick={props.onBrowse}
      />
    </div>
  </div>
}
