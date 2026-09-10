import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {createDocument, MouseEvent, WheelEvent} from "@zavx0z/dom"
import {flushDocumentLayoutObservers} from "@zavx0z/dom/geometry"
import {createRoot} from "@zavx0z/component"
import {createDocumentRenderer, createDocumentInteractionController} from "@renderer/html"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import type {GraphScene, GraphTransform, GraphViewProps} from "@webxr/nodes/view"

const workspace = resolve(import.meta.dir, "../../..")
Bun.plugin(createTemplateJsxBunPlugin({cwd: workspace, persistent: true, sourceRoots: ["nodes", "ui"].map(path => resolve(workspace, path))}))
const {GraphView} = await import("@webxr/nodes/view")
const {CounterNode} = await import("./graph.fixture.tsx")
const scene: GraphScene = {
  bounds: {x: 0, y: 0, width: 20000, height: 10000},
  frames: [], links: [],
  nodes: [
    {id: "first", rect: {x: 0, y: 0, width: 100, height: 60}, view: CounterNode, data: null},
    {id: "last", rect: {x: 19900, y: 9940, width: 100, height: 60}, view: CounterNode, data: null},
  ],
}

function mount(extra: Partial<GraphViewProps> = {}) {
  const document = createDocument()
  const owner = document.createElement("div")
  owner.setAttribute("style", "width:100%;height:100%;padding:40px;box-sizing:border-box")
  document.append(owner)
  const component = createRoot(owner)
  const changes: GraphTransform[] = []
  const props: GraphViewProps = {scene, autoSize: true, navigation: "pan-zoom", minScale: 0, materializeCulled: true, overscan: 1000000,
    onTransformChange: value => changes.push(value), ...extra}
  component.render(GraphView as unknown as CompiledTemplate<GraphViewProps>, props)
  const viewport = owner.querySelector("[data-graph-viewport]")!
  const first = owner.querySelector('[data-node-id="first"]')!
  const last = owner.querySelector('[data-node-id="last"]')!
  expect(owner.querySelector('[data-layout-pending="true"]')).not.toBeNull()
  const renderer = createDocumentRenderer({document, root: owner, viewport: {width: 900, height: 650},
    textMeasurer: {measureTextAdvance: text => text.length * 6}})
  const interaction = createDocumentInteractionController({document})
  const flush = () => {
    for (let pass = 0; pass < 20; pass += 1) {
      component.flush()
      renderer.flush()
      if (!flushDocumentLayoutObservers(document)) return renderer.flush()
    }
    throw new Error("Viewport не стабилизировался")
  }
  flush()
  return {document, owner, component, viewport, first, last, renderer, interaction, changes, flush,
    fit() {
      owner.querySelector('button[aria-label="Вписать"]')!.dispatchEvent(new MouseEvent("click", {bubbles: true}))
      flush()
    },
    dispose() {
      interaction.dispose()
      component.unmount()
      renderer.dispose()
      owner.remove()
    },
  }
}

function expectFitted(view: ReturnType<typeof mount>) {
  const viewport = view.viewport.getBoundingClientRect()
  const first = view.first.getBoundingClientRect()
  const last = view.last.getBoundingClientRect()
  expect(first.left).toBeGreaterThanOrEqual(viewport.left)
  expect(first.top).toBeGreaterThanOrEqual(viewport.top)
  expect(last.right).toBeLessThanOrEqual(viewport.right)
  expect(last.bottom).toBeLessThanOrEqual(viewport.bottom)
}

test("[GRAPH-VIEWPORT-FIT] большой граф вписывается в реальный viewport, resize до жеста повторяет fit без remount", () => {
  const view = mount()
  try {
    expect(view.owner.querySelector('[data-layout-pending="true"]')).toBeNull()
    expect(view.viewport.getLayoutRect()!.width).toBe(820)
    expect(view.viewport.getLayoutRect()!.height).toBe(540)
    expectFitted(view)
    expect(view.first.getBoundingClientRect().width / 100).toBeLessThan(.16)
    view.renderer.resize({width: 420, height: 330})
    view.flush()
    expect(view.viewport.getLayoutRect()!.width).toBe(340)
    expect(view.viewport.getLayoutRect()!.height).toBe(220)
    expectFitted(view)
    expect(view.owner.querySelector('[data-node-id="first"]')).toBe(view.first)
  } finally { view.dispose() }
})

test.each(["node", "viewport"] as const)("[GRAPH-VIEWPORT-ZOOM] zoom вокруг %s сохраняет точку под указателем; resize после жеста сохраняет transform", anchorOwner => {
  const view = mount()
  try {
    const before = view.first.getBoundingClientRect()
    const anchorBox = anchorOwner === "node" ? before : view.viewport.getBoundingClientRect()
    const anchor = {x: Math.round(anchorBox.x + anchorBox.width / 2), y: Math.round(anchorBox.y + anchorBox.height / 2)}
    view.first.dispatchEvent(new WheelEvent("wheel", {clientX: anchor.x, clientY: anchor.y, deltaY: -180, ctrlKey: true, bubbles: true, cancelable: true}))
    view.flush()
    const zoomed = view.first.getBoundingClientRect()
    expect(zoomed.width).toBeGreaterThan(before.width)
    expect(zoomed.x + (anchor.x - before.x) * zoomed.width / before.width).toBeCloseTo(anchor.x)
    expect(zoomed.y + (anchor.y - before.y) * zoomed.height / before.height).toBeCloseTo(anchor.y)
    const style = view.owner.querySelector("[data-graph-scene]")!.getAttribute("style")
    view.renderer.resize({width: 500, height: 400})
    view.flush()
    expect(view.owner.querySelector("[data-graph-scene]")!.getAttribute("style")).toBe(style)
    view.fit()
    expectFitted(view)
    view.renderer.resize({width: 350, height: 280})
    view.flush()
    expectFitted(view)
  } finally { view.dispose() }
})

test("[GRAPH-VIEWPORT-CAPTURE] drag завершается вне viewport, cancel освобождает захват, wheel перемещает без прокрутки", () => {
  const view = mount()
  try {
    const box = view.viewport.getLayoutRect()!
    const down = {clientX: box.x + 8, clientY: box.y + 8, pointerId: 7, button: 0, buttons: 1}
    expect(view.interaction.pointerDown(view.flush(), down)).not.toBeNull()
    expect(view.viewport.hasPointerCapture(7)).toBe(true)
    view.fit()
    const before = view.changes.at(-1)!
    const beforeRect = view.first.getBoundingClientRect()
    view.interaction.pointerMove(view.flush(), {...down, clientX: -30, clientY: -20})
    view.flush()
    expect(view.changes.at(-1)!.x).toBeCloseTo(before.x - 30 - down.clientX)
    expect(view.first.getBoundingClientRect().x).toBeCloseTo(beforeRect.x - 30 - down.clientX)
    expect(view.first.getBoundingClientRect().y).toBeCloseTo(beforeRect.y - 20 - down.clientY)
    view.interaction.pointerUp(view.flush(), {...down, clientX: -30, clientY: -20, buttons: 0})
    expect(view.viewport.hasPointerCapture(7)).toBe(false)
    const count = view.changes.length
    view.interaction.pointerMove(view.flush(), {...down, buttons: 0})
    view.flush()
    expect(view.changes).toHaveLength(count)
    view.interaction.pointerDown(view.flush(), down)
    view.interaction.pointerCancel(view.flush(), down)
    expect(view.viewport.hasPointerCapture(7)).toBe(false)
    view.fit()
    const start = view.first.getBoundingClientRect()
    view.viewport.dispatchEvent(new WheelEvent("wheel", {deltaX: -25, deltaY: -35, bubbles: true, cancelable: true}))
    const frame = view.flush()
    expect(view.first.getBoundingClientRect().x).toBeCloseTo(start.x + 25)
    expect(view.first.getBoundingClientRect().y).toBeCloseTo(start.y + 35)
    expect(frame.scrolls.get(view.viewport)?.scrollTop ?? 0).toBe(0)
  } finally { view.dispose() }
})

// Регрессия исправленного generic Renderer defect: CSS translate сохраняет знак.
test("[GRAPH-NEGATIVE-TRANSLATE] отрицательный CSS translate перемещает граф за начало viewport", () => {
  const view = mount({transform: {x: -50, y: -30, scale: 1}})
  try {
    const box = view.viewport.getBoundingClientRect()
    const node = view.first.getBoundingClientRect()
    expect(node.x).toBeCloseTo(box.x - 50)
    expect(node.y).toBeCloseTo(box.y - 30)
  } finally { view.dispose() }
})
