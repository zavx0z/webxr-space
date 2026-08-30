import type {
  Document,
  HTMLDivElement,
} from "@zavx0z/dom"
import {
  socketPreset,
  type SocketKind,
} from "./socket.ts"

export type LinkEndpoint = Readonly<{
  nodeId: string
  socketId: string
}>

export type LinkSegment = Readonly<{
  x1: number
  y1: number
  x2: number
  y2: number
}>

export type LinkDefinition = Readonly<{
  id: string
  title: string
  kind?: SocketKind
  from?: LinkEndpoint
  to?: LinkEndpoint
  selected?: boolean
  disabled?: boolean
  segments: readonly LinkSegment[]
}>

export type LinkSegmentRefs = Readonly<{
  element: HTMLDivElement
  hit: HTMLDivElement
}>

export type LinkController = Readonly<{
  element: HTMLDivElement
  refs: Readonly<{
    root: HTMLDivElement
    segment(index: number): LinkSegmentRefs | null
  }>
  definition: LinkDefinition
  update(definition: LinkDefinition): void
  dispose(): void
}>

export const linkCss = /* @__PURE__ */ String.raw`
.node-link {
  box-sizing: border-box;
  display: block;
  width: 0;
  height: 0;
}
.node-link__segment,
.node-link__hit {
  box-sizing: border-box;
  position: absolute;
  display: block;
}
.node-link__segment {
  border-radius: 2px;
  background: #9e9e9e;
}
.node-link__hit { background: transparent; }
.node-link[aria-selected="true"] .node-link__segment { box-shadow: 0 0 6px currentcolor; }
.node-link[aria-disabled="true"] { opacity: .45; }
`

export function createLink(document: Document, initial: LinkDefinition): LinkController {
  const definition = normalizeLinkDefinition(initial)
  const root = document.createElement("div")
  const segments: LinkSegmentRefs[] = []
  const id = definition.id
  let current = definition
  let disposed = false

  root.className = "node-link graph-canvas__link"
  root.setAttribute("role", "option")
  root.tabIndex = 0

  const update = (nextDefinition: LinkDefinition): void => {
    if (disposed) throw new Error("Link controller is disposed")
    const next = normalizeLinkDefinition(nextDefinition)
    if (next.id !== id) throw new Error(`Link id cannot change: ${id} -> ${next.id}`)
    while (segments.length > next.segments.length) {
      const removed = segments.pop()!
      removed.element.remove()
      removed.hit.remove()
    }
    const color = socketPreset(next.kind ?? "custom").color
    for (const [index, segment] of next.segments.entries()) {
      let refs = segments[index]
      if (!refs) {
        const element = document.createElement("div")
        const hit = document.createElement("div")
        element.className = "node-link__segment graph-canvas__link-segment"
        element.setAttribute("aria-hidden", "true")
        hit.className = "node-link__hit"
        hit.setAttribute("data-link-hit", String(index))
        refs = Object.freeze({element, hit})
        segments.push(refs)
        root.append(element, hit)
      }
      const orientation = segment.y1 === segment.y2 ? "horizontal" : "vertical"
      refs.element.className = `node-link__segment graph-canvas__link-segment graph-canvas__link-segment--${orientation}`
      refs.element.setAttribute("data-link-id", next.id)
      refs.element.setAttribute("data-segment-index", String(index))
      refs.element.setAttribute("style", segmentStyle(segment, 2, color))
      refs.hit.setAttribute("data-link-id", next.id)
      refs.hit.setAttribute("data-segment-index", String(index))
      refs.hit.setAttribute("style", segmentStyle(segment, 16, "transparent"))
    }
    root.setAttribute("data-link-id", next.id)
    root.setAttribute("data-socket-kind", next.kind ?? "custom")
    root.setAttribute("aria-selected", String(next.selected === true))
    root.setAttribute("aria-disabled", String(next.disabled === true))
    root.setAttribute("style", `color: ${color}`)
    root.title = next.title
    current = next
  }

  const refs = Object.freeze({
    root,
    segment(index: number) { return Number.isInteger(index) && index >= 0 ? segments[index] ?? null : null },
  })
  const controller: LinkController = Object.freeze({
    element: root,
    refs,
    get definition() { return current },
    update,
    dispose() { disposed = true },
  })
  update(definition)
  return controller
}

export function normalizeLinkDefinition(definition: LinkDefinition): LinkDefinition {
  if (!definition || typeof definition !== "object") throw new TypeError("Link definition must be an object")
  if (typeof definition.id !== "string" || definition.id.trim() === "") throw new TypeError("Link id must be non-empty")
  if (typeof definition.title !== "string" || definition.title.trim() === "") throw new TypeError(`Link ${definition.id} title must be non-empty`)
  if (!Array.isArray(definition.segments) || definition.segments.length === 0) throw new TypeError(`Link ${definition.id} segments must be a non-empty array`)
  const segments = definition.segments.map((segment, index) => {
    for (const coordinate of ["x1", "y1", "x2", "y2"] as const) {
      if (!Number.isFinite(segment[coordinate])) throw new TypeError(`Link ${definition.id} segment ${index} ${coordinate} must be finite`)
    }
    const horizontal = segment.y1 === segment.y2 && segment.x1 !== segment.x2
    const vertical = segment.x1 === segment.x2 && segment.y1 !== segment.y2
    if (!horizontal && !vertical) throw new Error(`Link ${definition.id} segment ${index} must be strictly axis-aligned`)
    return Object.freeze({...segment})
  })
  return Object.freeze({...definition, segments: Object.freeze(segments)})
}

function segmentStyle(segment: LinkSegment, thickness: number, color: string): string {
  if (segment.y1 === segment.y2) {
    return `left: ${Math.min(segment.x1, segment.x2)}px; top: ${segment.y1 - thickness / 2}px; width: ${Math.abs(segment.x2 - segment.x1)}px; height: ${thickness}px; background: ${color}`
  }
  return `left: ${segment.x1 - thickness / 2}px; top: ${Math.min(segment.y1, segment.y2)}px; width: ${thickness}px; height: ${Math.abs(segment.y2 - segment.y1)}px; background: ${color}`
}
