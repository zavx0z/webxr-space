import type {
  Document,
  HTMLInputElement,
} from "@zavx0z/dom"

export type NativeControlStorySource = Readonly<{
  html: string
  css: string
  typescript: string
}>

export type NativeControlDomStory<Args> = Readonly<{
  element: HTMLInputElement
  args: Args
  source: NativeControlStorySource
  update(args: Args): void
}>

export type NumberInputStoryArgs = Readonly<{
  value: string
  disabled: boolean
  readOnly: boolean
  title: string
}>
export type NumberInputDomStory = NativeControlDomStory<NumberInputStoryArgs>

export type CheckboxStoryArgs = Readonly<{
  checked: boolean
  disabled: boolean
  title: string
}>
export type CheckboxDomStory = NativeControlDomStory<CheckboxStoryArgs>

export type SwitcherStoryArgs = Readonly<{
  checked: boolean
  disabled: boolean
  title: string
}>
export type SwitcherDomStory = NativeControlDomStory<SwitcherStoryArgs>

export const numberInputStoryDefaultArgs: NumberInputStoryArgs = Object.freeze({
  value: "42",
  disabled: false,
  readOnly: false,
  title: "Number input",
})

export const checkboxStoryDefaultArgs: CheckboxStoryArgs = Object.freeze({
  checked: true,
  disabled: false,
  title: "Checkbox",
})

export const switcherStoryDefaultArgs: SwitcherStoryArgs = Object.freeze({
  checked: true,
  disabled: false,
  title: "Switcher",
})

export const nativeControlStoriesCss = String.raw`
.ui-number-input-story {
  box-sizing: border-box;
  display: block;
  width: 120px;
  height: 28px;
  padding: 4px 8px;
  border: 1px solid rgb(22, 22, 22);
  border-radius: 4px;
  background: rgb(36, 36, 36);
  color: rgb(224, 224, 224);
  font-size: 12px;
}

.ui-number-input-story[readonly] {
  background: rgb(48, 48, 48);
  color: rgb(176, 176, 176);
}

.ui-checkbox-story {
  box-sizing: border-box;
  display: block;
  width: 18px;
  height: 18px;
  padding: 0;
  border: 1px solid rgb(22, 22, 22);
  border-radius: 2px;
  background: rgb(36, 36, 36);
  color: rgb(126, 220, 236);
}

.ui-switcher-story {
  box-sizing: border-box;
  display: block;
  width: 36px;
  height: 20px;
  padding: 0;
  border: 1px solid rgb(22, 22, 22);
  border-radius: 10px;
  background: rgb(48, 48, 48);
  color: rgb(224, 224, 224);
}

.ui-switcher-story[aria-checked="true"] {
  background: rgb(45, 104, 128);
  color: rgb(240, 240, 240);
}

.ui-number-input-story[disabled],
.ui-checkbox-story[disabled],
.ui-switcher-story[disabled] {
  opacity: 0.5;
}
`

export function createNumberInputStory(
  document: Document,
  initialArgs: NumberInputStoryArgs = numberInputStoryDefaultArgs,
): NumberInputDomStory {
  const input = document.createElement("input")
  input.className = "ui-number-input-story"
  let currentArgs = numberInputStoryDefaultArgs

  const update = (args: NumberInputStoryArgs): void => {
    const nextArgs = normalizeNumberArgs(args)
    syncType(input, "number")
    if (input.value !== nextArgs.value) input.value = nextArgs.value
    if (input.disabled !== nextArgs.disabled) input.disabled = nextArgs.disabled
    if (input.readOnly !== nextArgs.readOnly) input.readOnly = nextArgs.readOnly
    syncTitle(input, nextArgs.title)
    currentArgs = nextArgs
  }
  const story: NumberInputDomStory = Object.freeze({
    element: input,
    get args() { return currentArgs },
    get source() { return numberSource(input) },
    update,
  })
  update(initialArgs)
  return story
}

export function createCheckboxStory(
  document: Document,
  initialArgs: CheckboxStoryArgs = checkboxStoryDefaultArgs,
): CheckboxDomStory {
  const input = document.createElement("input")
  input.className = "ui-checkbox-story"
  let currentArgs = checkboxStoryDefaultArgs

  const update = (args: CheckboxStoryArgs): void => {
    const nextArgs = normalizeCheckboxArgs(args)
    syncType(input, "checkbox")
    if (input.checked !== nextArgs.checked) input.checked = nextArgs.checked
    if (input.disabled !== nextArgs.disabled) input.disabled = nextArgs.disabled
    syncTitle(input, nextArgs.title)
    currentArgs = nextArgs
  }
  const story: CheckboxDomStory = Object.freeze({
    element: input,
    get args() { return currentArgs },
    get source() { return checkboxSource(input) },
    update,
  })
  update(initialArgs)
  return story
}

export function createSwitcherStory(
  document: Document,
  initialArgs: SwitcherStoryArgs = switcherStoryDefaultArgs,
): SwitcherDomStory {
  const input = document.createElement("input")
  input.className = "ui-switcher-story"
  input.setAttribute("role", "switch")
  const syncAriaChecked = (): void => {
    const value = String(input.checked)
    if (input.getAttribute("aria-checked") !== value) input.setAttribute("aria-checked", value)
  }
  input.addEventListener("change", syncAriaChecked)
  let currentArgs = switcherStoryDefaultArgs

  const update = (args: SwitcherStoryArgs): void => {
    const nextArgs = normalizeSwitcherArgs(args)
    syncType(input, "checkbox")
    if (input.checked !== nextArgs.checked) input.checked = nextArgs.checked
    if (input.disabled !== nextArgs.disabled) input.disabled = nextArgs.disabled
    syncTitle(input, nextArgs.title)
    syncAriaChecked()
    currentArgs = nextArgs
  }
  const story: SwitcherDomStory = Object.freeze({
    element: input,
    get args() { return currentArgs },
    get source() { return switcherSource(input) },
    update,
  })
  update(initialArgs)
  return story
}

function syncType(input: HTMLInputElement, type: "number" | "checkbox"): void {
  if (input.getAttribute("type") !== type) input.type = type
}

function syncTitle(input: HTMLInputElement, title: string): void {
  if (input.getAttribute("title") !== title) input.title = title
}

function normalizeNumberArgs(args: NumberInputStoryArgs): NumberInputStoryArgs {
  assertString(args.value, "NumberInput story value")
  assertBoolean(args.disabled, "NumberInput story disabled")
  assertBoolean(args.readOnly, "NumberInput story readOnly")
  assertString(args.title, "NumberInput story title")
  return Object.freeze({
    value: args.value,
    disabled: args.disabled,
    readOnly: args.readOnly,
    title: args.title,
  })
}

function normalizeCheckboxArgs(args: CheckboxStoryArgs): CheckboxStoryArgs {
  assertBoolean(args.checked, "Checkbox story checked")
  assertBoolean(args.disabled, "Checkbox story disabled")
  assertString(args.title, "Checkbox story title")
  return Object.freeze({checked: args.checked, disabled: args.disabled, title: args.title})
}

function normalizeSwitcherArgs(args: SwitcherStoryArgs): SwitcherStoryArgs {
  assertBoolean(args.checked, "Switcher story checked")
  assertBoolean(args.disabled, "Switcher story disabled")
  assertString(args.title, "Switcher story title")
  return Object.freeze({checked: args.checked, disabled: args.disabled, title: args.title})
}

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string") throw new TypeError(`${label} must be a string`)
}

function assertBoolean(value: unknown, label: string): asserts value is boolean {
  if (typeof value !== "boolean") throw new TypeError(`${label} must be a boolean`)
}

function numberSource(input: HTMLInputElement): NativeControlStorySource {
  return sourceFor(input, [
    'const input = document.createElement("input")',
    'input.className = "ui-number-input-story"',
    'input.type = "number"',
    `input.value = ${JSON.stringify(input.value)}`,
    `input.disabled = ${input.disabled}`,
    `input.readOnly = ${input.readOnly}`,
    `input.title = ${JSON.stringify(input.title)}`,
  ])
}

function checkboxSource(input: HTMLInputElement): NativeControlStorySource {
  return sourceFor(input, [
    'const input = document.createElement("input")',
    'input.className = "ui-checkbox-story"',
    'input.type = "checkbox"',
    `input.checked = ${input.checked}`,
    `input.disabled = ${input.disabled}`,
    `input.title = ${JSON.stringify(input.title)}`,
  ])
}

function switcherSource(input: HTMLInputElement): NativeControlStorySource {
  return sourceFor(input, [
    'const input = document.createElement("input")',
    'input.className = "ui-switcher-story"',
    'input.type = "checkbox"',
    'input.setAttribute("role", "switch")',
    `input.checked = ${input.checked}`,
    `input.disabled = ${input.disabled}`,
    `input.title = ${JSON.stringify(input.title)}`,
    'const syncAriaChecked = () => input.setAttribute("aria-checked", String(input.checked))',
    'input.addEventListener("change", syncAriaChecked)',
    "syncAriaChecked()",
  ])
}

function sourceFor(
  input: HTMLInputElement,
  statements: readonly string[],
): NativeControlStorySource {
  return Object.freeze({
    html: serializeInput(input),
    css: nativeControlStoriesCss,
    typescript: [
      'import {createDocument} from "@zavx0z/dom"',
      "",
      "const document = createDocument()",
      ...statements,
      "document.appendChild(input)",
    ].join("\n"),
  })
}

function serializeInput(input: HTMLInputElement): string {
  const booleanAttributes = new Set(["disabled", "readonly"])
  const attributes = input.getAttributeNames()
    .sort()
    .map((name) => {
      const value = input.getAttribute(name) ?? ""
      if (booleanAttributes.has(name) && value === "") return ` ${name}`
      return ` ${name}="${escapeAttribute(value)}"`
    })
    .join("")
  return `<input${attributes}>`
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
