import type {
  Document as SemanticDocument,
  Element as SemanticElement,
  HTMLElement as SemanticHTMLElement,
  Node as SemanticNode,
} from "@zavx0z/dom"
import {createRoot, type ComponentRoot} from "@zavx0z/component"
import type {CompiledTemplate} from "@zavx0z/template/compiled"

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

/** Shared compiled owner lifecycle and source serialization for view stories. */
export function mountOwnerStory<Props extends Readonly<Record<string, unknown>>>(
  document: SemanticDocument,
  template: CompiledTemplate<Props>,
  props: Props,
  name: string,
  typescript: string,
): RoutedProductionComponentStory {
  const staging = document.createElement("div")
  const root = createRoot(staging)
  root.render(template, props)
  const owner = staging.firstElementChild as SemanticHTMLElement | null
  if (owner === null) {
    root.unmount()
    throw new Error(`Compiled ${name} story mounted no owner`)
  }
  staging.removeChild(owner)
  owner.setAttribute("data-story-component", name)
  return Object.freeze({
    story: Object.freeze({
      element: owner,
      componentRoot: root,
      props: Object.freeze({...props}),
      get source() {
        return Object.freeze({html: serializeOwnerElement(owner), typescript})
      },
      dispose() {
        root.unmount()
        if (owner.parentNode !== null) owner.parentNode.removeChild(owner)
      },
    }),
  })
}

function serializeOwnerElement(element: SemanticElement, depth = 0): string {
  const indent = "  ".repeat(depth)
  const attributes = element.getAttributeNames().sort().map(name =>
    ` ${name}="${escapeHtml(element.getAttribute(name) ?? "")}"`
  ).join("")
  const children = [...element.childNodes].filter(node => node.nodeType === 1 || node.nodeType === 3)
  if (children.length === 0) return `${indent}<${element.localName}${attributes}></${element.localName}>`
  const body = children.map((node: SemanticNode) => node.nodeType === 3
    ? `${"  ".repeat(depth + 1)}${escapeHtml(node.textContent ?? "")}`
    : serializeOwnerElement(node as SemanticHTMLElement, depth + 1)).join("\n")
  return `${indent}<${element.localName}${attributes}>\n${body}\n${indent}</${element.localName}>`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
