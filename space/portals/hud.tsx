import type {
  JsxSourceElement,
} from "@zavx0z/template/jsx-runtime"
import type {XRHUDElement} from "../src/elements.ts"
import type {SpaceRef} from "../src/jsx.ts"
import "../src/jsx.ts"

/** HUD принадлежит своему Element; необязательный id не участвует в регистрации проекции. */
export type HUDProps = Readonly<{
  id?: string | undefined
  distance?: number
  children?: JsxSourceElement | readonly JsxSourceElement[] | null | undefined
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
