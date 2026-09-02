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
  id: string
  viewport: Readonly<{width: number; height: number}>
  worldUnitsPerPixel: number
  transform: Readonly<{
    position: Readonly<{x: number; y: number; z: number}>
    visible: boolean
  }>
}>

export type SpaceHUDProjection = Readonly<{
  element: XRHUDElement
  id: string
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

export const readSpaceTree = (document: Document): SpaceTree => {
  const space = document.documentElement
  if (!(space instanceof XRSpaceElement)) {
    throw new TypeError("Document must have one XRSpaceElement root")
  }

  const viewPoints = space.children.filter(
    (child): child is XRViewPointElement => child instanceof XRViewPointElement,
  )
  if (viewPoints.length !== 1) {
    throw new TypeError("Space must contain exactly one ViewPoint")
  }

  const displayIds = new Set<string>()
  const displays = space.children
    .filter((child): child is XRDisplayElement => child instanceof XRDisplayElement)
    .map(element => {
      if (element.id === "") throw new TypeError("Display id cannot be empty")
      if (displayIds.has(element.id)) {
        throw new TypeError(`Duplicate Display id: ${element.id}`)
      }
      displayIds.add(element.id)
      if (element.viewportWidth <= 0 || element.viewportHeight <= 0) {
        throw new TypeError(`Display ${element.id} viewport must be positive`)
      }
      if (element.worldUnitsPerPixel <= 0) {
        throw new TypeError(`Display ${element.id} worldUnitsPerPixel must be positive`)
      }
      return Object.freeze({
        element,
        id: element.id,
        viewport: Object.freeze({
          width: element.viewportWidth,
          height: element.viewportHeight,
        }),
        worldUnitsPerPixel: element.worldUnitsPerPixel,
        transform: Object.freeze({
          position: Object.freeze({x: element.x, y: element.y, z: element.z}),
          visible: element.visible,
        }),
      })
    })

  const hudElements = space.children.filter(
    (child): child is XRHUDElement => child instanceof XRHUDElement,
  )
  const hudElement = hudElements[0] ?? null
  if (hudElement && hudElement.id === "") throw new TypeError("HUD id cannot be empty")
  if (hudElement && displayIds.has(hudElement.id)) {
    throw new TypeError(`Duplicate projection id: ${hudElement.id}`)
  }

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
      ? Object.freeze({element: hudElement, id: hudElement.id, distance: hudElement.distance})
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
