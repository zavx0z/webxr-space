import type {
  Document,
  HTMLDivElement,
  HTMLInputElement,
  HTMLSpanElement,
  HTMLElement,
  Node,
  Text,
} from "@zavx0z/dom"

export type FieldStoriesSource = Readonly<{
  html: string
  css: string
  typescript: string
}>

export type FieldStoryType = "text" | "number"

export type FieldStoryArgs = Readonly<{
  label: string
  value: string
  type: FieldStoryType
  disabled: boolean
  readOnly: boolean
  title: string
}>

export type FieldStoryRefs = Readonly<{
  root: HTMLDivElement
  label: HTMLElement
  labelText: HTMLSpanElement
  control: HTMLInputElement
  controlId: string
}>

export type FieldDomStory = Readonly<{
  element: HTMLDivElement
  refs: FieldStoryRefs
  args: FieldStoryArgs
  source: FieldStoriesSource
  update(args: FieldStoryArgs): void
}>

export type ControlGroupStoryRow = Readonly<{
  key: string
  label: string
  value: string
  type: FieldStoryType
  disabled: boolean
  readOnly: boolean
  title: string
}>

export type ControlGroupStoryArgs = Readonly<{
  title: string
  rows: readonly ControlGroupStoryRow[]
}>

export type ControlGroupStoryRefs = Readonly<{
  root: HTMLDivElement
  rowElements: ReadonlyMap<string, HTMLDivElement>
  labels: ReadonlyMap<string, HTMLElement>
  labelTexts: ReadonlyMap<string, HTMLSpanElement>
  controls: ReadonlyMap<string, HTMLInputElement>
}>

export type ControlGroupDomStory = Readonly<{
  element: HTMLDivElement
  refs: ControlGroupStoryRefs
  args: ControlGroupStoryArgs
  source: FieldStoriesSource
  update(args: ControlGroupStoryArgs): void
}>

export const fieldStoryDefaultArgs: FieldStoryArgs = Object.freeze({
  label: "Name",
  value: "Output",
  type: "text",
  disabled: false,
  readOnly: false,
  title: "Output name",
})

export const controlGroupStoryDefaultArgs: ControlGroupStoryArgs = Object.freeze({
  title: "Coordinates",
  rows: Object.freeze([
    Object.freeze({key: "x", label: "X", value: "1", type: "number", disabled: false, readOnly: false, title: "X value"}),
    Object.freeze({key: "y", label: "Y", value: "2", type: "number", disabled: false, readOnly: false, title: "Y value"}),
    Object.freeze({key: "name", label: "Name", value: "Output", type: "text", disabled: false, readOnly: false, title: "Name value"}),
  ]),
})

export const fieldStoriesCss = String.raw`
.ui-field-story {
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 320px;
  height: 32px;
  gap: 8px;
  padding: 2px 4px;
}

.ui-field-story__label {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  width: 112px;
  height: 28px;
  color: rgb(224, 224, 224);
  font-size: 12px;
}

.ui-field-story__label-text {
  display: inline;
  color: rgb(224, 224, 224);
  font-size: 12px;
}

.ui-field-story__control {
  box-sizing: border-box;
  display: block;
  min-width: 0;
  height: 28px;
  flex-grow: 1;
  padding: 4px 8px;
  border: 1px solid rgb(22, 22, 22);
  border-radius: 4px;
  background: rgb(36, 36, 36);
  color: rgb(224, 224, 224);
  font-size: 12px;
}

.ui-field-story__control[readonly] {
  background: rgb(48, 48, 48);
  color: rgb(176, 176, 176);
}

.ui-field-story__control[disabled] {
  opacity: 0.5;
}

.ui-control-group-story {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 320px;
  gap: 0;
  padding: 0;
  border: 1px solid rgb(22, 22, 22);
  border-radius: 4px;
  overflow: hidden;
  background: rgb(48, 48, 48);
}

.ui-control-group-story__row {
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  height: 32px;
  gap: 8px;
  padding: 2px 4px;
  border-bottom: 1px solid rgb(22, 22, 22);
}

.ui-control-group-story__row--last {
  border-bottom: 0;
}

.ui-control-group-story__label {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  width: 104px;
  height: 28px;
  color: rgb(224, 224, 224);
  font-size: 12px;
}

.ui-control-group-story__label-text {
  display: inline;
  color: rgb(224, 224, 224);
  font-size: 12px;
}

.ui-control-group-story__control {
  box-sizing: border-box;
  display: block;
  min-width: 0;
  height: 28px;
  flex-grow: 1;
  padding: 4px 8px;
  border: 1px solid rgb(72, 72, 72);
  border-radius: 3px;
  background: rgb(36, 36, 36);
  color: rgb(224, 224, 224);
  font-size: 12px;
}

.ui-control-group-story__control[readonly] {
  background: rgb(48, 48, 48);
  color: rgb(176, 176, 176);
}

.ui-control-group-story__control[disabled] {
  opacity: 0.5;
}
`

type ControlGroupEntry = {
  row: HTMLDivElement
  label: HTMLElement
  labelText: HTMLSpanElement
  text: Text
  control: HTMLInputElement
}

let nextGeneratedControlId = 1

export function createFieldStory(
  document: Document,
  initialArgs: FieldStoryArgs = fieldStoryDefaultArgs,
): FieldDomStory {
  const root = document.createElement("div")
  const label = document.createElement("label")
  const labelText = document.createElement("span")
  const text = document.createTextNode("")
  const control = document.createElement("input")
  const controlId = generatedControlId("field")
  const labelId = `${controlId}-label`

  root.className = "ui-field-story"
  label.className = "ui-field-story__label"
  label.id = labelId
  label.setAttribute("for", controlId)
  labelText.className = "ui-field-story__label-text"
  labelText.appendChild(text)
  label.appendChild(labelText)
  control.className = "ui-field-story__control"
  control.id = controlId
  control.setAttribute("aria-labelledby", labelId)
  root.append(label, control)

  let currentArgs = fieldStoryDefaultArgs
  const update = (args: FieldStoryArgs): void => {
    const nextArgs = normalizeFieldArgs(args)
    if (text.data !== nextArgs.label) text.data = nextArgs.label
    syncInput(control, nextArgs)
    currentArgs = Object.freeze({...nextArgs, value: control.value})
  }
  const refs: FieldStoryRefs = Object.freeze({root, label, labelText, control, controlId})
  const story: FieldDomStory = Object.freeze({
    element: root,
    refs,
    get args() { return currentArgs },
    get source() { return fieldSource(refs) },
    update,
  })
  update(initialArgs)
  return story
}

export function createControlGroupStory(
  document: Document,
  initialArgs: ControlGroupStoryArgs = controlGroupStoryDefaultArgs,
): ControlGroupDomStory {
  const root = document.createElement("div")
  root.className = "ui-control-group-story"
  const entries = new Map<string, ControlGroupEntry>()
  const rowElements = new Map<string, HTMLDivElement>()
  const labels = new Map<string, HTMLElement>()
  const labelTexts = new Map<string, HTMLSpanElement>()
  const controls = new Map<string, HTMLInputElement>()
  let currentArgs = controlGroupStoryDefaultArgs

  const update = (args: ControlGroupStoryArgs): void => {
    const nextArgs = normalizeControlGroupArgs(args)
    syncTitle(root, nextArgs.title)
    const retainedKeys = new Set(nextArgs.rows.map(({key}) => key))
    for (const [key, entry] of entries) {
      if (retainedKeys.has(key)) continue
      entry.row.parentNode?.removeChild(entry.row)
      entries.delete(key)
      rowElements.delete(key)
      labels.delete(key)
      labelTexts.delete(key)
      controls.delete(key)
    }

    const ordered: HTMLDivElement[] = []
    const resolvedRows: ControlGroupStoryRow[] = []
    for (const [index, rowArgs] of nextArgs.rows.entries()) {
      let entry = entries.get(rowArgs.key)
      if (entry === undefined) {
        entry = createControlGroupEntry(document, rowArgs.key)
        entries.set(rowArgs.key, entry)
        rowElements.set(rowArgs.key, entry.row)
        labels.set(rowArgs.key, entry.label)
        labelTexts.set(rowArgs.key, entry.labelText)
        controls.set(rowArgs.key, entry.control)
      }
      const rowClass = index === nextArgs.rows.length - 1
        ? "ui-control-group-story__row ui-control-group-story__row--last"
        : "ui-control-group-story__row"
      if (entry.row.className !== rowClass) entry.row.className = rowClass
      if (entry.text.data !== rowArgs.label) entry.text.data = rowArgs.label
      syncInput(entry.control, rowArgs)
      ordered.push(entry.row)
      resolvedRows.push(Object.freeze({...rowArgs, value: entry.control.value}))
    }
    reconcileChildren(root, ordered)
    currentArgs = Object.freeze({
      title: nextArgs.title,
      rows: Object.freeze(resolvedRows),
    })
  }

  const refs: ControlGroupStoryRefs = Object.freeze({
    root,
    rowElements,
    labels,
    labelTexts,
    controls,
  })
  const story: ControlGroupDomStory = Object.freeze({
    element: root,
    refs,
    get args() { return currentArgs },
    get source() { return controlGroupSource(refs, currentArgs) },
    update,
  })
  update(initialArgs)
  return story
}

function createControlGroupEntry(document: Document, key: string): ControlGroupEntry {
  const row = document.createElement("div")
  const label = document.createElement("label")
  const labelText = document.createElement("span")
  const text = document.createTextNode("")
  const control = document.createElement("input")
  const controlId = generatedControlId("group")
  const labelId = `${controlId}-label`

  row.setAttribute("data-row-key", key)
  label.className = "ui-control-group-story__label"
  label.id = labelId
  label.setAttribute("for", controlId)
  labelText.className = "ui-control-group-story__label-text"
  labelText.appendChild(text)
  label.appendChild(labelText)
  control.className = "ui-control-group-story__control"
  control.id = controlId
  control.setAttribute("aria-labelledby", labelId)
  row.append(label, control)
  return {row, label, labelText, text, control}
}

function generatedControlId(owner: "field" | "group"): string {
  const id = `ui-${owner}-story-control-${nextGeneratedControlId}`
  nextGeneratedControlId += 1
  return id
}

function syncInput(
  input: HTMLInputElement,
  args: Pick<FieldStoryArgs, "value" | "type" | "disabled" | "readOnly" | "title">,
): void {
  if (input.getAttribute("type") !== args.type) input.type = args.type
  if (input.value !== args.value) input.value = args.value
  if (input.disabled !== args.disabled) input.disabled = args.disabled
  if (input.readOnly !== args.readOnly) input.readOnly = args.readOnly
  syncTitle(input, args.title)
}

function syncTitle(element: HTMLElement, title: string): void {
  if (element.getAttribute("title") !== title) element.title = title
}

function normalizeFieldArgs(args: FieldStoryArgs): FieldStoryArgs {
  assertString(args.label, "Field story label")
  assertString(args.value, "Field story value")
  assertFieldType(args.type, "Field story")
  assertBoolean(args.disabled, "Field story disabled")
  assertBoolean(args.readOnly, "Field story readOnly")
  assertString(args.title, "Field story title")
  return Object.freeze({...args})
}

function normalizeControlGroupArgs(args: ControlGroupStoryArgs): ControlGroupStoryArgs {
  assertString(args.title, "ControlGroup story title")
  const seen = new Set<string>()
  const rows = args.rows.map((row) => {
    assertString(row.key, "ControlGroup row key")
    if (row.key.length === 0) throw new Error("ControlGroup row key must not be empty")
    if (seen.has(row.key)) throw new Error(`ControlGroup row key must be unique: ${row.key}`)
    seen.add(row.key)
    assertString(row.label, `ControlGroup row ${row.key} label`)
    assertString(row.value, `ControlGroup row ${row.key} value`)
    assertFieldType(row.type, `ControlGroup row ${row.key}`)
    assertBoolean(row.disabled, `ControlGroup row ${row.key} disabled`)
    assertBoolean(row.readOnly, `ControlGroup row ${row.key} readOnly`)
    assertString(row.title, `ControlGroup row ${row.key} title`)
    return Object.freeze({...row})
  })
  return Object.freeze({title: args.title, rows: Object.freeze(rows)})
}

function assertFieldType(value: unknown, owner: string): asserts value is FieldStoryType {
  if (value !== "text" && value !== "number") {
    throw new Error(`Unknown ${owner} type: ${String(value)}`)
  }
}

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string") throw new TypeError(`${label} must be a string`)
}

function assertBoolean(value: unknown, label: string): asserts value is boolean {
  if (typeof value !== "boolean") throw new TypeError(`${label} must be a boolean`)
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

function fieldSource(refs: FieldStoryRefs): FieldStoriesSource {
  const input = refs.control
  return sourceFor(refs.root, [
    'const field = document.createElement("div")',
    'field.className = "ui-field-story"',
    'const label = document.createElement("label")',
    'label.className = "ui-field-story__label"',
    `label.id = ${JSON.stringify(refs.label.id)}`,
    `label.setAttribute("for", ${JSON.stringify(refs.controlId)})`,
    'const labelText = document.createElement("span")',
    'labelText.className = "ui-field-story__label-text"',
    `labelText.appendChild(document.createTextNode(${JSON.stringify(refs.labelText.textContent)}))`,
    'const control = document.createElement("input")',
    'control.className = "ui-field-story__control"',
    `control.id = ${JSON.stringify(refs.controlId)}`,
    `control.setAttribute("aria-labelledby", ${JSON.stringify(refs.label.id)})`,
    `control.type = ${JSON.stringify(input.type)}`,
    `control.value = ${JSON.stringify(input.value)}`,
    `control.disabled = ${input.disabled}`,
    `control.readOnly = ${input.readOnly}`,
    `control.title = ${JSON.stringify(input.title)}`,
    "label.appendChild(labelText)",
    "field.append(label, control)",
    "document.appendChild(field)",
  ])
}

function controlGroupSource(
  refs: ControlGroupStoryRefs,
  args: ControlGroupStoryArgs,
): FieldStoriesSource {
  const rows = args.rows.map((row) => {
    const label = refs.labels.get(row.key)!
    const control = refs.controls.get(row.key)!
    return {
      key: row.key,
      className: refs.rowElements.get(row.key)?.className ?? "ui-control-group-story__row",
      label: refs.labelTexts.get(row.key)?.textContent ?? "",
      controlId: control.id,
      labelId: label.id,
      type: control.type,
      value: control.value,
      disabled: control.disabled,
      readOnly: control.readOnly,
      title: control.title,
    }
  })
  return sourceFor(refs.root, [
    'const group = document.createElement("div")',
    'group.className = "ui-control-group-story"',
    `group.title = ${JSON.stringify(refs.root.title)}`,
    `const rows = ${JSON.stringify(rows, null, 2)}`,
    "for (const row of rows) {",
    '  const rowElement = document.createElement("div")',
    "  rowElement.className = row.className",
    '  rowElement.setAttribute("data-row-key", row.key)',
    '  const label = document.createElement("label")',
    '  label.className = "ui-control-group-story__label"',
    "  label.id = row.labelId",
    '  label.setAttribute("for", row.controlId)',
    '  const labelText = document.createElement("span")',
    '  labelText.className = "ui-control-group-story__label-text"',
    "  labelText.appendChild(document.createTextNode(row.label))",
    '  const control = document.createElement("input")',
    '  control.className = "ui-control-group-story__control"',
    "  control.id = row.controlId",
    '  control.setAttribute("aria-labelledby", row.labelId)',
    "  control.type = row.type",
    "  control.value = row.value",
    "  control.disabled = row.disabled",
    "  control.readOnly = row.readOnly",
    "  control.title = row.title",
    "  label.appendChild(labelText)",
    "  rowElement.append(label, control)",
    "  group.appendChild(rowElement)",
    "}",
    "document.appendChild(group)",
  ])
}

function sourceFor(root: HTMLElement, statements: readonly string[]): FieldStoriesSource {
  return Object.freeze({
    html: serializeElement(root),
    css: fieldStoriesCss,
    typescript: [
      'import {createDocument} from "@zavx0z/dom"',
      "",
      "const document = createDocument()",
      ...statements,
    ].join("\n"),
  })
}

function serializeElement(element: HTMLElement, depth = 0): string {
  const indent = "  ".repeat(depth)
  const attributes = element.getAttributeNames()
    .sort()
    .map((name) => serializeAttribute(element, name))
    .join("")
  const opening = `${indent}<${element.localName}${attributes}>`
  if (element.localName === "input") return opening
  const children = element.childNodes
  if (children.length === 0) return `${opening}</${element.localName}>`
  if (children.length === 1 && children[0]?.nodeType === 3) {
    return `${opening}${escapeText(children[0].nodeValue ?? "")}</${element.localName}>`
  }
  const content = children.map((node) => {
    if (node.nodeType === 1) return serializeElement(node as HTMLElement, depth + 1)
    if (node.nodeType === 3) return `${"  ".repeat(depth + 1)}${escapeText(node.nodeValue ?? "")}`
    return ""
  }).filter(Boolean)
  return [opening, ...content, `${indent}</${element.localName}>`].join("\n")
}

function serializeAttribute(element: HTMLElement, name: string): string {
  const value = element.getAttribute(name) ?? ""
  if ((name === "disabled" || name === "readonly") && value === "") return ` ${name}`
  return ` ${name}="${escapeAttribute(value)}"`
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
