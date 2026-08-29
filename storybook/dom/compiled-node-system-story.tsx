import {
  Parameter,
  createNodeTree,
  createNodeTreeExternalStore,
  type NodeJsonValue,
} from "@nodes/core"
import {NodeTreeEditor} from "@nodes/editor"
import {
  NodeSystem,
  nodeSystemCss,
  type NodeSystemParameterInput,
} from "@nodes/ui/node-system"
import type {Document, Element, HTMLElement, Node} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/react"
import type {ProductionNodeStory} from "./production-node-story.ts"
import type {NodesExternalStorySource} from "../../../../.storybook/runtime.ts"

type GeneralParameter = Parameter<NodeJsonValue, NodeJsonValue>

/** Real compiled TSX story bound directly to one Core tree and its Editor. */
export function createCompiledNodeSystemStory(document: Document): ProductionNodeStory {
  const tree = createGeneralNodeTree()
  const editor = new NodeTreeEditor(tree)
  const store = createNodeTreeExternalStore(tree)
  const host = document.createElement("section")
  const root = createRoot(host)
  const onParameterInput = (change: NodeSystemParameterInput) => {
    editor.setParameterValue({
      expectedRevision: tree.revision,
      nodeId: change.nodeId,
      parameterId: change.parameterId,
      value: change.value,
    })
  }

  host.setAttribute("data-compiled-node-system-story", "")
  root.render(<NodeSystem
    store={store}
    label="General compiled node system"
    style={{height: 520, minHeight: 520}}
    onParameterInput={onParameterInput}
  />)

  let disposed = false
  return Object.freeze({
    element: host,
    get props() { return tree.getSnapshot() },
    source(): NodesExternalStorySource {
      return Object.freeze({
        html: serialize(host),
        css: nodeSystemCss,
        typescript: storySource(),
      })
    },
    ready: async () => {},
    dispose() {
      if (disposed) return
      disposed = true
      root.unmount()
      editor.dispose()
      tree.dispose()
    },
  })
}

function createGeneralNodeTree() {
  const geometry = parameter("geometry", null, {label: "Geometry"}, "geometry")
  const seed = parameter("seed", 12, {label: "Seed", min: 0, max: 999, step: 1}, "integer")
  const scale = parameter("scale", 4.2, {label: "Scale", min: 0, max: 32, step: 0.1}, "float")
  const normalize = parameter("normalize", true, {label: "Normalize"}, "boolean")
  const profile = parameter("profile", [0.15, 0.48, 0.82], {label: "Profile"}, "vector")
  const fieldGeometry = parameter("geometry", null, {label: "Geometry", readOnly: true}, "geometry")
  const fieldOutput = parameter("field", null, {label: "Field", readOnly: true}, "shader")
  const material = parameter("material", "Graph material", {label: "Material"}, "string")
  const surface = parameter("surface", null, {label: "Surface", readOnly: true}, "shader")

  return createNodeTree<GeneralParameter>({
    nodes: Object.freeze([
      Object.freeze({
        id: "geometry-input",
        metadata: Object.freeze({
          label: "Geometry Input",
          category: "Source",
          headerColor: "rgb(72 101 122)",
          x: 42,
          y: 106,
          width: 232,
        }),
        parameters: Object.freeze([geometry]),
        sockets: Object.freeze([Object.freeze({
          id: "geometry-output",
          parameterId: "geometry",
          direction: "output" as const,
          side: "right" as const,
          valueType: type("geometry"),
          metadata: Object.freeze({label: "Geometry"}),
        })]),
      }),
      Object.freeze({
        id: "procedural-field",
        metadata: Object.freeze({
          label: "Procedural Field",
          category: "General",
          headerColor: "rgb(99 78 117)",
          x: 322,
          y: 48,
          width: 296,
        }),
        parameters: Object.freeze([fieldGeometry, seed, scale, normalize, profile, fieldOutput]),
        sockets: Object.freeze([
          Object.freeze({
            id: "geometry-input",
            parameterId: "geometry",
            direction: "input" as const,
            side: "left" as const,
            valueType: type("geometry"),
            metadata: Object.freeze({label: "Geometry"}),
          }),
          Object.freeze({
            id: "field-output",
            parameterId: "field",
            direction: "output" as const,
            side: "right" as const,
            valueType: type("shader"),
            metadata: Object.freeze({label: "Field"}),
          }),
        ]),
      }),
      Object.freeze({
        id: "material-output",
        metadata: Object.freeze({
          label: "Material Output",
          category: "Output",
          headerColor: "rgb(124 73 73)",
          x: 674,
          y: 132,
          width: 244,
        }),
        parameters: Object.freeze([material, surface]),
        sockets: Object.freeze([Object.freeze({
          id: "surface-input",
          parameterId: "surface",
          direction: "input" as const,
          side: "left" as const,
          valueType: type("shader"),
          metadata: Object.freeze({label: "Surface"}),
        })]),
      }),
    ]),
    links: Object.freeze([
      Object.freeze({
        id: "geometry-link",
        from: Object.freeze({nodeId: "geometry-input", socketId: "geometry-output"}),
        to: Object.freeze({nodeId: "procedural-field", socketId: "geometry-input"}),
        metadata: Object.freeze({label: "Geometry → Field"}),
      }),
      Object.freeze({
        id: "surface-link",
        from: Object.freeze({nodeId: "procedural-field", socketId: "field-output"}),
        to: Object.freeze({nodeId: "material-output", socketId: "surface-input"}),
        metadata: Object.freeze({label: "Field → Surface"}),
      }),
    ]),
  })
}

function parameter(
  id: string,
  value: NodeJsonValue,
  presentation: NodeJsonValue,
  valueType: string,
): GeneralParameter {
  return new Parameter<NodeJsonValue, NodeJsonValue>(id, value, presentation, type(valueType))
}

function type(id: string) {
  return Object.freeze({id, version: 1})
}

function storySource(): string {
  return [
    'import {createNodeTree, createNodeTreeExternalStore} from "@nodes/core"',
    'import {NodeTreeEditor} from "@nodes/editor"',
    'import {NodeSystem, nodeSystemCss} from "@nodes/ui/node-system"',
    'import {createRoot} from "@zavx0z/react"',
    "",
    "const tree = createNodeTree(definition)",
    "const editor = new NodeTreeEditor(tree)",
    "const store = createNodeTreeExternalStore(tree)",
    "createRoot(container).render(<NodeSystem",
    "  store={store}",
    "  onParameterInput={({nodeId, parameterId, value}) => editor.setParameterValue({",
    "    expectedRevision: tree.revision, nodeId, parameterId, value",
    "  })}",
    "/>)",
    "void nodeSystemCss",
  ].join("\n")
}

function serialize(element: Element, depth = 0): string {
  const indent = "  ".repeat(depth)
  const attributes = new Map(element.getAttributeNames().map(name =>
    [name, element.getAttribute(name) ?? ""] as const))
  const live = element as Element & Readonly<{value?: unknown; checked?: unknown}>
  if (["input", "select", "textarea"].includes(element.localName) && typeof live.value === "string") {
    attributes.set("value", live.value)
  }
  if (live.checked === true) attributes.set("checked", "")
  const serializedAttributes = [...attributes]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => ` ${name}="${escapeHtml(value)}"`)
    .join("")
  if (element.localName === "input") return `${indent}<input${serializedAttributes}>`
  const children = [...element.childNodes].filter(node => node.nodeType === 1 || node.nodeType === 3)
  if (children.length === 0) return `${indent}<${element.localName}${serializedAttributes}></${element.localName}>`
  const body = children.map((node: Node) => node.nodeType === 3
    ? `${"  ".repeat(depth + 1)}${escapeHtml(node.textContent ?? "")}`
    : serialize(node as HTMLElement, depth + 1)).join("\n")
  return `${indent}<${element.localName}${serializedAttributes}>\n${body}\n${indent}</${element.localName}>`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}
