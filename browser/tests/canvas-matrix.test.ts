import {expect, test} from "bun:test"
import {createDocument} from "@zavx0z/dom"
import {Space, TrueTypeFont, ViewPoint} from "@zavx0z/engine"
import {createDocumentInteractionController, createDocumentRenderer} from "@renderer/html"
import {RendererWebGpuBackend, RendererWebGpuScreenOverlay, type Renderer} from "@zavx0z/webgpu"
import type {DocumentNativeInputHost} from "../src/native-input-host.ts"
import {createDocumentCanvasRuntimeWithSeams} from "../src/runtime.ts"

test("isolated Canvas runtime delegates matrix synchronization to the rendering boundary", async () => {
  const document = createDocument()
  const root = document.createElement("div")
  document.append(root)
  const rect = {left: 0, top: 0, width: 200, height: 200}
  const canvas = {
    width: 200,
    height: 200,
    getBoundingClientRect: () => rect,
    addEventListener() {},
    removeEventListener() {},
  } as unknown as HTMLCanvasElement
  const font = {
    unitsPerEm: 1000,
    ascent: 800,
    descent: 200,
    mapCharToGlyph: () => 0,
    getGlyphOutline: () => ({points: new Float32Array(), onCurve: new Uint8Array(), contours: new Uint16Array()}),
    getHMetric: () => ({advanceWidth: 500, lsb: 0}),
  } as unknown as TrueTypeFont
  const space = new Space()
  let updates = 0
  let presentations = 0
  const updateMatrix = space.updateMatrix.bind(space)
  space.updateMatrix = () => {
    updates += 1
    updateMatrix()
  }
  const engineRenderer = {
    invalidateGeometry() {},
    renderFrame(currentSpace: Space, overlay: RendererWebGpuScreenOverlay, camera: ViewPoint) {
      expect(updates).toBe(0)
      overlay.updateForViewPoint(camera, {updateWorldMatrix: false})
      currentSpace.updateWorldMatrix(true, {parents: true})
      overlay.updateWorldMatrix(true, {parents: true})
      presentations += 1
    },
  } as unknown as Renderer
  const nativeHost = {
    nativeInput: {},
    nativeTextArea: {},
    setActiveRoot() {},
    synchronize() {},
    dispose() {},
  } as unknown as DocumentNativeInputHost
  const runtime = await createDocumentCanvasRuntimeWithSeams({
    canvas,
    document,
    root,
    font,
    styleSheets: [],
  }, {
    createEngineRenderer: () => engineRenderer,
    initializeEngineRenderer: async () => {},
    createSpace: () => space,
    createFixedViewPoint: () => new ViewPoint({position: {x: 0, y: -100, z: 0}}),
    createBackend: options => new RendererWebGpuBackend(options),
    createOverlay: options => new RendererWebGpuScreenOverlay(options),
    createDocumentRenderer,
    createInteraction: createDocumentInteractionController,
    createNativeInputHost: () => nativeHost,
    createResizeObserver: () => ({observe() {}, disconnect() {}}),
    readCanvasRect: () => rect,
    devicePixelRatio: () => 1,
    requestFrame: () => 1,
    cancelFrame() {},
    setTimer: () => 1,
    clearTimer() {},
    now: () => 0,
  })
  try {
    expect(updates).toBe(1)
    updates = 0
    space.position.x = 50
    runtime.render()
    expect(updates).toBe(1)
    expect(space.matrixWorld.elements[12]).toBe(50)
    expect(presentations).toBe(2)
  } finally {
    runtime.dispose()
  }
})
