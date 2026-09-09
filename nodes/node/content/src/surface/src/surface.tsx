import type {NodeChildren} from "../../../../shared/contracts.ts"
import type {NodePreviewImage} from "../../image/src/image.tsx"
import {ContentImage} from "../../image/src/image.tsx"

export type ContentSurfaceProps = Readonly<{
  children?: NodeChildren
  image?: NodePreviewImage | undefined
  label: string
}>

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
