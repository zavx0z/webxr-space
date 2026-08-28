import type {
  Document,
  Event as DomEvent,
  HTMLButtonElement,
  HTMLDivElement,
  HTMLInputElement,
  HTMLLabelElement,
  HTMLLIElement,
  HTMLOptionElement,
  HTMLSelectElement,
  HTMLSpanElement,
  HTMLElement,
  Node,
  Text,
} from "@zavx0z/dom"
import {projectVisualState, type VisualStateProjection} from "./internal/dom-state.ts"
import {resolveWidgetColors, rgba8ToColor} from "./theme.ts"

export const FIELD_KINDS = Object.freeze([
  "text",
  "number",
  "integer",
  "boolean",
  "enum",
  "color",
  "vector",
  "rotation",
  "matrix",
  "reference",
  "collection",
  "path",
  "readonly",
] as const)

export type FieldKind = typeof FIELD_KINDS[number]
export type FieldNumberKind = "float" | "integer"
export type FieldVectorDimension = 2 | 3 | 4
export type FieldMatrixSize = 2 | 3 | 4
export type FieldCollectionMoveDirection = "up" | "down"

export type FieldColor = Readonly<{r: number; g: number; b: number; a: number}>
export type FieldReference = Readonly<{id: string; label: string; kind?: string}>
export type FieldCollectionItem = Readonly<{
  id: string
  label: string
  description?: string
  disabled?: boolean
}>

export type FieldBase = Readonly<{
  id: string
  label: string
  description?: string
  disabled?: boolean
  readOnly?: boolean
}>

export type TextFieldDefinition = FieldBase & Readonly<{
  kind: "text"
  value: string
  placeholder?: string
  onChange?(value: string): void
}>

export type NumberFieldDefinition = FieldBase & Readonly<{
  kind: "number"
  value: number
  presentation?: "input" | "slider"
  min?: number
  max?: number
  step?: number
  onChange?(value: number): void
}>

export type IntegerFieldDefinition = FieldBase & Readonly<{
  kind: "integer"
  value: number
  min?: number
  max?: number
  step?: number
  onChange?(value: number): void
}>

export type BooleanFieldDefinition = FieldBase & Readonly<{
  kind: "boolean"
  value: boolean
  presentation?: "checkbox" | "switch"
  onChange?(value: boolean): void
}>

export type FieldOption = Readonly<{value: string; label: string; disabled?: boolean}>

export type EnumFieldDefinition = FieldBase & Readonly<{
  kind: "enum"
  value: string
  options: readonly FieldOption[]
  onChange?(value: string): void
}>

export type ColorFieldDefinition = FieldBase & Readonly<{
  kind: "color"
  value: FieldColor
  onChange?(value: FieldColor): void
}>

export type VectorFieldDefinition = FieldBase & Readonly<{
  kind: "vector"
  value: readonly number[]
  dimensions?: FieldVectorDimension
  axes?: readonly string[]
  numberKind?: FieldNumberKind
  min?: number
  max?: number
  step?: number
  onChange?(value: readonly number[]): void
}>

export type RotationFieldDefinition = Omit<VectorFieldDefinition, "kind"> & Readonly<{kind: "rotation"}>

export type MatrixFieldDefinition = FieldBase & Readonly<{
  kind: "matrix"
  value: readonly (readonly number[])[]
  onChange?(value: readonly (readonly number[])[]): void
}>

export type ReferenceFieldDefinition = FieldBase & Readonly<{
  kind: "reference"
  value: FieldReference | null
  placeholder?: string
  onActivate?(): void
  onPick?(): void
  onClear?(): void
}>

export type CollectionFieldDefinition = FieldBase & Readonly<{
  kind: "collection"
  items: readonly FieldCollectionItem[]
  selectedId: string | null
  visibleRows?: number
  emptyLabel?: string
  onSelect?(id: string): void
  onAdd?(): void
  onRemove?(id: string): void
  onMove?(id: string, direction: FieldCollectionMoveDirection): void
}>

export type PathFieldDefinition = FieldBase & Readonly<{
  kind: "path"
  value: string
  placeholder?: string
  onChange?(value: string): void
  onBrowse?(): void
}>

export type ReadonlyFieldDefinition = FieldBase & Readonly<{
  kind: "readonly"
  value: string | number
}>

export type FieldDefinition =
  | TextFieldDefinition
  | NumberFieldDefinition
  | IntegerFieldDefinition
  | BooleanFieldDefinition
  | EnumFieldDefinition
  | ColorFieldDefinition
  | VectorFieldDefinition
  | RotationFieldDefinition
  | MatrixFieldDefinition
  | ReferenceFieldDefinition
  | CollectionFieldDefinition
  | PathFieldDefinition
  | ReadonlyFieldDefinition

export type FieldControl = HTMLInputElement | HTMLSelectElement | HTMLDivElement

export type FieldRefs = Readonly<{
  root: HTMLDivElement
  label: HTMLLabelElement
  labelText: Text
  control: FieldControl
  primary: HTMLElement
  controlId: string
  labelId: string
  inputs: ReadonlyMap<string, HTMLInputElement>
  options: ReadonlyMap<string, HTMLOptionElement>
  buttons: ReadonlyMap<string, HTMLButtonElement>
  items: ReadonlyMap<string, HTMLElement>
}>

export type FieldController = Readonly<{
  element: HTMLDivElement
  refs: FieldRefs
  definition: FieldDefinition
  update(definition: FieldDefinition): void
  dispose(): void
}>

const regularFieldColors = resolveWidgetColors("regular")
const textFieldColors = resolveWidgetColors("text")
const selectedFieldColors = resolveWidgetColors("regular", {selected: true})

export const fieldCss = String.raw`
.ui-field {
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  width: 100%;
  min-width: 0;
  min-height: 28px;
  gap: 4px;
  padding: 0;
  color: ${rgba8ToColor(regularFieldColors.text)};
}

.ui-field__label {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  width: 40%;
  min-width: 0;
  height: 28px;
  color: ${rgba8ToColor(regularFieldColors.text)};
  font-size: 12px;
}

.ui-field__control,
.ui-field__input,
.ui-field__button {
  box-sizing: border-box;
  min-width: 0;
  min-height: 28px;
  padding: 3px 7px;
  border: 1px solid ${rgba8ToColor(regularFieldColors.outline)};
  border-radius: 4px;
  background: ${rgba8ToColor(regularFieldColors.inner)};
  color: ${rgba8ToColor(regularFieldColors.text)};
  font-size: 12px;
}

.ui-field__control {
  display: block;
  flex-grow: 1;
}

.ui-field__group,
.ui-field__matrix,
.ui-field__collection {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex-grow: 1;
  gap: 2px;
}

.ui-field__row,
.ui-field__cell,
.ui-field__actions,
.ui-field__reference,
.ui-field__path {
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: center;
  min-width: 0;
  gap: 0;
}

.ui-field__cell { flex-grow: 1; }
.ui-field__cell-label {
  display: inline;
  width: 18px;
  color: rgb(153 153 153);
  font-size: 11px;
  text-align: center;
}
.ui-field__input { display: block; flex-grow: 1; height: 28px; }
.ui-field__control--boolean {
  width: 18px;
  height: 18px;
  min-height: 18px;
  flex-grow: 0;
  padding: 0;
  border-radius: 2px;
  color: ${rgba8ToColor(selectedFieldColors.inner)};
}
.ui-field__button {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 28px;
  background: ${rgba8ToColor(regularFieldColors.inner)};
}
.ui-field__button--primary { flex-grow: 1; justify-content: flex-start; }
.ui-field__list {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 28px;
  max-height: 144px;
  flex-grow: 1;
  gap: 2px;
  padding: 3px;
  overflow-y: auto;
  border: 1px solid #161616;
  border-radius: 4px;
  background: ${rgba8ToColor(textFieldColors.inner)};
}
.ui-field__item { display: block; min-height: 24px; }
.ui-field__item-button {
  width: 100%;
  height: 24px;
  min-height: 24px;
  justify-content: flex-start;
  border-color: transparent;
  background: transparent;
}
.ui-field__item-button[aria-selected="true"] { background: ${rgba8ToColor(selectedFieldColors.inner)}; color: ${rgba8ToColor(selectedFieldColors.text)}; }
.ui-field__empty {
  display: block;
  min-height: 24px;
  padding: 4px 8px;
  color: rgb(153 153 153);
  font-size: 11px;
}
.ui-field__control[readonly],
.ui-field__input[readonly],
.ui-field__control[aria-readonly="true"],
.ui-field__group[aria-readonly="true"] { background: rgb(48 48 48); color: rgb(153 153 153); }
.ui-field input[data-ui-state="hover"],
.ui-field select[data-ui-state="hover"],
.ui-field button[data-ui-state="hover"] { background: rgb(101 101 101); }
.ui-field input[data-ui-state="focus"],
.ui-field select[data-ui-state="focus"],
.ui-field button[data-ui-state="focus"],
.ui-field button[data-ui-state="active"] { border-color: rgb(113 168 255); background: rgb(34 34 34); }
.ui-field__control[disabled],
.ui-field__input[disabled],
.ui-field__button[disabled],
.ui-field__item-button[aria-disabled="true"],
.ui-field[aria-disabled="true"] .ui-field__label { opacity: 0.5; }
`

type OwnedListener = Readonly<{
  element: HTMLElement
  type: string
  listener: (event: DomEvent) => void
}>
type KindOwner = Readonly<{
  control: FieldControl
  primary: HTMLElement
  inputs: Map<string, HTMLInputElement>
  options: Map<string, HTMLOptionElement>
  buttons: Map<string, HTMLButtonElement>
  items: Map<string, HTMLElement>
  sync(definition: FieldDefinition): FieldDefinition
  dispose(): void
}>
type OptionEntry = {element: HTMLOptionElement; text: Text}
type NumericCellEntry = {
  element: HTMLLabelElement
  label: HTMLSpanElement
  labelText: Text
  input: HTMLInputElement
  listener: OwnedListener
}
type MatrixRowEntry = {element: HTMLDivElement; cells: Map<string, NumericCellEntry>}
type CollectionEntry = {
  element: HTMLLIElement
  button: HTMLButtonElement
  text: Text
  listener: OwnedListener
}

const colorChannels = Object.freeze([
  Object.freeze({key: "r", label: "R"}),
  Object.freeze({key: "g", label: "G"}),
  Object.freeze({key: "b", label: "B"}),
  Object.freeze({key: "a", label: "A"}),
] as const)
const defaultAxes = Object.freeze(["X", "Y", "Z", "W"] as const)
let nextGeneratedFieldId = 1

export function createField(document: Document, initialDefinition: FieldDefinition): FieldController {
  const initial = normalizeFieldDefinition(initialDefinition)
  const root = document.createElement("div")
  const label = document.createElement("label")
  const labelText = document.createTextNode("")
  const generatedId = nextGeneratedFieldId
  nextGeneratedFieldId += 1
  const controlIdBase = `ui-field-control-${generatedId}`
  const labelId = `ui-field-label-${generatedId}`
  const fieldId = initial.id
  const fieldKind = initial.kind
  let currentDefinition: FieldDefinition = initial
  let disposed = false

  const owner = createKindOwner(document, initial, controlIdBase, labelId, () => currentDefinition)
  label.className = "ui-field__label"
  label.id = labelId
  label.htmlFor = owner.primary.id
  label.appendChild(labelText)
  root.append(label, owner.control)

  const update = (nextDefinition: FieldDefinition): void => {
    if (disposed) throw new Error("Field controller is disposed")
    const next = normalizeFieldDefinition(nextDefinition)
    if (next.id !== fieldId) throw new Error(`Field id cannot change: ${fieldId} -> ${next.id}`)
    if (next.kind !== fieldKind) throw new Error(`Field kind cannot change: ${fieldKind} -> ${next.kind}`)
    root.className = "ui-field"
    root.setAttribute("data-field-id", next.id)
    root.setAttribute("data-field-kind", next.kind)
    root.setAttribute("aria-disabled", String(next.disabled === true))
    if (labelText.data !== next.label) labelText.data = next.label
    syncOptionalTitle(owner.control, next.description)
    currentDefinition = owner.sync(next)
  }

  const refs: FieldRefs = Object.freeze({
    root,
    label,
    labelText,
    control: owner.control,
    primary: owner.primary,
    controlId: owner.primary.id,
    labelId,
    inputs: owner.inputs,
    options: owner.options,
    buttons: owner.buttons,
    items: owner.items,
  })
  const controller: FieldController = Object.freeze({
    element: root,
    refs,
    get definition() { return currentDefinition },
    update,
    dispose() {
      if (disposed) return
      disposed = true
      owner.dispose()
    },
  })
  update(initial)
  return controller
}

function createKindOwner(
  document: Document,
  definition: FieldDefinition,
  controlIdBase: string,
  labelId: string,
  readDefinition: () => FieldDefinition,
): KindOwner {
  if (
    definition.kind === "text" || definition.kind === "number" ||
    definition.kind === "integer" || definition.kind === "boolean" ||
    definition.kind === "readonly"
  ) return createInputOwner(document, definition.kind, controlIdBase, labelId, readDefinition)
  if (definition.kind === "enum") return createEnumOwner(document, controlIdBase, labelId, readDefinition)
  if (definition.kind === "color") return createColorOwner(document, controlIdBase, labelId, readDefinition)
  if (definition.kind === "vector" || definition.kind === "rotation") {
    return createVectorOwner(document, definition, controlIdBase, labelId, readDefinition)
  }
  if (definition.kind === "matrix") return createMatrixOwner(document, definition, controlIdBase, labelId, readDefinition)
  if (definition.kind === "reference") return createReferenceOwner(document, controlIdBase, labelId, readDefinition)
  if (definition.kind === "collection") return createCollectionOwner(document, controlIdBase, labelId, readDefinition)
  return createPathOwner(document, controlIdBase, labelId, readDefinition)
}

function createInputOwner(
  document: Document,
  kind: "text" | "number" | "integer" | "boolean" | "readonly",
  controlId: string,
  labelId: string,
  readDefinition: () => FieldDefinition,
): KindOwner {
  const input = document.createElement("input")
  input.id = controlId
  input.setAttribute("aria-labelledby", labelId)
  const inputs = new Map<string, HTMLInputElement>([["value", input]])
  const listeners: OwnedListener[] = []
  addOwnedListener(listeners, input, kind === "boolean" ? "change" : "input", () => {
    const current = readDefinition()
    if (current.disabled === true || current.readOnly === true || current.kind === "readonly") return
    if (current.kind === "text") current.onChange?.(input.value)
    else if (current.kind === "number") {
      if (Number.isFinite(input.valueAsNumber)) current.onChange?.(input.valueAsNumber)
    } else if (current.kind === "integer") {
      if (Number.isSafeInteger(input.valueAsNumber)) current.onChange?.(input.valueAsNumber)
    } else if (current.kind === "boolean") {
      input.setAttribute("aria-checked", String(input.checked))
      current.onChange?.(input.checked)
    }
  })

  return baseOwner(input, input, inputs, listeners, (definition) => {
    if (definition.kind !== kind) throw new Error(`Expected ${kind} Field definition`)
    input.className = `ui-field__control ui-field__control--${kind}`
    input.setAttribute("name", definition.id)
    input.setAttribute("aria-readonly", String(definition.readOnly === true || kind === "readonly"))
    if (definition.kind === "text") {
      syncInputType(input, "text")
      syncInputValue(input, definition.value)
      syncOptionalAttribute(input, "placeholder", definition.placeholder)
    } else if (definition.kind === "number") {
      syncInputType(input, definition.presentation === "slider" ? "range" : "number")
      syncNumericAttributes(input, definition, "any")
      syncInputNumber(input, definition.value)
    } else if (definition.kind === "integer") {
      syncInputType(input, "number")
      syncNumericAttributes(input, definition, "1")
      syncInputNumber(input, definition.value)
    } else if (definition.kind === "boolean") {
      syncInputType(input, "checkbox")
      if (input.checked !== definition.value) input.checked = definition.value
      if (definition.presentation === "switch") input.setAttribute("role", "switch")
      else input.removeAttribute("role")
      input.setAttribute("aria-checked", String(definition.value))
    } else {
      syncInputType(input, "text")
      syncInputValue(input, String(definition.value))
      syncOptionalAttribute(input, "placeholder", undefined)
    }
    const readOnly = definition.readOnly === true || definition.kind === "readonly"
    if (definition.kind === "boolean") {
      input.readOnly = false
      input.disabled = definition.disabled === true || readOnly
    } else {
      input.readOnly = readOnly
      input.disabled = definition.disabled === true
    }
    if (definition.kind === "number" && definition.presentation === "slider") {
      return Object.freeze({...definition, value: input.valueAsNumber})
    }
    return definition
  })
}

function createEnumOwner(
  document: Document,
  controlId: string,
  labelId: string,
  readDefinition: () => FieldDefinition,
): KindOwner {
  const select = document.createElement("select")
  select.id = controlId
  select.setAttribute("aria-labelledby", labelId)
  const optionEntries = new Map<string, OptionEntry>()
  const options = new Map<string, HTMLOptionElement>()
  const listeners: OwnedListener[] = []
  addOwnedListener(listeners, select, "change", () => {
    const current = readDefinition()
    if (
      current.kind === "enum" && current.disabled !== true && current.readOnly !== true &&
      current.options.some(({value}) => value === select.value)
    ) {
      current.onChange?.(select.value)
    }
  })
  return baseOwner(select, select, new Map(), listeners, (definition) => {
    if (definition.kind !== "enum") throw new Error("Expected enum Field definition")
    select.className = "ui-field__control ui-field__control--enum"
    select.setAttribute("name", definition.id)
    select.setAttribute("aria-readonly", String(definition.readOnly === true))
    const retained = new Set(definition.options.map(({value}) => value))
    for (const [value, entry] of optionEntries) {
      if (retained.has(value)) continue
      entry.element.parentNode?.removeChild(entry.element)
      optionEntries.delete(value)
      options.delete(value)
    }
    const ordered: HTMLOptionElement[] = []
    for (const option of definition.options) {
      let entry = optionEntries.get(option.value)
      if (entry === undefined) {
        const element = document.createElement("option")
        const text = document.createTextNode("")
        element.setAttribute("data-option-value", option.value)
        element.appendChild(text)
        entry = {element, text}
        optionEntries.set(option.value, entry)
        options.set(option.value, element)
      }
      entry.element.value = option.value
      entry.element.disabled = option.disabled === true
      if (entry.text.data !== option.label) entry.text.data = option.label
      ordered.push(entry.element)
    }
    reconcileChildren(select, ordered)
    if (select.value !== definition.value) select.value = definition.value
    select.disabled = definition.disabled === true || definition.readOnly === true
    return definition
  }, {options})
}

function createColorOwner(
  document: Document,
  controlIdBase: string,
  labelId: string,
  readDefinition: () => FieldDefinition,
): KindOwner {
  const group = document.createElement("div")
  group.className = "ui-field__group ui-field__row ui-field__color"
  group.setAttribute("role", "group")
  group.setAttribute("aria-labelledby", labelId)
  const inputs = new Map<string, HTMLInputElement>()
  const listeners: OwnedListener[] = []
  let primary: HTMLInputElement | null = null
  for (const channel of colorChannels) {
    const entry = createNumericCell(document, controlIdBase, channel.key, channel.label, labelId, () => {
      const current = readDefinition()
      if (current.kind !== "color" || current.disabled === true || current.readOnly === true) return
      const value = readColorInputs(inputs)
      if (value !== null) current.onChange?.(value)
    })
    inputs.set(channel.key, entry.input)
    listeners.push(entry.listener)
    group.appendChild(entry.element)
    primary ??= entry.input
  }
  if (primary === null) throw new Error("Color Field must own one input")
  return baseOwner(group, primary, inputs, listeners, (definition) => {
    if (definition.kind !== "color") throw new Error("Expected color Field definition")
    group.setAttribute("aria-readonly", String(definition.readOnly === true))
    for (const channel of colorChannels) {
      const input = inputs.get(channel.key)!
      syncInputType(input, "number")
      input.min = "0"
      input.max = "1"
      input.step = "0.01"
      syncInputNumber(input, definition.value[channel.key])
      input.readOnly = definition.readOnly === true
      input.disabled = definition.disabled === true
    }
    return definition
  })
}

function createVectorOwner(
  document: Document,
  initial: VectorFieldDefinition | RotationFieldDefinition,
  controlIdBase: string,
  labelId: string,
  readDefinition: () => FieldDefinition,
): KindOwner {
  const kind = initial.kind
  const group = document.createElement("div")
  group.className = `ui-field__group ui-field__${kind}`
  group.setAttribute("role", "group")
  group.setAttribute("aria-labelledby", labelId)
  const entries = new Map<string, NumericCellEntry>()
  const inputs = new Map<string, HTMLInputElement>()
  const listeners: OwnedListener[] = []
  const first = createNumericCell(
    document,
    controlIdBase,
    "0",
    initial.axes?.[0] ?? defaultAxes[0],
    labelId,
    () => {
      const current = readDefinition()
      if (current.kind !== kind || current.disabled === true || current.readOnly === true) return
      const values = readVectorInputs(inputs, current.numberKind === "integer")
      if (values !== null) current.onChange?.(values)
    },
  )
  entries.set("0", first)
  inputs.set("0", first.input)
  listeners.push(first.listener)
  group.appendChild(first.element)
  const primary = first.input

  return baseOwner(group, primary, inputs, listeners, (definition) => {
    if (definition.kind !== kind) throw new Error(`Expected ${kind} Field definition`)
    group.setAttribute("aria-readonly", String(definition.readOnly === true))
    const dimensions = definition.dimensions ?? definition.value.length as FieldVectorDimension
    const retained = new Set(Array.from({length: dimensions}, (_, index) => String(index)))
    for (const [key, entry] of entries) {
      if (retained.has(key)) continue
      detachNumericEntry(key, entry, inputs, listeners)
      entry.element.parentNode?.removeChild(entry.element)
      entries.delete(key)
    }
    const ordered: HTMLLabelElement[] = []
    for (let index = 0; index < dimensions; index += 1) {
      const key = String(index)
      let entry = entries.get(key)
      if (entry === undefined) {
        entry = createNumericCell(
          document,
          controlIdBase,
          key,
          definition.axes?.[index] ?? defaultAxes[index] ?? key,
          labelId,
          () => {
            const current = readDefinition()
            if (current.kind !== kind || current.disabled === true || current.readOnly === true) return
            const values = readVectorInputs(inputs, current.numberKind === "integer")
            if (values !== null) current.onChange?.(values)
          },
        )
        entries.set(key, entry)
        inputs.set(key, entry.input)
        listeners.push(entry.listener)
      }
      const axis = definition.axes?.[index] ?? defaultAxes[index] ?? key
      if (entry.labelText.data !== axis) entry.labelText.data = axis
      syncInputType(entry.input, "number")
      syncNumericAttributes(entry.input, definition, definition.numberKind === "integer" ? "1" : "any")
      syncInputNumber(entry.input, definition.value[index]!)
      entry.input.readOnly = definition.readOnly === true
      entry.input.disabled = definition.disabled === true
      ordered.push(entry.element)
    }
    reconcileChildren(group, ordered)
    return definition
  })
}

function createMatrixOwner(
  document: Document,
  _initial: MatrixFieldDefinition,
  controlIdBase: string,
  labelId: string,
  readDefinition: () => FieldDefinition,
): KindOwner {
  const matrix = document.createElement("div")
  matrix.className = "ui-field__matrix"
  matrix.setAttribute("role", "group")
  matrix.setAttribute("aria-labelledby", labelId)
  const rows = new Map<string, MatrixRowEntry>()
  const inputs = new Map<string, HTMLInputElement>()
  const listeners: OwnedListener[] = []
  const firstRow: MatrixRowEntry = {element: document.createElement("div"), cells: new Map()}
  firstRow.element.className = "ui-field__row"
  firstRow.element.setAttribute("data-matrix-row", "0")
  const first = createNumericCell(document, controlIdBase, "0-0", "1:1", labelId, () => {
    const current = readDefinition()
    if (current.kind !== "matrix" || current.disabled === true || current.readOnly === true) return
    const value = readMatrixInputs(inputs, current.value.length)
    if (value !== null) current.onChange?.(value)
  })
  firstRow.cells.set("0:0", first)
  firstRow.element.appendChild(first.element)
  rows.set("0", firstRow)
  inputs.set("0:0", first.input)
  listeners.push(first.listener)
  matrix.appendChild(firstRow.element)
  const primary = first.input

  return baseOwner(matrix, primary, inputs, listeners, (definition) => {
    if (definition.kind !== "matrix") throw new Error("Expected matrix Field definition")
    matrix.setAttribute("aria-readonly", String(definition.readOnly === true))
    const size = definition.value.length
    const retainedRows = new Set(Array.from({length: size}, (_, row) => String(row)))
    for (const [rowKey, rowEntry] of rows) {
      if (retainedRows.has(rowKey)) continue
      disposeNumericEntries(rowEntry.cells, inputs, listeners)
      rowEntry.element.parentNode?.removeChild(rowEntry.element)
      rows.delete(rowKey)
    }
    const orderedRows: HTMLDivElement[] = []
    for (let row = 0; row < size; row += 1) {
      const rowKey = String(row)
      let rowEntry = rows.get(rowKey)
      if (rowEntry === undefined) {
        rowEntry = {element: document.createElement("div"), cells: new Map()}
        rowEntry.element.className = "ui-field__row"
        rowEntry.element.setAttribute("data-matrix-row", rowKey)
        rows.set(rowKey, rowEntry)
      }
      const orderedCells: HTMLLabelElement[] = []
      for (let column = 0; column < size; column += 1) {
        const key = `${row}:${column}`
        let entry = rowEntry.cells.get(key)
        if (entry === undefined) {
          entry = createNumericCell(
            document,
            controlIdBase,
            key.replace(":", "-"),
            `${row + 1}:${column + 1}`,
            labelId,
            () => {
              const current = readDefinition()
              if (current.kind !== "matrix" || current.disabled === true || current.readOnly === true) return
              const value = readMatrixInputs(inputs, current.value.length)
              if (value !== null) current.onChange?.(value)
            },
          )
          rowEntry.cells.set(key, entry)
          inputs.set(key, entry.input)
          listeners.push(entry.listener)
        }
        syncInputType(entry.input, "number")
        entry.input.step = "any"
        syncInputNumber(entry.input, definition.value[row]![column]!)
        entry.input.readOnly = definition.readOnly === true
        entry.input.disabled = definition.disabled === true
        orderedCells.push(entry.element)
      }
      for (const [key, entry] of [...rowEntry.cells]) {
        const column = Number(key.split(":")[1])
        if (column < size) continue
        detachNumericEntry(key, entry, inputs, listeners)
        rowEntry.cells.delete(key)
      }
      reconcileChildren(rowEntry.element, orderedCells)
      orderedRows.push(rowEntry.element)
    }
    reconcileChildren(matrix, orderedRows)
    return definition
  }, {
    disposeExtra() {
      for (const row of rows.values()) disposeNumericEntries(row.cells, inputs, listeners)
      rows.clear()
    },
  })
}

function createReferenceOwner(
  document: Document,
  controlId: string,
  labelId: string,
  readDefinition: () => FieldDefinition,
): KindOwner {
  const group = document.createElement("div")
  group.className = "ui-field__reference"
  group.setAttribute("aria-labelledby", labelId)
  const activate = createButton(document, controlId, "activate", "")
  const pick = createButton(document, `${controlId}-pick`, "pick", "…")
  const clear = createButton(document, `${controlId}-clear`, "clear", "×")
  activate.element.className += " ui-field__button--primary"
  group.append(activate.element, pick.element, clear.element)
  const buttons = new Map<string, HTMLButtonElement>([
    ["activate", activate.element],
    ["pick", pick.element],
    ["clear", clear.element],
  ])
  const listeners: OwnedListener[] = []
  addOwnedListener(listeners, activate.element, "click", () => {
    const current = readDefinition()
    if (current.kind === "reference") current.onActivate?.()
  })
  addOwnedListener(listeners, pick.element, "click", () => {
    const current = readDefinition()
    if (current.kind === "reference") current.onPick?.()
  })
  addOwnedListener(listeners, clear.element, "click", () => {
    const current = readDefinition()
    if (current.kind === "reference") current.onClear?.()
  })
  return baseOwner(group, activate.element, new Map(), listeners, (definition) => {
    if (definition.kind !== "reference") throw new Error("Expected reference Field definition")
    const blocked = definition.disabled === true || definition.readOnly === true
    const text = definition.value?.label ?? definition.placeholder ?? "Не выбрано"
    if (activate.text.data !== text) activate.text.data = text
    activate.element.disabled = definition.disabled === true || definition.onActivate === undefined
    pick.element.disabled = blocked || definition.onPick === undefined
    clear.element.disabled = blocked || definition.value === null || definition.onClear === undefined
    syncOptionalTitle(activate.element, definition.value?.kind ?? definition.description)
    pick.element.title = "Выбрать"
    clear.element.title = "Очистить"
    group.setAttribute("aria-readonly", String(definition.readOnly === true))
    return definition
  }, {buttons})
}

function createPathOwner(
  document: Document,
  controlId: string,
  labelId: string,
  readDefinition: () => FieldDefinition,
): KindOwner {
  const group = document.createElement("div")
  group.className = "ui-field__path"
  group.setAttribute("aria-labelledby", labelId)
  const input = document.createElement("input")
  input.id = controlId
  input.className = "ui-field__input"
  input.setAttribute("aria-labelledby", labelId)
  const browse = createButton(document, `${controlId}-browse`, "browse", "Обзор")
  group.append(input, browse.element)
  const inputs = new Map<string, HTMLInputElement>([["value", input]])
  const buttons = new Map<string, HTMLButtonElement>([["browse", browse.element]])
  const listeners: OwnedListener[] = []
  addOwnedListener(listeners, input, "input", () => {
    const current = readDefinition()
    if (current.kind === "path" && current.disabled !== true && current.readOnly !== true) current.onChange?.(input.value)
  })
  addOwnedListener(listeners, browse.element, "click", () => {
    const current = readDefinition()
    if (current.kind === "path") current.onBrowse?.()
  })
  return baseOwner(group, input, inputs, listeners, (definition) => {
    if (definition.kind !== "path") throw new Error("Expected path Field definition")
    syncInputType(input, "text")
    syncInputValue(input, definition.value)
    syncOptionalAttribute(input, "placeholder", definition.placeholder)
    input.readOnly = definition.readOnly === true
    input.disabled = definition.disabled === true
    browse.element.disabled = definition.disabled === true || definition.readOnly === true || definition.onBrowse === undefined
    group.setAttribute("aria-readonly", String(definition.readOnly === true))
    return definition
  }, {buttons})
}

function createCollectionOwner(
  document: Document,
  controlIdBase: string,
  labelId: string,
  readDefinition: () => FieldDefinition,
): KindOwner {
  const control = document.createElement("div")
  control.className = "ui-field__collection ui-field__row"
  const list = document.createElement("ul")
  list.className = "ui-field__list"
  list.setAttribute("role", "listbox")
  list.setAttribute("aria-labelledby", labelId)
  const actions = document.createElement("div")
  actions.className = "ui-field__actions"
  const add = createButton(document, controlIdBase, "add", "+")
  const remove = createButton(document, `${controlIdBase}-remove`, "remove", "−")
  const up = createButton(document, `${controlIdBase}-up`, "up", "↑")
  const down = createButton(document, `${controlIdBase}-down`, "down", "↓")
  actions.append(add.element, remove.element, up.element, down.element)
  control.append(list, actions)
  const empty = document.createElement("li")
  const emptyText = document.createTextNode("")
  empty.className = "ui-field__empty"
  empty.appendChild(emptyText)
  const entries = new Map<string, CollectionEntry>()
  const items = new Map<string, HTMLElement>()
  const buttons = new Map<string, HTMLButtonElement>([
    ["add", add.element],
    ["remove", remove.element],
    ["up", up.element],
    ["down", down.element],
  ])
  const listeners: OwnedListener[] = []
  addOwnedListener(listeners, add.element, "click", () => {
    const current = readDefinition()
    if (current.kind === "collection") current.onAdd?.()
  })
  addOwnedListener(listeners, remove.element, "click", () => {
    const current = readDefinition()
    if (current.kind === "collection" && current.selectedId !== null) current.onRemove?.(current.selectedId)
  })
  addOwnedListener(listeners, up.element, "click", () => {
    const current = readDefinition()
    if (current.kind === "collection" && current.selectedId !== null) current.onMove?.(current.selectedId, "up")
  })
  addOwnedListener(listeners, down.element, "click", () => {
    const current = readDefinition()
    if (current.kind === "collection" && current.selectedId !== null) current.onMove?.(current.selectedId, "down")
  })

  return baseOwner(control, add.element, new Map(), listeners, (definition) => {
    if (definition.kind !== "collection") throw new Error("Expected collection Field definition")
    const blocked = definition.disabled === true || definition.readOnly === true
    const retained = new Set(definition.items.map(({id}) => id))
    for (const [id, entry] of entries) {
      if (retained.has(id)) continue
      removeOwnedListener(entry.listener)
      entry.element.parentNode?.removeChild(entry.element)
      entries.delete(id)
      items.delete(id)
      buttons.delete(`item:${id}`)
      removeListenerEntry(listeners, entry.listener)
    }
    const ordered: HTMLLIElement[] = []
    for (const item of definition.items) {
      let entry = entries.get(item.id)
      if (entry === undefined) {
        const element = document.createElement("li")
        const button = document.createElement("button")
        const text = document.createTextNode("")
        element.className = "ui-field__item"
        element.setAttribute("data-item-id", item.id)
        button.className = "ui-field__button ui-field__item-button"
        button.setAttribute("role", "option")
        button.appendChild(text)
        element.appendChild(button)
        const itemId = item.id
        const listener = ownedListener(button, "click", () => {
          const current = readDefinition()
          if (current.kind === "collection") current.onSelect?.(itemId)
        })
        button.addEventListener(listener.type, listener.listener)
        entry = {element, button, text, listener}
        entries.set(item.id, entry)
        items.set(item.id, element)
        buttons.set(`item:${item.id}`, button)
        listeners.push(listener)
      }
      if (entry.text.data !== item.label) entry.text.data = item.label
      entry.button.setAttribute("aria-selected", String(definition.selectedId === item.id))
      entry.button.setAttribute("aria-disabled", String(item.disabled === true))
      entry.button.disabled = blocked || item.disabled === true || definition.onSelect === undefined
      syncOptionalTitle(entry.button, item.description)
      ordered.push(entry.element)
    }
    if (ordered.length === 0) {
      const text = definition.emptyLabel ?? "Пусто"
      if (emptyText.data !== text) emptyText.data = text
      reconcileChildren(list, [empty])
    } else reconcileChildren(list, ordered)

    const selectedIndex = definition.selectedId === null
      ? -1
      : definition.items.findIndex(({id}) => id === definition.selectedId)
    const selected = selectedIndex < 0 ? undefined : definition.items[selectedIndex]
    add.element.disabled = blocked || definition.onAdd === undefined
    remove.element.disabled = blocked || selected === undefined || selected.disabled === true || definition.onRemove === undefined
    up.element.disabled = blocked || selected === undefined || selected.disabled === true || selectedIndex <= 0 || definition.onMove === undefined
    down.element.disabled = blocked || selected === undefined || selected.disabled === true || selectedIndex >= definition.items.length - 1 || definition.onMove === undefined
    list.setAttribute("aria-readonly", String(definition.readOnly === true))
    list.setAttribute("data-visible-rows", String(definition.visibleRows ?? 3))
    return definition
  }, {
    buttons,
    items,
    disposeExtra() { entries.clear() },
  })
}

function baseOwner(
  control: FieldControl,
  primary: HTMLElement,
  inputs: Map<string, HTMLInputElement>,
  listeners: OwnedListener[],
  sync: (definition: FieldDefinition) => FieldDefinition,
  extra: Readonly<{
    options?: Map<string, HTMLOptionElement>
    buttons?: Map<string, HTMLButtonElement>
    items?: Map<string, HTMLElement>
    disposeExtra?(): void
  }> = {},
): KindOwner {
  let blocked = false
  const projections = new Map<HTMLElement, VisualStateProjection>()
  const syncWithVisualState = (definition: FieldDefinition): FieldDefinition => {
    const result = sync(definition)
    blocked = definition.disabled === true || definition.readOnly === true
    const elements = new Set<HTMLElement>([primary, ...inputs.values(), ...(extra.buttons?.values() ?? [])])
    for (const [element, projection] of projections) {
      if (elements.has(element)) continue
      projection.dispose()
      projections.delete(element)
    }
    for (const element of elements) {
      let projection = projections.get(element)
      if (projection === undefined) {
        projection = projectVisualState(element, () => blocked || element.hasAttribute("disabled"))
        projections.set(element, projection)
      }
      projection.sync()
    }
    return result
  }
  return Object.freeze({
    control,
    primary,
    inputs,
    options: extra.options ?? new Map(),
    buttons: extra.buttons ?? new Map(),
    items: extra.items ?? new Map(),
    sync: syncWithVisualState,
    dispose() {
      for (const listener of [...listeners]) removeOwnedListener(listener)
      listeners.length = 0
      for (const projection of projections.values()) projection.dispose()
      projections.clear()
      extra.disposeExtra?.()
    },
  })
}

function createNumericCell(
  document: Document,
  controlIdBase: string,
  key: string,
  labelValue: string,
  fieldLabelId: string,
  onInput: () => void,
): NumericCellEntry {
  const element = document.createElement("label")
  const label = document.createElement("span")
  const labelText = document.createTextNode(labelValue)
  const input = document.createElement("input")
  const id = `${controlIdBase}-${key}`
  const cellLabelId = `${id}-label`
  element.className = "ui-field__cell"
  element.htmlFor = id
  element.setAttribute("data-field-key", key)
  label.className = "ui-field__cell-label"
  label.id = cellLabelId
  label.appendChild(labelText)
  input.id = id
  input.className = "ui-field__input"
  input.setAttribute("aria-labelledby", `${fieldLabelId} ${cellLabelId}`)
  element.append(label, input)
  const listener = ownedListener(input, "input", onInput)
  input.addEventListener(listener.type, listener.listener)
  return {element, label, labelText, input, listener}
}

function createButton(
  document: Document,
  id: string,
  key: string,
  label: string,
): Readonly<{element: HTMLButtonElement; text: Text}> {
  const element = document.createElement("button")
  const text = document.createTextNode(label)
  element.id = id
  element.className = "ui-field__button"
  element.setAttribute("data-action", key)
  element.appendChild(text)
  return {element, text}
}

export function normalizeFieldDefinition(definition: FieldDefinition): FieldDefinition {
  if (typeof definition !== "object" || definition === null) {
    throw new TypeError("Field definition must be an object")
  }
  const base = normalizeBase(definition)
  if (definition.kind === "text") {
    assertString(definition.value, "Text Field value")
    if (definition.placeholder !== undefined) assertString(definition.placeholder, "Text Field placeholder")
    assertOptionalFunction(definition.onChange, "Text Field onChange")
    return Object.freeze({...base, kind: "text", value: definition.value, ...optional("placeholder", definition.placeholder), ...optional("onChange", definition.onChange)})
  }
  if (definition.kind === "number") {
    const range = normalizeNumericRange(definition, "Number Field", false)
    assertFinite(definition.value, "Number Field value")
    if (definition.presentation !== undefined && definition.presentation !== "input" && definition.presentation !== "slider") {
      throw new TypeError("Number Field presentation must be input or slider")
    }
    assertOptionalFunction(definition.onChange, "Number Field onChange")
    return Object.freeze({...base, kind: "number", value: definition.value, presentation: definition.presentation ?? "input", ...range, ...optional("onChange", definition.onChange)})
  }
  if (definition.kind === "integer") {
    const range = normalizeNumericRange(definition, "Integer Field", true)
    assertInteger(definition.value, "Integer Field value")
    assertOptionalFunction(definition.onChange, "Integer Field onChange")
    return Object.freeze({...base, kind: "integer", value: definition.value, ...range, ...optional("onChange", definition.onChange)})
  }
  if (definition.kind === "boolean") {
    assertBoolean(definition.value, "Boolean Field value")
    if (definition.presentation !== undefined && definition.presentation !== "checkbox" && definition.presentation !== "switch") {
      throw new TypeError("Boolean Field presentation must be checkbox or switch")
    }
    assertOptionalFunction(definition.onChange, "Boolean Field onChange")
    return Object.freeze({...base, kind: "boolean", value: definition.value, presentation: definition.presentation ?? "checkbox", ...optional("onChange", definition.onChange)})
  }
  if (definition.kind === "enum") return normalizeEnumDefinition(base, definition)
  if (definition.kind === "color") {
    assertOptionalFunction(definition.onChange, "Color Field onChange")
    return Object.freeze({...base, kind: "color", value: normalizeColor(definition.value), ...optional("onChange", definition.onChange)})
  }
  if (definition.kind === "vector" || definition.kind === "rotation") {
    return normalizeVectorDefinition(base, definition)
  }
  if (definition.kind === "matrix") {
    assertOptionalFunction(definition.onChange, "Matrix Field onChange")
    return Object.freeze({...base, kind: "matrix", value: normalizeMatrix(definition.value), ...optional("onChange", definition.onChange)})
  }
  if (definition.kind === "reference") return normalizeReferenceDefinition(base, definition)
  if (definition.kind === "collection") return normalizeCollectionDefinition(base, definition)
  if (definition.kind === "path") {
    assertString(definition.value, "Path Field value")
    if (definition.placeholder !== undefined) assertString(definition.placeholder, "Path Field placeholder")
    assertOptionalFunction(definition.onChange, "Path Field onChange")
    assertOptionalFunction(definition.onBrowse, "Path Field onBrowse")
    return Object.freeze({...base, kind: "path", value: definition.value, ...optional("placeholder", definition.placeholder), ...optional("onChange", definition.onChange), ...optional("onBrowse", definition.onBrowse)})
  }
  if (definition.kind === "readonly") {
    if (typeof definition.value !== "string") assertFinite(definition.value, "Readonly Field value")
    return Object.freeze({...base, kind: "readonly", value: definition.value, readOnly: true})
  }
  throw new Error(`Unknown Field kind: ${String((definition as {kind?: unknown}).kind)}`)
}

function normalizeEnumDefinition(base: FieldBase, definition: EnumFieldDefinition): EnumFieldDefinition {
  assertString(definition.value, "Enum Field value")
  if (!Array.isArray(definition.options) || definition.options.length === 0) {
    throw new TypeError("Enum Field options must be a non-empty array")
  }
  const values = new Set<string>()
  const options = definition.options.map((option) => {
    if (typeof option !== "object" || option === null) throw new TypeError("Enum Field option must be an object")
    assertNonEmpty(option.value, "Enum Field option value")
    if (values.has(option.value)) throw new Error(`Enum Field option value must be unique: ${option.value}`)
    values.add(option.value)
    assertString(option.label, `Enum Field option ${option.value} label`)
    if (option.disabled !== undefined) assertBoolean(option.disabled, `Enum Field option ${option.value} disabled`)
    return Object.freeze({value: option.value, label: option.label, disabled: option.disabled === true})
  })
  if (!values.has(definition.value)) throw new Error(`Enum Field selected value does not exist: ${definition.value}`)
  assertOptionalFunction(definition.onChange, "Enum Field onChange")
  return Object.freeze({...base, kind: "enum", value: definition.value, options: Object.freeze(options), ...optional("onChange", definition.onChange)})
}

function normalizeVectorDefinition(
  base: FieldBase,
  definition: VectorFieldDefinition | RotationFieldDefinition,
): VectorFieldDefinition | RotationFieldDefinition {
  if (!Array.isArray(definition.value)) throw new TypeError(`${capitalize(definition.kind)} Field value must be an array`)
  const dimensions = definition.dimensions ?? definition.value.length
  if (dimensions !== 2 && dimensions !== 3 && dimensions !== 4) {
    throw new RangeError(`${capitalize(definition.kind)} Field dimensions must be 2, 3 or 4`)
  }
  if (definition.value.length !== dimensions) {
    throw new RangeError(`${capitalize(definition.kind)} Field value length must equal dimensions`)
  }
  if (definition.axes !== undefined) {
    if (!Array.isArray(definition.axes) || definition.axes.length !== dimensions) {
      throw new RangeError(`${capitalize(definition.kind)} Field axes length must equal dimensions`)
    }
    for (const axis of definition.axes) assertNonEmpty(axis, `${capitalize(definition.kind)} Field axis`)
  }
  if (definition.numberKind !== undefined && definition.numberKind !== "float" && definition.numberKind !== "integer") {
    throw new TypeError(`${capitalize(definition.kind)} Field numberKind must be float or integer`)
  }
  const integer = definition.numberKind === "integer"
  const values = definition.value.map((value, index) => {
    if (integer) assertInteger(value, `${capitalize(definition.kind)} Field value ${index}`)
    else assertFinite(value, `${capitalize(definition.kind)} Field value ${index}`)
    return value
  })
  const range = normalizeNumericRange(definition, `${capitalize(definition.kind)} Field`, integer)
  assertOptionalFunction(definition.onChange, `${capitalize(definition.kind)} Field onChange`)
  return Object.freeze({
    ...base,
    kind: definition.kind,
    value: Object.freeze(values),
    dimensions,
    axes: Object.freeze([...(definition.axes ?? defaultAxes.slice(0, dimensions))]),
    numberKind: definition.numberKind ?? "float",
    ...range,
    ...optional("onChange", definition.onChange),
  })
}

function normalizeMatrix(value: readonly (readonly number[])[]): readonly (readonly number[])[] {
  if (!Array.isArray(value)) throw new TypeError("Matrix Field value must be an array")
  const size = value.length
  if (size !== 2 && size !== 3 && size !== 4) throw new RangeError("Matrix Field size must be 2, 3 or 4")
  return Object.freeze(value.map((row, rowIndex) => {
    if (!Array.isArray(row) || row.length !== size) throw new RangeError("Matrix Field value must be square")
    return Object.freeze(row.map((entry, columnIndex) => {
      assertFinite(entry, `Matrix Field value ${rowIndex}:${columnIndex}`)
      return entry
    }))
  }))
}

function normalizeReferenceDefinition(base: FieldBase, definition: ReferenceFieldDefinition): ReferenceFieldDefinition {
  let value: FieldReference | null = null
  if (definition.value !== null) {
    if (typeof definition.value !== "object") throw new TypeError("Reference Field value must be an object or null")
    assertNonEmpty(definition.value.id, "Reference Field value id")
    assertString(definition.value.label, "Reference Field value label")
    if (definition.value.kind !== undefined) assertString(definition.value.kind, "Reference Field value kind")
    value = Object.freeze({id: definition.value.id, label: definition.value.label, ...optional("kind", definition.value.kind)})
  }
  if (definition.placeholder !== undefined) assertString(definition.placeholder, "Reference Field placeholder")
  assertOptionalFunction(definition.onActivate, "Reference Field onActivate")
  assertOptionalFunction(definition.onPick, "Reference Field onPick")
  assertOptionalFunction(definition.onClear, "Reference Field onClear")
  return Object.freeze({
    ...base,
    kind: "reference",
    value,
    ...optional("placeholder", definition.placeholder),
    ...optional("onActivate", definition.onActivate),
    ...optional("onPick", definition.onPick),
    ...optional("onClear", definition.onClear),
  })
}

function normalizeCollectionDefinition(base: FieldBase, definition: CollectionFieldDefinition): CollectionFieldDefinition {
  if (!Array.isArray(definition.items)) throw new TypeError("Collection Field items must be an array")
  const ids = new Set<string>()
  const items = definition.items.map((item) => {
    if (typeof item !== "object" || item === null) throw new TypeError("Collection Field item must be an object")
    assertNonEmpty(item.id, "Collection Field item id")
    if (ids.has(item.id)) throw new Error(`Collection Field item id must be unique: ${item.id}`)
    ids.add(item.id)
    assertString(item.label, `Collection Field item ${item.id} label`)
    if (item.description !== undefined) assertString(item.description, `Collection Field item ${item.id} description`)
    if (item.disabled !== undefined) assertBoolean(item.disabled, `Collection Field item ${item.id} disabled`)
    return Object.freeze({
      id: item.id,
      label: item.label,
      ...optional("description", item.description),
      disabled: item.disabled === true,
    })
  })
  if (definition.selectedId !== null) {
    assertNonEmpty(definition.selectedId, "Collection Field selectedId")
    if (!ids.has(definition.selectedId)) throw new Error(`Collection Field selected item does not exist: ${definition.selectedId}`)
  }
  if (definition.visibleRows !== undefined && (!Number.isSafeInteger(definition.visibleRows) || definition.visibleRows < 1 || definition.visibleRows > 8)) {
    throw new RangeError("Collection Field visibleRows must be an integer from 1 to 8")
  }
  if (definition.emptyLabel !== undefined) assertString(definition.emptyLabel, "Collection Field emptyLabel")
  assertOptionalFunction(definition.onSelect, "Collection Field onSelect")
  assertOptionalFunction(definition.onAdd, "Collection Field onAdd")
  assertOptionalFunction(definition.onRemove, "Collection Field onRemove")
  assertOptionalFunction(definition.onMove, "Collection Field onMove")
  return Object.freeze({
    ...base,
    kind: "collection",
    items: Object.freeze(items),
    selectedId: definition.selectedId,
    visibleRows: definition.visibleRows ?? 3,
    ...optional("emptyLabel", definition.emptyLabel),
    ...optional("onSelect", definition.onSelect),
    ...optional("onAdd", definition.onAdd),
    ...optional("onRemove", definition.onRemove),
    ...optional("onMove", definition.onMove),
  })
}

function normalizeBase(definition: FieldBase): FieldBase {
  assertNonEmpty(definition.id, "Field id")
  assertNonEmpty(definition.label, "Field label")
  if (definition.description !== undefined) assertString(definition.description, "Field description")
  if (definition.disabled !== undefined) assertBoolean(definition.disabled, "Field disabled")
  if (definition.readOnly !== undefined) assertBoolean(definition.readOnly, "Field readOnly")
  return Object.freeze({
    id: definition.id,
    label: definition.label,
    ...optional("description", definition.description),
    disabled: definition.disabled === true,
    readOnly: definition.readOnly === true,
  })
}

function normalizeNumericRange(
  definition: Readonly<{min?: number; max?: number; step?: number}>,
  owner: string,
  integer: boolean,
): Readonly<{min?: number; max?: number; step?: number}> {
  for (const [name, value] of [["min", definition.min], ["max", definition.max], ["step", definition.step]] as const) {
    if (value === undefined) continue
    if (integer) assertInteger(value, `${owner} ${name}`)
    else assertFinite(value, `${owner} ${name}`)
  }
  if (definition.step !== undefined && definition.step <= 0) throw new RangeError(`${owner} step must be greater than zero`)
  if (definition.min !== undefined && definition.max !== undefined && definition.max < definition.min) {
    throw new RangeError(`${owner} max must be greater than or equal to min`)
  }
  return Object.freeze({...optional("min", definition.min), ...optional("max", definition.max), ...optional("step", definition.step)})
}

function normalizeColor(value: FieldColor): FieldColor {
  if (typeof value !== "object" || value === null) throw new TypeError("Color Field value must be an object")
  for (const channel of colorChannels) {
    assertFinite(value[channel.key], `Color Field ${channel.key}`)
    if (value[channel.key] < 0 || value[channel.key] > 1) {
      throw new RangeError(`Color Field ${channel.key} must be from 0 to 1`)
    }
  }
  return Object.freeze({r: value.r, g: value.g, b: value.b, a: value.a})
}

function readColorInputs(inputs: ReadonlyMap<string, HTMLInputElement>): FieldColor | null {
  const value = {
    r: inputs.get("r")!.valueAsNumber,
    g: inputs.get("g")!.valueAsNumber,
    b: inputs.get("b")!.valueAsNumber,
    a: inputs.get("a")!.valueAsNumber,
  }
  if (Object.values(value).some((channel) => !Number.isFinite(channel) || channel < 0 || channel > 1)) return null
  return Object.freeze(value)
}

function readVectorInputs(inputs: ReadonlyMap<string, HTMLInputElement>, integer: boolean): readonly number[] | null {
  const value = [...inputs.entries()]
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([, input]) => input.valueAsNumber)
  if (value.some((entry) => integer ? !Number.isSafeInteger(entry) : !Number.isFinite(entry))) return null
  return Object.freeze(value)
}

function readMatrixInputs(inputs: ReadonlyMap<string, HTMLInputElement>, size: number): readonly (readonly number[])[] | null {
  const value = Array.from({length: size}, (_, row) =>
    Array.from({length: size}, (_, column) => inputs.get(`${row}:${column}`)!.valueAsNumber))
  if (value.some((row) => row.some((entry) => !Number.isFinite(entry)))) return null
  return Object.freeze(value.map((row) => Object.freeze(row)))
}

function detachNumericEntry(
  key: string,
  entry: NumericCellEntry,
  inputs: Map<string, HTMLInputElement>,
  listeners: OwnedListener[],
): void {
  removeOwnedListener(entry.listener)
  inputs.delete(key)
  removeListenerEntry(listeners, entry.listener)
}

function disposeNumericEntries(
  entries: Map<string, NumericCellEntry>,
  inputs: Map<string, HTMLInputElement>,
  listeners: OwnedListener[],
): void {
  for (const [key, entry] of entries) detachNumericEntry(key, entry, inputs, listeners)
  entries.clear()
}

function syncNumericAttributes(
  input: HTMLInputElement,
  definition: Readonly<{min?: number; max?: number; step?: number}>,
  defaultStep: string,
): void {
  syncOptionalAttribute(input, "min", definition.min === undefined ? undefined : String(definition.min))
  syncOptionalAttribute(input, "max", definition.max === undefined ? undefined : String(definition.max))
  input.step = definition.step === undefined ? defaultStep : String(definition.step)
}

function syncInputType(input: HTMLInputElement, type: "text" | "number" | "range" | "checkbox"): void {
  if (input.type !== type) input.type = type
}

function syncInputValue(input: HTMLInputElement, value: string): void {
  if (input.value !== value) input.value = value
}

function syncInputNumber(input: HTMLInputElement, value: number): void {
  if (input.valueAsNumber !== value) input.valueAsNumber = value
}

function syncOptionalTitle(element: HTMLElement, value: string | undefined): void {
  if (value === undefined) {
    if (element.hasAttribute("title")) element.removeAttribute("title")
    return
  }
  if (element.title !== value || !element.hasAttribute("title")) element.title = value
}

function syncOptionalAttribute(element: HTMLElement, name: string, value: string | undefined): void {
  if (value === undefined) {
    if (element.hasAttribute(name)) element.removeAttribute(name)
    return
  }
  if (element.getAttribute(name) !== value) element.setAttribute(name, value)
}

function reconcileChildren(parent: Node, ordered: readonly Node[]): void {
  const retained = new Set(ordered)
  for (const child of [...parent.childNodes]) {
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

function addOwnedListener(
  listeners: OwnedListener[],
  element: HTMLElement,
  type: string,
  listener: (event: DomEvent) => void,
): void {
  const entry = ownedListener(element, type, listener)
  element.addEventListener(type, listener)
  listeners.push(entry)
}

function ownedListener(
  element: HTMLElement,
  type: string,
  listener: (event: DomEvent) => void,
): OwnedListener {
  return Object.freeze({element, type, listener})
}

function removeOwnedListener(listener: OwnedListener): void {
  listener.element.removeEventListener(listener.type, listener.listener)
}

function removeListenerEntry(listeners: OwnedListener[], listener: OwnedListener): void {
  const index = listeners.indexOf(listener)
  if (index >= 0) listeners.splice(index, 1)
}

function optional<Key extends string, Value>(key: Key, value: Value | undefined): {} | Record<Key, Value> {
  return value === undefined ? {} : {[key]: value} as Record<Key, Value>
}

function capitalize(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`
}

function assertNonEmpty(value: unknown, label: string): asserts value is string {
  assertString(value, label)
  if (value.trim().length === 0) throw new TypeError(`${label} must not be empty`)
}

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string") throw new TypeError(`${label} must be a string`)
}

function assertFinite(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(`${label} must be finite`)
}

function assertInteger(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new TypeError(`${label} must be an integer`)
}

function assertBoolean(value: unknown, label: string): asserts value is boolean {
  if (typeof value !== "boolean") throw new TypeError(`${label} must be a boolean`)
}

function assertOptionalFunction(value: unknown, label: string): void {
  if (value !== undefined && typeof value !== "function") throw new TypeError(`${label} must be a function`)
}
