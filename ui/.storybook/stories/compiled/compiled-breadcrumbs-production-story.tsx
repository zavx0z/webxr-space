import {createRoot, useState} from "@zavx0z/component"
import type {
  Document as SemanticDocument,
  Element as SemanticElement,
  HTMLElement as SemanticHTMLElement,
  Node as SemanticNode,
} from "@zavx0z/dom"
import {
  Breadcrumbs,
  type BreadcrumbsItem,
} from "@zavx0z/ui/navigation/breadcrumbs"
import type {RoutedProductionComponentStory} from "../story-types.ts"

export type BreadcrumbsStoryProps = Readonly<{
  items: readonly BreadcrumbsItem[]
}>

function BreadcrumbsStory(props: BreadcrumbsStoryProps) {
  const [currentId, setCurrentId] = useState(props.items.at(-1)?.id ?? "")
  const currentIndex = props.items.findIndex(item => item.id === currentId)
  const items = currentIndex < 0 ? props.items : props.items.slice(0, currentIndex + 1)
  return <div
    style={css`
      box-sizing: border-box;
      display: flex;
      align-items: center;
      width: 560px;
      height: 24px;
      padding: 2px 12px 0;
      border-top: 2px solid var(--status-bar-top);
      background: var(--status-bar-background);
      font-size: 11px;
      line-height: 20px;
    `}
  >
    <Breadcrumbs
      items={items}
      label="Путь компонента"
      onNavigate={item => setCurrentId(item.id)}
    />
  </div>
}

export function createCompiledBreadcrumbsProductionStory(
  document: SemanticDocument,
  props: BreadcrumbsStoryProps,
): RoutedProductionComponentStory {
  const staging = document.createElement("div")
  const root = createRoot(staging)
  root.render(BreadcrumbsStory as any, props)
  const owner = staging.firstElementChild as SemanticHTMLElement | null
  if (owner === null) {
    root.unmount()
    throw new Error("Compiled Breadcrumbs story mounted no owner")
  }
  staging.removeChild(owner)
  owner.setAttribute("data-story-component", "breadcrumbs")
  return Object.freeze({
    story: Object.freeze({
      element: owner,
      componentRoot: root,
      get source() {
        return Object.freeze({
          html: serialize(owner),
          typescript: sourceFor(props),
        })
      },
      props: Object.freeze({items: props.items}),
      dispose() {
        root.unmount()
      },
    }),
  })
}

function sourceFor(props: BreadcrumbsStoryProps): string {
  return [
    'import {Breadcrumbs} from "@zavx0z/ui/navigation/breadcrumbs"',
    'import {createRoot} from "@zavx0z/component"',
    "",
    `const items = ${JSON.stringify(props.items, null, 2)} as const`,
    "createRoot(container).render(<Breadcrumbs items={items} />)",
  ].join("\n")
}

function serialize(element: SemanticElement, depth = 0): string {
  const indent = "  ".repeat(depth)
  const attributes = element.getAttributeNames().sort()
    .map(name => ` ${name}="${escapeHtml(element.getAttribute(name) ?? "")}"`)
    .join("")
  const children = [...element.childNodes].filter(node => node.nodeType === 1 || node.nodeType === 3)
  if (children.length === 0) return `${indent}<${element.localName}${attributes}></${element.localName}>`
  const body = children.map((node: SemanticNode) => node.nodeType === 3
    ? `${"  ".repeat(depth + 1)}${escapeHtml(node.textContent ?? "")}`
    : serialize(node as SemanticHTMLElement, depth + 1)).join("\n")
  return `${indent}<${element.localName}${attributes}>\n${body}\n${indent}</${element.localName}>`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
