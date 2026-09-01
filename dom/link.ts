import type {
  Document,
  HTMLVectorPathElement,
} from "@zavx0z/dom"
import {
  socketPreset,
  type SocketKind,
} from "./socket.ts"
import {
  normalizeLinkRoute,
  projectLinkRoute,
  type LinkPathProjection,
  type LinkRoute,
} from "./link-path.ts"

export {
  createCubicLinkRoute,
  projectLinkRoute,
} from "./link-path.ts"
export type {
  LinkCubicCurve,
  LinkPathBounds,
  LinkPathPoint,
  LinkPathProjection,
  LinkRoute,
} from "./link-path.ts"

export type LinkEndpoint = Readonly<{
  nodeId: string
  socketId: string
}>

export type LinkDefinition = Readonly<{
  id: string
  title: string
  kind?: SocketKind
  from?: LinkEndpoint
  to?: LinkEndpoint
  selected?: boolean
  disabled?: boolean
  route: LinkRoute
}>

export type LinkController = Readonly<{
  element: HTMLVectorPathElement
  refs: Readonly<{
    root: HTMLVectorPathElement
  }>
  definition: LinkDefinition
  projection: LinkPathProjection
  update(definition: LinkDefinition): void
  dispose(): void
}>

const normalizedDefinitions = new WeakSet<object>()

export const linkCss = `
.node-link {
  position: absolute;
  left: 0;
  top: 0;
  stroke: #9e9e9e;
  stroke-width: 2.2px;
  pointer-hit-width: 16px;
}
.node-link[aria-selected="true"] { z-index: 2; stroke-width: 3.4px; }
.node-link[aria-disabled="true"] { opacity: .45; }
`

export function createLink(document: Document, initial: LinkDefinition): LinkController {
  const definition = normalizeLinkDefinition(initial)
  const root = document.createElement("vector-path")
  const id = definition.id
  let current = definition
  let currentProjection = projectLinkRoute(definition.route)
  let disposed = false

  root.className = "node-link graph-canvas__link"
  root.setAttribute("role", "option")
  root.tabIndex = 0

  const apply = (next: LinkDefinition, projection: LinkPathProjection): void => {
    const color = socketPreset(next.kind ?? "custom").color
    if (root.d !== projection.d) root.d = projection.d
    syncAttribute(root, "data-link-id", next.id)
    syncAttribute(root, "data-socket-kind", next.kind ?? "custom")
    syncAttribute(root, "aria-selected", String(next.selected === true))
    syncAttribute(root, "aria-disabled", String(next.disabled === true))
    syncAttribute(root, "style", `stroke: ${color}`)
    if (root.title !== next.title) root.title = next.title
    current = next
    currentProjection = projection
  }

  const update = (nextDefinition: LinkDefinition): void => {
    if (disposed) throw new Error("Link controller is disposed")
    const next = normalizeLinkDefinition(nextDefinition)
    if (next.id !== id) throw new Error(`Link id cannot change: ${id} -> ${next.id}`)
    apply(next, projectLinkRoute(next.route))
  }

  const refs = Object.freeze({root})
  const controller: LinkController = Object.freeze({
    element: root,
    refs,
    get definition() { return current },
    get projection() { return currentProjection },
    update,
    dispose() { disposed = true },
  })
  apply(definition, currentProjection)
  return controller
}

export function normalizeLinkDefinition(definition: LinkDefinition): LinkDefinition {
  if (!definition || typeof definition !== "object") throw new TypeError("Link definition must be an object")
  if (normalizedDefinitions.has(definition)) return definition
  if (typeof definition.id !== "string" || definition.id.trim() === "") throw new TypeError("Link id must be non-empty")
  if (typeof definition.title !== "string" || definition.title.trim() === "") throw new TypeError(`Link ${definition.id} title must be non-empty`)
  if (definition.selected !== undefined && typeof definition.selected !== "boolean") throw new TypeError(`Link ${definition.id} selected must be boolean`)
  if (definition.disabled !== undefined && typeof definition.disabled !== "boolean") throw new TypeError(`Link ${definition.id} disabled must be boolean`)
  const route = normalizeLinkRoute(definition.route)
  projectLinkRoute(route)
  const normalized = Object.freeze({...definition, route})
  normalizedDefinitions.add(normalized)
  return normalized
}

function syncAttribute(element: HTMLVectorPathElement, name: string, value: string): void {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value)
}
