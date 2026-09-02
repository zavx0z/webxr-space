import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import {
  fieldDensityHeight,
  labelledFieldHeight,
  resolveFieldDensity
} from "../src/fields/layout.ts"

export type FieldGroupDensity = "regular" | "compact"

export type FieldGroupProps = Readonly<{
  label?: string | undefined
  children: readonly JsxSourceElement[]
  density?: FieldGroupDensity | undefined
  title?: string | undefined
  style?: CssStyle | undefined
}>

export const fieldGroupLayout = Object.freeze({
  height(options: Readonly<{
    density?: FieldGroupDensity | undefined
    label?: boolean | undefined
  }> = {}): number {
    return labelledFieldHeight(
      fieldDensityHeight(options.density ?? "regular"),
      options.label === true
    )
  }
})

export function FieldGroup(props: FieldGroupProps) {
  if (props.children.length === 0) {
    throw new TypeError("FieldGroup children must be a non-empty array")
  }
  const density = resolveFieldDensity(props.density, "regular", "FieldGroup")
  const hasLabel = props.label !== undefined
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
      data-field-group=""
      data-labelled={hasLabel ? "true" : undefined}
      data-density={density}
      style={css`
        box-sizing: border-box;
        display: flex;
        flex-direction: row;
        width: 100%;
        min-width: 0;
        height: var(--control-height-large);
        --field-group-content-height: var(--field-group-content-height-regular);
        gap: 0;
        padding: 0;
        border: var(--border-width-control) solid var(--widget-regular-outline);
        border-radius: 4px;
        overflow: clip;
        background: var(--widget-regular-background);
        box-shadow: 0 1px 0 var(--material-widget-emboss);

        &[data-labelled="true"] {
          width: 0;
          flex-grow: 1;
        }

        &[data-density="compact"] {
          height: var(--field-height-compact);
          --field-group-content-height: var(--field-group-content-height-compact);
        }

        &:focus-within {
          border-color: var(--widget-focus-outline);
        }
      `}
    >
      {props.children}
    </div>
  </div>
}
