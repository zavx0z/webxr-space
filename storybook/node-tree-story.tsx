import {createNodeTreeExternalStore} from "@nodes/core"
import {NodeTree} from "@nodes/ui/node-tree"
import {
  type Document,
  type Element,
  type HTMLElement,
  type Node,
  type Text,
} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/react"
import type {NodesExternalStorySource} from "../../../.storybook/runtime.ts"
import {createCoreRuntimeScenario} from "./core-runtime-scenario.ts"

export function createCoreNodeTreeStory(document: Document, route: string) {
  if (route !== "core/node-tree/live") throw new Error(`Unknown Core story route: ${route}`)
  const scenario = createCoreRuntimeScenario()
  const host = document.createElement("section")
  const componentRoot = createRoot(host)
  componentRoot.render(<NodeTree
    store={createNodeTreeExternalStore(scenario.tree)}
    label="NodeTree · read-only Core projection"
  />)
  let disposed = false
  return Object.freeze({
    element: host,
    componentRoot,
    get props() { return scenario.snapshot() },
    source(): NodesExternalStorySource {
      return Object.freeze({
        html: serialize(host),
        typescript: [
          'import {createNodeTreeExternalStore} from "@nodes/core"',
          'import {NodeTree} from "@nodes/ui/node-tree"',
          'import {createRoot} from "@zavx0z/react"',
          "",
          "createRoot(container).render(<NodeTree store={createNodeTreeExternalStore(tree)} />)",
        ].join("\n"),
      })
    },
    dispose() {
      if (disposed) return
      disposed = true
      componentRoot.unmount()
      scenario.tree.dispose()
    },
  })
}

function serialize(element: Element, depth = 0): string {
  const indent = "  ".repeat(depth)
  const attrs = element.getAttributeNames().sort().map(name =>
    ` ${name}="${escape(element.getAttribute(name) ?? "")}"`).join("")
  const children = [...element.childNodes].filter(node => node.nodeType === 1 || node.nodeType === 3)
  if (children.length === 0) return `${indent}<${element.localName}${attrs}></${element.localName}>`
  const body = children.map((node: Node) => node.nodeType === 3
    ? `${"  ".repeat(depth + 1)}${escape((node as Text).data)}`
    : serialize(node as HTMLElement, depth + 1)).join("\n")
  return `${indent}<${element.localName}${attrs}>\n${body}\n${indent}</${element.localName}>`
}

function escape(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;")
}
