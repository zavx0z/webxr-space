import type {Event} from "@zavx0z/dom"
import {useId} from "@zavx0z/react"
import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import {Button} from "./button.tsx"
import {TextField} from "./text-field.tsx"

export type InspectorCategory = Readonly<{
  id: string
  label: string
  title?: string | undefined
  disabled?: boolean | undefined
  groupStart?: boolean | undefined
  sectionIds?: readonly string[] | undefined
}>

export type InspectorContext = Readonly<{
  label: string
  title?: string | undefined
}>

export type InspectorProps = Readonly<{
  ariaLabel?: string | undefined
  categoriesLabel?: string | undefined
  categories: readonly InspectorCategory[]
  selectedCategoryId: string
  query: string
  searchLabel?: string | undefined
  searchPlaceholder?: string | undefined
  context?: InspectorContext | undefined
  children: JsxSourceElement
  style?: CssStyle | undefined
  onCategoryChange?: ((id: string, event: Event) => void) | undefined
  onQueryChange?: ((query: string, event: Event) => void) | undefined
}>

export type InspectorSectionsProps = Readonly<{
  children: readonly JsxSourceElement[]
  style?: CssStyle | undefined
}>

export type InspectorSectionProps = Readonly<{
  id: string
  label: string
  title?: string | undefined
  expanded: boolean
  disabled?: boolean | undefined
  hidden?: boolean | undefined
  children: JsxSourceElement
  style?: CssStyle | undefined
  onToggle?: ((id: string, expanded: boolean, event: Event) => void) | undefined
}>

export type InspectorTextSectionProps = Omit<InspectorSectionProps, "children"> & Readonly<{
  content: string
}>

const searchStyle: CssStyle = css`& { width: 115px; height: 22px; padding: 2px 8px; }`
const categoryStyle: CssStyle = css`
  & { width: 26px; min-width: 26px; height: 28px; margin-left: 4px; padding: 0; border: 0; border-radius: 0; background: transparent; box-shadow: none; }
`
const categoryGroupStartStyle: CssStyle = css`& { margin-top: 8px; }`
const selectedCategoryStyle: CssStyle = css`
  & { border-radius: 4px 0 0 4px; background: var(--widget-number-background-readonly); color: rgb(var(--surface-50)); }
`
const sectionHeaderStyle: CssStyle = css`
  & { width: 100%; height: 26px; padding: 0 5px; border: 0; border-radius: 4px; background: var(--widget-regular-outline); box-shadow: none; justify-content: flex-start; }
`
const expandedHeaderStyle: CssStyle = css`& { border-radius: 4px 4px 0 0; }`

type CategoryButtonProps = Readonly<{
  category: InspectorCategory
  selected: boolean
  onChange?: InspectorProps["onCategoryChange"]
}>

function CategoryButton(props: CategoryButtonProps) {
  const onClick = (event: Event) => props.onChange?.(props.category.id, event)
  return <Button
    label={props.category.label}
    title={props.category.title ?? props.category.label}
    aria-label={props.category.title ?? props.category.label}
    disabled={props.category.disabled === true}
    selected={props.selected}
    style={css`${categoryStyle}${props.category.groupStart === true && categoryGroupStartStyle}${props.selected && selectedCategoryStyle}`}
    onClick={onClick}
  />
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
      & { box-sizing: border-box; display: flex; flex-direction: row; align-items: center; justify-content: center; width: 100%; height: 30px; padding: 4px; background: var(--widget-number-background-readonly); }
    `}>
      <TextField
        type="search"
        value={props.query}
        placeholder={props.searchPlaceholder}
        aria-label={props.searchLabel ?? props.searchPlaceholder ?? "Search"}
        style={searchStyle}
        onInput={onInput}
      />
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
        & { display: flex; flex-direction: column; min-width: 0; flex-grow: 1; background: var(--widget-number-background-readonly); }
      `}>
        <div
          hidden={props.context === undefined}
          title={props.context?.title ?? props.context?.label}
          style={css`
              & { box-sizing: border-box; display: block; width: 100%; height: 28px; padding: 6px; background: var(--widget-number-background-readonly); }
              &[hidden] { display: none; }
            `}
        >{props.context?.label ?? ""}</div>
        {props.children}
      </div>
    </div>
  </aside>
}

export function InspectorSections(props: InspectorSectionsProps) {
  return <div style={css`
      & { box-sizing: border-box; display: flex; flex-direction: column; width: 100%; min-height: 0; flex-grow: 1; gap: 2px; padding: 7px; overflow-y: auto; scrollbar-width: thin; background: var(--widget-number-background-readonly); }
      ${props.style}
    `}>{props.children}</div>
}

export function InspectorSection(props: InspectorSectionProps) {
  const contentId = useId()
  const onClick = (event: Event) => props.onToggle?.(props.id, !props.expanded, event)
  return <section
    data-section-id={props.id}
    hidden={props.hidden === true}
    style={css`
        & { display: flex; flex-direction: column; width: 100%; overflow: clip; border-radius: 4px; background: var(--widget-regular-outline); }
        &[hidden] { display: none; }
        ${props.style}
      `}
  >
    <Button
      label={props.label}
      title={props.title ?? props.label}
      aria-expanded={String(props.expanded)}
      aria-controls={contentId}
      disabled={props.disabled === true}
      style={css`${sectionHeaderStyle}${props.expanded && expandedHeaderStyle}`}
      onClick={onClick}
    />
    <div id={contentId} hidden={!props.expanded} style={css`
        & { box-sizing: border-box; display: block; width: 100%; padding: 6px; background: var(--widget-regular-outline); }
        &[hidden] { display: none; }
      `}>{props.children}</div>
  </section>
}

function InspectorTextContent(props: Readonly<{content: string}>) {
  return <span>{props.content}</span>
}

export function InspectorTextSection(props: InspectorTextSectionProps) {
  return <InspectorSection
    id={props.id}
    label={props.label}
    title={props.title}
    expanded={props.expanded}
    disabled={props.disabled}
    hidden={props.hidden}
    style={props.style}
    onToggle={props.onToggle}
  ><InspectorTextContent content={props.content} /></InspectorSection>
}

export function isInspectorSectionVisible(
  categories: readonly InspectorCategory[],
  selectedCategoryId: string,
  query: string,
  section: Readonly<{id: string; label: string}>
): boolean {
  const selected = categories.find(category => category.id === selectedCategoryId)
  const allowed = selected?.sectionIds === undefined ? null : new Set(selected.sectionIds)
  const categoryVisible = selected !== undefined && (allowed === null || allowed.has(section.id))
  const normalizedQuery = query.trim().toLocaleLowerCase()
  return categoryVisible && (normalizedQuery.length === 0 || section.label.toLocaleLowerCase().includes(normalizedQuery))
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
