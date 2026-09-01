import type {Event} from "@zavx0z/dom"
import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import {Button, IconButton} from "./button.tsx"
import {TextField} from "./fields/text-field.tsx"
import {searchIcon} from "./icon-assets.ts"

export type InspectorCategory = Readonly<{
  id: string
  label: string
  iconSrc?: string | undefined
  title?: string | undefined
  disabled?: boolean | undefined
  groupStart?: boolean | undefined
  panelIds?: readonly string[] | undefined
}>

export type InspectorAction = Readonly<{
  id: string
  label: string
  iconSrc: string
  title?: string | undefined
  disabled?: boolean | undefined
  selected?: boolean | undefined
  action?: ((event: Event) => void) | undefined
}>

export type InspectorContextRow = Readonly<{
  label: string
  iconSrc?: string | undefined
  title?: string | undefined
  actions?: readonly InspectorAction[] | undefined
}>

export type InspectorContext = InspectorContextRow & Readonly<{
  secondary?: InspectorContextRow | undefined
}>

export type InspectorProps = Readonly<{
  ariaLabel?: string | undefined
  categoriesLabel?: string | undefined
  categories: readonly InspectorCategory[]
  selectedCategoryId: string
  query: string
  searchLabel?: string | undefined
  searchPlaceholder?: string | undefined
  toolbarLeadingActions?: readonly InspectorAction[] | undefined
  toolbarActions?: readonly InspectorAction[] | undefined
  context?: InspectorContext | undefined
  children: readonly JsxSourceElement[]
  style?: CssStyle | undefined
  onCategoryChange?: ((id: string, event: Event) => void) | undefined
  onQueryChange?: ((query: string, event: Event) => void) | undefined
}>

const searchStyle: CssStyle = css`
  & { width: 100%; height: 22px; --text-field-width: 100%; --text-field-height: 22px; --text-field-padding: 2px 8px 2px 23px; }
`
const categoryStyle: CssStyle = css`
  & { width: 26px; min-width: 26px; height: 28px; margin-left: 4px; padding: 0; border: 0; border-radius: 0; background: transparent; box-shadow: none; }
`
const categoryGroupStartStyle: CssStyle = css`& { margin-top: 8px; }`
const selectedCategoryStyle: CssStyle = css`
  & { border-radius: 4px 0 0 4px; background: var(--widget-number-background-readonly); color: rgb(var(--surface-50)); }
`
const actionStyle: CssStyle = css`
  & { width: 22px; min-width: 22px; height: 22px; padding: 2px; border: 0; background: transparent; box-shadow: none; }
`

type CategoryButtonProps = Readonly<{
  category: InspectorCategory
  selected: boolean
  onChange?: InspectorProps["onCategoryChange"]
}>

function CategoryButton(props: CategoryButtonProps) {
  const onClick = (event: Event) => props.onChange?.(props.category.id, event)
  return <Button
    label={props.category.label}
    iconSrc={props.category.iconSrc}
    iconOnly={props.category.iconSrc !== undefined}
    iconSize={16}
    title={props.category.title ?? props.category.label}
    aria-label={props.category.title ?? props.category.label}
    disabled={props.category.disabled === true}
    selected={props.selected}
    style={css`${categoryStyle}${props.category.groupStart === true && categoryGroupStartStyle}${props.selected && selectedCategoryStyle}`}
    onClick={onClick}
  />
}

function InspectorContextRowView(props: Readonly<{
  context: InspectorContextRow
  secondary: boolean
}>) {
  return <div
    data-secondary={props.secondary ? "true" : undefined}
    title={props.context.title ?? props.context.label}
    style={css`
      & { box-sizing: border-box; display: flex; flex-direction: row; align-items: center; width: 100%; height: 28px; gap: 4px; padding: 3px 6px; background: var(--widget-number-background-readonly); }
      &[data-secondary="true"] { height: 24px; }
    `}
  >
    <img
      src={props.context.iconSrc ?? ""}
      alt=""
      aria-hidden="true"
      width={16}
      height={16}
      hidden={props.context.iconSrc === undefined}
      style={css`
        & { width: 16px; height: 16px; object-fit: contain; flex-shrink: 0; }
        &[hidden] { display: none; }
      `}
    />
    <span style={css`& { display: inline; min-width: 0; flex-grow: 1; overflow: clip; white-space: nowrap; text-overflow: ellipsis; }`}>{props.context.label}</span>
    <nav aria-label={`${props.context.label} actions`} style={css`
      & { display: flex; flex-direction: row; align-items: center; gap: 2px; }
    `}>{(props.context.actions ?? []).map(action => <IconButton
      key={action.id}
      label={action.label}
      iconSrc={action.iconSrc}
      title={action.title ?? action.label}
      disabled={action.disabled === true}
      selected={action.selected}
      iconSize={14}
      style={actionStyle}
      onClick={action.action}
    />)}</nav>
  </div>
}

export function Inspector(props: InspectorProps) {
  assertInspectorProps(props)
  const onInput = (query: string, event: Event) => props.onQueryChange?.(query, event)
  return <aside
    aria-label={props.ariaLabel ?? "Inspector"}
    style={css`
        & {
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
          overflow: clip;
          border: var(--border-width-control) solid var(--material-editor-border);
          border-radius: 6px;
          background: var(--widget-number-background-readonly);
          color: rgb(var(--surface-150));
          font-size: var(--font-size-sm);
        }
        ${props.style}
      `}
  >
    <header style={css`
      & { box-sizing: border-box; display: flex; flex-direction: row; align-items: center; width: 100%; height: 30px; gap: 4px; padding: 4px; background: var(--widget-number-background-readonly); }
    `}>
      <div style={css`
        & { display: flex; flex-direction: row; align-items: center; width: 0; min-width: 22px; flex-grow: 1; gap: 2px; }
      `}>{(props.toolbarLeadingActions ?? []).map(action => <IconButton
        key={action.id}
        label={action.label}
        iconSrc={action.iconSrc}
        title={action.title ?? action.label}
        disabled={action.disabled === true}
        selected={action.selected}
        iconSize={14}
        style={actionStyle}
        onClick={action.action}
      />)}</div>
      <div style={css`
        & { position: relative; display: block; width: 115px; min-width: 115px; height: 22px; }
      `}>
        <img
          src={searchIcon}
          alt=""
          aria-hidden="true"
          width={13}
          height={13}
          style={css`
            & { position: absolute; left: 6px; top: 4px; width: 13px; height: 13px; object-fit: contain; pointer-events: none; }
          `}
        />
        <TextField
          type="search"
          value={props.query}
          placeholder={props.searchPlaceholder}
          title={props.searchLabel}
          style={searchStyle}
          onInput={onInput}
        />
      </div>
      <div style={css`
        & { display: flex; flex-direction: row; align-items: center; justify-content: flex-end; width: 0; min-width: 22px; flex-grow: 1; gap: 2px; }
      `}>{(props.toolbarActions ?? []).map(action => <IconButton
        key={action.id}
        label={action.label}
        iconSrc={action.iconSrc}
        title={action.title ?? action.label}
        disabled={action.disabled === true}
        selected={action.selected}
        iconSize={14}
        style={actionStyle}
        onClick={action.action}
      />)}</div>
    </header>
    <div style={css`& { display: flex; flex-direction: row; width: 100%; flex-grow: 1; }`}>
      <nav aria-label={props.categoriesLabel ?? "Categories"} style={css`
        & { box-sizing: border-box; display: flex; flex-direction: column; width: 30px; height: 100%; gap: 0; padding: 8px 0; background: var(--widget-text-background); }
      `}>
        {props.categories.map(category => <CategoryButton
          key={category.id}
          category={category}
          selected={category.id === props.selectedCategoryId}
          onChange={props.onCategoryChange}
        />)}
      </nav>
      <div role="region" aria-label="Inspector content" style={css`
        & { display: flex; flex-direction: column; min-width: 0; min-height: 0; flex-grow: 1; background: var(--widget-number-background-readonly); }
      `}>
        {props.context === undefined ? null : <InspectorContextRowView context={props.context} secondary={false} />}
        {props.context?.secondary === undefined ? null : <InspectorContextRowView context={props.context.secondary} secondary={true} />}
        <div data-inspector-panels="" style={css`
          & { box-sizing: border-box; display: flex; flex-direction: column; width: 100%; min-height: 0; flex-grow: 1; gap: 2px; padding: 7px; overflow-y: auto; scrollbar-width: thin; background: var(--widget-number-background-readonly); }
        `}>{props.children}</div>
      </div>
    </div>
  </aside>
}

export function isInspectorPanelVisible(
  categories: readonly InspectorCategory[],
  selectedCategoryId: string,
  query: string,
  panel: Readonly<{id: string; label: string}>
): boolean {
  const selected = categories.find(category => category.id === selectedCategoryId)
  const allowed = selected?.panelIds === undefined ? null : new Set(selected.panelIds)
  const categoryVisible = selected !== undefined && (allowed === null || allowed.has(panel.id))
  const normalizedQuery = query.trim().toLocaleLowerCase()
  return categoryVisible && (normalizedQuery.length === 0 || panel.label.toLocaleLowerCase().includes(normalizedQuery))
}

function assertInspectorProps(props: InspectorProps): void {
  const categoryIds = new Set<string>()
  for (const category of props.categories) {
    if (category.id.length === 0) throw new Error("Inspector category id must not be empty")
    if (categoryIds.has(category.id)) throw new Error(`Inspector category id must be unique: ${category.id}`)
    categoryIds.add(category.id)
  }
  if (props.categories.length === 0) {
    if (props.selectedCategoryId !== "") throw new Error("Inspector selected category must be empty when categories are empty")
  } else if (!categoryIds.has(props.selectedCategoryId)) {
    throw new Error(`Inspector selected category does not exist: ${props.selectedCategoryId}`)
  }
}
