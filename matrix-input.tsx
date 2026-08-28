import type {Event} from "@zavx0z/dom"
import {defineStyles, type StyleValue} from "@zavx0z/react"
import {
  ControlGroup,
  controlGroupCss,
  type ControlGroupItem
} from "./control-group.tsx"

export type MatrixInputProps = Readonly<{
  value: readonly (readonly number[])[]
  step?: number | undefined
  disabled?: boolean | undefined
  readOnly?: boolean | undefined
  title?: string | undefined
  style?: StyleValue
  onInput?: ((value: readonly (readonly number[])[], event: Event) => void) | undefined
  onChange?: ((value: readonly (readonly number[])[], event: Event) => void) | undefined
}>

export const matrixInputStyles = defineStyles("@ui/components/matrix-input", {
  root: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    gap: 2
  },
  row: {width: "100%"}
})

export const matrixInputCss = `${controlGroupCss}\n${matrixInputStyles.cssText}`

type MatrixRowProps = Readonly<{
  row: readonly number[]
  rowIndex: number
  step: number
  disabled: boolean
  readOnly: boolean
  onInput?: MatrixInputProps["onInput"]
  onChange?: MatrixInputProps["onChange"]
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
    style={matrixInputStyles.row}
    onInput={onInput}
    onChange={onChange}
  />
}

export function MatrixInput(props: MatrixInputProps) {
  const normalized = normalizeMatrix(props)
  return <div title={props.title} style={[matrixInputStyles.root, props.style]}>
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


function normalizeMatrix(props: MatrixInputProps): Readonly<{
  value: readonly (readonly number[])[]
  step: number
}> {
  if (!Array.isArray(props.value) || props.value.length < 2 || props.value.length > 4) {
    throw new TypeError("MatrixInput must contain 2 to 4 rows")
  }
  const size = props.value.length
  if (props.value.some(row => !Array.isArray(row) || row.length !== size || !row.every(Number.isFinite))) {
    throw new TypeError("MatrixInput value must be a square finite matrix")
  }
  const step = props.step ?? 0.1
  if (!Number.isFinite(step) || step <= 0) throw new RangeError("MatrixInput step must be positive")
  return Object.freeze({
    value: Object.freeze(props.value.map(row => Object.freeze([...row]))),
    step
  })
}
