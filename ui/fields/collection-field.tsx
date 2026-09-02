import {Button, IconButton} from "../buttons/button.tsx"
import {collectionFieldHeight as resolveCollectionFieldHeight} from "../src/fields/layout.ts"
import {minusIcon, plusIcon} from "../src/shared/icon-assets.ts"
import {List} from "../views/list.tsx"
import {
  collectionVisibleRowsHeight,
  normalizeCollectionItems,
  normalizeCollectionVisibleRows
} from "../src/collection/model.ts"

export type CollectionFieldItem = Readonly<{
  id: string
  label: string
  iconSrc?: string | undefined
  description?: string | undefined
  disabled?: boolean | undefined
}>
export type CollectionFieldDensity = "regular" | "compact"
export type CollectionFieldMoveDirection = "up" | "down"
export type CollectionFieldProps = Readonly<{
  label?: string | undefined
  items: readonly CollectionFieldItem[]
  selectedId: string | null
  visibleRows?: number | undefined
  emptyLabel?: string | undefined
  density?: CollectionFieldDensity | undefined
  disabled?: boolean | undefined
  readOnly?: boolean | undefined
  title?: string | undefined
  style?: CssStyle | undefined
  onSelect?: ((id: string, event: Event) => void) | undefined
  onAdd?: ((event: Event) => void) | undefined
  onRemove?: ((id: string, event: Event) => void) | undefined
  onMove?: ((id: string, direction: CollectionFieldMoveDirection, event: Event) => void) | undefined
}>

export const collectionFieldLayout = Object.freeze({
  height(options: Readonly<{
    visibleRows?: number | undefined
    movable?: boolean | undefined
  }> = {}): number {
    return resolveCollectionFieldHeight(
      normalizeCollectionVisibleRows(options.visibleRows),
      options.movable === true
    )
  }
})

const actionStyle: CssStyle = css`
  width: 28px;
  min-width: 28px;
  height: var(--field-collection-action-height);
  padding: 0;
  border-radius: 4px;
`
const hiddenStyle: CssStyle = css`
  display: none;
`

export function CollectionField(props: CollectionFieldProps) {
  const items = normalizeCollectionItems(props.items, props.selectedId)
  const visibleRows = normalizeCollectionVisibleRows(props.visibleRows)
  const visibleHeight = collectionVisibleRowsHeight(visibleRows)
  const density = props.density ?? "regular"
  if (density !== "regular" && density !== "compact") throw new Error(`Unknown CollectionField density: ${density}`)
  const hasLabel = props.label !== undefined
  const selectedIndex = props.selectedId === null ? -1 : items.findIndex(item => item.id === props.selectedId)
  const selected = selectedIndex < 0 ? undefined : items[selectedIndex]
  const onSelect = (key: string, event: Event) => {
    if (props.disabled !== true) props.onSelect?.(key, event)
  }
  const onAdd = (event: Event) => {
    if (props.disabled !== true && props.readOnly !== true) props.onAdd?.(event)
  }
  const onRemove = (event: Event) => {
    if (props.disabled !== true && props.readOnly !== true && props.selectedId !== null) props.onRemove?.(props.selectedId, event)
  }
  const move = (direction: CollectionFieldMoveDirection, event: Event) => {
    if (props.disabled !== true && props.readOnly !== true && props.selectedId !== null) props.onMove?.(props.selectedId, direction, event)
  }
  return <div
    data-has-label={hasLabel ? "true" : undefined}
    title={props.title}
    style={css`
      box-sizing: border-box;
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      width: auto;
      min-width: 0;
      padding: 0;
      color: var(--widget-list-content);

      &[data-has-label="true"] {
        width: 100%;
        gap: var(--field-label-gap);
      }

      ${props.style}
    `}
  >
    <span
      hidden={!hasLabel}
      style={css`
        box-sizing: border-box;
        display: flex;
        align-items: center;
        width: 40%;
        min-width: 0;
        height: var(--field-label-height);
        color: var(--widget-list-content);
        font-size: var(--font-size-sm);

        &[hidden] {
          display: none;
        }
      `}>
      {props.label ?? ""}
    </span>
    <div
      data-labelled={hasLabel ? "true" : undefined}
      data-readonly={props.readOnly === true ? "true" : undefined}
      style={css`
        box-sizing: border-box;
        display: flex;
        flex-direction: row;
        width: 320px;
        min-height: var(--field-label-height);
        gap: var(--field-label-gap);

        &[data-labelled="true"] {
          width: 0;
          flex-grow: 1;
        }

        &[data-readonly="true"] {
          color: var(--widget-text-content-readonly);
        }
      `}>
      <List
        items={items.map(item => ({
          key: item.id,
          label: item.label,
          iconSrc: item.iconSrc,
          detail: item.description,
          disabled: item.disabled
        }))}
        selectedKey={props.selectedId}
        disabled={props.disabled === true}
        dense={density === "compact"}
        variant="embedded"
        emptyLabel={props.emptyLabel ?? "No items"}
        style={css`
          width: 0;
          flex-grow: 1;
          padding: 2px;
          height: ${visibleHeight}px;
          max-height: ${visibleHeight}px;
        `}
        onSelect={onSelect}
      />
      <div
        style={css`
          display: flex;
          flex-direction: column;
          width: 28px;
          gap: var(--field-collection-action-gap);
        `}>
        <IconButton
          label="Add item"
          iconSrc={plusIcon} title="Add item"
          disabled={props.disabled === true || props.readOnly === true || props.onAdd === undefined}
          style={actionStyle}
          onClick={onAdd}
        />
        <IconButton
          label="Remove selected item"
          iconSrc={minusIcon}
          title="Remove selected item"
          disabled={props.disabled === true || props.readOnly === true || selected === undefined || selected.disabled === true || props.onRemove === undefined}
          style={actionStyle} onClick={onRemove}
        />
        <Button
          label="↑"
          title="Move selected item up"
          disabled={props.disabled === true || props.readOnly === true || selectedIndex <= 0 || selected?.disabled === true || props.onMove === undefined}
          style={css`${actionStyle}${props.onMove === undefined && hiddenStyle}`}
          onClick={event => move("up", event)}/>
        <Button
          label="↓"
          title="Move selected item down"
          disabled={props.disabled === true || props.readOnly === true || selectedIndex < 0 || selectedIndex >= items.length - 1 || selected?.disabled === true || props.onMove === undefined}
          style={css`${actionStyle}${props.onMove === undefined && hiddenStyle}`}
          onClick={event => move("down", event)}
        />
      </div>
    </div>
  </div>
}
