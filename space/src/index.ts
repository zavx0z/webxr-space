export {
  XRAnimationElement,
  XRAssetElement,
  XRElement,
  XRGeometryElement,
  XRGroupElement,
  XRHUDElement,
  XRLightElement,
  XRLineElement,
  XRLineSegmentsElement,
  XRMaterialElement,
  XRMeshElement,
  XRObjectElement,
  XRSpaceElement,
  XRTextElement,
  XRViewPointElement,
} from "./elements.ts"
export type {
  XRAnimationProjectionFactory,
  XRGeometryProjectionFactory,
  XRMaterialProjectionFactory,
  XRObjectProjectionContext,
  XRObjectProjectionFactory,
} from "./elements.ts"
export {createSpaceElementFactories} from "./factories.ts"
export {readSpaceTree} from "./tree.ts"
export type {
  SpaceHUDProjection,
  SpaceTree,
} from "./tree.ts"
export type {
  SpaceRef,
  XRAnimationIntrinsicProperties,
  XRAssetIntrinsicProperties,
  XRGeometryIntrinsicProperties,
  XRGroupIntrinsicProperties,
  XRHUDIntrinsicProperties,
  XRLightIntrinsicProperties,
  XRLineIntrinsicProperties,
  XRLineSegmentsIntrinsicProperties,
  XRMaterialIntrinsicProperties,
  XRMeshIntrinsicProperties,
  XRObjectIntrinsicProperties,
  XRSpaceIntrinsicProperties,
  XRTextIntrinsicProperties,
  XRViewPointIntrinsicProperties,
} from "./jsx.ts"

export type {SpatialVector, SpatialQuaternion, OrientationProps, TransformProps} from "./props.ts"
