/** Package-owned external Storybook story support. */
import {
  ReadonlyControl,
  type ReadonlyControlProps
} from "@ui/components/controls/readonly-control"
import type {Document, Element, HTMLElement, Node} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/react"
import type {RoutedProductionComponentStory} from "../story-types.ts"

function ReadonlyControlStoryComponent(props: Readonly<{initial: ReadonlyControlProps}>) {
  return <ReadonlyControl
    value={props.initial.value}
    title={props.initial.title}
  />
}

export function createCompiledReadonlyControlProductionStory(
  document: Document,
  props: ReadonlyControlProps
): RoutedProductionComponentStory {
  const staging = document.createElement("div")
  const root = createRoot(staging)
  root.render(<ReadonlyControlStoryComponent initial={props} />)
  const owner = staging.firstElementChild as HTMLElement | null
  if (owner === null) {
    root.unmount()
    throw new Error("Compiled ReadonlyControl story mounted no owner")
  }
  staging.removeChild(owner)
  owner.setAttribute("data-story-component", "readonly-control")
  return Object.freeze({
    story: Object.freeze({
      element: owner,
      componentRoot: root,
      get source() {
        return Object.freeze({
          html: serialize(owner),
          typescript: source(props)
        })
      },
      dispose() {
        root.unmount()
      }
    })
  })
}

function source(props: ReadonlyControlProps): string {
  return [
    'import {ReadonlyControl} from "@ui/components/controls/readonly-control"',
    'import {createRoot} from "@zavx0z/react"',
    "",
    "createRoot(container).render(",
    "  <ReadonlyControl",
    `    value={${JSON.stringify(props.value)}}`,
    `    title={${JSON.stringify(props.title ?? "")}}`,
    "  />",
    ")"
  ].join("\n")
}

function serialize(element: Element, depth = 0): string {
  const indent = "  ".repeat(depth)
  const attributes = element.getAttributeNames().sort().map(name =>
    ` ${name}="${escapeHtml(element.getAttribute(name) ?? "")}"`
  ).join("")
  const children = [...element.childNodes]
  if (children.length === 0) return `${indent}<${element.localName}${attributes}></${element.localName}>`
  const body = children.map((node: Node) => node.nodeType === 3
    ? `${"  ".repeat(depth + 1)}${escapeHtml(node.textContent ?? "")}`
    : serialize(node as HTMLElement, depth + 1)).join("\n")
  return `${indent}<${element.localName}${attributes}>\n${body}\n${indent}</${element.localName}>`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
