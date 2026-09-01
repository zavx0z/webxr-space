import type {Event} from "@zavx0z/dom"
import {
  ControlGroup,
  type ControlGroupItem
} from "./control-group.tsx"

export type MatrixControlProps = Readonly<{
  value: readonly (readonly number[])[]
  step?: number | undefined
  disabled?: boolean | undefined
  readOnly?: boolean | undefined
  title?: string | undefined
  style?: CssStyle | undefined
  onInput?: ((value: readonly (readonly number[])[], event: Event) => void) | undefined
  onChange?: ((value: readonly (readonly number[])[], event: Event) => void) | undefined
}>

const rowStyle: CssStyle = css`& { width: 100%; }`

type MatrixRowProps = Readonly<{
  row: readonly number[]
  rowIndex: number
  step: number
  disabled: boolean
  readOnly: boolean
  onInput?: MatrixControlProps["onInput"]
  onChange?: MatrixControlProps["onChange"]
  matrix: readonly (readonly number[])[]
}>

function MatrixRow(props: MatrixRowProps) {
  const emit = (kind: "input" | "change", columnKey: string, source: string, event: Event) => {
    const column = Number(columnKey)
    const value = Number(source)
    if (!Number.isInteger(column) || !Number.isFinite(value)) return
    const next = Object.freeze(props.matrix.map((row, rowIndex) => Object.freeze(
      row.map((entry, columnIndex) => rowIndex === props.rowIndex && columnIndex === column ? value : entry)
    )))
    if (kind === "input") props.onInput?.(next, event)
    else props.onChange?.(next, event)
  }
  const items: readonly ControlGroupItem[] = props.row.map((value, column) => ({
    key: String(column),
    label: `${props.rowIndex + 1}${column + 1}`,
    value: String(value),
    type: "number",
    step: props.step,
    readOnly: props.readOnly
  }))
  const onInput = (key: string, value: string, event: Event) => emit("input", key, value, event)
  const onChange = (key: string, value: string, event: Event) => emit("change", key, value, event)
  return <ControlGroup
    items={items}
    disabled={props.disabled}
    style={rowStyle}
    onInput={onInput}
    onChange={onChange}
  />
}

export function MatrixControl(props: MatrixControlProps) {
  const normalized = normalizeMatrix(props)
  return <div title={props.title} style={css`
    & { box-sizing: border-box; display: flex; flex-direction: column; min-width: 0; gap: 2px; }
    ${props.style}
  `}>
    {normalized.value.map((row, rowIndex) => <MatrixRow
      key={String(rowIndex)}
      row={row}
      rowIndex={rowIndex}
      step={normalized.step}
      disabled={props.disabled === true}
      readOnly={props.readOnly === true}
      onInput={props.onInput}
      onChange={props.onChange}
      matrix={normalized.value}
    />)}
  </div>
}


function normalizeMatrix(props: MatrixControlProps): Readonly<{
  value: readonly (readonly number[])[]
  step: number
}> {
  if (!Array.isArray(props.value) || props.value.length < 2 || props.value.length > 4) {
    throw new TypeError("MatrixControl must contain 2 to 4 rows")
  }
  const size = props.value.length
  if (props.value.some(row => !Array.isArray(row) || row.length !== size || !row.every(Number.isFinite))) {
    throw new TypeError("MatrixControl value must be a square finite matrix")
  }
  const step = props.step ?? 0.1
  if (!Number.isFinite(step) || step <= 0) throw new RangeError("MatrixControl step must be positive")
  return Object.freeze({
    value: Object.freeze(props.value.map(row => Object.freeze([...row]))),
    step
  })
}
