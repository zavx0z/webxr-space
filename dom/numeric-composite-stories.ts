import type {
  Document,
  Element,
  HTMLElement,
  HTMLInputElement,
  Node,
  Text,
} from "@zavx0z/dom"

export type NumericCompositeSource = Readonly<{
  html: string
  css: string
  typescript: string
}>

export type VectorStoryField = Readonly<{
  key: string
  label: string
  value: string
}>

export type VectorStoryArgs = Readonly<{
  title: string
  disabled: boolean
  readOnly: boolean
  fields: readonly VectorStoryField[]
}>

export type VectorStoryRefs = Readonly<{
  root: HTMLElement
  legend: HTMLElement
  fields: ReadonlyMap<string, HTMLElement>
  inputs: ReadonlyMap<string, HTMLInputElement>
}>

export type VectorDomStory = Readonly<{
  element: HTMLElement
  refs: VectorStoryRefs
  args: VectorStoryArgs
  source: NumericCompositeSource
  update(args: VectorStoryArgs): void
}>

export type MatrixStoryCell = Readonly<{
  key: string
  label: string
  value: string
}>

export type MatrixStoryRow = Readonly<{
  key: string
  cells: readonly MatrixStoryCell[]
}>

export type MatrixStoryArgs = Readonly<{
  title: string
  disabled: boolean
  readOnly: boolean
  rows: readonly MatrixStoryRow[]
}>

export type MatrixStoryRefs = Readonly<{
  root: HTMLElement
  legend: HTMLElement
  rows: ReadonlyMap<string, HTMLElement>
  inputs: ReadonlyMap<string, HTMLInputElement>
}>

export type MatrixDomStory = Readonly<{
  element: HTMLElement
  refs: MatrixStoryRefs
  args: MatrixStoryArgs
  source: NumericCompositeSource
  update(args: MatrixStoryArgs): void
}>

export const vectorStoryDefaultArgs: VectorStoryArgs = Object.freeze({
  title: "Position",
  disabled: false,
  readOnly: false,
  fields: Object.freeze([
    Object.freeze({key: "x", label: "X", value: "1"}),
    Object.freeze({key: "y", label: "Y", value: "2"}),
    Object.freeze({key: "z", label: "Z", value: "3"}),
  ]),
})

export const matrixStoryDefaultArgs: MatrixStoryArgs = Object.freeze({
  title: "Transform 2×2",
  disabled: false,
  readOnly: false,
  rows: Object.freeze([
    Object.freeze({key: "r0", cells: Object.freeze([
      Object.freeze({key: "m00", label: "M00", value: "1"}),
      Object.freeze({key: "m01", label: "M01", value: "0"}),
    ])}),
    Object.freeze({key: "r1", cells: Object.freeze([
      Object.freeze({key: "m10", label: "M10", value: "0"}),
      Object.freeze({key: "m11", label: "M11", value: "1"}),
    ])}),
  ]),
})

export const numericCompositeStoriesCss = String.raw`
.ui-vector-story,
.ui-matrix-story {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: 10px;
  border: 1px solid rgb(22, 22, 22);
  border-radius: 4px;
  background: rgb(48, 48, 48);
  color: rgb(224, 224, 224);
}

.ui-vector-story {
  width: 330px;
  height: 82px;
}

.ui-matrix-story {
  width: 260px;
  height: 126px;
}

.ui-vector-story__legend,
.ui-matrix-story__legend {
  display: block;
  height: 20px;
  color: rgb(126, 220, 236);
  font-size: 12px;
}

.ui-vector-story__row,
.ui-matrix-story__row {
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.ui-vector-story__row {
  width: 308px;
  height: 32px;
}

.ui-matrix-story__row {
  width: 238px;
  height: 32px;
}

.ui-vector-story__field,
.ui-matrix-story__field {
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 28px;
  gap: 4px;
}

.ui-vector-story__field {
  width: 96px;
}

.ui-matrix-story__field {
  width: 114px;
}

.ui-vector-story__label,
.ui-matrix-story__label {
  display: inline;
  width: 24px;
  color: rgb(176, 176, 176);
  font-size: 11px;
}

.ui-matrix-story__label {
  width: 30px;
}

.ui-vector-story__input,
.ui-matrix-story__input {
  box-sizing: border-box;
  display: block;
  width: 68px;
  height: 26px;
  padding: 3px 6px;
  border: 1px solid rgb(22, 22, 22);
  border-radius: 3px;
  background: rgb(36, 36, 36);
  color: rgb(224, 224, 224);
  font-size: 11px;
}

.ui-matrix-story__input {
  width: 80px;
}

.ui-vector-story__input[readonly],
.ui-matrix-story__input[readonly] {
  background: rgb(61, 61, 61);
}

.ui-vector-story__input[disabled],
.ui-matrix-story__input[disabled] {
  opacity: 0.5;
}
`

type NumericFieldEntry = {
  root: HTMLElement
  label: HTMLElement
  labelText: Text
  input: HTMLInputElement
}

type MatrixRowEntry = {
  root: HTMLElement
  fields: Map<string, NumericFieldEntry>
}

export function createVectorStory(
  document: Document,
  initialArgs: VectorStoryArgs = vectorStoryDefaultArgs,
): VectorDomStory {
  const root = document.createElement("fieldset")
  const legend = document.createElement("legend")
  const legendText = document.createTextNode("")
  const row = document.createElement("div")
  root.className = "ui-vector-story"
  legend.className = "ui-vector-story__legend"
  row.className = "ui-vector-story__row"
  legend.appendChild(legendText)
  root.append(legend, row)
  const entries = new Map<string, NumericFieldEntry>()
  const fields = new Map<string, HTMLElement>()
  const inputs = new Map<string, HTMLInputElement>()
  let currentArgs = vectorStoryDefaultArgs

  const update = (args: VectorStoryArgs): void => {
    const nextArgs = normalizeVectorArgs(args)
    if (legendText.data !== nextArgs.title) legendText.data = nextArgs.title
    const retained = new Set(nextArgs.fields.map(({key}) => key))
    for (const [key, entry] of entries) {
      if (retained.has(key)) continue
      entry.root.remove()
      entries.delete(key)
      fields.delete(key)
      inputs.delete(key)
    }
    const ordered: HTMLElement[] = []
    const resolved: VectorStoryField[] = []
    for (const field of nextArgs.fields) {
      let entry = entries.get(field.key)
      if (entry === undefined) {
        entry = createNumericField(document, "vector", field.key)
        entries.set(field.key, entry)
        fields.set(field.key, entry.root)
        inputs.set(field.key, entry.input)
      }
      syncNumericField(entry, field.label, field.value, nextArgs.disabled, nextArgs.readOnly)
      ordered.push(entry.root)
      resolved.push(Object.freeze({...field, value: entry.input.value}))
    }
    row.replaceChildren(...ordered)
    currentArgs = Object.freeze({...nextArgs, fields: Object.freeze(resolved)})
  }

  const refs: VectorStoryRefs = Object.freeze({root, legend, fields, inputs})
  const story: VectorDomStory = Object.freeze({
    element: root,
    refs,
    get args() { return currentArgs },
    get source() { return sourceFor(root, renderVectorTypeScript(currentArgs)) },
    update,
  })
  update(initialArgs)
  return story
}

export function createMatrixStory(
  document: Document,
  initialArgs: MatrixStoryArgs = matrixStoryDefaultArgs,
): MatrixDomStory {
  const root = document.createElement("fieldset")
  const legend = document.createElement("legend")
  const legendText = document.createTextNode("")
  const body = document.createElement("div")
  root.className = "ui-matrix-story"
  legend.className = "ui-matrix-story__legend"
  body.className = "ui-matrix-story__body"
  legend.appendChild(legendText)
  root.append(legend, body)
  const entries = new Map<string, MatrixRowEntry>()
  const rows = new Map<string, HTMLElement>()
  const inputs = new Map<string, HTMLInputElement>()
  let currentArgs = matrixStoryDefaultArgs

  const update = (args: MatrixStoryArgs): void => {
    const nextArgs = normalizeMatrixArgs(args)
    if (legendText.data !== nextArgs.title) legendText.data = nextArgs.title
    const retainedRows = new Set(nextArgs.rows.map(({key}) => key))
    for (const [key, entry] of entries) {
      if (retainedRows.has(key)) continue
      entry.root.remove()
      for (const cellKey of entry.fields.keys()) inputs.delete(cellKey)
      entries.delete(key)
      rows.delete(key)
    }
    const orderedRows: HTMLElement[] = []
    const resolvedRows: MatrixStoryRow[] = []
    for (const rowArgs of nextArgs.rows) {
      let entry = entries.get(rowArgs.key)
      if (entry === undefined) {
        entry = {root: document.createElement("div"), fields: new Map()}
        entry.root.className = "ui-matrix-story__row"
        entry.root.setAttribute("data-row-key", rowArgs.key)
        entries.set(rowArgs.key, entry)
        rows.set(rowArgs.key, entry.root)
      }
      const retainedCells = new Set(rowArgs.cells.map(({key}) => key))
      for (const [key, field] of entry.fields) {
        if (retainedCells.has(key)) continue
        field.root.remove()
        entry.fields.delete(key)
        inputs.delete(key)
      }
      const orderedFields: HTMLElement[] = []
      const resolvedCells: MatrixStoryCell[] = []
      for (const cell of rowArgs.cells) {
        let field = entry.fields.get(cell.key)
        if (field === undefined) {
          field = createNumericField(document, "matrix", cell.key)
          entry.fields.set(cell.key, field)
          inputs.set(cell.key, field.input)
        }
        syncNumericField(field, cell.label, cell.value, nextArgs.disabled, nextArgs.readOnly)
        orderedFields.push(field.root)
        resolvedCells.push(Object.freeze({...cell, value: field.input.value}))
      }
      entry.root.replaceChildren(...orderedFields)
      orderedRows.push(entry.root)
      resolvedRows.push(Object.freeze({key: rowArgs.key, cells: Object.freeze(resolvedCells)}))
    }
    body.replaceChildren(...orderedRows)
    currentArgs = Object.freeze({...nextArgs, rows: Object.freeze(resolvedRows)})
  }

  const refs: MatrixStoryRefs = Object.freeze({root, legend, rows, inputs})
  const story: MatrixDomStory = Object.freeze({
    element: root,
    refs,
    get args() { return currentArgs },
    get source() { return sourceFor(root, renderMatrixTypeScript(currentArgs)) },
    update,
  })
  update(initialArgs)
  return story
}

function createNumericField(
  document: Document,
  owner: "vector" | "matrix",
  key: string,
): NumericFieldEntry {
  const root = document.createElement("label")
  const label = document.createElement("span")
  const labelText = document.createTextNode("")
  const input = document.createElement("input")
  root.className = `ui-${owner}-story__field`
  root.setAttribute("data-field-key", key)
  label.className = `ui-${owner}-story__label`
  input.className = `ui-${owner}-story__input`
  input.type = "number"
  input.title = key.toUpperCase()
  label.appendChild(labelText)
  root.append(label, input)
  return {root, label, labelText, input}
}

function syncNumericField(
  entry: NumericFieldEntry,
  label: string,
  value: string,
  disabled: boolean,
  readOnly: boolean,
): void {
  if (entry.labelText.data !== label) entry.labelText.data = label
  if (entry.input.value !== value) entry.input.value = value
  if (entry.input.disabled !== disabled) entry.input.disabled = disabled
  if (entry.input.readOnly !== readOnly) entry.input.readOnly = readOnly
}

function normalizeVectorArgs(args: VectorStoryArgs): VectorStoryArgs {
  assertString(args.title, "Vector story title")
  assertBoolean(args.disabled, "Vector story disabled")
  assertBoolean(args.readOnly, "Vector story readOnly")
  if (!Array.isArray(args.fields) || args.fields.length < 2 || args.fields.length > 4) {
    throw new TypeError("Vector story fields must contain 2..4 items")
  }
  const keys = new Set<string>()
  const fields = args.fields.map((field) => normalizeField(field, "Vector", keys))
  return Object.freeze({...args, fields: Object.freeze(fields)})
}

function normalizeMatrixArgs(args: MatrixStoryArgs): MatrixStoryArgs {
  assertString(args.title, "Matrix story title")
  assertBoolean(args.disabled, "Matrix story disabled")
  assertBoolean(args.readOnly, "Matrix story readOnly")
  if (!Array.isArray(args.rows) || args.rows.length < 2 || args.rows.length > 4) {
    throw new TypeError("Matrix story rows must contain 2..4 items")
  }
  const rowKeys = new Set<string>()
  const cellKeys = new Set<string>()
  let width: number | null = null
  const rows = args.rows.map((row) => {
    assertKey(row.key, "Matrix row key", rowKeys)
    if (!Array.isArray(row.cells) || row.cells.length < 2 || row.cells.length > 4) {
      throw new TypeError("Matrix row cells must contain 2..4 items")
    }
    if (width === null) width = row.cells.length
    if (row.cells.length !== width) throw new Error("Matrix rows must have equal cell counts")
    return Object.freeze({
      key: row.key,
      cells: Object.freeze(row.cells.map((cell: MatrixStoryCell) =>
        normalizeField(cell, "Matrix", cellKeys))),
    })
  })
  return Object.freeze({...args, rows: Object.freeze(rows)})
}

function normalizeField<Field extends VectorStoryField | MatrixStoryCell>(
  field: Field,
  owner: "Vector" | "Matrix",
  keys: Set<string>,
): Field {
  assertKey(field.key, `${owner} field key`, keys)
  assertString(field.label, `${owner} field label`)
  assertString(field.value, `${owner} field value`)
  return Object.freeze({...field}) as Field
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

function sourceFor(root: HTMLElement, typescript: string): NumericCompositeSource {
  return Object.freeze({
    html: serializeElement(root),
    css: numericCompositeStoriesCss,
    typescript,
  })
}

function renderVectorTypeScript(args: VectorStoryArgs): string {
  return renderCompositeTypeScript("vector", args.title, args.fields)
}

function renderMatrixTypeScript(args: MatrixStoryArgs): string {
  return renderCompositeTypeScript("matrix", args.title, args.rows.flatMap(({cells}) => cells))
}

function renderCompositeTypeScript(
  owner: "vector" | "matrix",
  title: string,
  fields: readonly VectorStoryField[],
): string {
  return [
    'import {createDocument} from "@zavx0z/dom"',
    "",
    "const document = createDocument()",
    'const group = document.createElement("fieldset")',
    `group.className = ${JSON.stringify(`ui-${owner}-story`)}`,
    'const legend = document.createElement("legend")',
    `legend.appendChild(document.createTextNode(${JSON.stringify(title)}))`,
    "group.appendChild(legend)",
    `const fields = ${JSON.stringify(fields, null, 2)}`,
    "// Create label/span/input[type=number] for every keyed field.",
    "document.appendChild(group)",
  ].join("\n")
}

function serializeElement(element: Element, depth = 0): string {
  const indent = "  ".repeat(depth)
  const attributes = element.getAttributeNames()
    .sort()
    .map((name) => {
      const value = element.getAttribute(name) ?? ""
      if ((name === "disabled" || name === "readonly") && value === "") return ` ${name}`
      return ` ${name}="${escapeAttribute(value)}"`
    })
    .join("")
  const children = [...element.childNodes]
  if (children.length === 0) return `${indent}<${element.localName}${attributes}></${element.localName}>`
  if (children.every((node) => node.nodeType === 3)) {
    return `${indent}<${element.localName}${attributes}>${escapeText(element.textContent ?? "")}</${element.localName}>`
  }
  const body = children.map((node) => serializeNode(node, depth + 1)).join("\n")
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
