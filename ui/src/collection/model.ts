import {collectionVisibleRowsHeight as resolveCollectionVisibleRowsHeight} from "../fields/layout.ts"

export type CollectionItemShape = Readonly<{
  id: string
  label: string
  disabled?: boolean | undefined
}>

export const COLLECTION_MIN_VISIBLE_ROWS = 1
export const COLLECTION_MAX_VISIBLE_ROWS = 8
export const COLLECTION_DEFAULT_VISIBLE_ROWS = 3

export function normalizeCollectionVisibleRows(value = COLLECTION_DEFAULT_VISIBLE_ROWS): number {
  if (!Number.isFinite(value)) return COLLECTION_DEFAULT_VISIBLE_ROWS
  return Math.max(COLLECTION_MIN_VISIBLE_ROWS, Math.min(COLLECTION_MAX_VISIBLE_ROWS, Math.trunc(value)))
}

export function collectionVisibleRowsHeight(rows: number): number {
  return resolveCollectionVisibleRowsHeight(rows)
}

export function normalizeCollectionItems<T extends CollectionItemShape>(
  items: readonly T[],
  selectedId: string | null
): readonly T[] {
  if (!Array.isArray(items)) throw new TypeError("CollectionField items must be an array")
  const ids = new Set<string>()
  const normalized = items.map(item => {
    if (typeof item.id !== "string" || item.id.length === 0) throw new TypeError("CollectionField item id must not be empty")
    if (ids.has(item.id)) throw new Error(`CollectionField item id must be unique: ${item.id}`)
    ids.add(item.id)
    if (typeof item.label !== "string") throw new TypeError("CollectionField item label must be a string")
    return Object.freeze({...item}) as T
  })
  if (selectedId !== null && !ids.has(selectedId)) {
    throw new Error(`CollectionField selected id does not exist: ${selectedId}`)
  }
  return Object.freeze(normalized)
}
