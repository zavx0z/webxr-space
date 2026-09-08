import type {Document} from "@zavx0z/dom"
import {
  XRDisplayElement,
  XRHUDElement,
  XRMeshElement,
  XRObjectElement,
  XRSpaceElement,
  XRViewPointElement,
} from "./elements.ts"

export type SpaceDisplayProjection = Readonly<{
  element: XRDisplayElement
  viewport: Readonly<{width: number; height: number}>
  worldUnitsPerPixel: number
  transform: Readonly<{
    quaternion: Readonly<{x: number; y: number; z: number; w: number}>
    position: Readonly<{x: number; y: number; z: number}>
    visible: boolean
  }>
}>

export type SpaceHUDProjection = Readonly<{
  element: XRHUDElement
  distance: number
}>

export type SpaceTree = Readonly<{
  space: XRSpaceElement
  viewPoint: XRViewPointElement
  objects: readonly XRObjectElement[]
  meshes: readonly XRMeshElement[]
  displays: readonly SpaceDisplayProjection[]
  hud: SpaceHUDProjection | null
}>

/** Читает семантических владельцев по identity Element; DOM id не является ключом сцены. */
export const readSpaceTree = (document: Document): SpaceTree => {
  const spaces = [...document.querySelectorAll("xr-space")]
  const space = spaces[0]
  if (spaces.length !== 1 || !(space instanceof XRSpaceElement)) {
    throw new TypeError("Document must contain exactly one XRSpaceElement")
  }
  const container = space.parentNode
  if (container !== document && container !== document.querySelector("body")) {
    throw new TypeError("Space must be an application root in Document or body")
  }

  const viewPoints = space.children.filter(
    (child): child is XRViewPointElement => child instanceof XRViewPointElement,
  )
  if (viewPoints.length !== 1) {
    throw new TypeError("Space must contain exactly one ViewPoint")
  }

  const displays = space.children
    .filter((child): child is XRDisplayElement => child instanceof XRDisplayElement)
    .map(readDisplayProjection)

  const hudElements = space.children.filter(
    (child): child is XRHUDElement => child instanceof XRHUDElement,
  )
  const hudElement = hudElements[0] ?? null

  const objects = collectObjects(space)

  return Object.freeze({
    space,
    viewPoint: viewPoints[0]!,
    objects: Object.freeze(objects),
    meshes: Object.freeze(objects.filter(
      (element): element is XRMeshElement => element instanceof XRMeshElement,
    )),
    displays: Object.freeze(displays),
    hud: hudElement
      ? Object.freeze({element: hudElement, distance: hudElement.distance})
      : null,
  })
}

const collectObjects = (root: XRSpaceElement): XRObjectElement[] => {
  const objects: XRObjectElement[] = []
  const visit = (element: XRObjectElement): void => {
    objects.push(element)
    for (const child of element.children) {
      if (child instanceof XRObjectElement) visit(child)
    }
  }
  for (const child of root.children) {
    if (child instanceof XRObjectElement) visit(child)
  }
  return objects
}


/** Читает только параметры одного Display, не обходя объекты Space. */
export function readDisplayProjection(element: XRDisplayElement): SpaceDisplayProjection {
  if (element.viewportWidth <= 0 || element.viewportHeight <= 0) {
    throw new TypeError(`Display ${element.id} viewport must be positive`)
  }
  if (element.worldUnitsPerPixel <= 0) {
    throw new TypeError(`Display ${element.id} worldUnitsPerPixel must be positive`)
  }
  return Object.freeze({
    element,
    viewport: Object.freeze({
      width: element.viewportWidth,
      height: element.viewportHeight,
    }),
    worldUnitsPerPixel: element.worldUnitsPerPixel,
    transform: Object.freeze({
      quaternion: Object.freeze({x: element.quaternionX, y: element.quaternionY, z: element.quaternionZ, w: element.quaternionW}),
      position: Object.freeze({x: element.x, y: element.y, z: element.z}),
      visible: element.visible,
    }),
  })
}
