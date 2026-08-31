import type {
  Document,
  HTMLButtonElement,
  HTMLDivElement,
  HTMLInputElement,
  HTMLOptionElement,
  HTMLSelectElement,
  HTMLElement,
  Text,
} from "@zavx0z/dom"

export type ParameterControlType = "text" | "number" | "checkbox" | "select"
export type ParameterVariant = "field" | "input" | "output" | "both" | "connected"
export type ParameterSocketSide = "left" | "right"
export type ParameterSocketDirection = "input" | "output" | "bidirectional"

export type ParameterControlOption = Readonly<{
  value: string
  label: string
  disabled: boolean
}>

export type ParameterSocket = Readonly<{
  id: string
  side: ParameterSocketSide
  kind: string
  direction: ParameterSocketDirection
  label: string
  title: string
  selected: boolean
  disabled: boolean
}>

export type ParameterControl = Readonly<{
  id: string
  fieldKind: string
  variant: ParameterVariant
  label: string
  title: string
  value: string
  checked: boolean
  type: ParameterControlType
  options: readonly ParameterControlOption[]
  placeholder: string
  min: string
  max: string
  step: string
  controlVisible: boolean
  connected: boolean
  disabled: boolean
  readOnly: boolean
  sockets: readonly ParameterSocket[]
}>

export type ParameterSocketProps = Readonly<{
  title: string
  width: number
  parameters: readonly ParameterControl[]
}>

export type ParameterSocketButtonRefs = Readonly<{
  button: HTMLButtonElement
  text: Text
}>

export type ParameterControlRefs = Readonly<{
  row: HTMLDivElement
  label: HTMLElement
  labelText: Text
  input: HTMLInputElement
  select: HTMLSelectElement
  controlId: string
  selectControlId: string
  activeControl(): HTMLInputElement | HTMLSelectElement
  socketRefs(id: string): ParameterSocketButtonRefs | null
}>

export type ParameterSocketRefs = Readonly<{
  root: HTMLElement
  header: HTMLElement
  headerText: Text
  list: HTMLDivElement
}>

export type ParameterSocketController = Readonly<{
  element: HTMLElement
  refs: ParameterSocketRefs
  props: ParameterSocketProps
  parameterRefs(id: string): ParameterControlRefs | null
  update(props: ParameterSocketProps): void
  dispose(): void
}>

type ParameterRecord = {
  refs: ParameterControlRefs
  sockets: Map<string, ParameterSocketButtonRefs>
  options: Map<string, HTMLOptionElement>
}

let nextControlId = 1

export const parameterSocketDefaultProps: ParameterSocketProps = Object.freeze({
  title: "Parameters",
  width: 420,
  parameters: Object.freeze([
    Object.freeze({
      id: "name",
      fieldKind: "text",
      variant: "input" as const,
      label: "Name",
      title: "Node name",
      value: "Output",
      checked: false,
      type: "text" as const,
      options: Object.freeze([]),
      placeholder: "",
      min: "",
      max: "",
      step: "",
      controlVisible: true,
      connected: false,
      disabled: false,
      readOnly: false,
      sockets: Object.freeze([
        Object.freeze({
          id: "name-input",
          side: "left" as const,
          kind: "string",
          direction: "input" as const,
          label: "Name input",
          title: "Name input Socket",
          selected: false,
          disabled: false,
        }),
      ]),
    }),
    Object.freeze({
      id: "strength",
      fieldKind: "number",
      variant: "both" as const,
      label: "Strength",
      title: "Output strength",
      value: "0.75",
      checked: false,
      type: "number" as const,
      options: Object.freeze([]),
      placeholder: "",
      min: "0",
      max: "1",
      step: "0.025",
      controlVisible: true,
      connected: false,
      disabled: false,
      readOnly: false,
      sockets: Object.freeze([
        Object.freeze({
          id: "strength-input",
          side: "left" as const,
          kind: "float",
          direction: "input" as const,
          label: "Strength input",
          title: "Strength input Socket",
          selected: false,
          disabled: false,
        }),
        Object.freeze({
          id: "strength-output",
          side: "right" as const,
          kind: "float",
          direction: "output" as const,
          label: "Strength output",
          title: "Strength output Socket",
          selected: true,
          disabled: false,
        }),
      ]),
    }),
  ]),
})

export const parameterSocketCss = `
.parameter-socket {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #111111;
  border-radius: 4px;
  background: #303030;
  color: #e0e0e0;
}

.parameter-socket__header {
  box-sizing: border-box;
  display: block;
  width: 100%;
  height: 30px;
  padding: 7px 10px;
  border-bottom: 1px solid #111111;
  background: #242424;
  color: #7edcec;
  font-size: 12px;
}

.parameter-socket__list {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: 480px;
  overflow: auto;
}

.parameter-socket__row {
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  height: 34px;
  gap: 6px;
  padding: 3px 6px;
  border-bottom: 1px solid #222222;
}

.parameter-socket__label {
  box-sizing: border-box;
  display: block;
  width: 92px;
  color: #d0d0d0;
  font-size: 11px;
}

.parameter-socket__input {
  box-sizing: border-box;
  display: block;
  min-width: 0;
  height: 26px;
  flex-grow: 1;
  padding: 4px 7px;
  border: 1px solid #161616;
  border-radius: 3px;
  background: #242424;
  color: #e0e0e0;
  font-size: 11px;
}

.parameter-socket__input[readonly] {
  background: #303030;
  color: #a8a8a8;
}

.parameter-socket__input[disabled] {
  opacity: 0.5;
}

.parameter-socket__input[type="checkbox"] {
  width: 26px;
  flex-grow: 0;
  padding: 0;
}

.parameter-socket__row[data-control-visible="false"] .parameter-socket__label,
.parameter-socket__row[data-connected="true"] .parameter-socket__label {
  width: auto;
  min-width: 0;
  flex-grow: 1;
}

.parameter-socket__socket {
  box-sizing: border-box;
  display: block;
  width: 18px;
  height: 18px;
  padding: 0;
  border: 2px solid #6f8090;
  border-radius: 9px;
  background: #1d1d1d;
  color: transparent;
  font-size: 1px;
}

.parameter-socket__socket[aria-pressed="true"] {
  border-color: #7edcec;
  box-shadow: 0 0 6px rgba(126, 220, 236, 0.5);
}

.parameter-socket__socket[data-direction="output"] {
  border-color: #d7a35d;
}

.parameter-socket__socket[data-direction="bidirectional"] {
  border-color: #ae82d5;
}

.parameter-socket__socket[disabled] {
  opacity: 0.5;
}
`

export function createParameterSocket(
  document: Document,
  initialProps: ParameterSocketProps = parameterSocketDefaultProps,
): ParameterSocketController {
  const root = document.createElement("section")
  const header = document.createElement("header")
  const headerText = document.createTextNode("")
  const list = document.createElement("div")
  const records = new Map<string, ParameterRecord>()
  let currentProps = normalizeProps(initialProps)
  let disposed = false

  root.className = "parameter-socket"
  header.className = "parameter-socket__header"
  header.appendChild(headerText)
  list.className = "parameter-socket__list"
  list.setAttribute("role", "list")
  root.append(header, list)

  const apply = (next: ParameterSocketProps): void => {
    document.transaction(() => {
      syncText(headerText, next.title)
      syncAttribute(root, "style", `width: ${next.width}px`)
      syncAttribute(root, "data-parameter-count", String(next.parameters.length))
      removeMissing(records, new Set(next.parameters.map(({id}) => id)))
      const resolved: ParameterControl[] = []
      for (const parameter of next.parameters) {
        let record = records.get(parameter.id)
        if (!record) {
          record = createParameterRecord(document, parameter.id)
          records.set(parameter.id, record)
        }
        syncParameter(record, parameter)
        const value = parameter.type === "select"
          ? record.refs.select.value
          : parameter.type === "checkbox"
            ? String(record.refs.input.checked)
            : record.refs.input.value
        resolved.push(Object.freeze({
          ...parameter,
          value,
          checked: record.refs.input.checked,
        }))
      }
      reorder(list, next.parameters.map(({id}) => records.get(id)!.refs.row))
      currentProps = Object.freeze({
        title: next.title,
        width: next.width,
        parameters: Object.freeze(resolved),
      })
    })
  }

  const refs: ParameterSocketRefs = Object.freeze({root, header, headerText, list})
  const controller: ParameterSocketController = Object.freeze({
    element: root,
    refs,
    get props() { return currentProps },
    parameterRefs(id) { return records.get(String(id))?.refs ?? null },
    update(props) {
      if (disposed) throw new Error("ParameterSocket controller is disposed")
      apply(normalizeProps(props))
    },
    dispose() {
      disposed = true
    },
  })
  apply(currentProps)
  return controller
}

function createParameterRecord(document: Document, parameterId: string): ParameterRecord {
  const row = document.createElement("div")
  const label = document.createElement("label")
  const labelText = document.createTextNode("")
  const input = document.createElement("input")
  const select = document.createElement("select")
  const sockets = new Map<string, ParameterSocketButtonRefs>()
  const options = new Map<string, HTMLOptionElement>()
  const controlId = `node-parameter-control-${nextControlId++}`
  const selectControlId = `${controlId}-select`
  const labelId = `${controlId}-label`
  row.className = "parameter-socket__row"
  row.setAttribute("role", "listitem")
  row.setAttribute("data-parameter-id", parameterId)
  label.className = "parameter-socket__label"
  label.id = labelId
  label.setAttribute("for", controlId)
  label.appendChild(labelText)
  input.className = "parameter-socket__input"
  input.id = controlId
  input.setAttribute("aria-labelledby", labelId)
  select.className = "parameter-socket__input"
  select.id = selectControlId
  select.setAttribute("aria-labelledby", labelId)
  const refs: ParameterControlRefs = Object.freeze({
    row,
    label,
    labelText,
    input,
    select,
    controlId,
    selectControlId,
    activeControl() { return select.hasAttribute("hidden") ? input : select },
    socketRefs(id) { return sockets.get(String(id)) ?? null },
  })
  return {refs, sockets, options}
}

function syncParameter(record: ParameterRecord, parameter: ParameterControl): void {
  const {refs} = record
  syncText(refs.labelText, parameter.label)
  syncAttribute(refs.row, "data-parameter-id", parameter.id)
  syncAttribute(refs.row, "data-field-kind", parameter.fieldKind)
  syncAttribute(refs.row, "data-variant", parameter.variant)
  syncAttribute(refs.row, "data-control-visible", String(parameter.controlVisible))
  syncAttribute(refs.row, "data-connected", String(parameter.connected))
  if (refs.row.title !== parameter.title) refs.row.title = parameter.title
  refs.input.type = parameter.type === "select" ? "text" : parameter.type
  refs.input.value = parameter.value
  refs.input.checked = parameter.checked
  refs.input.disabled = parameter.disabled
  refs.input.readOnly = parameter.readOnly
  refs.input.placeholder = parameter.placeholder
  refs.input.min = parameter.min
  refs.input.max = parameter.max
  refs.input.step = parameter.step
  refs.input.title = parameter.title
  refs.select.disabled = parameter.disabled
  refs.select.title = parameter.title
  syncSelectOptions(record, parameter.options)
  refs.select.value = parameter.value
  const controlHidden = !parameter.controlVisible || parameter.connected
  syncBooleanAttribute(refs.input, "hidden", controlHidden || parameter.type === "select")
  syncBooleanAttribute(refs.select, "hidden", controlHidden || parameter.type !== "select")
  refs.label.setAttribute("for", parameter.type === "select" ? refs.selectControlId : refs.controlId)

  const socketIds = new Set(parameter.sockets.map(({id}) => id))
  for (const [id, socket] of record.sockets) {
    if (socketIds.has(id)) continue
    socket.button.remove()
    record.sockets.delete(id)
  }
  for (const socket of parameter.sockets) {
    let socketRefs = record.sockets.get(socket.id)
    if (!socketRefs) {
      const button = refs.input.ownerDocument!.createElement("button")
      const text = refs.input.ownerDocument!.createTextNode("")
      button.className = "parameter-socket__socket"
      button.setAttribute("type", "button")
      button.appendChild(text)
      socketRefs = Object.freeze({button, text})
      record.sockets.set(socket.id, socketRefs)
    }
    syncText(socketRefs.text, socket.label)
    syncAttribute(socketRefs.button, "data-socket-id", socket.id)
    syncAttribute(socketRefs.button, "data-side", socket.side)
    syncAttribute(socketRefs.button, "data-socket-kind", socket.kind)
    syncAttribute(socketRefs.button, "data-direction", socket.direction)
    syncAttribute(socketRefs.button, "aria-pressed", String(socket.selected))
    socketRefs.button.disabled = socket.disabled
    socketRefs.button.title = socket.title
  }

  const left = parameter.sockets.find(({side}) => side === "left")
  const right = parameter.sockets.find(({side}) => side === "right")
  const control = parameter.type === "select" ? refs.select : refs.input
  reorder(refs.row, [
    ...(left ? [record.sockets.get(left.id)!.button] : []),
    refs.label,
    control,
    ...(right ? [record.sockets.get(right.id)!.button] : []),
  ])
}

function syncSelectOptions(record: ParameterRecord, options: readonly ParameterControlOption[]): void {
  const ids = new Set(options.map(({value}) => value))
  for (const [value, option] of record.options) if (!ids.has(value)) {
    option.remove()
    record.options.delete(value)
  }
  for (const definition of options) {
    let option = record.options.get(definition.value)
    if (!option) {
      option = record.refs.select.ownerDocument!.createElement("option")
      record.options.set(definition.value, option)
    }
    option.value = definition.value
    option.label = definition.label
    if (option.textContent !== definition.label) option.textContent = definition.label
    option.disabled = definition.disabled
  }
  reorder(record.refs.select, options.map(({value}) => record.options.get(value)!))
}

function normalizeProps(props: ParameterSocketProps): ParameterSocketProps {
  if (typeof props !== "object" || props === null) throw new TypeError("ParameterSocket props must be an object")
  assertString(props.title, "ParameterSocket title")
  assertPositive(props.width, "ParameterSocket width")
  if (!Array.isArray(props.parameters)) throw new TypeError("ParameterSocket parameters must be an array")
  const parameterIds = new Set<string>()
  const parameters = props.parameters.map((parameter, index) => {
    if (typeof parameter !== "object" || parameter === null) throw new TypeError(`ParameterSocket Parameter ${index} must be an object`)
    assertNonEmpty(parameter.id, `ParameterSocket Parameter ${index} id`)
    if (parameterIds.has(parameter.id)) throw new Error(`ParameterSocket Parameter id must be unique: ${parameter.id}`)
    parameterIds.add(parameter.id)
    assertNonEmpty(parameter.fieldKind, `ParameterSocket Parameter ${parameter.id} fieldKind`)
    if (!["field", "input", "output", "both", "connected"].includes(parameter.variant)) {
      throw new TypeError(`ParameterSocket Parameter ${parameter.id} variant is invalid`)
    }
    assertNonEmpty(parameter.label, `ParameterSocket Parameter ${parameter.id} label`)
    assertString(parameter.title, `ParameterSocket Parameter ${parameter.id} title`)
    assertString(parameter.value, `ParameterSocket Parameter ${parameter.id} value`)
    assertBoolean(parameter.checked, `ParameterSocket Parameter ${parameter.id} checked`)
    if (!["text", "number", "checkbox", "select"].includes(parameter.type)) {
      throw new TypeError(`ParameterSocket Parameter ${parameter.id} type is invalid`)
    }
    if (!Array.isArray(parameter.options)) throw new TypeError(`ParameterSocket Parameter ${parameter.id} options must be an array`)
    const optionValues = new Set<string>()
    const options = parameter.options.map((option: ParameterControlOption, optionIndex: number) => {
      if (typeof option !== "object" || option === null) throw new TypeError(`ParameterSocket Option ${parameter.id}/${optionIndex} must be an object`)
      assertNonEmpty(option.value, `ParameterSocket Option ${parameter.id}/${optionIndex} value`)
      if (optionValues.has(option.value)) throw new Error(`ParameterSocket Option value must be unique in ${parameter.id}: ${option.value}`)
      optionValues.add(option.value)
      assertString(option.label, `ParameterSocket Option ${parameter.id}/${option.value} label`)
      assertBoolean(option.disabled, `ParameterSocket Option ${parameter.id}/${option.value} disabled`)
      return Object.freeze({...option})
    })
    if (parameter.type === "select" && !optionValues.has(parameter.value)) {
      throw new Error(`ParameterSocket Select ${parameter.id} value has no option: ${parameter.value}`)
    }
    for (const [name, value] of [["placeholder", parameter.placeholder], ["min", parameter.min], ["max", parameter.max], ["step", parameter.step]] as const) {
      assertString(value, `ParameterSocket Parameter ${parameter.id} ${name}`)
    }
    assertBoolean(parameter.controlVisible, `ParameterSocket Parameter ${parameter.id} controlVisible`)
    assertBoolean(parameter.connected, `ParameterSocket Parameter ${parameter.id} connected`)
    if (parameter.connected !== (parameter.variant === "connected")) {
      throw new Error(`ParameterSocket Parameter ${parameter.id} connected state must match its variant`)
    }
    assertBoolean(parameter.disabled, `ParameterSocket Parameter ${parameter.id} disabled`)
    assertBoolean(parameter.readOnly, `ParameterSocket Parameter ${parameter.id} readOnly`)
    if (!Array.isArray(parameter.sockets)) throw new TypeError(`ParameterSocket Parameter ${parameter.id} sockets must be an array`)
    const socketIds = new Set<string>()
    const sides = new Set<ParameterSocketSide>()
    const sockets = parameter.sockets.map((socket: ParameterSocket, socketIndex: number) => {
      if (typeof socket !== "object" || socket === null) throw new TypeError(`ParameterSocket Socket ${parameter.id}/${socketIndex} must be an object`)
      assertNonEmpty(socket.id, `ParameterSocket Socket ${parameter.id}/${socketIndex} id`)
      if (socketIds.has(socket.id)) throw new Error(`ParameterSocket Socket id must be unique in ${parameter.id}: ${socket.id}`)
      socketIds.add(socket.id)
      if (socket.side !== "left" && socket.side !== "right") throw new TypeError(`ParameterSocket Socket ${parameter.id}/${socket.id} side must be left or right`)
      if (sides.has(socket.side)) throw new Error(`ParameterSocket Parameter ${parameter.id} has duplicate ${socket.side} Socket`)
      sides.add(socket.side)
      assertNonEmpty(socket.kind, `ParameterSocket Socket ${parameter.id}/${socket.id} kind`)
      if (!["input", "output", "bidirectional"].includes(socket.direction)) {
        throw new TypeError(`ParameterSocket Socket ${parameter.id}/${socket.id} direction is invalid`)
      }
      assertNonEmpty(socket.label, `ParameterSocket Socket ${parameter.id}/${socket.id} label`)
      assertString(socket.title, `ParameterSocket Socket ${parameter.id}/${socket.id} title`)
      assertBoolean(socket.selected, `ParameterSocket Socket ${parameter.id}/${socket.id} selected`)
      assertBoolean(socket.disabled, `ParameterSocket Socket ${parameter.id}/${socket.id} disabled`)
      return Object.freeze({...socket})
    })
    return Object.freeze({...parameter, options: Object.freeze(options), sockets: Object.freeze(sockets)})
  })
  return Object.freeze({title: props.title, width: props.width, parameters: Object.freeze(parameters)})
}

function removeMissing(records: Map<string, ParameterRecord>, ids: ReadonlySet<string>): void {
  for (const [id, record] of records) {
    if (ids.has(id)) continue
    record.refs.row.remove()
    records.delete(id)
  }
}

function reorder(parent: HTMLElement, children: readonly HTMLElement[]): void {
  let reference = parent.firstChild
  for (const child of children) {
    if (child !== reference) parent.insertBefore(child, reference)
    reference = child.nextSibling
  }
}

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string") throw new TypeError(`${label} must be a string`)
}

function assertNonEmpty(value: unknown, label: string): asserts value is string {
  assertString(value, label)
  if (value.trim().length === 0) throw new TypeError(`${label} must not be empty`)
}

function assertPositive(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive finite number`)
  }
}

function assertBoolean(value: unknown, label: string): asserts value is boolean {
  if (typeof value !== "boolean") throw new TypeError(`${label} must be a boolean`)
}

function syncText(node: Text, value: string): void {
  if (node.data !== value) node.data = value
}

function syncAttribute(element: HTMLElement, name: string, value: string): void {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value)
}

function syncBooleanAttribute(element: HTMLElement, name: string, value: boolean): void {
  if (value) {
    if (!element.hasAttribute(name)) element.setAttribute(name, "")
  } else element.removeAttribute(name)
}
