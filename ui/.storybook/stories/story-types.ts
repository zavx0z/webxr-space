import type {Node as SemanticNode} from "@zavx0z/dom"
import type {ComponentRoot} from "@zavx0z/component"

export type OwnerStorySource = Readonly<{
  html: string
  typescript: string
}>

export type OwnerStoryPresentation = Readonly<{
  element: SemanticNode
  componentRoot: Pick<ComponentRoot, "readStyleSheets">
  source: OwnerStorySource
  props?: Readonly<Record<string, unknown>>
  afterPresent?(): void
  dispose(): void
}>

export type RoutedProductionComponentStory = Readonly<{
  story: OwnerStoryPresentation
}>

export type OwnerStoryDescriptor = Readonly<{
  route: string
  create(document: import("@zavx0z/dom").Document):
    RoutedProductionComponentStory | Promise<RoutedProductionComponentStory>
}>

export function defineOwnerStory(
  route: string,
  create: OwnerStoryDescriptor["create"],
): OwnerStoryDescriptor {
  return Object.freeze({route, create})
}

export function withStoryProps(
  routed: RoutedProductionComponentStory,
  props: Readonly<Record<string, unknown>>,
): RoutedProductionComponentStory {
  const afterPresent = routed.story.afterPresent
  return Object.freeze({
    story: Object.freeze({
      element: routed.story.element,
      componentRoot: routed.story.componentRoot,
      get source() { return routed.story.source },
      props: Object.freeze({...props}),
      ...(afterPresent === undefined ? {} : {afterPresent}),
      dispose: () => routed.story.dispose(),
    }),
  })
}
