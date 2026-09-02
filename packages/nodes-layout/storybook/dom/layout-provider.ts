import type {LayoutPresentationCase} from "../../dom/layout-presentation.ts"

export type LayoutDomCaseProvider = Readonly<{
  ids: readonly string[]
  createCases(ids: readonly string[]): readonly LayoutPresentationCase[]
  source(ids: readonly string[]): string
}>
