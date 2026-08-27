import type {
  Document,
  HTMLElement,
  HTMLMeterElement,
  HTMLProgressElement,
} from "@zavx0z/dom"

export type GaugeStorySource = Readonly<{
  html: string
  css: string
  typescript: string
}>

export type ProgressStoryArgs = Readonly<{
  max: number
  value: number | null
  title: string
}>

export type ProgressDomStory = Readonly<{
  element: HTMLProgressElement
  args: ProgressStoryArgs
  source: GaugeStorySource
  update(args: ProgressStoryArgs): void
}>

export type MeterStoryArgs = Readonly<{
  min: number
  max: number
  low: number
  high: number
  optimum: number
  value: number
  title: string
}>

export type MeterDomStory = Readonly<{
  element: HTMLMeterElement
  args: MeterStoryArgs
  source: GaugeStorySource
  update(args: MeterStoryArgs): void
}>

export const progressStoryDefaultArgs: ProgressStoryArgs = Object.freeze({
  max: 100,
  value: 50,
  title: "Progress",
})

export const meterStoryDefaultArgs: MeterStoryArgs = Object.freeze({
  min: 0,
  max: 100,
  low: 25,
  high: 75,
  optimum: 50,
  value: 60,
  title: "Meter",
})

export const gaugeStoriesCss = String.raw`
.ui-progress-story,
.ui-meter-story {
  box-sizing: border-box;
  display: block;
  width: 200px;
  height: 20px;
  padding: 3px 6px;
  border: 1px solid rgb(22, 22, 22);
  border-radius: 4px;
  background: rgb(36, 36, 36);
  color: rgb(224, 224, 224);
}

.ui-progress-story {
  color: rgb(45, 104, 128);
}

.ui-meter-story {
  color: rgb(126, 220, 236);
}
`

export function createProgressStory(
  document: Document,
  initialArgs: ProgressStoryArgs = progressStoryDefaultArgs,
): ProgressDomStory {
  const progress = document.createElement("progress")
  progress.className = "ui-progress-story"
  let currentArgs = progressStoryDefaultArgs

  const update = (args: ProgressStoryArgs): void => {
    const nextArgs = normalizeProgressArgs(args)
    progress.max = nextArgs.max
    if (nextArgs.value === null) progress.removeAttribute("value")
    else progress.value = nextArgs.value

    const normalizedMax = progress.max
    progress.max = normalizedMax
    const normalizedValue = nextArgs.value === null ? null : progress.value
    if (normalizedValue !== null) progress.value = normalizedValue
    syncTitle(progress, nextArgs.title)
    currentArgs = Object.freeze({
      max: progress.max,
      value: normalizedValue,
      title: nextArgs.title,
    })
  }
  const story: ProgressDomStory = Object.freeze({
    element: progress,
    get args() { return currentArgs },
    get source() { return progressSource(progress) },
    update,
  })
  update(initialArgs)
  return story
}

export function createMeterStory(
  document: Document,
  initialArgs: MeterStoryArgs = meterStoryDefaultArgs,
): MeterDomStory {
  const meter = document.createElement("meter")
  meter.className = "ui-meter-story"
  let currentArgs = meterStoryDefaultArgs

  const update = (args: MeterStoryArgs): void => {
    const nextArgs = normalizeMeterArgs(args)
    meter.min = nextArgs.min
    meter.max = nextArgs.max
    meter.low = nextArgs.low
    meter.high = nextArgs.high
    meter.optimum = nextArgs.optimum
    meter.value = nextArgs.value

    const normalized = meterValues(meter)
    meter.min = normalized.min
    meter.max = normalized.max
    meter.low = normalized.low
    meter.high = normalized.high
    meter.optimum = normalized.optimum
    meter.value = normalized.value
    syncTitle(meter, nextArgs.title)
    currentArgs = Object.freeze({...meterValues(meter), title: nextArgs.title})
  }
  const story: MeterDomStory = Object.freeze({
    element: meter,
    get args() { return currentArgs },
    get source() { return meterSource(meter) },
    update,
  })
  update(initialArgs)
  return story
}

function meterValues(meter: HTMLMeterElement): Omit<MeterStoryArgs, "title"> {
  return Object.freeze({
    min: meter.min,
    max: meter.max,
    low: meter.low,
    high: meter.high,
    optimum: meter.optimum,
    value: meter.value,
  })
}

function normalizeProgressArgs(args: ProgressStoryArgs): ProgressStoryArgs {
  assertFinite(args.max, "Progress story max")
  if (args.value !== null) assertFinite(args.value, "Progress story value")
  assertString(args.title, "Progress story title")
  return Object.freeze({...args})
}

function normalizeMeterArgs(args: MeterStoryArgs): MeterStoryArgs {
  for (const key of ["min", "max", "low", "high", "optimum", "value"] as const) {
    assertFinite(args[key], `Meter story ${key}`)
  }
  assertString(args.title, "Meter story title")
  return Object.freeze({...args})
}

function assertFinite(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be finite`)
  }
}

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string") throw new TypeError(`${label} must be a string`)
}

function syncTitle(element: HTMLElement, title: string): void {
  if (element.getAttribute("title") !== title) element.title = title
}

function progressSource(progress: HTMLProgressElement): GaugeStorySource {
  const statements = [
    'const progress = document.createElement("progress")',
    'progress.className = "ui-progress-story"',
    `progress.max = ${progress.max}`,
    progress.position < 0
      ? 'progress.removeAttribute("value")'
      : `progress.value = ${progress.value}`,
    `progress.title = ${JSON.stringify(progress.title)}`,
    "document.appendChild(progress)",
  ]
  return sourceFor(progress, statements)
}

function meterSource(meter: HTMLMeterElement): GaugeStorySource {
  return sourceFor(meter, [
    'const meter = document.createElement("meter")',
    'meter.className = "ui-meter-story"',
    `meter.min = ${meter.min}`,
    `meter.max = ${meter.max}`,
    `meter.low = ${meter.low}`,
    `meter.high = ${meter.high}`,
    `meter.optimum = ${meter.optimum}`,
    `meter.value = ${meter.value}`,
    `meter.title = ${JSON.stringify(meter.title)}`,
    "document.appendChild(meter)",
  ])
}

function sourceFor(element: HTMLElement, statements: readonly string[]): GaugeStorySource {
  return Object.freeze({
    html: serializeElement(element),
    css: gaugeStoriesCss,
    typescript: [
      'import {createDocument} from "@zavx0z/dom"',
      "",
      "const document = createDocument()",
      ...statements,
    ].join("\n"),
  })
}

function serializeElement(element: HTMLElement): string {
  const attributes = element.getAttributeNames()
    .sort()
    .map((name) => ` ${name}="${escapeAttribute(element.getAttribute(name) ?? "")}"`)
    .join("")
  return `<${element.localName}${attributes}></${element.localName}>`
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
