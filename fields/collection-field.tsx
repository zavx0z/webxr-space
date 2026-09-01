import {useId} from "@zavx0z/react"
import {CollectionControl, type CollectionControlItem, type CollectionControlMoveDirection} from "../controls/collection-control.tsx"

export type CollectionFieldItem = CollectionControlItem
export type CollectionFieldMoveDirection = CollectionControlMoveDirection
export type CollectionFieldProps = Readonly<{id: string; label: string; items: readonly CollectionFieldItem[]; selectedId: string | null; visibleRows?: number | undefined; emptyLabel?: string | undefined; description?: string | undefined; disabled?: boolean | undefined; readOnly?: boolean | undefined; style?: CssStyle | undefined; onSelect?: ((id: string) => void) | undefined; onAdd?: (() => void) | undefined; onRemove?: ((id: string) => void) | undefined; onMove?: ((id: string, direction: CollectionFieldMoveDirection) => void) | undefined}>
const controlStyle: CssStyle = css`& { width: 100%; }`
export function CollectionField(props: CollectionFieldProps) {
  assertIdentity(props.id, props.label)
  const labelId = useId()
  return <div data-field-id={props.id} data-field-kind="collection" aria-disabled={String(props.disabled === true)} title={props.description} style={css`
    & { box-sizing: border-box; display: flex; flex-direction: row; align-items: flex-start; width: 100%; min-width: 0; min-height: 28px; gap: 4px; padding: 0; color: var(--widget-list-content); }
    &[aria-disabled="true"] { opacity: 0.5; }
    ${props.style}
  `}>
    <span id={labelId} style={css`& { box-sizing: border-box; display: flex; align-items: center; width: 40%; min-width: 0; height: 28px; color: var(--widget-list-content); font-size: var(--font-size-sm); }`}>{props.label}</span>
    <div role="group" aria-labelledby={labelId} style={css`& { box-sizing: border-box; display: flex; align-items: flex-start; min-width: 0; min-height: 28px; flex-grow: 1; }`}>
      <CollectionControl items={props.items} selectedId={props.selectedId} visibleRows={props.visibleRows} emptyLabel={props.emptyLabel} disabled={props.disabled === true} readOnly={props.readOnly === true} title={props.description} style={controlStyle} onSelect={props.onSelect} onAdd={props.onAdd} onRemove={props.onRemove} onMove={props.onMove} />
    </div>
  </div>
}
function assertIdentity(id: string, label: string): void {
  if (!id) throw new TypeError("CollectionField id must not be empty")
  if (!label) throw new TypeError("CollectionField label must not be empty")
}
