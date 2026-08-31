import type {FieldDefinition} from "@ui/components/field"
import type {
  Document,
  Event,
  HTMLButtonElement,
  HTMLDivElement,
  HTMLImageElement,
  HTMLElement,
  Text,
} from "@zavx0z/dom"
import {
  createParameter,
  parameterCss,
  type ParameterController,
  type ParameterDefinition,
} from "./parameter.ts"
import {
  createSocket,
  type SocketController,
  type SocketDefinition,
} from "./socket.ts"
import {
  mountField,
  type FieldMount,
} from "./field-mount.ts"

export type NodePreviewImage = Readonly<{
  src: string
  width: number
  height: number
  alt?: string
}>

export type NodePreview = Readonly<{
  enabled: boolean
  image?: NodePreviewImage
  onToggle?(enabled: boolean): void
}>

export type NodeDefinition = Readonly<{
  id: string
  label: string
  title?: string
  category?: string
  headerColor?: string
  x?: number
  y?: number
  width?: number
  height?: number
  selected?: boolean
  collapsed?: boolean
  preview?: NodePreview
  properties?: readonly FieldDefinition[]
  parameters?: readonly ParameterDefinition[]
  sockets?: readonly SocketDefinition[]
  onCollapseChange?(collapsed: boolean): void
}>

export type NodeController = Readonly<{
  element: HTMLElement
  refs: Readonly<{
    element: HTMLElement
    root: HTMLElement
    preview: HTMLElement
    previewImage: HTMLImageElement
    header: HTMLElement
    collapse: HTMLButtonElement
    collapseText: Text
    title: HTMLElement
    titleText: Text
    text: Text
    previewToggle: HTMLButtonElement
    previewToggleText: Text
    body: HTMLDivElement
    properties: HTMLDivElement
    parameters: HTMLDivElement
    sockets: HTMLDivElement
    rightSockets: HTMLDivElement
    leftSockets: HTMLDivElement
    property(id: string): HTMLDivElement | null
    parameter(id: string): ParameterController | null
    socket(id: string): SocketController | null
  }>
  definition: NodeDefinition
  update(definition: NodeDefinition): void
  dispose(): void
}>

type LooseSocketRecord = {
  row: HTMLDivElement
  label: HTMLElement
  labelText: Text
  socket: SocketController
}

export const nodeCss = /* @__PURE__ */ [parameterCss, /* @__PURE__ */ String.raw`
.node-article {
  box-sizing: border-box;
  position: absolute;
  display: flex;
  flex-direction: column;
  min-width: 100px;
  overflow: visible;
  border: 1px solid #111111;
  border-radius: 6px;
  background: #303030;
  color: #d8d8d8;
  font-size: 10px;
  box-shadow: 0 0 12px rgba(0, 0, 0, .5);
}
.node-article[aria-selected="true"] { border-color: #171717; }
.node-article__preview {
  box-sizing: border-box;
  position: absolute;
  left: 3px;
  bottom: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 134px;
  min-height: 72px;
  margin: 0;
  padding: 3px;
  overflow: hidden;
  border: 1px solid #111;
  border-radius: 6px 6px 0 0;
  background: #2b2b2b;
}
.node-article__preview[hidden] { display: none; }
.node-article__preview-image { display: block; width: 100%; height: 100%; object-fit: contain; }
.node-article__header {
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  height: 24px;
  min-height: 24px;
  gap: 2px;
  padding: 0 5px;
  overflow: hidden;
  border-radius: 5px 5px 0 0;
  color: #dedede;
}
.node-article[data-collapsed="true"] .node-article__header { border-radius: 5px; }
.node-article__collapse,
.node-article__preview-toggle {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  min-width: 12px;
  height: 20px;
  min-height: 20px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #dedede;
  font-size: 10px;
}
.node-article__title {
  display: block;
  min-width: 0;
  flex-grow: 1;
  overflow: hidden;
  color: #dedede;
  font-size: 10px;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.node-article__body {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  gap: 3px;
  padding: 0 8px 1px;
}
.node-article__body[hidden] { display: none; }
.node-article__properties,
.node-article__parameters,
.node-article__sockets {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  gap: 3px;
}
.node-article__sockets[hidden] { display: none; }
.node-article__properties > [data-field-id] { min-height: 20px; padding: 0; }
.node-article__properties > [data-field-id] > span { height: 20px; min-height: 20px; font-size: 10px; }
.node-article__properties > [data-field-id] > [role="group"] { min-height: 20px; }
.node-article__properties > [data-field-kind="enum"] > span { display: none; }
.node-article__properties [data-field-id] input,
.node-article__properties [data-field-id] select,
.node-article__properties [data-field-id] button { min-height: 20px; height: 20px; padding: 2px 5px; border-radius: 3px; font-size: 10px; }
.node-article__properties [data-field-kind="boolean"] input[type="checkbox"] { margin-top: 0; }
.node-article .node-socket[data-side="left"] { margin-left: -13px; }
.node-article .node-socket[data-side="right"] { margin-right: -13px; }
.node-article__socket-row {
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  min-height: 20px;
  gap: 4px;
}
.node-article__socket-label { display: block; min-width: 0; flex-grow: 1; color: #d8d8d8; font-size: 10px; }
.node-article__socket-row[data-side="right"] .node-article__socket-label { text-align: right; }
`] .join("\n")

export function createNode(document: Document, initial: NodeDefinition): NodeController {
  const definition = normalizeNodeDefinition(initial)
  const root = document.createElement("article")
  const preview = document.createElement("figure")
  const previewImage = document.createElement("img")
  const header = document.createElement("header")
  const collapse = document.createElement("button")
  const collapseText = document.createTextNode("")
  const title = document.createElement("span")
  const titleText = document.createTextNode("")
  const previewToggle = document.createElement("button")
  const previewToggleText = document.createTextNode("")
  const body = document.createElement("div")
  const propertiesElement = document.createElement("div")
  const parametersElement = document.createElement("div")
  const rightSocketsElement = document.createElement("div")
  const leftSocketsElement = document.createElement("div")
  const properties = new Map<string, FieldMount>()
  const parameters = new Map<string, ParameterController>()
  const looseSockets = new Map<string, LooseSocketRecord>()
  const id = definition.id
  let current = definition
  let disposed = false

  root.className = "node-article"
  root.setAttribute("role", "option")
  root.tabIndex = 0
  preview.className = "node-article__preview"
  previewImage.className = "node-article__preview-image"
  preview.appendChild(previewImage)
  header.className = "node-article__header"
  collapse.className = "node-article__collapse"
  collapse.setAttribute("type", "button")
  collapse.setAttribute("data-action", "collapse-node")
  collapse.appendChild(collapseText)
  title.className = "node-article__title"
  title.appendChild(titleText)
  previewToggle.className = "node-article__preview-toggle"
  previewToggle.setAttribute("type", "button")
  previewToggle.setAttribute("data-action", "toggle-preview")
  previewToggle.appendChild(previewToggleText)
  header.append(collapse, title, previewToggle)
  body.className = "node-article__body"
  propertiesElement.className = "node-article__properties"
  parametersElement.className = "node-article__parameters"
  rightSocketsElement.className = "node-article__sockets node-article__sockets--right"
  leftSocketsElement.className = "node-article__sockets node-article__sockets--left"
  body.append(rightSocketsElement, propertiesElement, parametersElement, leftSocketsElement)
  root.append(preview, header, body)

  const onCollapse = (event: Event): void => {
    event.stopPropagation()
    current.onCollapseChange?.(!current.collapsed)
  }
  const onPreview = (event: Event): void => {
    event.stopPropagation()
    current.preview?.onToggle?.(!current.preview.enabled)
  }
  collapse.addEventListener("click", onCollapse)
  previewToggle.addEventListener("click", onPreview)

  const update = (nextDefinition: NodeDefinition): void => {
    if (disposed) throw new Error("Node controller is disposed")
    const next = normalizeNodeDefinition(nextDefinition)
    if (next.id !== id) throw new Error(`Node id cannot change: ${id} -> ${next.id}`)
    const headerColor = next.headerColor ?? "#5b466b"
    const selected = next.selected === true
    root.setAttribute("data-node-id", next.id)
    root.setAttribute("data-category", next.category ?? "")
    root.setAttribute("data-collapsed", String(next.collapsed === true))
    root.setAttribute("aria-selected", String(selected))
    root.title = next.title ?? next.label
    root.setAttribute("style", positionedStyle(next, headerColor, selected))
    header.setAttribute("style", `background: ${headerColor}`)
    if (titleText.data !== next.label) titleText.data = next.label
    if (collapseText.data !== (next.collapsed === true ? "▸" : "▾")) collapseText.data = next.collapsed === true ? "▸" : "▾"
    collapse.setAttribute("aria-label", next.collapsed === true ? `Развернуть ${next.label}` : `Свернуть ${next.label}`)
    collapse.setAttribute("aria-expanded", String(next.collapsed !== true))
    collapse.disabled = next.onCollapseChange === undefined
    syncBooleanAttribute(body, "hidden", next.collapsed === true)

    const image = next.preview?.image
    const previewVisible = next.preview?.enabled === true && image !== undefined && image.src !== "" && image.width > 0 && image.height > 0
    syncBooleanAttribute(preview, "hidden", !previewVisible)
    syncBooleanAttribute(previewToggle, "hidden", next.preview === undefined)
    previewToggle.disabled = next.preview?.onToggle === undefined
    previewToggle.setAttribute("aria-label", next.preview?.enabled === true ? "Скрыть preview" : "Показать preview")
    previewToggle.setAttribute("aria-pressed", String(next.preview?.enabled === true))
    if (previewToggleText.data !== (next.preview?.enabled === true ? "◉" : "○")) previewToggleText.data = next.preview?.enabled === true ? "◉" : "○"
    if (image) {
      previewImage.src = image.src
      previewImage.width = image.width
      previewImage.height = image.height
      previewImage.alt = image.alt ?? `${next.label} preview`
      preview.setAttribute("style", `width: ${Math.max(1, next.width ?? 140) - 6}px`)
    }

    reconcileProperties(document, propertiesElement, properties, next.properties ?? [])
    reconcileParameters(document, parametersElement, parameters, next.parameters ?? [])
    reconcileLooseSockets(document, rightSocketsElement, leftSocketsElement, looseSockets, next.sockets ?? [])
    current = next
  }

  const refs = Object.freeze({
    element: root,
    root,
    preview,
    previewImage,
    header,
    collapse,
    collapseText,
    title,
    titleText,
    text: titleText,
    previewToggle,
    previewToggleText,
    body,
    properties: propertiesElement,
    parameters: parametersElement,
    sockets: rightSocketsElement,
    rightSockets: rightSocketsElement,
    leftSockets: leftSocketsElement,
    property(fieldId: string) { return properties.get(String(fieldId))?.element ?? null },
    parameter(parameterId: string) { return parameters.get(String(parameterId)) ?? null },
    socket(socketId: string) {
      const loose = looseSockets.get(String(socketId))?.socket
      if (loose) return loose
      for (const parameter of parameters.values()) {
        const socket = parameter.refs.socket(socketId)
        if (socket) return socket
      }
      return null
    },
  })
  const controller: NodeController = Object.freeze({
    element: root,
    refs,
    get definition() { return current },
    update,
    dispose() {
      if (disposed) return
      disposed = true
      collapse.removeEventListener("click", onCollapse)
      previewToggle.removeEventListener("click", onPreview)
      for (const field of properties.values()) field.dispose()
      for (const parameter of parameters.values()) parameter.dispose()
      for (const socket of looseSockets.values()) socket.socket.dispose()
      properties.clear()
      parameters.clear()
      looseSockets.clear()
    },
  })
  update(definition)
  return controller
}

function reconcileProperties(
  document: Document,
  parent: HTMLDivElement,
  records: Map<string, FieldMount>,
  definitions: readonly FieldDefinition[],
): void {
  const retained = new Set(definitions.map(({id}) => id))
  for (const [id, controller] of records) if (!retained.has(id)) {
    controller.element.remove()
    controller.dispose()
    records.delete(id)
  }
  for (const definition of definitions) {
    const current = records.get(definition.id)
    if (current) current.update(definition)
    else records.set(definition.id, mountField(document, definition))
  }
  reconcileChildren(parent, definitions.map(({id}) => records.get(id)!.element))
}

function reconcileParameters(
  document: Document,
  parent: HTMLDivElement,
  records: Map<string, ParameterController>,
  definitions: readonly ParameterDefinition[],
): void {
  const retained = new Set(definitions.map(({id}) => id))
  for (const [id, controller] of records) if (!retained.has(id)) {
    controller.element.remove()
    controller.dispose()
    records.delete(id)
  }
  for (const definition of definitions) {
    const current = records.get(definition.id)
    if (current) current.update(definition)
    else records.set(definition.id, createParameter(document, definition))
  }
  reconcileChildren(parent, definitions.map(({id}) => records.get(id)!.element))
}

function reconcileLooseSockets(
  document: Document,
  rightParent: HTMLDivElement,
  leftParent: HTMLDivElement,
  records: Map<string, LooseSocketRecord>,
  definitions: readonly SocketDefinition[],
): void {
  const retained = new Set(definitions.map(({id}) => id))
  for (const [id, record] of records) if (!retained.has(id)) {
    record.row.remove()
    record.socket.dispose()
    records.delete(id)
  }
  for (const definition of definitions) {
    let record = records.get(definition.id)
    if (!record) {
      const row = document.createElement("div")
      const label = document.createElement("span")
      const labelText = document.createTextNode("")
      const socket = createSocket(document, definition)
      row.className = "node-article__socket-row"
      label.className = "node-article__socket-label"
      label.appendChild(labelText)
      record = {row, label, labelText, socket}
      records.set(definition.id, record)
    }
    record.socket.update(definition)
    record.row.setAttribute("data-side", definition.side)
    if (record.labelText.data !== definition.label) record.labelText.data = definition.label
    reconcileChildren(record.row, definition.side === "left"
      ? [record.socket.element, record.label]
      : [record.label, record.socket.element])
  }
  const right = definitions.filter(({side}) => side === "right")
  const left = definitions.filter(({side}) => side === "left")
  reconcileChildren(rightParent, right.map(({id}) => records.get(id)!.row))
  reconcileChildren(leftParent, left.map(({id}) => records.get(id)!.row))
  syncBooleanAttribute(rightParent, "hidden", right.length === 0)
  syncBooleanAttribute(leftParent, "hidden", left.length === 0)
}

function positionedStyle(definition: NodeDefinition, headerColor: string, selected: boolean): string {
  const x = finite(definition.x ?? 0, "Node x")
  const y = finite(definition.y ?? 0, "Node y")
  const width = positive(definition.width ?? 140, "Node width")
  const height = definition.height === undefined ? "" : `; height: ${positive(definition.height, "Node height")}px`
  const shadow = selected ? `0 0 12px ${headerColor}` : "0 0 12px rgba(0, 0, 0, .5)"
  return `left: ${x}px; top: ${y}px; width: ${width}px${height}; box-shadow: ${shadow}`
}

export function normalizeNodeDefinition(definition: NodeDefinition): NodeDefinition {
  if (!definition || typeof definition !== "object") throw new TypeError("Node definition must be an object")
  if (typeof definition.id !== "string" || definition.id.trim() === "") throw new TypeError("Node id must be non-empty")
  if (typeof definition.label !== "string" || definition.label.trim() === "") throw new TypeError(`Node ${definition.id} label must be non-empty`)
  if (definition.headerColor !== undefined && !/^#[0-9a-f]{6}$/i.test(definition.headerColor)) throw new TypeError(`Node ${definition.id} headerColor must be #rrggbb`)
  const properties = definition.properties ?? []
  const parameters = definition.parameters ?? []
  const sockets = definition.sockets ?? []
  assertUnique(properties.map(({id}) => id), `Node ${definition.id} Property`)
  assertUnique(parameters.map(({id}) => id), `Node ${definition.id} Parameter`)
  assertUnique([
    ...sockets.map(({id}) => id),
    ...parameters.flatMap((parameter) => (parameter.sockets ?? []).map(({id}) => id)),
  ], `Node ${definition.id} Socket`)
  return Object.freeze({
    ...definition,
    ...(definition.properties === undefined ? {} : {
      properties: Object.freeze(properties.map((property) => Object.freeze({...property}))),
    }),
    ...(definition.parameters === undefined ? {} : {
      parameters: Object.freeze(parameters.map((parameter) => Object.freeze({...parameter}))),
    }),
    ...(definition.sockets === undefined ? {} : {
      sockets: Object.freeze(sockets.map((socket) => Object.freeze({...socket}))),
    }),
  })
}

function assertUnique(ids: readonly string[], label: string): void {
  const seen = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`${label} id must be unique: ${id}`)
    seen.add(id)
  }
}

function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new TypeError(`${label} must be finite`)
  return value
}

function positive(value: number, label: string): number {
  finite(value, label)
  if (value <= 0) throw new RangeError(`${label} must be greater than zero`)
  return value
}

function reconcileChildren(parent: HTMLElement, children: readonly HTMLElement[]): void {
  let reference = parent.firstChild
  for (const child of children) {
    if (child !== reference) parent.insertBefore(child, reference)
    reference = child.nextSibling
  }
  while (reference) {
    const next = reference.nextSibling
    parent.removeChild(reference)
    reference = next
  }
}

function syncBooleanAttribute(element: HTMLElement, name: string, value: boolean): void {
  if (value) element.setAttribute(name, "")
  else element.removeAttribute(name)
}
