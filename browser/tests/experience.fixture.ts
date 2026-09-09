import {component} from "../../component/src/index.ts"
import {defineCompiledTemplate} from "../../template/compiled.ts"
import {HTMLElement as SemanticHTMLElement, type Element as SemanticElement, type Node as SemanticNode} from "../../dom/src/index.ts"
import {BufferGeometry, Space, Vector3, ViewPoint} from "../../engine/src/index.ts"
import type {PointerInput, RenderFrame, WheelInput} from "../../renderer/html/src/index.ts"
import {attachWithRuntimeFactory, type PresentationOptions} from "../src/attach.ts"
import type {CreateDocumentSpaceRuntimeOptions, DocumentSpaceOverlayRegistration, DocumentSpacePlaneRegistration, DocumentSpacePlaneUpdate, DocumentSpaceRuntime, DocumentSpaceViewPointSnapshot} from "../src/space-runtime.ts"
import type {DocumentOverlayRuntime} from "../src/overlay-runtime.ts"
import type {DocumentPlaneRuntime} from "../src/plane-runtime.ts"

export const testApp = defineCompiledTemplate({
  displayName: "TestApp",
  bindingCount: 0,
  mount(document) {
    const space = document.createElement("space")
    space.append(document.createElement("viewpoint"))
    return {nodes: [space], bindings: []}
  },
  render() {},
})

export const attachFixture = (
  options: Omit<PresentationOptions, "app">,
  factory: Parameters<typeof attachWithRuntimeFactory>[1],
  seams?: Parameters<typeof attachWithRuntimeFactory>[2],
) => attachWithRuntimeFactory({...options, app: component(testApp, {})}, factory, seams)

type FakeRuntimeState = {
  factoryCalls: number
  requestedFrames: number
  renderedFrames: number
  presentedFrames: number
  resizeCalls: number
  restoreCalls: number
  disposed: boolean
  snapshot: DocumentSpaceViewPointSnapshot
  presented: ((sequence: number) => void) | null
  requestedFrame: (() => void) | null
  beforeRender: Set<() => void>
  projectionSubscribers: Map<SemanticNode, Set<(frame: RenderFrame) => void>>
  projectionInputs: Array<Readonly<{owner: SemanticNode | "input"; type: string; input: PointerInput | WheelInput}>>
  pointerTarget: SemanticElement | null
  nativeOwner: SemanticNode | null
  nativeTarget: SemanticHTMLElement | null
  keyInputs: unknown[]
  lifecycle: string[]
  space: Space | null
  viewPoint: ViewPoint | null
  invalidated: BufferGeometry[]
  planes: Map<SemanticNode, DocumentPlaneRuntime>
  overlays: Map<SemanticNode, DocumentOverlayRuntime>
}

export const createFakeRuntimeState = (): FakeRuntimeState => ({
  factoryCalls: 0,
  requestedFrames: 0,
  renderedFrames: 0,
  presentedFrames: 0,
  resizeCalls: 0,
  restoreCalls: 0,
  disposed: false,
  snapshot: {
    position: {x: 0, y: 0, z: 1},
    target: {x: 0, y: 0, z: 0},
    fov: 1,
    near: 0.1,
    far: 1000,
  },
  presented: null,
  requestedFrame: null,
  beforeRender: new Set(),
  projectionSubscribers: new Map(),
  projectionInputs: [],
  pointerTarget: null,
  nativeOwner: null,
  nativeTarget: null,
  keyInputs: [],
  lifecycle: [],
  space: null,
  viewPoint: null,
  invalidated: [],
  planes: new Map(),
  overlays: new Map(),
})

const createFakeFrame = (
  options: Readonly<{
    document: CreateDocumentSpaceRuntimeOptions["document"]
    root: SemanticNode
    viewport: Readonly<{width: number; height: number}>
  }>,
): RenderFrame => Object.freeze({
  revision: 1,
  document: options.document,
  root: options.root,
  viewport: options.viewport,
  boxes: Object.freeze([]),
  boxByNode: new Map(),
  displayList: Object.freeze([]),
  hits: new Map(),
  scrolls: new Map(),
})

export const presentFakeFrame = (state: FakeRuntimeState): void => {
  state.presentedFrames += 1
  state.presented?.(state.presentedFrames)
}

export const createFakeRuntime = (
  options: CreateDocumentSpaceRuntimeOptions,
  state: FakeRuntimeState,
): DocumentSpaceRuntime => {
  state.lifecycle.push("runtime:create")
  const space = new Space()
  state.space = space
  const viewPoint = new ViewPoint({
    viewport: {left: 0, top: 0, width: 640, height: 360},
  })
  state.viewPoint = viewPoint
  const engineRenderer = {
    invalidateGeometry(geometry: BufferGeometry) {
      state.invalidated.push(geometry)
    },
  }
  const nativeInputHost = {
    nativeInput: {} as HTMLInputElement,
    nativeTextArea: {} as HTMLTextAreaElement,
    get document() {
      return state.nativeOwner === null ? null : options.document
    },
    get owner() {
      return state.nativeOwner
    },
    get inputTarget() {
      return state.nativeTarget
    },
    get activeProxy() {
      return state.nativeTarget === null ? null : "input"
    },
    setActiveRoot(owner: SemanticNode | null) {
      state.nativeOwner = owner
      const active = options.document.activeElement
      state.nativeTarget = owner !== null && active instanceof SemanticHTMLElement ? active : null
    },
    synchronize() {
      const active = options.document.activeElement
      state.nativeTarget = active instanceof SemanticHTMLElement ? active : null
    },
    dispatchKey(target: SemanticHTMLElement, input: unknown) {
      if (target !== state.nativeTarget) throw new Error("wrong native target")
      state.keyInputs.push(input)
      return true
    },
    blur() {
      state.nativeTarget = null
    },
    dispose() {
      state.nativeOwner = null
      state.nativeTarget = null
    },
  }

  let runtime: DocumentSpaceRuntime
  runtime = {
    canvas: options.canvas,
    document: options.document,
    styleSheets: options.styleSheets,
    font: options.font,
    engineRenderer,
    space,
    viewPoint,
    nativeInputHost,
    get planeRoots() {
      return Object.freeze([...state.planes.keys()])
    },
    get overlayRoots() {
      return Object.freeze([...state.overlays.keys()])
    },
    get worldSpaces() {
      return Object.freeze([])
    },
    get disposed() {
      return state.disposed
    },
    addPlane(registration: DocumentSpacePlaneRegistration) {
      const plane = {
        quaternion: {...registration.transform?.quaternion ?? {x: 0, y: 0, z: 0, w: 1}},
        position: new Vector3(
          registration.transform?.position?.x ?? 0,
          registration.transform?.position?.y ?? 0,
          registration.transform?.position?.z ?? 0,
        ),
        scale: new Vector3(
          registration.transform?.scale?.x ?? 1,
          registration.transform?.scale?.y ?? 1,
          registration.transform?.scale?.z ?? 1,
        ),
        visible: registration.transform?.visible ?? true,
      }
      const frame = createFakeFrame({
        document: options.document,
        root: registration.root,
        viewport: registration.viewport,
      })
      const subscribers = new Set<(frame: RenderFrame) => void>()
      state.projectionSubscribers.set(registration.root, subscribers)
      const route = (type: string, input: PointerInput | WheelInput): SemanticElement | null => {
        state.projectionInputs.push({owner: registration.root, type, input})
        if (type === "pointerdown" && state.pointerTarget instanceof SemanticHTMLElement) {
          state.pointerTarget.focus()
        }
        return state.pointerTarget
      }
      const runtime = {
        root: registration.root,
        viewport: registration.viewport,
        worldUnitsPerPixel: registration.worldUnitsPerPixel,
        worldUnitsPerPixelY: registration.worldUnitsPerPixelY ?? registration.worldUnitsPerPixel,
        rasterSize: registration.rasterSize,
        plane,
        frame,
        pointerDown: (input: PointerInput) => route("pointerdown", input),
        pointerMove: (input: PointerInput) => route("pointermove", input),
        pointerUp: (input: PointerInput) => route("pointerup", input),
        pointerCancel: (input: PointerInput) => {
          route("pointercancel", input)
        },
        wheel: (input: WheelInput) => route("wheel", input),
        subscribe(listener: (frame: RenderFrame) => void) {
          subscribers.add(listener)
          return () => subscribers.delete(listener)
        },
      } as unknown as DocumentPlaneRuntime
      state.planes.set(registration.root, runtime)
      return runtime
    },
    getPlane(id: SemanticNode) {
      return state.planes.get(id)
    },
    updatePlane(id: SemanticNode, update: DocumentSpacePlaneUpdate) {
      const held = state.planes.get(id)
      if (held === undefined) throw new Error(`Unknown fake plane: ${id}`)
      const mutable = held as unknown as {
        viewport: {width: number; height: number}
        worldUnitsPerPixel: number
        worldUnitsPerPixelY: number
        rasterSize?: {width: number; height: number}
        plane: {position: Vector3; scale: Vector3; visible: boolean; quaternion: {x: number; y: number; z: number; w: number}}
      }
      if (update.rasterSize !== undefined) mutable.rasterSize = update.rasterSize
      if (update.viewport !== undefined) mutable.viewport = update.viewport
      if (update.worldUnitsPerPixel !== undefined) {
        mutable.worldUnitsPerPixel = update.worldUnitsPerPixel
        if (update.worldUnitsPerPixelY === undefined) mutable.worldUnitsPerPixelY = update.worldUnitsPerPixel
      }
      if (update.worldUnitsPerPixelY !== undefined) mutable.worldUnitsPerPixelY = update.worldUnitsPerPixelY
      const transform = update.transform
      if (transform?.scale !== undefined) mutable.plane.scale.set(transform.scale.x, transform.scale.y, transform.scale.z)
      if (transform?.quaternion !== undefined) Object.assign(mutable.plane.quaternion, transform.quaternion)
      if (transform?.position !== undefined) {
        mutable.plane.position.set(
          transform.position.x,
          transform.position.y,
          transform.position.z,
        )
      }
      if (transform?.visible !== undefined) mutable.plane.visible = transform.visible
      return held
    },
    removePlane(id: SemanticNode) {
      state.projectionSubscribers.delete(id)
      return state.planes.delete(id)
    },
    addOverlay(registration: DocumentSpaceOverlayRegistration) {
      const viewport = {width: 640, height: 360}
      const frame = createFakeFrame({
        document: options.document,
        root: registration.root,
        viewport,
      })
      const subscribers = new Set<(frame: RenderFrame) => void>()
      state.projectionSubscribers.set(registration.root, subscribers)
      const route = (type: string, input: PointerInput | WheelInput): SemanticElement | null => {
        state.projectionInputs.push({owner: registration.root, type, input})
        if (type === "pointerdown" && state.pointerTarget instanceof SemanticHTMLElement) {
          state.pointerTarget.focus()
        }
        return state.pointerTarget
      }
      const runtime = {
        root: registration.root,
        overlay: {distance: registration.distance ?? 600},
        viewport,
        frame,
        pointerDown: (input: PointerInput) => route("pointerdown", input),
        pointerMove: (input: PointerInput) => route("pointermove", input),
        pointerUp: (input: PointerInput) => route("pointerup", input),
        pointerCancel: (input: PointerInput) => {
          route("pointercancel", input)
        },
        wheel: (input: WheelInput) => route("wheel", input),
        subscribe(listener: (frame: RenderFrame) => void) {
          subscribers.add(listener)
          return () => subscribers.delete(listener)
        },
      } as unknown as DocumentOverlayRuntime
      state.overlays.set(registration.root, runtime)
      return runtime
    },
    getOverlay(id: SemanticNode) {
      return state.overlays.get(id)
    },
    removeOverlay(id: SemanticNode) {
      state.projectionSubscribers.delete(id)
      return state.overlays.delete(id)
    },
    addWorld() {
      throw new Error("Direct worlds are not part of the Root public API")
    },
    getWorld() {
      return undefined
    },
    updateWorld() {
      throw new Error("Direct worlds are not part of the Root public API")
    },
    removeWorld() {
      return false
    },
    dispatchPointer(type: "pointermove" | "pointerdown" | "pointerup" | "pointercancel", input: PointerInput) {
      if (state.disposed) throw new Error("Root is disposed")
      state.projectionInputs.push({owner: "input", type, input})
      if (type === "pointerdown" && state.pointerTarget !== null) {
        if (state.pointerTarget instanceof SemanticHTMLElement) state.pointerTarget.focus()
        state.nativeOwner = state.pointerTarget.parentElement
        state.nativeTarget = state.pointerTarget as SemanticHTMLElement
      }
    },
    dispatchWheel(input: WheelInput) {
      if (state.disposed) throw new Error("Root is disposed")
      state.projectionInputs.push({owner: "input", type: "wheel", input})
    },
    projectPoint(_id: SemanticNode, point: {x: number; y: number}) { return point },
    render() {
      for (const listener of [...state.beforeRender]) listener()
      state.renderedFrames += 1
      presentFakeFrame(state)
    },
    requestRender() {
      state.requestedFrames += 1
      if (state.requestedFrame === null) {
        state.requestedFrame = () => {
          state.requestedFrame = null
          runtime.render()
        }
      }
    },
    resize() {
      state.resizeCalls += 1
    },
    captureLastPresentedFramePng: async () => null,
    snapshotViewPoint() {
      return state.snapshot
    },
    restoreViewPoint(snapshot: DocumentSpaceViewPointSnapshot) {
      state.snapshot = snapshot
      state.restoreCalls += 1
    },
    setCameraGesturesEnabled() {},
    subscribeBeforeRender(listener: () => void) {
      state.beforeRender.add(listener)
      return () => state.beforeRender.delete(listener)
    },
    subscribePresented(listener: (sequence: number) => void) {
      state.presented = listener
      return () => {
        if (state.presented === listener) state.presented = null
      }
    },
    dispose() {
      state.lifecycle.push("runtime:dispose")
      state.disposed = true
    },
  } as unknown as DocumentSpaceRuntime
  return runtime
}
