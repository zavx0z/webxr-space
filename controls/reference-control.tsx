import type {Event} from "@zavx0z/dom"
import {Button, IconButton} from "../button.tsx"
import {closeIcon, pickerIcon, resourceIcon} from "../icon-assets.ts"

export type ReferenceControlValue = Readonly<{
  id: string
  label: string
  kind?: string | undefined
}>
export type ReferenceControlDensity = "regular" | "compact"

export type ReferenceControlProps = Readonly<{
  value: ReferenceControlValue | null
  placeholder?: string | undefined
  title?: string | undefined
  disabled?: boolean | undefined
  readOnly?: boolean | undefined
  density?: ReferenceControlDensity | undefined
  style?: CssStyle | undefined
  onActivate?: ((event: Event) => void) | undefined
  onPick?: ((event: Event) => void) | undefined
  onClear?: ((event: Event) => void) | undefined
}>

const buttonStyle: CssStyle = css`
  & { height: 26px; padding: 3px 7px; border: none; border-right: 1px solid var(--widget-regular-outline); border-radius: 0; box-shadow: none; color: var(--widget-regular-content); font-size: 11px; }
`
const valueStyle: CssStyle = css`& { width: 0; min-width: 0; flex-grow: 1; justify-content: flex-start; }`
const actionStyle: CssStyle = css`& { width: 28px; min-width: 28px; justify-content: center; }`
const lastActionStyle: CssStyle = css`& { border-right: 0; }`
const compactButtonStyle: CssStyle = css`& { height: 22px; }`
const hiddenStyle: CssStyle = css`& { display: none; }`

export function ReferenceControl(props: ReferenceControlProps) {
  assertReferenceControlProps(props)
  const density = props.density ?? "regular"
  const locked = props.disabled === true || props.readOnly === true
  const pickUnavailable = props.onPick === undefined
  const clearUnavailable = props.value === null || props.onClear === undefined
  const label = props.value?.label ?? props.placeholder ?? "Not selected"

  return <div
    title={props.title ?? props.value?.kind}
    aria-disabled={String(locked)}
    data-density={density}
    style={css`
        & {
          box-sizing: border-box;
          display: flex;
          flex-direction: row;
          min-width: 0;
          width: 260px;
          height: var(--control-height-large);
          gap: 0;
          padding: 0;
          overflow: clip;
          border: var(--border-width-control) solid var(--widget-regular-outline);
          border-radius: 4px;
          background: var(--widget-regular-background);
          box-shadow: 0 1px 0 var(--material-widget-emboss);
        }
        &[data-density="compact"] { width: 190px; height: 24px; }
        ${props.style}
      `}
  >
    <Button
      label={label}
      startIcon={resourceIcon}
      variant="text"
      title={props.value?.kind ?? props.title}
      disabled={locked || props.onActivate === undefined}
      style={css`${buttonStyle}${valueStyle}${density === "compact" && compactButtonStyle}`}
      onClick={props.onActivate}
    />
    <IconButton
      label="Choose reference"
      iconSrc={pickerIcon}
      title="Choose reference"
      disabled={locked || pickUnavailable}
      style={css`${buttonStyle}${actionStyle}${density === "compact" && compactButtonStyle}${pickUnavailable && hiddenStyle}`}
      onClick={props.onPick}
    />
    <IconButton
      label="Clear reference"
      iconSrc={closeIcon}
      title="Clear reference"
      disabled={locked || clearUnavailable}
      style={css`${buttonStyle}${actionStyle}${lastActionStyle}${density === "compact" && compactButtonStyle}${clearUnavailable && hiddenStyle}`}
      onClick={props.onClear}
    />
  </div>
}


function assertReferenceControlProps(props: ReferenceControlProps): void {
  if (props.value !== null) {
    if (typeof props.value.id !== "string" || props.value.id.length === 0) {
      throw new TypeError("ReferenceControl value id must not be empty")
    }
    if (typeof props.value.label !== "string") {
      throw new TypeError("ReferenceControl value label must be a string")
    }
  }
  const density = props.density ?? "regular"
  if (density !== "regular" && density !== "compact") {
    throw new Error(`Unknown ReferenceControl density: ${density}`)
  }
}
