import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import type {
  XRLineSegmentsElement,
  XRObjectProjectionFactory,
} from "./src/elements.ts"
import type {SpaceRef} from "./src/jsx.ts"
import "./src/jsx.ts"

export type LineSegmentsProps = Readonly<{
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
  ref?: SpaceRef<XRLineSegmentsElement> | null
}>

export function LineSegments(props: LineSegmentsProps): JsxSourceElement {
  return (
    <xr-line-segments
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
    </xr-line-segments>
  )
}
