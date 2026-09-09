import type {ViewPointElement} from "../index.ts"

export function CameraFixture(props: Readonly<{
  x?: number
  y?: number
  z?: number
  targetZ?: number
  ref: Readonly<{current: ViewPointElement | null}>
}>) {
  return (
    <viewpoint
      x={props.x}
      y={props.y}
      z={props.z}
      targetZ={props.targetZ}
      ref={props.ref}
    />
  )
}
