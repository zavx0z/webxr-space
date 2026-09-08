import {resolveTransform, type TransformProps} from "../src/props.ts"
import type {
  JsxSourceElement,
} from "@zavx0z/template/jsx-runtime"
import type {
  XRMeshElement,
  XRObjectProjectionFactory,
} from "../src/elements.ts"
import type {SpaceRef} from "../src/jsx.ts"
import "../src/jsx.ts"

export type MeshProps = TransformProps & Readonly<{
  visible?: boolean
  name?: string
  factory?: XRObjectProjectionFactory | null
  children?: JsxSourceElement | readonly JsxSourceElement[] | null | undefined
  ref?: SpaceRef<XRMeshElement> | null
}>

export function Mesh(props: MeshProps): JsxSourceElement {
  const quaternion = resolveTransform(props)
  return (
    <xr-mesh
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
    </xr-mesh>
  )
}
