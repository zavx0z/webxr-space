import type {DocumentElementFactory} from "@zavx0z/dom"
import {
  XRAnimationElement,
  XRAssetElement,
  XRDisplayElement,
  XRGeometryElement,
  XRGroupElement,
  XRHUDElement,
  XRLightElement,
  XRLineElement,
  XRLineSegmentsElement,
  XRMaterialElement,
  XRMeshElement,
  XRSpaceElement,
  XRTextElement,
  XRViewPointElement,
} from "./elements.ts"

export const createSpaceElementFactories = (): Readonly<Record<string, DocumentElementFactory>> =>
  Object.freeze({
    "xr-space": document => new XRSpaceElement(document),
    "xr-view-point": document => new XRViewPointElement(document),
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
    "xr-display": document => new XRDisplayElement(document),
    "xr-hud": document => new XRHUDElement(document),
  })
