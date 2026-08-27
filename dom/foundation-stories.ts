import type {
  Document,
  HTMLDivElement,
  HTMLElement,
  HTMLSpanElement,
  Text,
} from "@zavx0z/dom"

export type FoundationStorySource = Readonly<{
  html: string
  css: string
  typescript: string
}>

export type FoundationDomStory<ElementType extends HTMLElement, Args> = Readonly<{
  element: ElementType
  args: Args
  source: FoundationStorySource
  update(args: Args): void
}>

export type PaneStoryVariant = "glass" | "outlined" | "filled"
export type PaneStoryArgs = Readonly<{
  label: string
  variant: PaneStoryVariant
  title: string
}>
export type PaneDomStory = FoundationDomStory<HTMLDivElement, PaneStoryArgs>

export type BadgeStoryTone = "neutral" | "primary" | "success" | "warning" | "error"
export type BadgeStoryArgs = Readonly<{
  label: string
  tone: BadgeStoryTone
  title: string
}>
export type BadgeDomStory = FoundationDomStory<HTMLSpanElement, BadgeStoryArgs>

export type TypographyStoryVariant = "title" | "subtitle" | "body" | "caption"
export type TypographyStoryArgs = Readonly<{
  text: string
  variant: TypographyStoryVariant
  title: string
}>
export type TypographyDomStory = FoundationDomStory<HTMLSpanElement, TypographyStoryArgs>

export type DividerStoryVariant = "full-width" | "inset" | "middle"
export type DividerStoryArgs = Readonly<{
  variant: DividerStoryVariant
  title: string
}>
export type DividerDomStory = FoundationDomStory<HTMLElement, DividerStoryArgs>

export const paneStoryDefaultArgs: PaneStoryArgs = Object.freeze({
  label: "Panel content",
  variant: "filled",
  title: "Filled pane",
})

export const badgeStoryDefaultArgs: BadgeStoryArgs = Object.freeze({
  label: "Ready",
  tone: "neutral",
  title: "Ready",
})

export const typographyStoryDefaultArgs: TypographyStoryArgs = Object.freeze({
  text: "Typography",
  variant: "body",
  title: "Body text",
})

export const dividerStoryDefaultArgs: DividerStoryArgs = Object.freeze({
  variant: "full-width",
  title: "Divider",
})

export const foundationStoriesCss = String.raw`
.ui-pane-story {
  box-sizing: border-box;
  display: block;
  width: 260px;
  height: 120px;
  padding: 16px;
  border: 1px solid rgb(22, 22, 22);
  border-radius: 6px;
  background: rgb(48, 48, 48);
  color: rgb(224, 224, 224);
  font-size: 12px;
}

.ui-pane-story--filled {
  background: rgb(61, 61, 61);
}

.ui-pane-story--outlined {
  border-color: rgb(92, 92, 92);
  background: transparent;
}

.ui-pane-story--glass {
  border-color: rgb(72, 72, 72);
  background: rgba(48, 48, 48, 0.82);
}

.ui-badge-story {
  box-sizing: border-box;
  display: inline;
  width: 72px;
  height: 20px;
  padding: 2px 8px;
  border: 1px solid rgb(72, 72, 72);
  border-radius: 4px;
  background: rgb(61, 61, 61);
  color: rgb(224, 224, 224);
  font-size: 11px;
}

.ui-badge-story--neutral {
  background: rgb(61, 61, 61);
}

.ui-badge-story--primary {
  background: rgb(45, 104, 128);
}

.ui-badge-story--success {
  background: rgb(48, 112, 76);
}

.ui-badge-story--warning {
  background: rgb(132, 91, 42);
}

.ui-badge-story--error {
  background: rgb(132, 56, 56);
}

.ui-typography-story {
  box-sizing: border-box;
  display: inline;
  width: 240px;
  height: 24px;
  color: rgb(224, 224, 224);
  font-size: 12px;
}

.ui-typography-story--title {
  color: rgb(126, 220, 236);
  font-size: 14px;
}

.ui-typography-story--subtitle {
  font-size: 13px;
}

.ui-typography-story--body {
  font-size: 12px;
}

.ui-typography-story--caption {
  color: rgb(160, 160, 160);
  font-size: 11px;
}

.ui-divider-story {
  box-sizing: border-box;
  display: block;
  height: 1px;
  margin: 0;
  padding: 0;
  border: 0;
  background: rgb(92, 92, 92);
}

.ui-divider-story--full-width {
  width: 320px;
  margin-left: 0;
  margin-right: 0;
}

.ui-divider-story--inset {
  width: 248px;
  margin-left: 72px;
  margin-right: 0;
}

.ui-divider-story--middle {
  width: 288px;
  margin-left: 16px;
  margin-right: 16px;
}
`

export function createPaneStory(
  document: Document,
  initialArgs: PaneStoryArgs = paneStoryDefaultArgs,
): PaneDomStory {
  const element = document.createElement("div")
  const text = document.createTextNode("")
  element.appendChild(text)
  let currentArgs = paneStoryDefaultArgs

  const update = (args: PaneStoryArgs): void => {
    const nextArgs = normalizePaneArgs(args)
    syncTextElement(element, text, `ui-pane-story ui-pane-story--${nextArgs.variant}`, nextArgs.title, nextArgs.label)
    currentArgs = nextArgs
  }
  const story: PaneDomStory = Object.freeze({
    element,
    get args() { return currentArgs },
    get source() {
      return sourceFor(element, paneTypeScript(currentArgs))
    },
    update,
  })
  update(initialArgs)
  return story
}

export function createBadgeStory(
  document: Document,
  initialArgs: BadgeStoryArgs = badgeStoryDefaultArgs,
): BadgeDomStory {
  const element = document.createElement("span")
  const text = document.createTextNode("")
  element.appendChild(text)
  let currentArgs = badgeStoryDefaultArgs

  const update = (args: BadgeStoryArgs): void => {
    const nextArgs = normalizeBadgeArgs(args)
    syncTextElement(element, text, `ui-badge-story ui-badge-story--${nextArgs.tone}`, nextArgs.title, nextArgs.label)
    currentArgs = nextArgs
  }
  const story: BadgeDomStory = Object.freeze({
    element,
    get args() { return currentArgs },
    get source() {
      return sourceFor(element, badgeTypeScript(currentArgs))
    },
    update,
  })
  update(initialArgs)
  return story
}

export function createTypographyStory(
  document: Document,
  initialArgs: TypographyStoryArgs = typographyStoryDefaultArgs,
): TypographyDomStory {
  const element = document.createElement("span")
  const text = document.createTextNode("")
  element.appendChild(text)
  let currentArgs = typographyStoryDefaultArgs

  const update = (args: TypographyStoryArgs): void => {
    const nextArgs = normalizeTypographyArgs(args)
    syncTextElement(
      element,
      text,
      `ui-typography-story ui-typography-story--${nextArgs.variant}`,
      nextArgs.title,
      nextArgs.text,
    )
    currentArgs = nextArgs
  }
  const story: TypographyDomStory = Object.freeze({
    element,
    get args() { return currentArgs },
    get source() {
      return sourceFor(element, typographyTypeScript(currentArgs))
    },
    update,
  })
  update(initialArgs)
  return story
}

export function createDividerStory(
  document: Document,
  initialArgs: DividerStoryArgs = dividerStoryDefaultArgs,
): DividerDomStory {
  const element = document.createElement("hr")
  let currentArgs = dividerStoryDefaultArgs

  const update = (args: DividerStoryArgs): void => {
    const nextArgs = normalizeDividerArgs(args)
    const className = `ui-divider-story ui-divider-story--${nextArgs.variant}`
    if (element.className !== className) element.className = className
    syncTitle(element, nextArgs.title)
    currentArgs = nextArgs
  }
  const story: DividerDomStory = Object.freeze({
    element,
    get args() { return currentArgs },
    get source() {
      return sourceFor(element, dividerTypeScript(currentArgs))
    },
    update,
  })
  update(initialArgs)
  return story
}

function syncTextElement(
  element: HTMLElement,
  text: Text,
  className: string,
  title: string,
  value: string,
): void {
  if (element.className !== className) element.className = className
  syncTitle(element, title)
  if (text.data !== value) text.data = value
}

function syncTitle(element: HTMLElement, title: string): void {
  if (element.getAttribute("title") !== title) element.title = title
}

function normalizePaneArgs(args: PaneStoryArgs): PaneStoryArgs {
  assertString(args.label, "Pane story label")
  if (args.variant !== "glass" && args.variant !== "outlined" && args.variant !== "filled") {
    throw new Error(`Unknown Pane story variant: ${String(args.variant)}`)
  }
  assertString(args.title, "Pane story title")
  return Object.freeze({label: args.label, variant: args.variant, title: args.title})
}

function normalizeBadgeArgs(args: BadgeStoryArgs): BadgeStoryArgs {
  assertString(args.label, "Badge story label")
  if (!(["neutral", "primary", "success", "warning", "error"] as const).includes(args.tone)) {
    throw new Error(`Unknown Badge story tone: ${String(args.tone)}`)
  }
  assertString(args.title, "Badge story title")
  return Object.freeze({label: args.label, tone: args.tone, title: args.title})
}

function normalizeTypographyArgs(args: TypographyStoryArgs): TypographyStoryArgs {
  assertString(args.text, "Typography story text")
  if (!(["title", "subtitle", "body", "caption"] as const).includes(args.variant)) {
    throw new Error(`Unknown Typography story variant: ${String(args.variant)}`)
  }
  assertString(args.title, "Typography story title")
  return Object.freeze({text: args.text, variant: args.variant, title: args.title})
}

function normalizeDividerArgs(args: DividerStoryArgs): DividerStoryArgs {
  if (!(["full-width", "inset", "middle"] as const).includes(args.variant)) {
    throw new Error(`Unknown Divider story variant: ${String(args.variant)}`)
  }
  assertString(args.title, "Divider story title")
  return Object.freeze({variant: args.variant, title: args.title})
}

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string") throw new TypeError(`${label} must be a string`)
}

function sourceFor(element: HTMLElement, typescript: string): FoundationStorySource {
  return Object.freeze({
    html: serializeElement(element),
    css: foundationStoriesCss,
    typescript,
  })
}

function serializeElement(element: HTMLElement): string {
  const attributes = element.getAttributeNames()
    .sort()
    .map((name) => ` ${name}="${escapeAttribute(element.getAttribute(name) ?? "")}"`)
    .join("")
  if (element.localName === "hr") return `<hr${attributes}>`
  return `<${element.localName}${attributes}>${escapeText(element.textContent)}</${element.localName}>`
}

function paneTypeScript(args: PaneStoryArgs): string {
  return textElementTypeScript("pane", "div", `ui-pane-story ui-pane-story--${args.variant}`, args.title, args.label)
}

function badgeTypeScript(args: BadgeStoryArgs): string {
  return textElementTypeScript("badge", "span", `ui-badge-story ui-badge-story--${args.tone}`, args.title, args.label)
}

function typographyTypeScript(args: TypographyStoryArgs): string {
  return textElementTypeScript(
    "typography",
    "span",
    `ui-typography-story ui-typography-story--${args.variant}`,
    args.title,
    args.text,
  )
}

function dividerTypeScript(args: DividerStoryArgs): string {
  return [
    'import {createDocument} from "@zavx0z/dom"',
    "",
    "const document = createDocument()",
    'const divider = document.createElement("hr")',
    `divider.className = ${JSON.stringify(`ui-divider-story ui-divider-story--${args.variant}`)}`,
    `divider.title = ${JSON.stringify(args.title)}`,
    "document.appendChild(divider)",
  ].join("\n")
}

function textElementTypeScript(
  variable: string,
  localName: "div" | "span",
  className: string,
  title: string,
  text: string,
): string {
  return [
    'import {createDocument} from "@zavx0z/dom"',
    "",
    "const document = createDocument()",
    `const ${variable} = document.createElement(${JSON.stringify(localName)})`,
    `${variable}.className = ${JSON.stringify(className)}`,
    `${variable}.title = ${JSON.stringify(title)}`,
    `${variable}.appendChild(document.createTextNode(${JSON.stringify(text)}))`,
    `document.appendChild(${variable})`,
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
