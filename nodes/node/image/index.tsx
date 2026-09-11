/**
Предпросмотр изображения с сохранением исходных пропорций.

@packageDocumentation
*/

import type {ContentImageProps} from "./contract/input.ts"
export type {ContentImageProps} from "./contract/input.ts"

/** Вписывает исходное изображение в предоставленную область без изменения его пропорций. */
export function ContentImage(props: ContentImageProps) {
  return <img
    src={props.image.src}
    width={props.image.width}
    height={props.image.height}
    alt={props.image.alt ?? props.label}
    style={css`
      display: block;
      width: 100%;
      height: 100%;
      object-fit: contain;
    `}
  />
}
