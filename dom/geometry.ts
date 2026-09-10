import type {Document} from "./src/document.ts"
import {Element} from "./src/element.ts"
import type {Node} from "./src/node.ts"

/** Авторский lib.dom Element либо semantic Element инфраструктуры того же Experience. */
export type ElementGeometryTarget = Element | globalThis.Element

declare global {
  interface Element {
    /** Расширение WebXR: локальная дробная рамка. Реализовано только на semantic Element. */
    getLayoutRect(relativeTo?: ElementGeometryTarget): DOMRectReadOnly | null
  }
}

/** Проверка выполняется в DOM один раз на входе, независимо от авторского типа ref. */
function requireGeometryElement(target: ElementGeometryTarget): Element {
  if (!(target instanceof Element)) throw new TypeError("Geometry requires a WebXR semantic Element")
  return target
}

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
/** Поставщик дробной геометрии до CSS transforms и пространственной проекции. */
export type ElementLayoutRectReader = (element: Element) => Readonly<DOMRectInit> | null
type GeometryOwner = {client: ElementClientRectReader; layout?: ElementLayoutRectReader}
const readers = new WeakMap<Document, Map<Node, GeometryOwner>>()

/**
Подключает владельца геометрии одного projection root. DOM не импортирует Renderer.
Ближайшая регистрация предка обслуживает чтение; reparent меняет поставщика без
remount или сохранения геометрии на semantic Element. Необязательный layout reader
возвращает дробную border-box рамку до transforms и пространственной проекции.

Возвращает идемпотентное освобождение. У root один активный владелец.
*/
export function registerDocumentGeometryReader(document: Document, root: Node, reader: ElementClientRectReader, layout?: ElementLayoutRectReader): () => void {
  if (root !== document && root.ownerDocument !== document) throw new TypeError("Geometry root belongs to another Document")
  if (typeof reader !== "function") throw new TypeError("Geometry reader must be a function")
  if (layout !== undefined && typeof layout !== "function") throw new TypeError("Layout reader must be a function")
  let owners = readers.get(document)
  if (owners === undefined) readers.set(document, owners = new Map())
  if (owners.has(root)) throw new Error("Geometry root already has an owner")
  const owner: GeometryOwner = {client: reader, ...(layout === undefined ? {} : {layout})}
  owners.set(root, owner)
  let active = true
  return () => {
    if (!active) return
    active = false
    if (owners.get(root) === owner) owners.delete(root)
    if (owners.size === 0 && readers.get(document) === owners) readers.delete(document)
  }
}

/** Внутреннее объединение клиентских прямоугольников по алгоритму CSSOM View. */
export function readElementBoundingClientRect(element: Element): DOMRect {
  const reader = geometryOwner(element)?.client
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

function geometryOwner(element: Element): GeometryOwner | undefined {
  if (!element.isConnected || element.ownerDocument === null) return undefined
  const owners = readers.get(element.ownerDocument)
  let ancestor: Node | null = element
  while (ancestor !== null) {
    const owner = owners?.get(ancestor)
    if (owner !== undefined) return owner
    ancestor = ancestor.parentNode
  }
  return undefined
}

/**
Читает актуальную дробную border-box рамку в CSS px до transforms и проекции.

Это расширение WebXR DOM, не метод CSSOM View. По умолчанию координаты относятся
к локальному viewport поставщика. Прокрутка учитывается, clipping — нет.
`relativeTo` вычитает начало border-box в той же системе координат.
Без бокса или готового поставщика возвращает null; visibility:hidden измеряется.
Чтение обновляет только CPU layout и возвращает независимый неизменяемый снимок.

@throws TypeError Если передан настоящий native Element, подделка или relativeTo из другого Document.
@throws Error Если элементы имеют разных активных владельцев геометрии.
*/
export function readElementLayoutRect(target: ElementGeometryTarget, relativeTarget?: ElementGeometryTarget): DOMRectReadOnly | null {
  const element = requireGeometryElement(target)
  const relativeTo = relativeTarget === undefined ? undefined : requireGeometryElement(relativeTarget)
  if (relativeTo !== undefined && relativeTo.ownerDocument !== element.ownerDocument) {
    throw new TypeError("Layout reference belongs to another Document")
  }
  const owner = geometryOwner(element)
  if (owner?.layout === undefined) return null
  const referenceOwner = relativeTo === undefined ? owner : geometryOwner(relativeTo)
  if (referenceOwner === undefined) return null
  if (referenceOwner !== owner) throw new Error("Layout reference belongs to another projection root")
  const rect = owner.layout(element)
  if (rect === null) return null
  const reference = relativeTo === undefined ? {x: 0, y: 0} : owner.layout(relativeTo)
  if (reference === null) return null
  return new DOMRectReadOnly((rect.x ?? 0) - (reference.x ?? 0), (rect.y ?? 0) - (reference.y ?? 0), rect.width ?? 0, rect.height ?? 0)
}

export type ElementLayoutObserverOptions = Readonly<{relativeTo?: ElementGeometryTarget}>
type LayoutObservation = {
  element: Element
  relativeTo?: Element
  callback: (rect: DOMRectReadOnly | null) => void
  previous: DOMRectReadOnly | null | undefined
  owner: GeometryOwner | undefined
}
const observations = new WeakMap<Document, Set<LayoutObservation>>()
const schedulers = new WeakMap<Document, () => void>()
const delivering = new WeakSet<Document>()

/**
Наблюдает локальную рамку и её доступность. Возвращает идемпотентную отписку.

Первый callback и изменения доставляет Browser до рисования общего кадра,
после готовности поставщика. Подписка безопасна в первом useLayoutEffect.
Callback может обновить компоненты: Browser завершает их flush до показа.
Равная геометрия не вызывает callback из-за одной лишь смены CSS/projection.
При удалении бокса callback получает null. Async callback не задерживает кадр:
потребитель сохраняет visibility:hidden до принятия своего результата.
*/
export function observeElementLayout(
  target: ElementGeometryTarget,
  callback: (rect: DOMRectReadOnly | null) => void,
  options: ElementLayoutObserverOptions = {},
): () => void {
  const element = requireGeometryElement(target)
  const relativeTo = options.relativeTo === undefined ? undefined : requireGeometryElement(options.relativeTo)
  const document = element.ownerDocument
  if (document === null) throw new TypeError("Layout observation requires an owner Document")
  if (typeof callback !== "function") throw new TypeError("Layout observer must be a function")
  if (relativeTo !== undefined && relativeTo.ownerDocument !== document) {
    throw new TypeError("Layout reference belongs to another Document")
  }
  let entries = observations.get(document)
  if (entries === undefined) observations.set(document, entries = new Set())
  const observation: LayoutObservation = {element, callback, ...(relativeTo === undefined ? {} : {relativeTo}), previous: undefined, owner: undefined}
  entries.add(observation)
  schedulers.get(document)?.()
  return () => {
    entries.delete(observation)
    if (entries.size === 0 && observations.get(document) === entries) observations.delete(document)
  }
}

/** Подключение единственного Browser frame scheduler; не создаёт отдельный RAF. */
export function registerDocumentLayoutObserverScheduler(document: Document, requestFrame: () => void): () => void {
  if (schedulers.has(document)) throw new Error("Document layout scheduler already has an owner")
  schedulers.set(document, requestFrame)
  let active = true
  return () => {
    if (!active) return
    active = false
    if (schedulers.get(document) === requestFrame) schedulers.delete(document)
  }
}

/**
Один CPU проход наблюдения для Browser и headless host. Сначала читает все рамки,
затем вызывает callbacks. Возвращает true при доставке хотя бы одного изменения.
Host повторяет проход после component flush до стабильности, перед GPU submission.
*/
export function flushDocumentLayoutObservers(document: Document): boolean {
  if (delivering.has(document)) throw new Error("Cannot recursively deliver layout observations")
  const entries = observations.get(document)
  if (entries === undefined) return false
  delivering.add(document)
  try {
    const changed = [...entries].flatMap(observation => {
      const rect = readElementLayoutRect(observation.element, observation.relativeTo)
      const owner = geometryOwner(observation.element)
      const previous = observation.previous
      const equal = previous === rect || previous != null && rect !== null &&
        previous.x === rect.x && previous.y === rect.y && previous.width === rect.width && previous.height === rect.height
      if (equal && observation.owner === owner) return []
      return [{observation, rect, owner}]
    })
    for (const {observation, rect, owner} of changed) {
      if (!entries.has(observation)) continue
      observation.previous = rect
      observation.owner = owner
      observation.callback(rect)
    }
    return changed.length > 0
  } finally {
    delivering.delete(document)
  }
}
