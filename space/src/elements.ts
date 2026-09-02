import {
  Element,
  type Document,
  type Node,
} from "@zavx0z/dom"
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
      if (!(child instanceof XRElement)) {
        throw new TypeError("Space accepts only spatial elements")
      }
      if (!(child instanceof XRViewPointElement) &&
        !(child instanceof XRObjectElement) &&
        !(child instanceof XRDisplayElement) &&
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

export class XRViewPointElement extends XRElement {
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
  get upX(): number { return numberAttribute(this, "up-x", 0) }
  set upX(value: number) { setNumberAttribute(this, "up-x", value) }
  get upY(): number { return numberAttribute(this, "up-y", 0) }
  set upY(value: number) { setNumberAttribute(this, "up-y", value) }
  get upZ(): number { return numberAttribute(this, "up-z", 1) }
  set upZ(value: number) { setNumberAttribute(this, "up-z", value) }
  get fov(): number { return numberAttribute(this, "fov", 1) }
  set fov(value: number) { setNumberAttribute(this, "fov", value) }
  get near(): number { return numberAttribute(this, "near", 0.1) }
  set near(value: number) { setNumberAttribute(this, "near", value) }
  get far(): number { return numberAttribute(this, "far", 1000) }
  set far(value: number) { setNumberAttribute(this, "far", value) }

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
    if (children.some(child => !(child instanceof XRAnimationElement))) {
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

export class XRDisplayElement extends XRElement {
  constructor(ownerDocument: Document) {
    super(ownerDocument, "xr-display")
  }

  get viewportWidth(): number { return numberAttribute(this, "viewport-width", 960) }
  set viewportWidth(value: number) { setNumberAttribute(this, "viewport-width", value) }
  get viewportHeight(): number { return numberAttribute(this, "viewport-height", 680) }
  set viewportHeight(value: number) { setNumberAttribute(this, "viewport-height", value) }
  get worldUnitsPerPixel(): number { return numberAttribute(this, "world-units-per-pixel", 1) }
  set worldUnitsPerPixel(value: number) { setNumberAttribute(this, "world-units-per-pixel", value) }
  get x(): number { return numberAttribute(this, "x", 0) }
  set x(value: number) { setNumberAttribute(this, "x", value) }
  get y(): number { return numberAttribute(this, "y", 0) }
  set y(value: number) { setNumberAttribute(this, "y", value) }
  get z(): number { return numberAttribute(this, "z", 0) }
  set z(value: number) { setNumberAttribute(this, "z", value) }
  get visible(): boolean { return booleanAttribute(this, "visible", true) }
  set visible(value: boolean) { this.setAttribute("visible", String(value)) }
}

export class XRHUDElement extends XRElement {
  constructor(ownerDocument: Document) {
    super(ownerDocument, "xr-hud")
  }

  get distance(): number { return numberAttribute(this, "distance", 1000) }
  set distance(value: number) { setNumberAttribute(this, "distance", value) }
}
