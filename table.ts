import {Color} from "@engine/core"
import {
  div,
  divScrollTo,
  type DivScrollContext,
} from "@ui/elements/div"
import {type StyleProps} from "@ui/elements/style"
import {palette} from "@ui/elements/theme"
import {Z, type DrawTextOpts, type UiSurface} from "@layout/core/surface"
import {flexColumn, flexRow} from "@layout/core/flex"

export type TableColumn<Row> = {
  key: string
  label?: string
  width: number
  getValue?: (row: Row, rowIndex: number) => unknown
}

export type TableRowId = string | number

export type TableCellContext<Row> = {
  row: Row
  rowIndex: number
  rowId: TableRowId
  selected: boolean
  column: TableColumn<Row>
  columnIndex: number
  value: unknown
}

export type TableRowPointerContext<Row> = {
  row: Row
  rowIndex: number
  rowId: TableRowId
  selected: boolean
  event: MouseEvent | undefined
  cell: TableCellContext<Row> | null
  column: TableColumn<Row> | null
  columnIndex: number | null
  value: unknown
}

export type TableHeaderContext<Row> = {
  column: TableColumn<Row>
  columnIndex: number
}

type TableColumnFrame<Row> = Readonly<{
  column: TableColumn<Row>
  columnIndex: number
  x: number
  y: number
  w: number
  h: number
}>

export type TableSelectionGesture = {
  metaKey?: boolean
  ctrlKey?: boolean
  shiftKey?: boolean
}

export type TableSelectionUpdate = {
  selectedRowIds: readonly TableRowId[]
  anchorRowId: TableRowId
}

export type TableProps<Row> = {
  key?: string
  columns: readonly TableColumn<Row>[]
  rows: readonly Row[]
  selectedRowIds?: readonly TableRowId[]
  getRowId?: (row: Row, rowIndex: number) => TableRowId
  rowHeight?: number
  headerHeight?: number
  fontPx?: number
  headerFontPx?: number
  cellPaddingX?: number
  emptyLabel?: string
  style?: StyleProps
  getCellText?: (ctx: TableCellContext<Row>) => string
  getCellMaterial?: (ctx: TableCellContext<Row>) => DrawTextOpts["material"]
  getHeaderMaterial?: (ctx: TableHeaderContext<Row>) => DrawTextOpts["material"]
  isCellInteractive?: (ctx: TableCellContext<Row>) => boolean
  cellCursor?: string | ((ctx: TableCellContext<Row>) => string)
  onCellClick?: (ctx: TableCellContext<Row>) => void
  rowCursor?: string | ((ctx: TableRowPointerContext<Row>) => string)
  onRowClick?: (ctx: TableRowPointerContext<Row>) => void
  onRowDoubleClick?: (ctx: TableRowPointerContext<Row>) => void
}

const DEFAULT_TABLE_ROW_H = 24
const DEFAULT_TABLE_HEADER_H = 27
const DEFAULT_TABLE_FONT_PX = 10
const DEFAULT_TABLE_CELL_PAD_X = 8
const TABLE_BODY_BG_Z = Z.CONTAINER + 0.01
const TABLE_BODY_RULE_Z = Z.ELEMENT_RULE
const TABLE_BODY_TEXT_Z = Z.TEXT
const TABLE_HEADER_BACKDROP_Z = Z.TEXT + 0.035
const TABLE_HEADER_BG_Z = Z.TEXT + 0.04
const TABLE_HEADER_RULE_Z = Z.TEXT + 0.05
const TABLE_HEADER_TEXT_Z = Z.TEXT + 0.06
const TABLE_HEADER_EDGE_COVER_PX = 3
const TABLE_BODY_TEXT_TOP_INSET_PX = TABLE_HEADER_EDGE_COVER_PX + 1
const TABLE_ROW_STRIPE_FILL = withAlpha(palette.bgPanelDim, 0.44)
const TABLE_ROW_HOVER_FILL = withAlpha(palette.bgHot, 0.30)
const TABLE_ROW_SELECTED_FILL = withAlpha(palette.activeRowFill, 0.68)
const TABLE_HEADER_BACKDROP_FILL = withAlpha(palette.bgToolbar, 0.62)
const TABLE_HEADER_FILL = withAlpha(palette.bgPanel, 0.58)

export function normalizeTableSelection(rowIds: readonly TableRowId[], selectedRowIds: readonly TableRowId[]): TableRowId[] {
  const known = new Set(rowIds)
  const next: TableRowId[] = []
  for (const id of selectedRowIds) {
    if (!known.has(id) || next.includes(id)) continue
    next.push(id)
  }
  return next
}

export function tableSelectionAfterClick(
  rowIds: readonly TableRowId[],
  currentSelectedRowIds: readonly TableRowId[],
  clickedRowId: TableRowId,
  anchorRowId: TableRowId | null,
  gesture: TableSelectionGesture = {},
): TableSelectionUpdate {
  const selected = uniqueRowIds(currentSelectedRowIds)
  const additive = gesture.metaKey === true || gesture.ctrlKey === true
  if (gesture.shiftKey === true) {
    const rangeIds = tableRangeRowIds(rowIds, anchorRowId ?? selected[selected.length - 1] ?? clickedRowId, clickedRowId)
    if (rangeIds.length === 0) return {selectedRowIds: [clickedRowId], anchorRowId: clickedRowId}
    if (additive) return {selectedRowIds: uniqueRowIds([...selected, ...rangeIds]), anchorRowId: anchorRowId ?? clickedRowId}
    return {selectedRowIds: rangeIds, anchorRowId: anchorRowId ?? clickedRowId}
  }

  if (additive) {
    const next = selected.includes(clickedRowId)
      ? selected.filter((id) => id !== clickedRowId)
      : [...selected, clickedRowId]
    return {selectedRowIds: next, anchorRowId: clickedRowId}
  }

  return {selectedRowIds: [clickedRowId], anchorRowId: clickedRowId}
}

export function Table<Row>(host: UiSurface, x: number, y: number, width: number, height: number, props: TableProps<Row>): void {
  if (width <= 0 || height <= 0) return
  const key = props.key ?? `component-table:${x}:${y}:${width}:${height}`
  const rowH = props.rowHeight ?? DEFAULT_TABLE_ROW_H
  const headerH = props.headerHeight ?? DEFAULT_TABLE_HEADER_H
  const contentW = Math.max(1, props.columns.reduce((sum, column) => sum + Math.max(1, column.width), 0))
  const contentH = Math.max(1, headerH + props.rows.length * rowH)
  div(host, x, y, width, height, {
    key,
    scrollContentWidth: contentW,
    scrollContentHeight: contentH,
    style: {
      background: null,
      borderColor: null,
      borderRadius: 0,
      padding: 0,
      overflowX: "auto",
      overflowY: "auto",
      scrollbarWidth: 4,
      ...props.style,
    },
    children: (ctx) => renderTable(host, props, ctx, rowH, headerH, key),
  })
}

export function tableScrollTo(surface: UiSurface, key: string, next: {left?: number; top?: number}): void {
  divScrollTo(surface, key, next)
}

function renderTable<Row>(
  host: UiSurface,
  props: TableProps<Row>,
  ctx: DivScrollContext,
  rowH: number,
  headerH: number,
  key: string,
): void {
  const x = ctx.viewportX
  const y = ctx.viewportY
  let headerFrame = {x, y, w: ctx.viewportWidth, h: Math.min(headerH, ctx.viewportHeight)}
  let bodyFrame = {x, y: y + headerFrame.h, w: ctx.viewportWidth, h: Math.max(0, ctx.viewportHeight - headerFrame.h)}
  flexColumn({
    x,
    y,
    w: ctx.viewportWidth,
    h: ctx.viewportHeight,
    gap: 0,
    items: [
      {height: Math.min(headerH, ctx.viewportHeight), draw: (slotX, slotY, slotW, slotH) => {
        headerFrame = {x: slotX, y: slotY, w: slotW, h: slotH}
      }},
      {height: "grow", draw: (slotX, slotY, slotW, slotH) => {
        bodyFrame = {x: slotX, y: slotY, w: slotW, h: slotH}
      }},
    ],
  })
  const bodyY = bodyFrame.y
  const bodyH = Math.max(1, bodyFrame.h)
  const firstRow = Math.max(0, Math.floor(ctx.scrollTop / rowH))
  const rowOffset = ctx.scrollTop - firstRow * rowH
  const visibleRows = Math.ceil(bodyH / rowH) + 1

  host.pushClip(bodyFrame.x, bodyY, Math.max(1, bodyFrame.w), bodyH)
  try {
    renderTableBody(host, bodyFrame.x, bodyY, bodyH, props, ctx, rowH, firstRow, rowOffset, visibleRows, key)
  } finally {
    host.popClip()
  }
  renderTableHeader(host, headerFrame, props, ctx)
}

function renderTableBody<Row>(
  host: UiSurface,
  x: number,
  bodyY: number,
  bodyH: number,
  props: TableProps<Row>,
  ctx: DivScrollContext,
  rowH: number,
  firstRow: number,
  rowOffset: number,
  visibleRows: number,
  key: string,
): void {
  if (props.rows.length === 0) {
    host.drawText(props.emptyLabel ?? "No rows", x + 10, bodyY + 16, {
      fontPx: 12,
      material: host.materials.muted,
      maxWidthPx: Math.max(1, ctx.viewportWidth - 20),
      z: TABLE_BODY_TEXT_Z,
    })
    renderVerticalRules(host, tableColumnFrames(ctx.contentX, bodyY, bodyH, props.columns), TABLE_BODY_RULE_Z, {
      x: ctx.contentX,
      y: bodyY,
      h: bodyH,
    })
    return
  }

  flexColumn({
    x,
    y: bodyY - rowOffset,
    w: ctx.viewportWidth,
    h: visibleRows * rowH,
    gap: 0,
    items: Array.from({length: visibleRows}, (_, visibleIndex) => {
      const rowIndex = firstRow + visibleIndex
      const row = props.rows[rowIndex]
      return row === undefined ? {height: rowH, draw() {}} : {
        height: rowH,
        draw: (rowX, rowY, rowW, plannedRowH) => {
          if (rowIndex % 2 === 1) host.drawRect(rowX, rowY, Math.max(1, rowW), plannedRowH, TABLE_ROW_STRIPE_FILL, TABLE_BODY_BG_Z)
          host.drawRect(rowX, rowY + plannedRowH - 1, Math.max(1, rowW), 1, palette.borderRule, TABLE_BODY_RULE_Z)
          renderTableRow(host, rowX, rowY, plannedRowH, props, ctx, row, rowIndex, key, bodyY, bodyH)
        },
      }
    }),
  })
  renderVerticalRules(host, tableColumnFrames(ctx.contentX, bodyY, bodyH, props.columns), TABLE_BODY_RULE_Z, {
    x: ctx.contentX,
    y: bodyY,
    h: bodyH,
  })
}

function renderTableHeader<Row>(
  host: UiSurface,
  frame: Readonly<{x: number; y: number; w: number; h: number}>,
  props: TableProps<Row>,
  ctx: DivScrollContext,
): void {
  const headerW = Math.max(1, frame.w)
  host.drawRect(frame.x, frame.y, headerW, frame.h + TABLE_HEADER_EDGE_COVER_PX, TABLE_HEADER_BACKDROP_FILL, TABLE_HEADER_BACKDROP_Z)
  host.drawRect(frame.x, frame.y, headerW, frame.h, TABLE_HEADER_FILL, TABLE_HEADER_BG_Z)
  const fontPx = props.headerFontPx ?? props.fontPx ?? DEFAULT_TABLE_FONT_PX
  const padX = props.cellPaddingX ?? DEFAULT_TABLE_CELL_PAD_X
  const columns = tableColumnFrames(ctx.contentX, frame.y, frame.h, props.columns)
  for (const planned of columns) {
    host.drawRect(planned.x, planned.y, 1, planned.h, palette.borderRule, TABLE_HEADER_RULE_Z)
    host.drawText(planned.column.label ?? planned.column.key, planned.x + padX, planned.y + 8, {
      fontPx,
      material: props.getHeaderMaterial?.({column: planned.column, columnIndex: planned.columnIndex}) ?? host.materials.cyan,
      maxWidthPx: Math.max(1, planned.w - padX * 2),
      z: TABLE_HEADER_TEXT_Z,
    })
  }
  host.drawRect(tableColumnsEndX(columns, ctx.contentX), frame.y, 1, frame.h, palette.borderRule, TABLE_HEADER_RULE_Z)
  host.drawRect(frame.x, frame.y + frame.h - 2, headerW, 2, palette.borderDim, TABLE_HEADER_RULE_Z)
}

function renderVerticalRules<Row>(
  host: UiSurface,
  columns: readonly TableColumnFrame<Row>[],
  z: number,
  fallback: Readonly<{x: number; y: number; h: number}>,
): void {
  for (const planned of columns) host.drawRect(planned.x, planned.y, 1, planned.h, palette.borderRule, z)
  const first = columns[0]
  if (first === undefined) {
    host.drawRect(fallback.x, fallback.y, 1, fallback.h, palette.borderRule, z)
    return
  }
  host.drawRect(tableColumnsEndX(columns, first.x), first.y, 1, first.h, palette.borderRule, z)
}

function renderTableRow<Row>(
  host: UiSurface,
  x: number,
  y: number,
  rowH: number,
  props: TableProps<Row>,
  ctx: DivScrollContext,
  row: Row,
  rowIndex: number,
  key: string,
  bodyY: number,
  bodyH: number,
): void {
  const fontPx = props.fontPx ?? DEFAULT_TABLE_FONT_PX
  const padX = props.cellPaddingX ?? DEFAULT_TABLE_CELL_PAD_X
  const rowId = tableRowId(row, rowIndex, props)
  const selected = props.selectedRowIds?.includes(rowId) === true
  const rowHitKey = `${key}:row:${String(rowId)}`
  const rowHitY = Math.max(y, bodyY)
  const rowHitH = Math.min(y + rowH, bodyY + bodyH) - rowHitY
  if (rowHitH > 0) {
    const state = host.hitState(x, rowHitY, Math.max(1, ctx.viewportWidth), rowHitH, rowHitKey)
    if (selected) host.drawRect(x, rowHitY, Math.max(1, ctx.viewportWidth), rowHitH, TABLE_ROW_SELECTED_FILL, TABLE_BODY_BG_Z + 0.01)
    else if (state.hovered) host.drawRect(x, rowHitY, Math.max(1, ctx.viewportWidth), rowHitH, TABLE_ROW_HOVER_FILL, TABLE_BODY_BG_Z + 0.01)
  }
  if ((props.onRowClick !== undefined || props.onRowDoubleClick !== undefined) && rowHitH > 0) {
    const rowCursor = typeof props.rowCursor === "string" ? props.rowCursor : "pointer"
    host.hit(x, rowHitY, Math.max(1, ctx.viewportWidth), rowHitH, () => {}, {
      key: rowHitKey,
      cursor: rowCursor,
      onPointerDown: (localX, _localY, event) => {
        if (event?.button !== undefined && event.button !== 0) return
        event?.preventDefault()
        const pointerCtx = tableRowPointerContext(row, rowIndex, rowId, selected, props, ctx, localX, event)
        props.onRowClick?.(pointerCtx)
        if ((event?.detail ?? 1) >= 2) props.onRowDoubleClick?.(pointerCtx)
      },
    })
  }
  const columns = tableColumnFrames(ctx.contentX, y, rowH, props.columns)
  for (const planned of columns) {
    const value = tableColumnValue(row, rowIndex, planned.column)
    const cellCtx: TableCellContext<Row> = {
      row,
      rowIndex,
      rowId,
      selected,
      column: planned.column,
      columnIndex: planned.columnIndex,
      value,
    }
    const textY = y + 7
    if (textY >= bodyY + TABLE_BODY_TEXT_TOP_INSET_PX && textY < bodyY + bodyH) {
      host.drawText(props.getCellText?.(cellCtx) ?? defaultCellText(value), planned.x + padX, textY, {
        fontPx,
        material: props.getCellMaterial?.(cellCtx) ?? host.materials.text,
        maxWidthPx: Math.max(1, planned.w - padX * 2),
        z: TABLE_BODY_TEXT_Z,
      })
    }

    if (props.onCellClick !== undefined && props.isCellInteractive?.(cellCtx) === true) {
      const hitX = Math.max(planned.x, x)
      const hitW = Math.min(planned.x + planned.w, x + ctx.viewportWidth) - hitX
      const hitY = Math.max(y, bodyY)
      const hitH = Math.min(y + rowH, bodyY + bodyH) - hitY
      if (hitW > 0 && hitH > 0) {
        const cursor = typeof props.cellCursor === "function" ? props.cellCursor(cellCtx) : props.cellCursor
        host.hit(hitX, hitY, hitW, hitH, () => props.onCellClick?.(cellCtx), {
          key: `${key}:cell:${rowIndex}:${planned.column.key}`,
          cursor: cursor ?? "pointer",
        })
      }
    }
  }
}

function tableColumnValue<Row>(row: Row, rowIndex: number, column: TableColumn<Row>): unknown {
  if (column.getValue !== undefined) return column.getValue(row, rowIndex)
  if (row !== null && typeof row === "object" && column.key in row) return (row as Record<string, unknown>)[column.key]
  return undefined
}

function tableRowId<Row>(row: Row, rowIndex: number, props: TableProps<Row>): TableRowId {
  return props.getRowId?.(row, rowIndex) ?? rowIndex
}

function tableRowPointerContext<Row>(
  row: Row,
  rowIndex: number,
  rowId: TableRowId,
  selected: boolean,
  props: TableProps<Row>,
  ctx: DivScrollContext,
  localX: number,
  event: MouseEvent | undefined,
): TableRowPointerContext<Row> {
  const columns = tableColumnFrames(ctx.contentX, 0, 0, props.columns)
  for (const planned of columns) {
    if (localX >= planned.x && localX <= planned.x + planned.w) {
      const value = tableColumnValue(row, rowIndex, planned.column)
      const cell: TableCellContext<Row> = {
        row,
        rowIndex,
        rowId,
        selected,
        column: planned.column,
        columnIndex: planned.columnIndex,
        value,
      }
      return {
        row,
        rowIndex,
        rowId,
        selected,
        event,
        cell,
        column: planned.column,
        columnIndex: planned.columnIndex,
        value,
      }
    }
  }
  return {row, rowIndex, rowId, selected, event, cell: null, column: null, columnIndex: null, value: undefined}
}

function tableColumnFrames<Row>(
  x: number,
  y: number,
  height: number,
  columns: readonly TableColumn<Row>[],
): readonly TableColumnFrame<Row>[] {
  const frames: TableColumnFrame<Row>[] = []
  const contentWidth = columns.reduce((sum, column) => sum + Math.max(1, column.width), 0)
  flexRow({
    x,
    y,
    w: contentWidth,
    h: height,
    gap: 0,
    alignItems: "stretch",
    items: columns.map((column, columnIndex) => ({
      width: Math.max(1, column.width),
      height,
      draw: (slotX, slotY, slotW, slotH) => frames.push(Object.freeze({
        column,
        columnIndex,
        x: slotX,
        y: slotY,
        w: slotW,
        h: slotH,
      })),
    })),
  })
  return Object.freeze(frames)
}

function tableColumnsEndX<Row>(columns: readonly TableColumnFrame<Row>[], fallback: number): number {
  const last = columns.at(-1)
  return last === undefined ? fallback : last.x + last.w
}

function uniqueRowIds(ids: readonly TableRowId[]): TableRowId[] {
  const out: TableRowId[] = []
  for (const id of ids) if (!out.includes(id)) out.push(id)
  return out
}

function tableRangeRowIds(rowIds: readonly TableRowId[], from: TableRowId, to: TableRowId): TableRowId[] {
  const a = rowIds.indexOf(from)
  const b = rowIds.indexOf(to)
  if (a < 0 || b < 0) return []
  const start = Math.min(a, b)
  const end = Math.max(a, b)
  return rowIds.slice(start, end + 1)
}

function defaultCellText(value: unknown): string {
  if (value === undefined || value === null) return ""
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") return String(value)
  return JSON.stringify(value)
}

function withAlpha(color: Color, alpha: number): Color {
  return new Color(color.r, color.g, color.b, alpha)
}
