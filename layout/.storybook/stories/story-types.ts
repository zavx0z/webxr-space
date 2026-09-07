import type {ComponentRoot} from "@zavx0z/component"
import type {Document, Node} from "@zavx0z/dom"

export type OwnerStoryPresentation = Readonly<{
  element: Node
  componentRoot: Pick<ComponentRoot, "readStyleSheets">
  source: Readonly<{html: string; typescript: string}>
  props: Readonly<Record<string, unknown>>
  dispose(): void
}>

export type OwnerStoryDescriptor = Readonly<{
  route: string
  create(document: Document): Promise<Readonly<{story: OwnerStoryPresentation}>>
}>

export function defineReportStory(route: string): OwnerStoryDescriptor {
  return Object.freeze({
    route,
    async create(document: Document) {
      const {createReportStory} = await import("./compiled/report.tsx")
      return createReportStory(document, route)
    },
  })
}
