import {expect, test} from "bun:test"
import {createDocument, type HTMLElement, type EventTarget} from "@zavx0z/dom"
import {Raycaster, Space, TrueTypeFont, ViewPoint} from "@zavx0z/engine"
import type {Renderer} from "@zavx0z/webgpu"
import {createDocumentPlaneRuntime} from "../src/plane-runtime.ts"
import {createDocumentOverlayRuntime} from "../src/overlay-runtime.ts"
import type {DocumentNativeInputHost} from "../src/native-input-host.ts"
import {createDocumentSpaceRuntimeWithSeams} from "../src/space-runtime.ts"

async function fixture() {
  const document = createDocument()
  const root = document.createElement("article") as HTMLElement
  root.setAttribute("style", "display:block;width:200px;height:200px;background:#222;font-size:10px;line-height:14px")
  const scrollport = document.createElement("section") as HTMLElement
  scrollport.setAttribute("style", "display:block;width:80px;height:56px;overflow:auto")
  root.append(scrollport)
  const rows = Array.from({length: 40}, (_, index) => {
    const row = document.createElement("p")
    row.setAttribute("style", "display:block;margin:0;width:240px;height:14px;white-space:pre")
    row.textContent = `line ${index} with long text`
    scrollport.append(row)
    return row
  })
  document.append(root)
  const rect = {left: 0, top: 0, width: 200, height: 200}
  const frames = new Map<number, () => void>()
  const captures = new Set<number>()
  let nextFrame = 0
  const canvas = {width: 200, height: 200, style: {touchAction: "auto"},
    getBoundingClientRect: () => rect, addEventListener() {}, removeEventListener() {},
    setPointerCapture(id: number) { captures.add(id) },
    releasePointerCapture(id: number) { captures.delete(id) },
    hasPointerCapture: (id: number) => captures.has(id),
  } as unknown as HTMLCanvasElement
  const engine = {setPixelRatio() {}, setSize() {}, invalidateGeometry() {}, renderComposition() {}} as unknown as Renderer
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
      const id = ++nextFrame
      frames.set(id, callback)
      return id
    },
    cancelFrame(handle) { frames.delete(handle as number) },
    setTimer: () => 1,
    clearTimer() {},
    now: () => 0,
  })
  runtime.addOverlay({root})
  runtime.render()
  const pointer = (kind: "pointerdown" | "pointermove" | "pointerup" | "pointercancel", x = 6, y = 7) =>
    runtime.dispatchPointer(kind, {clientX: x, clientY: y, pointerId: 9, button: 0,
      buttons: kind === "pointerup" || kind === "pointercancel" ? 0 : 1})
  return {document, root, scrollport, rows, runtime, captures, frames, pointer}
}

test("Browser frame stops both-axis selection autoscroll on pending capture without waiting for another pointermove", async () => {
  const f = await fixture()
  const targets: Array<EventTarget | null> = []
  f.document.addEventListener("pointermove", event => { targets.push(event.target) })
  try {
    f.pointer("pointerdown")
    f.pointer("pointermove", 130, 96)
    f.runtime.render()
    expect(f.scrollport.scrollTop).toBeGreaterThan(0)
    expect(f.scrollport.scrollLeft).toBeGreaterThan(0)
    const held = {top: f.scrollport.scrollTop, left: f.scrollport.scrollLeft, text: f.document.getSelection().toString()}
    expect(f.frames.size).toBe(1)
    let got = 0
    f.root.addEventListener("gotpointercapture", () => got++)
    const removeBefore = f.runtime.subscribeBeforeRender(() => f.root.setPointerCapture(9))
    f.runtime.render()
    removeBefore()
    expect(got).toBe(1)
    expect({top: f.scrollport.scrollTop, left: f.scrollport.scrollLeft, text: f.document.getSelection().toString()}).toEqual(held)
    expect(f.frames.size).toBe(0)
    f.pointer("pointermove", 145, 110)
    expect(targets.at(-1)).toBe(f.root)
    f.runtime.render()
    expect(f.scrollport.scrollTop).toBe(held.top)
    expect(f.document.getSelection().toString()).toBe(held.text)
    f.root.releasePointerCapture(9)
    f.pointer("pointermove", 150, 120)
    f.runtime.render()
    expect(f.scrollport.scrollTop).toBe(held.top)
    f.pointer("pointerup", 150, 120)
    expect(f.captures.size).toBe(0)
  } finally {f.runtime.dispose()}
})

test.each(["pointerup", "pointercancel", "removal", "dispose"] as const)("Browser %s clears captured selection state and scheduled autoscroll", async finish => {
  const f = await fixture()
  try {
    f.pointer("pointerdown")
    f.pointer("pointermove", 130, 96)
    f.runtime.render()
    f.root.setPointerCapture(9)
    f.runtime.render()
    const top = f.scrollport.scrollTop
    if (finish === "dispose") f.runtime.dispose()
    else if (finish === "removal") {
      f.runtime.removeOverlay(f.root)
      f.root.remove()
      f.runtime.render()
    } else {
      f.pointer(finish, 130, 96)
      f.runtime.render()
    }
    expect(f.captures.size).toBe(0)
    expect(f.root.hasPointerCapture(9)).toBe(false)
    expect(f.scrollport.scrollTop).toBe(top)
    expect(f.frames.size).toBe(0)
    if (finish !== "dispose" && finish !== "removal") {
      f.scrollport.scrollTop = 0
      f.scrollport.scrollLeft = 0
      f.runtime.render()
      f.pointer("pointerdown")
      f.pointer("pointermove", 130, 96)
      f.runtime.render()
      expect(f.scrollport.scrollTop).toBeGreaterThan(0)
    }
  } finally {f.runtime.dispose()}
})
