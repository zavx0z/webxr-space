import type {HTMLElement} from "@zavx0z/dom"
import type {ComponentRoot} from "@zavx0z/react"

export type OwnerStorySource = Readonly<{
  html: string
  typescript: string
}>

export type OwnerStoryPresentation = Readonly<{
  element: HTMLElement
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
  return Object.freeze({
    story: Object.freeze({
      element: routed.story.element,
      componentRoot: routed.story.componentRoot,
      get source() { return routed.story.source },
      props: Object.freeze({...props}),
      afterPresent: routed.story.afterPresent === undefined
        ? undefined
        : () => routed.story.afterPresent?.(),
      dispose: () => routed.story.dispose(),
    }),
  })
}
