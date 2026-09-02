import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import type {
  XRAssetElement,
  XRObjectProjectionFactory,
} from "./src/elements.ts"
import type {SpaceRef} from "./src/jsx.ts"
import "./src/jsx.ts"

export type AssetProps = Readonly<{
  factory: XRObjectProjectionFactory
  x?: number
  y?: number
  z?: number
  quaternionX?: number
  quaternionY?: number
  quaternionZ?: number
  quaternionW?: number
  scaleX?: number
  scaleY?: number
  scaleZ?: number
  visible?: boolean
  name?: string
  children?: JsxSourceElement | null | undefined
  ref?: SpaceRef<XRAssetElement> | null
}>

export function Asset(props: AssetProps): JsxSourceElement {
  return (
    <xr-asset
      factory={props.factory}
      x={props.x}
      y={props.y}
      z={props.z}
      quaternionX={props.quaternionX}
      quaternionY={props.quaternionY}
      quaternionZ={props.quaternionZ}
      quaternionW={props.quaternionW}
      scaleX={props.scaleX}
      scaleY={props.scaleY}
      scaleZ={props.scaleZ}
      visible={props.visible}
      name={props.name}
      ref={props.ref}
    >
      {props.children}
    </xr-asset>
  )
}
