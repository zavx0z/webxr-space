import type {
  Document,
  HTMLButtonElement,
  Text,
} from "@zavx0z/dom"

export type ButtonStoryVariant = "text" | "outlined" | "contained"
export type ButtonStorySize = "small" | "medium" | "large"
export type ButtonStoryTone = "neutral" | "primary" | "success" | "warning" | "error"

export type ButtonStoryArgs = Readonly<{
  label: string
  variant: ButtonStoryVariant
  disabled: boolean
  title: string
  size?: ButtonStorySize
  tone?: ButtonStoryTone
}>

export type ButtonStorySource = Readonly<{
  html: string
  css: string
  typescript: string
}>

export type ButtonDomStory = Readonly<{
  element: HTMLButtonElement
  args: ButtonStoryArgs
  source: ButtonStorySource
  update(args: ButtonStoryArgs): void
}>

export const buttonStoryDefaultArgs: ButtonStoryArgs = Object.freeze({
  label: "Output",
  variant: "contained",
  disabled: false,
  title: "Output",
  size: "medium",
  tone: "neutral",
})

export const buttonStoryCss = String.raw`
.ui-button-story {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 92px;
  height: 28px;
  padding: 4px 10px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: rgb(224, 224, 224);
  font-size: 12px;
  cursor: pointer;
}

.ui-button-story--text {
  border-color: transparent;
  background: transparent;
}

.ui-button-story--outlined {
  border-color: rgb(92, 92, 92);
  background: transparent;
}

.ui-button-story--contained {
  border-color: rgb(22, 22, 22);
  background: rgb(71, 71, 71);
}

.ui-button-story--small {
  width: 76px;
  height: 24px;
  padding: 3px 8px;
  font-size: 11px;
}

.ui-button-story--medium {
  width: 92px;
  height: 28px;
  padding: 4px 10px;
  font-size: 12px;
}

.ui-button-story--large {
  width: 112px;
  height: 34px;
  padding: 6px 14px;
  font-size: 13px;
}

.ui-button-story--primary.ui-button-story--contained { background: rgb(45, 104, 128); }
.ui-button-story--success.ui-button-story--contained { background: rgb(48, 112, 76); }
.ui-button-story--warning.ui-button-story--contained { background: rgb(132, 91, 42); }
.ui-button-story--error.ui-button-story--contained { background: rgb(132, 56, 56); }
.ui-button-story--neutral.ui-button-story--contained { background: rgb(71, 71, 71); }

.ui-button-story[disabled] {
  opacity: 0.5;
  cursor: default;
}
`

export function createButtonStory(
  document: Document,
  initialArgs: ButtonStoryArgs = buttonStoryDefaultArgs,
): ButtonDomStory {
  const button = document.createElement("button")
  const text = document.createTextNode("")
  button.setAttribute("type", "button")
  button.appendChild(text)
  let currentArgs = buttonStoryDefaultArgs

  const update = (args: ButtonStoryArgs): void => {
    const nextArgs = normalizeButtonStoryArgs(args)
    applyButtonArgs(button, text, nextArgs)
    currentArgs = nextArgs
  }

  const story: ButtonDomStory = Object.freeze({
    element: button,
    get args() {
      return currentArgs
    },
    get source() {
      return createButtonSource(button, currentArgs)
    },
    update,
  })
  update(initialArgs)
  return story
}

function applyButtonArgs(
  button: HTMLButtonElement,
  text: Text,
  args: ButtonStoryArgs,
): void {
  const className = `ui-button-story ui-button-story--${args.variant} ui-button-story--${args.size} ui-button-story--${args.tone}`
  if (button.className !== className) button.className = className
  if (button.disabled !== args.disabled) button.disabled = args.disabled
  if (button.title !== args.title) button.title = args.title
  if (text.data !== args.label) text.data = args.label
}

function normalizeButtonStoryArgs(args: ButtonStoryArgs): ButtonStoryArgs {
  if (typeof args.label !== "string") throw new TypeError("Button story label must be a string")
  if (args.variant !== "text" && args.variant !== "outlined" && args.variant !== "contained") {
    throw new Error(`Unknown Button story variant: ${String(args.variant)}`)
  }
  if (typeof args.disabled !== "boolean") throw new TypeError("Button story disabled must be a boolean")
  if (typeof args.title !== "string") throw new TypeError("Button story title must be a string")
  const size = args.size ?? "medium"
  if (size !== "small" && size !== "medium" && size !== "large") {
    throw new Error(`Unknown Button story size: ${String(size)}`)
  }
  const tone = args.tone ?? "neutral"
  if (!( ["neutral", "primary", "success", "warning", "error"] as const).includes(tone)) {
    throw new Error(`Unknown Button story tone: ${String(tone)}`)
  }
  return Object.freeze({
    label: args.label,
    variant: args.variant,
    disabled: args.disabled,
    title: args.title,
    size,
    tone,
  })
}

function createButtonSource(
  button: HTMLButtonElement,
  args: ButtonStoryArgs,
): ButtonStorySource {
  return Object.freeze({
    html: serializeButton(button),
    css: buttonStoryCss,
    typescript: renderButtonTypeScript(args),
  })
}

function serializeButton(button: HTMLButtonElement): string {
  const attributes = button.getAttributeNames()
    .sort()
    .map((name) => {
      const value = button.getAttribute(name) ?? ""
      if (name === "disabled" && value === "") return " disabled"
      return ` ${name}="${escapeAttribute(value)}"`
    })
    .join("")
  return `<button${attributes}>${escapeText(button.textContent)}</button>`
}

function renderButtonTypeScript(args: ButtonStoryArgs): string {
  const className = `ui-button-story ui-button-story--${args.variant} ui-button-story--${args.size ?? "medium"} ui-button-story--${args.tone ?? "neutral"}`
  return [
    'import {createDocument} from "@zavx0z/dom"',
    "",
    "const document = createDocument()",
    'const button = document.createElement("button")',
    'button.setAttribute("type", "button")',
    `button.className = ${JSON.stringify(className)}`,
    `button.disabled = ${args.disabled}`,
    `button.title = ${JSON.stringify(args.title)}`,
    `button.appendChild(document.createTextNode(${JSON.stringify(args.label)}))`,
    "document.appendChild(button)",
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
