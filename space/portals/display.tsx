import {resolveDisplayMetrics, resolveTransform, type DisplayMetricsProps, type TransformProps} from "../src/props.ts"
import type {
  JsxSourceElement,
} from "@zavx0z/template/jsx-runtime"
import type {XRDisplayElement} from "../src/elements.ts"
import type {SpaceRef} from "../src/jsx.ts"
import "../src/jsx.ts"

/**
Физический размер size в мм, разрешение resolution в пикселях матрицы.
pixelRatio задаёт пиксели матрицы на CSS px; трансформации следуют общему закону Space.
Проекцией владеет сам Element. `id` необязателен и используется только авторскими
селекторами и поиском; его изменение не заменяет проекцию или её Renderer.
*/
export type DisplayProps = TransformProps & DisplayMetricsProps & Readonly<{
  id?: string | undefined
  style?: CssStyle | undefined
  visible?: boolean
  children?: JsxSourceElement | readonly JsxSourceElement[] | null | undefined
  ref?: SpaceRef<XRDisplayElement> | null
}>

export function Display(props: DisplayProps): JsxSourceElement {
  const quaternion = resolveTransform(props)
  const metrics = resolveDisplayMetrics(props)
  const scaleY = (props.scale?.y ?? 1) * metrics.aspectScale
  if (!Number.isFinite(scaleY) || scaleY === 0) throw new RangeError("Display scale exceeds finite projection dimensions")
  return (
    <xr-display
      id={props.id}
      style={css`${props.style}`}
      viewportWidth={metrics.width}
      viewportHeight={metrics.height}
      worldUnitsPerPixel={metrics.units}
      quaternionX={quaternion?.x}
      quaternionY={quaternion?.y}
      quaternionZ={quaternion?.z}
      quaternionW={quaternion?.w}
      x={props.position?.x}
      y={props.position?.y}
      z={props.position?.z}
      scaleX={props.scale?.x}
      scaleY={scaleY}
      scaleZ={props.scale?.z}
      visible={props.visible}
      ref={props.ref}
    >
      {props.children}
    </xr-display>
  )
}
