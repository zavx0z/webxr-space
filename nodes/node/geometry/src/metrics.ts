import {NODE_BORDER_WIDTH, NODE_ROW_HEIGHT, SOCKET_GLYPH_SIZE} from "@nodes/sockets/metrics"

export const NODE_MINIMUM_WIDTH = 100
export const NODE_HEADER_HEIGHT = 22
export const NODE_BODY_PADDING_TOP = 8
export const NODE_BODY_PADDING_BOTTOM = 6
export const NODE_ROW_GAP = 3

export const NODE_COLLAPSED_HEIGHT = NODE_BORDER_WIDTH * 2 + NODE_HEADER_HEIGHT

export type NodeGeometryRowInput = Readonly<{
  height?: number | undefined
  spacingBefore?: number | undefined
  socketIds?: readonly string[] | undefined
}>

export type NodeGeometryRow = Readonly<{
  index: number
  top: number
  height: number
  centerY: number
  socketIds: readonly string[]
}>

export type NodeGeometryPlan = Readonly<{
  width: number
  height: number
  contentHeight: number
  rows: readonly NodeGeometryRow[]
  sockets: readonly Readonly<{id: string; y: number}>[]
}>

/**
 * Строит геометрию Node только из чисел, без чтения уже отрисованного дерева.
 * Высота каждой сложной строки передаётся её владельцем явно.
 */
export function planNodeGeometry(input: Readonly<{
  width?: number | undefined
  rows: readonly NodeGeometryRowInput[]
  collapsed?: boolean | undefined
  contentVisible?: boolean | undefined
}>): NodeGeometryPlan {
  const requestedWidth = input.width ?? NODE_MINIMUM_WIDTH
  positiveFinite(requestedWidth, "Node requested width")
  const width = Math.max(NODE_MINIMUM_WIDTH, requestedWidth)
  const contentHeight = input.contentVisible === true ? width : 0
  if (input.collapsed === true) {
    const socketRows = input.rows.filter(row => (row.socketIds?.length ?? 0) > 0)
    const headerHeight = Math.max(NODE_HEADER_HEIGHT, socketRows.length * SOCKET_GLYPH_SIZE)
    const seen = new Set<string>()
    const sockets = socketRows.flatMap((row, index) => (row.socketIds ?? []).map(id => {
      if (seen.has(id)) throw new Error(`Node geometry Socket id must be unique: ${id}`)
      seen.add(id)
      return Object.freeze({id, y: contentHeight + NODE_BORDER_WIDTH + headerHeight * (index + .5) / socketRows.length})
    }))
    const height = contentHeight + NODE_BORDER_WIDTH * 2 + headerHeight
    return Object.freeze({width, height, contentHeight: height, rows: Object.freeze([]), sockets: Object.freeze(sockets)})
  }
  const socketIds = new Set<string>()
  let cursor = contentHeight + NODE_BORDER_WIDTH + NODE_HEADER_HEIGHT + NODE_BODY_PADDING_TOP
  const rows = input.rows.map((inputRow, index): NodeGeometryRow => {
    const height = inputRow.height ?? NODE_ROW_HEIGHT
    const spacingBefore = inputRow.spacingBefore ?? 0
    positiveFinite(height, `Node row ${index} height`)
    nonNegativeFinite(spacingBefore, `Node row ${index} spacingBefore`)
    if (index > 0) cursor += NODE_ROW_GAP
    cursor += spacingBefore
    const top = cursor
    const rowSocketIds = Object.freeze([...(inputRow.socketIds ?? [])])
    for (const socketId of rowSocketIds) {
      if (socketId.trim().length === 0) throw new TypeError(`Node row ${index} Socket id must be non-empty`)
      if (socketIds.has(socketId)) throw new Error(`Node geometry Socket id must be unique: ${socketId}`)
      socketIds.add(socketId)
    }
    cursor += height
    return Object.freeze({
      index,
      top,
      height,
      centerY: top + height / 2,
      socketIds: rowSocketIds,
    })
  })
  const height = cursor + NODE_BODY_PADDING_BOTTOM + NODE_BORDER_WIDTH
  const sockets = Object.freeze(rows.flatMap(row => row.socketIds.map(id => Object.freeze({
    id,
    y: row.centerY,
  }))))
  return Object.freeze({
    width,
    height,
    contentHeight: height,
    rows: Object.freeze(rows),
    sockets,
  })
}

function positiveFinite(value: number, label: string): number {
  if (!Number.isFinite(value) || value <= 0) throw new TypeError(`${label} must be a positive finite number`)
  return value
}

function nonNegativeFinite(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) throw new TypeError(`${label} must be a non-negative finite number`)
  return value
}
