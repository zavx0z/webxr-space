import {expect, spyOn, test} from "bun:test"
import {createDocument, HTMLInputElement} from "@zavx0z/dom"
import {Raycaster, Space, TrueTypeFont, ViewPoint} from "@zavx0z/engine"
import type {Renderer} from "@zavx0z/webgpu"
import {createDocumentPlaneRuntime} from "../src/plane-runtime.ts"
import {createDocumentOverlayRuntime} from "../src/overlay-runtime.ts"
import type {DocumentNativeInputHost} from "../src/native-input-host.ts"
import {createDocumentSpaceRuntimeWithSeams} from "../src/space-runtime.ts"

async function fixture() {
  const document = createDocument()
  const root = document.createElement("main")
  document.append(root)
  const rect = {left: 0, top: 0, width: 200, height: 200}
  const frames = new Map<number, () => void>()
  const captured = new Set<number>()
  let next = 0
  let attempts = 0
  let fault: Error | null = null
  const canvas = {width: 200, height: 200, style: {touchAction: "auto"},
    getBoundingClientRect: () => rect, addEventListener() {}, removeEventListener() {},
    setPointerCapture(id: number) { captured.add(id) },
    releasePointerCapture(id: number) { captured.delete(id) },
    hasPointerCapture: (id: number) => captured.has(id),
  } as unknown as HTMLCanvasElement
  const engine = {setPixelRatio() {}, setSize() {}, invalidateGeometry() {},
    renderComposition() {
      attempts++
      if (fault) throw fault
    },
  } as unknown as Renderer
  const font = {unitsPerEm: 1000, ascent: 800, descent: 200, mapCharToGlyph: () => 0,
    getGlyphOutline: () => ({points: new Float32Array(), onCurve: new Uint8Array(), contours: new Uint16Array()}),
    getHMetric: () => ({advanceWidth: 500, lsb: 0}),
  } as unknown as TrueTypeFont
  const runtime = await createDocumentSpaceRuntimeWithSeams({canvas, document, font, styleSheets: []}, {
    createEngineRenderer: () => engine,
    initializeEngineRenderer: async () => {},
    createSpace: () => new Space(),
    createViewPoint: () => new ViewPoint({position: {x: 0, y: -100, z: 0}}),
    createWorldViewPoint: () => new ViewPoint({position: {x: 0, y: -100, z: 0}}),
    createRaycaster: () => new Raycaster(),
    createNativeInputHost: () => ({nativeInput: {}, nativeTextArea: {}, setActiveRoot() {}, synchronize() {}, dispose() {}}) as unknown as DocumentNativeInputHost,
    createPlaneRuntime: createDocumentPlaneRuntime,
    createOverlayRuntime: createDocumentOverlayRuntime,
    createResizeObserver: () => ({observe() {}, disconnect() {}}),
    readCanvasRect: () => rect,
    devicePixelRatio: () => 1,
    requestFrame(callback) {
      const id = ++next
      frames.set(id, callback)
      return id
    },
    cancelFrame(handle) { frames.delete(handle as number) },
    setTimer: () => 1,
    clearTimer() {},
    now: () => 0,
  })
  const step = () => {
    const entry = frames.entries().next().value
    if (!entry) throw new Error("No scheduled frame")
    frames.delete(entry[0])
    entry[1]()
  }
  return {document, root, runtime, frames, rect, step, captured, attempts: () => attempts, fail(error: Error | null) { fault = error }}
}

test("one failed frame latches autonomous RAF and network render retries, with one actionable report", async () => {
  const f = await fixture()
  const report = spyOn(console, "error").mockImplementation(() => {})
  const error = new Error("invalid paint frame")
  const baseline = f.attempts()
  const removeBefore = f.runtime.subscribeBeforeRender(() => {
    queueMicrotask(() => f.runtime.requestRender())
  })
  const removeAlways = f.runtime.subscribePresented(() => f.runtime.requestRender())
  try {
    f.fail(error)
    f.runtime.requestRender()
    f.step()
    await Promise.resolve()
    expect(f.runtime.renderError).toBe(error)
    expect(f.attempts()).toBe(baseline + 1)
    expect(f.frames.size).toBe(0)
    expect(report).toHaveBeenCalledTimes(1)
    expect(report.mock.calls[0]?.[0]).toContain("Automatic retries are stopped")
    for (let index = 0; index < 100; index++) {
      f.root.setAttribute("data-stream-sequence", String(index))
      f.runtime.requestRender()
      f.runtime.render()
    }
    expect(f.attempts()).toBe(baseline + 1)
    expect(f.frames.size).toBe(0)
    expect(report).toHaveBeenCalledTimes(1)
    f.fail(null)
    f.runtime.resumeRendering()
    expect(f.frames.size).toBe(1)
    f.step()
    await Promise.resolve()
    expect(f.runtime.renderError).toBeNull()
    expect(f.attempts()).toBe(baseline + 2)
    expect(f.frames.size).toBe(1)
  } finally {
    removeAlways()
    removeBefore()
    f.runtime.dispose()
    report.mockRestore()
  }
})

test("direct rendering exposes the first error, stays latched, and a deliberate click rearms one attempt", async () => {
  const f = await fixture()
  const error = new Error("invalid direct frame")
  try {
    f.fail(error)
    expect(() => f.runtime.render()).toThrow(error)
    const failedAttempts = f.attempts()
    expect(() => f.runtime.render()).not.toThrow()
    f.runtime.dispatchPointer("pointermove", {clientX: 10, clientY: 10})
    f.runtime.dispatchWheel({clientX: 10, clientY: 10, deltaY: 100})
    expect(f.attempts()).toBe(failedAttempts)
    expect(f.frames.size).toBe(0)
    f.fail(null)
    f.runtime.dispatchPointer("pointerdown", {clientX: 10, clientY: 10, button: 0})
    expect(f.frames.size).toBe(1)
    f.step()
    expect(f.runtime.renderError).toBeNull()
    expect(f.attempts()).toBe(failedAttempts + 1)
  } finally {f.runtime.dispose()}
})

test("unchanged resize cannot restart a fault loop; changed viewport can recover", async () => {
  const f = await fixture()
  try {
    f.fail(new Error("resize fault"))
    expect(() => f.runtime.render()).toThrow("resize fault")
    f.runtime.resize()
    expect(f.frames.size).toBe(0)
    f.fail(null)
    f.rect.width += 20
    f.runtime.resize()
    expect(f.frames.size).toBe(1)
    f.step()
    expect(f.runtime.renderError).toBeNull()
  } finally {f.runtime.dispose()}
})

test.each(["pointerup", "pointercancel"] as const)("fault during slider drag cancels capture before %s and recovery never resumes buttons-zero dragging", async release => {
  const f = await fixture()
  const slider = f.document.createElement("input") as HTMLInputElement
  slider.type = "range"
  slider.min = "0"
  slider.max = "100"
  slider.value = "25"
  slider.setAttribute("style", "display:block;width:160px;height:24px")
  f.root.setAttribute("style", "display:block;width:200px;height:200px")
  f.root.append(slider)
  f.runtime.addOverlay({root: f.root})
  let cancelled = 0
  let clicked = 0
  slider.addEventListener("pointercancel", () => cancelled++)
  slider.addEventListener("click", () => clicked++)
  try {
    f.runtime.render()
    f.runtime.dispatchPointer("pointerdown", {clientX: 40, clientY: 12, pointerId: 1, button: 0, buttons: 1})
    expect(f.captured.has(1)).toBe(true)
    const before = slider.value
    f.fail(new Error("drag paint failed"))
    expect(() => f.runtime.render()).toThrow("drag paint failed")
    expect(f.captured.has(1)).toBe(false)
    expect(cancelled).toBe(1)
    expect(f.runtime.activeOverlayRoot).toBeNull()
    expect(() => slider.setPointerCapture(1)).toThrow()
    const attempts = f.attempts()
    f.runtime.dispatchPointer(release, {clientX: 140, clientY: 12, pointerId: 1, buttons: 0})
    expect(f.attempts()).toBe(attempts)
    f.fail(null)
    if (release === "pointerup") f.runtime.resumeRendering()
    else {
      f.rect.width = 220
      f.runtime.resize()
    }
    f.step()
    f.runtime.dispatchPointer("pointermove", {clientX: 140, clientY: 12, pointerId: 1, buttons: 0})
    f.runtime.dispatchPointer("pointerup", {clientX: 140, clientY: 12, pointerId: 1, buttons: 0})
    expect(slider.value).toBe(before)
    expect(clicked).toBe(0)
    expect(cancelled).toBe(1)
  } finally {f.runtime.dispose()}
})

test("fault cancels a pressed button without late activation after the recovery click", async () => {
  const f = await fixture()
  const button = f.document.createElement("button")
  button.setAttribute("style", "display:block;width:100px;height:30px")
  button.textContent = "Action"
  f.root.append(button)
  f.runtime.addOverlay({root: f.root})
  let clicked = 0
  button.addEventListener("click", () => clicked++)
  try {
    f.runtime.render()
    f.runtime.dispatchPointer("pointerdown", {clientX: 20, clientY: 15, pointerId: 1, buttons: 1})
    f.fail(new Error("button paint failed"))
    expect(() => f.runtime.render()).toThrow("button paint failed")
    f.runtime.dispatchPointer("pointerup", {clientX: 20, clientY: 15, pointerId: 1, buttons: 0})
    f.fail(null)
    f.runtime.dispatchPointer("pointerdown", {clientX: 20, clientY: 15, pointerId: 1, buttons: 1})
    f.step()
    f.runtime.dispatchPointer("pointerup", {clientX: 20, clientY: 15, pointerId: 1, buttons: 0})
    expect(clicked).toBe(0)
    expect(f.captured.size).toBe(0)
  } finally {f.runtime.dispose()}
})
