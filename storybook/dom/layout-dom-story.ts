import {
  Element,
  HTMLButtonElement,
  type Document,
  type Event,
  type HTMLElement,
  type Node,
  type Text,
} from "@zavx0z/dom"
import type {StorybookDomStorySource} from "@zavx0z/storybook/stories"
import {
  createLayoutPresentation,
  layoutPresentationCss,
  type LayoutPresentationCase,
  type LayoutPresentationCaseRefs,
  type LayoutPresentationProps,
} from "../../dom/layout-presentation.ts"
import type {LayoutDomCaseProvider} from "./layout-provider.ts"

export const LAYOUT_DOM_ROUTES = Object.freeze([
  "layout",
  "layout/fixed",
  "layout/fixed/baseline",
  "layout/fixed/baseline/right",
  "layout/fixed/baseline/down",
  "layout/adaptive",
  "layout/adaptive/shared",
  "layout/adaptive/shared/right",
  "layout/adaptive/shared/down",
  "layout/adaptive/compound",
  "layout/adaptive/compound/right",
  "layout/adaptive/compound/down",
  "layout/dagre-layered",
  "layout/dagre-layered/default",
  "layout/dagre-layered/default/default",
  "layout/coffman-graham",
  "layout/coffman-graham/default",
  "layout/coffman-graham/default/default",
] as const)
export type LayoutDomRoute = typeof LAYOUT_DOM_ROUTES[number]

export type LayoutDomStory = Readonly<{
  element: HTMLElement
  props: LayoutPresentationProps
  caseRefs(id: string): LayoutPresentationCaseRefs | null
  source(): StorybookDomStorySource
  update(props: LayoutPresentationProps): void
  dispose(): void
}>

export async function createLayoutDomStory(
  document: Document,
  route: LayoutDomRoute,
): Promise<LayoutDomStory> {
  const providers = await loadProviders(route)
  const selectedIds = caseIdsForRoute(route)
  const allCases = providers.flatMap((provider) => {
    const ids = selectedIds.filter((id) => provider.ids.includes(id))
    return provider.createCases(ids)
  })
  const caseById = new Map(allCases.map((item) => [item.id, item]))
  const cases = selectedIds.map((id) => caseById.get(id) ?? missingCase(route, id))
  const controller = createLayoutPresentation(document, {
    title: routeTitle(route),
    showRoutes: true,
    showPorts: true,
    cases,
  })
  let disposed = false
  const update = (props: LayoutPresentationProps): void => {
    if (disposed) throw new Error("LayoutDomStory controller is disposed")
    controller.update(props)
  }
  const onClick = (event: Event): void => {
    if (disposed || event.defaultPrevented || !(event.target instanceof Element)) return
    const button = event.target.closest("button")
    if (!(button instanceof HTMLButtonElement) || button.disabled) return
    const action = button.getAttribute("data-action")
    if (action === "toggle-routes") update({...controller.props, showRoutes: !controller.props.showRoutes})
    else if (action === "toggle-ports") update({...controller.props, showPorts: !controller.props.showPorts})
  }
  controller.element.addEventListener("click", onClick)
  return Object.freeze({
    element: controller.element,
    get props() { return controller.props },
    caseRefs(id) { return controller.caseRefs(id) },
    update,
    source() {
      const snippets = providers.flatMap((provider) => {
        const ids = selectedIds.filter((id) => provider.ids.includes(id))
        return ids.length === 0 ? [] : [provider.source(ids)]
      })
      return Object.freeze({
        html: serialize(controller.element),
        css: layoutPresentationCss,
        typescript: [
          ...snippets,
          "",
          `const showRoutes = ${String(controller.props.showRoutes)}`,
          `const showPorts = ${String(controller.props.showPorts)}`,
        ].join("\n\n"),
      })
    },
    dispose() {
      if (disposed) return
      disposed = true
      controller.element.removeEventListener("click", onClick)
      controller.dispose()
    },
  })
}

async function loadProviders(route: LayoutDomRoute): Promise<readonly LayoutDomCaseProvider[]> {
  if (route === "layout") {
    const [fixed, adaptive, dagre, coffman] = await Promise.all([
      import("./providers/fixed.ts"),
      import("./providers/adaptive.ts"),
      import("./providers/dagre-layered.ts"),
      import("./providers/coffman-graham.ts"),
    ])
    return [
      fixed.fixedLayoutDomProvider,
      adaptive.adaptiveLayoutDomProvider,
      dagre.dagreLayeredLayoutDomProvider,
      coffman.coffmanGrahamLayoutDomProvider,
    ]
  }
  if (route === "layout/fixed" || route.startsWith("layout/fixed/")) {
    return [await import("./providers/fixed.ts").then(({fixedLayoutDomProvider}) => fixedLayoutDomProvider)]
  }
  if (route === "layout/adaptive" || route.startsWith("layout/adaptive/")) {
    return [await import("./providers/adaptive.ts").then(({adaptiveLayoutDomProvider}) => adaptiveLayoutDomProvider)]
  }
  if (route === "layout/dagre-layered" || route.startsWith("layout/dagre-layered/")) {
    return [await import("./providers/dagre-layered.ts").then(({dagreLayeredLayoutDomProvider}) => dagreLayeredLayoutDomProvider)]
  }
  if (route === "layout/coffman-graham" || route.startsWith("layout/coffman-graham/")) {
    return [await import("./providers/coffman-graham.ts").then(({coffmanGrahamLayoutDomProvider}) => coffmanGrahamLayoutDomProvider)]
  }
  throw new Error(`Unknown Layout DOM route: ${route}`)
}

function caseIdsForRoute(route: LayoutDomRoute): readonly string[] {
  switch (route) {
    case "layout": return ["fixed-baseline-right", "adaptive-shared-right", "dagre-layered-default", "coffman-graham-default"]
    case "layout/fixed":
    case "layout/fixed/baseline": return ["fixed-baseline-right", "fixed-baseline-down"]
    case "layout/fixed/baseline/right": return ["fixed-baseline-right"]
    case "layout/fixed/baseline/down": return ["fixed-baseline-down"]
    case "layout/adaptive": return ["adaptive-shared-right", "adaptive-shared-down", "adaptive-compound-right", "adaptive-compound-down"]
    case "layout/adaptive/shared": return ["adaptive-shared-right", "adaptive-shared-down"]
    case "layout/adaptive/shared/right": return ["adaptive-shared-right"]
    case "layout/adaptive/shared/down": return ["adaptive-shared-down"]
    case "layout/adaptive/compound": return ["adaptive-compound-right", "adaptive-compound-down"]
    case "layout/adaptive/compound/right": return ["adaptive-compound-right"]
    case "layout/adaptive/compound/down": return ["adaptive-compound-down"]
    case "layout/dagre-layered":
    case "layout/dagre-layered/default":
    case "layout/dagre-layered/default/default": return ["dagre-layered-default"]
    case "layout/coffman-graham":
    case "layout/coffman-graham/default":
    case "layout/coffman-graham/default/default": return ["coffman-graham-default"]
  }
}

function routeTitle(route: LayoutDomRoute): string {
  if (route === "layout") return "Раскладка · computed policies"
  if (route.startsWith("layout/fixed")) return "Fixed · computed geometry"
  if (route.startsWith("layout/adaptive")) return "Adaptive · computed geometry + diagnostics"
  if (route.startsWith("layout/dagre-layered")) return "Dagre Layered · computed geometry"
  return "Coffman–Graham · computed geometry + crossings"
}

function missingCase(route: LayoutDomRoute, id: string): never {
  throw new Error(`Layout DOM route ${route} did not compute case: ${id}`)
}

function serialize(element: Element, depth = 0): string {
  const indent = "  ".repeat(depth)
  const attrs = element.getAttributeNames().sort().map((name) => {
    const value = element.getAttribute(name) ?? ""
    if (["disabled", "hidden", "readonly"].includes(name) && value === "") return ` ${name}`
    return ` ${name}="${escape(value)}"`
  }).join("")
  if (["input"].includes(element.localName)) return `${indent}<${element.localName}${attrs}>`
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
