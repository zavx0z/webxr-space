import {DisplayElement} from "@zavx0z/dom/display"
import type {ComponentRoot} from "@zavx0z/component"
import type {Document, Element, Node} from "@zavx0z/dom"
import type {RoutedNodesStory} from "./story-types.ts"

/** Mounts authored production components into the host's exact semantic Document. */
export function mountNodesStory(
  document: Document,
  route: string,
  staging: Element,
  root: ComponentRoot,
  typescript: string,
  props: Readonly<Record<string, unknown>>,
  cleanup: () => void = () => {},
): RoutedNodesStory {
  try {
    const element = staging.firstElementChild
    if (element === null) throw new Error(`История не создала корневой элемент: ${route}`)
    if (element.ownerDocument !== document) throw new Error(`История использует другой Document: ${route}`)
    staging.removeChild(element)
    element.setAttribute("data-nodes-story", route)
    let disposed = false
    return Object.freeze({story: Object.freeze({
      element,
      componentRoot: root,
      props,
      get source() { return Object.freeze({html: serialize(element), typescript}) },
      afterPresent() {
        let ancestor = element.parentElement
        while (ancestor !== null) {
          if (ancestor instanceof DisplayElement) return
          ancestor = ancestor.parentElement
        }
        throw new Error(`История ${route} смонтирована вне host-owned DisplayElement`)
      },
      dispose() {
        if (disposed) return
        disposed = true
        try { root.unmount() } finally { cleanup() }
      },
    })})
  } catch (error) {
    try { root.unmount() } finally { cleanup() }
    throw error
  }
}

function serialize(node: Node): string {
  if (node.nodeType === 3) return escape(node.textContent ?? "")
  if (node.nodeType !== 1) return ""
  const element = node as Element
  const attributes = element.getAttributeNames().map(name => ` ${name}="${escape(element.getAttribute(name) ?? "")}"`).join("")
  return `<${element.localName}${attributes}>${Array.from(element.childNodes, serialize).join("")}</${element.localName}>`
}

function escape(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
}
