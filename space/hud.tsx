import type {
  JsxSourceElement,
} from "@zavx0z/template/jsx-runtime"
import type {XRHUDElement} from "./src/elements.ts"
import type {SpaceRef} from "./src/jsx.ts"
import "./src/jsx.ts"

export type HUDProps = Readonly<{
  id: string
  distance?: number
  children?: JsxSourceElement | null | undefined
  ref?: SpaceRef<XRHUDElement> | null
}>

export function HUD(props: HUDProps): JsxSourceElement {
  return (
    <xr-hud
      id={props.id}
      distance={props.distance}
      ref={props.ref}
    >
      {props.children}
    </xr-hud>
  )
}
