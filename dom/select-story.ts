import type {
  Document,
  HTMLSelectElement,
  HTMLOptionElement,
  Text,
} from "@zavx0z/dom"

export type SelectStoryOption = Readonly<{
  key: string
  label: string
  value: string
  disabled: boolean
}>

export type SelectStoryArgs = Readonly<{
  value: string
  disabled: boolean
  title: string
  options: readonly SelectStoryOption[]
}>

export type SelectStorySource = Readonly<{
  html: string
  css: string
  typescript: string
}>

export type SelectStoryRefs = Readonly<{
  select: HTMLSelectElement
  options: ReadonlyMap<string, HTMLOptionElement>
}>

export type SelectDomStory = Readonly<{
  element: HTMLSelectElement
  refs: SelectStoryRefs
  args: SelectStoryArgs
  source: SelectStorySource
  update(args: SelectStoryArgs): void
}>

export const selectStoryDefaultArgs: SelectStoryArgs = Object.freeze({
  value: "output",
  disabled: false,
  title: "Output mode",
  options: Object.freeze([
    Object.freeze({key: "preview", label: "Preview", value: "preview", disabled: false}),
    Object.freeze({key: "output", label: "Output", value: "output", disabled: false}),
    Object.freeze({key: "capture", label: "Capture", value: "capture", disabled: false}),
  ]),
})

export const selectStoryCss = String.raw`
.ui-select-story {
  box-sizing: border-box;
  display: block;
  width: 220px;
  height: 32px;
  padding: 5px 10px;
  border: 1px solid rgb(22, 22, 22);
  border-radius: 4px;
  background: rgb(36, 36, 36);
  color: rgb(224, 224, 224);
  font-size: 12px;
}

.ui-select-story[disabled] {
  opacity: 0.5;
}
`

type OptionEntry = {
  element: HTMLOptionElement
  text: Text
}

export function createSelectStory(
  document: Document,
  initialArgs: SelectStoryArgs = selectStoryDefaultArgs,
): SelectDomStory {
  const select = document.createElement("select")
  select.className = "ui-select-story"
  const entries = new Map<string, OptionEntry>()
  const options = new Map<string, HTMLOptionElement>()
  let currentArgs = selectStoryDefaultArgs

  const update = (args: SelectStoryArgs): void => {
    const nextArgs = normalizeArgs(args)
    const retained = new Set(nextArgs.options.map(({key}) => key))
    for (const [key, entry] of entries) {
      if (retained.has(key)) continue
      entry.element.remove()
      entries.delete(key)
      options.delete(key)
    }

    const ordered: HTMLOptionElement[] = []
    for (const optionArgs of nextArgs.options) {
      let entry = entries.get(optionArgs.key)
      if (entry === undefined) {
        const element = document.createElement("option")
        const text = document.createTextNode("")
        element.setAttribute("data-option-key", optionArgs.key)
        element.appendChild(text)
        entry = {element, text}
        entries.set(optionArgs.key, entry)
        options.set(optionArgs.key, element)
      }
      if (entry.text.data !== optionArgs.label) entry.text.data = optionArgs.label
      if (entry.element.value !== optionArgs.value) entry.element.value = optionArgs.value
      if (entry.element.disabled !== optionArgs.disabled) entry.element.disabled = optionArgs.disabled
      ordered.push(entry.element)
    }
    select.replaceChildren(...ordered)
    if (select.value !== nextArgs.value) select.value = nextArgs.value
    if (select.disabled !== nextArgs.disabled) select.disabled = nextArgs.disabled
    if (select.title !== nextArgs.title) select.title = nextArgs.title
    currentArgs = Object.freeze({...nextArgs, value: select.value})
  }

  const refs: SelectStoryRefs = Object.freeze({select, options})
  const story: SelectDomStory = Object.freeze({
    element: select,
    refs,
    get args() { return currentArgs },
    get source() {
      return Object.freeze({
        html: serializeSelect(select),
        css: selectStoryCss,
        typescript: renderTypeScript(currentArgs),
      })
    },
    update,
  })
  update(initialArgs)
  return story
}

function normalizeArgs(args: SelectStoryArgs): SelectStoryArgs {
  assertString(args.value, "Select story value")
  assertBoolean(args.disabled, "Select story disabled")
  assertString(args.title, "Select story title")
  if (!Array.isArray(args.options)) throw new TypeError("Select story options must be an array")
  const keys = new Set<string>()
  const values = new Set<string>()
  const options = args.options.map((option) => {
    assertNonEmpty(option.key, "Select option key")
    if (keys.has(option.key)) throw new Error(`Select option key must be unique: ${option.key}`)
    keys.add(option.key)
    assertString(option.label, "Select option label")
    assertNonEmpty(option.value, "Select option value")
    if (values.has(option.value)) throw new Error(`Select option value must be unique: ${option.value}`)
    values.add(option.value)
    assertBoolean(option.disabled, "Select option disabled")
    return Object.freeze({...option})
  })
  return Object.freeze({
    value: args.value,
    disabled: args.disabled,
    title: args.title,
    options: Object.freeze(options),
  })
}

function assertNonEmpty(value: unknown, label: string): asserts value is string {
  assertString(value, label)
  if (value.length === 0) throw new TypeError(`${label} must not be empty`)
}

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string") throw new TypeError(`${label} must be a string`)
}

function assertBoolean(value: unknown, label: string): asserts value is boolean {
  if (typeof value !== "boolean") throw new TypeError(`${label} must be a boolean`)
}

function serializeSelect(select: HTMLSelectElement): string {
  const attributes = serializeAttributes(select)
  const options = [...select.options].map((option) => {
    return `  <option${serializeAttributes(option)}>${escapeText(option.textContent ?? "")}</option>`
  }).join("\n")
  return `<select${attributes}>\n${options}\n</select>`
}

function serializeAttributes(element: HTMLSelectElement | HTMLOptionElement): string {
  return element.getAttributeNames()
    .sort()
    .map((name) => {
      const value = element.getAttribute(name) ?? ""
      if ((name === "disabled" || name === "multiple" || name === "selected") && value === "") {
        return ` ${name}`
      }
      return ` ${name}="${escapeAttribute(value)}"`
    })
    .join("")
}

function renderTypeScript(args: SelectStoryArgs): string {
  return [
    'import {createDocument} from "@zavx0z/dom"',
    "",
    "const document = createDocument()",
    'const select = document.createElement("select")',
    'select.className = "ui-select-story"',
    `select.disabled = ${args.disabled}`,
    `select.title = ${JSON.stringify(args.title)}`,
    `const options = ${JSON.stringify(args.options, null, 2)}`,
    "for (const item of options) {",
    '  const option = document.createElement("option")',
    "  option.value = item.value",
    "  option.disabled = item.disabled",
    "  option.appendChild(document.createTextNode(item.label))",
    "  select.appendChild(option)",
    "}",
    `select.value = ${JSON.stringify(args.value)}`,
    "document.appendChild(select)",
  ].join("\n")
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
