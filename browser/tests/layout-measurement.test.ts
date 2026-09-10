import {expect, test} from "bun:test"
import {resolve, join} from "node:path"
import {mkdtemp, rm} from "node:fs/promises"
import {pathToFileURL} from "node:url"
import {component} from "@zavx0z/component"
import {acquireDocumentAuthorStyleSheetOwner, Element as SemanticElement} from "@zavx0z/dom"
import {JsxCompilerSession} from "../../template/compiler/index.ts"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import {Raycaster, Space, TrueTypeFont, ViewPoint} from "@zavx0z/engine"
import type {Renderer} from "@zavx0z/webgpu"
import type {DocumentNativeInputHost} from "../src/native-input-host.ts"
import {createDocumentSpaceRuntimeWithSeams} from "../src/space-runtime.ts"
import {createDocumentPlaneRuntime} from "../src/plane-runtime.ts"
import {createDocumentOverlayRuntime} from "../src/overlay-runtime.ts"
import {createRootWithSeams} from "../create-root.ts"
import {inspectRoot} from "../diagnostics.ts"
import type {MeasurementControls} from "./layout-measurement.fixture.tsx"

const workspace = resolve(import.meta.dir, "../..")
const {MeasurementApp} = await compileFixture()

async function compileFixture() {
  const directory = await mkdtemp(join(import.meta.dir, ".layout-measurement-"))
  const compiler = new JsxCompilerSession({cwd: workspace, sourceRoots: [import.meta.dir]})
  try {
    const source = join(import.meta.dir, "layout-measurement.fixture.tsx")
    await compiler.prepareFiles([source])
    const result = await compiler.compileFile(source)
    const target = join(directory, "fixture.ts")
    await Bun.write(target, result.code)
    return await import(pathToFileURL(target).href)
  } finally {
    await compiler.close()
    await rm(directory, {recursive: true, force: true})
  }
}

test.each([
  {kind: "hud", initialAsync: false}, {kind: "display", initialAsync: false},
  {kind: "hud", initialAsync: true}, {kind: "display", initialAsync: true},
] as const)("[BRW-LAYOUT-RECT-001] $kind/async=$initialAsync: measurement и state flush до первого и обновлённого GPU кадра", async ({kind, initialAsync}) => {
  const controls: MeasurementControls = {element: null, initial: undefined, measurements: [], finish: null, async: initialAsync, cleaned: false}
  const rect = {left: 0, top: 0, width: 400, height: 300}
  const canvas = {
    width: 400, height: 300, style: {touchAction: "auto"}, getContext: () => null,
    getBoundingClientRect: () => rect, addEventListener() {}, removeEventListener() {},
  } as unknown as HTMLCanvasElement
  const frames = new Map<number, () => void>()
  let frameId = 0
  let submissions = 0
  const rendered: Array<{width: number; accepted: number | null; visible: boolean}> = []
  const errors: Error[] = []
  const font = new TrueTypeFont(await Bun.file(resolve(workspace, "engine/static/fonts/jetbrains-mono-bold.ttf")).arrayBuffer())
  const root = createRootWithSeams(canvas, {onUncaughtError: error => errors.push(error)}, {
    loadFont: async () => font,
    createStyleSheets: () => ({refresh() {}, async whenReady() {}, dispose() {}}),
    createRuntime: async (options, claim) => createDocumentSpaceRuntimeWithSeams(options, {
      createEngineRenderer: () => ({
        setPixelRatio() {}, setSize() {}, invalidateGeometry() {}, releaseDisplay() {},
        renderComposition() {
          submissions++
          const element = controls.element!
          const owner = element.closest(kind)!
          if (!(element instanceof SemanticElement) || !(owner instanceof SemanticElement)) {
            throw new Error("Диагностика ожидает semantic Elements текущей проекции")
          }
          const frame = (kind === "hud" ? runtime!.getOverlay(owner) : runtime!.getPlane(owner))!.renderer.flush()
          const width = element.getLayoutRect()!.width
          const value = element.getAttribute("data-accepted-width")
          rendered.push({width, accepted: value === null ? null : Number(value), visible: frame.displayList.some(item => item.node === element)})
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
        const id = ++frameId
        frames.set(id, callback)
        return id
      },
      cancelFrame(handle) { frames.delete(handle as number) },
      setTimer: () => 1,
      clearTimer() {},
      now: () => 0,
    }, claim).then(value => {
      runtime = value
      return value
    }),
  })
  let runtime: Awaited<ReturnType<typeof createDocumentSpaceRuntimeWithSeams>> | null = null
  const template = MeasurementApp as unknown as CompiledTemplate<{controls: MeasurementControls; kind: "hud" | "display"}>
  root.render(component(template, {controls, kind}))
  const presentation = await inspectRoot(root).whenReady()
  const styleOwner = acquireDocumentAuthorStyleSheetOwner(presentation.document)
  try {
    expect(controls.initial).toBeNull()
    expect(controls.element?.isConnected).toBe(true)
    expect(controls.measurements).toHaveLength(1)
    expect(submissions).toBe(1)
    expect(rendered[0]).toEqual({width: controls.measurements[0]!, accepted: initialAsync ? null : controls.measurements[0]!, visible: !initialAsync})
    if (initialAsync) {
      expect(controls.finish).not.toBeNull()
      controls.finish!()
      presentation.render()
      expect(rendered.at(-1)!.visible).toBe(true)
      expect(rendered.at(-1)!.accepted).toBe(rendered.at(-1)!.width)
    }
    controls.async = false
    const element = controls.element!
    const firstWidth = element.getLayoutRect()!.width
    expect(Number.isInteger(firstWidth)).toBe(false)
    const beforeRead = submissions
    element.getLayoutRect()
    element.getBoundingClientRect()
    expect(submissions).toBe(beforeRead)
    const label = element.querySelector("span")!
    label.textContent = "Longer content"
    presentation.render()
    expect(rendered.at(-1)!.width).toBeGreaterThan(firstWidth)
    expect(rendered.at(-1)!.accepted).toBe(rendered.at(-1)!.width)
    expect(rendered.at(-1)!.visible).toBe(true)
    expect(controls.element).toBe(element)
    controls.async = true
    styleOwner.replace([{id: "font", cssText: "article { --test-font-size: 25.5px; }"}])
    presentation.render()
    expect(rendered.at(-1)!.width).toBeGreaterThan(rendered.at(-2)!.width)
    expect(rendered.at(-1)!.accepted).toBeNull()
    expect(rendered.at(-1)!.visible).toBe(false)
    expect(controls.finish).not.toBeNull()
    controls.finish!()
    presentation.render()
    expect(rendered.at(-1)!.accepted).toBe(rendered.at(-1)!.width)
    expect(rendered.at(-1)!.visible).toBe(true)
    const measurements = controls.measurements.length
    element.setAttribute("style", `${element.getAttribute("style")};transform:translate(37px,41px) scale(2)`)
    presentation.render()
    expect(controls.measurements).toHaveLength(measurements)
    expect(errors).toEqual([])
  } finally {
    styleOwner.release()
    root.unmount()
  }
  expect(controls.cleaned).toBe(true)
  expect(controls.element!.getLayoutRect()).toBeNull()
})
