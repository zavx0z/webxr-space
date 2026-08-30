import type {Event} from "@zavx0z/dom"

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
  style?: CssStyle | undefined
  onRowActivate?: ((key: string, event: Event) => void) | undefined
}>

const rootCss = css`
  & {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    min-width: 0;
    width: 100%;
    border: var(--border-width-control) solid var(--widget-regular-outline);
    border-radius: 4px;
    overflow: clip;
    background: var(--widget-text-background);
  }
`
const sectionCss = css`& { display: flex; flex-direction: column; width: 100%; }`
const rowCss = css`
  & {
    box-sizing: border-box;
    display: flex;
    flex-direction: row;
    width: 100%;
    min-height: 28px;
    border-bottom: var(--border-width-control) solid var(--widget-regular-outline);
    background: var(--widget-number-background-readonly);
  }
  &:hover { background: var(--widget-regular-background); }
`
const cellCss = css`
  & {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    min-width: 0;
    min-height: 28px;
    flex-grow: 1;
    padding: 3px 7px;
    border-right: var(--border-width-control) solid var(--widget-regular-outline);
    background: transparent;
    color: var(--widget-list-content);
    font-size: var(--font-size-xs);
  }
  &[data-last="true"] { border-right: 0; }
`

type HeaderCellProps = Readonly<{column: TableColumn; last: boolean}>

function HeaderCell(props: HeaderCellProps) {
  const width = props.column.width === undefined ? "auto" : `${props.column.width}px`
  const grow = props.column.width === undefined ? 1 : 0
  return <th
    data-column-key={props.column.key}
    data-last={props.last ? "true" : undefined}
    style={css`${cellCss}${css`& { color: var(--widget-regular-content); width: ${width}; flex-grow: ${grow}; flex-shrink: ${grow}; }`}`}
  >{props.column.label}</th>
}

type DataCellProps = Readonly<{
  column: TableColumn
  value: string
  last: boolean
}>

function DataCell(props: DataCellProps) {
  const width = props.column.width === undefined ? "auto" : `${props.column.width}px`
  const grow = props.column.width === undefined ? 1 : 0
  return <td
    data-column-key={props.column.key}
    data-last={props.last ? "true" : undefined}
    style={css`${cellCss}${css`& { width: ${width}; flex-grow: ${grow}; flex-shrink: ${grow}; }`}`}
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
    data-last={props.last ? "true" : undefined}
    onClick={onClick}
    style={css`
      ${rowCss}
      &[data-last="true"] { border-bottom: 0; }
      &[aria-selected="true"] { background: var(--widget-list-background-selected); color: var(--widget-list-content-selected); }
      &[aria-disabled="true"] { opacity: 0.5; }
    `}
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
  return <table title={props.title} style={css`${rootCss}${props.style}`}>
    <thead style={sectionCss}>
      <tr style={css`${rowCss}${css`& { background: var(--widget-regular-outline); }`}`}>
        {props.columns.map((column, index) => <HeaderCell
          key={column.key}
          column={column}
          last={index === props.columns.length - 1}
        />)}
      </tr>
    </thead>
    <tbody style={sectionCss}>
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
