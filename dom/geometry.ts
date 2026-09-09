import type {Document} from "./src/document.ts"
import type {Element} from "./src/element.ts"
import type {Node} from "./src/node.ts"

export type DOMRectInit = {x?: number; y?: number; width?: number; height?: number}
type RectValues = {x: number; y: number; width: number; height: number}
const values = new WeakMap<DOMRectReadOnly, RectValues>()
const state = (rect: DOMRectReadOnly): RectValues => {
  const value = values.get(rect)
  if (value === undefined) throw new TypeError("Illegal DOMRect invocation")
  return value
}

/** A geometry snapshot. The derived edges also support negative widths and heights. */
export class DOMRectReadOnly {
  constructor(x = 0, y = 0, width = 0, height = 0) {
    values.set(this, {x: +x, y: +y, width: +width, height: +height})
  }
  static fromRect(rect: DOMRectInit = {}): DOMRectReadOnly {
    checkDictionary(rect)
    return new DOMRectReadOnly(rect?.x ?? 0, rect?.y ?? 0, rect?.width ?? 0, rect?.height ?? 0)
  }
  get x(): number { return state(this).x }
  get y(): number { return state(this).y }
  get width(): number { return state(this).width }
  get height(): number { return state(this).height }
  get top(): number { return Math.min(this.y, this.y + this.height) }
  get right(): number { return Math.max(this.x, this.x + this.width) }
  get bottom(): number { return Math.max(this.y, this.y + this.height) }
  get left(): number { return Math.min(this.x, this.x + this.width) }
  get [Symbol.toStringTag](): string { return "DOMRectReadOnly" }
  toJSON(): Record<"x" | "y" | "width" | "height" | "top" | "right" | "bottom" | "left", number> {
    return {x: this.x, y: this.y, width: this.width, height: this.height, top: this.top, right: this.right, bottom: this.bottom, left: this.left}
  }
}

/** Mutable result coordinates are independent of the element and Renderer state. */
export class DOMRect extends DOMRectReadOnly {
  static override fromRect(rect: DOMRectInit = {}): DOMRect {
    checkDictionary(rect)
    return new DOMRect(rect?.x ?? 0, rect?.y ?? 0, rect?.width ?? 0, rect?.height ?? 0)
  }
  override get x(): number { return super.x }
  override set x(value: number) { state(this).x = +value }
  override get y(): number { return super.y }
  override set y(value: number) { state(this).y = +value }
  override get width(): number { return super.width }
  override set width(value: number) { state(this).width = +value }
  override get height(): number { return super.height }
  override set height(value: number) { state(this).height = +value }
  override get [Symbol.toStringTag](): string { return "DOMRect" }
}

function checkDictionary(value: unknown): void {
  if (value !== null && typeof value !== "object" && typeof value !== "function") throw new TypeError("DOMRectInit must be an object")
}

/** Renderer integration supplies current, unclipped client-space border rectangles. */
export type ElementClientRectReader = (element: Element) => readonly Readonly<DOMRectInit>[]
const readers = new WeakMap<Document, Map<Node, ElementClientRectReader>>()

/**
Registers the geometry owner of one projection root. DOM never imports Renderer.
The nearest ancestor registration owns a read; reparenting therefore changes the
provider without remounting or caching geometry on the semantic element.

Returns an idempotent release function. One root has one active geometry owner.
*/
export function registerDocumentGeometryReader(document: Document, root: Node, reader: ElementClientRectReader): () => void {
  if (root !== document && root.ownerDocument !== document) throw new TypeError("Geometry root belongs to another Document")
  if (typeof reader !== "function") throw new TypeError("Geometry reader must be a function")
  let owners = readers.get(document)
  if (owners === undefined) readers.set(document, owners = new Map())
  if (owners.has(root)) throw new Error("Geometry root already has an owner")
  owners.set(root, reader)
  let active = true
  return () => {
    if (!active) return
    active = false
    if (owners.get(root) === reader) owners.delete(root)
    if (owners.size === 0 && readers.get(document) === owners) readers.delete(document)
  }
}

/** Internal implementation of the CSSOM View bounding-rectangle union. */
export function readElementBoundingClientRect(element: Element): DOMRect {
  const document = element.ownerDocument
  if (!element.isConnected || document === null) return new DOMRect()
  const owners = readers.get(document)
  if (owners === undefined) return new DOMRect()
  let ancestor: Node | null = element
  let reader: ElementClientRectReader | undefined
  while (ancestor !== null) {
    reader = owners.get(ancestor)
    if (reader !== undefined) break
    ancestor = ancestor.parentNode
  }
  if (reader === undefined) return new DOMRect()
  const rects = reader(element).map(rect => DOMRect.fromRect(rect))
  if (rects.length === 0) return new DOMRect()
  if (rects.every(rect => rect.width === 0 || rect.height === 0)) return rects[0]!
  const nonempty = rects.filter(rect => rect.width !== 0 || rect.height !== 0)
  const left = Math.min(...nonempty.map(rect => rect.left))
  const top = Math.min(...nonempty.map(rect => rect.top))
  const right = Math.max(...nonempty.map(rect => rect.right))
  const bottom = Math.max(...nonempty.map(rect => rect.bottom))
  return new DOMRect(left, top, right - left, bottom - top)
}
