import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import type {XRViewPointElement} from "./src/elements.ts"
import type {SpaceRef} from "./src/jsx.ts"
import "./src/jsx.ts"

export type ViewPointProps = Readonly<{
  x?: number
  y?: number
  z?: number
  targetX?: number
  targetY?: number
  targetZ?: number
  upX?: number
  upY?: number
  upZ?: number
  fov?: number
  near?: number
  far?: number
  ref?: SpaceRef<XRViewPointElement> | null
}>

export function ViewPoint(props: ViewPointProps): JsxSourceElement {
  return (
    <xr-view-point
      x={props.x}
      y={props.y}
      z={props.z}
      targetX={props.targetX}
      targetY={props.targetY}
      targetZ={props.targetZ}
      upX={props.upX}
      upY={props.upY}
      upZ={props.upZ}
      fov={props.fov}
      near={props.near}
      far={props.far}
      ref={props.ref}
    />
  )
}
