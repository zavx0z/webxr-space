import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import type {XRViewPointElement} from "./src/elements.ts"
import type {SpaceRef} from "./src/jsx.ts"
import "./src/jsx.ts"

/** Положение, цель и near/far заданы в мм, fov — в радианах; мировая ось вверх всегда Z. */
export type ViewPointProps = Readonly<{
  x?: number
  y?: number
  z?: number
  targetX?: number
  targetY?: number
  targetZ?: number
  /** Разрешает orbit/pan/zoom в свободной области общего ввода; по умолчанию выключено. */
  controls?: boolean
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
      controls={props.controls}
      fov={props.fov}
      near={props.near}
      far={props.far}
      ref={props.ref}
    />
  )
}
