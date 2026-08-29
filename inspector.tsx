import type {Event} from "@zavx0z/dom"
import {defineStyles, useId, type StyleValue} from "@zavx0z/react"
import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import {Button} from "./button.tsx"
import {TextField, textFieldCss} from "./text-field.tsx"

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
  style?: StyleValue
  onCategoryChange?: ((id: string, event: Event) => void) | undefined
  onQueryChange?: ((query: string, event: Event) => void) | undefined
}>

export type InspectorSectionsProps = Readonly<{
  children: readonly JsxSourceElement[]
  style?: StyleValue
}>

export type InspectorSectionProps = Readonly<{
  id: string
  label: string
  title?: string | undefined
  expanded: boolean
  disabled?: boolean | undefined
  hidden?: boolean | undefined
  children: JsxSourceElement
  style?: StyleValue
  onToggle?: ((id: string, expanded: boolean, event: Event) => void) | undefined
}>

export type InspectorTextSectionProps = Omit<InspectorSectionProps, "children"> & Readonly<{
  content: string
}>

export const inspectorStyles = defineStyles("@ui/components/inspector", {
  root: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "100%",
    overflow: "clip",
    border: "1px solid rgb(22 22 22)",
    borderRadius: 6,
    background: "rgb(48 48 48)",
    color: "rgb(224 224 224)",
    fontSize: 12
  },
  toolbar: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 30,
    padding: 4,
    background: "rgb(48 48 48)"
  },
  search: {width: 115, height: 22, padding: "2px 8px"},
  body: {display: "flex", flexDirection: "row", width: "100%", flexGrow: 1},
  rail: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    width: 30,
    height: "100%",
    gap: 0,
    padding: "8px 0",
    background: "rgb(29 29 29)"
  },
  category: {
    width: 26,
    minWidth: 26,
    height: 28,
    marginLeft: 4,
    padding: 0,
    border: 0,
    borderRadius: 0,
    background: "transparent",
    boxShadow: "none"
  },
  categoryGroupStart: {marginTop: 8},
  selectedCategory: {borderRadius: "4px 0 0 4px", background: "rgb(48 48 48)", color: "rgb(240 240 240)"},
  content: {display: "flex", flexDirection: "column", minWidth: 0, flexGrow: 1, background: "rgb(48 48 48)"},
  context: {boxSizing: "border-box", display: "block", width: "100%", height: 28, padding: 6, background: "rgb(48 48 48)"},
  sections: {
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    width: "100%",
    minHeight: 0,
    flexGrow: 1,
    gap: 2,
    padding: 7,
    overflowY: "auto",
    scrollbarWidth: "thin",
    background: "rgb(48 48 48)"
  },
  section: {display: "flex", flexDirection: "column", width: "100%", overflow: "clip", borderRadius: 4, background: "rgb(61 61 61)"},
  sectionHeader: {width: "100%", height: 26, padding: "0 5px", border: 0, borderRadius: 4, background: "rgb(61 61 61)", boxShadow: "none", justifyContent: "flex-start"},
  expandedHeader: {borderRadius: "4px 4px 0 0"},
  sectionContent: {boxSizing: "border-box", display: "block", width: "100%", padding: 6, background: "rgb(61 61 61)"},
  hidden: {display: "none"}
})

export const inspectorCss = [
  textFieldCss,
  inspectorStyles.cssText
].join("\n")

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
    style={[
      inspectorStyles.category,
      props.category.groupStart === true && inspectorStyles.categoryGroupStart,
      props.selected && inspectorStyles.selectedCategory
    ]}
    onClick={onClick}
  />
}

export function Inspector(props: InspectorProps) {
  assertInspectorProps(props)
  const onInput = (query: string, event: Event) => props.onQueryChange?.(query, event)
  return <aside
    aria-label={props.ariaLabel ?? "Inspector"}
    style={[inspectorStyles.root, props.style]}
  >
    <header style={inspectorStyles.toolbar}>
      <TextField
        type="search"
        value={props.query}
        placeholder={props.searchPlaceholder}
        aria-label={props.searchLabel ?? props.searchPlaceholder ?? "Search"}
        style={inspectorStyles.search}
        onInput={onInput}
      />
    </header>
    <div style={inspectorStyles.body}>
      <nav aria-label={props.categoriesLabel ?? "Categories"} style={inspectorStyles.rail}>
        {props.categories.map(category => <CategoryButton
          key={category.id}
          category={category}
          selected={category.id === props.selectedCategoryId}
          onChange={props.onCategoryChange}
        />)}
      </nav>
      <div role="region" aria-label="Inspector content" style={inspectorStyles.content}>
        <div
          hidden={props.context === undefined}
          title={props.context?.title ?? props.context?.label}
          style={[inspectorStyles.context, props.context === undefined && inspectorStyles.hidden]}
        >{props.context?.label ?? ""}</div>
        {props.children}
      </div>
    </div>
  </aside>
}

export function InspectorSections(props: InspectorSectionsProps) {
  return <div style={[inspectorStyles.sections, props.style]}>{props.children}</div>
}

export function InspectorSection(props: InspectorSectionProps) {
  const contentId = useId()
  const onClick = (event: Event) => props.onToggle?.(props.id, !props.expanded, event)
  return <section
    data-section-id={props.id}
    hidden={props.hidden === true}
    style={[inspectorStyles.section, props.hidden === true && inspectorStyles.hidden, props.style]}
  >
    <Button
      label={props.label}
      title={props.title ?? props.label}
      aria-expanded={String(props.expanded)}
      aria-controls={contentId}
      disabled={props.disabled === true}
      style={[inspectorStyles.sectionHeader, props.expanded && inspectorStyles.expandedHeader]}
      onClick={onClick}
    />
    <div id={contentId} hidden={!props.expanded} style={[inspectorStyles.sectionContent, !props.expanded && inspectorStyles.hidden]}>{props.children}</div>
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
