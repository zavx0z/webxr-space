import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import type {
  XRLightElement,
  XRObjectProjectionFactory,
} from "./src/elements.ts"
import type {SpaceRef} from "./src/jsx.ts"
import "./src/jsx.ts"

export type LightProps = Readonly<{
  kind?: string
  color?: string
  intensity?: number
  targetX?: number
  targetY?: number
  targetZ?: number
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
  factory?: XRObjectProjectionFactory | null
  children?: JsxSourceElement | null | undefined
  ref?: SpaceRef<XRLightElement> | null
}>

export function Light(props: LightProps): JsxSourceElement {
  return (
    <xr-light
      kind={props.kind}
      color={props.color}
      intensity={props.intensity}
      targetX={props.targetX}
      targetY={props.targetY}
      targetZ={props.targetZ}
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
      factory={props.factory}
      ref={props.ref}
    >
      {props.children}
    </xr-light>
  )
}
