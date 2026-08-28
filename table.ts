import type {Document, Event, HTMLElement, Text} from "@zavx0z/dom"
import {projectVisualState, type VisualStateProjection} from "./internal/dom-state.ts"

import type {TableColumn, TableProps, TableRow} from "./table-component.tsx"
export type TableRefs = Readonly<{root: HTMLElement; head: HTMLElement; body: HTMLElement; headers: ReadonlyMap<string, HTMLElement>; rows: ReadonlyMap<string, HTMLElement>; cells: ReadonlyMap<string, ReadonlyMap<string, HTMLElement>>}>
export type TableController = Readonly<{element: HTMLElement; refs: TableRefs; props: TableProps; update(props: TableProps): void; dispose(): void}>

export const tableCss = String.raw`
.ui-table { box-sizing: border-box; display: flex; flex-direction: column; min-width: 0; width: 100%; border: 1px solid rgb(61 61 61); border-radius: 4px; overflow: hidden; background: rgb(29 29 29); }
.ui-table__head,
.ui-table__body { display: flex; flex-direction: column; width: 100%; }
.ui-table__row { box-sizing: border-box; display: flex; flex-direction: row; width: 100%; min-height: 28px; border-bottom: 1px solid rgb(61 61 61); }
.ui-table__body .ui-table__row[data-last="true"] { border-bottom: 0; }
.ui-table__header,
.ui-table__cell { box-sizing: border-box; display: flex; align-items: center; min-width: 0; min-height: 28px; flex-grow: 1; padding: 3px 7px; border-right: 1px solid rgb(61 61 61); color: rgb(204 204 204); font-size: 11px; }
.ui-table__header { background: rgb(61 61 61); color: rgb(230 230 230); }
.ui-table__cell { background: rgb(48 48 48); }
.ui-table__row[data-ui-state="hover"] .ui-table__cell { background: rgb(84 84 84); }
.ui-table__row[aria-selected="true"] .ui-table__cell { background: rgb(71 114 179); color: rgb(255 255 255); }
.ui-table [data-last-column="true"] { border-right: 0; }
.ui-table__row[aria-disabled="true"] { opacity: 0.5; }
`

type HeaderEntry = {element: HTMLElement; text: Text}
type RowEntry = {element: HTMLElement; cells: Map<string, HTMLElement>; texts: Map<string, Text>; listener: (event: Event) => void; state: VisualStateProjection}

export function createTable(document: Document, initialProps: TableProps): TableController {
  const root = document.createElement("table")
  const head = document.createElement("thead")
  const headRow = document.createElement("tr")
  const body = document.createElement("tbody")
  root.className = "ui-table"
  head.className = "ui-table__head"
  headRow.className = "ui-table__row"
  body.className = "ui-table__body"
  head.appendChild(headRow)
  root.append(head, body)
  const headerEntries = new Map<string, HeaderEntry>()
  const headers = new Map<string, HTMLElement>()
  const rowEntries = new Map<string, RowEntry>()
  const rows = new Map<string, HTMLElement>()
  const cells = new Map<string, ReadonlyMap<string, HTMLElement>>()
  let current = normalize(initialProps)
  let disposed = false
  const removeRow = (key: string, entry: RowEntry): void => {
    entry.element.removeEventListener("click", entry.listener)
    entry.state.dispose()
    entry.element.remove()
    rowEntries.delete(key)
    rows.delete(key)
    cells.delete(key)
  }
  const update = (props: TableProps): void => {
    if (disposed) throw new Error("Table controller is disposed")
    const next = normalize(props)
    current = next
    root.className = "ui-table"
    root.title = next.title ?? ""
    const columnKeys = new Set(next.columns.map(({key}) => key))
    for (const [key, entry] of headerEntries) {
      if (columnKeys.has(key)) continue
      entry.element.remove()
      headerEntries.delete(key)
      headers.delete(key)
    }
    const orderedHeaders: HTMLElement[] = []
    next.columns.forEach((column, index) => {
      let entry = headerEntries.get(column.key)
      if (entry === undefined) {
        const element = document.createElement("th")
        const text = document.createTextNode("")
        element.className = "ui-table__header"
        element.appendChild(text)
        entry = {element, text}
        headerEntries.set(column.key, entry)
        headers.set(column.key, element)
      }
      entry.element.setAttribute("data-last-column", String(index === next.columns.length - 1))
      if (entry.text.data !== column.label) entry.text.data = column.label
      orderedHeaders.push(entry.element)
    })
    headRow.replaceChildren(...orderedHeaders)
    const retained = new Set(next.rows.map(({key}) => key))
    for (const [key, entry] of rowEntries) if (!retained.has(key)) removeRow(key, entry)
    const orderedRows: HTMLElement[] = []
    next.rows.forEach((row, rowIndex) => {
      let entry = rowEntries.get(row.key)
      if (entry === undefined) {
        const element = document.createElement("tr")
        element.className = "ui-table__row"
        const listener = (event: Event): void => {
          const latest = current.rows.find(({key}) => key === row.key)
          if (current.disabled !== true && latest?.disabled !== true) current.onRowActivate?.(row.key, event)
        }
        element.addEventListener("click", listener)
        const state = projectVisualState(element, () => current.disabled === true || current.rows.find(({key}) => key === row.key)?.disabled === true)
        entry = {element, cells: new Map(), texts: new Map(), listener, state}
        rowEntries.set(row.key, entry)
        rows.set(row.key, element)
        cells.set(row.key, entry.cells)
      }
      for (const key of [...entry.cells.keys()]) {
        if (columnKeys.has(key)) continue
        entry.cells.get(key)?.remove()
        entry.cells.delete(key)
        entry.texts.delete(key)
      }
      const orderedCells: HTMLElement[] = []
      next.columns.forEach((column, columnIndex) => {
        let cell = entry!.cells.get(column.key)
        let text = entry!.texts.get(column.key)
        if (cell === undefined || text === undefined) {
          cell = document.createElement("td")
          text = document.createTextNode("")
          cell.className = "ui-table__cell"
          cell.appendChild(text)
          entry!.cells.set(column.key, cell)
          entry!.texts.set(column.key, text)
        }
        cell.setAttribute("data-last-column", String(columnIndex === next.columns.length - 1))
        const value = row.cells[column.key] ?? ""
        if (text.data !== value) text.data = value
        orderedCells.push(cell)
      })
      entry.element.replaceChildren(...orderedCells)
      entry.element.setAttribute("aria-selected", String(row.key === next.selectedKey))
      entry.element.setAttribute("aria-disabled", String(next.disabled === true || row.disabled === true))
      entry.element.setAttribute("data-last", String(rowIndex === next.rows.length - 1))
      entry.state.sync()
      orderedRows.push(entry.element)
    })
    body.replaceChildren(...orderedRows)
  }
  const refs: TableRefs = Object.freeze({root, head, body, headers, rows, cells})
  const controller: TableController = Object.freeze({
    element: root,
    refs,
    get props() { return current },
    update,
    dispose() {
      if (disposed) return
      disposed = true
      for (const [key, entry] of [...rowEntries]) removeRow(key, entry)
    },
  })
  update(current)
  return controller
}

function normalize(props: TableProps): TableProps {
  if (!Array.isArray(props.columns) || props.columns.length === 0) throw new TypeError("Table columns must be a non-empty array")
  if (!Array.isArray(props.rows)) throw new TypeError("Table rows must be an array")
  const columnKeys = new Set<string>()
  const columns = props.columns.map((column) => {
    if (typeof column.key !== "string" || column.key.length === 0) throw new TypeError("Table column key must not be empty")
    if (columnKeys.has(column.key)) throw new Error(`Table column key must be unique: ${column.key}`)
    columnKeys.add(column.key)
    if (typeof column.label !== "string") throw new TypeError("Table column label must be a string")
    return Object.freeze({...column})
  })
  const rowKeys = new Set<string>()
  const rows = props.rows.map((row) => {
    if (typeof row.key !== "string" || row.key.length === 0) throw new TypeError("Table row key must not be empty")
    if (rowKeys.has(row.key)) throw new Error(`Table row key must be unique: ${row.key}`)
    rowKeys.add(row.key)
    return Object.freeze({...row, cells: Object.freeze({...row.cells}), disabled: row.disabled ?? false})
  })
  const selectedKey = props.selectedKey ?? null
  if (selectedKey !== null && !rowKeys.has(selectedKey)) throw new Error(`Table selected key does not exist: ${selectedKey}`)
  return Object.freeze({...props, columns: Object.freeze(columns), rows: Object.freeze(rows), selectedKey, disabled: props.disabled ?? false})
}
