import type {FieldDefinition} from "@ui/components/field"
import {
  HTMLDivElement,
  type Document,
  type HTMLElement,
} from "@zavx0z/dom"
import {
  createSocket,
  socketCss,
  type SocketController,
  type SocketDefinition,
} from "./socket.ts"
import {mountField} from "./field-mount.ts"

export type ParameterDefinition = Readonly<{
  id: string
  field: FieldDefinition
  sockets?: readonly SocketDefinition[]
  connected?: boolean
  hidden?: boolean
}>

export type ParameterController = Readonly<{
  element: HTMLDivElement
  refs: Readonly<{
    root: HTMLDivElement
    field: HTMLDivElement
    socket(id: string): SocketController | null
  }>
  definition: ParameterDefinition
  update(definition: ParameterDefinition): void
  dispose(): void
}>

export const parameterCss = /* @__PURE__ */ [socketCss, /* @__PURE__ */ String.raw`
.node-parameter {
  box-sizing: border-box;
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  min-width: 0;
  min-height: 20px;
  gap: 3px;
}
.node-parameter > [data-field-id] {
  min-height: 20px;
  flex-grow: 1;
  gap: 4px;
  padding: 0;
}
.node-parameter > [data-field-id] > span {
  height: 20px;
  min-height: 20px;
  font-size: 10px;
}
.node-parameter > [data-field-id] > [role="group"] { min-height: 20px; }
.node-parameter [data-field-id] input,
.node-parameter [data-field-id] select,
.node-parameter [data-field-id] button {
  min-height: 20px;
  height: 20px;
  padding: 2px 5px;
  border-radius: 3px;
  font-size: 10px;
}
.node-parameter [data-field-kind="boolean"] input[type="checkbox"] { margin-top: 0; }
.node-parameter[data-connected="true"] > [data-field-id] > span {
  width: 100%;
}
`] .join("\n")

export function createParameter(document: Document, initial: ParameterDefinition): ParameterController {
  const definition = normalizeParameter(initial)
  const root = document.createElement("div")
  const sockets = new Map<string, SocketController>()
  const id = definition.id
  const field = mountField(document, definition.field)
  let current = definition
  let disposed = false

  root.className = "node-parameter"
  root.setAttribute("role", "group")

  const update = (nextDefinition: ParameterDefinition): void => {
    if (disposed) throw new Error("Parameter controller is disposed")
    const next = normalizeParameter(nextDefinition)
    if (next.id !== id) throw new Error(`Parameter id cannot change: ${id} -> ${next.id}`)
    field.update(next.field)

    const socketDefinitions = next.sockets ?? []
    const retained = new Set(socketDefinitions.map(({id: socketId}) => socketId))
    for (const [socketId, controller] of sockets) {
      if (retained.has(socketId)) continue
      controller.element.remove()
      controller.dispose()
      sockets.delete(socketId)
    }
    for (const socket of socketDefinitions) {
      const controller = sockets.get(socket.id)
      if (controller) controller.update(socket)
      else sockets.set(socket.id, createSocket(document, socket))
    }

    root.setAttribute("data-parameter-id", next.id)
    root.setAttribute("data-field-kind", next.field.kind)
    root.setAttribute("data-connected", String(next.connected === true))
    syncBooleanAttribute(root, "hidden", next.hidden === true)
    const fieldControl = field.element.querySelector('[role="group"]')
    if (!(fieldControl instanceof HTMLDivElement)) throw new Error(`Parameter ${id} Field mounted no control group`)
    syncBooleanAttribute(fieldControl, "hidden", next.connected === true)
    reconcileChildren(root, [
      ...socketDefinitions.filter(({side}) => side === "left").map(({id: socketId}) => sockets.get(socketId)!.element),
      field.element,
      ...socketDefinitions.filter(({side}) => side === "right").map(({id: socketId}) => sockets.get(socketId)!.element),
    ])
    current = next
  }

  const refs = Object.freeze({
    root,
    get field() { return field.element },
    socket(socketId: string) { return sockets.get(String(socketId)) ?? null },
  })
  const controller: ParameterController = Object.freeze({
    element: root,
    refs,
    get definition() { return current },
    update,
    dispose() {
      if (disposed) return
      disposed = true
      field.dispose()
      for (const socket of sockets.values()) socket.dispose()
      sockets.clear()
    },
  })
  update(definition)
  return controller
}

function normalizeParameter(definition: ParameterDefinition): ParameterDefinition {
  if (!definition || typeof definition !== "object") throw new TypeError("Parameter definition must be an object")
  if (typeof definition.id !== "string" || definition.id.trim() === "") throw new TypeError("Parameter id must be non-empty")
  if (!definition.field || typeof definition.field !== "object") throw new TypeError(`Parameter ${definition.id} Field must be an object`)
  if (definition.field.id !== definition.id) throw new Error(`Parameter ${definition.id} must own Field with the same id`)
  const sockets = definition.sockets ?? []
  if (!Array.isArray(sockets)) throw new TypeError(`Parameter ${definition.id} Sockets must be an array`)
  const ids = new Set<string>()
  const sides = new Set<string>()
  for (const socket of sockets) {
    if (ids.has(socket.id)) throw new Error(`Parameter ${definition.id} Socket id must be unique: ${socket.id}`)
    if (sides.has(socket.side)) throw new Error(`Parameter ${definition.id} has duplicate ${socket.side} Socket`)
    ids.add(socket.id)
    sides.add(socket.side)
  }
  return Object.freeze({...definition, sockets: Object.freeze(sockets.map((socket) => Object.freeze({...socket})))})
}

function reconcileChildren(parent: HTMLDivElement, children: readonly HTMLElement[]): void {
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
