import type {
  Document,
  HTMLButtonElement,
  HTMLDivElement,
  HTMLInputElement,
  HTMLOptionElement,
  HTMLSelectElement,
  HTMLSpanElement,
  HTMLElement,
  Node,
  Text,
} from "@zavx0z/dom"

export type ResourceInputStorySource = Readonly<{
  html: string
  css: string
  typescript: string
}>

export type ResourceInputStoryDensity = "regular" | "compact"

export type ReferenceStoryOption = Readonly<{
  key: string
  label: string
  value: string
  disabled: boolean
}>

export type ReferenceInputStoryArgs = Readonly<{
  value: string
  disabled: boolean
  title: string
  options: readonly ReferenceStoryOption[]
}>

export type ReferenceInputStoryRefs = Readonly<{
  select: HTMLSelectElement
  options: ReadonlyMap<string, HTMLOptionElement>
}>

export type ReferenceInputDomStory = Readonly<{
  element: HTMLSelectElement
  refs: ReferenceInputStoryRefs
  args: ReferenceInputStoryArgs
  source: ResourceInputStorySource
  update(args: ReferenceInputStoryArgs): void
}>

export type PathInputStoryArgs = Readonly<{
  label: string
  value: string
  placeholder: string
  disabled: boolean
  readOnly: boolean
  title: string
  browseTitle: string
  density?: ResourceInputStoryDensity
}>

export type PathInputStoryRefs = Readonly<{
  root: HTMLDivElement
  label: HTMLElement
  labelText: HTMLSpanElement
  input: HTMLInputElement
  browse: HTMLButtonElement
  controlId: string
}>

export type PathInputDomStory = Readonly<{
  element: HTMLDivElement
  refs: PathInputStoryRefs
  args: PathInputStoryArgs
  source: ResourceInputStorySource
  update(args: PathInputStoryArgs): void
}>

export type CollectionStoryItem = Readonly<{
  key: string
  label: string
  disabled: boolean
}>

export type CollectionInputStoryArgs = Readonly<{
  title: string
  selectedKey: string | null
  disabled: boolean
  readOnly?: boolean
  density?: ResourceInputStoryDensity
  addTitle: string
  removeTitle: string
  items: readonly CollectionStoryItem[]
}>

export type CollectionInputStoryRefs = Readonly<{
  root: HTMLDivElement
  list: HTMLElement
  itemElements: ReadonlyMap<string, HTMLElement>
  addButton: HTMLButtonElement
  removeButton: HTMLButtonElement
}>

export type CollectionInputDomStory = Readonly<{
  element: HTMLDivElement
  refs: CollectionInputStoryRefs
  args: CollectionInputStoryArgs
  source: ResourceInputStorySource
  update(args: CollectionInputStoryArgs): void
}>

export const referenceInputStoryDefaultArgs: ReferenceInputStoryArgs = Object.freeze({
  value: "material",
  disabled: false,
  title: "Reference",
  options: Object.freeze([
    Object.freeze({key: "none", label: "None", value: "", disabled: false}),
    Object.freeze({key: "material", label: "Material.001", value: "material", disabled: false}),
    Object.freeze({key: "world", label: "World", value: "world", disabled: false}),
  ]),
})

export const pathInputStoryDefaultArgs: PathInputStoryArgs = Object.freeze({
  label: "Path",
  value: "/output/render.png",
  placeholder: "Choose a file",
  disabled: false,
  readOnly: false,
  title: "Output path",
  browseTitle: "Browse",
  density: "regular",
})

export const collectionInputStoryDefaultArgs: CollectionInputStoryArgs = Object.freeze({
  title: "Collection",
  selectedKey: "second",
  disabled: false,
  readOnly: false,
  density: "regular",
  addTitle: "Add item",
  removeTitle: "Remove selected item",
  items: Object.freeze([
    Object.freeze({key: "first", label: "First", disabled: false}),
    Object.freeze({key: "second", label: "Second", disabled: false}),
    Object.freeze({key: "third", label: "Third", disabled: false}),
  ]),
})

export const resourceInputStoriesCss = String.raw`
.ui-reference-input-story {
  box-sizing: border-box;
  display: block;
  width: 260px;
  height: 32px;
  padding: 5px 10px;
  border: 1px solid rgb(22, 22, 22);
  border-radius: 4px;
  background: rgb(36, 36, 36);
  color: rgb(224, 224, 224);
  font-size: 12px;
}

.ui-path-input-story {
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 380px;
  height: 32px;
  gap: 6px;
}

.ui-path-input-story__label {
  display: flex;
  align-items: center;
  width: 72px;
  height: 28px;
  color: rgb(224, 224, 224);
  font-size: 12px;
}

.ui-path-input-story__label-text {
  display: inline;
  font-size: 12px;
}

.ui-path-input-story__input {
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

.ui-path-input-story__browse {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 28px;
  padding: 4px 8px;
  border: 1px solid rgb(22, 22, 22);
  border-radius: 4px;
  background: rgb(61, 61, 61);
  color: rgb(224, 224, 224);
  font-size: 12px;
}

.ui-collection-input-story {
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  width: 320px;
  height: 128px;
  gap: 6px;
}

.ui-collection-input-story__list {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 242px;
  height: 128px;
  padding: 4px;
  gap: 2px;
  overflow-y: auto;
  border: 1px solid rgb(22, 22, 22);
  border-radius: 4px;
  background: rgb(36, 36, 36);
}

.ui-collection-input-story__item {
  box-sizing: border-box;
  display: block;
  width: 100%;
  height: 26px;
  padding: 5px 8px;
  border-radius: 3px;
  color: rgb(224, 224, 224);
  font-size: 12px;
}

.ui-collection-input-story__item[aria-selected="true"] {
  background: rgb(45, 104, 128);
}

.ui-collection-input-story__item[aria-disabled="true"] {
  opacity: 0.5;
}

.ui-collection-input-story__actions {
  display: flex;
  flex-direction: column;
  width: 72px;
  gap: 4px;
}

.ui-collection-input-story__button {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 28px;
  padding: 4px 8px;
  border: 1px solid rgb(22, 22, 22);
  border-radius: 4px;
  background: rgb(61, 61, 61);
  color: rgb(224, 224, 224);
  font-size: 12px;
}

.ui-reference-input-story[disabled],
.ui-path-input-story__input[disabled],
.ui-path-input-story__browse[disabled],
.ui-collection-input-story__button[disabled] {
  opacity: 0.5;
}

.ui-path-input-story--compact {
  width: 340px;
  height: 26px;
  gap: 4px;
}

.ui-path-input-story--compact .ui-path-input-story__label,
.ui-path-input-story--compact .ui-path-input-story__input,
.ui-path-input-story--compact .ui-path-input-story__browse {
  height: 24px;
  font-size: 11px;
}

.ui-collection-input-story--compact {
  width: 292px;
  height: 96px;
  gap: 4px;
}

.ui-collection-input-story--compact .ui-collection-input-story__list {
  width: 216px;
  height: 96px;
  padding: 3px;
}

.ui-collection-input-story--compact .ui-collection-input-story__item {
  height: 22px;
  padding: 3px 6px;
  font-size: 11px;
}
`

type OptionEntry = {element: HTMLOptionElement; text: Text}
type CollectionEntry = {element: HTMLElement; text: Text}
let nextResourceControlId = 1

export function createReferenceInputStory(
  document: Document,
  initialArgs: ReferenceInputStoryArgs = referenceInputStoryDefaultArgs,
): ReferenceInputDomStory {
  const select = document.createElement("select")
  select.className = "ui-reference-input-story"
  const entries = new Map<string, OptionEntry>()
  const options = new Map<string, HTMLOptionElement>()
  let currentArgs = referenceInputStoryDefaultArgs

  const update = (args: ReferenceInputStoryArgs): void => {
    const nextArgs = normalizeReferenceArgs(args)
    const retained = new Set(nextArgs.options.map(({key}) => key))
    for (const [key, entry] of entries) {
      if (retained.has(key)) continue
      entry.element.parentNode?.removeChild(entry.element)
      entries.delete(key)
      options.delete(key)
    }
    const ordered: HTMLOptionElement[] = []
    for (const optionArgs of nextArgs.options) {
      let entry = entries.get(optionArgs.key)
      if (entry === undefined) {
        const element = document.createElement("option")
        const text = document.createTextNode("")
        element.appendChild(text)
        element.setAttribute("data-option-key", optionArgs.key)
        entry = {element, text}
        entries.set(optionArgs.key, entry)
        options.set(optionArgs.key, element)
      }
      entry.element.value = optionArgs.value
      entry.element.disabled = optionArgs.disabled
      if (entry.text.data !== optionArgs.label) entry.text.data = optionArgs.label
      ordered.push(entry.element)
    }
    reconcileChildren(select, ordered)
    select.disabled = nextArgs.disabled
    syncTitle(select, nextArgs.title)
    select.value = nextArgs.value
    currentArgs = Object.freeze({...nextArgs, value: select.value})
  }
  const refs = Object.freeze({select, options})
  const story: ReferenceInputDomStory = Object.freeze({
    element: select,
    refs,
    get args() { return currentArgs },
    get source() { return referenceSource(select) },
    update,
  })
  update(initialArgs)
  return story
}

export function createPathInputStory(
  document: Document,
  initialArgs: PathInputStoryArgs = pathInputStoryDefaultArgs,
): PathInputDomStory {
  const root = document.createElement("div")
  const label = document.createElement("label")
  const labelText = document.createElement("span")
  const labelNode = document.createTextNode("")
  const input = document.createElement("input")
  const browse = document.createElement("button")
  const browseText = document.createTextNode("Browse")
  const controlId = generatedResourceId()
  const labelId = `${controlId}-label`
  root.className = "ui-path-input-story"
  label.className = "ui-path-input-story__label"
  label.id = labelId
  label.setAttribute("for", controlId)
  labelText.className = "ui-path-input-story__label-text"
  labelText.appendChild(labelNode)
  label.appendChild(labelText)
  input.className = "ui-path-input-story__input"
  input.id = controlId
  input.setAttribute("aria-labelledby", labelId)
  browse.className = "ui-path-input-story__browse"
  browse.setAttribute("type", "button")
  browse.appendChild(browseText)
  root.append(label, input, browse)
  let currentArgs = pathInputStoryDefaultArgs

  const update = (args: PathInputStoryArgs): void => {
    const nextArgs = normalizePathArgs(args)
    root.className = nextArgs.density === "compact"
      ? "ui-path-input-story ui-path-input-story--compact"
      : "ui-path-input-story"
    if (labelNode.data !== nextArgs.label) labelNode.data = nextArgs.label
    if (input.getAttribute("type") !== "text") input.type = "text"
    if (input.value !== nextArgs.value) input.value = nextArgs.value
    if (input.getAttribute("placeholder") !== nextArgs.placeholder) input.placeholder = nextArgs.placeholder
    input.disabled = nextArgs.disabled
    input.readOnly = nextArgs.readOnly
    syncTitle(input, nextArgs.title)
    browse.disabled = nextArgs.disabled || nextArgs.readOnly
    syncTitle(browse, nextArgs.browseTitle)
    currentArgs = nextArgs
  }
  const refs: PathInputStoryRefs = Object.freeze({root, label, labelText, input, browse, controlId})
  const story: PathInputDomStory = Object.freeze({
    element: root,
    refs,
    get args() { return currentArgs },
    get source() { return pathSource(refs) },
    update,
  })
  update(initialArgs)
  return story
}

export function createCollectionInputStory(
  document: Document,
  initialArgs: CollectionInputStoryArgs = collectionInputStoryDefaultArgs,
): CollectionInputDomStory {
  const root = document.createElement("div")
  const list = document.createElement("ul")
  const actions = document.createElement("div")
  const addButton = document.createElement("button")
  const removeButton = document.createElement("button")
  root.className = "ui-collection-input-story"
  list.className = "ui-collection-input-story__list"
  list.setAttribute("role", "listbox")
  list.setAttribute("aria-label", "Collection items")
  actions.className = "ui-collection-input-story__actions"
  for (const [button, text] of [[addButton, "Add"], [removeButton, "Remove"]] as const) {
    button.className = "ui-collection-input-story__button"
    button.setAttribute("type", "button")
    button.appendChild(document.createTextNode(text))
    actions.appendChild(button)
  }
  root.append(list, actions)
  const entries = new Map<string, CollectionEntry>()
  const itemElements = new Map<string, HTMLElement>()
  let currentArgs = collectionInputStoryDefaultArgs

  const update = (args: CollectionInputStoryArgs): void => {
    const nextArgs = normalizeCollectionArgs(args)
    const readOnly = nextArgs.readOnly === true
    root.className = nextArgs.density === "compact"
      ? "ui-collection-input-story ui-collection-input-story--compact"
      : "ui-collection-input-story"
    list.setAttribute("aria-readonly", String(readOnly))
    syncTitle(root, nextArgs.title)
    const retained = new Set(nextArgs.items.map(({key}) => key))
    for (const [key, entry] of entries) {
      if (retained.has(key)) continue
      entry.element.parentNode?.removeChild(entry.element)
      entries.delete(key)
      itemElements.delete(key)
    }
    const ordered: HTMLElement[] = []
    for (const item of nextArgs.items) {
      let entry = entries.get(item.key)
      if (entry === undefined) {
        const element = document.createElement("li")
        const text = document.createTextNode("")
        element.className = "ui-collection-input-story__item"
        element.setAttribute("role", "option")
        element.setAttribute("data-item-key", item.key)
        element.appendChild(text)
        entry = {element, text}
        entries.set(item.key, entry)
        itemElements.set(item.key, element)
      }
      if (entry.text.data !== item.label) entry.text.data = item.label
      entry.element.setAttribute("aria-selected", String(item.key === nextArgs.selectedKey))
      entry.element.setAttribute("aria-disabled", String(item.disabled || nextArgs.disabled))
      ordered.push(entry.element)
    }
    reconcileChildren(list, ordered)
    addButton.disabled = nextArgs.disabled || readOnly
    syncTitle(addButton, nextArgs.addTitle)
    const selected = nextArgs.items.find(({key}) => key === nextArgs.selectedKey)
    removeButton.disabled = nextArgs.disabled || readOnly || selected === undefined || selected.disabled
    syncTitle(removeButton, nextArgs.removeTitle)
    currentArgs = nextArgs
  }
  const refs: CollectionInputStoryRefs = Object.freeze({root, list, itemElements, addButton, removeButton})
  const story: CollectionInputDomStory = Object.freeze({
    element: root,
    refs,
    get args() { return currentArgs },
    get source() { return collectionSource(refs, currentArgs) },
    update,
  })
  update(initialArgs)
  return story
}

function generatedResourceId(): string {
  const id = `ui-path-story-control-${nextResourceControlId}`
  nextResourceControlId += 1
  return id
}

function normalizeReferenceArgs(args: ReferenceInputStoryArgs): ReferenceInputStoryArgs {
  assertString(args.value, "ReferenceInput story value")
  assertBoolean(args.disabled, "ReferenceInput story disabled")
  assertString(args.title, "ReferenceInput story title")
  const keys = new Set<string>()
  const values = new Set<string>()
  const options = args.options.map((option) => {
    assertKey(option.key, keys, "ReferenceInput option")
    assertString(option.label, `ReferenceInput option ${option.key} label`)
    assertString(option.value, `ReferenceInput option ${option.key} value`)
    if (values.has(option.value)) throw new Error(`ReferenceInput option value must be unique: ${option.value}`)
    values.add(option.value)
    assertBoolean(option.disabled, `ReferenceInput option ${option.key} disabled`)
    return Object.freeze({...option})
  })
  if (!values.has(args.value)) throw new Error(`ReferenceInput selected value does not exist: ${args.value}`)
  return Object.freeze({...args, options: Object.freeze(options)})
}

function normalizePathArgs(args: PathInputStoryArgs): PathInputStoryArgs {
  for (const key of ["label", "value", "placeholder", "title", "browseTitle"] as const) {
    assertString(args[key], `PathInput story ${key}`)
  }
  assertBoolean(args.disabled, "PathInput story disabled")
  assertBoolean(args.readOnly, "PathInput story readOnly")
  const density = normalizeDensity(args.density, "PathInput story density")
  return Object.freeze({...args, density})
}

function normalizeCollectionArgs(args: CollectionInputStoryArgs): CollectionInputStoryArgs {
  for (const key of ["title", "addTitle", "removeTitle"] as const) {
    assertString(args[key], `CollectionInput story ${key}`)
  }
  assertBoolean(args.disabled, "CollectionInput story disabled")
  const readOnly = args.readOnly ?? false
  assertBoolean(readOnly, "CollectionInput story readOnly")
  const density = normalizeDensity(args.density, "CollectionInput story density")
  const keys = new Set<string>()
  const items = args.items.map((item) => {
    assertKey(item.key, keys, "CollectionInput item")
    assertString(item.label, `CollectionInput item ${item.key} label`)
    assertBoolean(item.disabled, `CollectionInput item ${item.key} disabled`)
    return Object.freeze({...item})
  })
  if (args.selectedKey !== null && !keys.has(args.selectedKey)) {
    throw new Error(`CollectionInput selected key does not exist: ${args.selectedKey}`)
  }
  return Object.freeze({...args, readOnly, density, items: Object.freeze(items)})
}

function normalizeDensity(
  value: ResourceInputStoryDensity | undefined,
  label: string,
): ResourceInputStoryDensity {
  const density = value ?? "regular"
  if (density !== "regular" && density !== "compact") {
    throw new Error(`Unknown ${label}: ${String(density)}`)
  }
  return density
}

function assertKey(key: unknown, seen: Set<string>, owner: string): asserts key is string {
  assertString(key, `${owner} key`)
  if (key.length === 0) throw new Error(`${owner} key must not be empty`)
  if (seen.has(key)) throw new Error(`${owner} key must be unique: ${key}`)
  seen.add(key)
}

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string") throw new TypeError(`${label} must be a string`)
}

function assertBoolean(value: unknown, label: string): asserts value is boolean {
  if (typeof value !== "boolean") throw new TypeError(`${label} must be a boolean`)
}

function syncTitle(element: HTMLElement, title: string): void {
  if (element.getAttribute("title") !== title) element.title = title
}

function reconcileChildren(parent: Node, ordered: readonly Node[]): void {
  const retained = new Set(ordered)
  for (const child of parent.childNodes) if (!retained.has(child)) parent.removeChild(child)
  let reference = parent.firstChild
  for (const child of ordered) {
    if (child === reference) {
      reference = reference.nextSibling
      continue
    }
    parent.insertBefore(child, reference)
  }
}

function referenceSource(select: HTMLSelectElement): ResourceInputStorySource {
  const options = [...select.options].map((option) => ({
    key: option.getAttribute("data-option-key") ?? "",
    label: option.label,
    value: option.value,
    disabled: option.disabled,
  }))
  return sourceFor(select, [
    'const select = document.createElement("select")',
    'select.className = "ui-reference-input-story"',
    `const options = ${JSON.stringify(options, null, 2)}`,
    "for (const item of options) {",
    '  const option = document.createElement("option")',
    "  option.value = item.value",
    "  option.disabled = item.disabled",
    '  option.setAttribute("data-option-key", item.key)',
    "  option.appendChild(document.createTextNode(item.label))",
    "  select.appendChild(option)",
    "}",
    `select.value = ${JSON.stringify(select.value)}`,
    `select.disabled = ${select.disabled}`,
    `select.title = ${JSON.stringify(select.title)}`,
    "document.appendChild(select)",
  ])
}

function pathSource(refs: PathInputStoryRefs): ResourceInputStorySource {
  return sourceFor(refs.root, [
    'const root = document.createElement("div")',
    `root.className = ${JSON.stringify(refs.root.className)}`,
    'const label = document.createElement("label")',
    'label.className = "ui-path-input-story__label"',
    `label.id = ${JSON.stringify(refs.label.id)}`,
    `label.setAttribute("for", ${JSON.stringify(refs.controlId)})`,
    'const labelText = document.createElement("span")',
    'labelText.className = "ui-path-input-story__label-text"',
    `labelText.appendChild(document.createTextNode(${JSON.stringify(refs.labelText.textContent)}))`,
    'const input = document.createElement("input")',
    'input.className = "ui-path-input-story__input"',
    `input.id = ${JSON.stringify(refs.controlId)}`,
    `input.setAttribute("aria-labelledby", ${JSON.stringify(refs.label.id)})`,
    'input.type = "text"',
    `input.value = ${JSON.stringify(refs.input.value)}`,
    `input.placeholder = ${JSON.stringify(refs.input.placeholder)}`,
    `input.disabled = ${refs.input.disabled}`,
    `input.readOnly = ${refs.input.readOnly}`,
    `input.title = ${JSON.stringify(refs.input.title)}`,
    'const browse = document.createElement("button")',
    'browse.className = "ui-path-input-story__browse"',
    'browse.setAttribute("type", "button")',
    `browse.disabled = ${refs.browse.disabled}`,
    `browse.title = ${JSON.stringify(refs.browse.title)}`,
    'browse.appendChild(document.createTextNode("Browse"))',
    "label.appendChild(labelText)",
    "root.append(label, input, browse)",
    "document.appendChild(root)",
  ])
}

function collectionSource(refs: CollectionInputStoryRefs, args: CollectionInputStoryArgs): ResourceInputStorySource {
  const items = args.items.map((item) => {
    const element = refs.itemElements.get(item.key)!
    return {
      key: item.key,
      label: element.textContent,
      disabled: element.getAttribute("aria-disabled") === "true",
      selected: element.getAttribute("aria-selected") === "true",
    }
  })
  return sourceFor(refs.root, [
    'const root = document.createElement("div")',
    `root.className = ${JSON.stringify(refs.root.className)}`,
    `root.title = ${JSON.stringify(refs.root.title)}`,
    'const list = document.createElement("ul")',
    'list.className = "ui-collection-input-story__list"',
    'list.setAttribute("role", "listbox")',
    `list.setAttribute("aria-label", ${JSON.stringify(refs.list.getAttribute("aria-label") ?? "")})`,
    `list.setAttribute("aria-readonly", ${JSON.stringify(refs.list.getAttribute("aria-readonly") ?? "false")})`,
    `const items = ${JSON.stringify(items, null, 2)}`,
    "for (const item of items) {",
    '  const option = document.createElement("li")',
    '  option.className = "ui-collection-input-story__item"',
    '  option.setAttribute("role", "option")',
    '  option.setAttribute("data-item-key", item.key)',
    '  option.setAttribute("aria-selected", String(item.selected))',
    '  option.setAttribute("aria-disabled", String(item.disabled))',
    "  option.appendChild(document.createTextNode(item.label))",
    "  list.appendChild(option)",
    "}",
    'const actions = document.createElement("div")',
    'actions.className = "ui-collection-input-story__actions"',
    'const add = document.createElement("button")',
    'add.className = "ui-collection-input-story__button"',
    'add.setAttribute("type", "button")',
    `add.disabled = ${refs.addButton.disabled}`,
    `add.title = ${JSON.stringify(refs.addButton.title)}`,
    'add.appendChild(document.createTextNode("Add"))',
    'const remove = document.createElement("button")',
    'remove.className = "ui-collection-input-story__button"',
    'remove.setAttribute("type", "button")',
    `remove.disabled = ${refs.removeButton.disabled}`,
    `remove.title = ${JSON.stringify(refs.removeButton.title)}`,
    'remove.appendChild(document.createTextNode("Remove"))',
    "actions.append(add, remove)",
    "root.append(list, actions)",
    "document.appendChild(root)",
  ])
}

function sourceFor(root: HTMLElement, statements: readonly string[]): ResourceInputStorySource {
  return Object.freeze({
    html: serializeElement(root),
    css: resourceInputStoriesCss,
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
  const attributes = element.getAttributeNames().sort()
    .map((name) => serializeAttribute(element, name)).join("")
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
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
}

function escapeAttribute(value: string): string {
  return escapeText(value).replaceAll('"', "&quot;")
}
