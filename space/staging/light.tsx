import {resolveTransform, validateVector, type TransformProps, type SpatialVector} from "../src/props.ts"
import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import type {
  XRLightElement,
  XRObjectProjectionFactory,
} from "../src/elements.ts"
import type {SpaceRef} from "../src/jsx.ts"
import "../src/jsx.ts"

export type LightProps = TransformProps & Readonly<{
  kind?: string
  color?: string
  intensity?: number
  target?: SpatialVector
  visible?: boolean
  name?: string
  factory?: XRObjectProjectionFactory | null
  children?: JsxSourceElement | null | undefined
  ref?: SpaceRef<XRLightElement> | null
}>

export function Light(props: LightProps): JsxSourceElement {
  const quaternion = resolveTransform(props)
  validateVector(props.target, "target")
  return (
    <xr-light
      kind={props.kind}
      color={props.color}
      intensity={props.intensity}
      targetX={props.target?.x}
      targetY={props.target?.y}
      targetZ={props.target?.z}
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
      factory={props.factory}
      ref={props.ref}
    >
      {props.children}
    </xr-light>
  )
}
