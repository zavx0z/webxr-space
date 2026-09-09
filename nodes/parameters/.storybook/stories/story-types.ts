import type {ComponentRoot} from "@zavx0z/component"
import type {Document, Node} from "@zavx0z/dom"

export type OwnerStoryPresentation = Readonly<{
  element: Node
  componentRoot: Pick<ComponentRoot, "readStyleSheets">
  source: Readonly<{html: string; typescript: string}>
  props?: Readonly<Record<string, unknown>>
  afterPresent?(): void
  dispose(): void
}>

export type RoutedNodesStory = Readonly<{story: OwnerStoryPresentation}>

export type OwnerStoryDescriptor = Readonly<{
  route: string
  create(document: Document): RoutedNodesStory | Promise<RoutedNodesStory>
}>

export function defineOwnerStory(
  route: string,
  create: OwnerStoryDescriptor["create"],
): OwnerStoryDescriptor {
  return Object.freeze({route, create})
}
