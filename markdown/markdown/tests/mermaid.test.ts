import {expect, test} from "bun:test"
import {dirname, resolve} from "node:path"
import {createDocument, type Element} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/component"
import {flushDocumentLayoutObservers} from "@zavx0z/dom/geometry"
import {createDocumentRenderer} from "@renderer/html"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import {parseMermaidFlowchart} from "../../mermaid/src/parser.ts"
import type {MermaidGraph} from "../../mermaid/types/graph.ts"
import type {MarkdownProps} from "../contract/input.ts"

const root = resolve(import.meta.dir, "../../..")
Bun.plugin(createTemplateJsxBunPlugin({cwd: root, persistent: true, sourceRoots: ["markdown", "nodes", "ui"].map(path => resolve(root, path))}))
const {Markdown} = await import("../index.tsx")
const {layoutMermaidGraph} = await import("../../mermaid/src/layout.ts")
const {projectLinkArrowheads, projectLinkRoute, projectLinkMarkers} = await import("@webxr/nodes/link")

async function settled(owner: Element, renderer: ReturnType<typeof createDocumentRenderer>, component: ReturnType<typeof createRoot>) {
  const deadline = Date.now() + 8000
  for (;;) {
    renderer.flush()
    const delivered = flushDocumentLayoutObservers(owner.ownerDocument!)
    component.flush()
    if (!delivered && !owner.querySelector('[data-mermaid][aria-busy="true"]')) break
    if (Date.now() > deadline) {
      const nodes = []
      for (let node = owner.querySelector("article[data-node-id]"); node !== null; node = node.parentElement) {
        nodes.push({tag: node.tagName, rect: node.getLayoutRect(), hidden: node.getAttribute("hidden"), style: node.getAttribute("style")})
      }
      throw new Error(`Mermaid remained pending: connected=${owner.isConnected}, boxes=${renderer.flush().boxByNode.size}, rootBox=${renderer.flush().boxByNode.has(owner)}, clientWidth=${owner.getBoundingClientRect().width}, parent=${owner.parentNode?.nodeName}, sameDocument=${owner.ownerDocument === renderer.document}; ${JSON.stringify(nodes)}`)
    }
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  const error = owner.querySelector('[role="alert"]')
  if (error) throw new Error(error.textContent)
}

test("[MARKDOWN-MERMAID-VIEW] a Markdown fence becomes native nodes and arrows and retains node identity on source update", async () => {
  const document = createDocument()
  const owner = document.createElement("div")
  document.append(owner)
  const component = createRoot(owner)
  const template = Markdown as unknown as CompiledTemplate<MarkdownProps>
  const source = (target: string) => `# Diagram\n\nBefore\n\n\`\`\`mermaid\nflowchart LR\nA --> ${target}\n\`\`\`\n\nAfter`
  const renderer = createDocumentRenderer({document, root: owner, viewport: {width: 1000, height: 900}})
  try {
    component.render(template, {source: source("B")})
    await settled(owner, renderer, component)
    expect(owner.querySelector('[data-mermaid-ready="true"]')).not.toBeNull()
    const article = owner.querySelector('[data-markdown]')!
    const first = owner.querySelector('article[data-node-id="A"]')!
    expect(owner.querySelectorAll('article[data-node-kind="diagram"]')).toHaveLength(2)
    expect(owner.querySelectorAll('[data-link-end-arrow="true"]')).toHaveLength(1)
    expect(owner.querySelectorAll("img")).toHaveLength(0)
    expect(owner.querySelectorAll("canvas")).toHaveLength(0)
    expect(owner.querySelectorAll('[data-socket-id]')).toHaveLength(0)
    const frame = renderer.flush()
    expect(frame.boxByNode.get(first)!.width).toBe(first.getLayoutRect()!.width)
    expect(frame.boxByNode.get(first)!.width).not.toBe(210)
    const link = owner.querySelector('[data-link-end-arrow="true"]')!
    expect(frame.displayList.some(item => item.node === link)).toBe(true)
    const arrow = owner.querySelector('[data-link-arrow="end"]')!
    expect(frame.displayList.some(item => item.node === arrow)).toBe(true)
    component.render(template, {source: source("C").replace("flowchart LR", "flowchart TD")})
    await settled(owner, renderer, component)
    expect(owner.querySelector('[data-markdown]')).toBe(article)
    expect(owner.querySelector('article[data-node-id="A"]')).toBe(first)
    expect(owner.querySelector('article[data-node-id="B"]')).toBeNull()
    expect(owner.querySelector('article[data-node-id="C"]')).not.toBeNull()
    expect(owner.querySelector('[data-link-end-arrow="true"]')).toBe(link)
    expect(owner.querySelector('[data-link-arrow="end"]') === arrow).toBe(true)
    expect(renderer.flush().displayList.some(item => item.node === arrow)).toBe(true)
    component.render(template, {source: "Only text"})
    expect(owner.querySelector('[data-mermaid]')).toBeNull()
  } finally {
    renderer.dispose()
    component.unmount()
    owner.remove()
  }
  expect(document.childNodes).toHaveLength(0)
})

test("[MARKDOWN-MERMAID-DIRECTIONS] LR, RL, TB and BT use Layout geometry and real terminal arrowheads", () => {
  for (const direction of ["LR", "RL", "TB", "BT"] as const) {
    const graph: MermaidGraph = {direction, nodes: [{id: "A", label: "A", shape: "circle"}, {id: "B", label: "B", shape: "oval"}], edges: [{id: "e", from: "A", to: "B", startArrow: false, endArrow: true}]}
    const plan = layoutMermaidGraph(graph, graph.nodes.map(node => ({id: node.id, width: 100, height: node.shape === "circle" ? 100 : 50, anchors: []})))
    const a = plan.nodes[0]!.rect
    const b = plan.nodes[1]!.rect
    if (direction === "LR") expect(b.x).toBeGreaterThan(a.x)
    if (direction === "RL") expect(b.x).toBeLessThan(a.x)
    if (direction === "TB") expect(b.y).toBeGreaterThan(a.y)
    if (direction === "BT") expect(b.y).toBeLessThan(a.y)
    expect(a.height).toBe(a.width)
    const arrow = projectLinkArrowheads(plan.edges[0]!.route, false, true)[0]!.d
    expect(arrow).toMatch(/^M /u)
    expect(arrow).not.toMatch(/NaN|Infinity/u)
    expect(projectLinkArrowheads(plan.edges[0]!.route)).toEqual([])
  }
})

test("[MARKDOWN-MERMAID-ERROR] malformed syntax is rejected and does not poison the next diagram", async () => {
  await expect(parseMermaidFlowchart("flowchart LR\nA --> [")).rejects.toThrow()
  expect((await parseMermaidFlowchart("flowchart LR\nB --> C")).nodes).toHaveLength(2)
})

test("[MARKDOWN-MEASURED-REFERENCE] семь нод исходного обсуждения передают реальные размеры действующему TopDown", async () => {
  const source = `flowchart TD
  ContentNode --> ContentSurface
  ContentNode --> ParameterNode
  ContentNode --> Pane
  ParameterNode --> ParameterNodeContents
  ParameterNode --> Pane
  DiagramNode --> Pane
  DiagramNode --> Typography`
  const graph = await parseMermaidFlowchart(source)
  const document = createDocument()
  const owner = document.createElement("div")
  document.append(owner)
  const component = createRoot(owner)
  const renderer = createDocumentRenderer({
    document,
    root: owner,
    viewport: {width: 1600, height: 1200},
    styleSheets: [await Bun.file(Bun.resolveSync("@zavx0z/ui/themes/theme.css", root)).text()],
  })
  try {
    component.render(Markdown as unknown as CompiledTemplate<MarkdownProps>, {source: "```mermaid\n" + source + "\n```"})
    await settled(owner, renderer, component)
    const surface = owner.querySelector("[data-graph-scene]")!
    const elements = graph.nodes.map(node => owner.querySelector(`article[data-node-id="${node.id}"]`)!)
    const measured = elements.map((element, index) => ({id: graph.nodes[index]!.id, width: element.getLayoutRect()!.width, height: element.getLayoutRect()!.height, anchors: []}))
    expect(new Set(measured.map(node => node.width)).size).toBeGreaterThan(3)
    expect(elements).toHaveLength(7)
    const expected = layoutMermaidGraph(graph, measured)
    // Независимый upstream oracle получает фактические CSS-размеры тех же Elements.
    const mermaidEntry = Bun.resolveSync("mermaid", resolve(root, "markdown"))
    const referencePath = Bun.resolveSync("dagre-d3-es/src/dagre/layout.js", dirname(mermaidEntry))
    const referenceRoot = resolve(dirname(referencePath), "../..")
    expect((await Bun.file(resolve(referenceRoot, "package.json")).json()).version).toBe("7.0.14")
    const {layout} = await import(referencePath)
    const {Graph} = await import(resolve(referenceRoot, "src/graphlib/index.js"))
    const oracle = new Graph({multigraph: true, compound: true}).setGraph({rankdir: "TB", nodesep: 50, ranksep: 50, edgesep: 20, marginx: 8, marginy: 8})
    for (const node of measured) oracle.setNode(node.id, {...node})
    for (const edge of graph.edges) oracle.setEdge(edge.from, edge.to, {minlen: 1, weight: 1, width: 0, height: 0, labelpos: "c"}, edge.id)
    layout(oracle)
    for (const node of expected.nodes) {
      const element = elements[graph.nodes.findIndex(value => value.id === node.id)]!
      const actual = element.getLayoutRect(surface)!
      expect(actual.x).toBeCloseTo(node.rect.x)
      expect(actual.y).toBeCloseTo(node.rect.y)
      expect(actual.width).toBeCloseTo(node.rect.width)
      expect(actual.height).toBeCloseTo(node.rect.height)
      const label = element.querySelector("span")!.getLayoutRect()!
      // Neo rectangle: label bbox +32/+24, включая границу CSS-компонента.
      expect(actual.width - label.width).toBeCloseTo(32, 6)
      expect(actual.height - label.height).toBeCloseTo(24, 6)
      const pane = element.querySelector("section")!
      const paneBox = renderer.flush().boxByNode.get(pane)!
      expect(paneBox.border.radii.topLeft).toBe(10)
      expect(paneBox.border.colors.top.match(/[\d.]+/g)!.map(Number)).toEqual([255, 255, 255, .156])
      expect(actual.x).toBeCloseTo(oracle.node(node.id).x - actual.width / 2, 6)
      expect(actual.y).toBeCloseTo(oracle.node(node.id).y - actual.height / 2, 6)
    }
    expect(expected.edges).toHaveLength(7)
    for (const edge of expected.edges) {
      expect(owner.querySelector(`[data-link-id="${edge.id}"]`)!.getAttribute("d")).toBe(projectLinkRoute(edge.route).d)
    }
    // Проверены measured positions по upstream; это ещё не pixel acceptance Desktop.
    for (const edge of expected.edges) {
      const arrow = owner.querySelector(`[data-link-owner="${edge.id}"][data-link-arrow="end"]`)!
      expect(arrow.getAttribute("d")).toBe(projectLinkMarkers(edge.route, {end: {length: 10.5, width: 14 * 10.5 / 11.5, offset: 4 * 10.5 / 11.5}})[0]!.d)
      expect(renderer.flush().displayList.some(item => item.node === arrow)).toBe(true)
    }
  } finally {
    component.unmount()
    renderer.dispose()
    owner.remove()
  }
})

test("[MARKDOWN-CONTOUR-CIRCLE] intrinsic круг становится квадратным до принятия вертикальной сцены", async () => {
  const document = createDocument()
  const owner = document.createElement("div")
  document.append(owner)
  const component = createRoot(owner)
  const renderer = createDocumentRenderer({document, root: owner, viewport: {width: 800, height: 800}})
  try {
    component.render(Markdown as unknown as CompiledTemplate<MarkdownProps>, {source: "```mermaid\nflowchart TD\nA --> B\nB@{ shape: circle }\n```"})
    await settled(owner, renderer, component)
    const circle = owner.querySelector('[data-node-id="B"]')!
    const rect = circle.getLayoutRect()!
    expect(rect.width).toBeCloseTo(rect.height, 6)
    expect(owner.querySelector('[data-mermaid-ready="true"]')).not.toBeNull()
    const arrow = owner.querySelector('[data-link-arrow="end"]')!
    expect(renderer.flush().displayList.some(item => item.node === arrow)).toBe(true)
  } finally {
    component.unmount()
    renderer.dispose()
    owner.remove()
  }
})
