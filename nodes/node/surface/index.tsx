/**
Произвольное содержимое квадратной области ContentNode.

@packageDocumentation
*/

import {ContentImage} from "../image/index.tsx"
import type {ContentSurfaceProps} from "./contract/input.ts"
export type {ContentSurfaceProps} from "./contract/input.ts"

/** Показывает авторское содержимое либо изображение в границах предоставленной области. */

export function ContentSurface(props: ContentSurfaceProps) {
  return <section
    aria-label={props.label}
    style={css`
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      min-width: 0;
      min-height: 0;
      overflow: hidden;
    `}
  >
    {props.children}
    {props.children == null && props.image !== undefined ? <ContentImage
      image={props.image}
      label={props.label}
    /> : null}
  </section>
}
