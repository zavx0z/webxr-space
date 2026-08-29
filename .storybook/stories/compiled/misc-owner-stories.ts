import type {Document, Element, HTMLElement, Node} from "@zavx0z/dom"
import type {RoutedProductionComponentStory} from "../story-types.ts"

const miscCss = String.raw`
.ui-owner-misc-story {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 360px;
  min-height: 160px;
  gap: 8px;
  padding: 16px;
  overflow: auto;
  border: 1px solid rgb(22, 22, 22);
  background: rgb(48, 48, 48);
  color: rgb(224, 224, 224);
}
`

export function createScrollbarOwnerStory(document: Document): RoutedProductionComponentStory {
  const root = document.createElement("section")
  const content = document.createElement("div")
  root.className = "ui-owner-misc-story"
  root.setAttribute("data-story-component", "scrollbar")
  content.append("Scrollable owner content ".repeat(24))
  root.append(content)
  return result(root, "Scrollbar · vertical", "const owner = document.createElement(\"section\")")
}

export function createUnavailableOwnerStory(document: Document): RoutedProductionComponentStory {
  const root = document.createElement("section")
  root.className = "ui-owner-misc-story"
  root.setAttribute("data-story-component", "noti")
  root.append("Noti has no production export")
  return result(root, "Noti · unavailable", "// Documentation-only unavailable production owner")
}

function result(
  element: HTMLElement,
  title: string,
  typescript: string,
): RoutedProductionComponentStory {
  const story = Object.freeze({
    element,
    source: Object.freeze({html: serialize(element), css: miscCss, typescript: `${title}\n${typescript}`}),
    dispose() {},
  })
  return Object.freeze({story, css: miscCss})
}

function serialize(element: Element, depth = 0): string {
  const indent = "  ".repeat(depth)
  const attributes = element.getAttributeNames().sort()
    .map((name) => ` ${name}="${escapeHtml(element.getAttribute(name) ?? "")}"`).join("")
  const children = [...element.childNodes].filter((node) => node.nodeType === 1 || node.nodeType === 3)
  if (children.length === 0) return `${indent}<${element.localName}${attributes}></${element.localName}>`
  const body = children.map((node: Node) => node.nodeType === 3
    ? `${"  ".repeat(depth + 1)}${escapeHtml(node.textContent ?? "")}`
    : serialize(node as HTMLElement, depth + 1)).join("\n")
  return `${indent}<${element.localName}${attributes}>\n${body}\n${indent}</${element.localName}>`
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
