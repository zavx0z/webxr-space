/**
Предпросмотр изображения с сохранением исходных пропорций.

@packageDocumentation
*/

/**
Данные изображения для области содержимого ноды.

@property width - Исходная ширина изображения в пикселях.

@property height - Исходная высота изображения в пикселях; пропорции сохраняются при вписывании.

@property [alt] - При отсутствии доступное описание берётся из подписи области содержимого.
*/
export type NodePreviewImage = Readonly<{
  src: string
  width: number
  height: number
  alt?: string | undefined
}>

export function ContentImage(props: Readonly<{
  image: NodePreviewImage
  label: string
}>) {
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
