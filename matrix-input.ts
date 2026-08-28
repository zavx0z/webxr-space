import type {Document, Event, HTMLElement, HTMLInputElement} from "@zavx0z/dom"
import {controlGroupCss, createControlGroup, type ControlGroupController} from "./control-group.ts"

import type {MatrixInputProps} from "./matrix-input-component.tsx"
export type MatrixInputController = Readonly<{element: HTMLElement; refs: Readonly<{root: HTMLElement; rows: ReadonlyMap<string, HTMLElement>; inputs: ReadonlyMap<string, HTMLInputElement>}>; props: MatrixInputProps; update(props: MatrixInputProps): void; dispose(): void}>

export const matrixInputCss = `${controlGroupCss}\n.ui-matrix-input { box-sizing: border-box; display: flex; flex-direction: column; gap: 2px; min-width: 0; }\n.ui-matrix-input__row { width: 100%; }`

type RowEntry = {controller: ControlGroupController; inputs: ReadonlyMap<string, HTMLInputElement>}

export function createMatrixInput(document: Document, initialProps: MatrixInputProps): MatrixInputController {
  const root = document.createElement("div")
  const entries = new Map<string, RowEntry>()
  const rows = new Map<string, HTMLElement>()
  const inputs = new Map<string, HTMLInputElement>()
  let current = normalize(initialProps)
  let disposed = false
  const emit = (kind: "input" | "change", row: number, columnKey: string, value: string, event: Event): void => {
    const column = Number(columnKey)
    const number = Number(value)
    if (!Number.isInteger(column) || !Number.isFinite(number)) return
    const next = current.value.map((items, rowIndex) => Object.freeze(items.map((item, columnIndex) => rowIndex === row && columnIndex === column ? number : item)))
    if (kind === "input") current.onInput?.(Object.freeze(next), event)
    else current.onChange?.(Object.freeze(next), event)
  }
  const update = (props: MatrixInputProps): void => {
    if (disposed) throw new Error("MatrixInput controller is disposed")
    const next = normalize(props)
    root.className = "ui-matrix-input"
    root.title = next.title ?? ""
    const retained = new Set(next.value.map((_, index) => String(index)))
    for (const [key, entry] of entries) {
      if (retained.has(key)) continue
      entry.controller.dispose()
      entry.controller.element.remove()
      entries.delete(key)
      rows.delete(key)
      for (const inputKey of [...inputs.keys()]) if (inputKey.startsWith(`${key}:`)) inputs.delete(inputKey)
    }
    const ordered: HTMLElement[] = []
    next.value.forEach((row, rowIndex) => {
      const key = String(rowIndex)
      let entry = entries.get(key)
      const groupProps = {
        disabled: next.disabled === true,
        items: row.map((value, column) => ({key: String(column), label: `${rowIndex + 1}${column + 1}`, value: String(value), type: "number" as const, readOnly: next.readOnly === true})),
        onInput: (column: string, value: string, event: Event) => emit("input", rowIndex, column, value, event),
        onChange: (column: string, value: string, event: Event) => emit("change", rowIndex, column, value, event),
      }
      if (entry === undefined) {
        const controller = createControlGroup(document, groupProps)
        entry = {controller, inputs: controller.refs.inputs}
        entries.set(key, entry)
        rows.set(key, controller.element)
      } else entry.controller.update(groupProps)
      entry.controller.element.className = "ui-control-group ui-matrix-input__row"
      for (const [column, input] of entry.inputs) inputs.set(`${key}:${column}`, input)
      ordered.push(entry.controller.element)
    })
    root.replaceChildren(...ordered)
    current = next
  }
  const controller: MatrixInputController = Object.freeze({
    element: root,
    refs: Object.freeze({root, rows, inputs}),
    get props() { return current },
    update,
    dispose() {
      if (disposed) return
      disposed = true
      for (const entry of entries.values()) entry.controller.dispose()
    },
  })
  update(current)
  return controller
}

function normalize(props: MatrixInputProps): MatrixInputProps {
  if (!Array.isArray(props.value) || props.value.length < 2 || props.value.length > 4) throw new TypeError("MatrixInput must contain 2 to 4 rows")
  const size = props.value.length
  if (props.value.some((row) => !Array.isArray(row) || row.length !== size || !row.every(Number.isFinite))) throw new TypeError("MatrixInput value must be a square finite matrix")
  return Object.freeze({...props, value: Object.freeze(props.value.map((row) => Object.freeze([...row]))), step: props.step ?? 0.1, disabled: props.disabled ?? false, readOnly: props.readOnly ?? false})
}
