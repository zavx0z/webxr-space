import {
  Element,
  HTMLInputElement,
  HTMLSelectElement,
  type Document,
  type Event,
  type HTMLElement,
  type Node,
  type Text,
} from "@zavx0z/dom"
import type {NodesExternalStorySource} from "../../../../.storybook/runtime.ts"
import {createRoot, type ComponentRoot} from "@zavx0z/react"
import {
  createNodeWorkbench,
  type NodeWorkbenchController,
  type NodeWorkbenchProps,
} from "../../dom/node-workbench.ts"
import {createRemainingDomProps} from "./remaining-dom-data.ts"
import type {RemainingDomRoute} from "./remaining-route-catalog.ts"

export type RemainingDomStory = Readonly<{
  element: HTMLElement
  componentRoot: ComponentRoot
  props: NodeWorkbenchProps
  controller: NodeWorkbenchController
  source(): NodesExternalStorySource
  ready(): Promise<void>
  update(props: NodeWorkbenchProps): void
  dispose(): void
}>

export function createRemainingDomStory(
  document: Document,
  route: RemainingDomRoute,
): RemainingDomStory {
  const controller = createNodeWorkbench(document, createRemainingDomProps(route))
  const componentRoot = createRoot(document.createDocumentFragment())
  let disposed = false
  const update = (props: NodeWorkbenchProps): void => {
    if (disposed) throw new Error("RemainingDomStory controller is disposed")
    controller.update(props)
  }
  const onInput = (event: Event): void => {
    if (disposed || !(event.target instanceof HTMLInputElement)) return
    const input = event.target
    const parameterRow = input.closest(".parameter-socket__row")
    const parameterId = parameterRow?.getAttribute("data-parameter-id")
    if (parameterId && controller.parameters.parameterRefs(parameterId)?.input === input) {
      const current = controller.props
      update({...current, parameters: {
        ...current.parameters,
        parameters: current.parameters.parameters.map((parameter) => parameter.id === parameterId
          ? {...parameter, value: input.type === "checkbox" ? String(input.checked) : input.value, checked: input.checked}
          : parameter),
      }})
      return
    }
    if (input === controller.tree.refs.search) update({...controller.props, tree: {...controller.props.tree, query: input.value}})
  }
  const onChange = (event: Event): void => {
    if (disposed || !(event.target instanceof HTMLSelectElement)) return
    const select = event.target
    const parameterId = select.closest(".parameter-socket__row")?.getAttribute("data-parameter-id")
    if (!parameterId || controller.parameters.parameterRefs(parameterId)?.select !== select) return
    const current = controller.props
    update({...current, parameters: {
      ...current.parameters,
      parameters: current.parameters.parameters.map((parameter) => parameter.id === parameterId
        ? {...parameter, value: select.value}
        : parameter),
    }})
  }
  const onClick = (event: Event): void => {
    if (disposed || event.defaultPrevented || !(event.target instanceof Element)) return
    const target = event.target
    const popupId = target.closest(".node-workbench__popup-item")?.getAttribute("data-popup-item-id")
    if (popupId) {
      update({...controller.props, popup: {
        ...controller.props.popup,
        items: controller.props.popup.items.map((item) => ({...item, selected: item.id === popupId})),
      }})
      return
    }
    const socketId = target.closest(".parameter-socket__socket")?.getAttribute("data-socket-id")
    if (socketId) {
      update({...controller.props, parameters: {
        ...controller.props.parameters,
        parameters: controller.props.parameters.parameters.map((parameter) => ({
          ...parameter,
          sockets: parameter.sockets.map((socket) => ({...socket, selected: socket.id === socketId})),
        })),
      }})
      return
    }
    const nodeId = target.closest(".graph-canvas__node")?.getAttribute("data-node-id")
    const linkId = target.closest(".graph-canvas__link")?.getAttribute("data-link-id")
    const frameId = target.closest(".graph-canvas__frame")?.getAttribute("data-frame-id")
    if (nodeId || linkId || frameId) {
      update({...controller.props, graph: {
        ...controller.props.graph,
        frames: controller.props.graph.frames.map((frame) => ({...frame, selected: frame.id === frameId})),
        links: controller.props.graph.links.map((link) => ({...link, selected: link.id === linkId})),
        nodes: controller.props.graph.nodes.map((node) => ({...node, selected: node.id === nodeId})),
      }})
      return
    }
    const treeItem = target.closest(".node-tree-dom__node")
    const treeNodeId = treeItem?.getAttribute("data-node-id")
    if (!treeNodeId) return
    if (target.closest('[data-action="toggle-node"]')) {
      update({...controller.props, tree: {
        ...controller.props.tree,
        nodes: controller.props.tree.nodes.map((node) => node.id === treeNodeId ? {...node, expanded: !node.expanded} : node),
      }})
    } else if (target.closest('[data-action="select-node"]')) {
      update({...controller.props, tree: {...controller.props.tree, selectedNodeId: treeNodeId}})
    }
  }

  controller.element.addEventListener("input", onInput)
  controller.element.addEventListener("change", onChange)
  controller.element.addEventListener("click", onClick)
  return Object.freeze({
    element: controller.element,
    componentRoot,
    controller,
    get props() { return controller.props },
    update,
    source() {
      return Object.freeze({
        html: serialize(controller.element),
        typescript: renderTypeScript(route, controller.props),
      })
    },
    async ready() {
      for (const {src} of controller.props.images) {
        if (src === "" || src.startsWith("data:")) continue
        const response = await fetch(src)
        if (!response.ok) throw new Error(`NodeWorkbench image failed to load: ${src}`)
        await response.arrayBuffer()
      }
    },
    dispose() {
      if (disposed) return
      disposed = true
      controller.element.removeEventListener("input", onInput)
      controller.element.removeEventListener("change", onChange)
      controller.element.removeEventListener("click", onClick)
      componentRoot.unmount()
      controller.dispose()
    },
  })
}

function renderTypeScript(route: RemainingDomRoute, props: NodeWorkbenchProps): string {
  return [
    'import {Element, HTMLInputElement, HTMLSelectElement, createDocument} from "@zavx0z/dom"',
    'import {createNodeWorkbench} from "../../dom/node-workbench.ts"',
    "",
    `const route = ${JSON.stringify(route)} as const`,
    `const props = ${JSON.stringify(props, null, 2)} as const`,
    "const document = createDocument()",
    "const controller = createNodeWorkbench(document, props)",
    'controller.element.addEventListener("input", (event) => {',
    "  if (!(event.target instanceof HTMLInputElement)) return",
    "  // Rebuild the complete controlled tree/parameter props for the keyed target.",
    "})",
    'controller.element.addEventListener("change", (event) => {',
    "  if (!(event.target instanceof HTMLSelectElement)) return",
    "  // Rebuild the complete controlled select props for the keyed Parameter.",
    "})",
    'controller.element.addEventListener("click", (event) => {',
    "  if (event.defaultPrevented || !(event.target instanceof Element)) return",
    "  // Resolve standard data ids and publish controlled Frame/Link/Node/Socket state.",
    "})",
    "document.appendChild(controller.element)",
  ].join("\n")
}

function serialize(element: Element, depth = 0): string {
  const indent = "  ".repeat(depth)
  const attrs = element.getAttributeNames().sort().map((name) => {
    const value = element.getAttribute(name) ?? ""
    if (["disabled", "hidden", "readonly", "selected"].includes(name) && value === "") return ` ${name}`
    return ` ${name}="${escape(value)}"`
  }).join("")
  if (["input", "img"].includes(element.localName)) return `${indent}<${element.localName}${attrs}>`
  const children = [...element.childNodes]
  if (children.length === 0) return `${indent}<${element.localName}${attrs}></${element.localName}>`
  if (children.every((node) => node.nodeType === 3)) return `${indent}<${element.localName}${attrs}>${escape(element.textContent ?? "")}</${element.localName}>`
  const body = children.map((node: Node) => node.nodeType === 3
    ? `${"  ".repeat(depth + 1)}${escape((node as Text).data)}`
    : serialize(node as Element, depth + 1)).join("\n")
  return `${indent}<${element.localName}${attrs}>\n${body}\n${indent}</${element.localName}>`
}
function escape(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;")
}
