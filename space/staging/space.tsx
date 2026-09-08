import type {
  JsxSourceElement,
} from "@zavx0z/template/jsx-runtime"
import type {XRSpaceElement} from "../src/elements.ts"
import type {SpaceRef} from "../src/jsx.ts"
import "../src/jsx.ts"

export type SpaceProps = Readonly<{
  /** По умолчанию demand; always включает непрерывный общий цикл кадров. */
  frameloop?: "demand" | "always" | undefined
  background?: string
  children?: JsxSourceElement | readonly JsxSourceElement[] | null | undefined
  ref?: SpaceRef<XRSpaceElement> | null
}>

export function Space(props: SpaceProps): JsxSourceElement {
  return (
    <xr-space
      background={props.background}
      frameloop={props.frameloop}
      ref={props.ref}
    >
      {props.children}
    </xr-space>
  )
}
