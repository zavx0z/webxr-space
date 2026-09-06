import type {RendererFontFace} from "@zavx0z/webgpu"
import {
  Raycaster,
  Space,
  ViewPoint,
  type TrueTypeFont,
} from "@zavx0z/engine"
import {
  MouseEvent as SemanticMouseEvent,
  type Document,
  type Element as DomElement,
  type Node,
} from "@zavx0z/dom"
import {
  createDocumentInteractionState,
  hitTestProjection,
  type DocumentInteractionState,
  type HitMetadata,
  type PointerInput,
  type RenderFrame,
  type RenderViewport,
  type WheelInput,
} from "@zavx0z/renderer"
import {
  Renderer as EngineRenderer,
  type RendererWebGpuDocumentPlaneIntersection,
} from "@zavx0z/webgpu"
import {
  createDocumentPlaneRuntime,
  type CreateDocumentPlaneRuntimeOptions,
  type DocumentPlaneRuntime,
} from "./plane-runtime.ts"
import {
  createDocumentOverlayRuntime,
  type CreateDocumentOverlayRuntimeOptions,
  type DocumentOverlayRuntime,
} from "./overlay-runtime.ts"
import {
  createDocumentNativeInputHost,
  type DocumentNativeInputHost,
  type DocumentNativeInputTarget,
} from "./native-input-host.ts"
import {claimBrowserPresentationHost, type PresentationHostClaim} from "./presentation-host.ts"
import {resizeCanvasBackingStore} from "./canvas-backing-store.ts"
import {
  applyTouchCameraGesture,
  type TouchCameraPoint,
} from "./touch-camera-gesture.ts"
import {claimTouchCameraSurface} from "./touch-camera-surface.ts"
import type {RootSize} from "./root-context.ts"

export type DocumentSpaceVector3 = Readonly<{x: number; y: number; z: number}>
export type DocumentSpaceQuaternion = Readonly<{x: number; y: number; z: number; w: number}>

export type DocumentSpaceViewPointSnapshot = Readonly<{
  position: DocumentSpaceVector3
  target: DocumentSpaceVector3
  fov: number
  near: number
  far: number
}>

export type DocumentSpacePlaneTransform = Readonly<{
  position?: DocumentSpaceVector3
  quaternion?: DocumentSpaceQuaternion
  scale?: DocumentSpaceVector3
  visible?: boolean
}>

/** Один root — одна проекция. Имя или DOM id не участвуют в регистрации и вводе. */
export type DocumentSpacePlaneRegistration = Readonly<{
  root: Node
  viewport: RenderViewport
  worldUnitsPerPixel: number
  transform?: DocumentSpacePlaneTransform
  tooltipDelayMs?: number
}>

export type DocumentSpacePlaneUpdate = Readonly<{
  viewport?: RenderViewport
  worldUnitsPerPixel?: number
  transform?: DocumentSpacePlaneTransform
}>

/** Экранная проекция удерживается по той же ссылке root до удаления. */
export type DocumentSpaceOverlayRegistration = Readonly<{
  root: Node
  distance?: number
  tooltipDelayMs?: number
}>

/** One caller-owned direct world region in logical canvas coordinates. */
export type DocumentSpaceWorldViewport = Readonly<{
  x: number
  y: number
  width: number
  height: number
}>

/** Exact logical/backing geometry published after host viewport resolution. */
export type DocumentSpaceWorldResize = Readonly<{
  logicalViewport: DocumentSpaceWorldViewport
  backingViewport: DocumentSpaceWorldViewport
  pixelRatio: number
}>

export type DocumentSpaceWorldRegistration = Readonly<{
  space: Space
  viewport: DocumentSpaceWorldViewport | null
  viewPoint: DocumentSpaceViewPointSnapshot
  visible?: boolean
  cameraGestures?: boolean
  onResize?(resize: DocumentSpaceWorldResize | null): void
  onDoubleClick?(): void
}>

export type DocumentSpaceWorldUpdate = Readonly<{
  viewport?: DocumentSpaceWorldViewport | null
  viewPoint?: DocumentSpaceViewPointSnapshot
  visible?: boolean
  cameraGestures?: boolean
}>

export type DocumentSpaceWorldRuntime = Readonly<{
  space: Space
  viewPoint: ViewPoint
  viewport: DocumentSpaceWorldViewport | null
  logicalViewport: DocumentSpaceWorldViewport | null
  backingViewport: DocumentSpaceWorldViewport | null
  visible: boolean
  cameraGesturesEnabled: boolean
  disposed: boolean
  requestRender(): void
  snapshotViewPoint(): DocumentSpaceViewPointSnapshot
  restoreViewPoint(snapshot: DocumentSpaceViewPointSnapshot): void
  dispose(): void
}>

export type CreateDocumentSpaceRuntimeOptions = Readonly<{
  canvas: HTMLCanvasElement
  document: Document
  styleSheets: readonly string[]
  font: TrueTypeFont
  fontFaces?: readonly RendererFontFace[] | undefined
  pixelRatio?: number
  viewPoint?: DocumentSpaceViewPointSnapshot
  cameraGestures?: boolean
  onViewportChange?(size: RootSize): void
}>

export type DocumentSpaceRuntime = Readonly<{
  canvas: HTMLCanvasElement
  document: Document
  styleSheets: readonly string[]
  font: TrueTypeFont
  interactionState: DocumentInteractionState
  engineRenderer: EngineRenderer
  space: Space
  viewPoint: ViewPoint
  raycaster: Raycaster
  nativeInputHost: DocumentNativeInputHost
  nativeInput: HTMLInputElement
  nativeTextArea: HTMLTextAreaElement
  inputTarget: DocumentNativeInputTarget | null
  activeInputRoot: Node | null
  planeRoots: Iterable<Node>
  overlayRoots: Iterable<Node>
  worldSpaces: Iterable<Space>
  activePlaneRoot: Node | null
  hoveredPlaneRoot: Node | null
  activeOverlayRoot: Node | null
  hoveredOverlayRoot: Node | null
  activeWorldSpace: Space | null
  hoveredWorldSpace: Space | null
  cameraGesturesEnabled: boolean
  presentedFrames: number
  disposed: boolean
  addPlane(registration: DocumentSpacePlaneRegistration): DocumentPlaneRuntime
  getPlane(owner: Node): DocumentPlaneRuntime | undefined
  updatePlane(owner: Node, update: DocumentSpacePlaneUpdate): DocumentPlaneRuntime
  removePlane(owner: Node): boolean
  addOverlay(registration: DocumentSpaceOverlayRegistration): DocumentOverlayRuntime
  getOverlay(owner: Node): DocumentOverlayRuntime | undefined
  removeOverlay(owner: Node): boolean
  addWorld(registration: DocumentSpaceWorldRegistration): DocumentSpaceWorldRuntime
  getWorld(owner: Space): DocumentSpaceWorldRuntime | undefined
  updateWorld(owner: Space, update: DocumentSpaceWorldUpdate): DocumentSpaceWorldRuntime
  removeWorld(owner: Space): boolean
  render(): void
  requestRender(): void
  resize(): void
  captureLastPresentedFramePng(): Promise<Blob | null>
  snapshotViewPoint(): DocumentSpaceViewPointSnapshot
  restoreViewPoint(snapshot: DocumentSpaceViewPointSnapshot): void
  setCameraGesturesEnabled(enabled: boolean): void
  dispatchPointer(type: "pointermove" | "pointerdown" | "pointerup" | "pointercancel", input: PointerInput): void
  dispatchWheel(input: WheelInput): void
  projectPoint(owner: Node, point: Readonly<{x: number; y: number}>): Readonly<{x: number; y: number}> | null
  subscribeBeforeRender(listener: () => void): () => void
  subscribePresented(listener: (frame: number) => void): () => void
  dispose(): void
}>

type ResizeObserverOwner = Readonly<{
  observe(target: Element): void
  disconnect(): void
}>

type CanvasRect = Readonly<{
  left: number
  top: number
  width: number
  height: number
}>

/** Internal platform seams for GPU-independent multi-plane tests. */
export type DocumentSpaceRuntimeSeams = Readonly<{
  createEngineRenderer(): EngineRenderer
  initializeEngineRenderer(renderer: EngineRenderer, canvas: HTMLCanvasElement): Promise<void>
  createSpace(): Space
  createViewPoint(canvas: HTMLCanvasElement, snapshot: DocumentSpaceViewPointSnapshot): ViewPoint
  createWorldViewPoint(
    snapshot: DocumentSpaceViewPointSnapshot,
    viewport: DocumentSpaceWorldViewport,
  ): ViewPoint
  createRaycaster(): Raycaster
  createNativeInputHost(options: Readonly<{requestFrame(): void}>): DocumentNativeInputHost
  createPlaneRuntime(options: CreateDocumentPlaneRuntimeOptions): DocumentPlaneRuntime
  createOverlayRuntime(options: CreateDocumentOverlayRuntimeOptions): DocumentOverlayRuntime
  createResizeObserver(callback: () => void): ResizeObserverOwner
  readCanvasRect(canvas: HTMLCanvasElement): CanvasRect
  devicePixelRatio(): number
  requestFrame(callback: () => void): unknown
  cancelFrame(handle: unknown): void
  setTimer(callback: () => void, delayMs: number): unknown
  clearTimer(handle: unknown): void
  now(): number
}>

type PlaneRecord = {
  owner: Node
  runtime: DocumentPlaneRuntime
  order: number
  dirty: boolean
  tooltipDelayMs: number
}

type OverlayRecord = {
  owner: Node
  runtime: DocumentOverlayRuntime
  order: number
  dirty: boolean
  tooltipDelayMs: number
}

type WorldRecord = {
  owner: Space
  runtime: DocumentSpaceWorldRuntime
  order: number
  requestedViewport: DocumentSpaceWorldViewport | null
  logicalViewport: DocumentSpaceWorldViewport | null
  backingViewport: DocumentSpaceWorldViewport | null
  visible: boolean
  cameraGestures: boolean
  onResize: ((resize: DocumentSpaceWorldResize | null) => void) | null
  onDoubleClick: (() => void) | null
  resizeSignature: string | null
  disposed: boolean
}

type CapturedPlanePointer = {
  kind: "plane"
  planeRoot: Node
  input: PointerInput
}

type CapturedOverlayPointer = {
  kind: "overlay"
  overlayRoot: Node
  input: PointerInput
}

type CapturedCameraPointer = {
  kind: "camera"
  mode: "orbit" | "pan"
  pointerType: string
  clientX: number
  clientY: number
}

type CapturedWorldPointer = {
  kind: "world"
  worldSpace: Space
  mode: "orbit" | "pan" | null
  pointerType: string
  clientX: number
  clientY: number
}

type CapturedPointer =
  | CapturedPlanePointer
  | CapturedOverlayPointer
  | CapturedCameraPointer
  | CapturedWorldPointer

type PlaneHit = Readonly<{
  record: PlaneRecord
  intersection: RendererWebGpuDocumentPlaneIntersection
  hit: HitMetadata
}>

type OverlayHit = Readonly<{
  record: OverlayRecord
  point: Readonly<{x: number; y: number}>
  hit: HitMetadata
}>

const DEFAULT_VIEW_POINT = Object.freeze({
  position: Object.freeze({x: 0, y: -1_000, z: 0}),
  target: Object.freeze({x: 0, y: 0, z: 0}),
  fov: Math.PI / 4,
  near: 0.1,
  far: 5_000,
}) satisfies DocumentSpaceViewPointSnapshot

const defaultSeams = (): DocumentSpaceRuntimeSeams => Object.freeze({
  createEngineRenderer: () => new EngineRenderer(),
  initializeEngineRenderer: (renderer, canvas) => renderer.init(canvas),
  createSpace: () => new Space(),
  createViewPoint(canvas, snapshot) {
    const rect = canvas.getBoundingClientRect()
    const viewPoint = new ViewPoint({
      viewport: {
        left: rect.left,
        top: rect.top,
        width: rect.width > 0 ? rect.width : Math.max(1, canvas.clientWidth),
        height: rect.height > 0 ? rect.height : Math.max(1, canvas.clientHeight),
      },
      fov: snapshot.fov,
      near: snapshot.near,
      far: snapshot.far,
      position: snapshot.position,
      target: snapshot.target,
    })
    viewPoint.update()
    return viewPoint
  },
  createWorldViewPoint(snapshot, viewport) {
    const viewPoint = new ViewPoint({
      viewport: {
        left: viewport.x,
        top: viewport.y,
        width: viewport.width,
        height: viewport.height,
      },
      fov: snapshot.fov,
      near: snapshot.near,
      far: snapshot.far,
      position: snapshot.position,
      target: snapshot.target,
    })
    viewPoint.update()
    return viewPoint
  },
  createRaycaster: () => new Raycaster(),
  createNativeInputHost: (options) => createDocumentNativeInputHost(options),
  createPlaneRuntime: createDocumentPlaneRuntime,
  createOverlayRuntime: createDocumentOverlayRuntime,
  createResizeObserver(callback) {
    if (typeof ResizeObserver !== "function") throw new Error("ResizeObserver is unavailable")
    return new ResizeObserver(callback)
  },
  readCanvasRect(canvas) {
    const rect = canvas.getBoundingClientRect()
    return {left: rect.left, top: rect.top, width: rect.width, height: rect.height}
  },
  devicePixelRatio: () => globalThis.devicePixelRatio,
  requestFrame(callback) {
    if (typeof requestAnimationFrame !== "function") {
      throw new Error("requestAnimationFrame is unavailable")
    }
    return requestAnimationFrame(callback)
  },
  cancelFrame(handle) {
    if (typeof cancelAnimationFrame === "function" && typeof handle === "number") {
      cancelAnimationFrame(handle)
    }
  },
  setTimer: (callback, delayMs) => setTimeout(callback, delayMs),
  clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
  now: () => performance.now(),
})

/** Creates the one canvas/Document/Space host for one browser Experience. */
export async function createDocumentSpaceRuntime(
  options: CreateDocumentSpaceRuntimeOptions,
  claim?: PresentationHostClaim,
): Promise<DocumentSpaceRuntime> {
  return createDocumentSpaceRuntimeWithSeams(options, defaultSeams(), claim)
}

/** Internal exact-seam constructor for lifecycle and input tests. */
export async function createDocumentSpaceRuntimeWithSeams(
  options: CreateDocumentSpaceRuntimeOptions,
  seams: DocumentSpaceRuntimeSeams,
  claim?: PresentationHostClaim,
): Promise<DocumentSpaceRuntime> {
  validateOptions(options)
  const presentationHostClaim = claim ?? claimBrowserPresentationHost(options.canvas)
  try {
    return await createClaimedDocumentSpaceRuntime(options, seams, presentationHostClaim)
  } catch (error) {
    presentationHostClaim.release()
    throw error
  }
}

const createClaimedDocumentSpaceRuntime = async (
  options: CreateDocumentSpaceRuntimeOptions,
  seams: DocumentSpaceRuntimeSeams,
  presentationHostClaim: ReturnType<typeof claimBrowserPresentationHost>,
): Promise<DocumentSpaceRuntime> => {
  validateSeams(seams)
  const fixedPixelRatio = options.pixelRatio === undefined
    ? null
    : finitePositive(options.pixelRatio, "pixelRatio")
  const styleSheets = Object.freeze([...options.styleSheets])
  const initialViewPoint = validateViewPointSnapshot(options.viewPoint ?? DEFAULT_VIEW_POINT)
  const interactionState = createDocumentInteractionState(options.document)
  const engineRenderer = seams.createEngineRenderer()
  await seams.initializeEngineRenderer(engineRenderer, options.canvas)
  const space = seams.createSpace()
  const viewPoint = seams.createViewPoint(options.canvas, initialViewPoint)
  const raycaster = seams.createRaycaster()
  const records = new Map<Node, PlaneRecord>()
  const overlays = new Map<Node, OverlayRecord>()
  const worlds = new Map<Space, WorldRecord>()
  const projectionRoots = new Set<Node>()
  const captures = new Map<number, CapturedPointer>()
  const beforeRenderListeners = new Set<() => void>()
  const presentedListeners = new Set<(frame: number) => void>()
  let nextPlaneOrder = 0
  let nextOverlayOrder = 0
  let nextWorldOrder = 0
  let hoveredPlaneRoot: Node | null = null
  let activePlaneRoot: Node | null = null
  let hoveredOverlayRoot: Node | null = null
  let activeOverlayRoot: Node | null = null
  let hoveredWorldSpace: Space | null = null
  let activeWorldSpace: Space | null = null
  let canvasViewport: RenderViewport = Object.freeze({width: 1, height: 1})
  let currentPixelRatio = fixedPixelRatio ?? 1
  let cameraGesturesEnabled = options.cameraGestures === true
  let presentedFrames = 0
  let requestedFrame: unknown | null = null
  let tooltipTimer: unknown | null = null
  let tooltipOwner: Readonly<{kind: "plane" | "overlay"; owner: Node}> | null = null
  let resizeObserver: ResizeObserverOwner | null = null
  let rendering = false
  let preparing = false
  let renderRequestedDuringFrame = false
  let disposed = false

  const requestRender = (): void => {
    assertActive(disposed)
    if (rendering) {
      if (preparing) return
      renderRequestedDuringFrame = true
      return
    }
    if (requestedFrame !== null) return
    requestedFrame = seams.requestFrame(() => {
      requestedFrame = null
      if (!disposed) render()
    })
  }

  const cancelTooltipFrame = (
    owner?: Readonly<{kind: "plane" | "overlay"; owner: Node}>,
  ): void => {
    if (
      owner !== undefined &&
      (tooltipOwner?.kind !== owner.kind || tooltipOwner.owner !== owner.owner)
    ) return
    if (tooltipTimer !== null) seams.clearTimer(tooltipTimer)
    tooltipTimer = null
    tooltipOwner = null
  }

  const scheduleTooltipFrame = (
    owner: Readonly<{kind: "plane" | "overlay"; owner: Node}>,
    delayMs: number,
  ): void => {
    cancelTooltipFrame()
    tooltipOwner = owner
    tooltipTimer = seams.setTimer(() => {
      tooltipTimer = null
      const current = tooltipOwner
      tooltipOwner = null
      if (disposed || current === null) return
      const stillHovered = current.kind === "plane"
        ? hoveredPlaneRoot === current.owner
        : hoveredOverlayRoot === current.owner
      if (!stillHovered) return
      const record = current.kind === "plane"
        ? records.get(current.owner)
        : overlays.get(current.owner)
      if (record === undefined) return
      record.dirty = true
      requestRender()
    }, delayMs + 1)
  }

  let nativeInputHost: DocumentNativeInputHost
  try {
    nativeInputHost = seams.createNativeInputHost({
      requestFrame() {
        if (!disposed) requestRender()
      },
    })
  } catch (error) {
    throw error
  }

  const render = (): void => {
    assertActive(disposed)
    if (rendering) throw new Error("Document space render is already in progress")
    if (requestedFrame !== null) {
      seams.cancelFrame(requestedFrame)
      requestedFrame = null
    }
    rendering = true
    preparing = true
    renderRequestedDuringFrame = false
    try {
      for (const listener of [...beforeRenderListeners]) listener()
      for (const record of records.values()) {
        if (!record.dirty) continue
        record.dirty = false
        record.runtime.flush()
      }
      for (const record of overlays.values()) {
        if (!record.dirty) continue
        record.dirty = false
        record.runtime.flush()
      }
      viewPoint.update()
      for (const record of worlds.values()) {
        synchronizeWorldGeometry(record)
        if (record.visible && record.logicalViewport !== null) record.runtime.viewPoint.update()
      }
      engineRenderer.renderComposition({
        space,
        viewPoint,
        overlays: [...overlays.values()]
          .sort((left, right) => left.order - right.order)
          .map((record) => record.runtime.overlay),
        boundedViews: [...worlds.values()]
          .filter((record) => record.visible && record.backingViewport !== null)
          .sort((left, right) => left.order - right.order)
          .map((record) => Object.freeze({
            space: record.runtime.space,
            viewPoint: record.runtime.viewPoint,
            viewport: record.backingViewport!,
          })),
      })
      presentedFrames += 1
      preparing = false
      for (const listener of [...presentedListeners]) listener(presentedFrames)
    } finally {
      preparing = false
      rendering = false
    }
    if (
      renderRequestedDuringFrame ||
      [...records.values()].some(({dirty}) => dirty) ||
      [...overlays.values()].some(({dirty}) => dirty)
    ) {
      requestRender()
    }
  }

  const planeRoots = (): Iterable<Node> => records.keys()
  const overlayRoots = (): Iterable<Node> => overlays.keys()

  const getPlane = (owner: Node): DocumentPlaneRuntime | undefined =>
    records.get(owner)?.runtime

  const addPlane = (registration: DocumentSpacePlaneRegistration): DocumentPlaneRuntime => {
    assertActive(disposed)
    const owner = registration.root
    if (projectionRoots.has(owner)) {
      throw new Error(`Document space projection owner is already registered: ${owner}`)
    }
    validateProjectionRoot(options.document, registration.root)
    validateProjectionRootSeparation(projectionRoots, registration.root)
    const transform = validateTransform(registration.transform)
    const tooltipDelayMs = finiteNonNegative(registration.tooltipDelayMs ?? 500, "tooltipDelayMs")
    let record: PlaneRecord | null = null
    let requestedBeforeRegistration = false
    const runtime = seams.createPlaneRuntime({
      document: options.document,
      root: registration.root,
      ...(typeof engineRenderer.readImageSize !== "function" ? {} : {
        measureImage: (src: string, changed: () => void) => engineRenderer.readImageSize(src, changed),
      }),
      styleSheets,
      font: options.font,
      ...(options.fontFaces === undefined ? {} : {fontFaces: options.fontFaces}),
      viewport: registration.viewport,
      worldUnitsPerPixel: registration.worldUnitsPerPixel,
      interactionState,
      tooltipDelayMs,
      invalidateGeometry: (geometry) => engineRenderer.invalidateGeometry(geometry),
      requestFrame() {
        if (disposed) return
        if (nativeInputHost.document === options.document) nativeInputHost.synchronize()
        if (record === null) requestedBeforeRegistration = true
        else record.dirty = true
        requestRender()
      },
      requestPresentation() {
        if (!disposed && !rendering) requestRender()
      },
    })
    try {
      applyTransform(runtime, transform)
    } catch (error) {
      runtime.dispose()
      throw error
    }
    record = {
      owner,
      runtime,
      order: nextPlaneOrder++,
      dirty: requestedBeforeRegistration,
      tooltipDelayMs,
    }
    records.set(owner, record)
    projectionRoots.add(registration.root)
    space.add(runtime.plane)
    requestRender()
    return runtime
  }

  const updatePlane = (
    owner: Node,
    update: DocumentSpacePlaneUpdate,
  ): DocumentPlaneRuntime => {
    assertActive(disposed)
    const record = records.get(owner)
    if (record === undefined) throw new Error(`Unknown document space plane owner: ${owner}`)
    if (update === null || typeof update !== "object") throw new TypeError("Plane update is required")
    const transform = update.transform === undefined ? null : validateTransform(update.transform)
    const viewport = update.viewport ?? record.runtime.viewport
    const worldUnitsPerPixel = update.worldUnitsPerPixel ?? record.runtime.worldUnitsPerPixel
    if (update.viewport !== undefined || update.worldUnitsPerPixel !== undefined) {
      record.runtime.resize(viewport, worldUnitsPerPixel)
    }
    if (transform !== null) applyTransform(record.runtime, transform)
    if (record.runtime.plane.visible === false) {
      if (hoveredPlaneRoot === owner) clearHoveredPlane(null)
      cancelCapturedPlane(owner)
      if (nativeInputHost.owner === owner) nativeInputHost.setActiveRoot(null)
    }
    requestRender()
    return record.runtime
  }

  const removePlane = (owner: Node): boolean => {
    assertActive(disposed)
    const record = records.get(owner)
    if (record === undefined) return false
    cancelTooltipFrame({kind: "plane", owner})
    cancelCapturedPlane(owner)
    if (hoveredPlaneRoot === owner) hoveredPlaneRoot = null
    if (nativeInputHost.owner === owner) nativeInputHost.setActiveRoot(null)
    space.remove(record.runtime.plane)
    records.delete(owner)
    projectionRoots.delete(record.runtime.root)
    record.runtime.dispose()
    requestRender()
    return true
  }

  const getOverlay = (owner: Node): DocumentOverlayRuntime | undefined =>
    overlays.get(owner)?.runtime

  const addOverlay = (
    registration: DocumentSpaceOverlayRegistration,
  ): DocumentOverlayRuntime => {
    assertActive(disposed)
    const owner = registration.root
    if (projectionRoots.has(owner)) {
      throw new Error(`Document space projection owner is already registered: ${owner}`)
    }
    validateProjectionRoot(options.document, registration.root)
    validateProjectionRootSeparation(projectionRoots, registration.root)
    const tooltipDelayMs = finiteNonNegative(registration.tooltipDelayMs ?? 500, "tooltipDelayMs")
    let record: OverlayRecord | null = null
    let requestedBeforeRegistration = false
    const runtime = seams.createOverlayRuntime({
      document: options.document,
      root: registration.root,
      ...(typeof engineRenderer.readImageSize !== "function" ? {} : {
        measureImage: (src: string, changed: () => void) => engineRenderer.readImageSize(src, changed),
      }),
      styleSheets,
      font: options.font,
      ...(options.fontFaces === undefined ? {} : {fontFaces: options.fontFaces}),
      viewport: canvasViewport,
      interactionState,
      ...(registration.distance === undefined ? {} : {distance: registration.distance}),
      tooltipDelayMs,
      invalidateGeometry: (geometry) => engineRenderer.invalidateGeometry(geometry),
      requestFrame() {
        if (disposed) return
        if (nativeInputHost.document === options.document) nativeInputHost.synchronize()
        if (record === null) requestedBeforeRegistration = true
        else record.dirty = true
        requestRender()
      },
      requestPresentation() {
        if (!disposed && !rendering) requestRender()
      },
    })
    record = {
      owner,
      runtime,
      order: nextOverlayOrder++,
      dirty: requestedBeforeRegistration,
      tooltipDelayMs,
    }
    overlays.set(owner, record)
    projectionRoots.add(registration.root)
    space.add(runtime.overlay)
    requestRender()
    return runtime
  }

  const removeOverlay = (owner: Node): boolean => {
    assertActive(disposed)
    const record = overlays.get(owner)
    if (record === undefined) return false
    cancelTooltipFrame({kind: "overlay", owner})
    cancelCapturedOverlay(owner)
    if (hoveredOverlayRoot === owner) hoveredOverlayRoot = null
    if (nativeInputHost.owner === owner) nativeInputHost.setActiveRoot(null)
    space.remove(record.runtime.overlay)
    overlays.delete(owner)
    projectionRoots.delete(record.runtime.root)
    record.runtime.dispose()
    requestRender()
    return true
  }

  const worldSpaces = (): Iterable<Space> => worlds.keys()

  const getWorld = (owner: Space): DocumentSpaceWorldRuntime | undefined =>
    worlds.get(owner)?.runtime

  const resolveWorldGeometry = (
    requested: DocumentSpaceWorldViewport | null,
    visible: boolean,
  ): Readonly<{
    logicalViewport: DocumentSpaceWorldViewport | null
    backingViewport: DocumentSpaceWorldViewport | null
    clientViewport: DocumentSpaceWorldViewport
  }> => {
    const rect = seams.readCanvasRect(options.canvas)
    if (!visible || requested === null) {
      return Object.freeze({
        logicalViewport: null,
        backingViewport: null,
        clientViewport: Object.freeze({
          x: rect.left,
          y: rect.top,
          width: positiveExtent(rect.width),
          height: positiveExtent(rect.height),
        }),
      })
    }
    const left = clamp(requested.x, 0, canvasViewport.width)
    const top = clamp(requested.y, 0, canvasViewport.height)
    const right = clamp(requested.x + requested.width, left, canvasViewport.width)
    const bottom = clamp(requested.y + requested.height, top, canvasViewport.height)
    if (right <= left || bottom <= top) {
      return Object.freeze({
        logicalViewport: null,
        backingViewport: null,
        clientViewport: Object.freeze({
          x: rect.left,
          y: rect.top,
          width: positiveExtent(rect.width),
          height: positiveExtent(rect.height),
        }),
      })
    }
    const logicalViewport = Object.freeze({
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
    })
    const backingWidth = Math.max(1, Math.floor(canvasViewport.width * currentPixelRatio))
    const backingHeight = Math.max(1, Math.floor(canvasViewport.height * currentPixelRatio))
    const backingLeft = clamp(Math.floor(left * currentPixelRatio), 0, backingWidth)
    const backingTop = clamp(Math.floor(top * currentPixelRatio), 0, backingHeight)
    const backingRight = clamp(Math.ceil(right * currentPixelRatio), backingLeft, backingWidth)
    const backingBottom = clamp(Math.ceil(bottom * currentPixelRatio), backingTop, backingHeight)
    const backingViewport = Object.freeze({
      x: backingLeft,
      y: backingTop,
      width: backingRight - backingLeft,
      height: backingBottom - backingTop,
    })
    const scaleX = positiveExtent(rect.width) / canvasViewport.width
    const scaleY = positiveExtent(rect.height) / canvasViewport.height
    return Object.freeze({
      logicalViewport,
      backingViewport,
      clientViewport: Object.freeze({
        x: rect.left + left * scaleX,
        y: rect.top + top * scaleY,
        width: logicalViewport.width * scaleX,
        height: logicalViewport.height * scaleY,
      }),
    })
  }

  const synchronizeWorldGeometry = (record: WorldRecord): void => {
    const geometry = resolveWorldGeometry(record.requestedViewport, record.visible)
    record.logicalViewport = geometry.logicalViewport
    record.backingViewport = geometry.backingViewport
    record.runtime.viewPoint.setViewport({
      left: geometry.clientViewport.x,
      top: geometry.clientViewport.y,
      width: geometry.clientViewport.width,
      height: geometry.clientViewport.height,
    })
    const signature = geometry.logicalViewport === null || geometry.backingViewport === null
      ? "hidden"
      : [
          geometry.logicalViewport.x,
          geometry.logicalViewport.y,
          geometry.logicalViewport.width,
          geometry.logicalViewport.height,
          geometry.backingViewport.x,
          geometry.backingViewport.y,
          geometry.backingViewport.width,
          geometry.backingViewport.height,
          currentPixelRatio,
        ].join(":")
    if (record.resizeSignature === signature) return
    record.resizeSignature = signature
    if (record.onResize === null) return
    record.onResize(
      geometry.logicalViewport === null || geometry.backingViewport === null
        ? null
        : Object.freeze({
            logicalViewport: geometry.logicalViewport,
            backingViewport: geometry.backingViewport,
            pixelRatio: currentPixelRatio,
          }),
    )
  }

  const addWorld = (
    registration: DocumentSpaceWorldRegistration,
  ): DocumentSpaceWorldRuntime => {
    assertActive(disposed)
    if (registration === null || typeof registration !== "object") {
      throw new TypeError("Document space world registration is required")
    }
    const owner = registration.space
    if (worlds.has(owner)) {
      throw new Error(`Document space projection owner is already registered: ${owner}`)
    }
    if (!(registration.space instanceof Space)) {
      throw new TypeError("Document space world must be an exact Engine Space")
    }
    if (registration.space === space) throw new Error("Document space world cannot be the host Space")
    if (registration.space.parent !== null) {
      throw new Error("Document space world must be an unattached Engine Space")
    }
    const requestedViewport = validateWorldViewport(registration.viewport)
    const snapshot = validateViewPointSnapshot(registration.viewPoint)
    const visible = registration.visible ?? true
    const cameraGestures = registration.cameraGestures ?? true
    if (typeof visible !== "boolean") throw new TypeError("World visibility must be boolean")
    if (typeof cameraGestures !== "boolean") throw new TypeError("World cameraGestures must be boolean")
    if (registration.onResize !== undefined && typeof registration.onResize !== "function") {
      throw new TypeError("World onResize must be a function")
    }
    if (registration.onDoubleClick !== undefined && typeof registration.onDoubleClick !== "function") {
      throw new TypeError("World onDoubleClick must be a function")
    }
    const initialGeometry = resolveWorldGeometry(requestedViewport, visible)
    const worldViewPoint = seams.createWorldViewPoint(snapshot, initialGeometry.clientViewport)
    let record!: WorldRecord
    const runtime: DocumentSpaceWorldRuntime = Object.freeze({
      space: registration.space,
      viewPoint: worldViewPoint,
      get viewport() { return record.requestedViewport },
      get logicalViewport() { return record.logicalViewport },
      get backingViewport() { return record.backingViewport },
      get visible() { return record.visible },
      get cameraGesturesEnabled() { return record.cameraGestures },
      get disposed() { return record.disposed },
      requestRender() {
        if (record.disposed) throw new Error("Document space world is disposed")
        requestRender()
      },
      snapshotViewPoint() {
        if (record.disposed) throw new Error("Document space world is disposed")
        worldViewPoint.update()
        return viewPointSnapshot(worldViewPoint)
      },
      restoreViewPoint(value) {
        if (record.disposed) throw new Error("Document space world is disposed")
        applyViewPointSnapshot(worldViewPoint, validateViewPointSnapshot(value))
        requestRender()
      },
      dispose() {
        if (record.disposed || disposed) return
        removeWorld(owner)
      },
    })
    record = {
      owner,
      runtime,
      order: nextWorldOrder++,
      requestedViewport,
      logicalViewport: null,
      backingViewport: null,
      visible,
      cameraGestures,
      onResize: registration.onResize ?? null,
      onDoubleClick: registration.onDoubleClick ?? null,
      resizeSignature: null,
      disposed: false,
    }
    try {
      worlds.set(owner, record)

      space.add(registration.space)
      synchronizeWorldGeometry(record)
      requestRender()
      return runtime
    } catch (error) {
      worlds.delete(owner)

      space.remove(registration.space)
      record.disposed = true
      throw error
    }
  }

  const updateWorld = (
    owner: Space,
    update: DocumentSpaceWorldUpdate,
  ): DocumentSpaceWorldRuntime => {
    assertActive(disposed)

    const record = worlds.get(owner)
    if (record === undefined) throw new Error(`Unknown document space world owner: ${owner}`)
    if (update === null || typeof update !== "object") throw new TypeError("World update is required")
    if (update.viewport !== undefined) record.requestedViewport = validateWorldViewport(update.viewport)
    if (update.visible !== undefined) {
      if (typeof update.visible !== "boolean") throw new TypeError("World visibility must be boolean")
      record.visible = update.visible
    }
    if (update.cameraGestures !== undefined) {
      if (typeof update.cameraGestures !== "boolean") throw new TypeError("World cameraGestures must be boolean")
      record.cameraGestures = update.cameraGestures
      if (!record.cameraGestures) cancelCapturedWorld(owner)
    }
    if (update.viewPoint !== undefined) {
      applyViewPointSnapshot(record.runtime.viewPoint, validateViewPointSnapshot(update.viewPoint))
    }
    synchronizeWorldGeometry(record)
    if (!record.visible || record.logicalViewport === null) {
      if (hoveredWorldSpace === owner) hoveredWorldSpace = null
      cancelCapturedWorld(owner)
    }
    requestRender()
    return record.runtime
  }

  function removeWorld(owner: Space): boolean {
    assertActive(disposed)

    const record = worlds.get(owner)
    if (record === undefined) return false
    cancelCapturedWorld(owner)
    if (hoveredWorldSpace === owner) hoveredWorldSpace = null
    if (activeWorldSpace === owner) activeWorldSpace = null
    worlds.delete(owner)

    if (record.runtime.space.parent === space) space.remove(record.runtime.space)
    record.disposed = true
    requestRender()
    return true
  }

  const snapshotViewPoint = (): DocumentSpaceViewPointSnapshot => {
    assertActive(disposed)
    viewPoint.update()
    return viewPointSnapshot(viewPoint)
  }

  const restoreViewPoint = (snapshot: DocumentSpaceViewPointSnapshot): void => {
    assertActive(disposed)
    applyViewPointSnapshot(viewPoint, validateViewPointSnapshot(snapshot))
    requestRender()
  }

  const resize = (): void => {
    assertActive(disposed)
    const rect = seams.readCanvasRect(options.canvas)
    const width = positiveExtent(rect.width)
    const height = positiveExtent(rect.height)
    const nextViewport = Object.freeze({width, height})
    const pixelRatio = fixedPixelRatio ?? finitePositiveOrOne(seams.devicePixelRatio())
    currentPixelRatio = pixelRatio
    options.onViewportChange?.({width, height, left: rect.left, top: rect.top, dpr: pixelRatio})
    resizeCanvasBackingStore(options.canvas, width, height, pixelRatio)
    viewPoint.setViewport({
      left: rect.left,
      top: rect.top,
      width,
      height,
    })
    if (
      canvasViewport.width !== nextViewport.width ||
      canvasViewport.height !== nextViewport.height
    ) {
      canvasViewport = nextViewport
      for (const record of overlays.values()) {
        record.runtime.resize(canvasViewport)
        record.dirty = false
      }
    }
    for (const record of worlds.values()) synchronizeWorldGeometry(record)
    requestRender()
  }

  const localPointerInput = (
    event: PointerEvent,
    point: Readonly<{x: number; y: number}>,
  ): PointerInput => Object.freeze({
    clientX: point.x,
    clientY: point.y,
    pointerId: event.pointerId,
    pointerType: event.pointerType,
    button: event.button,
    buttons: event.buttons,
    pressure: event.pressure,
    isPrimary: event.isPrimary,
    timeStamp: event.timeStamp,
  })

  const localWheelInput = (
    event: WheelEvent,
    point: Readonly<{x: number; y: number}>,
  ): WheelInput => Object.freeze({
    clientX: point.x,
    clientY: point.y,
    deltaX: event.deltaX,
    deltaY: event.deltaY,
    deltaZ: event.deltaZ,
    deltaMode: event.deltaMode,
    ctrlKey: event.ctrlKey,
    shiftKey: event.shiftKey,
    altKey: event.altKey,
    metaKey: event.metaKey,
  })

  const overlayPoint = (
    clientX: number,
    clientY: number,
  ): Readonly<{x: number; y: number}> | null => {
    const rect = seams.readCanvasRect(options.canvas)
    if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height) || rect.width <= 0 || rect.height <= 0) {
      return null
    }
    return Object.freeze({
      x: (clientX - rect.left) * canvasViewport.width / rect.width,
      y: (clientY - rect.top) * canvasViewport.height / rect.height,
    })
  }

  const pickOverlay = (clientX: number, clientY: number): OverlayHit | null => {
    const point = overlayPoint(clientX, clientY)
    if (point === null) return null
    const ordered = [...overlays.values()].sort((left, right) => right.order - left.order)
    for (const record of ordered) {
      if (!record.runtime.overlay.visible || !record.runtime.overlay.content.visible) continue
      const frame = record.runtime.renderer.flush()
      const hit = hitTestProjection(frame, point.x, point.y)
      if (hit !== null) {
        return Object.freeze({record, point, hit})
      }
    }
    return null
  }

  const pickWorld = (clientX: number, clientY: number): WorldRecord | null => {
    const point = overlayPoint(clientX, clientY)
    if (point === null) return null
    const ordered = [...worlds.values()].sort((left, right) => right.order - left.order)
    for (const record of ordered) {
      const viewport = record.logicalViewport
      if (!record.visible || viewport === null) continue
      if (
        point.x >= viewport.x &&
        point.y >= viewport.y &&
        point.x < viewport.x + viewport.width &&
        point.y < viewport.y + viewport.height
      ) return record
    }
    return null
  }

  const prepareRay = (clientX: number, clientY: number): boolean => {
    const rect = seams.readCanvasRect(options.canvas)
    if (!Number.isFinite(rect.width) || !Number.isFinite(rect.height) || rect.width <= 0 || rect.height <= 0) {
      return false
    }
    viewPoint.update()
    raycaster.setFromCamera({
      x: ((clientX - rect.left) / rect.width) * 2 - 1,
      y: 1 - ((clientY - rect.top) / rect.height) * 2,
    }, viewPoint)
    return true
  }

  const pickPlane = (clientX: number, clientY: number): PlaneHit | null => {
    if (!prepareRay(clientX, clientY)) return null
    let best: PlaneHit | null = null
    for (const record of records.values()) {
      if (!record.runtime.plane.visible || !record.runtime.plane.content.visible) continue
      const intersection = record.runtime.plane.intersectRay(raycaster.ray)
      if (intersection === null || !intersection.inside) continue
      const frame = record.runtime.renderer.flush()
      const hit = hitTestProjection(frame, intersection.documentPoint.x, intersection.documentPoint.y)
      if (hit === null) continue
      if (
        best === null ||
        intersection.distance < best.intersection.distance ||
        (intersection.distance === best.intersection.distance && record.order < best.record.order)
      ) best = Object.freeze({record, intersection, hit})
    }
    return best
  }

  // Every uncaptured input uses one occlusion decision. Projection rectangles
  // alone never hide content. A capture keeps its owner until up/cancel.
  const pickInput = (clientX: number, clientY: number) => {
    const overlay = pickOverlay(clientX, clientY)
    const plane = overlay === null ? pickPlane(clientX, clientY) : null
    const world = overlay === null && plane === null ? pickWorld(clientX, clientY) : null
    return {overlay, plane, world}
  }

  const dispatchProjectedMouse = (
    type: "contextmenu" | "dblclick",
    event: MouseEvent,
    input: ReturnType<typeof pickInput>,
  ): boolean => {
    const target = input.overlay?.hit.node ?? input.plane?.hit.node ?? null
    const point = input.overlay?.point ?? input.plane?.intersection.documentPoint
    if (target === null || point === undefined) return false
    const accepted = target.dispatchEvent(new SemanticMouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX: point.x,
      clientY: point.y,
      button: event.button,
      buttons: event.buttons,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      detail: event.detail,
    }))
    if (!accepted && event.cancelable) event.preventDefault()
    requestRender()
    return true
  }

  const intersectRecord = (
    record: PlaneRecord,
    clientX: number,
    clientY: number,
  ): RendererWebGpuDocumentPlaneIntersection | null => {
    if (!prepareRay(clientX, clientY)) return null
    return record.runtime.plane.intersectRay(raycaster.ray)
  }

  const clearHoveredPlane = (event: PointerEvent | null): void => {
    if (hoveredPlaneRoot === null) return
    const previous = records.get(hoveredPlaneRoot)
    cancelTooltipFrame({kind: "plane", owner: hoveredPlaneRoot})
    hoveredPlaneRoot = null
    if (previous === undefined) return
    previous.runtime.pointerMove(Object.freeze({
      clientX: -1,
      clientY: -1,
      pointerId: event?.pointerId ?? 0,
      pointerType: event?.pointerType ?? "mouse",
      button: event?.button ?? 0,
      buttons: event?.buttons ?? 0,
      pressure: event?.pressure ?? 0,
      isPrimary: event?.isPrimary ?? true,
      timeStamp: event?.timeStamp ?? seams.now(),
    }))
  }

  const clearHoveredOverlay = (event: PointerEvent | null): void => {
    if (hoveredOverlayRoot === null) return
    const previous = overlays.get(hoveredOverlayRoot)
    cancelTooltipFrame({kind: "overlay", owner: hoveredOverlayRoot})
    hoveredOverlayRoot = null
    if (previous === undefined) return
    previous.runtime.pointerMove(Object.freeze({
      clientX: -1,
      clientY: -1,
      pointerId: event?.pointerId ?? 0,
      pointerType: event?.pointerType ?? "mouse",
      button: event?.button ?? 0,
      buttons: event?.buttons ?? 0,
      pressure: event?.pressure ?? 0,
      isPrimary: event?.isPrimary ?? true,
      timeStamp: event?.timeStamp ?? seams.now(),
    }))
  }

  const clearHoveredWorld = (): void => {
    hoveredWorldSpace = null
  }

  const refreshActiveOwners = (): void => {
    const last = [...captures.values()].at(-1)
    activePlaneRoot = last?.kind === "plane" ? last.planeRoot : null
    activeOverlayRoot = last?.kind === "overlay" ? last.overlayRoot : null
    activeWorldSpace = last?.kind === "world" ? last.worldSpace : null
  }

  const releasePointer = (pointerId: number): void => {
    if (options.canvas.hasPointerCapture?.(pointerId)) options.canvas.releasePointerCapture(pointerId)
    captures.delete(pointerId)
    refreshActiveOwners()
  }

  const cancelCapturedPointer = (pointerId: number): void => {
    const capture = captures.get(pointerId)
    if (capture === undefined) return
    if (capture.kind === "plane") {
      records.get(capture.planeRoot)?.runtime.pointerCancel(capture.input)
    } else if (capture.kind === "overlay") {
      overlays.get(capture.overlayRoot)?.runtime.pointerCancel(capture.input)
    }
    releasePointer(pointerId)
  }

  function cancelCapturedPlane(owner: Node): void {
    for (const [pointerId, capture] of [...captures]) {
      if (capture.kind === "plane" && capture.planeRoot === owner) cancelCapturedPointer(pointerId)
    }
  }

  function cancelCapturedOverlay(owner: Node): void {
    for (const [pointerId, capture] of [...captures]) {
      if (capture.kind === "overlay" && capture.overlayRoot === owner) cancelCapturedPointer(pointerId)
    }
  }

  function cancelCapturedWorld(owner: Space): void {
    for (const [pointerId, capture] of [...captures]) {
      if (capture.kind === "world" && capture.worldSpace === owner) releasePointer(pointerId)
    }
  }

  const setCameraGesturesEnabled = (enabled: boolean): void => {
    assertActive(disposed)
    if (typeof enabled !== "boolean") throw new TypeError("Camera gesture state must be boolean")
    if (cameraGesturesEnabled === enabled) return
    cameraGesturesEnabled = enabled
    if (enabled) return
    for (const [pointerId, capture] of [...captures]) {
      if (capture.kind === "camera") releasePointer(pointerId)
    }
  }

  const subscribePresented = (listener: (frame: number) => void): (() => void) => {
    assertActive(disposed)
    if (typeof listener !== "function") throw new TypeError("Presented frame listener must be a function")
    presentedListeners.add(listener)
    return () => presentedListeners.delete(listener)
  }

  const subscribeBeforeRender = (listener: () => void): (() => void) => {
    assertActive(disposed)
    if (typeof listener !== "function") throw new TypeError("Before-render listener must be a function")
    beforeRenderListeners.add(listener)
    return () => beforeRenderListeners.delete(listener)
  }

  const routeTouchCameraMove = (
    event: PointerEvent,
    capture: CapturedCameraPointer | CapturedWorldPointer,
  ): boolean => {
    if (event.pointerType !== "touch" || capture.pointerType !== "touch") return false
    const members = [...captures.entries()]
      .filter((entry): entry is [number, CapturedCameraPointer | CapturedWorldPointer] => {
        const other = entry[1]
        if (other.kind !== "camera" && other.kind !== "world") return false
        if (other.pointerType !== "touch") return false
        if (capture.kind === "camera") return other.kind === "camera"
        return other.kind === "world" && other.worldSpace === capture.worldSpace && other.mode !== null
      })
      .sort(([left], [right]) => left - right)
    const points = (): TouchCameraPoint[] => members.map(([pointerId, member]) => ({
      pointerId,
      clientX: member.clientX,
      clientY: member.clientY,
    }))
    const before = points()
    capture.clientX = event.clientX
    capture.clientY = event.clientY
    const after = points()
    const target = capture.kind === "camera"
      ? viewPoint
      : worlds.get(capture.worldSpace)?.runtime.viewPoint ?? null
    const applied = target !== null && applyTouchCameraGesture(target, before, after)
    if (event.cancelable) event.preventDefault()
    if (applied) requestRender()
    return true
  }

  const onPointerMove = (event: PointerEvent): void => {
    if (disposed) return
    const capture = captures.get(event.pointerId)
    if (capture !== undefined) {
      if (capture.kind === "camera") {
        if (routeTouchCameraMove(event, capture)) return
        const deltaX = event.clientX - capture.clientX
        const deltaY = event.clientY - capture.clientY
        capture.clientX = event.clientX
        capture.clientY = event.clientY
        if (capture.mode === "orbit") viewPoint.orbit(deltaX, deltaY)
        else viewPoint.pan(deltaX, deltaY)
        if (event.cancelable) event.preventDefault()
        requestRender()
        return
      }
      if (capture.kind === "world") {
        const record = worlds.get(capture.worldSpace)
        if (record === undefined || !record.visible || record.logicalViewport === null) {
          releasePointer(event.pointerId)
          return
        }
        if (capture.mode !== null && routeTouchCameraMove(event, capture)) return
        const deltaX = event.clientX - capture.clientX
        const deltaY = event.clientY - capture.clientY
        capture.clientX = event.clientX
        capture.clientY = event.clientY
        if (capture.mode === "orbit") record.runtime.viewPoint.orbit(deltaX, deltaY)
        else if (capture.mode === "pan") record.runtime.viewPoint.pan(deltaX, deltaY)
        hoveredWorldSpace = record.owner
        activeWorldSpace = record.owner
        if (capture.mode !== null) {
          if (event.cancelable) event.preventDefault()
          requestRender()
        }
        return
      }
      if (capture.kind === "overlay") {
        const record = overlays.get(capture.overlayRoot)
        const point = overlayPoint(event.clientX, event.clientY)
        if (record === undefined || point === null) {
          cancelCapturedPointer(event.pointerId)
          return
        }
        const input = localPointerInput(event, point)
        capture.input = input
        record.runtime.pointerMove(input)
        hoveredOverlayRoot = record.owner
        activeOverlayRoot = record.owner
        activeWorldSpace = null
        scheduleTooltipFrame({kind: "overlay", owner: record.owner}, record.tooltipDelayMs)
        return
      }
      const record = records.get(capture.planeRoot)
      if (record === undefined) {
        releasePointer(event.pointerId)
        return
      }
      const intersection = intersectRecord(record, event.clientX, event.clientY)
      if (intersection === null) {
        record.runtime.pointerCancel(capture.input)
        releasePointer(event.pointerId)
        if (hoveredPlaneRoot === record.owner) hoveredPlaneRoot = null
        return
      }
      const input = localPointerInput(event, intersection.documentPoint)
      capture.input = input
      record.runtime.pointerMove(input)
      hoveredPlaneRoot = record.owner
      activePlaneRoot = record.owner
      activeWorldSpace = null
      scheduleTooltipFrame({kind: "plane", owner: record.owner}, record.tooltipDelayMs)
      return
    }
    const {overlay: overlayHit, plane: hit, world} = pickInput(event.clientX, event.clientY)
    if (overlayHit?.record.owner !== hoveredOverlayRoot) clearHoveredOverlay(event)
    if (overlayHit !== null) {
      clearHoveredWorld()
      clearHoveredPlane(event)
      hoveredOverlayRoot = overlayHit.record.owner
      overlayHit.record.runtime.pointerMove(localPointerInput(event, overlayHit.point))
      scheduleTooltipFrame(
        {kind: "overlay", owner: overlayHit.record.owner},
        overlayHit.record.tooltipDelayMs,
      )
      return
    }
    if (world !== null) {
      clearHoveredOverlay(event)
      clearHoveredPlane(event)
      hoveredWorldSpace = world.owner
      return
    }
    clearHoveredWorld()
    if (hit?.record.owner !== hoveredPlaneRoot) clearHoveredPlane(event)
    if (hit === null) return
    hoveredPlaneRoot = hit.record.owner
    hit.record.runtime.pointerMove(localPointerInput(event, hit.intersection.documentPoint))
    scheduleTooltipFrame({kind: "plane", owner: hit.record.owner}, hit.record.tooltipDelayMs)
  }

  const onPointerDown = (event: PointerEvent): void => {
    if (disposed) return
    cancelTooltipFrame()
    cancelCapturedPointer(event.pointerId)
    const {overlay: overlayHit, plane: hit, world} = pickInput(event.clientX, event.clientY)
    if (overlayHit?.record.owner !== hoveredOverlayRoot) clearHoveredOverlay(event)
    if (overlayHit !== null) {
      clearHoveredWorld()
      clearHoveredPlane(event)
      hoveredOverlayRoot = overlayHit.record.owner
      const input = localPointerInput(event, overlayHit.point)
      const target = overlayHit.record.runtime.pointerDown(input)
      if (target === null) {
        nativeInputHost.setActiveRoot(null)
        return
      }
      nativeInputHost.setActiveRoot(overlayHit.record.owner)
      nativeInputHost.synchronize()
      if (event.cancelable) event.preventDefault()
      options.canvas.setPointerCapture?.(event.pointerId)
      captures.set(event.pointerId, {
        kind: "overlay",
        overlayRoot: overlayHit.record.owner,
        input,
      })
      activeOverlayRoot = overlayHit.record.owner
      activePlaneRoot = null
      activeWorldSpace = null
      return
    }
    if (world !== null) {
      clearHoveredOverlay(event)
      clearHoveredPlane(event)
      hoveredWorldSpace = world.owner
      nativeInputHost.setActiveRoot(null)
      const mode = world.cameraGestures
        ? event.button === 2
          ? "pan"
          : event.button === 0
            ? "orbit"
            : null
        : null
      if (event.cancelable) event.preventDefault()
      options.canvas.setPointerCapture?.(event.pointerId)
      captures.set(event.pointerId, {
        kind: "world",
        worldSpace: world.owner,
        mode,
        pointerType: event.pointerType,
        clientX: event.clientX,
        clientY: event.clientY,
      })
      activeWorldSpace = world.owner
      activePlaneRoot = null
      activeOverlayRoot = null
      return
    }
    clearHoveredWorld()
    if (hit?.record.owner !== hoveredPlaneRoot) clearHoveredPlane(event)
    const cameraMode = cameraGesturesEnabled && hit === null
      ? event.button === 2
        ? "pan"
        : event.button === 0
          ? "orbit"
          : null
      : null
    if (cameraMode !== null) {
      clearHoveredOverlay(event)
      clearHoveredPlane(event)
      nativeInputHost.setActiveRoot(null)
      if (event.cancelable) event.preventDefault()
      options.canvas.setPointerCapture?.(event.pointerId)
      captures.set(event.pointerId, {
        kind: "camera",
        mode: cameraMode,
        pointerType: event.pointerType,
        clientX: event.clientX,
        clientY: event.clientY,
      })
      activePlaneRoot = null
      activeOverlayRoot = null
      activeWorldSpace = null
      return
    }
    if (hit === null) {
      nativeInputHost.setActiveRoot(null)
      return
    }
    hoveredPlaneRoot = hit.record.owner
    const input = localPointerInput(event, hit.intersection.documentPoint)
    const target = hit.record.runtime.pointerDown(input)
    if (target === null) {
      nativeInputHost.setActiveRoot(null)
      return
    }
    nativeInputHost.setActiveRoot(hit.record.owner)
    nativeInputHost.synchronize()
    if (event.cancelable) event.preventDefault()
    options.canvas.setPointerCapture?.(event.pointerId)
    captures.set(event.pointerId, {kind: "plane", planeRoot: hit.record.owner, input})
    activePlaneRoot = hit.record.owner
    activeOverlayRoot = null
    activeWorldSpace = null
  }

  const onPointerUp = (event: PointerEvent): void => {
    if (disposed) return
    const capture = captures.get(event.pointerId)
    if (capture === undefined) return
    if (capture.kind === "camera") {
      releasePointer(event.pointerId)
      return
    }
    if (capture.kind === "world") {
      releasePointer(event.pointerId)
      return
    }
    if (capture.kind === "overlay") {
      const record = overlays.get(capture.overlayRoot)
      const point = overlayPoint(event.clientX, event.clientY)
      if (record === undefined || point === null) {
        cancelCapturedPointer(event.pointerId)
        return
      }
      record.runtime.pointerUp(localPointerInput(event, point))
      releasePointer(event.pointerId)
      return
    }
    const record = records.get(capture.planeRoot)
    if (record === undefined) {
      releasePointer(event.pointerId)
      return
    }
    const intersection = intersectRecord(record, event.clientX, event.clientY)
    if (intersection === null) record.runtime.pointerCancel(capture.input)
    else record.runtime.pointerUp(localPointerInput(event, intersection.documentPoint))
    releasePointer(event.pointerId)
  }

  const onPointerCancel = (event: PointerEvent): void => {
    if (disposed) return
    cancelCapturedPointer(event.pointerId)
  }

  const onPointerLeave = (event: PointerEvent): void => {
    if (disposed || captures.has(event.pointerId)) return
    clearHoveredOverlay(event)
    clearHoveredWorld()
    clearHoveredPlane(event)
  }

  const onWheel = (event: WheelEvent): void => {
    if (disposed) return
    const {overlay, plane, world} = pickInput(event.clientX, event.clientY)
    if (overlay !== null) {
      const target = overlay.record.runtime.wheel(localWheelInput(event, overlay.point))
      if (target !== null && event.cancelable) event.preventDefault()
      return
    }
    if (plane !== null) {
      const target = plane.record.runtime.wheel(localWheelInput(event, plane.intersection.documentPoint))
      if (target !== null && event.cancelable) event.preventDefault()
      return
    }
    if (world !== null) {
      if (!world.cameraGestures) return
      routeCameraWheel(world.runtime.viewPoint, event, world.logicalViewport?.height ?? canvasViewport.height)
    } else {
      if (!cameraGesturesEnabled) return
      routeCameraWheel(viewPoint, event, canvasViewport.height)
    }
    if (event.cancelable) event.preventDefault()
    requestRender()
  }

  const onContextMenu = (event: MouseEvent): void => {
    if (disposed) return
    const input = pickInput(event.clientX, event.clientY)
    if (dispatchProjectedMouse("contextmenu", event, input)) return
    const {world} = input
    if ((world?.cameraGestures === true || world === null && cameraGesturesEnabled) && event.cancelable) {
      event.preventDefault()
    }
  }

  const onDoubleClick = (event: MouseEvent): void => {
    if (disposed) return
    const input = pickInput(event.clientX, event.clientY)
    if (dispatchProjectedMouse("dblclick", event, input)) return
    const {world} = input
    if (world === null || world.onDoubleClick === null) return
    world.onDoubleClick()
    requestRender()
  }

  const releaseTouchCameraSurface = claimTouchCameraSurface(options.canvas)

  options.canvas.addEventListener("pointermove", onPointerMove)
  options.canvas.addEventListener("pointerdown", onPointerDown)
  options.canvas.addEventListener("pointerup", onPointerUp)
  options.canvas.addEventListener("pointercancel", onPointerCancel)
  options.canvas.addEventListener("pointerleave", onPointerLeave)
  options.canvas.addEventListener("wheel", onWheel, {passive: false})
  options.canvas.addEventListener("contextmenu", onContextMenu)
  options.canvas.addEventListener("dblclick", onDoubleClick)

  const runtime: DocumentSpaceRuntime = Object.freeze({
    canvas: options.canvas,
    document: options.document,
    styleSheets,
    font: options.font,
    ...(options.fontFaces === undefined ? {} : {fontFaces: options.fontFaces}),
    interactionState,
    engineRenderer,
    space,
    viewPoint,
    raycaster,
    nativeInputHost,
    nativeInput: nativeInputHost.nativeInput,
    nativeTextArea: nativeInputHost.nativeTextArea,
    get inputTarget() { return nativeInputHost.inputTarget },
    get activeInputRoot() {
      return nativeInputHost.inputTarget === null ? null : nativeInputHost.owner
    },
    get planeRoots() { return planeRoots() },
    get overlayRoots() { return overlayRoots() },
    get worldSpaces() { return worldSpaces() },
    get activePlaneRoot() { return activePlaneRoot },
    get hoveredPlaneRoot() { return hoveredPlaneRoot },
    get activeOverlayRoot() { return activeOverlayRoot },
    get hoveredOverlayRoot() { return hoveredOverlayRoot },
    get activeWorldSpace() { return activeWorldSpace },
    get hoveredWorldSpace() { return hoveredWorldSpace },
    get cameraGesturesEnabled() { return cameraGesturesEnabled },
    get presentedFrames() { return presentedFrames },
    get disposed() { return disposed },
    addPlane,
    getPlane,
    updatePlane,
    removePlane,
    addOverlay,
    getOverlay,
    removeOverlay,
    addWorld,
    getWorld,
    updateWorld,
    removeWorld,
    render,
    requestRender,
    resize,
    captureLastPresentedFramePng: () => {
      assertActive(disposed)
      return engineRenderer.captureLastPresentedFramePng()
    },
    snapshotViewPoint,
    restoreViewPoint,
    setCameraGesturesEnabled,
    dispatchPointer(type, input) {
      assertActive(disposed)
      const event = {
        ...input,
        pointerId: input.pointerId ?? 1,
        pointerType: input.pointerType ?? "mouse",
        button: input.button ?? 0,
        buttons: input.buttons ?? (type === "pointerdown" ? 1 : 0),
        pressure: input.pressure ?? 0,
        isPrimary: input.isPrimary ?? true,
        timeStamp: input.timeStamp ?? seams.now(),
        cancelable: true,
        preventDefault() {},
      } as PointerEvent
      if (type === "pointermove") onPointerMove(event)
      else if (type === "pointerdown") onPointerDown(event)
      else if (type === "pointerup") onPointerUp(event)
      else onPointerCancel(event)
    },
    dispatchWheel(input) {
      assertActive(disposed)
      onWheel({
        ...input,
        deltaX: input.deltaX ?? 0,
        deltaY: input.deltaY ?? 0,
        deltaZ: input.deltaZ ?? 0,
        deltaMode: input.deltaMode ?? 0,
        cancelable: true,
        preventDefault() {},
      } as WheelEvent)
    },
    projectPoint(owner, point) {
      assertActive(disposed)
      const rect = seams.readCanvasRect(options.canvas)
      const overlay = overlays.get(owner)?.runtime
      if (overlay !== undefined) {
        if (!overlay.overlay.visible || !overlay.overlay.content.visible) return null
        return {
          x: rect.left + point.x * rect.width / canvasViewport.width,
          y: rect.top + point.y * rect.height / canvasViewport.height,
        }
      }
      const plane = records.get(owner)?.runtime.plane
      if (plane === undefined || !plane.visible || !plane.content.visible) return null
      viewPoint.update()
      const view = plane.documentPointToWorld(point).applyMatrix4(viewPoint.viewMatrix)
      if (-view.z < viewPoint.near || -view.z > viewPoint.far) return null
      const projected = view.applyMatrix4(viewPoint.projectionMatrix)
      return {
        x: rect.left + (projected.x + 1) * rect.width / 2,
        y: rect.top + (1 - projected.y) * rect.height / 2,
      }
    },
    subscribeBeforeRender,
    subscribePresented,
    dispose() {
      if (disposed) return
      disposed = true
      if (requestedFrame !== null) seams.cancelFrame(requestedFrame)
      requestedFrame = null
      cancelTooltipFrame()
      resizeObserver?.disconnect()
      resizeObserver = null
      options.canvas.removeEventListener("pointermove", onPointerMove)
      options.canvas.removeEventListener("pointerdown", onPointerDown)
      options.canvas.removeEventListener("pointerup", onPointerUp)
      options.canvas.removeEventListener("pointercancel", onPointerCancel)
      options.canvas.removeEventListener("pointerleave", onPointerLeave)
      options.canvas.removeEventListener("wheel", onWheel)
      options.canvas.removeEventListener("contextmenu", onContextMenu)
      options.canvas.removeEventListener("dblclick", onDoubleClick)
      releaseTouchCameraSurface()
      for (const pointerId of [...captures.keys()]) cancelCapturedPointer(pointerId)
      hoveredPlaneRoot = null
      activePlaneRoot = null
      hoveredOverlayRoot = null
      activeOverlayRoot = null
      hoveredWorldSpace = null
      activeWorldSpace = null
      nativeInputHost.setActiveRoot(null)
      nativeInputHost.dispose()
      for (const record of records.values()) {
        space.remove(record.runtime.plane)
        record.runtime.dispose()
      }
      records.clear()
      for (const record of overlays.values()) {
        space.remove(record.runtime.overlay)
        record.runtime.dispose()
      }
      overlays.clear()
      for (const record of worlds.values()) {
        if (record.runtime.space.parent === space) space.remove(record.runtime.space)
        record.disposed = true
      }
      worlds.clear()

      projectionRoots.clear()
      beforeRenderListeners.clear()
      presentedListeners.clear()
      presentationHostClaim.release()
    },
  })

  try {
    resizeObserver = seams.createResizeObserver(() => {
      if (!disposed) resize()
    })
    resizeObserver.observe(options.canvas)
    resize()
    render()
    return runtime
  } catch (error) {
    runtime.dispose()
    throw error
  }
}

const validateOptions = (options: CreateDocumentSpaceRuntimeOptions): void => {
  if (options === null || typeof options !== "object") throw new TypeError("Runtime options are required")
  if (
    options.canvas === null ||
    typeof options.canvas !== "object" ||
    typeof options.canvas.addEventListener !== "function" ||
    typeof options.canvas.getBoundingClientRect !== "function"
  ) throw new TypeError("canvas must be an HTMLCanvasElement-compatible owner")
  if (options.document === null || typeof options.document !== "object" || options.document.nodeType !== 9) {
    throw new TypeError("document must be a semantic Document")
  }
  if (!Array.isArray(options.styleSheets) || options.styleSheets.some((sheet) => typeof sheet !== "string")) {
    throw new TypeError("styleSheets must be an array of CSS strings")
  }
  if (options.font === null || typeof options.font !== "object") {
    throw new TypeError("font is required")
  }
  if (options.pixelRatio !== undefined) finitePositive(options.pixelRatio, "pixelRatio")
  if (options.viewPoint !== undefined) validateViewPointSnapshot(options.viewPoint)
  if (options.cameraGestures !== undefined && typeof options.cameraGestures !== "boolean") {
    throw new TypeError("cameraGestures must be boolean")
  }
}

const validateProjectionRoot = (document: Document, root: Node): void => {
  if (
    root === null ||
    typeof root !== "object" ||
    !Number.isInteger(root.nodeType) ||
    typeof root.getRootNode !== "function"
  ) {
    throw new TypeError("Document space projection root must be a semantic Node")
  }
  if (root !== document && root.ownerDocument !== document) {
    throw new TypeError("Document space projection root belongs to another Document")
  }
  if (root !== document && root.getRootNode() !== document) {
    throw new TypeError("Document space projection root must belong to the connected Experience tree")
  }
}

const validateProjectionRootSeparation = (
  roots: ReadonlySet<Node>,
  root: Node,
): void => {
  for (const registered of roots) {
    if (registered.parentNode !== null && registered.parentNode === root.parentNode) continue
    if (registered.contains(root) || root.contains(registered)) {
      throw new Error("Document space projection roots overlap")
    }
  }
}

const validateSeams = (seams: DocumentSpaceRuntimeSeams): void => {
  if (seams === null || typeof seams !== "object") throw new TypeError("Runtime seams are required")
  for (const name of [
    "createEngineRenderer",
    "initializeEngineRenderer",
    "createSpace",
    "createViewPoint",
    "createWorldViewPoint",
    "createRaycaster",
    "createNativeInputHost",
    "createPlaneRuntime",
    "createOverlayRuntime",
    "createResizeObserver",
    "readCanvasRect",
    "devicePixelRatio",
    "requestFrame",
    "cancelFrame",
    "setTimer",
    "clearTimer",
    "now",
  ] as const) {
    if (typeof seams[name] !== "function") throw new TypeError(`Runtime seam ${name} must be a function`)
  }
}

const validateWorldViewport = (
  value: DocumentSpaceWorldViewport | null,
): DocumentSpaceWorldViewport | null => {
  if (value === null) return null
  if (
    typeof value !== "object" ||
    !Number.isFinite(value.x) ||
    !Number.isFinite(value.y) ||
    !Number.isFinite(value.width) ||
    !Number.isFinite(value.height) ||
    value.width < 0 ||
    value.height < 0
  ) throw new RangeError("World viewport must have finite coordinates and non-negative extents")
  return Object.freeze({x: value.x, y: value.y, width: value.width, height: value.height})
}

type ResolvedTransform = Readonly<{
  position: DocumentSpaceVector3 | null
  quaternion: DocumentSpaceQuaternion | null
  scale: DocumentSpaceVector3 | null
  visible: boolean | null
}>

const validateTransform = (
  value: DocumentSpacePlaneTransform | undefined,
): ResolvedTransform => {
  if (value === undefined) {
    return Object.freeze({position: null, quaternion: null, scale: null, visible: null})
  }
  if (value === null || typeof value !== "object") throw new TypeError("Plane transform must be an object")
  const position = value.position === undefined ? null : validateVector(value.position, "position", false)
  const scale = value.scale === undefined ? null : validateVector(value.scale, "scale", true)
  const quaternion = value.quaternion === undefined ? null : validateQuaternion(value.quaternion)
  if (value.visible !== undefined && typeof value.visible !== "boolean") {
    throw new TypeError("Plane transform visible must be boolean")
  }
  return Object.freeze({
    position,
    quaternion,
    scale,
    visible: value.visible ?? null,
  })
}

const applyTransform = (
  runtime: DocumentPlaneRuntime,
  transform: ResolvedTransform,
): void => {
  if (transform.position !== null) {
    runtime.plane.position.set(transform.position.x, transform.position.y, transform.position.z)
  }
  if (transform.quaternion !== null) {
    runtime.plane.quaternion.set(
      transform.quaternion.x,
      transform.quaternion.y,
      transform.quaternion.z,
      transform.quaternion.w,
    ).normalize()
  }
  if (transform.scale !== null) {
    runtime.plane.scale.set(transform.scale.x, transform.scale.y, transform.scale.z)
  }
  if (transform.visible !== null) runtime.plane.visible = transform.visible
  runtime.plane.updateMatrix()
}

const validateVector = (
  value: DocumentSpaceVector3,
  label: string,
  nonZero: boolean,
): DocumentSpaceVector3 => {
  if (
    value === null ||
    typeof value !== "object" ||
    !Number.isFinite(value.x) ||
    !Number.isFinite(value.y) ||
    !Number.isFinite(value.z)
  ) throw new RangeError(`Plane transform ${label} must be finite`)
  if (nonZero && (value.x === 0 || value.y === 0 || value.z === 0)) {
    throw new RangeError("Plane transform scale axes must be non-zero")
  }
  return Object.freeze({x: value.x, y: value.y, z: value.z})
}

const validateQuaternion = (value: DocumentSpaceQuaternion): DocumentSpaceQuaternion => {
  if (
    value === null ||
    typeof value !== "object" ||
    !Number.isFinite(value.x) ||
    !Number.isFinite(value.y) ||
    !Number.isFinite(value.z) ||
    !Number.isFinite(value.w) ||
    Math.hypot(value.x, value.y, value.z, value.w) === 0
  ) throw new RangeError("Plane transform quaternion must be finite and non-zero")
  return Object.freeze({x: value.x, y: value.y, z: value.z, w: value.w})
}

const validateViewPointSnapshot = (
  value: DocumentSpaceViewPointSnapshot,
): DocumentSpaceViewPointSnapshot => {
  if (value === null || typeof value !== "object") throw new TypeError("ViewPoint snapshot is required")
  const position = validateSnapshotVector(value.position, "position")
  const target = validateSnapshotVector(value.target, "target")
  if (distance(position, target) === 0) throw new RangeError("ViewPoint position and target must differ")
  if (!Number.isFinite(value.fov) || value.fov <= 0 || value.fov >= Math.PI) {
    throw new RangeError("ViewPoint fov must be between zero and pi")
  }
  if (!Number.isFinite(value.near) || value.near <= 0) throw new RangeError("ViewPoint near must be positive")
  if (!Number.isFinite(value.far) || value.far <= value.near) throw new RangeError("ViewPoint far must exceed near")
  return Object.freeze({position, target, fov: value.fov, near: value.near, far: value.far})
}

const validateSnapshotVector = (value: DocumentSpaceVector3, label: string): DocumentSpaceVector3 => {
  if (
    value === null ||
    typeof value !== "object" ||
    !Number.isFinite(value.x) ||
    !Number.isFinite(value.y) ||
    !Number.isFinite(value.z)
  ) throw new RangeError(`ViewPoint ${label} must be finite`)
  return Object.freeze({x: value.x, y: value.y, z: value.z})
}

const applyViewPointSnapshot = (
  viewPoint: ViewPoint,
  snapshot: DocumentSpaceViewPointSnapshot,
): void => {
  viewPoint.position.set(snapshot.position.x, snapshot.position.y, snapshot.position.z)
  viewPoint.getTarget().set(snapshot.target.x, snapshot.target.y, snapshot.target.z)
  viewPoint.fov = snapshot.fov
  viewPoint.near = snapshot.near
  viewPoint.far = snapshot.far
  viewPoint.updateProjectionMatrix()
  viewPoint.update()
}

const viewPointSnapshot = (viewPoint: ViewPoint): DocumentSpaceViewPointSnapshot =>
  validateViewPointSnapshot({
    position: {x: viewPoint.position.x, y: viewPoint.position.y, z: viewPoint.position.z},
    target: {x: viewPoint.getTarget().x, y: viewPoint.getTarget().y, z: viewPoint.getTarget().z},
    fov: viewPoint.fov,
    near: viewPoint.near,
    far: viewPoint.far,
  })

const distance = (left: DocumentSpaceVector3, right: DocumentSpaceVector3): number =>
  Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z)

const positiveExtent = (value: number): number =>
  Number.isFinite(value) && value > 0 ? Math.max(1, Math.round(value)) : 1

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value))

const finitePositiveOrOne = (value: number): number =>
  Number.isFinite(value) && value > 0 ? value : 1

const finitePositive = (value: number, label: string): number => {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${label} must be finite and positive`)
  return value
}

const finiteNonNegative = (value: number, label: string): number => {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${label} must be finite and non-negative`)
  return value
}

const routeCameraWheel = (
  viewPoint: ViewPoint,
  event: WheelEvent,
  viewportHeight: number,
): void => {
  if (event.ctrlKey) {
    const deltaY = wheelDeltaPixels(event.deltaY, event.deltaMode, viewportHeight)
    const delta = Math.abs(deltaY) >= 0.01
      ? deltaY
      : wheelDeltaPixels(event.deltaX, event.deltaMode, viewportHeight)
    viewPoint.zoom(-delta, {clientX: event.clientX, clientY: event.clientY})
    return
  }
  viewPoint.pan(event.deltaX, event.deltaY)
}

const wheelDeltaPixels = (
  delta: number,
  mode: number,
  viewportHeight: number,
): number => {
  if (!Number.isFinite(delta) || delta === 0) return 0
  if (mode === 1) return delta * 40
  if (mode === 2) return delta * viewportHeight
  return delta
}

const assertActive = (disposed: boolean): void => {
  if (disposed) throw new Error("Document space runtime is disposed")
}
