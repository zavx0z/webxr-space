import type {JsxChild} from "@zavx0z/template/jsx-runtime"
import type {Ref} from "@zavx0z/component"
import type {
  XRAnimationElement,
  XRAnimationProjectionFactory,
  XRAssetElement,
  XRGeometryElement,
  XRGeometryProjectionFactory,
  XRGroupElement,
  XRLightElement,
  XRLineElement,
  XRLineSegmentsElement,
  XRMaterialElement,
  XRMaterialProjectionFactory,
  XRMeshElement,
  XRObjectElement,
  XRObjectProjectionFactory,
  XRTextElement,
} from "./elements.ts"

export type SpaceRef<Target> = Ref<Target>

type SpatialChildren<Target> = Readonly<{
  children?: JsxChild | undefined
  ref?: SpaceRef<Target> | null | undefined
}>

export type XRObjectIntrinsicProperties<Target extends XRObjectElement> = SpatialChildren<Target> & Readonly<{
  x?: number | undefined
  y?: number | undefined
  z?: number | undefined
  quaternionX?: number | undefined
  quaternionY?: number | undefined
  quaternionZ?: number | undefined
  quaternionW?: number | undefined
  scaleX?: number | undefined
  scaleY?: number | undefined
  scaleZ?: number | undefined
  visible?: boolean | undefined
  name?: string | undefined
  factory?: XRObjectProjectionFactory | null | undefined
}>

export type XRGroupIntrinsicProperties = XRObjectIntrinsicProperties<XRGroupElement>
export type XRAssetIntrinsicProperties = XRObjectIntrinsicProperties<XRAssetElement> & Readonly<{
  factory: XRObjectProjectionFactory
}>
export type XRMeshIntrinsicProperties = XRObjectIntrinsicProperties<XRMeshElement>
export type XRLineIntrinsicProperties = XRObjectIntrinsicProperties<XRLineElement>
export type XRLineSegmentsIntrinsicProperties = XRObjectIntrinsicProperties<XRLineSegmentsElement>
export type XRTextIntrinsicProperties = XRObjectIntrinsicProperties<XRTextElement> & Readonly<{
  text?: string | undefined
  fontSize?: number | undefined
  letterSpacing?: number | undefined
}>
export type XRLightIntrinsicProperties = XRObjectIntrinsicProperties<XRLightElement> & Readonly<{
  kind?: string | undefined
  color?: string | undefined
  intensity?: number | undefined
  targetX?: number | undefined
  targetY?: number | undefined
  targetZ?: number | undefined
}>

export type XRAnimationIntrinsicProperties = Readonly<{
  factory: XRAnimationProjectionFactory
  playing?: boolean | undefined
  loop?: boolean | undefined
  timeScale?: number | undefined
  ref?: SpaceRef<XRAnimationElement> | null | undefined
}>

export type XRGeometryIntrinsicProperties = Readonly<{
  kind?: string | undefined
  width?: number | undefined
  height?: number | undefined
  depth?: number | undefined
  radius?: number | undefined
  tube?: number | undefined
  widthSegments?: number | undefined
  heightSegments?: number | undefined
  depthSegments?: number | undefined
  radialSegments?: number | undefined
  tubularSegments?: number | undefined
  factory?: XRGeometryProjectionFactory | null | undefined
  ref?: SpaceRef<XRGeometryElement> | null | undefined
}>

export type XRMaterialIntrinsicProperties = Readonly<{
  kind?: string | undefined
  color?: string | undefined
  factory?: XRMaterialProjectionFactory | null | undefined
  ref?: SpaceRef<XRMaterialElement> | null | undefined
}>

declare module "@zavx0z/dom" {
  interface HTMLElementTagNameMap {
    "xr-asset": XRAssetElement
    "xr-group": XRGroupElement
    "xr-mesh": XRMeshElement
    "xr-line": XRLineElement
    "xr-line-segments": XRLineSegmentsElement
    "xr-text": XRTextElement
    "xr-light": XRLightElement
    "xr-animation": XRAnimationElement
    "xr-geometry": XRGeometryElement
    "xr-material": XRMaterialElement
  }
}

declare module "@zavx0z/template/jsx-runtime" {
  namespace JSX {
    interface IntrinsicElements {
      "xr-asset": XRAssetIntrinsicProperties
      "xr-group": XRGroupIntrinsicProperties
      "xr-mesh": XRMeshIntrinsicProperties
      "xr-line": XRLineIntrinsicProperties
      "xr-line-segments": XRLineSegmentsIntrinsicProperties
      "xr-text": XRTextIntrinsicProperties
      "xr-light": XRLightIntrinsicProperties
      "xr-animation": XRAnimationIntrinsicProperties
      "xr-geometry": XRGeometryIntrinsicProperties
      "xr-material": XRMaterialIntrinsicProperties
    }
  }
}
