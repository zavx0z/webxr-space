import type {
  JsxSourceElement,
} from "@zavx0z/template/jsx-runtime"
import type {XRSpaceElement} from "./src/elements.ts"
import type {SpaceRef} from "./src/jsx.ts"
import "./src/jsx.ts"

export type SpaceProps = Readonly<{
  background?: string
  children?: JsxSourceElement | null | undefined
  ref?: SpaceRef<XRSpaceElement> | null
}>

export function Space(props: SpaceProps): JsxSourceElement {
  return (
    <xr-space
      background={props.background}
      ref={props.ref}
    >
      {props.children}
    </xr-space>
  )
}
