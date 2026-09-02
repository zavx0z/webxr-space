/** Package-owned external Storybook story support. */
import {uiIcons} from "@zavx0z/ui/themes/icons"
import {List, type ListProps} from "@zavx0z/ui/views/list"
import {Table, type TableProps} from "@zavx0z/ui/views/table"
import type {
  Document as SemanticDocument,
  Element as SemanticElement,
  HTMLElement as SemanticHTMLElement,
  Node as SemanticNode
} from "@zavx0z/dom"
import {createRoot, useState, type ComponentRoot} from "@zavx0z/component"
import type {RoutedProductionComponentStory} from "../story-types.ts"

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

export function createCompiledListProductionStory(
  document: SemanticDocument,
  props: ListProps
): RoutedProductionComponentStory {
  return mountCompiledStory(document, ListStoryComponent, {initial: props}, "list", listSource(props))
}

export function createCompiledTableProductionStory(
  document: SemanticDocument,
  props: TableProps
): RoutedProductionComponentStory {
  return mountCompiledStory(document, TableStoryComponent, {initial: props}, "table", tableSource(props))
}

function mountCompiledStory(
  document: SemanticDocument,
  component: unknown,
  props: unknown,
  name: string,
  typescript: string,
): RoutedProductionComponentStory {
  const staging = document.createElement("div")
  const root = createRoot(staging)
  root.render(component as any, props as any)
  const owner = [...staging.childNodes].find(node => node.nodeType === 1) as SemanticHTMLElement | undefined
  if (!owner) {
    root.unmount()
    throw new Error(`Compiled ${name} story mounted no owner`)
  }
  staging.removeChild(owner)
  owner.setAttribute("data-story-component", name)
  return Object.freeze({
    story: Object.freeze({
      element: owner,
      componentRoot: root,
      get source() {
        return Object.freeze({html: serialize(owner), typescript})
      },
      dispose() {
        root.unmount()
      },
    }),
  })
}

function listSource(props: ListProps): string {
  return [
    'import {List} from "@zavx0z/ui/views/list"',
    'import {uiIcons} from "@zavx0z/ui/themes/icons"',
    'import {createRoot, useState} from "@zavx0z/component"',
    "",
    "function Story() {",
    `  const [selectedKey, setSelectedKey] = useState<string | null>(${literal(props.selectedKey ?? null)})`,
    `  return <List items={${literal(props.items)}} selectedKey={selectedKey} onSelect={setSelectedKey} />`,
    "}",
    "createRoot(container).render(<Story />)",
  ].join("\n")
}

function tableSource(props: TableProps): string {
  return [
    'import {Table} from "@zavx0z/ui/views/table"',
    'import {createRoot, useState} from "@zavx0z/component"',
    "",
    "function Story() {",
    `  const [selectedKey, setSelectedKey] = useState<string | null>(${literal(props.selectedKey ?? null)})`,
    `  const columns = ${literal(props.columns)}`,
    `  const rows = ${literal(props.rows)}`,
    "  return <Table columns={columns} rows={rows} selectedKey={selectedKey} onRowActivate={setSelectedKey} />",
    "}",
    "createRoot(container).render(<Story />)",
  ].join("\n")
}

function literal(value: unknown): string {
  let source = JSON.stringify(value, (_key, entry) => typeof entry === "function" ? undefined : entry, 2) ?? "undefined"
  for (const [name, icon] of Object.entries(uiIcons)) {
    source = source.replaceAll(JSON.stringify(icon), `uiIcons.${name}`)
  }
  return source
}

function serialize(element: SemanticElement, depth = 0): string {
  const indent = "  ".repeat(depth)
  const attributes = element.getAttributeNames().sort().map(name =>
    ` ${name}="${escapeHtml(element.getAttribute(name) ?? "")}"`
  ).join("")
  const children = [...element.childNodes].filter(node => node.nodeType === 1 || node.nodeType === 3)
  if (children.length === 0) return `${indent}<${element.localName}${attributes}></${element.localName}>`
  const body = children.map((node: SemanticNode) => node.nodeType === 3
    ? `${"  ".repeat(depth + 1)}${escapeHtml(node.textContent ?? "")}`
    : serialize(node as SemanticHTMLElement, depth + 1)).join("\n")
  return `${indent}<${element.localName}${attributes}>\n${body}\n${indent}</${element.localName}>`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
