import {validateVector, type SpatialVector} from "../src/props.ts"
import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import type {XRViewPointElement} from "../src/elements.ts"
import type {SpaceRef} from "../src/jsx.ts"
import "../src/jsx.ts"

/**
Положение, цель и near/far заданы в мм, fov — в радианах; мировая ось вверх всегда Z.
Props применяются при изменении их авторских значений. Жесты и команды через `ref`
сохраняют положение камеры при повторном render с прежними координатами.
*/
export type ViewPointProps = Readonly<{
  position?: SpatialVector
  target?: SpatialVector
  /** Разрешает orbit/pan/zoom в свободной области общего ввода; по умолчанию выключено. */
  controls?: boolean
  fov?: number
  near?: number
  far?: number
  ref?: SpaceRef<XRViewPointElement> | null
}>

export function ViewPoint(props: ViewPointProps): JsxSourceElement {
  validateVector(props.position, "position")
  validateVector(props.target, "target")
  return (
    <xr-view-point
      x={props.position?.x}
      y={props.position?.y}
      z={props.position?.z}
      targetX={props.target?.x}
      targetY={props.target?.y}
      targetZ={props.target?.z}
      controls={props.controls}
      fov={props.fov}
      near={props.near}
      far={props.far}
      ref={props.ref}
    />
  )
}
