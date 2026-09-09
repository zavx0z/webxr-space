export type NodePreviewImage = Readonly<{
  src: string
  width: number
  height: number
  alt?: string | undefined
}>

export type NodePreview = Readonly<{
  enabled: boolean
  image?: NodePreviewImage | undefined
}>
