import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"

export type NodeRect = Readonly<{x: number; y: number; width: number; height: number}>

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

export type NodeKind = "parameter" | "content" | "diagram"
export type NodeShape = "rectangle" | "oval" | "circle"
export type NodeChildren = JsxSourceElement | readonly JsxSourceElement[] | null | undefined
export type NodeAction = Readonly<{id: string; label: string; iconSrc: string; selected?: boolean | undefined; disabled?: boolean | undefined; onClick?: ((event: Event) => void) | undefined}>
