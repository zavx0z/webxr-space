import type {DocumentElementFactory} from "@zavx0z/dom"
import {
  XRAnimationElement,
  XRAssetElement,
  XRGeometryElement,
  XRGroupElement,
  XRLightElement,
  XRLineElement,
  XRLineSegmentsElement,
  XRMaterialElement,
  XRMeshElement,
  XRTextElement,
} from "./elements.ts"

export const createSpaceElementFactories = (): Readonly<Record<string, DocumentElementFactory>> =>
  Object.freeze({
    "xr-asset": document => new XRAssetElement(document),
    "xr-group": document => new XRGroupElement(document),
    "xr-mesh": document => new XRMeshElement(document),
    "xr-line": document => new XRLineElement(document),
    "xr-line-segments": document => new XRLineSegmentsElement(document),
    "xr-text": document => new XRTextElement(document),
    "xr-light": document => new XRLightElement(document),
    "xr-animation": document => new XRAnimationElement(document),
    "xr-geometry": document => new XRGeometryElement(document),
    "xr-material": document => new XRMaterialElement(document),
  })
