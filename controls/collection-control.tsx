import type {Event} from "@zavx0z/dom"
import {Button, IconButton} from "../button.tsx"
import {minusIcon, plusIcon} from "../icon-assets.ts"
import {List} from "../list.tsx"

export type CollectionControlItem = Readonly<{
  id: string
  label: string
  iconSrc?: string | undefined
  description?: string | undefined
  disabled?: boolean | undefined
}>

export type CollectionControlDensity = "regular" | "compact"
export type CollectionControlMoveDirection = "up" | "down"

export type CollectionControlProps = Readonly<{
  items: readonly CollectionControlItem[]
  selectedId: string | null
  visibleRows?: number | undefined
  emptyLabel?: string | undefined
  disabled?: boolean | undefined
  readOnly?: boolean | undefined
  density?: CollectionControlDensity | undefined
  title?: string | undefined
  style?: CssStyle | undefined
  onSelect?: ((id: string, event: Event) => void) | undefined
  onAdd?: ((event: Event) => void) | undefined
  onRemove?: ((id: string, event: Event) => void) | undefined
  onMove?: ((id: string, direction: CollectionControlMoveDirection, event: Event) => void) | undefined
}>

export const COLLECTION_CONTROL_MIN_VISIBLE_ROWS = 1
export const COLLECTION_CONTROL_MAX_VISIBLE_ROWS = 8
export const COLLECTION_CONTROL_DEFAULT_VISIBLE_ROWS = 3

const listStyle: CssStyle = css`& { width: 0; flex-grow: 1; padding: 2px; }`
const actionStyle: CssStyle = css`
  & { width: 28px; min-width: 28px; height: 28px; padding: 0; border-radius: 4px; }
`
const hiddenStyle: CssStyle = css`& { display: none; }`

export function CollectionControl(props: CollectionControlProps) {
  const normalized = normalizeCollectionProps(props)
  const visibleHeight = visibleRowsHeight(normalized.visibleRows)
  const locked = props.disabled === true || props.readOnly === true
  const selectedIndex = normalized.selectedId === null
    ? -1
    : normalized.items.findIndex(item => item.id === normalized.selectedId)
  const selected = selectedIndex < 0 ? undefined : normalized.items[selectedIndex]
  const onSelect = (key: string, event: Event) => {
    if (!locked) props.onSelect?.(key, event)
  }
  const onAdd = (event: Event) => {
    if (!locked) props.onAdd?.(event)
  }
  const onRemove = (event: Event) => {
    if (!locked && normalized.selectedId !== null) props.onRemove?.(normalized.selectedId, event)
  }
  const moveUp = (event: Event) => {
    if (!locked && normalized.selectedId !== null) props.onMove?.(normalized.selectedId, "up", event)
  }
  const moveDown = (event: Event) => {
    if (!locked && normalized.selectedId !== null) props.onMove?.(normalized.selectedId, "down", event)
  }
  return <div title={props.title} style={css`
      & {
        box-sizing: border-box;
        display: flex;
        flex-direction: row;
        width: 320px;
        min-height: 28px;
        gap: 4px;
      }
      ${props.style}
    `}>
    <List
      items={normalized.items.map(item => ({
        key: item.id,
        label: item.label,
        iconSrc: item.iconSrc,
        detail: item.description,
        disabled: item.disabled
      }))}
      selectedKey={normalized.selectedId}
      disabled={props.disabled === true}
      dense={normalized.density === "compact"}
      variant="embedded"
      emptyLabel={props.emptyLabel ?? "No items"}
      style={css`${listStyle}${css`& { height: ${visibleHeight}px; max-height: ${visibleHeight}px; }`}`}
      onSelect={onSelect}
    />
    <div style={css`& { display: flex; flex-direction: column; width: 28px; gap: 2px; }`}>
      <IconButton
        label="Add item"
        iconSrc={plusIcon}
        title="Add item"
        disabled={locked || props.onAdd === undefined}
        style={actionStyle}
        onClick={onAdd}
      />
      <IconButton
        label="Remove selected item"
        iconSrc={minusIcon}
        title="Remove selected item"
        disabled={locked || selected === undefined || selected.disabled === true || props.onRemove === undefined}
        style={actionStyle}
        onClick={onRemove}
      />
      <Button
        label="↑"
        title="Move selected item up"
        disabled={locked || selectedIndex <= 0 || selected?.disabled === true || props.onMove === undefined}
        style={css`${actionStyle}${props.onMove === undefined && hiddenStyle}`}
        onClick={moveUp}
      />
      <Button
        label="↓"
        title="Move selected item down"
        disabled={locked || selectedIndex < 0 || selectedIndex >= normalized.items.length - 1 || selected?.disabled === true || props.onMove === undefined}
        style={css`${actionStyle}${props.onMove === undefined && hiddenStyle}`}
        onClick={moveDown}
      />
    </div>
  </div>
}


export function normalizeCollectionControlVisibleRows(value = COLLECTION_CONTROL_DEFAULT_VISIBLE_ROWS): number {
  if (!Number.isFinite(value)) return COLLECTION_CONTROL_DEFAULT_VISIBLE_ROWS
  return Math.max(COLLECTION_CONTROL_MIN_VISIBLE_ROWS, Math.min(COLLECTION_CONTROL_MAX_VISIBLE_ROWS, Math.trunc(value)))
}

export function findCollectionControlSelection(
  items: readonly CollectionControlItem[],
  selectedId: string | null
): CollectionControlItem | undefined {
  return selectedId === null ? undefined : items.find(item => item.id === selectedId)
}

function visibleRowsHeight(rows: number): number {
  const heights = [30, 56, 84, 110, 136, 162, 188, 214] as const
  return heights[rows - 1]!
}

function normalizeCollectionProps(props: CollectionControlProps): Readonly<{
  items: readonly CollectionControlItem[]
  selectedId: string | null
  visibleRows: number
  density: CollectionControlDensity
}> {
  if (!Array.isArray(props.items)) throw new TypeError("CollectionControl items must be an array")
  const ids = new Set<string>()
  const items = props.items.map(item => {
    if (typeof item.id !== "string" || item.id.length === 0) throw new TypeError("CollectionControl item id must not be empty")
    if (ids.has(item.id)) throw new Error(`CollectionControl item id must be unique: ${item.id}`)
    ids.add(item.id)
    if (typeof item.label !== "string") throw new TypeError("CollectionControl item label must be a string")
    return Object.freeze({...item})
  })
  if (props.selectedId !== null && !ids.has(props.selectedId)) {
    throw new Error(`CollectionControl selected id does not exist: ${props.selectedId}`)
  }
  const density = props.density ?? "regular"
  if (density !== "regular" && density !== "compact") throw new Error(`Unknown CollectionControl density: ${density}`)
  return Object.freeze({
    items: Object.freeze(items),
    selectedId: props.selectedId,
    visibleRows: normalizeCollectionControlVisibleRows(props.visibleRows),
    density
  })
}
