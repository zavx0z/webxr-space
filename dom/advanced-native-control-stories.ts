import type {
  Document,
  HTMLInputElement,
} from "@zavx0z/dom"

export type AdvancedNativeControlStorySource = Readonly<{
  html: string
  css: string
  typescript: string
}>

export type AdvancedNativeControlDomStory<Args> = Readonly<{
  element: HTMLInputElement
  args: Args
  source: AdvancedNativeControlStorySource
  update(args: Args): void
}>

export type SliderControlStoryArgs = Readonly<{
  min: number
  max: number
  step: number
  value: number
  disabled: boolean
  title: string
}>
export type SliderControlDomStory = AdvancedNativeControlDomStory<SliderControlStoryArgs>

export type ProgressCheckboxStoryArgs = Readonly<{
  checked: boolean
  indeterminate: boolean
  disabled: boolean
  title: string
}>
export type ProgressCheckboxDomStory = AdvancedNativeControlDomStory<ProgressCheckboxStoryArgs>

export const sliderControlStoryDefaultArgs: SliderControlStoryArgs = Object.freeze({
  min: 0,
  max: 100,
  step: 1,
  value: 50,
  disabled: false,
  title: "Slider control",
})

export const progressCheckboxStoryDefaultArgs: ProgressCheckboxStoryArgs = Object.freeze({
  checked: true,
  indeterminate: true,
  disabled: false,
  title: "Progress checkbox",
})

export const advancedNativeControlStoriesCss = String.raw`
.ui-slider-control-story {
  box-sizing: border-box;
  display: block;
  width: 200px;
  height: 30px;
  padding: 4px 10px;
  border: 2px solid rgb(22, 22, 22);
  border-radius: 4px;
  background: rgb(36, 36, 36);
  color: rgb(224, 224, 224);
}

.ui-slider-control-story[disabled] {
  opacity: 0.5;
}

.ui-progress-checkbox-story {
  box-sizing: border-box;
  display: block;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 1px solid rgb(22, 22, 22);
  border-radius: 3px;
  background: rgb(36, 36, 36);
  color: rgb(126, 220, 236);
}

.ui-progress-checkbox-story[aria-checked="mixed"] {
  background: rgb(132, 91, 42);
  color: rgb(240, 188, 96);
}

.ui-progress-checkbox-story[aria-checked="true"] {
  background: rgb(45, 104, 128);
  color: rgb(240, 240, 240);
}

.ui-progress-checkbox-story[disabled] {
  opacity: 0.5;
}
`

export function createSliderControlStory(
  document: Document,
  initialArgs: SliderControlStoryArgs = sliderControlStoryDefaultArgs,
): SliderControlDomStory {
  const input = document.createElement("input")
  input.className = "ui-slider-control-story"
  let currentArgs = sliderControlStoryDefaultArgs

  const update = (args: SliderControlStoryArgs): void => {
    const nextArgs = normalizeSliderArgs(args)
    syncType(input, "range")
    syncAttribute(input, "min", String(nextArgs.min))
    syncAttribute(input, "max", String(nextArgs.max))
    syncAttribute(input, "step", String(nextArgs.step))
    if (input.valueAsNumber !== nextArgs.value) input.valueAsNumber = nextArgs.value
    if (input.disabled !== nextArgs.disabled) input.disabled = nextArgs.disabled
    syncTitle(input, nextArgs.title)
    currentArgs = Object.freeze({...nextArgs, value: input.valueAsNumber})
  }
  const story: SliderControlDomStory = Object.freeze({
    element: input,
    get args() { return currentArgs },
    get source() { return sliderSource(input) },
    update,
  })
  update(initialArgs)
  return story
}

export function createProgressCheckboxStory(
  document: Document,
  initialArgs: ProgressCheckboxStoryArgs = progressCheckboxStoryDefaultArgs,
): ProgressCheckboxDomStory {
  const input = document.createElement("input")
  input.className = "ui-progress-checkbox-story"
  const syncAriaChecked = (): void => {
    const value = input.indeterminate ? "mixed" : String(input.checked)
    if (input.getAttribute("aria-checked") !== value) input.setAttribute("aria-checked", value)
  }
  input.addEventListener("change", syncAriaChecked)
  let currentArgs = progressCheckboxStoryDefaultArgs

  const update = (args: ProgressCheckboxStoryArgs): void => {
    const nextArgs = normalizeProgressArgs(args)
    syncType(input, "checkbox")
    if (input.checked !== nextArgs.checked) input.checked = nextArgs.checked
    if (input.indeterminate !== nextArgs.indeterminate) input.indeterminate = nextArgs.indeterminate
    if (input.disabled !== nextArgs.disabled) input.disabled = nextArgs.disabled
    syncTitle(input, nextArgs.title)
    syncAriaChecked()
    currentArgs = nextArgs
  }
  const story: ProgressCheckboxDomStory = Object.freeze({
    element: input,
    get args() { return currentArgs },
    get source() { return progressSource(input) },
    update,
  })
  update(initialArgs)
  return story
}

function normalizeSliderArgs(args: SliderControlStoryArgs): SliderControlStoryArgs {
  assertFinite(args.min, "SliderControl story min")
  assertFinite(args.max, "SliderControl story max")
  if (args.max < args.min) throw new RangeError("SliderControl story max must be greater than or equal to min")
  assertFinite(args.step, "SliderControl story step")
  if (args.step <= 0) throw new RangeError("SliderControl story step must be greater than zero")
  assertFinite(args.value, "SliderControl story value")
  assertBoolean(args.disabled, "SliderControl story disabled")
  assertString(args.title, "SliderControl story title")
  return Object.freeze({...args})
}

function normalizeProgressArgs(args: ProgressCheckboxStoryArgs): ProgressCheckboxStoryArgs {
  assertBoolean(args.checked, "ProgressCheckbox story checked")
  assertBoolean(args.indeterminate, "ProgressCheckbox story indeterminate")
  assertBoolean(args.disabled, "ProgressCheckbox story disabled")
  assertString(args.title, "ProgressCheckbox story title")
  return Object.freeze({...args})
}

function assertFinite(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be finite`)
  }
}

function assertBoolean(value: unknown, label: string): asserts value is boolean {
  if (typeof value !== "boolean") throw new TypeError(`${label} must be a boolean`)
}

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string") throw new TypeError(`${label} must be a string`)
}

function syncType(input: HTMLInputElement, type: "range" | "checkbox"): void {
  if (input.getAttribute("type") !== type) input.type = type
}

function syncAttribute(input: HTMLInputElement, name: string, value: string): void {
  if (input.getAttribute(name) !== value) input.setAttribute(name, value)
}

function syncTitle(input: HTMLInputElement, title: string): void {
  if (input.getAttribute("title") !== title) input.title = title
}

function sliderSource(input: HTMLInputElement): AdvancedNativeControlStorySource {
  return sourceFor(input, [
    'const input = document.createElement("input")',
    'input.className = "ui-slider-control-story"',
    'input.type = "range"',
    `input.min = ${JSON.stringify(input.min)}`,
    `input.max = ${JSON.stringify(input.max)}`,
    `input.step = ${JSON.stringify(input.step)}`,
    `input.valueAsNumber = ${input.valueAsNumber}`,
    `input.disabled = ${input.disabled}`,
    `input.title = ${JSON.stringify(input.title)}`,
  ])
}

function progressSource(input: HTMLInputElement): AdvancedNativeControlStorySource {
  return sourceFor(input, [
    'const input = document.createElement("input")',
    'input.className = "ui-progress-checkbox-story"',
    'input.type = "checkbox"',
    `input.checked = ${input.checked}`,
    `input.indeterminate = ${input.indeterminate}`,
    `input.disabled = ${input.disabled}`,
    `input.title = ${JSON.stringify(input.title)}`,
    'const syncAriaChecked = () => input.setAttribute("aria-checked", input.indeterminate ? "mixed" : String(input.checked))',
    'input.addEventListener("change", syncAriaChecked)',
    "syncAriaChecked()",
  ])
}

function sourceFor(
  input: HTMLInputElement,
  statements: readonly string[],
): AdvancedNativeControlStorySource {
  return Object.freeze({
    html: serializeInput(input),
    css: advancedNativeControlStoriesCss,
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
  const attributes = input.getAttributeNames()
    .sort()
    .map((name) => {
      const value = input.getAttribute(name) ?? ""
      if (name === "disabled" && value === "") return " disabled"
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
