import {Button, IconButton} from "../buttons/button.tsx"
import {fieldDensityHeight, fieldMetric, labelledFieldHeight} from "../src/fields/layout.ts"
import {closeIcon, pickerIcon, resourceIcon} from "../src/shared/icon-assets.ts"

export type ReferenceFieldValue = Readonly<{ id: string; label: string; kind?: string | undefined }>
export type ReferenceFieldDensity = "regular" | "compact"
export type ReferenceFieldProps = Readonly<{
  label?: string | undefined
  value: ReferenceFieldValue | null
  placeholder?: string | undefined
  disabled?: boolean | undefined
  readOnly?: boolean | undefined
  density?: ReferenceFieldDensity | undefined
  title?: string | undefined
  style?: CssStyle | undefined
  onActivate?: ((event: Event) => void) | undefined
  onPick?: ((event: Event) => void) | undefined
  onClear?: ((event: Event) => void) | undefined
}>

export const referenceFieldLayout = Object.freeze({
  height(options: Readonly<{
    density?: ReferenceFieldDensity | undefined
    label?: boolean | undefined
  }> = {}): number {
    const height = options.density === "compact"
      ? fieldMetric("field-reference-height-compact")
      : fieldDensityHeight("regular")
    return labelledFieldHeight(height, options.label === true)
  }
})

const buttonStyle: CssStyle = css`
  height: var(--field-frame-content-height-regular);
  padding: 3px 7px;
  border: none;
  border-right: 1px solid var(--widget-regular-outline);
  border-radius: 0;
  box-shadow: none;
  color: var(--widget-regular-content);
  font-size: 11px;
`
const actionStyle: CssStyle = css`
  width: 28px;
  min-width: 28px;
  justify-content: center;
`
const compactButtonStyle: CssStyle = css`
  height: var(--field-frame-content-height-compact);
`
const hiddenStyle: CssStyle = css`
  display: none;
`

export function ReferenceField(props: ReferenceFieldProps) {
  validateReferenceField(props)
  const density = props.density ?? "regular"
  const hasLabel = props.label !== undefined
  const pickUnavailable = props.onPick === undefined
  const clearUnavailable = props.value === null || props.onClear === undefined
  const valueLabel = props.value?.label ?? props.placeholder ?? "Not selected"
  return <div
    data-has-label={hasLabel ? "true" : undefined}
    title={props.title ?? props.value?.kind}
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
        min-height: var(--field-label-height);
        gap: var(--field-label-gap);
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
        height: var(--field-label-height);
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
        width: 260px;
        height: var(--control-height-large);
        gap: 0;
        padding: 0;
        overflow: clip;
        border: var(--border-width-control) solid var(--widget-regular-outline);
        border-radius: 4px;
        background: var(--widget-regular-background);
        box-shadow: 0 1px 0 var(--material-widget-emboss);

        &[data-labelled="true"] {
          width: 0;
          flex-grow: 1;
        }

        &[data-density="compact"] {
          width: 190px;
          height: var(--field-reference-height-compact);
        }

        &[data-labelled="true"][data-density="compact"] {
          width: 0;
        }

        &[data-readonly="true"] {
          color: var(--widget-text-content-readonly);
        }
      `}
    >
      <Button
        label={valueLabel}
        startIcon={resourceIcon}
        variant="text"
        title={props.value?.kind ?? props.title}
        disabled={props.disabled === true || props.onActivate === undefined}
        style={css`
          ${buttonStyle}

          width: 0;
          min-width: 0;
          flex-grow: 1;
          justify-content: flex-start;

          ${density === "compact" && compactButtonStyle}
        `}
        onClick={props.onActivate}
      />
      <IconButton
        label="Choose reference"
        iconSrc={pickerIcon}
        title="Choose reference"
        disabled={props.disabled === true || props.readOnly === true || pickUnavailable}
        style={css`
          ${buttonStyle}

          ${actionStyle}

          ${density === "compact" && compactButtonStyle}

          ${pickUnavailable && hiddenStyle}
        `}
        onClick={props.onPick}
      />
      <IconButton
        label="Clear reference"
        iconSrc={closeIcon}
        title="Clear reference"
        disabled={props.disabled === true || props.readOnly === true || clearUnavailable}
        style={css`
          ${buttonStyle}

          ${actionStyle}

          border-right: 0;

          ${density === "compact" && compactButtonStyle}

          ${clearUnavailable && hiddenStyle}
        `}
        onClick={props.onClear}
      />
    </div>
  </div>
}

function validateReferenceField(props: ReferenceFieldProps): void {
  if (props.value !== null) {
    if (typeof props.value.id !== "string" || props.value.id.length === 0) throw new TypeError("ReferenceField value id must not be empty")
    if (typeof props.value.label !== "string") throw new TypeError("ReferenceField value label must be a string")
  }
  const density = props.density ?? "regular"
  if (density !== "regular" && density !== "compact") throw new Error(`Unknown ReferenceField density: ${density}`)
}
