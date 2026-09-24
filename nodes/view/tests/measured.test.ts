import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {createDocument, acquireDocumentAuthorStyleSheetOwner, MouseEvent} from "@zavx0z/dom"
import {flushDocumentLayoutObservers} from "@zavx0z/dom/geometry"
import {createRoot} from "@zavx0z/component"
import {createDocumentRenderer} from "@renderer/html"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import type {GraphViewProps, GraphMeasuredLayout, GraphMeasurement} from "@webxr/nodes/view"
import type {NodeTreeStore} from "@webxr/nodes/view/tree"
import {createNodeTree, createNodeTreeExternalStore, Parameter} from "@nodes/tree"

const root = resolve(import.meta.dir, "../../..")
Bun.plugin(createTemplateJsxBunPlugin({cwd: root, persistent: true, sourceRoots: [resolve(root, "nodes"), resolve(root, "ui")]}))
const {GraphView} = await import("@webxr/nodes/view")
const {graphInput, measuredLayout, MeasuredEditor, MeasuredCircle} = await import("./measured.fixture.tsx")
const theme = await Bun.file(resolve(root, "ui/themes/theme.css")).text()

test("[GRAPH-MEASURED-001] реальные размеры, async поколения и font обновления сохраняют те же элементы", async () => {
  const document = createDocument()
  const owner = document.createElement("div")
  document.append(owner)
  const component = createRoot(owner)
  const renderer = createDocumentRenderer({document, root: owner, viewport: {width: 1000, height: 700}, textMeasurer: {measureTextAdvance: (text, size) => text.length * size * .5}})
  const styleOwner = acquireDocumentAuthorStyleSheetOwner(document)
  const requests: Array<{nodes: readonly GraphMeasurement[]; finish(value: GraphMeasuredLayout): void}> = []
  let deferred = false
  let computations = 0
  const layout: NonNullable<GraphViewProps["layout"]> = nodes => {
    computations += 1
    return deferred ? new Promise(resolve => requests.push({nodes, finish: resolve})) : measuredLayout(nodes)
  }
  const template = GraphView as unknown as CompiledTemplate<GraphViewProps>
  const props: GraphViewProps = {input: graphInput(), layout, width: 1000, height: 700, navigation: "pan-zoom"}
  const flush = () => {
    for (let pass = 0; pass < 20; pass += 1) {
      component.flush()
      renderer.flush()
      if (!flushDocumentLayoutObservers(document)) return renderer.flush()
    }
    throw new Error("Измерение не стабилизировалось")
  }
  try {
    component.render(template, props)
    const a = owner.querySelector('[data-node-id="a"]')!
    const b = owner.querySelector('[data-node-id="b"]')!
    flush()
    expect(a.getLayoutRect()!.width).toBeLessThan(b.getLayoutRect()!.width)
    expect(a.getLayoutRect()!.width).not.toBe(210)
    expect(owner.querySelector('[data-layout-pending="true"]')).toBeNull()
    const width = a.getLayoutRect()!.width
    const count = computations
    component.render(template, {...props, transform: {x: 71, y: 53, scale: 2}})
    flush()
    expect(computations).toBe(count)
    expect(a.getLayoutRect()!.width).toBe(width)
    deferred = true
    styleOwner.replace([{id: "font", cssText: "article { --diagram-node-font-size: 24.5px; }"}])
    const hiddenFrame = flush()
    expect(a.getLayoutRect()!.width).toBeGreaterThan(width)
    expect(hiddenFrame.displayList.some(item => item.node === a || item.node === a.querySelector("span"))).toBe(false)
    expect(requests.length).toBeGreaterThan(0)
    const old = requests.at(-1)!
    component.render(template, {...props, input: graphInput("Совершенно новая длинная подпись")})
    flush()
    const current = requests.at(-1)!
    expect(current).not.toBe(old)
    current.finish(await measuredLayout(current.nodes))
    await Promise.resolve()
    flush()
    expect(owner.querySelector('[data-layout-pending="true"]')).toBeNull()
    old.finish(await measuredLayout(old.nodes))
    await Promise.resolve()
    flush()
    expect(owner.querySelector('[data-node-id="a"]')).toBe(a)
    expect(owner.querySelector('[data-node-id="b"]')).toBe(b)
    expect(a.querySelector("span")!.textContent).toBe("Совершенно новая длинная подпись")
  } finally {
    component.unmount()
    renderer.dispose()
    styleOwner.release()
    owner.remove()
  }
})

test("[GRAPH-MEASURED-MODEL] редактор измеряет настоящие параметры и Socket anchors до размещения", () => {
  const tree = createNodeTree({nodes: [
    {id: "source", parameters: [new Parameter<number>("value", 1)], sockets: [{id: "out", direction: "output", side: "right", parameterId: "value"}]},
    {id: "target", parameters: [new Parameter<number>("value", 0)], sockets: [{id: "in", direction: "input", side: "left", parameterId: "value"}]},
  ], links: [{id: "edge", from: {nodeId: "source", socketId: "out"}, to: {nodeId: "target", socketId: "in"}}]})
  const document = createDocument()
  const owner = document.createElement("div")
  document.append(owner)
  const component = createRoot(owner)
  const renderer = createDocumentRenderer({document, root: owner, viewport: {width: 900, height: 600}, styleSheets: [theme]})
  const flush = () => {
    for (let pass = 0; pass < 20; pass += 1) {
      component.flush()
      renderer.flush()
      if (!flushDocumentLayoutObservers(document)) return
    }
    throw new Error("Модельная геометрия не стабилизировалась")
  }
  try {
    component.render(MeasuredEditor as unknown as CompiledTemplate<{store: NodeTreeStore}>, {store: createNodeTreeExternalStore(tree)})
    const source = owner.querySelector('[data-node-id="source"]')!
    const socket = source.querySelector('[data-socket-glyph]')!
    flush()
    expect(owner.querySelector('[data-layout-pending="true"]')).toBeNull()
    const nodeRect = source.getLayoutRect()!
    const anchor = socket.getLayoutRect(source)!
    expect(anchor.x + anchor.width / 2).toBeCloseTo(nodeRect.width)
    expect(anchor.y + anchor.height / 2).toBeGreaterThan(0)
    expect(owner.querySelector('[data-link-id="edge"]')).not.toBeNull()
    expect(owner.querySelector('[data-node-id="source"]')).toBe(source)
    const path = owner.querySelector('[data-link-id="edge"]')!
    source.querySelector('button[aria-label="Свернуть source"]')!.dispatchEvent(new MouseEvent("click", {bubbles: true}))
    flush()
    expect(source.getLayoutRect()!.height).toBeLessThan(nodeRect.height)
    expect(source.querySelector('[data-socket-glyph]')).toBe(socket)
    expect(owner.querySelector('[data-link-id="edge"]') === path).toBe(true)
    const surface = owner.querySelector('[data-graph-scene]')!
    const start = socket.getLayoutRect(surface)!
    const end = owner.querySelector('[data-node-id="target"] [data-socket-glyph]')!.getLayoutRect(surface)!
    const coordinates = path.getAttribute("d")!.match(/-?\d+(?:\.\d+)?/gu)!.map(Number)
    // Fixed может сохранить прямой маршрут, изменив позицию самой свёрнутой ноды.
    expect(coordinates[0]).toBeCloseTo(start.x + start.width / 2)
    expect(coordinates[1]).toBeCloseTo(start.y + start.height / 2)
    expect(coordinates.at(-2)).toBeCloseTo(end.x + end.width / 2)
    expect(coordinates.at(-1)).toBeCloseTo(end.y + end.height / 2)
    source.querySelector('button[aria-label="Развернуть source"]')!.dispatchEvent(new MouseEvent("click", {bubbles: true}))
    flush()
    expect(source.getLayoutRect()!.height).toBeCloseTo(nodeRect.height)
  } finally {
    component.unmount()
    renderer.dispose()
    tree.dispose()
    owner.remove()
  }
})

test("[GRAPH-MEASURED-SHAPE] круг получает диаметр от измеренного содержимого до показа", () => {
  const document = createDocument()
  const owner = document.createElement("div")
  document.append(owner)
  const component = createRoot(owner)
  const renderer = createDocumentRenderer({document, root: owner, viewport: {width: 1000, height: 700}, styleSheets: [theme]})
  const input = graphInput("Результат")
  try {
    component.render(GraphView as unknown as CompiledTemplate<GraphViewProps>, {
      input: {nodes: input.nodes.map(node => node.id === "a" ? {...node, view: MeasuredCircle} : node)},
      layout: measuredLayout,
    })
    for (let pass = 0; pass < 20; pass += 1) {
      component.flush()
      renderer.flush()
      if (!flushDocumentLayoutObservers(document)) break
    }
    component.flush()
    const rect = owner.querySelector('[data-node-id="a"]')!.getLayoutRect()!
    expect(rect.width).toBeGreaterThan(0)
    expect(rect.width).toBeCloseTo(rect.height)
    expect(rect.width).not.toBe(210)
    expect(owner.querySelector('[data-layout-pending="true"]')).toBeNull()
  } finally {
    component.unmount()
    renderer.dispose()
    owner.remove()
  }
})
