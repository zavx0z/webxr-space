import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {component, createRoot} from "@zavx0z/component"
import {createDocument, type HTMLElement, textOffsetAtPosition} from "@zavx0z/dom"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import {Raycaster, Space, TrueTypeFont, ViewPoint} from "@zavx0z/engine"
import type {Renderer} from "@zavx0z/webgpu"
import {caretPositionAtPoint} from "@zavx0z/renderer"
import {createCodeEditorModel} from "@zavx0z/ui/code-editor-model"
import type {CodeEditorProps} from "@zavx0z/ui/views/code-editor"
import {createDocumentNativeInputHostWithSeams} from "../src/native-input-host.ts"
import {createDocumentSpaceRuntimeWithSeams} from "../src/space-runtime.ts"
import {createDocumentPlaneRuntime} from "../src/plane-runtime.ts"
import {createDocumentOverlayRuntime} from "../src/overlay-runtime.ts"
import {createRootWithSeams} from "../create-root.ts"
import {inspectRoot} from "../diagnostics.ts"
import type {DisplayElement} from "@zavx0z/dom/display"

const workspace = resolve(import.meta.dir, "../..")
Bun.plugin(createTemplateJsxBunPlugin({cwd: workspace, persistent: true, sourceRoots: [resolve(workspace, "ui"), resolve(workspace, "space"), import.meta.dir]}))
const {CodeEditor} = await import("@zavx0z/ui/views/code-editor")
const {Editor} = await import("@zavx0z/ui/widgets/editor")
const {NativeEditorSelectionFixture} = await import("./native-editor-selection.fixture.tsx")

class NativeProxy extends EventTarget {
  value = ""
  type = "text"
  min = ""
  max = ""
  step = ""
  readOnly = false
  disabled = false
  selectionStart = 0
  selectionEnd = 0
  selectionDirection = "none"
  focus(): void {}
  blur(): void {}
  remove(): void {}
  setSelectionRange(start: number, end: number, direction = "none") {
    const changed = this.selectionStart !== start || this.selectionEnd !== end || this.selectionDirection !== direction
    this.selectionStart = start
    this.selectionEnd = end
    this.selectionDirection = direction
    if (changed) queueMicrotask(() => {
      this.dispatchEvent(new Event("select"))
      this.dispatchEvent(new Event("selectionchange"))
    })
  }
}

test.each([
  {kind: "overlay", widget: false, dual: false}, {kind: "plane", widget: false, dual: false},
  {kind: "overlay", widget: true, dual: false}, {kind: "plane", widget: true, dual: false},
  {kind: "plane", widget: true, dual: true},
] as const)("compiled editable editor $kind/widget=$widget/dual=$dual advances every pointer move across native proxy events and frames", async ({kind, widget, dual}) => {
  const document = createDocument()
  const container = document.createElement("main")
  document.append(container)
  const root = document.createElement("section") as HTMLElement
  root.setAttribute("style", "display:block;width:600px;height:280px;background:#222")
  container.append(root)
  const value = 'const label = "Alpha"\nlet tick = 0\n'
  const model = createCodeEditorModel({value, selections: [{anchor: value.length, head: value.length}]})
  const component = createRoot(root)
  component.render((widget ? Editor : CodeEditor) as unknown as CompiledTemplate<CodeEditorProps>, {value: model.snapshot.value, readOnly: false, model, languageId: "typescript"})
  const code = root.querySelector("code") as HTMLElement
  const betaRoot = document.createElement("section") as HTMLElement
  betaRoot.setAttribute("style", "display:block;width:600px;height:280px;background:#222")
  const betaModel = createCodeEditorModel({value: 'const label = "Beta"\nlet tick = 0\n'})
  const betaComponent = createRoot(betaRoot)
  if (dual) {
    container.append(betaRoot)
    betaComponent.render(Editor as unknown as CompiledTemplate<CodeEditorProps>, {value: betaModel.snapshot.value, readOnly: false, model: betaModel, languageId: "typescript"})
  }
  const proxies = {input: new NativeProxy(), select: new NativeProxy(), textarea: new NativeProxy()}
  const rect = {left: 0, top: 0, width: 600, height: 280}
  const frames = new Map<number, () => void>()
  let nextFrame = 0
  const captures = new Set<number>()
  const listeners = new Map<string, EventListenerOrEventListenerObject>()
  const canvas = {width: 600, height: 280, style: {touchAction: "auto"},
    getBoundingClientRect: () => rect,
    addEventListener(type: string, listener: EventListenerOrEventListenerObject) { listeners.set(type, listener) },
    removeEventListener(type: string) { listeners.delete(type) },
    setPointerCapture(id: number) { captures.add(id) }, releasePointerCapture(id: number) { captures.delete(id) }, hasPointerCapture: (id: number) => captures.has(id),
  } as unknown as HTMLCanvasElement
  const font = new TrueTypeFont(await Bun.file(resolve(workspace, "engine/static/fonts/jetbrains-mono-bold.ttf")).arrayBuffer())
  const theme = await Bun.file(resolve(workspace, "ui/themes/theme.css")).text()
  const runtime = await createDocumentSpaceRuntimeWithSeams({canvas, document, font, styleSheets: [theme]}, {
    createEngineRenderer: () => ({setPixelRatio() {}, setSize() {}, invalidateGeometry() {}, releaseDisplay() {}, renderComposition(composition: Parameters<Renderer["renderComposition"]>[0]) {
      composition.space.updateWorldMatrix(true, {parents: true})
    }}) as unknown as Renderer,
    initializeEngineRenderer: async () => {}, createSpace: () => new Space(),
    createViewPoint: () => new ViewPoint({position: {x: 0, y: -140, z: 0}, fov: Math.PI / 2}),
    createWorldViewPoint: () => new ViewPoint({position: {x: 0, y: -100, z: 0}}),
    createRaycaster: () => new Raycaster(),
    createNativeInputHost: options => createDocumentNativeInputHostWithSeams(options, {createProxies: () => ({
      input: proxies.input as unknown as HTMLInputElement, select: proxies.select as unknown as HTMLSelectElement,
      textarea: proxies.textarea as unknown as HTMLTextAreaElement, selectionTarget: new EventTarget(),
    })}),
    createPlaneRuntime: createDocumentPlaneRuntime, createOverlayRuntime: createDocumentOverlayRuntime,
    createResizeObserver: () => ({observe() {}, disconnect() {}}), readCanvasRect: () => rect, devicePixelRatio: () => 2,
    requestFrame(callback) {
      const id = ++nextFrame
      frames.set(id, callback)
      return id
    },
    cancelFrame(handle) { frames.delete(handle as number) }, setTimer: () => 1, clearTimer() {}, now: () => 0,
  })
  const overlay = kind === "overlay" ? runtime.addOverlay({root}) : runtime.addPlane({
    root, viewport: {width: rect.width, height: rect.height}, worldUnitsPerPixel: 1,
    transform: {position: {x: 0, y: 0, z: 0}, quaternion: {x: Math.SQRT1_2, y: 0, z: 0, w: Math.SQRT1_2}},
  })
  const betaProjection = dual ? runtime.addPlane({
    root: betaRoot, viewport: {width: rect.width, height: rect.height}, worldUnitsPerPixel: 1,
    transform: {position: {x: 652, y: 0, z: 0}, quaternion: {x: Math.SQRT1_2, y: 0, z: 0, w: Math.SQRT1_2}},
  }) : null
  const settle = async () => {
    runtime.render()
    for (let turn = 0; turn < 6; turn += 1) await Promise.resolve()
    runtime.render()
    if (betaProjection !== null) {
      betaProjection.flush()
      expect(betaProjection.frame.textHighlights ?? []).toHaveLength(0)
      expect(betaModel.snapshot.selections).toEqual([{anchor: 0, head: 0}])
    }
  }
  const pointer = (type: "pointerdown" | "pointermove" | "pointerup", x: number, y = 14, flags = {}) => runtime.dispatchPointer(type,
    {clientX: x, clientY: y, pointerId: 1, pointerType: "mouse", button: type === "pointermove" ? -1 : 0, buttons: type === "pointerup" ? 0 : 1, ...flags})
  const nativePointer = (type: "pointerdown" | "pointermove" | "pointerup", x: number, y: number, flags = {}) => {
    const fields = {clientX: x, clientY: y, pointerId: 1, pointerType: "mouse", isPrimary: true, pressure: 0.5,
      button: type === "pointermove" ? -1 : 0, buttons: type === "pointerup" ? 0 : 1,
      ctrlKey: false, altKey: false, shiftKey: false, metaKey: false, cancelable: true, timeStamp: 1, ...flags}
    const prototype = Object.defineProperties({}, Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, {get: () => value}])))
    const event = Object.assign(Object.create(prototype), {preventDefault() {}}) as Event
    const listener = listeners.get(type)
    if (typeof listener === "function") listener(event)
    else listener?.handleEvent(event)
  }
  try {
    await settle()
    const firstText = overlay.renderer.flush().displayList.find(item => item.kind === "text" && code.contains(item.node))!
    if (firstText.kind !== "text") throw new Error("Fixture needs rendered source text")
    const origin = {x: firstText.x + 1.125, y: firstText.y + firstText.lineHeight / 2}
    pointer("pointerdown", origin.x, origin.y)
    await settle()
    const heads: number[] = []
    for (let step = 1; step <= 10; step += 1) {
      const x = origin.x + step * 8
      const y = origin.y + step * 1.9
      pointer("pointermove", x, y)
      await settle()
      heads.push(model.snapshot.selections[0]!.head)
    }
    // Do not warm the live caret index before/during the gesture. A fresh frame
    // identity builds an independent post-gesture oracle over the same source.
    const oracle = {...overlay.renderer.flush()}
    const expected = Array.from({length: 10}, (_, index) => {
      const step = index + 1
      const position = caretPositionAtPoint(oracle, origin.x + step * 8, origin.y + step * 1.9, {nearest: true, root: code})!
      return textOffsetAtPosition(code, position.offsetNode, position.offset)!
    })
    expect(heads).toEqual(expected)
    expect(heads.at(-1)).toBeGreaterThan(heads[0]!)
    expect(overlay.interaction.selectionPointerId).toBe(1)
    expect(overlay.interaction.pressedElement?.isConnected).toBe(true)
    expect([proxies.textarea.selectionStart, proxies.textarea.selectionEnd]).toEqual([0, heads.at(-1)!])
    pointer("pointerup", origin.x + 80, origin.y + 19)
    await settle()
    expect(captures.size).toBe(0)
    let modifierEvent: unknown = null
    code.addEventListener("pointerdown", event => {
      const pointer = event as import("@zavx0z/dom").PointerEvent
      modifierEvent = {ctrlKey: pointer.ctrlKey, altKey: pointer.altKey, shiftKey: pointer.shiftKey, metaKey: pointer.metaKey}
    })
    pointer("pointerdown", origin.x + 20, origin.y, {ctrlKey: true, altKey: true, shiftKey: true, metaKey: true})
    pointer("pointerup", origin.x + 20, origin.y)
    expect(modifierEvent).toEqual({ctrlKey: true, altKey: true, shiftKey: true, metaKey: true})
    await settle()
    model.setSelections([{anchor: 0, head: 2}])
    await settle()
    nativePointer("pointerdown", origin.x + 65, origin.y, {altKey: true})
    await settle()
    nativePointer("pointermove", origin.x + 90, origin.y, {altKey: true})
    await settle()
    nativePointer("pointerup", origin.x + 90, origin.y, {altKey: true})
    await settle()
    expect(model.snapshot.selections).toHaveLength(2)
    expect(model.snapshot.selections[0]).toEqual({anchor: 0, head: 2})
    expect(model.snapshot.selections[1]!.head).toBeGreaterThan(model.snapshot.selections[1]!.anchor)
  } finally {
    runtime.dispose()
    betaComponent.unmount()
    component.unmount()
  }
})

test("real createRoot App keeps two Editor projections isolated across every selection-composed frame", async () => {
  const alpha = createCodeEditorModel({value: 'const label = "Alpha"\nlet tick = 0\n'})
  const beta = createCodeEditorModel({value: 'const label = "Beta"\nlet tick = 0\n'})
  const font = new TrueTypeFont(await Bun.file(resolve(workspace, "engine/static/fonts/jetbrains-mono-bold.ttf")).arrayBuffer())
  const theme = await Bun.file(resolve(workspace, "ui/themes/theme.css")).text()
  const proxies = {input: new NativeProxy(), select: new NativeProxy(), textarea: new NativeProxy()}
  const rect = {left: 0, top: 0, width: 600, height: 280}
  const frames = new Map<number, () => void>()
  const captures = new Set<number>()
  let nextFrame = 0
  const canvas = {width: 1200, height: 560, style: {touchAction: "auto"}, getContext: () => null,
    getBoundingClientRect: () => rect, addEventListener() {}, removeEventListener() {},
    setPointerCapture(id: number) { captures.add(id) }, releasePointerCapture(id: number) { captures.delete(id) }, hasPointerCapture: (id: number) => captures.has(id),
  } as unknown as HTMLCanvasElement
  const app = component(NativeEditorSelectionFixture as unknown as CompiledTemplate<{alpha: typeof alpha; beta: typeof beta}>, {alpha, beta})
  const root = createRootWithSeams(canvas, {pixelRatio: 2}, {
    loadFont: async () => font,
    createStyleSheets: () => ({refresh() {}, async whenReady() {}, dispose() {}}),
    createRuntime: (options, claim) => createDocumentSpaceRuntimeWithSeams({...options, styleSheets: [theme]}, {
    createEngineRenderer: () => ({setPixelRatio() {}, setSize() {}, invalidateGeometry() {}, releaseDisplay() {}, renderComposition(composition: Parameters<Renderer["renderComposition"]>[0]) {
      composition.space.updateWorldMatrix(true, {parents: true})
    }}) as unknown as Renderer,
    initializeEngineRenderer: async () => {}, createSpace: () => new Space(),
    createViewPoint: () => new ViewPoint({position: {x: 0, y: -140, z: 0}, fov: Math.PI / 2}),
    createWorldViewPoint: () => new ViewPoint({position: {x: 0, y: -140, z: 0}}), createRaycaster: () => new Raycaster(),
    createNativeInputHost: options => createDocumentNativeInputHostWithSeams(options, {createProxies: () => ({
      input: proxies.input as unknown as HTMLInputElement, select: proxies.select as unknown as HTMLSelectElement,
      textarea: proxies.textarea as unknown as HTMLTextAreaElement, selectionTarget: new EventTarget(),
    })}),
    createPlaneRuntime: createDocumentPlaneRuntime, createOverlayRuntime: createDocumentOverlayRuntime,
    createResizeObserver: () => ({observe() {}, disconnect() {}}), readCanvasRect: () => rect, devicePixelRatio: () => 2,
    requestFrame(callback) {
      const id = ++nextFrame
      frames.set(id, callback)
      return id
    },
    cancelFrame(handle) { frames.delete(handle as number) }, setTimer: () => 1, clearTimer() {}, now: () => 0,
    }, claim),
  })
  root.render(app)
  const experience = await inspectRoot(root).whenReady()
  const first = experience.document.getElementById("alpha") as DisplayElement
  const second = experience.document.getElementById("beta") as DisplayElement
  const code = first.querySelector("code") as HTMLElement
  const projection = experience.getProjection(first)
  const settle = async () => {
    experience.render()
    for (let turn = 0; turn < 6; turn += 1) await Promise.resolve()
    experience.render()
    expect(experience.getProjection(second).readFrame()!.textHighlights ?? []).toHaveLength(0)
  }
  try {
    await settle()
    const text = projection.readFrame()!.displayList.find(item => item.kind === "text" && code.contains(item.node))!
    if (text.kind !== "text") throw new Error("Fixture needs source text")
    const origin = {x: text.x + 1.125, y: text.y + text.lineHeight / 2}
    const start = projection.projectPoint(origin)!
    experience.input.pointerDown({...start, pointerId: 1, button: 0, buttons: 1})
    await settle()
    const heads: number[] = []
    const proxyHeads: number[] = []
    for (let step = 1; step <= 10; step += 1) {
      const local = {x: origin.x + step * 8, y: origin.y + step * 1.9}
      const point = projection.projectPoint(local)!
      experience.input.pointerMove({...point, pointerId: 1, button: -1, buttons: 1})
      await settle()
      heads.push(alpha.snapshot.selections[0]!.head)
      proxyHeads.push(proxies.textarea.selectionEnd)
      expect(beta.snapshot.selections).toEqual([{anchor: 0, head: 0}])
    }
    const oracle = {...projection.readFrame()!}
    const expectedHeads = Array.from({length: 10}, (_, index) => {
      const step = index + 1
      const position = caretPositionAtPoint(oracle, origin.x + step * 8, origin.y + step * 1.9, {nearest: true, root: code})!
      return textOffsetAtPosition(code, position.offsetNode, position.offset)!
    })
    expect(heads).toEqual(expectedHeads)
    expect(proxyHeads).toEqual(expectedHeads)
    const end = projection.projectPoint({x: origin.x + 80, y: origin.y + 19})!
    experience.input.pointerUp({...end, pointerId: 1, button: 0, buttons: 0})
    await settle()
    expect(captures.size).toBe(0)
  } finally { experience.unmount() }
})
