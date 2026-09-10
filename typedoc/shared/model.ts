/** Модель документации переносится в JSON; объектов компилятора в ней нет. */
export type TypeDocComment = Readonly<{
  summary: string
  examples: readonly string[]
}>

export type TypeDocMember = Readonly<{
  name: string
  type: string
  optional: boolean
  description: string
  defaultValue?: string
}>

export type TypeDocDeclaration = Readonly<{
  name: string
  kind: "type" | "interface"
  signature: string
  comment: TypeDocComment
  members: readonly TypeDocMember[]
}>

export type TypeDocDocument = Readonly<{
  name: string
  declarations: readonly TypeDocDeclaration[]
}>

/** Снимки прочитанных источников позволяют потребителю проверить неизменность результата. */
export type TypeDocAnalysis = Readonly<{
  document: TypeDocDocument
  sources: readonly Readonly<{path: string; digest: string}>[]
}>
