import type {
  Document,
  Element,
  HTMLElement,
  Node,
  Text,
} from "@zavx0z/dom"

export type DataStorySource = Readonly<{
  html: string
  css: string
  typescript: string
}>

export type ListStoryItem = Readonly<{
  key: string
  label: string
  detail: string
  selected: boolean
}>

export type ListStoryArgs = Readonly<{
  title: string
  items: readonly ListStoryItem[]
}>

export type ListStoryRefs = Readonly<{
  root: HTMLElement
  items: ReadonlyMap<string, HTMLElement>
}>

export type ListDomStory = Readonly<{
  element: HTMLElement
  refs: ListStoryRefs
  args: ListStoryArgs
  source: DataStorySource
  update(args: ListStoryArgs): void
}>

export type TableStoryColumn = Readonly<{
  key: string
  label: string
  width: number
}>

export type TableStoryRow = Readonly<{
  key: string
  cells: Readonly<Record<string, string>>
}>

export type TableStoryArgs = Readonly<{
  title: string
  columns: readonly TableStoryColumn[]
  rows: readonly TableStoryRow[]
}>

export type TableStoryRefs = Readonly<{
  root: HTMLElement
  head: HTMLElement
  body: HTMLElement
  headers: ReadonlyMap<string, HTMLElement>
  rows: ReadonlyMap<string, HTMLElement>
  cells: ReadonlyMap<string, ReadonlyMap<string, HTMLElement>>
}>

export type TableDomStory = Readonly<{
  element: HTMLElement
  refs: TableStoryRefs
  args: TableStoryArgs
  source: DataStorySource
  update(args: TableStoryArgs): void
}>

export const listStoryDefaultArgs: ListStoryArgs = Object.freeze({
  title: "Scene objects",
  items: Object.freeze([
    Object.freeze({key: "camera", label: "Camera", detail: "Perspective", selected: false}),
    Object.freeze({key: "output", label: "Output", detail: "WebGPU", selected: true}),
    Object.freeze({key: "light", label: "Key light", detail: "Directional", selected: false}),
  ]),
})

export const tableStoryDefaultArgs: TableStoryArgs = Object.freeze({
  title: "Render passes",
  columns: Object.freeze([
    Object.freeze({key: "name", label: "Pass", width: 150}),
    Object.freeze({key: "draws", label: "Draws", width: 70}),
    Object.freeze({key: "time", label: "GPU", width: 80}),
  ]),
  rows: Object.freeze([
    Object.freeze({key: "opaque", cells: Object.freeze({name: "Opaque", draws: "42", time: "0.72 ms"})}),
    Object.freeze({key: "ui", cells: Object.freeze({name: "UI", draws: "18", time: "0.31 ms"})}),
    Object.freeze({key: "present", cells: Object.freeze({name: "Present", draws: "1", time: "0.08 ms"})}),
  ]),
})

export const dataStoriesCss = String.raw`
.ui-list-story {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 320px;
  padding: 0;
  border: 1px solid rgb(22, 22, 22);
  border-radius: 4px;
  overflow: hidden;
  background: rgb(36, 36, 36);
}

.ui-list-story__item {
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  height: 32px;
  padding: 4px 8px;
  border-bottom: 1px solid rgb(22, 22, 22);
  background: rgb(48, 48, 48);
  color: rgb(224, 224, 224);
  font-size: 12px;
}

.ui-list-story__item--last {
  border-bottom: 0;
}

.ui-list-story__item[aria-selected="true"] {
  background: rgb(45, 104, 128);
}

.ui-list-story__label {
  display: inline;
  width: 190px;
  color: rgb(224, 224, 224);
  font-size: 12px;
}

.ui-list-story__detail {
  display: inline;
  width: 104px;
  color: rgb(160, 160, 160);
  font-size: 11px;
}

.ui-table-story {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 302px;
  padding: 0;
  border: 1px solid rgb(22, 22, 22);
  border-radius: 4px;
  overflow: hidden;
  background: rgb(36, 36, 36);
}

.ui-table-story__head,
.ui-table-story__body {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 300px;
}

.ui-table-story__row {
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  width: 300px;
  height: 28px;
  border-bottom: 1px solid rgb(22, 22, 22);
}

.ui-table-story__body .ui-table-story__row--last {
  border-bottom: 0;
}

.ui-table-story__header,
.ui-table-story__cell {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  height: 28px;
  padding: 4px 7px;
  border-right: 1px solid rgb(22, 22, 22);
  color: rgb(224, 224, 224);
  font-size: 11px;
}

.ui-table-story__header {
  background: rgb(61, 61, 61);
  color: rgb(126, 220, 236);
}

.ui-table-story__cell {
  background: rgb(48, 48, 48);
}

.ui-table-story__header--last,
.ui-table-story__cell--last {
  border-right: 0;
}
`

type ListEntry = {
  element: HTMLElement
  label: Text
  detail: Text
}

type TableHeaderEntry = {
  element: HTMLElement
  text: Text
}

type TableRowEntry = {
  element: HTMLElement
  cells: Map<string, HTMLElement>
  texts: Map<string, Text>
}

export function createListStory(
  document: Document,
  initialArgs: ListStoryArgs = listStoryDefaultArgs,
): ListDomStory {
  const root = document.createElement("ul")
  root.className = "ui-list-story"
  root.setAttribute("role", "listbox")
  const entries = new Map<string, ListEntry>()
  const items = new Map<string, HTMLElement>()
  let currentArgs = listStoryDefaultArgs

  const update = (args: ListStoryArgs): void => {
    const nextArgs = normalizeListArgs(args)
    syncTitle(root, nextArgs.title)
    const retained = new Set(nextArgs.items.map(({key}) => key))
    for (const [key, entry] of entries) {
      if (retained.has(key)) continue
      entry.element.remove()
      entries.delete(key)
      items.delete(key)
    }
    const ordered: HTMLElement[] = []
    for (const [index, item] of nextArgs.items.entries()) {
      let entry = entries.get(item.key)
      if (entry === undefined) {
        entry = createListEntry(document, item.key)
        entries.set(item.key, entry)
        items.set(item.key, entry.element)
      }
      entry.element.className = index === nextArgs.items.length - 1
        ? "ui-list-story__item ui-list-story__item--last"
        : "ui-list-story__item"
      entry.element.setAttribute("aria-selected", String(item.selected))
      if (entry.label.data !== item.label) entry.label.data = item.label
      if (entry.detail.data !== item.detail) entry.detail.data = item.detail
      ordered.push(entry.element)
    }
    root.replaceChildren(...ordered)
    currentArgs = nextArgs
  }

  const refs: ListStoryRefs = Object.freeze({root, items})
  const story: ListDomStory = Object.freeze({
    element: root,
    refs,
    get args() { return currentArgs },
    get source() {
      return Object.freeze({
        html: serializeElement(root),
        css: dataStoriesCss,
        typescript: renderListTypeScript(currentArgs),
      })
    },
    update,
  })
  update(initialArgs)
  return story
}

export function createTableStory(
  document: Document,
  initialArgs: TableStoryArgs = tableStoryDefaultArgs,
): TableDomStory {
  const root = document.createElement("table")
  const head = document.createElement("thead")
  const headRow = document.createElement("tr")
  const body = document.createElement("tbody")
  root.className = "ui-table-story"
  head.className = "ui-table-story__head"
  headRow.className = "ui-table-story__row"
  body.className = "ui-table-story__body"
  head.appendChild(headRow)
  root.append(head, body)

  const headerEntries = new Map<string, TableHeaderEntry>()
  const headers = new Map<string, HTMLElement>()
  const rowEntries = new Map<string, TableRowEntry>()
  const rows = new Map<string, HTMLElement>()
  const cells = new Map<string, ReadonlyMap<string, HTMLElement>>()
  let currentArgs = tableStoryDefaultArgs

  const update = (args: TableStoryArgs): void => {
    const nextArgs = normalizeTableArgs(args)
    syncTitle(root, nextArgs.title)
    syncTableHeaders(document, headRow, nextArgs.columns, headerEntries, headers)

    const retainedRows = new Set(nextArgs.rows.map(({key}) => key))
    for (const [key, entry] of rowEntries) {
      if (retainedRows.has(key)) continue
      entry.element.remove()
      rowEntries.delete(key)
      rows.delete(key)
      cells.delete(key)
    }

    const orderedRows: HTMLElement[] = []
    for (const [rowIndex, rowArgs] of nextArgs.rows.entries()) {
      let entry = rowEntries.get(rowArgs.key)
      if (entry === undefined) {
        entry = {
          element: document.createElement("tr"),
          cells: new Map(),
          texts: new Map(),
        }
        entry.element.setAttribute("data-row-key", rowArgs.key)
        rowEntries.set(rowArgs.key, entry)
        rows.set(rowArgs.key, entry.element)
        cells.set(rowArgs.key, entry.cells)
      }
      entry.element.className = rowIndex === nextArgs.rows.length - 1
        ? "ui-table-story__row ui-table-story__row--last"
        : "ui-table-story__row"
      syncTableCells(document, entry, nextArgs.columns, rowArgs)
      orderedRows.push(entry.element)
    }
    body.replaceChildren(...orderedRows)
    currentArgs = nextArgs
  }

  const refs: TableStoryRefs = Object.freeze({root, head, body, headers, rows, cells})
  const story: TableDomStory = Object.freeze({
    element: root,
    refs,
    get args() { return currentArgs },
    get source() {
      return Object.freeze({
        html: serializeElement(root),
        css: dataStoriesCss,
        typescript: renderTableTypeScript(currentArgs),
      })
    },
    update,
  })
  update(initialArgs)
  return story
}

function createListEntry(document: Document, key: string): ListEntry {
  const element = document.createElement("li")
  const labelElement = document.createElement("span")
  const detailElement = document.createElement("span")
  const label = document.createTextNode("")
  const detail = document.createTextNode("")
  element.setAttribute("data-item-key", key)
  element.setAttribute("role", "option")
  labelElement.className = "ui-list-story__label"
  detailElement.className = "ui-list-story__detail"
  labelElement.appendChild(label)
  detailElement.appendChild(detail)
  element.append(labelElement, detailElement)
  return {element, label, detail}
}

function syncTableHeaders(
  document: Document,
  headRow: HTMLElement,
  columns: readonly TableStoryColumn[],
  entries: Map<string, TableHeaderEntry>,
  headers: Map<string, HTMLElement>,
): void {
  const retained = new Set(columns.map(({key}) => key))
  for (const [key, entry] of entries) {
    if (retained.has(key)) continue
    entry.element.remove()
    entries.delete(key)
    headers.delete(key)
  }
  const ordered: HTMLElement[] = []
  for (const [index, column] of columns.entries()) {
    let entry = entries.get(column.key)
    if (entry === undefined) {
      const element = document.createElement("th")
      const text = document.createTextNode("")
      element.setAttribute("scope", "col")
      element.setAttribute("data-column-key", column.key)
      element.appendChild(text)
      entry = {element, text}
      entries.set(column.key, entry)
      headers.set(column.key, element)
    }
    entry.element.className = index === columns.length - 1
      ? "ui-table-story__header ui-table-story__header--last"
      : "ui-table-story__header"
    entry.element.setAttribute("style", `width: ${column.width}px`)
    if (entry.text.data !== column.label) entry.text.data = column.label
    ordered.push(entry.element)
  }
  headRow.replaceChildren(...ordered)
}

function syncTableCells(
  document: Document,
  entry: TableRowEntry,
  columns: readonly TableStoryColumn[],
  row: TableStoryRow,
): void {
  const retained = new Set(columns.map(({key}) => key))
  for (const [key, cell] of entry.cells) {
    if (retained.has(key)) continue
    cell.remove()
    entry.cells.delete(key)
    entry.texts.delete(key)
  }
  const ordered: HTMLElement[] = []
  for (const [index, column] of columns.entries()) {
    let cell = entry.cells.get(column.key)
    let text = entry.texts.get(column.key)
    if (cell === undefined || text === undefined) {
      cell = document.createElement("td")
      text = document.createTextNode("")
      cell.setAttribute("data-column-key", column.key)
      cell.appendChild(text)
      entry.cells.set(column.key, cell)
      entry.texts.set(column.key, text)
    }
    cell.className = index === columns.length - 1
      ? "ui-table-story__cell ui-table-story__cell--last"
      : "ui-table-story__cell"
    cell.setAttribute("style", `width: ${column.width}px`)
    const value = row.cells[column.key] ?? ""
    if (text.data !== value) text.data = value
    ordered.push(cell)
  }
  entry.element.replaceChildren(...ordered)
}

function normalizeListArgs(args: ListStoryArgs): ListStoryArgs {
  assertString(args.title, "List story title")
  if (!Array.isArray(args.items)) throw new TypeError("List story items must be an array")
  const keys = new Set<string>()
  const items = args.items.map((item) => {
    assertKey(item.key, "List item key", keys)
    assertString(item.label, "List item label")
    assertString(item.detail, "List item detail")
    assertBoolean(item.selected, "List item selected")
    return Object.freeze({...item})
  })
  return Object.freeze({title: args.title, items: Object.freeze(items)})
}

function normalizeTableArgs(args: TableStoryArgs): TableStoryArgs {
  assertString(args.title, "Table story title")
  if (!Array.isArray(args.columns)) throw new TypeError("Table story columns must be an array")
  if (!Array.isArray(args.rows)) throw new TypeError("Table story rows must be an array")
  const columnKeys = new Set<string>()
  const columns = args.columns.map((column) => {
    assertKey(column.key, "Table column key", columnKeys)
    assertString(column.label, "Table column label")
    if (!Number.isFinite(column.width) || column.width <= 0) {
      throw new TypeError("Table column width must be a positive finite number")
    }
    return Object.freeze({...column})
  })
  const rowKeys = new Set<string>()
  const rows = args.rows.map((row) => {
    assertKey(row.key, "Table row key", rowKeys)
    if (typeof row.cells !== "object" || row.cells === null) {
      throw new TypeError("Table row cells must be an object")
    }
    const normalizedCells: Record<string, string> = {}
    for (const column of columns) {
      const value = row.cells[column.key] ?? ""
      assertString(value, `Table cell ${column.key}`)
      normalizedCells[column.key] = value
    }
    return Object.freeze({key: row.key, cells: Object.freeze(normalizedCells)})
  })
  return Object.freeze({
    title: args.title,
    columns: Object.freeze(columns),
    rows: Object.freeze(rows),
  })
}

function assertKey(value: unknown, label: string, keys: Set<string>): asserts value is string {
  assertString(value, label)
  if (value.length === 0) throw new TypeError(`${label} must not be empty`)
  if (keys.has(value)) throw new Error(`${label} must be unique: ${value}`)
  keys.add(value)
}

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string") throw new TypeError(`${label} must be a string`)
}

function assertBoolean(value: unknown, label: string): asserts value is boolean {
  if (typeof value !== "boolean") throw new TypeError(`${label} must be a boolean`)
}

function syncTitle(element: HTMLElement, title: string): void {
  if (element.title !== title) element.title = title
}

function renderListTypeScript(args: ListStoryArgs): string {
  return [
    'import {createDocument} from "@zavx0z/dom"',
    "",
    "const document = createDocument()",
    'const list = document.createElement("ul")',
    'list.className = "ui-list-story"',
    'list.setAttribute("role", "listbox")',
    `list.title = ${JSON.stringify(args.title)}`,
    `const items = ${JSON.stringify(args.items, null, 2)}`,
    "for (const item of items) {",
    '  const row = document.createElement("li")',
    '  row.setAttribute("role", "option")',
    '  row.setAttribute("aria-selected", String(item.selected))',
    "  row.append(item.label, item.detail)",
    "  list.appendChild(row)",
    "}",
    "document.appendChild(list)",
  ].join("\n")
}

function renderTableTypeScript(args: TableStoryArgs): string {
  return [
    'import {createDocument} from "@zavx0z/dom"',
    "",
    "const document = createDocument()",
    'const table = document.createElement("table")',
    `table.title = ${JSON.stringify(args.title)}`,
    `const columns = ${JSON.stringify(args.columns, null, 2)}`,
    `const rows = ${JSON.stringify(args.rows, null, 2)}`,
    "// Build native thead/tbody/tr/th/td nodes and append table to document.",
    "document.appendChild(table)",
  ].join("\n")
}

function serializeElement(element: Element, depth = 0): string {
  const indent = "  ".repeat(depth)
  const attributes = element.getAttributeNames()
    .sort()
    .map((name) => ` ${name}="${escapeAttribute(element.getAttribute(name) ?? "")}"`)
    .join("")
  const children = [...element.childNodes]
  if (children.length === 0) return `${indent}<${element.localName}${attributes}></${element.localName}>`
  const inline = children.every((child) => child.nodeType === 3)
  if (inline) return `${indent}<${element.localName}${attributes}>${escapeText(element.textContent)}</${element.localName}>`
  const body = children.map((child) => serializeNode(child, depth + 1)).join("\n")
  return `${indent}<${element.localName}${attributes}>\n${body}\n${indent}</${element.localName}>`
}

function serializeNode(node: Node, depth: number): string {
  if (node.nodeType === 3) return `${"  ".repeat(depth)}${escapeText(node.textContent ?? "")}`
  return serializeElement(node as Element, depth)
}

function escapeText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

function escapeAttribute(value: string): string {
  return escapeText(value).replaceAll('"', "&quot;")
}
