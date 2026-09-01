import type {Event} from "@zavx0z/dom"
import {IconButton} from "../button.tsx"
import {folderIcon} from "../icon-assets.ts"
import {TextControl} from "./text-control.tsx"

export type PathControlDensity = "regular" | "compact"

export type PathControlProps = Readonly<{
  value: string
  placeholder?: string | undefined
  disabled?: boolean | undefined
  readOnly?: boolean | undefined
  density?: PathControlDensity | undefined
  title?: string | undefined
  browseTitle?: string | undefined
  style?: CssStyle | undefined
  onInput?: ((value: string, event: Event) => void) | undefined
  onChange?: ((value: string, event: Event) => void) | undefined
  onBrowse?: ((event: Event) => void) | undefined
}>

const inputStyle: CssStyle = css`
  & { width: 0; min-width: 0; height: 26px; flex-grow: 1; padding: 3px 7px; border: none; border-right: 1px solid var(--widget-regular-outline); border-radius: 0; box-shadow: none; color: var(--widget-regular-content); font-size: 11px; --text-control-background: transparent; --text-control-hover-outline: transparent; --text-control-focus-outline: transparent; --text-control-focus-background: var(--widget-text-background-focus); }
`
const browseStyle: CssStyle = css`
  & { width: 30px; min-width: 30px; height: 26px; padding: 0; border: none; border-radius: 0; box-shadow: none; font-size: 12px; color: var(--widget-regular-content); }
`
const compactInputStyle: CssStyle = css`& { height: 22px; }`
const readOnlyInputStyle: CssStyle = css`& { opacity: 0.5; }`
const hiddenStyle: CssStyle = css`& { display: none; }`

export function PathControl(props: PathControlProps) {
  assertPathControlProps(props)
  const density = props.density ?? "regular"
  const locked = props.disabled === true || props.readOnly === true
  const browseUnavailable = props.onBrowse === undefined

  return <div
    title={props.title}
    aria-disabled={String(locked)}
    data-density={density}
    style={css`
        & {
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
        }
        &[data-density="compact"] { width: 220px; height: 24px; }
        ${props.style}
      `}
  >
    <TextControl
      value={props.value}
      placeholder={props.placeholder}
      disabled={props.disabled === true}
      readOnly={props.readOnly === true}
      title={props.title}
      style={css`${inputStyle}${density === "compact" && compactInputStyle}${props.readOnly === true && readOnlyInputStyle}`}
      onInput={props.onInput}
      onChange={props.onChange}
    />
    <IconButton
      label="Browse"
      iconSrc={folderIcon}
      variant="contained"
      title={props.browseTitle ?? "Browse"}
      disabled={locked || browseUnavailable}
      style={css`${browseStyle}${density === "compact" && compactInputStyle}${browseUnavailable && hiddenStyle}`}
      onClick={props.onBrowse}
    />
  </div>
}


function assertPathControlProps(props: PathControlProps): void {
  if (typeof props.value !== "string") throw new TypeError("PathControl value must be a string")
  const density = props.density ?? "regular"
  if (density !== "regular" && density !== "compact") {
    throw new Error(`Unknown PathControl density: ${density}`)
  }
}
