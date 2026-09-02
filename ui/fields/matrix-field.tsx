import {normalizeMatrixValue, updateMatrixValue} from "../src/matrix/value.ts"
import {matrixFieldHeight} from "../src/fields/layout.ts"
import {FieldGroup, type FieldGroupDensity} from "./field-group.tsx"
import {NumberField} from "./number-field.tsx"

export type MatrixFieldDensity = FieldGroupDensity

export type MatrixFieldProps = Readonly<{
  label?: string | undefined
  value: readonly (readonly number[])[]
  step?: number | undefined
  density?: MatrixFieldDensity | undefined
  disabled?: boolean | undefined
  readOnly?: boolean | undefined
  title?: string | undefined
  style?: CssStyle | undefined
  onInput?: ((value: readonly (readonly number[])[], event: Event) => void) | undefined
  onChange?: ((value: readonly (readonly number[])[], event: Event) => void) | undefined
}>

export const matrixFieldLayout = Object.freeze({
  height(options: Readonly<{
    size: number
    density?: MatrixFieldDensity | undefined
  }>): number {
    return matrixFieldHeight(options.size, options.density ?? "regular")
  }
})

type MatrixRowProps = Readonly<{
  row: readonly number[]
  rowIndex: number
  step: number
  matrix: readonly (readonly number[])[]
  density: MatrixFieldDensity
  disabled: boolean
  readOnly: boolean
  onInput?: MatrixFieldProps["onInput"]
  onChange?: MatrixFieldProps["onChange"]
}>

function MatrixRow(props: MatrixRowProps) {
  const update = (column: number, value: number): readonly (readonly number[])[] =>
    updateMatrixValue(props.matrix, props.rowIndex, column, value)
  return <FieldGroup
    density={props.density}
    style={css`
      width: 100%;
    `}
  >
    {props.row.map((value, column) => <NumberField
      key={String(column)}
      label={`${props.rowIndex + 1}${column + 1}`}
      value={value}
      step={props.step}
      disabled={props.disabled}
      readOnly={props.readOnly}
      style={css`
        width: 0;
        min-width: 0;
        height: var(--field-group-content-height);
        flex-grow: 1;
        --field-label-width: 20px;
        border-width: 0;
        border-radius: 0;
        box-shadow: none;

        ${column < props.row.length - 1 && css`
          border-right: var(--border-width-control) solid var(--widget-regular-outline);
        `}
      `}
      onInput={(next, event) => props.onInput?.(update(column, next), event)}
      onChange={(next, event) => props.onChange?.(update(column, next), event)}
    />)}
  </FieldGroup>
}

export function MatrixField(props: MatrixFieldProps) {
  const normalized = normalizeMatrixValue(props.value, props.step)
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
      style={css`
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        width: 100%;
        min-width: 0;
        gap: var(--field-matrix-row-gap);

        &[data-labelled="true"] {
          width: 0;
          flex-grow: 1;
        }
      `}
    >
      {normalized.value.map((row, rowIndex) => <MatrixRow
        key={String(rowIndex)}
        row={row}
        rowIndex={rowIndex}
        step={normalized.step}
        matrix={normalized.value}
        density={props.density ?? "regular"}
        disabled={props.disabled === true}
        readOnly={props.readOnly === true}
        onInput={props.onInput}
        onChange={props.onChange}
      />)}
    </div>
  </div>
}
