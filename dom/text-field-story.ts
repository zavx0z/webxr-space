import type {
  Document,
  HTMLInputElement,
} from "@zavx0z/dom"

export type TextFieldStoryType = "text" | "search"

export type TextFieldStoryArgs = Readonly<{
  value: string
  placeholder: string
  disabled: boolean
  readOnly: boolean
  type: TextFieldStoryType
  title: string
}>

export type TextFieldStorySource = Readonly<{
  html: string
  css: string
  typescript: string
}>

export type TextFieldDomStory = Readonly<{
  element: HTMLInputElement
  args: TextFieldStoryArgs
  source: TextFieldStorySource
  update(args: TextFieldStoryArgs): void
}>

export const textFieldStoryDefaultArgs: TextFieldStoryArgs = Object.freeze({
  value: "Output",
  placeholder: "Enter output",
  disabled: false,
  readOnly: false,
  type: "text",
  title: "Output",
})

export const textFieldStoryCss = String.raw`
.ui-text-field-story {
  box-sizing: border-box;
  display: block;
  width: 180px;
  height: 28px;
  padding: 4px 8px;
  border: 1px solid rgb(22, 22, 22);
  border-radius: 4px;
  background: rgb(36, 36, 36);
  color: rgb(224, 224, 224);
  font-size: 12px;
}

.ui-text-field-story[type="search"] {
  width: 200px;
  background: rgb(32, 32, 32);
}

.ui-text-field-story[readonly] {
  background: rgb(48, 48, 48);
  color: rgb(176, 176, 176);
}

.ui-text-field-story[disabled] {
  background: rgb(48, 48, 48);
  color: rgb(128, 128, 128);
  opacity: 0.5;
}
`

export function createTextFieldStory(
  document: Document,
  initialArgs: TextFieldStoryArgs = textFieldStoryDefaultArgs,
): TextFieldDomStory {
  const input = document.createElement("input")
  input.className = "ui-text-field-story"
  let currentArgs = textFieldStoryDefaultArgs

  const update = (args: TextFieldStoryArgs): void => {
    const nextArgs = normalizeTextFieldStoryArgs(args)
    applyTextFieldArgs(input, nextArgs)
    currentArgs = nextArgs
  }

  const story: TextFieldDomStory = Object.freeze({
    element: input,
    get args() {
      return currentArgs
    },
    get source() {
      return createTextFieldSource(input, currentArgs)
    },
    update,
  })
  update(initialArgs)
  return story
}

function applyTextFieldArgs(
  input: HTMLInputElement,
  args: TextFieldStoryArgs,
): void {
  if (input.getAttribute("type") !== args.type) input.type = args.type
  if (input.value !== args.value) input.value = args.value
  if (input.getAttribute("placeholder") !== args.placeholder) input.placeholder = args.placeholder
  if (input.disabled !== args.disabled) input.disabled = args.disabled
  if (input.readOnly !== args.readOnly) input.readOnly = args.readOnly
  if (input.getAttribute("title") !== args.title) input.title = args.title
}

function normalizeTextFieldStoryArgs(args: TextFieldStoryArgs): TextFieldStoryArgs {
  if (typeof args.value !== "string") throw new TypeError("TextField story value must be a string")
  if (typeof args.placeholder !== "string") {
    throw new TypeError("TextField story placeholder must be a string")
  }
  if (typeof args.disabled !== "boolean") {
    throw new TypeError("TextField story disabled must be a boolean")
  }
  if (typeof args.readOnly !== "boolean") {
    throw new TypeError("TextField story readOnly must be a boolean")
  }
  if (args.type !== "text" && args.type !== "search") {
    throw new Error(`Unknown TextField story type: ${String(args.type)}`)
  }
  if (typeof args.title !== "string") throw new TypeError("TextField story title must be a string")
  return Object.freeze({
    value: args.value,
    placeholder: args.placeholder,
    disabled: args.disabled,
    readOnly: args.readOnly,
    type: args.type,
    title: args.title,
  })
}

function createTextFieldSource(
  input: HTMLInputElement,
  args: TextFieldStoryArgs,
): TextFieldStorySource {
  return Object.freeze({
    html: serializeInput(input),
    css: textFieldStoryCss,
    typescript: renderTextFieldTypeScript(args),
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

function renderTextFieldTypeScript(args: TextFieldStoryArgs): string {
  return [
    'import {createDocument} from "@zavx0z/dom"',
    "",
    "const document = createDocument()",
    'const input = document.createElement("input")',
    'input.className = "ui-text-field-story"',
    `input.type = ${JSON.stringify(args.type)}`,
    `input.value = ${JSON.stringify(args.value)}`,
    `input.placeholder = ${JSON.stringify(args.placeholder)}`,
    `input.disabled = ${args.disabled}`,
    `input.readOnly = ${args.readOnly}`,
    `input.title = ${JSON.stringify(args.title)}`,
    "document.appendChild(input)",
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
