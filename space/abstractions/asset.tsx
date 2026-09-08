import {resolveTransform, type TransformProps} from "../src/props.ts"
import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import type {
  XRAssetElement,
  XRObjectProjectionFactory,
} from "../src/elements.ts"
import type {SpaceRef} from "../src/jsx.ts"
import "../src/jsx.ts"

export type AssetProps = TransformProps & Readonly<{
  factory: XRObjectProjectionFactory
  visible?: boolean
  name?: string
  children?: JsxSourceElement | readonly JsxSourceElement[] | null | undefined
  ref?: SpaceRef<XRAssetElement> | null
}>

export function Asset(props: AssetProps): JsxSourceElement {
  const quaternion = resolveTransform(props)
  return (
    <xr-asset
      factory={props.factory}
      x={props.position?.x}
      y={props.position?.y}
      z={props.position?.z}
      quaternionX={quaternion?.x}
      quaternionY={quaternion?.y}
      quaternionZ={quaternion?.z}
      quaternionW={quaternion?.w}
      scaleX={props.scale?.x}
      scaleY={props.scale?.y}
      scaleZ={props.scale?.z}
      visible={props.visible}
      name={props.name}
      ref={props.ref}
    >
      {props.children}
    </xr-asset>
  )
}
