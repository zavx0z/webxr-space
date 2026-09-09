import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {createDocument, type Element} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/component"
import {createDocumentRenderer} from "@renderer/html"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import {parseMermaidFlowchart, type MermaidGraph} from "../../mermaid/src/parser.ts"
import type {MarkdownProps} from "../src/markdown.tsx"

const root = resolve(import.meta.dir, "../../..")
Bun.plugin(createTemplateJsxBunPlugin({cwd: root, persistent: true, sourceRoots: ["markdown", "nodes", "ui"].map(path => resolve(root, path))}))
const {Markdown} = await import("../src/markdown.tsx")
const {layoutMermaidGraph} = await import("../../mermaid/src/view/src/view.tsx")
const {projectLinkArrowheads} = await import("@webxr/nodes/link")

async function settled(owner: Element) {
  const deadline = Date.now() + 8000
  while (owner.querySelector('[data-mermaid][aria-busy="true"]')) {
    if (Date.now() > deadline) throw new Error("Mermaid remained pending")
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  const error = owner.querySelector('[role="alert"]')
  if (error) throw new Error(error.textContent)
}

test("[MARKDOWN-MERMAID-SOURCE] the actual README Mermaid fence is parsed by Mermaid into its documented relationships", async () => {
  const readme = await Bun.file(resolve(root, "nodes/node/README.md")).text()
  const source = /```mermaid\n([\s\S]*?)```/u.exec(readme)![1]!
  const graph = await parseMermaidFlowchart(source)
  expect(graph.direction).toBe("LR")
  expect(graph.nodes.map(node => node.id).sort()).toEqual(["ContentNode", "ContentSurface", "DiagramNode", "Pane", "ParameterNode", "ParameterNodeContents", "Typography"].sort())
  expect(graph.edges.map(edge => `${edge.from}->${edge.to}`).sort()).toEqual([
    "ContentNode->Pane", "ContentNode->ContentSurface", "ContentNode->ParameterNode", "ParameterNode->Pane", "ParameterNode->ParameterNodeContents", "DiagramNode->Pane", "DiagramNode->Typography",
  ].sort())
  expect(readme).not.toContain("dependencies.svg")
  expect(graph.edges.every(edge => edge.endArrow)).toBe(true)
  const plan = layoutMermaidGraph(graph)
  expect(plan.nodes).toHaveLength(7)
  expect(plan.edges).toHaveLength(7)
})

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
    await settled(owner)
    expect(owner.querySelector('[data-mermaid-ready="true"]')).not.toBeNull()
    const article = owner.querySelector('[data-markdown]')!
    const first = owner.querySelector('article[data-node-id="A"]')!
    expect(owner.querySelectorAll('article[data-node-kind="diagram"]')).toHaveLength(2)
    expect(owner.querySelectorAll('[data-link-end-arrow="true"]')).toHaveLength(1)
    expect(owner.querySelectorAll("img")).toHaveLength(0)
    expect(owner.querySelectorAll("canvas")).toHaveLength(0)
    expect(owner.querySelectorAll('[data-socket-id]')).toHaveLength(0)
    const frame = renderer.flush()
    expect(frame.boxByNode.get(first)!.width).toBe(210)
    const link = owner.querySelector('[data-link-end-arrow="true"]')!
    expect(frame.displayList.some(item => item.node === link)).toBe(true)
    const arrow = owner.querySelector('[data-link-arrow="end"]')!
    expect(frame.displayList.some(item => item.node === arrow)).toBe(true)
    component.render(template, {source: source("C")})
    await settled(owner)
    expect(owner.querySelector('[data-markdown]')).toBe(article)
    expect(owner.querySelector('article[data-node-id="A"]')).toBe(first)
    expect(owner.querySelector('article[data-node-id="B"]')).toBeNull()
    expect(owner.querySelector('article[data-node-id="C"]')).not.toBeNull()
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
    const plan = layoutMermaidGraph(graph)
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
