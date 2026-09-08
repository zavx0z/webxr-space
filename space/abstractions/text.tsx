import {resolveTransform, type TransformProps} from "../src/props.ts"
import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import type {
  XRObjectProjectionFactory,
  XRTextElement,
} from "../src/elements.ts"
import type {SpaceRef} from "../src/jsx.ts"
import "../src/jsx.ts"

export type TextProps = TransformProps & Readonly<{
  text?: string
  fontSize?: number
  letterSpacing?: number
  visible?: boolean
  name?: string
  factory?: XRObjectProjectionFactory | null
  children?: JsxSourceElement | null | undefined
  ref?: SpaceRef<XRTextElement> | null
}>

export function Text(props: TextProps): JsxSourceElement {
  const quaternion = resolveTransform(props)
  return (
    <xr-text
      text={props.text}
      fontSize={props.fontSize}
      letterSpacing={props.letterSpacing}
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
    </xr-text>
  )
}
