import {expect, test} from "bun:test"
import {
  HTMLElement as SemanticHTMLElement,
  type Element as SemanticElement,
  type Node as SemanticNode,
} from "@zavx0z/dom"
import type {
  PointerInput,
  RenderFrame,
  WheelInput,
} from "@zavx0z/renderer"
import {
  AnimationClip,
  BoxGeometry,
  BufferGeometry,
  Color,
  DirectionalLight,
  KeyframeTrack,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Object3D,
  Space,
  SphereGeometry,
  Text as EngineText,
  TextMaterial,
  ThinFilmMaterial,
  TorusGeometry,
  TrueTypeFont,
  Vector3,
  ViewPoint,
} from "@zavx0z/engine"
import {
  readSpaceTree,
  XRAnimationElement,
  XRAssetElement,
  XRDisplayElement,
  XRGeometryElement,
  XRGroupElement,
  XRHUDElement,
  XRLightElement,
  XRLineElement,
  XRMaterialElement,
  XRMeshElement,
  XRSpaceElement,
  XRTextElement,
  XRViewPointElement,
} from "@zavx0z/space"
import * as publicApi from "../src/index.ts"
import {
  createExperienceWithRuntimeFactory,
} from "../src/experience.ts"
import type {
  CreateDocumentSpaceRuntimeOptions,
  DocumentSpaceOverlayRegistration,
  DocumentSpacePlaneRegistration,
  DocumentSpacePlaneUpdate,
  DocumentSpaceRuntime,
  DocumentSpaceViewPointSnapshot,
} from "../src/space-runtime.ts"
import type {DocumentOverlayRuntime} from "../src/overlay-runtime.ts"
import type {DocumentPlaneRuntime} from "../src/plane-runtime.ts"

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
  projectionSubscribers: Map<string, Set<(frame: RenderFrame) => void>>
  projectionInputs: Array<Readonly<{ownerId: string; type: string; input: PointerInput | WheelInput}>>
  pointerTarget: SemanticElement | null
  nativeOwnerId: string | null
  nativeTarget: SemanticHTMLElement | null
  keyInputs: unknown[]
  lifecycle: string[]
  space: Space | null
  viewPoint: ViewPoint | null
  invalidated: BufferGeometry[]
  planes: Map<string, DocumentPlaneRuntime>
  overlays: Map<string, DocumentOverlayRuntime>
}

const createFakeRuntimeState = (): FakeRuntimeState => ({
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
    up: {x: 0, y: 0, z: 1},
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
  nativeOwnerId: null,
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

const presentFakeFrame = (state: FakeRuntimeState): void => {
  state.presentedFrames += 1
  state.presented?.(state.presentedFrames)
}

const createFakeRuntime = (
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
      return state.nativeOwnerId === null ? null : options.document
    },
    get ownerId() {
      return state.nativeOwnerId
    },
    get inputTarget() {
      return state.nativeTarget
    },
    get activeProxy() {
      return state.nativeTarget === null ? null : "input"
    },
    setActiveDocument(document: CreateDocumentSpaceRuntimeOptions["document"] | null, ownerId?: string | null) {
      state.nativeOwnerId = document === null ? null : ownerId ?? null
      if (document === null) state.nativeTarget = null
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
      state.nativeOwnerId = null
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
    get planeIds() {
      return Object.freeze([...state.planes.keys()])
    },
    get overlayIds() {
      return Object.freeze([...state.overlays.keys()])
    },
    get worldIds() {
      return Object.freeze([])
    },
    get disposed() {
      return state.disposed
    },
    addPlane(registration: DocumentSpacePlaneRegistration) {
      const plane = {
        position: new Vector3(
          registration.transform?.position?.x ?? 0,
          registration.transform?.position?.y ?? 0,
          registration.transform?.position?.z ?? 0,
        ),
        visible: registration.transform?.visible ?? true,
      }
      const frame = createFakeFrame({
        document: options.document,
        root: registration.root,
        viewport: registration.viewport,
      })
      const subscribers = new Set<(frame: RenderFrame) => void>()
      state.projectionSubscribers.set(registration.id, subscribers)
      const route = (type: string, input: PointerInput | WheelInput): SemanticElement | null => {
        state.projectionInputs.push({ownerId: registration.id, type, input})
        if (type === "pointerdown" && state.pointerTarget instanceof SemanticHTMLElement) {
          state.pointerTarget.focus()
        }
        return state.pointerTarget
      }
      const runtime = {
        root: registration.root,
        viewport: registration.viewport,
        worldUnitsPerPixel: registration.worldUnitsPerPixel,
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
      state.planes.set(registration.id, runtime)
      return runtime
    },
    getPlane(id: string) {
      return state.planes.get(id)
    },
    updatePlane(id: string, update: DocumentSpacePlaneUpdate) {
      const held = state.planes.get(id)
      if (held === undefined) throw new Error(`Unknown fake plane: ${id}`)
      const mutable = held as unknown as {
        viewport: {width: number; height: number}
        worldUnitsPerPixel: number
        plane: {position: Vector3; visible: boolean}
      }
      if (update.viewport !== undefined) mutable.viewport = update.viewport
      if (update.worldUnitsPerPixel !== undefined) {
        mutable.worldUnitsPerPixel = update.worldUnitsPerPixel
      }
      const transform = update.transform
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
    removePlane(id: string) {
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
      state.projectionSubscribers.set(registration.id, subscribers)
      const route = (type: string, input: PointerInput | WheelInput): SemanticElement | null => {
        state.projectionInputs.push({ownerId: registration.id, type, input})
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
      state.overlays.set(registration.id, runtime)
      return runtime
    },
    getOverlay(id: string) {
      return state.overlays.get(id)
    },
    removeOverlay(id: string) {
      state.projectionSubscribers.delete(id)
      return state.overlays.delete(id)
    },
    addWorld() {
      throw new Error("Direct worlds are not part of the Experience public API")
    },
    getWorld() {
      return undefined
    },
    updateWorld() {
      throw new Error("Direct worlds are not part of the Experience public API")
    },
    removeWorld() {
      return false
    },
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
    restoreViewPoint() {
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

test("[BRW-004] createExperience создаёт один Document и синхронизирует один Space/ViewPoint", async () => {
  const state = createFakeRuntimeState()
  const canvas = {
    width: 640,
    height: 360,
    getContext: () => null,
  } as unknown as HTMLCanvasElement
  const font = {} as TrueTypeFont
  let runtimeDocument: CreateDocumentSpaceRuntimeOptions["document"] | null = null
  const experience = await createExperienceWithRuntimeFactory(
    {canvas, font},
    async options => {
      state.factoryCalls += 1
      runtimeDocument = options.document
      return createFakeRuntime(options, state)
    },
  )

  expect(state.factoryCalls).toBe(1)
  expect(runtimeDocument as unknown).toBe(experience.document)
  expect(experience.canvas).toBe(canvas)

  const document = experience.document
  const space = experience.space
  const viewPoint = experience.viewPoint
  const display = document.createElement("xr-display") as XRDisplayElement
  const hud = document.createElement("xr-hud") as XRHUDElement
  display.id = "display"
  hud.id = "hud"
  document.transaction(() => {
    space.append(display, hud)
  })

  const tree = readSpaceTree(document)
  expect(tree.space).toBe(space)
  expect(tree.viewPoint).toBe(viewPoint)
  expect(state.restoreCalls).toBe(1)
  expect(state.planes.get("display")?.root).toBe(display)
  expect(state.overlays.get("hud")?.root).toBe(hud)
  expect(state.requestedFrames).toBeGreaterThan(0)

  experience.render()
  experience.resize()
  expect(state.renderedFrames).toBe(1)
  expect(state.resizeCalls).toBe(1)

  experience.dispose()
  expect(experience.disposed).toBe(true)
  expect(state.disposed).toBe(true)
})

test("[BRW-005] публичный Browser API содержит только createExperience", () => {
  expect(Object.keys(publicApi)).toEqual(["createExperience"])
})

test("[BRW-006] presented ViewPoint синхронизируется в exact semantic Element без петли", async () => {
  const state = createFakeRuntimeState()
  const canvas = {getContext: () => null} as unknown as HTMLCanvasElement
  const experience = await createExperienceWithRuntimeFactory(
    {canvas, font: {} as TrueTypeFont},
    async options => createFakeRuntime(options, state),
  )
  const document = experience.document
  const viewPoint = experience.viewPoint
  const identity = viewPoint
  const requestedBeforeWriteback = state.requestedFrames
  state.snapshot = {
    position: {x: 11, y: 12, z: 13},
    target: {x: 1, y: 2, z: 3},
    up: {x: 0.1, y: 0.2, z: 0.9},
    fov: 0.75,
    near: 0.25,
    far: 2500,
  }
  presentFakeFrame(state)

  expect(readSpaceTree(document).viewPoint).toBe(identity)
  expect(viewPoint).toMatchObject({
    x: 11,
    y: 12,
    z: 13,
    targetX: 1,
    targetY: 2,
    targetZ: 3,
    upX: 0.1,
    upY: 0.2,
    upZ: 0.9,
    fov: 0.75,
    near: 0.25,
    far: 2500,
  })
  expect(state.restoreCalls).toBe(1)
  expect(state.requestedFrames).toBe(requestedBeforeWriteback)
  experience.dispose()
})

test("[BRW-007] Geometry/Material factories сохраняют Object identity и invalidation", async () => {
  const state = createFakeRuntimeState()
  const experience = await createExperienceWithRuntimeFactory(
    {
      canvas: {getContext: () => null} as unknown as HTMLCanvasElement,
      font: {} as TrueTypeFont,
    },
    async options => createFakeRuntime(options, state),
  )
  const document = experience.document
  const space = experience.space
  const viewPoint = experience.viewPoint
  const builtInMesh = document.createElement("xr-mesh") as XRMeshElement
  const builtInGeometry = document.createElement("xr-geometry") as XRGeometryElement
  const builtInMaterial = document.createElement("xr-material") as XRMaterialElement
  builtInMesh.name = "built-in"
  builtInMesh.append(builtInGeometry, builtInMaterial)

  const customMesh = document.createElement("xr-mesh") as XRMeshElement
  const customGeometry = document.createElement("xr-geometry") as XRGeometryElement
  const customMaterial = document.createElement("xr-material") as XRMaterialElement
  const torus = new TorusGeometry({radius: 2, tube: 0.5})
  const film = new ThinFilmMaterial()
  let geometryCalls = 0
  let materialCalls = 0
  customMesh.name = "custom"
  customGeometry.factory = () => {
    geometryCalls += 1
    return torus
  }
  customMaterial.factory = () => {
    materialCalls += 1
    return film
  }
  customMesh.append(customGeometry, customMaterial)

  document.transaction(() => {
    space.append(builtInMesh, customMesh)
  })
  const engineSpace = state.space!
  const builtInObject = engineSpace.getObjectByName("built-in") as Mesh
  const customObject = engineSpace.getObjectByName("custom") as Mesh
  expect(builtInObject.geometry).toBeInstanceOf(BoxGeometry)
  expect(builtInObject.material).toBeInstanceOf(MeshBasicMaterial)
  expect(customObject.geometry).toBe(torus)
  expect(customObject.material).toBe(film)
  expect({geometryCalls, materialCalls}).toEqual({geometryCalls: 1, materialCalls: 1})

  customMesh.x = 25
  expect(engineSpace.getObjectByName("custom")).toBe(customObject)
  expect(customObject.geometry).toBe(torus)
  expect({geometryCalls, materialCalls}).toEqual({geometryCalls: 1, materialCalls: 1})

  const sphere = new SphereGeometry({radius: 3})
  const lambert = new MeshLambertMaterial({color: 0x336699})
  customGeometry.factory = () => sphere
  customMaterial.factory = () => lambert
  expect(engineSpace.getObjectByName("custom")).toBe(customObject)
  expect(customObject.geometry).toBe(sphere)
  expect(customObject.material).toBe(lambert)
  expect(state.invalidated).toContain(torus)
  experience.dispose()
})

test("[BRW-008] Experience представляет Line, Text и DirectionalLight в одном Space", async () => {
  const fontBytes = await Bun.file(
    `${import.meta.dir}/../../engine/static/fonts/inter-regular.ttf`,
  ).arrayBuffer()
  const font = new TrueTypeFont(fontBytes)
  const state = createFakeRuntimeState()
  const experience = await createExperienceWithRuntimeFactory(
    {
      canvas: {getContext: () => null} as unknown as HTMLCanvasElement,
      font,
    },
    async options => createFakeRuntime(options, state),
  )
  const document = experience.document
  const space = experience.space
  const viewPoint = experience.viewPoint
  const group = document.createElement("xr-group") as XRGroupElement
  const line = document.createElement("xr-line") as XRLineElement
  const lineGeometry = document.createElement("xr-geometry") as XRGeometryElement
  const lineMaterial = document.createElement("xr-material") as XRMaterialElement
  const text = document.createElement("xr-text") as XRTextElement
  const textMaterial = document.createElement("xr-material") as XRMaterialElement
  const light = document.createElement("xr-light") as XRLightElement
  group.name = "group"
  line.name = "line"
  lineMaterial.kind = "line-basic"
  line.append(lineGeometry, lineMaterial)
  text.name = "text"
  text.text = "MetaFor"
  textMaterial.kind = "text"
  text.append(textMaterial)
  light.name = "light"
  group.append(line, text, light)
  document.transaction(() => {
    space.append(group)
  })

  const engineSpace = state.space!
  expect(engineSpace.getObjectByName("line")).toBeInstanceOf(Line)
  expect((engineSpace.getObjectByName("line") as Line).material).toBeInstanceOf(LineBasicMaterial)
  expect(engineSpace.getObjectByName("text")).toBeInstanceOf(EngineText)
  expect(engineSpace.getObjectByName("light")).toBeInstanceOf(DirectionalLight)
  experience.dispose()
})

test("[BRW-009] Animation behavior обновляет exact derived Object", async () => {
  const state = createFakeRuntimeState()
  const experience = await createExperienceWithRuntimeFactory(
    {
      canvas: {getContext: () => null} as unknown as HTMLCanvasElement,
      font: {} as TrueTypeFont,
    },
    async options => createFakeRuntime(options, state),
  )
  const document = experience.document
  const space = experience.space
  const viewPoint = experience.viewPoint
  const group = document.createElement("xr-group") as XRGroupElement
  const animation = document.createElement("xr-animation") as XRAnimationElement
  group.name = "animated"
  animation.factory = () => new AnimationClip("move", 1, [
    new KeyframeTrack(
      "animated",
      "vector",
      new Float32Array([0, 1]),
      new Float32Array([0, 0, 0, 10, 0, 0]),
    ),
  ])
  group.append(animation)
  document.transaction(() => {
    space.append(group)
  })
  const object = state.space!.getObjectByName("animated")!
  presentFakeFrame(state)
  await Bun.sleep(20)
  presentFakeFrame(state)

  expect(state.space!.getObjectByName("animated")).toBe(object)
  expect(object.position.x).toBeGreaterThan(0)
  expect(state.requestedFrames).toBeGreaterThan(1)
  experience.dispose()
})

test("[BRW-012] Asset factory удерживает один opaque GLTF-like subtree", async () => {
  const state = createFakeRuntimeState()
  const experience = await createExperienceWithRuntimeFactory(
    {
      canvas: {getContext: () => null} as unknown as HTMLCanvasElement,
      font: {} as TrueTypeFont,
    },
    async options => createFakeRuntime(options, state),
  )
  const document = experience.document
  const space = experience.space
  const viewPoint = experience.viewPoint
  const asset = document.createElement("xr-asset") as XRAssetElement
  const assetRoot = new Object3D()
  const gltfChild = new Mesh(
    new BoxGeometry({width: 2, height: 3, depth: 4}),
    new MeshBasicMaterial({color: 0xabcdef}),
  )
  gltfChild.name = "gltf-child"
  assetRoot.add(gltfChild)
  asset.name = "asset"
  asset.factory = () => assetRoot
  document.transaction(() => {
    space.append(asset)
  })

  expect(state.space!.getObjectByName("asset")).toBe(assetRoot)
  expect(assetRoot.getObjectByName("gltf-child")).toBe(gltfChild)
  expect(assetRoot.children).toEqual([gltfChild])
  experience.dispose()
  expect(state.invalidated).toContain(gltfChild.geometry)
})

test("[BRW-013] post-projection opaque children fail closed для Group и Mesh", async () => {
  for (const kind of ["group", "mesh"] as const) {
    const state = createFakeRuntimeState()
    const experience = await createExperienceWithRuntimeFactory(
      {
        canvas: {getContext: () => null} as unknown as HTMLCanvasElement,
        font: {} as TrueTypeFont,
      },
      async options => createFakeRuntime(options, state),
    )
    const document = experience.document
    const space = experience.space
    const viewPoint = experience.viewPoint
    const element = kind === "group"
      ? document.createElement("xr-group") as XRGroupElement
      : document.createElement("xr-mesh") as XRMeshElement
    const object = kind === "group"
      ? new Object3D()
      : new Mesh(new BoxGeometry(), new MeshBasicMaterial())
    element.factory = () => object
    document.transaction(() => {
      space.append(element)
    })
    expect(object.parent).toBe(state.space)

    object.add(new Object3D())
    const requestedFrame = state.requestedFrame
    expect(requestedFrame).not.toBeNull()
    expect(() => requestedFrame?.()).toThrow(
      `${element.localName} projection acquired an opaque Engine child after validation`,
    )
    expect(object.parent).toBeNull()
    expect(state.renderedFrames).toBe(0)
    expect(state.presentedFrames).toBe(0)
    experience.dispose()
  }
})

test("[BRW-014] createExperience сразу владеет exact Space/ViewPoint без Display/HUD", async () => {
  const state = createFakeRuntimeState()
  const experience = await createExperienceWithRuntimeFactory(
    {
      canvas: {getContext: () => null} as unknown as HTMLCanvasElement,
      font: {} as TrueTypeFont,
    },
    async options => createFakeRuntime(options, state),
  )

  expect(experience.document.documentElement).toBe(experience.space)
  expect(experience.space.ownerDocument).toBe(experience.document)
  expect(experience.viewPoint.parentElement).toBe(experience.space)
  expect(readSpaceTree(experience.document).viewPoint).toBe(experience.viewPoint)
  expect(readSpaceTree(experience.document).displays).toHaveLength(0)
  expect(readSpaceTree(experience.document).hud).toBeNull()
  experience.dispose()
})

test("[BRW-015] projection handles читают frames и bounded route input", async () => {
  const state = createFakeRuntimeState()
  const experience = await createExperienceWithRuntimeFactory(
    {
      canvas: {getContext: () => null} as unknown as HTMLCanvasElement,
      font: {} as TrueTypeFont,
    },
    async options => createFakeRuntime(options, state),
  )
  const display = experience.document.createElement("xr-display") as XRDisplayElement
  const hud = experience.document.createElement("xr-hud") as XRHUDElement
  const button = experience.document.createElement("button")
  display.id = "display-projection"
  display.viewportWidth = 320
  display.viewportHeight = 180
  hud.id = "hud-projection"
  display.append(button)
  experience.space.append(display, hud)

  const projection = experience.getProjection(display)
  const hudProjection = experience.getProjection(hud)
  expect(projection.kind).toBe("display")
  expect(hudProjection.kind).toBe("hud")
  expect(projection.owner).toBe(display)
  expect(projection.readFrame()?.root).toBe(display)

  const frames: RenderFrame[] = []
  const unsubscribe = projection.subscribeFrames(frame => frames.push(frame))
  const frame = projection.readFrame()!
  for (const listener of state.projectionSubscribers.get(display.id) ?? []) listener(frame)
  expect(frames).toEqual([frame])

  state.pointerTarget = button
  expect(projection.pointerDown({x: 10, y: 20, pointerId: 7})).toBe(button)
  projection.pointerMove({x: 11, y: 21, pointerId: 7})
  projection.pointerUp({x: 12, y: 22, pointerId: 7})
  projection.wheel({x: 13, y: 23, deltaX: 1, deltaY: 2})
  expect(state.projectionInputs.map(({type}) => type)).toEqual([
    "pointerdown",
    "pointermove",
    "pointerup",
    "wheel",
  ])
  expect(() => projection.pointerDown({x: 320, y: 20})).toThrow(
    "Projection input point must be inside its logical viewport",
  )

  const spaceProjection = experience.getProjection(experience.space)
  const beforeOrbit = state.viewPoint!.position.clone()
  spaceProjection.orbit(10, 5)
  expect(state.viewPoint!.position).not.toEqual(beforeOrbit)
  experience.space.background = "#123456"
  expect(state.space!.background).toEqual(new Color("#123456"))
  experience.viewPoint.x = 99
  experience.resetViewPoint()
  expect(experience.viewPoint.x).toBe(10)

  unsubscribe()
  experience.dispose()
  expect(state.projectionSubscribers.get(display.id)?.size).toBe(0)
  expect(() => projection.pointerDown({x: 1, y: 1})).toThrow("Experience is disposed")
  expect(() => spaceProjection.orbit(1, 1)).toThrow("Experience is disposed")
})

test("[BRW-016] Experience публикует monotonic presented sequence", async () => {
  const state = createFakeRuntimeState()
  const experience = await createExperienceWithRuntimeFactory(
    {
      canvas: {getContext: () => null} as unknown as HTMLCanvasElement,
      font: {} as TrueTypeFont,
    },
    async options => createFakeRuntime(options, state),
  )
  const sequences: number[] = []
  const unsubscribe = experience.subscribePresented(sequence => sequences.push(sequence))
  presentFakeFrame(state)
  presentFakeFrame(state)
  expect(sequences).toEqual([1, 2])
  expect(experience.presentedFrame).toBe(2)
  unsubscribe()
  presentFakeFrame(state)
  expect(sequences).toEqual([1, 2])
  experience.dispose()
})

test("[BRW-017] semantic key dispatch проверяет projection owner, target и native proxy", async () => {
  const state = createFakeRuntimeState()
  const experience = await createExperienceWithRuntimeFactory(
    {
      canvas: {getContext: () => null} as unknown as HTMLCanvasElement,
      font: {} as TrueTypeFont,
    },
    async options => createFakeRuntime(options, state),
  )
  const display = experience.document.createElement("xr-display") as XRDisplayElement
  const hud = experience.document.createElement("xr-hud") as XRHUDElement
  const button = experience.document.createElement("button")
  const other = experience.document.createElement("button")
  display.id = "key-display"
  hud.id = "key-hud"
  display.append(button, other)
  experience.space.append(display, hud)
  state.pointerTarget = button
  experience.getProjection(display).pointerDown({x: 1, y: 1})

  expect(experience.dispatchKey(display, button, {
    type: "keydown",
    key: "Enter",
    code: "Enter",
  })).toBe(true)
  expect(state.keyInputs).toHaveLength(1)
  expect(() => experience.dispatchKey(hud, button, {type: "keydown", key: "Enter"}))
    .toThrow("exact projection owner")
  expect(() => experience.dispatchKey(display, other, {type: "keydown", key: "Enter"}))
    .toThrow("does not own the Experience native proxy")
  experience.dispose()
})

test("[BRW-018] linked styles готовы до runtime и освобождаются после него", async () => {
  const state = createFakeRuntimeState()
  const link = {} as HTMLLinkElement
  const experience = await createExperienceWithRuntimeFactory(
    {
      canvas: {getContext: () => null} as unknown as HTMLCanvasElement,
      font: {} as TrueTypeFont,
      styleSheets: ["body { color: red; }"],
      linkedAuthorStyleSheets: [{id: "theme", link}],
    },
    async options => {
      expect(state.lifecycle).toEqual(["styles:create", "styles:ready"])
      expect(options.styleSheets).toEqual(["body { color: red; }"])
      return createFakeRuntime(options, state)
    },
    {
      createLinkedAuthorStyleSheetHost(options) {
        state.lifecycle.push("styles:create")
        expect(options.sources).toEqual([{id: "theme", link}])
        return {
          canvas: options.canvas,
          document: options.document,
          sources: options.sources,
          ready: Promise.resolve().then(() => {
            state.lifecycle.push("styles:ready")
          }),
          disposed: false,
          refresh() {},
          dispose() {
            state.lifecycle.push("styles:dispose")
          },
        }
      },
    },
  )
  experience.dispose()
  expect(state.lifecycle).toEqual([
    "styles:create",
    "styles:ready",
    "runtime:create",
    "runtime:dispose",
    "styles:dispose",
  ])
})

test("[BRW-019] linked stylesheet readiness fail closed до runtime", async () => {
  const state = createFakeRuntimeState()
  let runtimeCalls = 0
  let linkedDisposed = false
  await expect(createExperienceWithRuntimeFactory(
    {
      canvas: {getContext: () => null} as unknown as HTMLCanvasElement,
      font: {} as TrueTypeFont,
      linkedAuthorStyleSheets: [{id: "broken", link: {} as HTMLLinkElement}],
    },
    async options => {
      runtimeCalls += 1
      return createFakeRuntime(options, state)
    },
    {
      createLinkedAuthorStyleSheetHost(options) {
        return {
          canvas: options.canvas,
          document: options.document,
          sources: options.sources,
          ready: Promise.reject(new Error("linked stylesheet failed")),
          disposed: false,
          refresh() {},
          dispose() {
            linkedDisposed = true
          },
        }
      },
    },
  )).rejects.toThrow("linked stylesheet failed")
  expect(runtimeCalls).toBe(0)
  expect(linkedDisposed).toBe(true)
})
