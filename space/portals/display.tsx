import type {
  JsxSourceElement,
} from "@zavx0z/template/jsx-runtime"
import type {XRDisplayElement} from "../src/elements.ts"
import type {SpaceRef} from "../src/jsx.ts"
import "../src/jsx.ts"

/**
Положение задаётся в мм; viewportWidth/viewportHeight — размер содержимого в CSS px.
Проекцией владеет сам Element. `id` необязателен и используется только авторскими
селекторами и поиском; его изменение не заменяет проекцию или её Renderer.
*/
export type DisplayProps = Readonly<{
  id?: string | undefined
  style?: CssStyle | undefined
  viewportWidth?: number
  viewportHeight?: number
  /** Положительное количество миллиметров на один CSS px. */
  worldUnitsPerPixel?: number
  quaternionX?: number
  quaternionY?: number
  quaternionZ?: number
  quaternionW?: number
  x?: number
  y?: number
  z?: number
  visible?: boolean
  children?: JsxSourceElement | readonly JsxSourceElement[] | null | undefined
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
      quaternionX={props.quaternionX}
      quaternionY={props.quaternionY}
      quaternionZ={props.quaternionZ}
      quaternionW={props.quaternionW}
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
