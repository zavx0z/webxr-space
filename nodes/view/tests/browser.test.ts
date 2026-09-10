import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {component, createRoot as createComponentRoot} from "@zavx0z/component"
import {Element as SemanticElement, acquireDocumentAuthorStyleSheetOwner} from "@zavx0z/dom"
import {Raycaster, Space, TrueTypeFont, ViewPoint} from "@zavx0z/engine"
import type {Renderer} from "@zavx0z/webgpu"
import type {DocumentNativeInputHost} from "../../../browser/src/native-input-host.ts"
import {createDocumentSpaceRuntimeWithSeams} from "../../../browser/src/space-runtime.ts"
import {createDocumentPlaneRuntime} from "../../../browser/src/plane-runtime.ts"
import {createDocumentOverlayRuntime} from "../../../browser/src/overlay-runtime.ts"
import {createRootWithSeams} from "../../../browser/create-root.ts"
import {inspectRoot} from "../../../browser/diagnostics.ts"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import type {GraphMeasuredLayout, GraphMeasurement, GraphViewProps} from "@webxr/nodes/view"
import type {BrowserGraphControls} from "./browser.fixture.tsx"

const workspace = resolve(import.meta.dir, "../../..")
Bun.plugin(createTemplateJsxBunPlugin({cwd: workspace, persistent: true, sourceRoots: ["nodes", "ui", "markdown"].map(path => resolve(workspace, path))}))
const {BrowserMeasuredGraph} = await import("./browser.fixture.tsx")
const {graphInput, measuredLayout} = await import("./measured.fixture.tsx")
const {GraphView} = await import("@webxr/nodes/view")
const {Markdown} = await import("@webxr/markdown")

test.each(([
  {kind: "hud", async: false, borrowed: false}, {kind: "display", async: false, borrowed: false},
  {kind: "hud", async: true, borrowed: false}, {kind: "display", async: true, borrowed: false},
  {kind: "hud", async: false, borrowed: true},
  {kind: "display", async: false, borrowed: false, late: true},
  {kind: "display", async: false, borrowed: false, markdown: true},
  {kind: "display", async: false, borrowed: true, markdown: true},
] as const).map(value => ({late: false, markdown: false, ...value})))("[GRAPH-PREPAINT] $kind async=$async borrowed=$borrowed late=$late markdown=$markdown: первый видимый GPU граф уже имеет измеренные размеры и позиции", async ({kind, async: firstAsync, borrowed, late, markdown}) => {
  let element: HTMLElement | null = null
  let async = firstAsync
  let expected: GraphMeasuredLayout | null = null
  let release: (() => void) | undefined
  const ready = late ? new Promise<void>(resolve => { release = resolve }) : undefined
  const jobs: Array<{nodes: readonly GraphMeasurement[]; finish(result: GraphMeasuredLayout): void}> = []
  const controls: BrowserGraphControls = {
    ready,
    markdown: markdown ? "```mermaid\nflowchart LR\nA --> LongLabel\n```" : undefined,
    input: graphInput(),
    capture: value => { element = value },
    layout: nodes => {
      if (async) return new Promise(resolve => jobs.push({nodes, finish: result => {
        expected = result
        resolve(result)
      }}))
      const result = measuredLayout(nodes)
      if ("then" in result) throw new Error("Тестовая политика должна быть синхронной")
      expected = result
      return result
    },
    mount: borrowed ? target => {
      if (!(target instanceof SemanticElement)) throw new Error("Некорректный root тестового host")
      const staging = target.ownerDocument!.createElement("div")
      if (!(staging instanceof SemanticElement)) throw new Error("Некорректный staging тестового host")
      const nested = createComponentRoot(staging)
      if (controls.markdown !== undefined) nested.render(Markdown as unknown as CompiledTemplate<{source: string}>, {source: controls.markdown})
      else nested.render(GraphView as unknown as CompiledTemplate<GraphViewProps>, {input: controls.input, layout: controls.layout, navigation: "scroll"})
      const content = staging.firstElementChild!
      target.append(content)
      return () => {
        nested.unmount()
        content.remove()
      }
    } : undefined,
  }
  const rect = {left: 0, top: 0, width: 1000, height: 700}
  const canvas = {width: 1000, height: 700, style: {touchAction: "auto"}, getContext: () => null,
    getBoundingClientRect: () => rect, addEventListener() {}, removeEventListener() {},
  } as unknown as HTMLCanvasElement
  const pendingFrames = new Map<number, () => void>()
  let nextFrame = 0
  let submissions = 0
  let runtime: Awaited<ReturnType<typeof createDocumentSpaceRuntimeWithSeams>> | null = null
  const observations: Array<{visible: boolean; coherent: boolean; pending: boolean; generation: string | null; nodes: SemanticElement[]}> = []
  const errors: Error[] = []
  const font = new TrueTypeFont(await Bun.file(resolve(workspace, "engine/static/fonts/jetbrains-mono-bold.ttf")).arrayBuffer())
  const root = createRootWithSeams(canvas, {onUncaughtError: error => errors.push(error)}, {
    loadFont: async () => font,
    createStyleSheets: () => ({refresh() {}, async whenReady() {}, dispose() {}}),
    createRuntime: async (options, claim) => createDocumentSpaceRuntimeWithSeams(options, {
      createEngineRenderer: () => ({
        setPixelRatio() {}, setSize() {}, invalidateGeometry() {}, releaseDisplay() {},
        renderComposition() {
          submissions += 1
          if (!(element instanceof SemanticElement)) throw new Error("GPU oracle не получил semantic root")
          const owner = element.closest(kind)
          if (!(owner instanceof SemanticElement)) throw new Error("Нет projection owner в тестовом oracle")
          const frame = (kind === "hud" ? runtime!.getOverlay(owner) : runtime!.getPlane(owner))!.renderer.flush()
          const surface = element.querySelector("[data-graph-scene]")!
          const nodes = [...element.querySelectorAll("article[data-node-id]")].filter((node): node is typeof node & SemanticElement => node instanceof SemanticElement)
          const visible = nodes.some(node => frame.displayList.some(item => node === item.node || node.contains(item.node)))
          const coherent = markdown ? element.querySelector('[data-mermaid-ready="true"]') !== null && nodes.length === 2 && nodes.every(node => node.getLayoutRect(surface) !== null)
            : expected !== null && nodes.every(node => {
            const target = expected!.nodes.find(value => value.id === node.getAttribute("data-node-id"))
            const actual = node.getLayoutRect(surface)
            return target !== undefined && actual !== null && (["x", "y", "width", "height"] as const).every(key =>
              Math.abs(actual[key] - target[key]) < 1e-6)
          })
          observations.push({visible, coherent, nodes, pending: element.querySelector('[data-layout-pending="true"]') !== null, generation: element.querySelector('[data-graph-view]')?.getAttribute("data-layout-generation") ?? null})
        },
      }) as unknown as Renderer,
      initializeEngineRenderer: async () => {},
      createSpace: () => new Space(),
      createViewPoint: () => new ViewPoint({position: {x: 0, y: -400, z: 0}}),
      createWorldViewPoint: () => new ViewPoint({position: {x: 0, y: -400, z: 0}}),
      createRaycaster: () => new Raycaster(),
      createNativeInputHost: () => ({setActiveRoot() {}, synchronize() {}, dispose() {}}) as unknown as DocumentNativeInputHost,
      createPlaneRuntime: createDocumentPlaneRuntime,
      createOverlayRuntime: createDocumentOverlayRuntime,
      createResizeObserver: () => ({observe() {}, disconnect() {}}),
      readCanvasRect: () => rect,
      devicePixelRatio: () => 2,
      requestFrame(callback) {
        const id = ++nextFrame
        pendingFrames.set(id, callback)
        return id
      },
      cancelFrame(handle) { pendingFrames.delete(handle as number) },
      setTimer: () => 1,
      clearTimer() {},
      now: () => 0,
    }, claim).then(value => { runtime = value; return value }),
  })
  const template = BrowserMeasuredGraph as unknown as CompiledTemplate<{controls: BrowserGraphControls; kind: "hud" | "display"}>
  root.render(component(template, {controls, kind}))
  const host = await inspectRoot(root).whenReady()
  const styles = acquireDocumentAuthorStyleSheetOwner(host.document)
  try {
    expect(submissions).toBe(1)
    expect(observations[0]!.visible).toBe(!firstAsync && !late && !markdown)
    if (markdown) {
      const deadline = Date.now() + 8000
      while (!observations.at(-1)!.visible && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 10))
        const callbacks = [...pendingFrames.values()]
        pendingFrames.clear()
        for (const callback of callbacks) callback()
      }
      expect(observations.at(-1)!.visible, JSON.stringify(observations.map(({nodes, ...frame}) => frame))).toBe(true)
      expect(observations.filter(frame => frame.visible).every(frame => frame.coherent)).toBe(true)
      expect(errors).toEqual([])
      return
    }
    if (late) {
      pendingFrames.clear()
      release!()
      for (let pass = 0; pass < 10; pass += 1) await Promise.resolve()
      expect(pendingFrames.size, "Асинхронное появление графа должно само запросить кадр").toBeGreaterThan(0)
      const callbacks = [...pendingFrames.values()]
      pendingFrames.clear()
      for (const callback of callbacks) callback()
      expect(observations.at(-1)!.visible).toBe(true)
    }
    if (firstAsync) {
      const job = jobs.at(-1)!
      job.finish(await measuredLayout(job.nodes))
      await Promise.resolve()
      host.render()
    }
    expect(observations.at(-1)!.coherent).toBe(true)
    const nodes = observations.at(-1)!.nodes
    const beforeRead = submissions
    nodes[0]!.getLayoutRect()
    expect(submissions).toBe(beforeRead)
    async = true
    styles.replace([{id: "font", cssText: "article { --diagram-node-font-size: 25.5px; }"}])
    host.render()
    expect(observations.at(-1)!.visible).toBe(false)
    const job = jobs.at(-1)!
    job.finish(await measuredLayout(job.nodes))
    await Promise.resolve()
    host.render()
    expect(observations.at(-1)!.visible, JSON.stringify({frames: observations.map(({nodes, ...value}) => value), jobs: jobs.map(job => job.nodes)})).toBe(true)
    expect(observations.at(-1)!.coherent).toBe(true)
    expect(observations.filter(value => value.visible).every(value => value.coherent)).toBe(true)
    expect(observations.at(-1)!.nodes.every((node, index) => node === nodes[index])).toBe(true)
    expect(errors).toEqual([])
  } finally {
    styles.release()
    root.unmount()
  }
})
