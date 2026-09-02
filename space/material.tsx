import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import type {
  XRMaterialElement,
  XRMaterialProjectionFactory,
} from "./src/elements.ts"
import type {SpaceRef} from "./src/jsx.ts"
import "./src/jsx.ts"

export type MaterialProps = Readonly<{
  kind?: string
  color?: string
  factory?: XRMaterialProjectionFactory | null
  ref?: SpaceRef<XRMaterialElement> | null
}>

export function Material(props: MaterialProps): JsxSourceElement {
  return (
    <xr-material
      kind={props.kind}
      color={props.color}
      factory={props.factory}
      ref={props.ref}
    />
  )
}
