import type {NodePreviewImage} from "../../../../shared/node/preview.ts"

export function NodePreviewImageView(props: Readonly<{image: NodePreviewImage; nodeLabel: string}>) {
  return <img
    src={props.image.src}
    width={props.image.width}
    height={props.image.height}
    alt={props.image.alt ?? `${props.nodeLabel} preview`}
    style={css`
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    `}
  />
}
