import {layoutAdaptiveWithDiagnostics} from "@zavx0z/layout/adaptive"
import {layoutFixed} from "@zavx0z/layout/fixed"
import type {LayoutResult} from "@zavx0z/layout/types"
import {createNodeTree, createNodeTreeExternalStore} from "@zavx0z/nodetree"
import {NodeEditor} from "@zavx0z/nodes/node-editor"
import {XRDisplayElement} from "@zavx0z/space"
import {createRoot} from "@zavx0z/component"
import type {
  Document as SemanticDocument,
  Element as SemanticElement,
  HTMLElement as SemanticHTMLElement,
  Node as SemanticNode,
} from "@zavx0z/dom"
import {
  getLayoutStoryFixture,
  type LayoutStoryFixture,
} from "../fixtures/layout.ts"
import type {RoutedNodesStory} from "../story-types.ts"

type ComputedLayout = Readonly<{
  layout: LayoutResult
  diagnostics: Readonly<Record<string, unknown>>
}>

export function createCompiledLayoutStory(
  document: SemanticDocument,
  route: string,
): RoutedNodesStory {
  const fixture = getLayoutStoryFixture(route)
  const computed = computeLayout(fixture)
  if (computed.layout.direction !== fixture.expectedDirection) {
    throw new Error(
      `Пример ${route} ожидал ${fixture.expectedDirection}, но layout вычислил ${computed.layout.direction}`,
    )
  }

  const tree = createNodeTree(fixture.tree)
  const store = createNodeTreeExternalStore(tree)
  const staging = document.createElement("div")
  const root = createRoot(staging)
  root.render(<NodeEditor
    store={store}
    layout={computed.layout}
    label={fixture.label}
    title={`${fixture.label} · ${computed.layout.direction}`}
    width={900}
    height={600}
    fitPadding={28}
    interactive={true}
  />)
  const owner = staging.firstElementChild as SemanticHTMLElement | null
  if (owner === null) {
    root.unmount()
    tree.dispose()
    throw new Error(`NodeEditor не создал корневой элемент: ${route}`)
  }
  staging.removeChild(owner)
  owner.setAttribute("data-story-component", "node-editor-layout")
  owner.setAttribute("data-layout-policy", fixture.policy)
  owner.setAttribute("data-layout-direction", computed.layout.direction)

  const props = Object.freeze({
    route,
    policy: fixture.policy === "fixed" ? "layoutFixed" : "layoutAdaptiveWithDiagnostics",
    expectedDirection: fixture.expectedDirection,
    direction: computed.layout.direction,
    viewport: fixture.graph.viewport,
    nodeCount: fixture.tree.nodes.length,
    frameCount: fixture.tree.frames?.length ?? 0,
    socketCount: fixture.tree.nodes.reduce((count, node) => count + (node.sockets?.length ?? 0), 0),
    linkCount: fixture.tree.links?.length ?? 0,
    bounds: computed.layout.bounds,
    ...computed.diagnostics,
  })

  let disposed = false
  return Object.freeze({
    story: Object.freeze({
      element: owner,
      componentRoot: root,
      props,
      get source() {
        return Object.freeze({
          html: serialize(owner),
          typescript: sourceFor(fixture),
        })
      },
      afterPresent() {
        assertDisplayAncestor(owner)
      },
      dispose() {
        if (disposed) return
        disposed = true
        root.unmount()
        tree.dispose()
      },
    }),
  })
}

function computeLayout(fixture: LayoutStoryFixture): ComputedLayout {
  if (fixture.policy === "fixed") {
    return Object.freeze({
      layout: layoutFixed(fixture.graph),
      diagnostics: Object.freeze({}),
    })
  }
  const outcome = layoutAdaptiveWithDiagnostics(fixture.graph)
  return Object.freeze({
    layout: outcome.result,
    diagnostics: Object.freeze({
      candidateBudget: outcome.diagnostics.candidateBudget,
      theoreticalCandidateCount: outcome.diagnostics.theoreticalCandidateCount,
      fixedPortCount: outcome.diagnostics.fixedPortCount,
      dynamicPortCount: outcome.diagnostics.dynamicPortCount,
      generatedCandidates: outcome.diagnostics.generatedCandidates,
      attemptedCandidates: outcome.diagnostics.attemptedCandidates,
      routableCandidates: outcome.diagnostics.routableCandidates,
      rejectedCandidates: outcome.diagnostics.rejectedCandidates,
      selectedSides: outcome.diagnostics.selectedSides,
    }),
  })
}

function assertDisplayAncestor(owner: SemanticHTMLElement): void {
  let ancestor = owner.parentElement
  while (ancestor !== null) {
    if (ancestor instanceof XRDisplayElement) return
    ancestor = ancestor.parentElement
  }
  throw new Error("Пример нодовой раскладки смонтирован вне host-owned XRDisplayElement")
}

function sourceFor(fixture: LayoutStoryFixture): string {
  const compute = fixture.policy === "fixed"
    ? "const layout = layoutFixed(graph)"
    : [
        "const outcome = layoutAdaptiveWithDiagnostics(graph)",
        "const layout = outcome.result",
        "const diagnostics = outcome.diagnostics",
      ].join("\n")
  return [
    `import {${fixture.policy === "fixed" ? "layoutFixed" : "layoutAdaptiveWithDiagnostics"}} from "@zavx0z/layout/${fixture.policy}"`,
    'import {createNodeTree, createNodeTreeExternalStore} from "@zavx0z/nodetree"',
    'import {NodeEditor} from "@zavx0z/nodes/node-editor"',
    'import {createRoot} from "@zavx0z/component"',
    "",
    "const tree = createNodeTree(definition)",
    "const store = createNodeTreeExternalStore(tree)",
    compute,
    "",
    "createRoot(container).render(<NodeEditor",
    "  store={store}",
    "  layout={layout}",
    `  title=${JSON.stringify(fixture.label)}`,
    "  width={900}",
    "  height={600}",
    "/>)",
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
