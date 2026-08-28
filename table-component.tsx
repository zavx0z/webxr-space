import type {Event} from "@zavx0z/dom"
import {defineStyles, type CSSProperties, type FunctionComponent, type StyleValue} from "@zavx0z/react"

export type TableColumn = Readonly<{
  key: string
  label: string
  width?: number | undefined
}>

export type TableRow = Readonly<{
  key: string
  cells: Readonly<Record<string, string>>
  disabled?: boolean | undefined
}>

export type TableProps = Readonly<{
  columns: readonly TableColumn[]
  rows: readonly TableRow[]
  selectedKey?: string | null | undefined
  disabled?: boolean | undefined
  title?: string | undefined
  style?: StyleValue
  onRowActivate?: ((key: string, event: Event) => void) | undefined
}>

export const tableStyles = defineStyles("@ui/components/table", {
  root: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
    width: "100%",
    border: "1px solid rgb(61 61 61)",
    borderRadius: 4,
    overflow: "clip",
    background: "rgb(29 29 29)"
  },
  section: {display: "flex", flexDirection: "column", width: "100%"},
  row: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "row",
    width: "100%",
    minHeight: 28,
    borderBottom: "1px solid rgb(61 61 61)",
    background: "rgb(48 48 48)",
    ":hover": {background: "rgb(84 84 84)"}
  },
  lastRow: {borderBottom: 0},
  selected: {background: "rgb(71 114 179)", color: "rgb(255 255 255)"},
  disabled: {opacity: 0.5},
  headerRow: {background: "rgb(61 61 61)"},
  cell: {
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    minWidth: 0,
    minHeight: 28,
    flexGrow: 1,
    padding: "3px 7px",
    borderRight: "1px solid rgb(61 61 61)",
    background: "transparent",
    color: "rgb(204 204 204)",
    fontSize: 11
  },
  header: {color: "rgb(230 230 230)"},
  lastCell: {borderRight: 0}
})

export const tableComponentCss = tableStyles.cssText

type HeaderCellProps = Readonly<{column: TableColumn; last: boolean}>

function HeaderCell(props: HeaderCellProps) {
  return <th
    data-column-key={props.column.key}
    style={[
      tableStyles.cell,
      tableStyles.header,
      props.last && tableStyles.lastCell,
      columnWidth(props.column.width)
    ]}
  >{props.column.label}</th>
}

type DataCellProps = Readonly<{
  column: TableColumn
  value: string
  last: boolean
}>

function DataCell(props: DataCellProps) {
  return <td
    data-column-key={props.column.key}
    style={[
      tableStyles.cell,
      props.last && tableStyles.lastCell,
      columnWidth(props.column.width)
    ]}
  >{props.value}</td>
}

type TableRowViewProps = Readonly<{
  row: TableRow
  columns: readonly TableColumn[]
  selected: boolean
  disabled: boolean
  last: boolean
  onActivate?: TableProps["onRowActivate"]
}>

function TableRowView(props: TableRowViewProps) {
  const onClick = (event: Event) => {
    if (!props.disabled) props.onActivate?.(props.row.key, event)
  }
  return <tr
    data-row-key={props.row.key}
    aria-selected={String(props.selected)}
    aria-disabled={String(props.disabled)}
    onClick={onClick}
    style={[
      tableStyles.row,
      props.last && tableStyles.lastRow,
      props.selected && tableStyles.selected,
      props.disabled && tableStyles.disabled
    ]}
  >
    {props.columns.map((column, index) => <DataCell
      key={column.key}
      column={column}
      value={props.row.cells[column.key] ?? ""}
      last={index === props.columns.length - 1}
    />)}
  </tr>
}

export function Table(props: TableProps) {
  const selectedKey = assertTableProps(props)
  return <table title={props.title} style={[tableStyles.root, props.style]}>
    <thead style={tableStyles.section}>
      <tr style={[tableStyles.row, tableStyles.headerRow]}>
        {props.columns.map((column, index) => <HeaderCell
          key={column.key}
          column={column}
          last={index === props.columns.length - 1}
        />)}
      </tr>
    </thead>
    <tbody style={tableStyles.section}>
      {props.rows.map((row, index) => <TableRowView
        key={row.key}
        row={row}
        columns={props.columns}
        selected={row.key === selectedKey}
        disabled={props.disabled === true || row.disabled === true}
        last={index === props.rows.length - 1}
        onActivate={props.onRowActivate}
      />)}
    </tbody>
  </table>
}

export type TableComponent = FunctionComponent<TableProps>

function columnWidth(width: number | undefined): CSSProperties | undefined {
  if (width === undefined) return undefined
  return Object.freeze({width, flexGrow: 0, flexShrink: 0})
}

function assertTableProps(props: TableProps): string | null {
  if (!Array.isArray(props.columns) || props.columns.length === 0) {
    throw new TypeError("Table columns must be a non-empty array")
  }
  if (!Array.isArray(props.rows)) throw new TypeError("Table rows must be an array")
  const columnKeys = new Set<string>()
  for (const column of props.columns) {
    if (typeof column.key !== "string" || column.key.length === 0) throw new TypeError("Table column key must not be empty")
    if (columnKeys.has(column.key)) throw new Error(`Table column key must be unique: ${column.key}`)
    columnKeys.add(column.key)
    if (typeof column.label !== "string") throw new TypeError("Table column label must be a string")
    if (column.width !== undefined && (!Number.isFinite(column.width) || column.width <= 0)) {
      throw new RangeError(`Table column width must be positive: ${column.key}`)
    }
  }
  const rowKeys = new Set<string>()
  for (const row of props.rows) {
    if (typeof row.key !== "string" || row.key.length === 0) throw new TypeError("Table row key must not be empty")
    if (rowKeys.has(row.key)) throw new Error(`Table row key must be unique: ${row.key}`)
    rowKeys.add(row.key)
  }
  const selectedKey = props.selectedKey ?? null
  if (selectedKey !== null && !rowKeys.has(selectedKey)) throw new Error(`Table selected key does not exist: ${selectedKey}`)
  return selectedKey
}

export * from "./table.ts"
