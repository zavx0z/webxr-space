/** Package-owned external Storybook story support. */
import {
  CollectionInput,
  type CollectionInputItem,
  type CollectionInputMoveDirection,
  type CollectionInputProps
} from "@ui/components/collection-input"
import {
  ColorInput,
  type ColorInputPresentation,
  type ColorInputProps,
  type ColorInputValue
} from "@ui/components/color-input"
import {List, type ListProps} from "@ui/components/list"
import {Table, type TableProps} from "@ui/components/table"
import type {Document, Element, Event, HTMLElement, Node} from "@zavx0z/dom"
import {createRoot, useState, type ComponentRoot} from "@zavx0z/react"
import type {RoutedProductionComponentStory} from "../story-types.ts"

type ColorInputStoryState = Readonly<{
  value: ColorInputValue
  presentation: ColorInputPresentation
}>

type ColorInputStoryProps = Readonly<{
  initial: ColorInputProps
  presented: boolean
}>

function ColorInputStoryComponent(props: ColorInputStoryProps) {
  const [state, setState] = useState<ColorInputStoryState>({
    value: props.initial.value,
    presentation: props.initial.presentation ?? "closed"
  })
  const onInput = (value: ColorInputValue, event: Event) => {
    setState(current => ({...current, value}))
    props.initial.onInput?.(value, event)
  }
  const onChange = (value: ColorInputValue, event: Event) => {
    setState(current => ({...current, value}))
    props.initial.onChange?.(value, event)
  }
  const onOpenChange = (open: boolean, event: Event) => {
    setState(current => ({...current, presentation: open ? "open" : "closed"}))
    props.initial.onOpenChange?.(open, event)
  }
  return <ColorInput
    value={state.value}
    label={props.initial.label}
    presentation={!props.presented && state.presentation === "open" ? "closed" : state.presentation}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    title={props.initial.title}
    onInput={onInput}
    onChange={onChange}
    onOpenChange={onOpenChange}
  />
}

type CollectionInputStoryState = Readonly<{
  items: readonly CollectionInputItem[]
  selectedId: string | null
}>

function CollectionInputStoryComponent(props: Readonly<{initial: CollectionInputProps}>) {
  const [state, setState] = useState<CollectionInputStoryState>({
    items: props.initial.items,
    selectedId: props.initial.selectedId
  })
  const onSelect = (selectedId: string, event: Event) => {
    setState(current => ({...current, selectedId}))
    props.initial.onSelect?.(selectedId, event)
  }
  const onAdd = (event: Event) => {
    setState(current => {
      const index = current.items.length + 1
      return {...current, items: [...current.items, {id: `item-${index}`, label: `Item ${index}`}]}
    })
    props.initial.onAdd?.(event)
  }
  const onRemove = (id: string, event: Event) => {
    setState(current => {
      const items = current.items.filter(item => item.id !== id)
      return {items, selectedId: items[0]?.id ?? null}
    })
    props.initial.onRemove?.(id, event)
  }
  const onMove = (id: string, direction: CollectionInputMoveDirection, event: Event) => {
    setState(current => ({...current, items: moveItem(current.items, id, direction)}))
    props.initial.onMove?.(id, direction, event)
  }
  return <CollectionInput
    items={state.items}
    selectedId={state.selectedId}
    visibleRows={props.initial.visibleRows}
    emptyLabel={props.initial.emptyLabel}
    disabled={props.initial.disabled}
    readOnly={props.initial.readOnly}
    density={props.initial.density}
    title={props.initial.title}
    onSelect={onSelect}
    onAdd={onAdd}
    onRemove={onRemove}
    onMove={onMove}
  />
}

function ListStoryComponent(props: Readonly<{initial: ListProps}>) {
  const [selectedKey, setSelectedKey] = useState(props.initial.selectedKey ?? null)
  const onSelect = (key: string, event: Event) => {
    setSelectedKey(key)
    props.initial.onSelect?.(key, event)
  }
  return <List
    items={props.initial.items}
    selectedKey={selectedKey}
    disabled={props.initial.disabled}
    dense={props.initial.dense}
    variant={props.initial.variant}
    emptyLabel={props.initial.emptyLabel}
    title={props.initial.title}
    onSelect={onSelect}
  />
}

function TableStoryComponent(props: Readonly<{initial: TableProps}>) {
  const [selectedKey, setSelectedKey] = useState(props.initial.selectedKey ?? null)
  const onRowActivate = (key: string, event: Event) => {
    setSelectedKey(key)
    props.initial.onRowActivate?.(key, event)
  }
  return <Table
    columns={props.initial.columns}
    rows={props.initial.rows}
    selectedKey={selectedKey}
    disabled={props.initial.disabled}
    title={props.initial.title}
    onRowActivate={onRowActivate}
  />
}

export function createCompiledColorInputProductionStory(
  document: Document,
  props: ColorInputProps
): RoutedProductionComponentStory {
  return mountCompiledStory(
    document,
    ColorInputStoryComponent,
    {initial: props, presented: false},
    "color-input",
    colorSource(props),
    root => root.render(ColorInputStoryComponent as any, {initial: props, presented: true})
  )
}

export function createCompiledCollectionInputProductionStory(
  document: Document,
  props: CollectionInputProps
): RoutedProductionComponentStory {
  return mountCompiledStory(
    document,
    CollectionInputStoryComponent,
    {initial: props},
    "collection-input",
    collectionSource(props)
  )
}

export function createCompiledListProductionStory(
  document: Document,
  props: ListProps
): RoutedProductionComponentStory {
  return mountCompiledStory(
    document,
    ListStoryComponent,
    {initial: props},
    "list",
    listSource(props)
  )
}

export function createCompiledTableProductionStory(
  document: Document,
  props: TableProps
): RoutedProductionComponentStory {
  return mountCompiledStory(
    document,
    TableStoryComponent,
    {initial: props},
    "table",
    tableSource(props)
  )
}

function moveItem(
  items: readonly CollectionInputItem[],
  id: string,
  direction: CollectionInputMoveDirection
): readonly CollectionInputItem[] {
  const next = [...items]
  const source = next.findIndex(item => item.id === id)
  const target = source + (direction === "up" ? -1 : 1)
  if (source < 0 || target < 0 || target >= next.length) return items
  const [item] = next.splice(source, 1)
  next.splice(target, 0, item!)
  return next
}

function mountCompiledStory(
  document: Document,
  component: unknown,
  props: unknown,
  name: string,
  typescript: string,
  afterPresent?: (root: ComponentRoot) => void
): RoutedProductionComponentStory {
  const staging = document.createElement("div")
  const root = createRoot(staging)
  root.render(component as any, props as any)
  const owner = [...staging.childNodes].find(node => node.nodeType === 1) as HTMLElement | undefined
  if (!owner) {
    root.unmount()
    throw new Error(`Compiled ${name} story mounted no owner`)
  }
  staging.removeChild(owner)
  owner.setAttribute("data-story-component", name)
  let presented = false
  const story = Object.freeze({
    element: owner,
    componentRoot: root,
    get source() {
      return Object.freeze({html: serialize(owner), typescript})
    },
    afterPresent: afterPresent === undefined ? undefined : () => {
      if (presented) return
      presented = true
      afterPresent(root)
    },
    dispose() {
      root.unmount()
    }
  })
  return Object.freeze({story})
}

function colorSource(props: ColorInputProps): string {
  return [
    'import {ColorInput, type ColorInputPresentation, type ColorInputValue} from "@ui/components/color-input"',
    'import {createRoot, useState} from "@zavx0z/react"',
    "",
    "function Story() {",
    `  const [state, setState] = useState<{value: ColorInputValue; presentation: ColorInputPresentation}>({value: ${literal(props.value)}, presentation: ${JSON.stringify(props.presentation ?? "closed")}})`,
    "  return <ColorInput",
    "    value={state.value}",
    "    presentation={state.presentation}",
    "    onInput={value => setState(current => ({...current, value}))}",
    "    onOpenChange={open => setState(current => ({...current, presentation: open ? \"open\" : \"closed\"}))}",
    "  />",
    "}",
    "createRoot(container).render(<Story />)"
  ].join("\n")
}

function collectionSource(props: CollectionInputProps): string {
  return [
    'import {CollectionInput, type CollectionInputItem} from "@ui/components/collection-input"',
    'import {createRoot, useState} from "@zavx0z/react"',
    "",
    "function Story() {",
    `  const [state, setState] = useState<{items: readonly CollectionInputItem[]; selectedId: string | null}>({items: ${literal(props.items)}, selectedId: ${literal(props.selectedId)}})`,
    "  return <CollectionInput",
    "    items={state.items}",
    "    selectedId={state.selectedId}",
    "    onSelect={selectedId => setState(current => ({...current, selectedId}))}",
    "  />",
    "}",
    "createRoot(container).render(<Story />)"
  ].join("\n")
}

function listSource(props: ListProps): string {
  return [
    'import {List} from "@ui/components/list"',
    'import {createRoot, useState} from "@zavx0z/react"',
    "",
    "function Story() {",
    `  const [selectedKey, setSelectedKey] = useState<string | null>(${literal(props.selectedKey ?? null)})`,
    `  return <List items={${literal(props.items)}} selectedKey={selectedKey} onSelect={setSelectedKey} />`,
    "}",
    "createRoot(container).render(<Story />)"
  ].join("\n")
}

function tableSource(props: TableProps): string {
  return [
    'import {Table} from "@ui/components/table"',
    'import {createRoot, useState} from "@zavx0z/react"',
    "",
    "function Story() {",
    `  const [selectedKey, setSelectedKey] = useState<string | null>(${literal(props.selectedKey ?? null)})`,
    `  const columns = ${literal(props.columns)}`,
    `  const rows = ${literal(props.rows)}`,
    "  return <Table columns={columns} rows={rows} selectedKey={selectedKey} onRowActivate={setSelectedKey} />",
    "}",
    "createRoot(container).render(<Story />)"
  ].join("\n")
}

function literal(value: unknown): string {
  return JSON.stringify(value, (_key, entry) => typeof entry === "function" ? undefined : entry, 2)
}

function serialize(element: Element, depth = 0): string {
  const indent = "  ".repeat(depth)
  const attributes = element.getAttributeNames().sort().map(name =>
    ` ${name}="${escapeHtml(element.getAttribute(name) ?? "")}"`
  ).join("")
  const children = [...element.childNodes].filter(node => node.nodeType === 1 || node.nodeType === 3)
  if (children.length === 0) return `${indent}<${element.localName}${attributes}></${element.localName}>`
  const body = children.map((node: Node) => node.nodeType === 3
    ? `${"  ".repeat(depth + 1)}${escapeHtml(node.textContent ?? "")}`
    : serialize(node as HTMLElement, depth + 1)).join("\n")
  return `${indent}<${element.localName}${attributes}>\n${body}\n${indent}</${element.localName}>`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
