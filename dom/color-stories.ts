import type {
  Document,
  Element,
  HTMLButtonElement,
  HTMLDivElement,
  HTMLFieldSetElement,
  HTMLInputElement,
  HTMLLabelElement,
  HTMLLegendElement,
  HTMLElement,
  Node,
  Text,
} from "@zavx0z/dom"

export type RgbaChannel = "r" | "g" | "b" | "a"

export type RgbaStoryValue = Readonly<Record<RgbaChannel, number>>

export type ColorStoriesSource = Readonly<{
  html: string
  css: string
  typescript: string
}>

export type ColorFieldStoryArgs = Readonly<{
  legend: string
  value: RgbaStoryValue
  disabled: boolean
  readOnly: boolean
  title: string
}>

export type ColorFieldStoryRefs = Readonly<{
  root: HTMLFieldSetElement
  legend: HTMLLegendElement
  legendText: Text
  channelGroup: HTMLDivElement
  labels: ReadonlyMap<RgbaChannel, HTMLLabelElement>
  labelTexts: ReadonlyMap<RgbaChannel, Text>
  inputs: ReadonlyMap<RgbaChannel, HTMLInputElement>
  controlIds: ReadonlyMap<RgbaChannel, string>
}>

export type ColorFieldDomStory = Readonly<{
  element: HTMLFieldSetElement
  refs: ColorFieldStoryRefs
  args: ColorFieldStoryArgs
  source: ColorStoriesSource
  update(args: ColorFieldStoryArgs): void
  dispose(): void
}>

export type ColorInputStoryPresentation = "closed" | "open" | "expanded"

export type ColorInputStoryArgs = Readonly<{
  legend: string
  value: RgbaStoryValue
  presentation: ColorInputStoryPresentation
  disabled: boolean
  readOnly: boolean
  title: string
}>

export type ColorInputStoryRefs = Readonly<{
  root: HTMLFieldSetElement
  legend: HTMLLegendElement
  legendText: Text
  trigger: HTMLButtonElement
  triggerText: Text
  picker: HTMLDivElement
  pickerPlane: HTMLDivElement
  rgbaGroup: HTMLDivElement
  rgbaLabels: ReadonlyMap<RgbaChannel, HTMLLabelElement>
  rgbaLabelTexts: ReadonlyMap<RgbaChannel, Text>
  rgbaInputs: ReadonlyMap<RgbaChannel, HTMLInputElement>
  rangeLabels: ReadonlyMap<RgbaChannel, HTMLLabelElement>
  rangeLabelTexts: ReadonlyMap<RgbaChannel, Text>
  rangeInputs: ReadonlyMap<RgbaChannel, HTMLInputElement>
  pickerId: string
}>

export type ColorInputDomStory = Readonly<{
  element: HTMLFieldSetElement
  refs: ColorInputStoryRefs
  args: ColorInputStoryArgs
  source: ColorStoriesSource
  update(args: ColorInputStoryArgs): void
  dispose(): void
}>

const channelDefinitions = Object.freeze([
  Object.freeze({key: "r", label: "R", title: "Red channel"}),
  Object.freeze({key: "g", label: "G", title: "Green channel"}),
  Object.freeze({key: "b", label: "B", title: "Blue channel"}),
  Object.freeze({key: "a", label: "A", title: "Alpha channel"}),
] as const)

const defaultRgba = Object.freeze({r: 0.18, g: 0.58, b: 0.92, a: 0.72})

export const colorFieldStoryDefaultArgs: ColorFieldStoryArgs = Object.freeze({
  legend: "Color",
  value: defaultRgba,
  disabled: false,
  readOnly: false,
  title: "RGBA color field",
})

export const colorInputClosedStoryDefaultArgs: ColorInputStoryArgs = Object.freeze({
  legend: "Color",
  value: defaultRgba,
  presentation: "closed",
  disabled: false,
  readOnly: false,
  title: "Open color picker",
})

export const colorInputOpenStoryDefaultArgs: ColorInputStoryArgs = Object.freeze({
  ...colorInputClosedStoryDefaultArgs,
  presentation: "open",
})

export const colorInputExpandedStoryDefaultArgs: ColorInputStoryArgs = Object.freeze({
  ...colorInputClosedStoryDefaultArgs,
  presentation: "expanded",
})

export const colorStoriesCss = String.raw`
.ui-color-field-story,
.ui-color-input-story {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border: 1px solid rgb(22, 22, 22);
  border-radius: 4px;
  background: rgb(48, 48, 48);
  color: rgb(224, 224, 224);
}

.ui-color-field-story {
  width: 340px;
  height: 76px;
}

.ui-color-input-story {
  width: 300px;
}

.ui-color-field-story__legend,
.ui-color-input-story__legend {
  display: block;
  height: 18px;
  color: rgb(126, 220, 236);
  font-size: 12px;
}

.ui-color-field-story__channels,
.ui-color-input-story__rgba {
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  width: 100%;
}

.ui-color-field-story__channel,
.ui-color-input-story__rgba-channel {
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 3px;
  min-width: 0;
  flex-grow: 1;
  color: rgb(176, 176, 176);
  font-size: 11px;
}

.ui-color-field-story__input,
.ui-color-input-story__rgba-input {
  box-sizing: border-box;
  display: block;
  min-width: 0;
  width: 52px;
  height: 26px;
  padding: 3px 5px;
  border: 1px solid rgb(22, 22, 22);
  border-radius: 3px;
  background: rgb(36, 36, 36);
  color: rgb(224, 224, 224);
  font-size: 11px;
}

.ui-color-input-story__trigger {
  box-sizing: border-box;
  display: block;
  width: 278px;
  height: 28px;
  padding: 4px 8px;
  border: 1px solid rgb(22, 22, 22);
  border-radius: 4px;
  background: rgb(45, 104, 128);
  color: rgb(240, 240, 240);
  font-size: 12px;
}

.ui-color-input-story__picker {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 278px;
  padding: 8px;
  border: 1px solid rgb(22, 22, 22);
  border-radius: 4px;
  background: rgb(36, 36, 36);
}

.ui-color-input-story__picker-plane {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 5px;
  width: 260px;
  padding: 7px;
  border: 1px solid rgb(72, 72, 72);
  border-radius: 4px;
  background: rgb(61, 61, 61);
}

.ui-color-input-story__range-channel {
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  width: 246px;
  height: 24px;
  color: rgb(176, 176, 176);
  font-size: 11px;
}

.ui-color-input-story__range-input {
  box-sizing: border-box;
  display: block;
  width: 220px;
  height: 22px;
  padding: 2px 6px;
  border: 1px solid rgb(22, 22, 22);
  border-radius: 3px;
  background: rgb(36, 36, 36);
  color: rgb(126, 220, 236);
}

.ui-color-input-story--expanded .ui-color-input-story__picker {
  border-color: rgb(45, 104, 128);
}

.ui-color-field-story__input[readonly],
.ui-color-input-story__rgba-input[readonly] {
  background: rgb(61, 61, 61);
  color: rgb(176, 176, 176);
}

.ui-color-field-story[disabled],
.ui-color-input-story[disabled],
.ui-color-input-story__trigger[disabled],
.ui-color-input-story__range-input[disabled] {
  opacity: 0.5;
}

.ui-color-input-story [hidden] {
  display: none;
}
`

type TextChannelEntry = {
  label: HTMLLabelElement
  labelText: Text
  input: HTMLInputElement
}

type OwnedListener = Readonly<{
  element: HTMLElement
  type: "click" | "input"
  listener: () => void
}>

let nextColorStoryId = 1

export function createColorFieldStory(
  document: Document,
  initialArgs: ColorFieldStoryArgs = colorFieldStoryDefaultArgs,
): ColorFieldDomStory {
  const ownerId = generatedOwnerId("field")
  const root = document.createElement("fieldset")
  const legend = document.createElement("legend")
  const legendText = document.createTextNode("")
  const channelGroup = document.createElement("div")
  const labels = new Map<RgbaChannel, HTMLLabelElement>()
  const labelTexts = new Map<RgbaChannel, Text>()
  const inputs = new Map<RgbaChannel, HTMLInputElement>()
  const controlIds = new Map<RgbaChannel, string>()
  const listeners: OwnedListener[] = []

  root.className = "ui-color-field-story"
  legend.className = "ui-color-field-story__legend"
  legend.appendChild(legendText)
  channelGroup.className = "ui-color-field-story__channels"
  root.append(legend, channelGroup)

  for (const channel of channelDefinitions) {
    const controlId = `${ownerId}-${channel.key}`
    const entry = createTextChannel(document, "field", channel.key, channel.label, channel.title, controlId)
    labels.set(channel.key, entry.label)
    labelTexts.set(channel.key, entry.labelText)
    inputs.set(channel.key, entry.input)
    controlIds.set(channel.key, controlId)
    channelGroup.appendChild(entry.label)
  }

  let currentArgs = colorFieldStoryDefaultArgs
  for (const channel of channelDefinitions) {
    const input = inputs.get(channel.key)!
    const listener = (): void => {
      const next = parseUnit(input.value)
      if (next === null) return
      currentArgs = Object.freeze({
        ...currentArgs,
        value: withChannel(currentArgs.value, channel.key, next),
      })
    }
    input.addEventListener("input", listener)
    listeners.push(Object.freeze({element: input, type: "input", listener}))
  }

  const update = (args: ColorFieldStoryArgs): void => {
    const nextArgs = normalizeColorFieldArgs(args)
    if (legendText.data !== nextArgs.legend) legendText.data = nextArgs.legend
    syncTitle(root, nextArgs.title)
    if (root.disabled !== nextArgs.disabled) root.disabled = nextArgs.disabled
    for (const channel of channelDefinitions) {
      syncTextInput(inputs.get(channel.key)!, nextArgs.value[channel.key], nextArgs.disabled, nextArgs.readOnly)
    }
    currentArgs = nextArgs
  }

  const refs: ColorFieldStoryRefs = Object.freeze({
    root,
    legend,
    legendText,
    channelGroup,
    labels,
    labelTexts,
    inputs,
    controlIds,
  })
  const story: ColorFieldDomStory = Object.freeze({
    element: root,
    refs,
    get args() { return currentArgs },
    get source() { return colorFieldSource(refs, currentArgs) },
    update,
    dispose() {
      removeOwnedListeners(listeners)
    },
  })
  update(initialArgs)
  return story
}

export function createColorInputStory(
  document: Document,
  initialArgs: ColorInputStoryArgs = colorInputClosedStoryDefaultArgs,
): ColorInputDomStory {
  const ownerId = generatedOwnerId("input")
  const pickerId = `${ownerId}-picker`
  const root = document.createElement("fieldset")
  const legend = document.createElement("legend")
  const legendText = document.createTextNode("")
  const trigger = document.createElement("button")
  const triggerText = document.createTextNode("")
  const picker = document.createElement("div")
  const pickerPlane = document.createElement("div")
  const rgbaGroup = document.createElement("div")
  const rgbaLabels = new Map<RgbaChannel, HTMLLabelElement>()
  const rgbaLabelTexts = new Map<RgbaChannel, Text>()
  const rgbaInputs = new Map<RgbaChannel, HTMLInputElement>()
  const rangeLabels = new Map<RgbaChannel, HTMLLabelElement>()
  const rangeLabelTexts = new Map<RgbaChannel, Text>()
  const rangeInputs = new Map<RgbaChannel, HTMLInputElement>()
  const listeners: OwnedListener[] = []

  root.className = "ui-color-input-story ui-color-input-story--closed"
  legend.className = "ui-color-input-story__legend"
  legend.appendChild(legendText)
  trigger.className = "ui-color-input-story__trigger"
  trigger.setAttribute("type", "button")
  trigger.setAttribute("aria-controls", pickerId)
  trigger.appendChild(triggerText)
  picker.className = "ui-color-input-story__picker"
  picker.id = pickerId
  picker.setAttribute("role", "group")
  picker.setAttribute("aria-label", "Color picker")
  pickerPlane.className = "ui-color-input-story__picker-plane"
  pickerPlane.setAttribute("role", "group")
  pickerPlane.setAttribute("aria-label", "RGBA picker plane")
  rgbaGroup.className = "ui-color-input-story__rgba"
  picker.append(pickerPlane, rgbaGroup)
  root.append(legend, trigger, picker)

  for (const channel of channelDefinitions) {
    const rangeId = `${ownerId}-range-${channel.key}`
    const rangeEntry = createRangeChannel(document, channel.key, channel.label, channel.title, rangeId)
    rangeLabels.set(channel.key, rangeEntry.label)
    rangeLabelTexts.set(channel.key, rangeEntry.labelText)
    rangeInputs.set(channel.key, rangeEntry.input)
    pickerPlane.appendChild(rangeEntry.label)

    const rgbaId = `${ownerId}-rgba-${channel.key}`
    const rgbaEntry = createTextChannel(document, "input", channel.key, channel.label, channel.title, rgbaId)
    rgbaLabels.set(channel.key, rgbaEntry.label)
    rgbaLabelTexts.set(channel.key, rgbaEntry.labelText)
    rgbaInputs.set(channel.key, rgbaEntry.input)
    rgbaGroup.appendChild(rgbaEntry.label)
  }

  let currentArgs = colorInputClosedStoryDefaultArgs

  const syncSummary = (): void => {
    const summary = formatHex(currentArgs.value)
    if (triggerText.data !== summary) triggerText.data = summary
    trigger.setAttribute("aria-label", `${currentArgs.legend}: ${summary}`)
    root.setAttribute("data-rgba", summary)
  }

  const commitLiveChannel = (channel: RgbaChannel, value: number, source: "range" | "text"): void => {
    const normalized = unit(value, `ColorInput live ${channel}`)
    const rgbaInput = rgbaInputs.get(channel)!
    const rangeInput = rangeInputs.get(channel)!
    if (source === "text" && rangeInput.valueAsNumber !== normalized) rangeInput.valueAsNumber = normalized
    if (source === "range" && rgbaInput.value !== formatUnit(normalized)) rgbaInput.value = formatUnit(normalized)
    currentArgs = Object.freeze({
      ...currentArgs,
      value: withChannel(currentArgs.value, channel, normalized),
    })
    syncSummary()
  }

  for (const channel of channelDefinitions) {
    const rgbaInput = rgbaInputs.get(channel.key)!
    const rangeInput = rangeInputs.get(channel.key)!
    const rgbaListener = (): void => {
      const value = parseUnit(rgbaInput.value)
      if (value !== null) commitLiveChannel(channel.key, value, "text")
    }
    const rangeListener = (): void => {
      const value = rangeInput.valueAsNumber
      if (Number.isFinite(value)) commitLiveChannel(channel.key, value, "range")
    }
    rgbaInput.addEventListener("input", rgbaListener)
    rangeInput.addEventListener("input", rangeListener)
    listeners.push(
      Object.freeze({element: rgbaInput, type: "input", listener: rgbaListener}),
      Object.freeze({element: rangeInput, type: "input", listener: rangeListener}),
    )
  }

  const update = (args: ColorInputStoryArgs): void => {
    const nextArgs = normalizeColorInputArgs(args)
    currentArgs = nextArgs
    if (legendText.data !== nextArgs.legend) legendText.data = nextArgs.legend
    root.className = `ui-color-input-story ui-color-input-story--${nextArgs.presentation}`
    root.setAttribute("data-presentation", nextArgs.presentation)
    if (root.disabled !== nextArgs.disabled) root.disabled = nextArgs.disabled
    syncTitle(trigger, nextArgs.title)
    const locked = nextArgs.disabled || nextArgs.readOnly
    if (trigger.disabled !== locked) trigger.disabled = locked
    syncBooleanAttribute(trigger, "hidden", nextArgs.presentation === "expanded")
    const expanded = nextArgs.presentation !== "closed"
    trigger.setAttribute("aria-expanded", String(expanded))
    syncBooleanAttribute(picker, "hidden", !expanded)
    picker.setAttribute("aria-hidden", String(!expanded))
    for (const channel of channelDefinitions) {
      syncTextInput(
        rgbaInputs.get(channel.key)!,
        nextArgs.value[channel.key],
        nextArgs.disabled,
        nextArgs.readOnly,
      )
      syncRangeInput(rangeInputs.get(channel.key)!, nextArgs.value[channel.key], locked)
    }
    syncSummary()
  }

  const triggerListener = (): void => {
    if (currentArgs.disabled || currentArgs.readOnly || currentArgs.presentation === "expanded") return
    update({
      ...currentArgs,
      presentation: currentArgs.presentation === "closed" ? "open" : "closed",
    })
  }
  trigger.addEventListener("click", triggerListener)
  listeners.push(Object.freeze({element: trigger, type: "click", listener: triggerListener}))

  const refs: ColorInputStoryRefs = Object.freeze({
    root,
    legend,
    legendText,
    trigger,
    triggerText,
    picker,
    pickerPlane,
    rgbaGroup,
    rgbaLabels,
    rgbaLabelTexts,
    rgbaInputs,
    rangeLabels,
    rangeLabelTexts,
    rangeInputs,
    pickerId,
  })
  const story: ColorInputDomStory = Object.freeze({
    element: root,
    refs,
    get args() { return currentArgs },
    get source() { return colorInputSource(refs, currentArgs) },
    update,
    dispose() {
      removeOwnedListeners(listeners)
    },
  })
  update(initialArgs)
  return story
}

function createTextChannel(
  document: Document,
  owner: "field" | "input",
  key: RgbaChannel,
  labelValue: string,
  title: string,
  controlId: string,
): TextChannelEntry {
  const label = document.createElement("label")
  const labelText = document.createTextNode(labelValue)
  const input = document.createElement("input")
  const labelClass = owner === "field" ? "ui-color-field-story__channel" : "ui-color-input-story__rgba-channel"
  const inputClass = owner === "field" ? "ui-color-field-story__input" : "ui-color-input-story__rgba-input"
  label.className = labelClass
  label.setAttribute("data-channel", key)
  label.htmlFor = controlId
  label.appendChild(labelText)
  input.className = inputClass
  input.id = controlId
  input.type = "text"
  input.title = title
  input.setAttribute("data-channel", key)
  label.appendChild(input)
  return {label, labelText, input}
}

function createRangeChannel(
  document: Document,
  key: RgbaChannel,
  labelValue: string,
  title: string,
  controlId: string,
): TextChannelEntry {
  const label = document.createElement("label")
  const labelText = document.createTextNode(labelValue)
  const input = document.createElement("input")
  label.className = "ui-color-input-story__range-channel"
  label.setAttribute("data-channel", key)
  label.htmlFor = controlId
  label.appendChild(labelText)
  input.className = "ui-color-input-story__range-input"
  input.id = controlId
  input.type = "range"
  input.min = "0"
  input.max = "1"
  input.step = "any"
  input.title = title
  input.setAttribute("data-channel", key)
  label.appendChild(input)
  return {label, labelText, input}
}

function normalizeColorFieldArgs(args: ColorFieldStoryArgs): ColorFieldStoryArgs {
  assertString(args.legend, "Color Field story legend")
  const value = normalizeRgba(args.value, "Color Field story value")
  assertBoolean(args.disabled, "Color Field story disabled")
  assertBoolean(args.readOnly, "Color Field story readOnly")
  assertString(args.title, "Color Field story title")
  return Object.freeze({...args, value})
}

function normalizeColorInputArgs(args: ColorInputStoryArgs): ColorInputStoryArgs {
  assertString(args.legend, "ColorInput story legend")
  const value = normalizeRgba(args.value, "ColorInput story value")
  assertPresentation(args.presentation)
  assertBoolean(args.disabled, "ColorInput story disabled")
  assertBoolean(args.readOnly, "ColorInput story readOnly")
  assertString(args.title, "ColorInput story title")
  return Object.freeze({...args, value})
}

function normalizeRgba(value: RgbaStoryValue, label: string): RgbaStoryValue {
  if (typeof value !== "object" || value === null) throw new TypeError(`${label} must be an object`)
  return Object.freeze({
    r: unit(value.r, `${label}.r`),
    g: unit(value.g, `${label}.g`),
    b: unit(value.b, `${label}.b`),
    a: unit(value.a, `${label}.a`),
  })
}

function unit(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(`${label} must be finite`)
  if (value < 0 || value > 1) throw new RangeError(`${label} must be between 0 and 1`)
  return value
}

function assertPresentation(value: unknown): asserts value is ColorInputStoryPresentation {
  if (value !== "closed" && value !== "open" && value !== "expanded") {
    throw new Error(`Unknown ColorInput story presentation: ${String(value)}`)
  }
}

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string") throw new TypeError(`${label} must be a string`)
}

function assertBoolean(value: unknown, label: string): asserts value is boolean {
  if (typeof value !== "boolean") throw new TypeError(`${label} must be a boolean`)
}

function parseUnit(value: string): number | null {
  if (value.trim() === "") return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 && number <= 1 ? number : null
}

function withChannel(value: RgbaStoryValue, channel: RgbaChannel, next: number): RgbaStoryValue {
  return Object.freeze({...value, [channel]: next})
}

function formatUnit(value: number): string {
  return String(value)
}

function formatHex(value: RgbaStoryValue): string {
  const channel = (entry: number): string => Math.round(entry * 255).toString(16).padStart(2, "0").toUpperCase()
  return `#${channel(value.r)}${channel(value.g)}${channel(value.b)}${channel(value.a)}`
}

function syncTextInput(
  input: HTMLInputElement,
  value: number,
  disabled: boolean,
  readOnly: boolean,
): void {
  if (input.type !== "text") input.type = "text"
  const formatted = formatUnit(value)
  if (input.value !== formatted) input.value = formatted
  if (input.disabled !== disabled) input.disabled = disabled
  if (input.readOnly !== readOnly) input.readOnly = readOnly
}

function syncRangeInput(input: HTMLInputElement, value: number, disabled: boolean): void {
  if (input.type !== "range") input.type = "range"
  if (input.min !== "0") input.min = "0"
  if (input.max !== "1") input.max = "1"
  if (input.step !== "any") input.step = "any"
  if (input.valueAsNumber !== value) input.valueAsNumber = value
  if (input.disabled !== disabled) input.disabled = disabled
}

function syncTitle(element: HTMLElement, title: string): void {
  if (element.title !== title) element.title = title
}

function syncBooleanAttribute(element: Element, name: string, value: boolean): void {
  if (value && !element.hasAttribute(name)) element.setAttribute(name, "")
  if (!value && element.hasAttribute(name)) element.removeAttribute(name)
}

function generatedOwnerId(owner: "field" | "input"): string {
  const id = `ui-color-${owner}-story-${nextColorStoryId}`
  nextColorStoryId += 1
  return id
}

function removeOwnedListeners(listeners: readonly OwnedListener[]): void {
  for (const {element, type, listener} of listeners) element.removeEventListener(type, listener)
}

function colorFieldSource(refs: ColorFieldStoryRefs, args: ColorFieldStoryArgs): ColorStoriesSource {
  const channels = channelDefinitions.map(({key, label}) => ({
    key,
    label,
    controlId: refs.controlIds.get(key)!,
    title: refs.inputs.get(key)!.title,
    value: refs.inputs.get(key)!.value,
  }))
  return sourceFor(refs.root, [
    'type Channel = "r" | "g" | "b" | "a"',
    `const channels: readonly {key: Channel; label: string; controlId: string; title: string; value: string}[] = ${JSON.stringify(channels, null, 2)}`,
    `let value = ${JSON.stringify(args.value)}`,
    'const fieldset = document.createElement("fieldset")',
    'fieldset.className = "ui-color-field-story"',
    `fieldset.disabled = ${refs.root.disabled}`,
    `fieldset.title = ${JSON.stringify(refs.root.title)}`,
    'const legend = document.createElement("legend")',
    'legend.className = "ui-color-field-story__legend"',
    `legend.appendChild(document.createTextNode(${JSON.stringify(refs.legendText.data)}))`,
    'const channelGroup = document.createElement("div")',
    'channelGroup.className = "ui-color-field-story__channels"',
    'for (const channel of channels) {',
    '  const label = document.createElement("label")',
    '  label.className = "ui-color-field-story__channel"',
    '  label.setAttribute("data-channel", channel.key)',
    '  label.setAttribute("for", channel.controlId)',
    '  label.appendChild(document.createTextNode(channel.label))',
    '  const input = document.createElement("input")',
    '  input.className = "ui-color-field-story__input"',
    '  input.id = channel.controlId',
    '  input.type = "text"',
    '  input.value = channel.value',
    `  input.disabled = ${refs.inputs.get("r")!.disabled}`,
    `  input.readOnly = ${refs.inputs.get("r")!.readOnly}`,
    '  input.title = channel.title',
    '  input.setAttribute("data-channel", channel.key)',
    '  input.addEventListener("input", () => {',
    '    const next = Number(input.value)',
    '    if (input.value.trim() !== "" && Number.isFinite(next) && next >= 0 && next <= 1) {',
    '      value = {...value, [channel.key]: next}',
    '    }',
    '  })',
    '  label.appendChild(input)',
    '  channelGroup.appendChild(label)',
    '}',
    'fieldset.append(legend, channelGroup)',
    'document.appendChild(fieldset)',
  ])
}

function colorInputSource(refs: ColorInputStoryRefs, args: ColorInputStoryArgs): ColorStoriesSource {
  const textChannels = channelDefinitions.map(({key, label}) => ({
    key,
    label,
    id: refs.rgbaInputs.get(key)!.id,
    title: refs.rgbaInputs.get(key)!.title,
    value: refs.rgbaInputs.get(key)!.value,
  }))
  const rangeChannels = channelDefinitions.map(({key, label}) => ({
    key,
    label,
    id: refs.rangeInputs.get(key)!.id,
    title: refs.rangeInputs.get(key)!.title,
    value: refs.rangeInputs.get(key)!.valueAsNumber,
  }))
  return sourceFor(refs.root, [
    'type Channel = "r" | "g" | "b" | "a"',
    `const textChannels: readonly {key: Channel; label: string; id: string; title: string; value: string}[] = ${JSON.stringify(textChannels, null, 2)}`,
    `const rangeChannels: readonly {key: Channel; label: string; id: string; title: string; value: number}[] = ${JSON.stringify(rangeChannels, null, 2)}`,
    `let value = ${JSON.stringify(args.value)}`,
    `let presentation: "closed" | "open" | "expanded" = ${JSON.stringify(args.presentation)}`,
    'const fieldset = document.createElement("fieldset")',
    `fieldset.className = ${JSON.stringify(refs.root.className)}`,
    `fieldset.setAttribute("data-presentation", ${JSON.stringify(refs.root.getAttribute("data-presentation"))})`,
    `fieldset.setAttribute("data-rgba", ${JSON.stringify(refs.root.getAttribute("data-rgba"))})`,
    `fieldset.disabled = ${refs.root.disabled}`,
    'const legend = document.createElement("legend")',
    'legend.className = "ui-color-input-story__legend"',
    `legend.appendChild(document.createTextNode(${JSON.stringify(refs.legendText.data)}))`,
    'const trigger = document.createElement("button")',
    'trigger.className = "ui-color-input-story__trigger"',
    'trigger.setAttribute("type", "button")',
    `trigger.setAttribute("aria-controls", ${JSON.stringify(refs.pickerId)})`,
    `trigger.setAttribute("aria-expanded", ${JSON.stringify(refs.trigger.getAttribute("aria-expanded"))})`,
    `trigger.setAttribute("aria-label", ${JSON.stringify(refs.trigger.getAttribute("aria-label"))})`,
    `trigger.disabled = ${refs.trigger.disabled}`,
    `trigger.title = ${JSON.stringify(refs.trigger.title)}`,
    `trigger.appendChild(document.createTextNode(${JSON.stringify(refs.triggerText.data)}))`,
    ...(refs.trigger.hasAttribute("hidden") ? ['trigger.setAttribute("hidden", "")'] : []),
    'const picker = document.createElement("div")',
    'picker.className = "ui-color-input-story__picker"',
    `picker.id = ${JSON.stringify(refs.pickerId)}`,
    'picker.setAttribute("role", "group")',
    'picker.setAttribute("aria-label", "Color picker")',
    `picker.setAttribute("aria-hidden", ${JSON.stringify(refs.picker.getAttribute("aria-hidden"))})`,
    ...(refs.picker.hasAttribute("hidden") ? ['picker.setAttribute("hidden", "")'] : []),
    'const pickerPlane = document.createElement("div")',
    'pickerPlane.className = "ui-color-input-story__picker-plane"',
    'pickerPlane.setAttribute("role", "group")',
    'pickerPlane.setAttribute("aria-label", "RGBA picker plane")',
    'const rangeInputs = new Map<Channel, HTMLInputElement>()',
    'for (const channel of rangeChannels) {',
    '  const label = document.createElement("label")',
    '  label.className = "ui-color-input-story__range-channel"',
    '  label.setAttribute("data-channel", channel.key)',
    '  label.setAttribute("for", channel.id)',
    '  label.appendChild(document.createTextNode(channel.label))',
    '  const input = document.createElement("input")',
    '  input.className = "ui-color-input-story__range-input"',
    '  input.id = channel.id',
    '  input.type = "range"',
    '  input.min = "0"',
    '  input.max = "1"',
    '  input.step = "any"',
    '  input.valueAsNumber = channel.value',
    `  input.disabled = ${refs.rangeInputs.get("r")!.disabled}`,
    '  input.title = channel.title',
    '  input.setAttribute("data-channel", channel.key)',
    '  rangeInputs.set(channel.key, input)',
    '  label.appendChild(input)',
    '  pickerPlane.appendChild(label)',
    '}',
    'const rgbaGroup = document.createElement("div")',
    'rgbaGroup.className = "ui-color-input-story__rgba"',
    'const textInputs = new Map<Channel, HTMLInputElement>()',
    'for (const channel of textChannels) {',
    '  const label = document.createElement("label")',
    '  label.className = "ui-color-input-story__rgba-channel"',
    '  label.setAttribute("data-channel", channel.key)',
    '  label.setAttribute("for", channel.id)',
    '  label.appendChild(document.createTextNode(channel.label))',
    '  const input = document.createElement("input")',
    '  input.className = "ui-color-input-story__rgba-input"',
    '  input.id = channel.id',
    '  input.type = "text"',
    '  input.value = channel.value',
    `  input.disabled = ${refs.rgbaInputs.get("r")!.disabled}`,
    `  input.readOnly = ${refs.rgbaInputs.get("r")!.readOnly}`,
    '  input.title = channel.title',
    '  input.setAttribute("data-channel", channel.key)',
    '  textInputs.set(channel.key, input)',
    '  input.addEventListener("input", () => {',
    '    const next = Number(input.value)',
    '    if (input.value.trim() === "" || !Number.isFinite(next) || next < 0 || next > 1) return',
    '    value = {...value, [channel.key]: next}',
    '    rangeInputs.get(channel.key)!.valueAsNumber = next',
    '  })',
    '  rangeInputs.get(channel.key)!.addEventListener("input", () => {',
    '    const next = rangeInputs.get(channel.key)!.valueAsNumber',
    '    value = {...value, [channel.key]: next}',
    '    input.value = String(next)',
    '  })',
    '  label.appendChild(input)',
    '  rgbaGroup.appendChild(label)',
    '}',
    'const syncPresentation = () => {',
    '  fieldset.className = `ui-color-input-story ui-color-input-story--${presentation}`',
    '  fieldset.setAttribute("data-presentation", presentation)',
    '  trigger.setAttribute("aria-expanded", String(presentation !== "closed"))',
    '  if (presentation === "expanded") trigger.setAttribute("hidden", "")',
    '  else trigger.removeAttribute("hidden")',
    '  if (presentation === "closed") picker.setAttribute("hidden", "")',
    '  else picker.removeAttribute("hidden")',
    '  picker.setAttribute("aria-hidden", String(presentation === "closed"))',
    '}',
    'trigger.addEventListener("click", () => {',
    '  if (presentation === "expanded") return',
    '  presentation = presentation === "closed" ? "open" : "closed"',
    '  syncPresentation()',
    '})',
    'picker.append(pickerPlane, rgbaGroup)',
    'fieldset.append(legend, trigger, picker)',
    'syncPresentation()',
    'document.appendChild(fieldset)',
  ])
}

function sourceFor(root: HTMLElement, statements: readonly string[]): ColorStoriesSource {
  return Object.freeze({
    html: serializeElement(root),
    css: colorStoriesCss,
    typescript: [
      'import {createDocument, type HTMLInputElement} from "@zavx0z/dom"',
      "",
      "const document = createDocument()",
      ...statements,
    ].join("\n"),
  })
}

function serializeElement(element: Element, depth = 0): string {
  const indentation = "  ".repeat(depth)
  const attributes = serializeAttributes(element)
  if (element.localName === "input") return `${indentation}<input${attributes}>`
  if (element.childNodes.length === 0) return `${indentation}<${element.localName}${attributes}></${element.localName}>`
  if (element.childNodes.length === 1 && element.firstChild?.nodeType === 3) {
    return `${indentation}<${element.localName}${attributes}>${escapeText(element.textContent ?? "")}</${element.localName}>`
  }
  const children = element.childNodes.map((child) => serializeNode(child, depth + 1)).join("\n")
  return `${indentation}<${element.localName}${attributes}>\n${children}\n${indentation}</${element.localName}>`
}

function serializeNode(node: Node, depth: number): string {
  if (node.nodeType === 3) return `${"  ".repeat(depth)}${escapeText(node.textContent ?? "")}`
  return serializeElement(node as Element, depth)
}

function serializeAttributes(element: Element): string {
  return element.getAttributeNames()
    .sort()
    .map((name) => {
      const value = element.getAttribute(name) ?? ""
      if ((name === "disabled" || name === "hidden" || name === "readonly") && value === "") return ` ${name}`
      return ` ${name}="${escapeAttribute(value)}"`
    })
    .join("")
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
