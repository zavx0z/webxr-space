import type {
  JsxSourceElement,
} from "@zavx0z/template/jsx-runtime"
import type {XRDisplayElement} from "./src/elements.ts"
import type {SpaceRef} from "./src/jsx.ts"
import "./src/jsx.ts"

export type DisplayProps = Readonly<{
  id: string
  style?: CssStyle | undefined
  viewportWidth?: number
  viewportHeight?: number
  worldUnitsPerPixel?: number
  x?: number
  y?: number
  z?: number
  visible?: boolean
  children?: JsxSourceElement | null | undefined
  ref?: SpaceRef<XRDisplayElement> | null
}>

export function Display(props: DisplayProps): JsxSourceElement {
  return (
    <xr-display
      id={props.id}
      style={css`${props.style}`}
      viewportWidth={props.viewportWidth}
      viewportHeight={props.viewportHeight}
      worldUnitsPerPixel={props.worldUnitsPerPixel}
      x={props.x}
      y={props.y}
      z={props.z}
      visible={props.visible}
      ref={props.ref}
    >
      {props.children}
    </xr-display>
  )
}
