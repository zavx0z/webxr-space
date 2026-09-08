import {Comment, Element, type Document, type Node} from "@zavx0z/dom"
import {DisplayElement} from "@zavx0z/dom/display"
import type {
  AnimationClip,
  BufferGeometry,
  Material,
  Object3D,
  TrueTypeFont,
} from "@zavx0z/engine"

const numberAttribute = (
  element: Element,
  name: string,
  fallback: number,
): number => {
  const value = element.getAttribute(name)
  if (value === null) return fallback
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const setNumberAttribute = (
  element: Element,
  name: string,
  value: number,
): void => {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`)
  element.setAttribute(name, String(value))
}

const booleanAttribute = (
  element: Element,
  name: string,
  fallback: boolean,
): boolean => {
  const value = element.getAttribute(name)
  if (value === null) return fallback
  return value !== "false"
}

export class XRElement extends Element {
  constructor(ownerDocument: Document, localName: string) {
    super(ownerDocument, localName)
  }
}

export type XRGeometryProjectionFactory = (
  element: XRGeometryElement,
) => BufferGeometry

export type XRMaterialProjectionFactory = (
  element: XRMaterialElement,
) => Material

export type XRObjectProjectionContext = Readonly<{
  geometry: BufferGeometry | null
  material: Material | null
  font: TrueTypeFont
}>

export type XRObjectProjectionFactory = (
  element: XRObjectElement,
  context: XRObjectProjectionContext,
) => Object3D

export type XRAnimationProjectionFactory = (
  element: XRAnimationElement,
) => AnimationClip

const factories = new WeakMap<XRElement, Function>()
const factoryRevisions = new WeakMap<XRElement, number>()

const readFactory = <Factory extends Function>(element: XRElement): Factory | null =>
  factories.get(element) as Factory | undefined ?? null

const writeFactory = (
  element: XRElement,
  value: Function | null,
  label: string,
): void => {
  if (value !== null && typeof value !== "function") {
    throw new TypeError(`${label} factory must be a function`)
  }
  if (factories.get(element) === value) return
  if (value === null) factories.delete(element)
  else factories.set(element, value)
  const revision = (factoryRevisions.get(element) ?? 0) + 1
  factoryRevisions.set(element, revision)
  element.setAttribute("factory-revision", String(revision))
}

const readFactoryRevision = (element: XRElement): number =>
  factoryRevisions.get(element) ?? 0

const stringAttribute = (
  element: Element,
  name: string,
  fallback: string,
): string => element.getAttribute(name) ?? fallback

export class XRSpaceElement extends XRElement {
  /** Режим общего кадра; demand рисует по изменениям, always непрерывно. */
  get frameloop(): "demand" | "always" {
    const value = this.getAttribute("frameloop") ?? "demand"
    if (value !== "demand" && value !== "always") throw new TypeError("Space frameloop must be demand or always")
    return value
  }
  set frameloop(value: "demand" | "always") {
    if (value !== "demand" && value !== "always") throw new TypeError("Space frameloop must be demand or always")
    this.setAttribute("frameloop", value)
  }

  constructor(ownerDocument: Document) {
    super(ownerDocument, "xr-space")
  }

  get background(): string { return stringAttribute(this, "background", "#000000") }
  set background(value: string) { this.setAttribute("background", value) }

  protected override validateChildInsertion(
    nodes: readonly Node[],
    replacing: readonly Node[],
  ): void {
    const retained = new Set(replacing)
    const moving = new Set(nodes.filter(node => node.parentNode === this))
    const children = [
      ...this.childNodes.filter(node => !retained.has(node) && !moving.has(node)),
      ...nodes,
    ]

    for (const child of children) {
      if (child instanceof Comment || child instanceof DisplayElement) continue
      if (!(child instanceof XRElement)) {
        throw new TypeError("Space accepts only spatial elements")
      }
      if (!(child instanceof XRViewPointElement) &&
        !(child instanceof XRObjectElement) &&
        !(child instanceof XRHUDElement)) {
        throw new TypeError(`Space does not accept ${child.localName}`)
      }
    }

    if (children.filter(child => child instanceof XRViewPointElement).length > 1) {
      throw new TypeError("Space accepts exactly one ViewPoint")
    }
    if (children.filter(child => child instanceof XRHUDElement).length > 1) {
      throw new TypeError("Space accepts at most one HUD")
    }
  }
}

const viewPointPoseProperties = ["x", "y", "z", "targetX", "targetY", "targetZ", "fov", "near", "far"] as const

/**
Единственная камера semantic Space. Координаты и расстояния заданы в мм, ось вверх — Z.
Команды меняют этот же Element одной transaction; подключённый Browser сам запрашивает кадр.
Сохранённый обзор принадлежит элементу и не создаёт подписок или отдельного цикла кадров.
*/
export class XRViewPointElement extends XRElement {
  #savedState: Float64Array | null = null

  constructor(ownerDocument: Document) {
    super(ownerDocument, "xr-view-point")
  }

  get x(): number { return numberAttribute(this, "x", 10) }
  set x(value: number) { setNumberAttribute(this, "x", value) }
  get y(): number { return numberAttribute(this, "y", -10) }
  set y(value: number) { setNumberAttribute(this, "y", value) }
  get z(): number { return numberAttribute(this, "z", 10) }
  set z(value: number) { setNumberAttribute(this, "z", value) }
  get targetX(): number { return numberAttribute(this, "target-x", 0) }
  set targetX(value: number) { setNumberAttribute(this, "target-x", value) }
  get targetY(): number { return numberAttribute(this, "target-y", 0) }
  set targetY(value: number) { setNumberAttribute(this, "target-y", value) }
  get targetZ(): number { return numberAttribute(this, "target-z", 0) }
  set targetZ(value: number) { setNumberAttribute(this, "target-z", value) }
  get controls(): boolean { return booleanAttribute(this, "controls", false) }
  set controls(value: boolean) { this.setAttribute("controls", String(value)) }
  get fov(): number { return numberAttribute(this, "fov", 1) }
  set fov(value: number) { setNumberAttribute(this, "fov", value) }
  get near(): number { return numberAttribute(this, "near", 0.1) }
  set near(value: number) { setNumberAttribute(this, "near", value) }
  get far(): number { return numberAttribute(this, "far", 1000) }
  set far(value: number) { setNumberAttribute(this, "far", value) }

  /**
  Запоминает положение, цель, fov и near/far для {@link XRViewPointElement.reset}.
  Повторный вызов заменяет прежний обзор без нового выделения памяти.
  Разрешение жестов `controls` остаётся состоянием приложения.
  */
  saveState(): void {
    const state = this.#savedState ??= new Float64Array(viewPointPoseProperties.length)
    for (let index = 0; index < viewPointPoseProperties.length; index++) {
      state[index] = this[viewPointPoseProperties[index]!]
    }
  }

  /**
  Возвращает последний сохранённый обзор без замены камеры и без изменения `controls`.

  @returns `true`, если обзор был сохранён; иначе ничего не меняет и возвращает `false`.
  */
  reset(): boolean {
    const state = this.#savedState
    if (state === null) return false
    this.ownerDocument!.transaction(() => {
      for (let index = 0; index < viewPointPoseProperties.length; index++) {
        this[viewPointPoseProperties[index]!] = state[index]!
      }
    })
    return true
  }

  /**
  Мгновенно устанавливает расстояние до цели, сохраняя направление от цели к камере.
  При новой цели камера поворачивается к ней; fov и near/far сохраняются.

  @param distance - Конечное расстояние в мм, строго больше нуля.
  @param target - Точка в мировых координатах Z-up, мм. Без аргумента сохраняется текущая цель.
  @throws RangeError При недопустимом расстоянии, нечисловых координатах или совпадении камеры с целью.
    Проверка выполняется до изменения Element.
  @example
  ```ts
  camera.saveState()
  camera.dollyTo(600, {x: 0, y: 0, z: 900})
  camera.reset()
  ```
  */
  dollyTo(distance: number, target?: Readonly<{x: number; y: number; z: number}>): void {
    const targetX = target?.x ?? this.targetX
    const targetY = target?.y ?? this.targetY
    const targetZ = target?.z ?? this.targetZ
    if (!Number.isFinite(distance) || distance <= 0 ||
      !Number.isFinite(targetX) || !Number.isFinite(targetY) || !Number.isFinite(targetZ)) {
      throw new RangeError("ViewPoint.dollyTo requires a positive finite distance and finite target coordinates")
    }
    const offsetX = this.x - targetX
    const offsetY = this.y - targetY
    const offsetZ = this.z - targetZ
    const length = Math.hypot(offsetX, offsetY, offsetZ)
    if (!Number.isFinite(length) || length === 0) {
      throw new RangeError("ViewPoint.dollyTo requires a finite direction from target to camera")
    }
    const x = targetX + offsetX / length * distance
    const y = targetY + offsetY / length * distance
    const z = targetZ + offsetZ / length * distance
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      throw new RangeError("ViewPoint.dollyTo position exceeds finite coordinates")
    }
    this.ownerDocument!.transaction(() => {
      this.x = x
      this.y = y
      this.z = z
      this.targetX = targetX
      this.targetY = targetY
      this.targetZ = targetZ
    })
  }

  protected override validateChildInsertion(): void {
    throw new TypeError("ViewPoint cannot contain children")
  }
}

export abstract class XRObjectElement extends XRElement {
  get x(): number { return numberAttribute(this, "x", 0) }
  set x(value: number) { setNumberAttribute(this, "x", value) }
  get y(): number { return numberAttribute(this, "y", 0) }
  set y(value: number) { setNumberAttribute(this, "y", value) }
  get z(): number { return numberAttribute(this, "z", 0) }
  set z(value: number) { setNumberAttribute(this, "z", value) }
  get quaternionX(): number { return numberAttribute(this, "quaternion-x", 0) }
  set quaternionX(value: number) { setNumberAttribute(this, "quaternion-x", value) }
  get quaternionY(): number { return numberAttribute(this, "quaternion-y", 0) }
  set quaternionY(value: number) { setNumberAttribute(this, "quaternion-y", value) }
  get quaternionZ(): number { return numberAttribute(this, "quaternion-z", 0) }
  set quaternionZ(value: number) { setNumberAttribute(this, "quaternion-z", value) }
  get quaternionW(): number { return numberAttribute(this, "quaternion-w", 1) }
  set quaternionW(value: number) { setNumberAttribute(this, "quaternion-w", value) }
  get scaleX(): number { return numberAttribute(this, "scale-x", 1) }
  set scaleX(value: number) { setNumberAttribute(this, "scale-x", value) }
  get scaleY(): number { return numberAttribute(this, "scale-y", 1) }
  set scaleY(value: number) { setNumberAttribute(this, "scale-y", value) }
  get scaleZ(): number { return numberAttribute(this, "scale-z", 1) }
  set scaleZ(value: number) { setNumberAttribute(this, "scale-z", value) }
  get visible(): boolean { return booleanAttribute(this, "visible", true) }
  set visible(value: boolean) { this.setAttribute("visible", String(value)) }
  get name(): string { return stringAttribute(this, "name", "") }
  set name(value: string) { this.setAttribute("name", value) }

  get factory(): XRObjectProjectionFactory | null {
    return readFactory<XRObjectProjectionFactory>(this)
  }
  set factory(value: XRObjectProjectionFactory | null) {
    writeFactory(this, value, "Object")
  }
  get factoryRevision(): number { return readFactoryRevision(this) }

  protected validateObjectChildren(
    nodes: readonly Node[],
    replacing: readonly Node[],
    leafTypes: readonly (new (...args: never[]) => XRElement)[] = [],
  ): readonly Node[] {
    const retained = new Set(replacing)
    const moving = new Set(nodes.filter(node => node.parentNode === this))
    const children = [
      ...this.childNodes.filter(node => !retained.has(node) && !moving.has(node)),
      ...nodes,
    ]
    for (const child of children) {
      if (child instanceof Comment) continue
      const isLeaf = leafTypes.some(type => child instanceof type)
      if (!(child instanceof XRObjectElement) && !(child instanceof XRAnimationElement) && !isLeaf) {
        throw new TypeError(`${this.localName} accepts only spatial Object or owned resource children`)
      }
    }
    return children
  }
}

export class XRGroupElement extends XRObjectElement {
  constructor(ownerDocument: Document) {
    super(ownerDocument, "xr-group")
  }

  protected override validateChildInsertion(
    nodes: readonly Node[],
    replacing: readonly Node[],
  ): void {
    this.validateObjectChildren(nodes, replacing)
  }
}

export class XRAssetElement extends XRObjectElement {
  constructor(ownerDocument: Document) {
    super(ownerDocument, "xr-asset")
  }

  protected override validateChildInsertion(
    nodes: readonly Node[],
    replacing: readonly Node[],
  ): void {
    const retained = new Set(replacing)
    const moving = new Set(nodes.filter(node => node.parentNode === this))
    const children = [
      ...this.childNodes.filter(node => !retained.has(node) && !moving.has(node)),
      ...nodes,
    ]
    if (children.some(child => !(child instanceof Comment) && !(child instanceof XRAnimationElement))) {
      throw new TypeError("Asset accepts only Animation behavior children")
    }
  }
}

export class XRMeshElement extends XRObjectElement {
  constructor(ownerDocument: Document) {
    super(ownerDocument, "xr-mesh")
  }

  get geometry(): XRGeometryElement | null {
    return this.children.find(child => child instanceof XRGeometryElement) ?? null
  }

  get material(): XRMaterialElement | null {
    return this.children.find(child => child instanceof XRMaterialElement) ?? null
  }

  protected override validateChildInsertion(
    nodes: readonly Node[],
    replacing: readonly Node[],
  ): void {
    const children = this.validateObjectChildren(
      nodes,
      replacing,
      [XRGeometryElement, XRMaterialElement],
    )
    if (children.filter(child => child instanceof XRGeometryElement).length > 1) {
      throw new TypeError("Mesh accepts at most one Geometry")
    }
    if (children.filter(child => child instanceof XRMaterialElement).length > 1) {
      throw new TypeError("Mesh accepts at most one Material")
    }
  }
}

abstract class XRGeometryMaterialObjectElement extends XRObjectElement {
  get geometry(): XRGeometryElement | null {
    return this.children.find(child => child instanceof XRGeometryElement) ?? null
  }

  get material(): XRMaterialElement | null {
    return this.children.find(child => child instanceof XRMaterialElement) ?? null
  }

  protected override validateChildInsertion(
    nodes: readonly Node[],
    replacing: readonly Node[],
  ): void {
    const children = this.validateObjectChildren(
      nodes,
      replacing,
      [XRGeometryElement, XRMaterialElement],
    )
    if (children.filter(child => child instanceof XRGeometryElement).length > 1) {
      throw new TypeError(`${this.localName} accepts at most one Geometry`)
    }
    if (children.filter(child => child instanceof XRMaterialElement).length > 1) {
      throw new TypeError(`${this.localName} accepts at most one Material`)
    }
  }
}

export class XRLineElement extends XRGeometryMaterialObjectElement {
  constructor(ownerDocument: Document) {
    super(ownerDocument, "xr-line")
  }
}

export class XRLineSegmentsElement extends XRGeometryMaterialObjectElement {
  constructor(ownerDocument: Document) {
    super(ownerDocument, "xr-line-segments")
  }
}

export class XRTextElement extends XRObjectElement {
  constructor(ownerDocument: Document) {
    super(ownerDocument, "xr-text")
  }

  get text(): string { return stringAttribute(this, "text", "") }
  set text(value: string) { this.setAttribute("text", value) }
  get fontSize(): number { return numberAttribute(this, "font-size", 10) }
  set fontSize(value: number) { setNumberAttribute(this, "font-size", value) }
  get letterSpacing(): number { return numberAttribute(this, "letter-spacing", this.fontSize * 0.05) }
  set letterSpacing(value: number) { setNumberAttribute(this, "letter-spacing", value) }

  get material(): XRMaterialElement | null {
    return this.children.find(child => child instanceof XRMaterialElement) ?? null
  }

  protected override validateChildInsertion(
    nodes: readonly Node[],
    replacing: readonly Node[],
  ): void {
    const children = this.validateObjectChildren(nodes, replacing, [XRMaterialElement])
    if (children.filter(child => child instanceof XRMaterialElement).length > 1) {
      throw new TypeError("Text accepts at most one Material")
    }
  }
}

export class XRLightElement extends XRObjectElement {
  constructor(ownerDocument: Document) {
    super(ownerDocument, "xr-light")
  }

  get kind(): string { return stringAttribute(this, "kind", "directional") }
  set kind(value: string) { this.setAttribute("kind", value) }
  get color(): string { return stringAttribute(this, "color", "#ffffff") }
  set color(value: string) { this.setAttribute("color", value) }
  get intensity(): number { return numberAttribute(this, "intensity", 1) }
  set intensity(value: number) { setNumberAttribute(this, "intensity", value) }
  get targetX(): number { return numberAttribute(this, "target-x", 0) }
  set targetX(value: number) { setNumberAttribute(this, "target-x", value) }
  get targetY(): number { return numberAttribute(this, "target-y", 0) }
  set targetY(value: number) { setNumberAttribute(this, "target-y", value) }
  get targetZ(): number { return numberAttribute(this, "target-z", 0) }
  set targetZ(value: number) { setNumberAttribute(this, "target-z", value) }

  protected override validateChildInsertion(
    nodes: readonly Node[],
    replacing: readonly Node[],
  ): void {
    this.validateObjectChildren(nodes, replacing)
  }
}

export class XRAnimationElement extends XRElement {
  constructor(ownerDocument: Document) {
    super(ownerDocument, "xr-animation")
  }

  get factory(): XRAnimationProjectionFactory | null {
    return readFactory<XRAnimationProjectionFactory>(this)
  }
  set factory(value: XRAnimationProjectionFactory | null) {
    writeFactory(this, value, "Animation")
  }
  get factoryRevision(): number { return readFactoryRevision(this) }
  get playing(): boolean { return booleanAttribute(this, "playing", true) }
  set playing(value: boolean) { this.setAttribute("playing", String(value)) }
  get loop(): boolean { return booleanAttribute(this, "loop", true) }
  set loop(value: boolean) { this.setAttribute("loop", String(value)) }
  get timeScale(): number { return numberAttribute(this, "time-scale", 1) }
  set timeScale(value: number) { setNumberAttribute(this, "time-scale", value) }

  protected override validateChildInsertion(): void {
    throw new TypeError("Animation cannot contain children")
  }
}

export class XRGeometryElement extends XRElement {
  constructor(ownerDocument: Document) {
    super(ownerDocument, "xr-geometry")
  }

  get kind(): string { return this.getAttribute("kind") ?? "box" }
  set kind(value: string) { this.setAttribute("kind", value) }
  get width(): number { return numberAttribute(this, "width", 1) }
  set width(value: number) { setNumberAttribute(this, "width", value) }
  get height(): number { return numberAttribute(this, "height", 1) }
  set height(value: number) { setNumberAttribute(this, "height", value) }
  get depth(): number { return numberAttribute(this, "depth", 1) }
  set depth(value: number) { setNumberAttribute(this, "depth", value) }
  get radius(): number { return numberAttribute(this, "radius", this.kind === "torus" ? 0.5 : 1) }
  set radius(value: number) { setNumberAttribute(this, "radius", value) }
  get tube(): number { return numberAttribute(this, "tube", 0.2) }
  set tube(value: number) { setNumberAttribute(this, "tube", value) }
  get widthSegments(): number { return numberAttribute(this, "width-segments", 1) }
  set widthSegments(value: number) { setNumberAttribute(this, "width-segments", value) }
  get heightSegments(): number { return numberAttribute(this, "height-segments", 1) }
  set heightSegments(value: number) { setNumberAttribute(this, "height-segments", value) }
  get depthSegments(): number { return numberAttribute(this, "depth-segments", 1) }
  set depthSegments(value: number) { setNumberAttribute(this, "depth-segments", value) }
  get radialSegments(): number { return numberAttribute(this, "radial-segments", 12) }
  set radialSegments(value: number) { setNumberAttribute(this, "radial-segments", value) }
  get tubularSegments(): number { return numberAttribute(this, "tubular-segments", 12) }
  set tubularSegments(value: number) { setNumberAttribute(this, "tubular-segments", value) }
  get factory(): XRGeometryProjectionFactory | null {
    return readFactory<XRGeometryProjectionFactory>(this)
  }
  set factory(value: XRGeometryProjectionFactory | null) {
    writeFactory(this, value, "Geometry")
  }
  get factoryRevision(): number { return readFactoryRevision(this) }

  protected override validateChildInsertion(): void {
    throw new TypeError("Geometry cannot contain children")
  }
}

export class XRMaterialElement extends XRElement {
  constructor(ownerDocument: Document) {
    super(ownerDocument, "xr-material")
  }

  get kind(): string { return this.getAttribute("kind") ?? "basic" }
  set kind(value: string) { this.setAttribute("kind", value) }
  get color(): string { return this.getAttribute("color") ?? "#ffffff" }
  set color(value: string) { this.setAttribute("color", value) }
  get factory(): XRMaterialProjectionFactory | null {
    return readFactory<XRMaterialProjectionFactory>(this)
  }
  set factory(value: XRMaterialProjectionFactory | null) {
    writeFactory(this, value, "Material")
  }
  get factoryRevision(): number { return readFactoryRevision(this) }

  protected override validateChildInsertion(): void {
    throw new TypeError("Material cannot contain children")
  }
}

export class XRHUDElement extends XRElement {
  constructor(ownerDocument: Document) {
    super(ownerDocument, "xr-hud")
  }

  get distance(): number { return numberAttribute(this, "distance", 1000) }
  set distance(value: number) { setNumberAttribute(this, "distance", value) }
}
