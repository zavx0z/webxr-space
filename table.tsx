import type {Event, MouseEvent} from "@zavx0z/dom"

export type TableColumn = Readonly<{
  key: string
  label: string
  width?: number | undefined
}>

export type TableRow = Readonly<{
  key: string
  cells: Readonly<Record<string, unknown>>
  disabled?: boolean | undefined
}>

export type TableCellContext = Readonly<{
  row: TableRow
  rowIndex: number
  column: TableColumn
  columnIndex: number
  value: unknown
  selected: boolean
  disabled: boolean
}>

export type TableSelectionGesture = Readonly<{
  metaKey?: boolean | undefined
  ctrlKey?: boolean | undefined
  shiftKey?: boolean | undefined
}>

export type TableSelectionUpdate = Readonly<{
  selectedKeys: readonly string[]
  anchorKey: string
}>

export type TableProps = Readonly<{
  columns: readonly TableColumn[]
  rows: readonly TableRow[]
  selectedKey?: string | null | undefined
  selectedKeys?: readonly string[] | undefined
  selectionAnchorKey?: string | null | undefined
  disabled?: boolean | undefined
  title?: string | undefined
  style?: CssStyle | undefined
  onRowActivate?: ((key: string, event: Event) => void) | undefined
  onSelectionChange?: ((update: TableSelectionUpdate, event: Event) => void) | undefined
  isCellInteractive?: ((context: TableCellContext) => boolean) | undefined
  onCellActivate?: ((context: TableCellContext, event: Event) => void) | undefined
}>

const sectionCss = css`
  display: flex;
  flex-direction: column;
  width: 100%;
`
const rowCss = css`
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  width: 100%;
  min-height: 28px;
  border-bottom: var(--border-width-control) solid var(--widget-regular-outline);
  background: var(--widget-number-background-readonly);

  &:hover {
    background: var(--widget-regular-background);
  }
`
const cellCss = css`
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

  &[data-last="true"] {
    border-right: 0;
  }
`

type HeaderCellProps = Readonly<{column: TableColumn; last: boolean}>

function HeaderCell(props: HeaderCellProps) {
  const width = props.column.width === undefined ? "auto" : `${props.column.width}px`
  const grow = props.column.width === undefined ? 1 : 0
  return <th
    data-column-key={props.column.key}
    data-last={props.last ? "true" : undefined}
    style={css`
      ${cellCss}

      ${css`
        color: var(--widget-regular-content);
        width: ${width};
        flex-grow: ${grow};
        flex-shrink: ${grow};
      `}
    `}
  >
    {props.column.label}
  </th>
}

type DataCellProps = Readonly<{
  row: TableRow
  rowIndex: number
  column: TableColumn
  columnIndex: number
  value: unknown
  selected: boolean
  disabled: boolean
  last: boolean
  isInteractive?: TableProps["isCellInteractive"]
  onActivate?: TableProps["onCellActivate"]
}>

function DataCell(props: DataCellProps) {
  const width = props.column.width === undefined ? "auto" : `${props.column.width}px`
  const grow = props.column.width === undefined ? 1 : 0
  const context: TableCellContext = Object.freeze({
    row: props.row,
    rowIndex: props.rowIndex,
    column: props.column,
    columnIndex: props.columnIndex,
    value: props.value,
    selected: props.selected,
    disabled: props.disabled
  })
  const interactive = !props.disabled && props.isInteractive?.(context) === true && props.onActivate !== undefined
  const onClick = (event: Event) => {
    if (!interactive) return
    event.stopPropagation()
    props.onActivate?.(context, event)
  }
  return <td
    data-column-key={props.column.key}
    data-last={props.last ? "true" : undefined}
    data-interactive={interactive ? "true" : undefined}
    aria-disabled={String(props.disabled)}
    onClick={onClick}
    style={css`
      ${cellCss}

      ${css`
        width: ${width};
        flex-grow: ${grow};
        flex-shrink: ${grow};
      `}
    `}
  >
    {formatTableCellValue(props.value)}
  </td>
}

type TableRowViewProps = Readonly<{
  row: TableRow
  rowIndex: number
  columns: readonly TableColumn[]
  rowKeys: readonly string[]
  selectedKeys: readonly string[]
  anchorKey: string | null
  selected: boolean
  disabled: boolean
  last: boolean
  onActivate?: TableProps["onRowActivate"]
  onSelectionChange?: TableProps["onSelectionChange"]
  isCellInteractive?: TableProps["isCellInteractive"]
  onCellActivate?: TableProps["onCellActivate"]
}>

function TableRowView(props: TableRowViewProps) {
  const onClick = (event: Event) => {
    if (props.disabled) return
    const pointer = event as MouseEvent
    props.onSelectionChange?.(tableSelectionAfterClick(
      props.rowKeys,
      props.selectedKeys,
      props.row.key,
      props.anchorKey,
      pointer
    ), event)
    props.onActivate?.(props.row.key, event)
  }
  return <tr
    data-row-key={props.row.key}
    aria-selected={String(props.selected)}
    aria-disabled={String(props.disabled)}
    data-last={props.last ? "true" : undefined}
    onClick={onClick}
    style={css`
      ${rowCss}

      &[data-last="true"] {
        border-bottom: 0;
      }

      &[aria-selected="true"] {
        background: var(--widget-list-background-selected);
        color: var(--widget-list-content-selected);
      }

      &[aria-disabled="true"] {
        opacity: 0.5;
      }
    `}
  >
    {props.columns.map((column, index) => <DataCell
      key={column.key}
      row={props.row}
      rowIndex={props.rowIndex}
      column={column}
      columnIndex={index}
      value={props.row.cells[column.key] ?? ""}
      selected={props.selected}
      disabled={props.disabled}
      last={index === props.columns.length - 1}
      isInteractive={props.isCellInteractive}
      onActivate={props.onCellActivate}
    />)}
  </tr>
}

export function Table(props: TableProps) {
  const selection = assertTableProps(props)
  return <table
    title={props.title}
    style={css`
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      min-width: 0;
      width: 100%;
      border: var(--border-width-control) solid var(--widget-regular-outline);
      border-radius: 4px;
      overflow: clip;
      background: var(--widget-text-background);

      ${props.style}
    `}
  >
    <thead style={sectionCss}>
      <tr
        style={css`
          ${rowCss}

          ${css`
            background: var(--widget-regular-outline);
          `}
        `}
      >
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
        rowIndex={index}
        columns={props.columns}
        rowKeys={selection.rowKeys}
        selectedKeys={selection.selectedKeys}
        anchorKey={props.selectionAnchorKey ?? selection.selectedKeys.at(-1) ?? null}
        selected={selection.selectedKeys.includes(row.key)}
        disabled={props.disabled === true || row.disabled === true}
        last={index === props.rows.length - 1}
        onActivate={props.onRowActivate}
        onSelectionChange={props.onSelectionChange}
        isCellInteractive={props.isCellInteractive}
        onCellActivate={props.onCellActivate}
      />)}
    </tbody>
  </table>
}

function assertTableProps(props: TableProps): Readonly<{
  rowKeys: readonly string[]
  selectedKeys: readonly string[]
}> {
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
  const keys = [...rowKeys]
  const requested = props.selectedKeys ?? (selectedKey === null ? [] : [selectedKey])
  return Object.freeze({
    rowKeys: Object.freeze(keys),
    selectedKeys: Object.freeze(normalizeTableSelection(keys, requested))
  })
}

export function normalizeTableSelection(
  rowKeys: readonly string[],
  selectedKeys: readonly string[]
): string[] {
  const known = new Set(rowKeys)
  const next: string[] = []
  for (const key of selectedKeys) {
    if (!known.has(key) || next.includes(key)) continue
    next.push(key)
  }
  return next
}

export function tableSelectionAfterClick(
  rowKeys: readonly string[],
  currentSelectedKeys: readonly string[],
  clickedKey: string,
  anchorKey: string | null,
  gesture: TableSelectionGesture = {}
): TableSelectionUpdate {
  const selected = normalizeTableSelection(rowKeys, currentSelectedKeys)
  const additive = gesture.metaKey === true || gesture.ctrlKey === true
  if (gesture.shiftKey === true) {
    const range = tableRangeKeys(rowKeys, anchorKey ?? selected.at(-1) ?? clickedKey, clickedKey)
    return Object.freeze({
      selectedKeys: Object.freeze(additive ? uniqueKeys([...selected, ...range]) : range),
      anchorKey: anchorKey ?? clickedKey
    })
  }
  if (additive) {
    const next = selected.includes(clickedKey)
      ? selected.filter(key => key !== clickedKey)
      : [...selected, clickedKey]
    return Object.freeze({selectedKeys: Object.freeze(next), anchorKey: clickedKey})
  }
  return Object.freeze({selectedKeys: Object.freeze([clickedKey]), anchorKey: clickedKey})
}

function tableRangeKeys(rowKeys: readonly string[], from: string, to: string): string[] {
  const first = rowKeys.indexOf(from)
  const last = rowKeys.indexOf(to)
  if (first < 0 || last < 0) return [to]
  return rowKeys.slice(Math.min(first, last), Math.max(first, last) + 1)
}

function uniqueKeys(keys: readonly string[]): string[] {
  const next: string[] = []
  for (const key of keys) if (!next.includes(key)) next.push(key)
  return next
}

function formatTableCellValue(value: unknown): string {
  if (value === undefined || value === null) return ""
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return String(value)
  return JSON.stringify(value)
}
