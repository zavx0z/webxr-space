import {afterEach, expect, test} from "bun:test"
import {createDocument, type HTMLElement} from "@zavx0z/dom"
import {Raycaster, Space, TrueTypeFont, ViewPoint} from "@zavx0z/engine"
import type {Renderer} from "@zavx0z/webgpu"
import {createDocumentOverlayRuntime} from "../src/overlay-runtime.ts"
import {createDocumentPlaneRuntime} from "../src/plane-runtime.ts"
import type {DocumentNativeInputHost} from "../src/native-input-host.ts"
import {createDocumentSpaceRuntimeWithSeams, type DocumentSpaceRuntime} from "../src/space-runtime.ts"

const runtimes: DocumentSpaceRuntime[] = []
afterEach(() => {
  for (const runtime of runtimes.splice(0)) runtime.dispose()
})

// Only GPU submission, native text proxies and scheduling are substituted.
// CPU layout, hit testing, projection geometry, dispatch and scrolling are real.
const fixture = async () => {
  const document = createDocument()
  const root = document.createElement("div")
  document.append(root)
  const listeners = new Map<string, EventListenerOrEventListenerObject>()
  const captured = new Set<number>()
  const canvas = {
    width: 200,
    height: 200,
    style: {touchAction: "auto"},
    getBoundingClientRect: () => ({left: 0, top: 0, width: 200, height: 200}),
    addEventListener(type: string, listener: EventListenerOrEventListenerObject) { listeners.set(type, listener) },
    removeEventListener(type: string) { listeners.delete(type) },
    setPointerCapture(id: number) { captured.add(id) },
    releasePointerCapture(id: number) { captured.delete(id) },
    hasPointerCapture(id: number) { return captured.has(id) },
  } as unknown as HTMLCanvasElement
  const camera = new ViewPoint({position: {x: 0, y: 0, z: 100}, fov: Math.PI / 2, far: 2000})
  camera.getUp().set(0, 1, 0)
  camera.update()
  const cameraInputs: string[] = []
  camera.pan = () => { cameraInputs.push("pan") }
  camera.orbit = () => { cameraInputs.push("orbit") }
  camera.zoom = () => { cameraInputs.push("zoom") }
  const font = {
    unitsPerEm: 1000,
    ascent: 800,
    descent: 200,
    mapCharToGlyph: () => 0,
    getGlyphOutline: () => ({points: new Float32Array(), onCurve: new Uint8Array(), contours: new Uint16Array()}),
    getHMetric: () => ({advanceWidth: 500, lsb: 0}),
  } as unknown as TrueTypeFont
  const nativeHost = {
    nativeInput: {},
    nativeTextArea: {},
    setActiveDocument() {},
    synchronize() {},
    dispose() {},
  } as unknown as DocumentNativeInputHost
  const engineRenderer = {
    setPixelRatio() {},
    setSize() {},
    invalidateGeometry() {},
    renderComposition() {},
  } as unknown as Renderer
  const runtime = await createDocumentSpaceRuntimeWithSeams({
    canvas, document, font, styleSheets: [], cameraGestures: true,
  }, {
    createEngineRenderer: () => engineRenderer,
    initializeEngineRenderer: async () => {},
    createSpace: () => new Space(),
    createViewPoint: () => camera,
    createWorldViewPoint: () => camera,
    createRaycaster: () => new Raycaster(),
    createNativeInputHost: () => nativeHost,
    createPlaneRuntime: createDocumentPlaneRuntime,
    createOverlayRuntime: createDocumentOverlayRuntime,
    createResizeObserver: () => ({observe() {}, disconnect() {}}),
    readCanvasRect: () => ({left: 0, top: 0, width: 200, height: 200}),
    devicePixelRatio: () => 1,
    requestFrame: () => 1,
    cancelFrame() {},
    setTimer: () => 1,
    clearTimer() {},
    now: () => 0,
  })
  runtimes.push(runtime)
  const element = (style: string, parent: HTMLElement = root, tag: "div" | "button" = "div") => {
    const node = document.createElement(tag)
    node.setAttribute("style", style)
    parent.append(node)
    return node
  }
  const projection = (kind: "overlay" | "plane", id: string, z = 0) => {
    const node = element("position: relative; width: 200px; height: 200px")
    if (kind === "overlay") runtime.addOverlay({id, root: node})
    else runtime.addPlane({
      id, root: node, viewport: {width: 200, height: 200}, worldUnitsPerPixel: 1,
      transform: {position: {x: 0, y: 0, z}},
    })
    return node
  }
  const emit = (type: string, x: number, y: number, extra: Record<string, unknown> = {}) => {
    let prevented = false
    const event = {
      clientX: x, clientY: y, pointerId: 1, pointerType: "mouse", isPrimary: true,
      button: 0, buttons: type === "pointerdown" ? 1 : 0, pressure: 0, timeStamp: 1,
      deltaX: 0, deltaY: 20, deltaZ: 0, deltaMode: 0,
      ctrlKey: false, shiftKey: false, altKey: false, metaKey: false,
      cancelable: true, preventDefault() { prevented = true }, ...extra,
    } as unknown as Event
    const listener = listeners.get(type)
    if (typeof listener === "function") listener(event)
    else listener?.handleEvent(event)
    return prevented
  }
  const observe = (node: HTMLElement) => {
    const events: string[] = []
    for (const type of ["pointermove", "pointerdown", "pointerup", "pointercancel", "click", "wheel"]) {
      node.addEventListener(type, () => { events.push(type) })
    }
    return events
  }
  return {runtime, document, captured, cameraInputs, camera, element, projection, emit, observe}
}

test("[BRW-002] пустой HUD пропускает hover, click и wheel к Display", async () => {
  const f = await fixture()
  const display = f.projection("plane", "display")
  const scroll = f.element("width: 100px; height: 100px; overflow: auto", display)
  f.element("width: 100px; height: 300px; background: #333", scroll)
  const hud = f.projection("overlay", "hud")
  f.element("width: 200px; height: 200px; border: 1px solid #555; box-sizing: border-box", hud)
  const events = f.observe(scroll)
  f.runtime.render()
  f.emit("pointermove", 40, 40)
  expect(f.runtime.hoveredPlaneId).toBe("display")
  expect(f.runtime.hoveredOverlayId).toBeNull()
  f.emit("pointerdown", 40, 40)
  f.emit("pointerup", 40, 40)
  expect(f.emit("wheel", 40, 40)).toBe(true)
  expect(scroll.scrollTop).toBe(20)
  expect(events).toEqual(["pointermove", "pointerdown", "pointerup", "click", "wheel"])
  expect(f.cameraInputs).toEqual([])
})

test("[BRW-002] панель HUD перекрывает Display даже без интерактивных контролов", async () => {
  const f = await fixture()
  const display = f.projection("plane", "display")
  const lower = f.element("width: 100px; height: 100px; background: #111", display)
  const hud = f.projection("overlay", "hud")
  const panel = f.element("width: 50px; height: 50px; background: #333", hud)
  const lowerEvents = f.observe(lower)
  const hudEvents = f.observe(panel)
  f.runtime.render()
  for (const type of ["pointermove", "pointerdown", "pointerup", "wheel"]) f.emit(type, 20, 20)
  expect(hudEvents).toEqual(["pointermove", "pointerdown", "pointerup", "click", "wheel"])
  expect(lowerEvents).toEqual([])
  f.emit("pointermove", 70, 70)
  expect(f.runtime.hoveredPlaneId).toBe("display")
  expect(f.runtime.hoveredOverlayId).toBeNull()
  expect(lowerEvents).toEqual(["pointermove"])
})

test("[BRW-002] пустой ближний Display пропускает ввод к содержимому дальнего", async () => {
  const f = await fixture()
  const back = f.projection("plane", "back")
  const button = f.element("width: 100px; height: 100px", back, "button")
  const front = f.projection("plane", "front", 10)
  f.element("width: 30px; height: 30px; background: #333", front)
  const events = f.observe(button)
  f.runtime.render()
  f.emit("pointermove", 70, 70)
  f.emit("pointerdown", 70, 70)
  f.emit("pointerup", 70, 70)
  expect(f.runtime.hoveredPlaneId).toBe("back")
  expect(events).toContain("click")
  f.emit("pointermove", 10, 10)
  expect(f.runtime.hoveredPlaneId).toBe("front")
})

test("[BRW-002] захват HUD сохраняется при выходе за элемент и отменяется при удалении проекции", async () => {
  const f = await fixture()
  const hud = f.projection("overlay", "hud")
  const panel = f.element("width: 40px; height: 40px; background: #333", hud)
  panel.addEventListener("pointerdown", event => panel.setPointerCapture((event as unknown as {pointerId: number}).pointerId))
  const events = f.observe(panel)
  f.runtime.render()
  f.emit("pointerdown", 20, 20)
  f.emit("pointermove", 180, 180, {buttons: 1})
  expect(f.runtime.activeOverlayId).toBe("hud")
  expect(events).toEqual(["pointerdown", "pointermove"])
  expect(f.cameraInputs).toEqual([])
  f.runtime.removeOverlay("hud")
  expect(events).toContain("pointercancel")
  expect(f.captured.size).toBe(0)
})

test("[BRW-002] прокрученный до конца HUD не отдаёт колесо скрытому Display или камере", async () => {
  const f = await fixture()
  const display = f.projection("plane", "display")
  const lower = f.element("width: 100px; height: 100px; background: #111", display)
  const hud = f.projection("overlay", "hud")
  const scroll = f.element("width: 80px; height: 60px; overflow: auto", hud)
  f.element("width: 80px; height: 200px", scroll)
  const events = f.observe(lower)
  f.runtime.render()
  f.emit("wheel", 20, 20, {deltaY: 500})
  expect(scroll.scrollTop).toBe(140)
  f.emit("wheel", 20, 20, {deltaY: 100})
  expect(scroll.scrollTop).toBe(140)
  expect(events).toEqual([])
  expect(f.cameraInputs).toEqual([])
})

test("[BRW-002] свободное место HUD и Display пропускает ввод к Space", async () => {
  const f = await fixture()
  f.projection("overlay", "hud")
  f.projection("plane", "display")
  let doubleClicks = 0
  f.runtime.addWorld({
    id: "world", space: new Space(), viewport: {x: 100, y: 100, width: 100, height: 100},
    viewPoint: f.runtime.snapshotViewPoint(), onDoubleClick() { doubleClicks++ },
  })
  f.runtime.render()
  f.emit("pointermove", 150, 150)
  expect(f.runtime.hoveredWorldId).toBe("world")
  f.emit("pointerdown", 150, 150)
  f.emit("pointermove", 155, 155, {buttons: 1})
  f.emit("pointerup", 155, 155)
  f.emit("wheel", 150, 150)
  f.emit("dblclick", 150, 150)
  expect(doubleClicks).toBe(1)
  expect(f.cameraInputs).toEqual(["orbit", "pan"])
})

test("[BRW-002] contextmenu и dblclick выбирают тот же элемент и сохраняют bubbling и preventDefault", async () => {
  const f = await fixture()
  const display = f.projection("plane", "display")
  const lower = f.element("width: 100px; height: 100px; background: #111", display)
  const hud = f.projection("overlay", "hud")
  const upper = f.element("width: 30px; height: 30px; background: #333", hud)
  const events: unknown[] = []
  for (const type of ["contextmenu", "dblclick"]) {
    display.addEventListener(type, event => {
      events.push([type, event.target])
      event.preventDefault()
    })
    upper.addEventListener(type, event => events.push([type, event.target]))
  }
  f.runtime.render()
  expect(f.emit("contextmenu", 70, 70, {button: 2})).toBe(true)
  expect(f.emit("dblclick", 70, 70, {detail: 2})).toBe(true)
  expect(f.emit("contextmenu", 10, 10, {button: 2})).toBe(false)
  expect(f.emit("dblclick", 10, 10, {detail: 2})).toBe(false)
  expect(events).toEqual([
    ["contextmenu", lower], ["dblclick", lower], ["contextmenu", upper], ["dblclick", upper],
  ])
})
