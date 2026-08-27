import type {
  Document,
  HTMLButtonElement,
  HTMLElement,
  HTMLInputElement,
  Node,
} from "@zavx0z/dom"

export type InspectorDomContent = string | Node | readonly Node[]

export type InspectorDomCategory = Readonly<{
  id: string
  label: string
  title?: string
  disabled?: boolean
  groupStart?: boolean
  sectionIds?: readonly string[]
}>

export type InspectorDomSection = Readonly<{
  id: string
  label: string
  title?: string
  expanded: boolean
  disabled?: boolean
  content?: InspectorDomContent
}>

export type InspectorDomContext = Readonly<{
  label: string
  title?: string
}>

export type InspectorDomProps = Readonly<{
  ariaLabel?: string
  categoriesLabel?: string
  categories: readonly InspectorDomCategory[]
  selectedCategoryId: string
  sections: readonly InspectorDomSection[]
  query: string
  searchLabel?: string
  searchPlaceholder?: string
  context?: InspectorDomContext
  onCategoryChange?(id: string): void
  onQueryChange?(query: string): void
  onSectionToggle?(id: string, expanded: boolean): void
}>

export type InspectorDomRefs = Readonly<{
  root: HTMLElement
  toolbar: HTMLElement
  search: HTMLInputElement
  body: HTMLElement
  rail: HTMLElement
  content: HTMLElement
  context: HTMLElement
  sections: HTMLElement
  categoryButtons: ReadonlyMap<string, HTMLButtonElement>
  sectionElements: ReadonlyMap<string, HTMLElement>
  sectionButtons: ReadonlyMap<string, HTMLButtonElement>
  sectionContents: ReadonlyMap<string, HTMLElement>
}>

export type InspectorDomController = Readonly<{
  element: HTMLElement
  refs: InspectorDomRefs
  update(props: InspectorDomProps): void
  dispose(): void
}>

type CategoryEntry = {
  button: HTMLButtonElement
  onClick: () => void
}

type SectionEntry = {
  element: HTMLElement
  button: HTMLButtonElement
  content: HTMLElement
  onClick: () => void
}

export const inspectorCss = String.raw`
.ui-inspector {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border: 1px solid rgb(22, 22, 22);
  border-radius: 6px;
  background: rgb(48, 48, 48);
  color: rgb(224, 224, 224);
  font-size: 12px;
}

.ui-inspector__toolbar {
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 30px;
  padding: 4px;
  background: rgb(48, 48, 48);
}

.ui-inspector__search {
  box-sizing: border-box;
  width: 115px;
  height: 22px;
  padding: 2px 8px;
  border: 1px solid rgb(22, 22, 22);
  border-radius: 4px;
  background: rgb(36, 36, 36);
  color: rgb(224, 224, 224);
}

.ui-inspector__body {
  display: flex;
  flex-direction: row;
  width: 100%;
  flex-grow: 1;
}

.ui-inspector__rail {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 30px;
  height: 100%;
  gap: 0;
  padding: 8px 0;
  background: rgb(29, 29, 29);
}

.ui-inspector__category {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 28px;
  margin-left: 4px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: rgb(192, 192, 192);
}

.ui-inspector__category--group-start {
  margin-top: 8px;
}

.ui-inspector__category[aria-pressed="true"] {
  border-radius: 4px 0 0 4px;
  background: rgb(48, 48, 48);
  color: rgb(240, 240, 240);
}

.ui-inspector__category[disabled] {
  opacity: 0.5;
}

.ui-inspector__content {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex-grow: 1;
  background: rgb(48, 48, 48);
}

.ui-inspector__context {
  box-sizing: border-box;
  display: block;
  width: 100%;
  height: 28px;
  padding: 6px;
  background: rgb(48, 48, 48);
}

.ui-inspector__sections {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 0;
  flex-grow: 1;
  gap: 2px;
  padding: 7px;
  overflow-y: auto;
  scrollbar-width: thin;
  background: rgb(48, 48, 48);
}

.ui-inspector__section {
  display: flex;
  flex-direction: column;
  width: 100%;
  overflow: hidden;
  border-radius: 4px;
  background: rgb(61, 61, 61);
}

.ui-inspector__section-header {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  width: 100%;
  height: 26px;
  padding: 0 5px;
  border: 0;
  border-radius: 4px;
  background: rgb(61, 61, 61);
  color: rgb(224, 224, 224);
}

.ui-inspector__section-header[aria-expanded="true"] {
  border-radius: 4px 4px 0 0;
}

.ui-inspector__section-content {
  box-sizing: border-box;
  display: block;
  width: 100%;
  padding: 6px;
  background: rgb(61, 61, 61);
}

.ui-inspector [hidden] {
  display: none;
}
`

export function createInspector(
  document: Document,
  initialProps: InspectorDomProps,
): InspectorDomController {
  validateInspectorProps(initialProps)
  validateInspectorContents(initialProps.sections)

  const root = createElement(document, "aside", "ui-inspector")
  const toolbar = createElement(document, "header", "ui-inspector__toolbar")
  const search = document.createElement("input")
  search.className = "ui-inspector__search"
  const body = createElement(document, "div", "ui-inspector__body")
  const rail = createElement(document, "nav", "ui-inspector__rail")
  const content = createElement(document, "main", "ui-inspector__content")
  const context = createElement(document, "div", "ui-inspector__context")
  const sections = createElement(document, "div", "ui-inspector__sections")

  toolbar.appendChild(search)
  body.appendChild(rail)
  body.appendChild(content)
  content.appendChild(context)
  content.appendChild(sections)
  root.appendChild(toolbar)
  root.appendChild(body)

  const categoryEntries = new Map<string, CategoryEntry>()
  const sectionEntries = new Map<string, SectionEntry>()
  const categoryButtons = new Map<string, HTMLButtonElement>()
  const sectionElements = new Map<string, HTMLElement>()
  const sectionButtons = new Map<string, HTMLButtonElement>()
  const sectionContents = new Map<string, HTMLElement>()
  let currentProps = initialProps
  let disposed = false

  const onSearchInput = (): void => {
    currentProps.onQueryChange?.(search.value)
  }
  search.addEventListener("input", onSearchInput)

  const refs: InspectorDomRefs = Object.freeze({
    root,
    toolbar,
    search,
    body,
    rail,
    content,
    context,
    sections,
    categoryButtons,
    sectionElements,
    sectionButtons,
    sectionContents,
  })

  const update = (nextProps: InspectorDomProps): void => {
    if (disposed) throw new Error("Inspector DOM controller is disposed")
    validateInspectorProps(nextProps)
    validateInspectorContents(nextProps.sections)
    currentProps = nextProps
    document.transaction(() => {
      syncAttribute(root, "aria-label", nextProps.ariaLabel ?? "Inspector")
      syncAttribute(rail, "aria-label", nextProps.categoriesLabel ?? "Categories")
      syncSearch(search, nextProps)
      syncContext(context, nextProps.context)
      syncCategories(document, rail, categoryEntries, categoryButtons, () => currentProps, nextProps.categories)
      syncSections(
        document,
        sections,
        sectionEntries,
        sectionElements,
        sectionButtons,
        sectionContents,
        () => currentProps,
        nextProps.sections,
      )
      syncSectionVisibility(sectionEntries, nextProps)
    })
  }

  const dispose = (): void => {
    if (disposed) return
    disposed = true
    search.removeEventListener("input", onSearchInput)
    for (const {button, onClick} of categoryEntries.values()) {
      button.removeEventListener("click", onClick)
    }
    for (const {button, onClick} of sectionEntries.values()) {
      button.removeEventListener("click", onClick)
    }
    categoryEntries.clear()
    sectionEntries.clear()
    categoryButtons.clear()
    sectionElements.clear()
    sectionButtons.clear()
    sectionContents.clear()
  }

  const controller: InspectorDomController = Object.freeze({
    element: root,
    refs,
    update,
    dispose,
  })
  update(initialProps)
  return controller
}

function syncSearch(search: HTMLInputElement, props: InspectorDomProps): void {
  if (search.type !== "search") search.type = "search"
  if (search.value !== props.query) search.value = props.query
  const placeholder = props.searchPlaceholder ?? ""
  if (search.placeholder !== placeholder) search.placeholder = placeholder
  syncAttribute(
    search,
    "aria-label",
    props.searchLabel ?? props.searchPlaceholder ?? "Search",
  )
}

function syncContext(
  element: HTMLElement,
  context: InspectorDomContext | undefined,
): void {
  syncBooleanAttribute(element, "hidden", context === undefined)
  const label = context?.label ?? ""
  syncText(element, label)
  if (context === undefined) syncAttribute(element, "title", null)
  else syncTitle(element, context.title ?? label)
}

function syncCategories(
  document: Document,
  rail: HTMLElement,
  entries: Map<string, CategoryEntry>,
  refs: Map<string, HTMLButtonElement>,
  props: () => InspectorDomProps,
  categories: readonly InspectorDomCategory[],
): void {
  const retainedIds = new Set(categories.map(({id}) => id))
  for (const [id, entry] of entries) {
    if (retainedIds.has(id)) continue
    entry.button.removeEventListener("click", entry.onClick)
    entry.button.parentNode?.removeChild(entry.button)
    entries.delete(id)
    refs.delete(id)
  }

  const ordered: HTMLButtonElement[] = []
  for (const category of categories) {
    let entry = entries.get(category.id)
    if (entry === undefined) {
      const button = document.createElement("button")
      const onClick = (): void => props().onCategoryChange?.(category.id)
      button.addEventListener("click", onClick)
      button.setAttribute("type", "button")
      button.setAttribute("data-category-id", category.id)
      entry = {button, onClick}
      entries.set(category.id, entry)
      refs.set(category.id, button)
    }
    const {button} = entry
    syncAttribute(button, "class", category.groupStart === true
      ? "ui-inspector__category ui-inspector__category--group-start"
      : "ui-inspector__category")
    syncText(button, category.label)
    syncTitle(button, category.title ?? category.label)
    syncAttribute(button, "aria-label", category.title ?? category.label)
    syncAttribute(button, "aria-pressed", String(category.id === props().selectedCategoryId))
    if (button.disabled !== (category.disabled === true)) button.disabled = category.disabled === true
    ordered.push(button)
  }
  reconcileChildren(rail, ordered)
}

function syncSections(
  document: Document,
  parent: HTMLElement,
  entries: Map<string, SectionEntry>,
  elementRefs: Map<string, HTMLElement>,
  buttonRefs: Map<string, HTMLButtonElement>,
  contentRefs: Map<string, HTMLElement>,
  props: () => InspectorDomProps,
  sections: readonly InspectorDomSection[],
): void {
  const retainedIds = new Set(sections.map(({id}) => id))
  for (const [id, entry] of entries) {
    if (retainedIds.has(id)) continue
    entry.button.removeEventListener("click", entry.onClick)
    entry.element.parentNode?.removeChild(entry.element)
    entries.delete(id)
    elementRefs.delete(id)
    buttonRefs.delete(id)
    contentRefs.delete(id)
  }

  const ordered: HTMLElement[] = []
  for (const section of sections) {
    let entry = entries.get(section.id)
    if (entry === undefined) {
      const element = createElement(document, "section", "ui-inspector__section")
      const button = document.createElement("button")
      const sectionContent = createElement(document, "div", "ui-inspector__section-content")
      const onClick = (): void => {
        const current = props().sections.find(({id}) => id === section.id)
        if (current !== undefined) props().onSectionToggle?.(section.id, !current.expanded)
      }
      button.className = "ui-inspector__section-header"
      button.setAttribute("type", "button")
      button.addEventListener("click", onClick)
      element.setAttribute("data-section-id", section.id)
      element.appendChild(button)
      element.appendChild(sectionContent)
      entry = {element, button, content: sectionContent, onClick}
      entries.set(section.id, entry)
      elementRefs.set(section.id, element)
      buttonRefs.set(section.id, button)
      contentRefs.set(section.id, sectionContent)
    }
    syncText(entry.button, section.label)
    syncTitle(entry.button, section.title ?? section.label)
    syncAttribute(entry.button, "aria-expanded", String(section.expanded))
    if (entry.button.disabled !== (section.disabled === true)) {
      entry.button.disabled = section.disabled === true
    }
    syncBooleanAttribute(entry.content, "hidden", !section.expanded)
    syncInspectorContent(entry.content, section.content)
    ordered.push(entry.element)
  }
  reconcileChildren(parent, ordered)
}

function syncSectionVisibility(
  entries: ReadonlyMap<string, SectionEntry>,
  props: InspectorDomProps,
): void {
  const selected = props.categories.find(({id}) => id === props.selectedCategoryId)
  const allowed = selected === undefined
    ? new Set<string>()
    : selected.sectionIds === undefined
      ? null
      : new Set(selected.sectionIds)
  const query = props.query.trim().toLocaleLowerCase()
  for (const section of props.sections) {
    const entry = entries.get(section.id)
    if (entry === undefined) continue
    const categoryVisible = allowed === null || allowed.has(section.id)
    const queryVisible = query.length === 0 || section.label.toLocaleLowerCase().includes(query)
    syncBooleanAttribute(entry.element, "hidden", !categoryVisible || !queryVisible)
  }
}

function syncInspectorContent(
  element: HTMLElement,
  content: InspectorDomContent | undefined,
): void {
  if (content === undefined || typeof content === "string") {
    syncText(element, content ?? "")
    return
  }
  const nodes = Array.isArray(content) ? [...content] : [content as Node]
  reconcileChildren(element, nodes)
}

function reconcileChildren(parent: Node, ordered: readonly Node[]): void {
  const retained = new Set(ordered)
  for (const child of parent.childNodes) {
    if (!retained.has(child)) parent.removeChild(child)
  }

  let reference = parent.firstChild
  for (const child of ordered) {
    if (child === reference) {
      reference = reference.nextSibling
      continue
    }
    parent.insertBefore(child, reference)
  }
}

function createElement(
  document: Document,
  localName: string,
  className: string,
): HTMLElement {
  const element = document.createElement(localName)
  element.className = className
  return element
}

function syncAttribute(
  element: HTMLElement,
  name: string,
  value: string | null,
): void {
  if (value === null) {
    if (element.hasAttribute(name)) element.removeAttribute(name)
    return
  }
  if (element.getAttribute(name) !== value) element.setAttribute(name, value)
}

function syncBooleanAttribute(
  element: HTMLElement,
  name: string,
  enabled: boolean,
): void {
  if (enabled) {
    if (!element.hasAttribute(name)) element.setAttribute(name, "")
  } else if (element.hasAttribute(name)) {
    element.removeAttribute(name)
  }
}

function syncTitle(element: HTMLElement, title: string): void {
  if (element.title !== title) element.title = title
}

function syncText(element: HTMLElement, text: string): void {
  const children = element.childNodes
  if (text === "" && children.length === 0) return
  if (
    children.length === 1 &&
    children[0]?.nodeType === 3 &&
    children[0].nodeValue === text
  ) return
  element.textContent = text
}

function validateInspectorProps(props: InspectorDomProps): void {
  assertUniqueIds("category", props.categories.map(({id}) => id))
  assertUniqueIds("section", props.sections.map(({id}) => id))

  if (props.categories.length === 0) {
    if (props.selectedCategoryId !== "") {
      throw new Error("Inspector selected category must be empty when categories are empty")
    }
  } else if (!props.categories.some(({id}) => id === props.selectedCategoryId)) {
    throw new Error(`Inspector selected category does not exist: ${props.selectedCategoryId}`)
  }

  const sectionIds = new Set(props.sections.map(({id}) => id))
  for (const category of props.categories) {
    for (const sectionId of category.sectionIds ?? []) {
      if (!sectionIds.has(sectionId)) {
        throw new Error(`Inspector category references unknown section: ${category.id}/${sectionId}`)
      }
    }
  }
}

function validateInspectorContents(sections: readonly InspectorDomSection[]): void {
  const ownedNodes = new Set<Node>()
  for (const section of sections) {
    const content = section.content
    if (content === undefined || typeof content === "string") continue
    const nodes = Array.isArray(content) ? content : [content as Node]
    for (const node of nodes) {
      if (ownedNodes.has(node)) {
        throw new Error(`Inspector content node has multiple owners: ${section.id}`)
      }
      ownedNodes.add(node)
    }
  }
}

function assertUniqueIds(owner: string, ids: readonly string[]): void {
  const seen = new Set<string>()
  for (const id of ids) {
    if (id.length === 0) throw new Error(`Inspector ${owner} id must not be empty`)
    if (seen.has(id)) throw new Error(`Inspector ${owner} id must be unique: ${id}`)
    seen.add(id)
  }
}
