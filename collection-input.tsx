import type {Event} from "@zavx0z/dom"
import {defineStyles, type CSSProperties, type StyleValue} from "@zavx0z/react"
import {Button} from "./button.tsx"
import {List, listCss} from "./list.tsx"

export type CollectionInputItem = Readonly<{
  id: string
  label: string
  description?: string | undefined
  disabled?: boolean | undefined
}>

export type CollectionInputDensity = "regular" | "compact"
export type CollectionInputMoveDirection = "up" | "down"

export type CollectionInputProps = Readonly<{
  items: readonly CollectionInputItem[]
  selectedId: string | null
  visibleRows?: number | undefined
  emptyLabel?: string | undefined
  disabled?: boolean | undefined
  readOnly?: boolean | undefined
  density?: CollectionInputDensity | undefined
  title?: string | undefined
  style?: StyleValue
  onSelect?: ((id: string, event: Event) => void) | undefined
  onAdd?: ((event: Event) => void) | undefined
  onRemove?: ((id: string, event: Event) => void) | undefined
  onMove?: ((id: string, direction: CollectionInputMoveDirection, event: Event) => void) | undefined
}>

export const COLLECTION_INPUT_MIN_VISIBLE_ROWS = 1
export const COLLECTION_INPUT_MAX_VISIBLE_ROWS = 8
export const COLLECTION_INPUT_DEFAULT_VISIBLE_ROWS = 3

export const collectionInputStyles = defineStyles("@ui/components/collection-input", {
  root: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "row",
    width: 320,
    minHeight: 28,
    gap: 4
  },
  list: {width: 0, flexGrow: 1, padding: 2},
  actions: {display: "flex", flexDirection: "column", width: 28, gap: 2},
  action: {
    width: 28,
    minWidth: 28,
    height: 28,
    padding: 0,
    borderRadius: 4
  },
  hidden: {display: "none"}
})

export const collectionInputCss = [
  listCss,
  collectionInputStyles.cssText
].join("\n")

export function CollectionInput(props: CollectionInputProps) {
  const normalized = normalizeCollectionProps(props)
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
  return <div title={props.title} style={[collectionInputStyles.root, props.style]}>
    <List
      items={normalized.items.map(item => ({
        key: item.id,
        label: item.label,
        detail: item.description,
        disabled: item.disabled
      }))}
      selectedKey={normalized.selectedId}
      disabled={props.disabled === true}
      dense={normalized.density === "compact"}
      variant="embedded"
      emptyLabel={props.emptyLabel ?? "No items"}
      style={[collectionInputStyles.list, listHeight(normalized.visibleRows)]}
      onSelect={onSelect}
    />
    <div style={collectionInputStyles.actions}>
      <Button
        label="+"
        title="Add item"
        disabled={locked || props.onAdd === undefined}
        style={collectionInputStyles.action}
        onClick={onAdd}
      />
      <Button
        label="−"
        title="Remove selected item"
        disabled={locked || selected === undefined || selected.disabled === true || props.onRemove === undefined}
        style={collectionInputStyles.action}
        onClick={onRemove}
      />
      <Button
        label="↑"
        title="Move selected item up"
        disabled={locked || selectedIndex <= 0 || selected?.disabled === true || props.onMove === undefined}
        style={[collectionInputStyles.action, props.onMove === undefined && collectionInputStyles.hidden]}
        onClick={moveUp}
      />
      <Button
        label="↓"
        title="Move selected item down"
        disabled={locked || selectedIndex < 0 || selectedIndex >= normalized.items.length - 1 || selected?.disabled === true || props.onMove === undefined}
        style={[collectionInputStyles.action, props.onMove === undefined && collectionInputStyles.hidden]}
        onClick={moveDown}
      />
    </div>
  </div>
}


export function normalizeCollectionInputVisibleRows(value = COLLECTION_INPUT_DEFAULT_VISIBLE_ROWS): number {
  if (!Number.isFinite(value)) return COLLECTION_INPUT_DEFAULT_VISIBLE_ROWS
  return Math.max(COLLECTION_INPUT_MIN_VISIBLE_ROWS, Math.min(COLLECTION_INPUT_MAX_VISIBLE_ROWS, Math.trunc(value)))
}

export function findCollectionInputSelection(
  items: readonly CollectionInputItem[],
  selectedId: string | null
): CollectionInputItem | undefined {
  return selectedId === null ? undefined : items.find(item => item.id === selectedId)
}

function listHeight(rows: number): CSSProperties {
  const heights = [30, 56, 84, 110, 136, 162, 188, 214] as const
  return Object.freeze({height: heights[rows - 1]!, maxHeight: heights[rows - 1]!})
}

function normalizeCollectionProps(props: CollectionInputProps): Readonly<{
  items: readonly CollectionInputItem[]
  selectedId: string | null
  visibleRows: number
  density: CollectionInputDensity
}> {
  if (!Array.isArray(props.items)) throw new TypeError("CollectionInput items must be an array")
  const ids = new Set<string>()
  const items = props.items.map(item => {
    if (typeof item.id !== "string" || item.id.length === 0) throw new TypeError("CollectionInput item id must not be empty")
    if (ids.has(item.id)) throw new Error(`CollectionInput item id must be unique: ${item.id}`)
    ids.add(item.id)
    if (typeof item.label !== "string") throw new TypeError("CollectionInput item label must be a string")
    return Object.freeze({...item})
  })
  if (props.selectedId !== null && !ids.has(props.selectedId)) {
    throw new Error(`CollectionInput selected id does not exist: ${props.selectedId}`)
  }
  const density = props.density ?? "regular"
  if (density !== "regular" && density !== "compact") throw new Error(`Unknown CollectionInput density: ${density}`)
  return Object.freeze({
    items: Object.freeze(items),
    selectedId: props.selectedId,
    visibleRows: normalizeCollectionInputVisibleRows(props.visibleRows),
    density
  })
}
