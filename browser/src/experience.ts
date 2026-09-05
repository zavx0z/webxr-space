import type {RendererFontFace} from "@zavx0z/webgpu"
import {loadFontFaces, type BrowserFontFaceSource} from "../font-faces.ts"
import {
  AnimationMixer,
  AnimationClip,
  BoxGeometry,
  BufferGeometry,
  Color,
  DirectionalLight,
  Light,
  Line,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  Material,
  Object3D,
  PlaneGeometry,
  SphereGeometry,
  Text as EngineText,
  TextMaterial,
  TexturedPlaneGeometry,
  TorusGeometry,
  type AnimationAction,
  type TrueTypeFont,
} from "@zavx0z/engine"
import {
  createDocument,
  HTMLElement as SemanticHTMLElement,
  type Document,
  type Element,
} from "@zavx0z/dom"
import type {
  PointerInput,
  RenderFrame,
  WheelInput,
} from "@zavx0z/renderer"
import {
  createSpaceElementFactories,
  readSpaceTree,
  XRAnimationElement,
  XRAssetElement,
  XRDisplayElement,
  XRGeometryElement,
  XRGroupElement,
  XRHUDElement,
  XRLightElement,
  XRLineElement,
  XRLineSegmentsElement,
  XRMaterialElement,
  XRMeshElement,
  XRObjectElement,
  XRSpaceElement,
  XRTextElement,
  XRViewPointElement,
  type SpaceTree,
} from "@zavx0z/space"
import {
  createBrowserLinkedAuthorStyleSheetHost,
  type BrowserLinkedAuthorStyleSheetHost,
} from "./linked-author-style-sheet-host.ts"
import type {DocumentOverlayRuntime} from "./overlay-runtime.ts"
import type {DocumentPlaneRuntime} from "./plane-runtime.ts"
import type {
  CreateDocumentSpaceRuntimeOptions,
  DocumentSpaceRuntime,
  DocumentSpaceViewPointSnapshot,
} from "./space-runtime.ts"

export type CreateExperienceOptions = Readonly<{
  canvas: HTMLCanvasElement
  font: TrueTypeFont
  fontFaces?: readonly RendererFontFace[] | undefined
  fontSources?: readonly BrowserFontFaceSource[] | undefined
  styleSheets?: readonly string[]
  linkedAuthorStyleSheets?: readonly ExperienceLinkedAuthorStyleSheet[]
  onLinkedAuthorStyleSheetError?: ExperienceLinkedAuthorStyleSheetErrorHandler
  pixelRatio?: number
  cameraGestures?: boolean
}>

export type ExperienceLinkedAuthorStyleSheet = Readonly<{
  id: string
  link: HTMLLinkElement
}>

export type ExperienceLinkedAuthorStyleSheetErrorHandler = (
  error: Error,
  source: ExperienceLinkedAuthorStyleSheet | null,
) => void

export type ExperienceProjectionKind = "display" | "hud" | "space"

export type ExperienceProjectionPointerInput = Readonly<{
  x: number
  y: number
  pointerId?: number
  pointerType?: string
  button?: number
  buttons?: number
  pressure?: number
  isPrimary?: boolean
  timeStamp?: number
}>

export type ExperienceProjectionWheelInput = Readonly<{
  x: number
  y: number
  deltaX: number
  deltaY: number
  deltaZ?: number
  deltaMode?: number
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
  timeStamp?: number
}>

export type ExperienceKeyInput = Readonly<{
  type: "keydown" | "keyup"
  key: string
  code?: string
  location?: number
  repeat?: boolean
  isComposing?: boolean
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  metaKey?: boolean
}>

export type ExperienceDocumentProjection = Readonly<{
  kind: "display" | "hud"
  owner: XRDisplayElement | XRHUDElement
  readFrame(): RenderFrame | null
  subscribeFrames(listener: (frame: RenderFrame) => void): () => void
  pointerDown(input: ExperienceProjectionPointerInput): Element | null
  pointerMove(input: ExperienceProjectionPointerInput): Element | null
  pointerUp(input: ExperienceProjectionPointerInput): Element | null
  wheel(input: ExperienceProjectionWheelInput): Element | null
}>

export type ExperienceSpaceProjection = Readonly<{
  kind: "space"
  owner: XRSpaceElement
  orbit(deltaX: number, deltaY: number): void
  pan(deltaX: number, deltaY: number): void
  zoom(delta: number, anchor?: Readonly<{clientX: number; clientY: number}>): void
}>

export type ExperienceProjection = ExperienceDocumentProjection | ExperienceSpaceProjection

export type Experience = Readonly<{
  canvas: HTMLCanvasElement
  document: Document
  space: XRSpaceElement
  viewPoint: XRViewPointElement
  presentedFrame: number
  disposed: boolean
  getProjection(owner: XRSpaceElement): ExperienceSpaceProjection
  getProjection(owner: XRDisplayElement | XRHUDElement): ExperienceDocumentProjection
  subscribePresented(listener: (sequence: number) => void): () => void
  dispatchKey(
    owner: XRDisplayElement | XRHUDElement,
    target: SemanticHTMLElement,
    input: ExperienceKeyInput,
  ): boolean
  resetViewPoint(): void
  render(): void
  requestFrame(): void
  resize(): void
  captureLastPresentedFramePng(): Promise<Blob | null>
  dispose(): void
}>

type ExperienceRuntimeFactory = (
  options: CreateDocumentSpaceRuntimeOptions,
) => Promise<DocumentSpaceRuntime>

type ExperienceSeams = Readonly<{
  createLinkedAuthorStyleSheetHost(options: Readonly<{
    canvas: HTMLCanvasElement
    document: Document
    sources: readonly ExperienceLinkedAuthorStyleSheet[]
    onError?: ExperienceLinkedAuthorStyleSheetErrorHandler
  }>): BrowserLinkedAuthorStyleSheetHost
}>

const defaultExperienceSeams: ExperienceSeams = Object.freeze({
  createLinkedAuthorStyleSheetHost: createBrowserLinkedAuthorStyleSheetHost,
})

type ProjectionRuntime = DocumentPlaneRuntime | DocumentOverlayRuntime

type ProjectionBinding = {
  runtime: ProjectionRuntime
  unsubscribe: () => void
}

type LeafProjection<Resource> = {
  element: object
  factory: Function | null
  factoryRevision: number
  signature: string
  resource: Resource
}

type ObjectProjection = {
  object: Object3D
  factory: Function | null
  factoryRevision: number
  geometry: LeafProjection<BufferGeometry> | null
  material: LeafProjection<Material> | null
}

type AnimationProjection = {
  element: XRAnimationElement
  owner: Object3D
  factory: Function
  factoryRevision: number
  clip: AnimationClip
  mixer: AnimationMixer
  action: AnimationAction
  playing: boolean
}

/** Creates the only browser presentation host for one application Experience. */
export async function createExperience(
  options: CreateExperienceOptions,
): Promise<Experience> {
  return createExperienceWithRuntimeFactory(options, async runtimeOptions => {
    const {createDocumentSpaceRuntime} = await import("./space-runtime.ts")
    return createDocumentSpaceRuntime(runtimeOptions)
  })
}

/** Internal deterministic seam used by package-owned lifecycle tests. */
export async function createExperienceWithRuntimeFactory(
  options: CreateExperienceOptions,
  createRuntime: ExperienceRuntimeFactory,
  seams: ExperienceSeams = defaultExperienceSeams,
): Promise<Experience> {
  validateOptions(options, createRuntime, seams)
  const document = createDocument({
    elementFactories: createSpaceElementFactories(),
  })
  const space = document.createElement("xr-space") as XRSpaceElement
  const viewPoint = document.createElement("xr-view-point") as XRViewPointElement
  space.append(viewPoint)
  document.append(space)
  const initialViewPoint = semanticViewPointSnapshot(viewPoint)
  const linkedSources = Object.freeze([...(options.linkedAuthorStyleSheets ?? [])])
  let linkedAuthorStyleSheetHost: BrowserLinkedAuthorStyleSheetHost | null = null
  let runtime: DocumentSpaceRuntime
  try {
    if (linkedSources.length > 0) {
      linkedAuthorStyleSheetHost = seams.createLinkedAuthorStyleSheetHost({
        canvas: options.canvas,
        document,
        sources: linkedSources,
        ...(options.onLinkedAuthorStyleSheetError === undefined
          ? {}
          : {onError: options.onLinkedAuthorStyleSheetError}),
      })
      await linkedAuthorStyleSheetHost.ready
    }
    if (options.fontFaces !== undefined && options.fontSources !== undefined) {
      throw new TypeError("Experience accepts either fontFaces or fontSources")
    }
    const fontFaces = options.fontFaces ?? (options.fontSources === undefined
      ? undefined
      : await loadFontFaces(options.fontSources, options.canvas.ownerDocument?.baseURI))
    runtime = await createRuntime({
      canvas: options.canvas,
      document,
      styleSheets: Object.freeze([...(options.styleSheets ?? [])]),
      font: options.font,
      ...(fontFaces === undefined ? {} : {fontFaces}),
      ...(options.pixelRatio === undefined ? {} : {pixelRatio: options.pixelRatio}),
      ...(options.cameraGestures === undefined ? {} : {cameraGestures: options.cameraGestures}),
    })
  } catch (error) {
    linkedAuthorStyleSheetHost?.dispose()
    throw error
  }

  const objects = new Map<XRObjectElement, ObjectProjection>()
  const animations = new Map<XRAnimationElement, AnimationProjection>()
  const projectionBindings = new Map<XRDisplayElement | XRHUDElement, ProjectionBinding>()
  const projectionListeners = new Map<
    XRDisplayElement | XRHUDElement,
    Set<(frame: RenderFrame) => void>
  >()
  const projectionHandles = new Map<
    XRDisplayElement | XRHUDElement,
    ExperienceDocumentProjection
  >()
  const presentedListeners = new Set<(sequence: number) => void>()
  let presentedFrame = runtime.presentedFrames
  let viewPointSignature: string | null = null
  let lastAnimationTime: number | null = null
  let writingPresentedViewPoint = false
  let disposed = false

  const synchronize = (): void => {
    assertActive(disposed)
    if (document.documentElement === null) return
    const tree = readSpaceTree(document)
    runtime.space.background = new Color(tree.space.background)
    synchronizeViewPoint(tree, runtime, value => {
      viewPointSignature = value
    }, viewPointSignature)
    synchronizeDisplays(tree, runtime)
    synchronizeHud(tree, runtime)
    synchronizeProjectionBindings(
      tree,
      runtime,
      projectionBindings,
      projectionListeners,
    )
    synchronizeObjects(tree, runtime, objects, options.font)
    synchronizeAnimations(tree, runtime, objects, animations)
  }

  const unsubscribeBeforeRender = runtime.subscribeBeforeRender(synchronize)

  const unsubscribeMutations = document.subscribeMutations(() => {
    if (disposed) return
    synchronize()
    if (!writingPresentedViewPoint) runtime.requestRender()
  })

  const unsubscribePresented = runtime.subscribePresented(sequence => {
    if (disposed || document.documentElement === null) return
    presentedFrame = sequence
    for (const listener of [...presentedListeners]) listener(sequence)
    const tree = readSpaceTree(document)
    const snapshot = runtime.snapshotViewPoint()
    const signature = viewPointSnapshotSignature(snapshot)
    if (signature !== viewPointSignature) {
      viewPointSignature = signature
      writingPresentedViewPoint = true
      try {
        document.transaction(() => writeViewPointSnapshot(tree, snapshot))
      } finally {
        writingPresentedViewPoint = false
      }
    }

    const now = typeof performance === "undefined" ? Date.now() : performance.now()
    const deltaTime = lastAnimationTime === null
      ? 0
      : Math.max(0, (now - lastAnimationTime) / 1000)
    lastAnimationTime = now
    let playing = false
    for (const animation of animations.values()) {
      if (!animation.playing) continue
      animation.mixer.update(deltaTime)
      playing = true
    }
    if (playing) runtime.requestRender()
    else lastAnimationTime = null
  })

  const requireDocumentProjectionRuntime = (
    owner: XRDisplayElement | XRHUDElement,
  ): ProjectionRuntime => {
    assertActive(disposed)
    if (owner.ownerDocument !== document) {
      throw new Error("Projection owner belongs to another Document")
    }
    const binding = projectionBindings.get(owner)
    if (binding === undefined || binding.runtime.root !== owner) {
      throw new Error("Projection owner is not active in this Experience")
    }
    return binding.runtime
  }

  const createProjectionHandle = (
    owner: XRDisplayElement | XRHUDElement,
  ): ExperienceDocumentProjection => {
    const kind = owner instanceof XRDisplayElement ? "display" : "hud"
    return Object.freeze({
      kind,
      owner,
      readFrame() {
        return projectionBindings.get(owner)?.runtime.frame ?? null
      },
      subscribeFrames(listener: (frame: RenderFrame) => void) {
        if (typeof listener !== "function") throw new TypeError("Projection frame listener is required")
        requireDocumentProjectionRuntime(owner)
        let listeners = projectionListeners.get(owner)
        if (listeners === undefined) {
          listeners = new Set()
          projectionListeners.set(owner, listeners)
        }
        listeners.add(listener)
        return () => listeners?.delete(listener)
      },
      pointerDown(input: ExperienceProjectionPointerInput) {
        const projectionRuntime = requireDocumentProjectionRuntime(owner)
        const target = projectionRuntime.pointerDown(
          projectionPointerInput(input, projectionRuntime.viewport),
        )
        if (target !== null) {
          runtime.nativeInputHost.setActiveDocument(document, owner.id)
          runtime.nativeInputHost.synchronize()
        }
        return target
      },
      pointerMove(input: ExperienceProjectionPointerInput) {
        const projectionRuntime = requireDocumentProjectionRuntime(owner)
        return projectionRuntime.pointerMove(
          projectionPointerInput(input, projectionRuntime.viewport),
        )
      },
      pointerUp(input: ExperienceProjectionPointerInput) {
        const projectionRuntime = requireDocumentProjectionRuntime(owner)
        return projectionRuntime.pointerUp(
          projectionPointerInput(input, projectionRuntime.viewport),
        )
      },
      wheel(input: ExperienceProjectionWheelInput) {
        const projectionRuntime = requireDocumentProjectionRuntime(owner)
        return projectionRuntime.wheel(
          projectionWheelInput(input, projectionRuntime.viewport),
        )
      },
    })
  }

  const spaceProjection: ExperienceSpaceProjection = Object.freeze({
    kind: "space",
    owner: space,
    orbit(deltaX, deltaY) {
      assertActive(disposed)
      runtime.viewPoint.orbit(deltaX, deltaY)
      runtime.requestRender()
    },
    pan(deltaX, deltaY) {
      assertActive(disposed)
      runtime.viewPoint.pan(deltaX, deltaY)
      runtime.requestRender()
    },
    zoom(delta, anchor) {
      assertActive(disposed)
      runtime.viewPoint.zoom(delta, anchor)
      runtime.requestRender()
    },
  })

  function getProjection(owner: XRSpaceElement): ExperienceSpaceProjection
  function getProjection(
    owner: XRDisplayElement | XRHUDElement,
  ): ExperienceDocumentProjection
  function getProjection(
    owner: XRSpaceElement | XRDisplayElement | XRHUDElement,
  ): ExperienceProjection {
    if (owner instanceof XRSpaceElement) {
      if (owner !== space) throw new Error("Space projection belongs to another Experience")
      return spaceProjection
    }
    requireDocumentProjectionRuntime(owner)
    let handle = projectionHandles.get(owner)
    if (handle === undefined) {
      handle = createProjectionHandle(owner)
      projectionHandles.set(owner, handle)
    }
    return handle
  }

  synchronize()
  runtime.requestRender()

  const experience: Experience = Object.freeze({
    canvas: options.canvas,
    document,
    space,
    viewPoint,
    get presentedFrame() {
      return presentedFrame
    },
    get disposed() {
      return disposed
    },
    getProjection,
    subscribePresented(listener: (sequence: number) => void) {
      assertActive(disposed)
      if (typeof listener !== "function") throw new TypeError("Presented listener is required")
      presentedListeners.add(listener)
      return () => presentedListeners.delete(listener)
    },
    dispatchKey(owner, target, input) {
      const projectionRuntime = requireDocumentProjectionRuntime(owner)
      if (
        !(target instanceof SemanticHTMLElement) ||
        projectionRuntime.root !== owner ||
        !owner.contains(target)
      ) {
        throw new Error("Semantic key target does not belong to the exact projection owner")
      }
      if (
        runtime.nativeInputHost.ownerId !== owner.id ||
        runtime.nativeInputHost.inputTarget !== target
      ) {
        throw new Error("Semantic key target does not own the Experience native proxy")
      }
      return runtime.nativeInputHost.dispatchKey(target, input)
    },
    resetViewPoint() {
      assertActive(disposed)
      document.transaction(() => writeViewPointElement(viewPoint, initialViewPoint))
    },
    render() {
      runtime.render()
    },
    requestFrame() {
      runtime.requestRender()
    },
    resize() {
      assertActive(disposed)
      runtime.resize()
    },
    captureLastPresentedFramePng() {
      assertActive(disposed)
      return runtime.captureLastPresentedFramePng()
    },
    dispose() {
      if (disposed) return
      disposed = true
      unsubscribeMutations()
      unsubscribeBeforeRender()
      unsubscribePresented()
      releaseAnimations(animations)
      releaseObjects(runtime, objects)
      releaseProjectionBindings(projectionBindings)
      runtime.dispose()
      linkedAuthorStyleSheetHost?.dispose()
      projectionListeners.clear()
      projectionHandles.clear()
      presentedListeners.clear()
    },
  })

  return experience
}

const synchronizeViewPoint = (
  tree: SpaceTree,
  runtime: DocumentSpaceRuntime,
  setSignature: (value: string) => void,
  previousSignature: string | null,
): void => {
  const element = tree.viewPoint
  const snapshot = semanticViewPointSnapshot(element)
  const signature = viewPointSnapshotSignature(snapshot)
  if (signature === previousSignature) return
  runtime.restoreViewPoint(snapshot)
  setSignature(signature)
}

const semanticViewPointSnapshot = (
  element: XRViewPointElement,
): DocumentSpaceViewPointSnapshot => Object.freeze({
    position: Object.freeze({x: element.x, y: element.y, z: element.z}),
    target: Object.freeze({
      x: element.targetX,
      y: element.targetY,
      z: element.targetZ,
    }),
    up: Object.freeze({x: element.upX, y: element.upY, z: element.upZ}),
    fov: element.fov,
    near: element.near,
    far: element.far,
  })

const viewPointSnapshotSignature = (
  snapshot: DocumentSpaceViewPointSnapshot,
): string => JSON.stringify(snapshot)

const writeViewPointSnapshot = (
  tree: SpaceTree,
  snapshot: DocumentSpaceViewPointSnapshot,
): void => writeViewPointElement(tree.viewPoint, snapshot)

const writeViewPointElement = (
  element: XRViewPointElement,
  snapshot: DocumentSpaceViewPointSnapshot,
): void => {
  assignNumber(element.x, snapshot.position.x, value => {
    element.x = value
  })
  assignNumber(element.y, snapshot.position.y, value => {
    element.y = value
  })
  assignNumber(element.z, snapshot.position.z, value => {
    element.z = value
  })
  assignNumber(element.targetX, snapshot.target.x, value => {
    element.targetX = value
  })
  assignNumber(element.targetY, snapshot.target.y, value => {
    element.targetY = value
  })
  assignNumber(element.targetZ, snapshot.target.z, value => {
    element.targetZ = value
  })
  assignNumber(element.upX, snapshot.up.x, value => {
    element.upX = value
  })
  assignNumber(element.upY, snapshot.up.y, value => {
    element.upY = value
  })
  assignNumber(element.upZ, snapshot.up.z, value => {
    element.upZ = value
  })
  assignNumber(element.fov, snapshot.fov, value => {
    element.fov = value
  })
  assignNumber(element.near, snapshot.near, value => {
    element.near = value
  })
  assignNumber(element.far, snapshot.far, value => {
    element.far = value
  })
}

const assignNumber = (
  current: number,
  value: number,
  write: (value: number) => void,
): void => {
  if (!Object.is(current, value)) write(value)
}

const synchronizeDisplays = (
  tree: SpaceTree,
  runtime: DocumentSpaceRuntime,
): void => {
  const desired = new Set(tree.displays.map(display => display.id))
  for (const id of runtime.planeIds) {
    if (!desired.has(id)) runtime.removePlane(id)
  }

  for (const display of tree.displays) {
    const viewport = display.viewport
    const transform = {
      position: display.transform.position,
      visible: display.transform.visible,
    }
    const held = runtime.getPlane(display.id)
    if (held !== undefined && held.root !== display.element) {
      runtime.removePlane(display.id)
    }
    const current = runtime.getPlane(display.id)
    if (current === undefined) {
      runtime.addPlane({
        id: display.id,
        root: display.element,
        viewport,
        worldUnitsPerPixel: display.worldUnitsPerPixel,
        transform,
      })
      continue
    }
    if (
      current.viewport.width !== viewport.width ||
      current.viewport.height !== viewport.height ||
      current.worldUnitsPerPixel !== display.worldUnitsPerPixel ||
      current.plane.position.x !== transform.position.x ||
      current.plane.position.y !== transform.position.y ||
      current.plane.position.z !== transform.position.z ||
      current.plane.visible !== transform.visible
    ) {
      runtime.updatePlane(display.id, {
        viewport,
        worldUnitsPerPixel: display.worldUnitsPerPixel,
        transform,
      })
    }
  }
}

const synchronizeHud = (
  tree: SpaceTree,
  runtime: DocumentSpaceRuntime,
): void => {
  const hud = tree.hud
  for (const id of runtime.overlayIds) {
    if (hud === null || id !== hud.id) runtime.removeOverlay(id)
  }
  if (hud === null) return

  const held = runtime.getOverlay(hud.id)
  if (held !== undefined && held.root !== hud.element) {
    runtime.removeOverlay(hud.id)
  }
  const current = runtime.getOverlay(hud.id)
  if (current === undefined) {
    runtime.addOverlay({
      id: hud.id,
      root: hud.element,
      distance: hud.distance,
    })
    return
  }
  if (current.overlay.distance !== hud.distance) {
    current.overlay.distance = hud.distance
    runtime.requestRender()
  }
}

const synchronizeProjectionBindings = (
  tree: SpaceTree,
  runtime: DocumentSpaceRuntime,
  bindings: Map<XRDisplayElement | XRHUDElement, ProjectionBinding>,
  listeners: ReadonlyMap<
    XRDisplayElement | XRHUDElement,
    ReadonlySet<(frame: RenderFrame) => void>
  >,
): void => {
  const desired = new Map<XRDisplayElement | XRHUDElement, ProjectionRuntime>()
  for (const display of tree.displays) {
    const plane = runtime.getPlane(display.id)
    if (plane !== undefined && plane.root === display.element) desired.set(display.element, plane)
  }
  if (tree.hud !== null) {
    const overlay = runtime.getOverlay(tree.hud.id)
    if (overlay !== undefined && overlay.root === tree.hud.element) {
      desired.set(tree.hud.element, overlay)
    }
  }

  for (const [owner, binding] of bindings) {
    if (desired.get(owner) === binding.runtime) continue
    binding.unsubscribe()
    bindings.delete(owner)
  }
  for (const [owner, projectionRuntime] of desired) {
    if (bindings.has(owner)) continue
    const unsubscribe = projectionRuntime.subscribe(frame => {
      for (const listener of listeners.get(owner) ?? []) listener(frame)
    })
    bindings.set(owner, {runtime: projectionRuntime, unsubscribe})
  }
}

const releaseProjectionBindings = (
  bindings: Map<XRDisplayElement | XRHUDElement, ProjectionBinding>,
): void => {
  for (const binding of bindings.values()) binding.unsubscribe()
  bindings.clear()
}

const projectionPointerInput = (
  input: ExperienceProjectionPointerInput,
  viewport: Readonly<{width: number; height: number}>,
): PointerInput => {
  validateProjectionPoint(input, viewport)
  return Object.freeze({
    clientX: input.x,
    clientY: input.y,
    pointerId: input.pointerId ?? 1,
    pointerType: input.pointerType ?? "mouse",
    button: input.button ?? 0,
    buttons: input.buttons ?? 0,
    pressure: input.pressure ?? 0,
    isPrimary: input.isPrimary ?? true,
    timeStamp: input.timeStamp ?? 0,
  })
}

const projectionWheelInput = (
  input: ExperienceProjectionWheelInput,
  viewport: Readonly<{width: number; height: number}>,
): WheelInput => {
  validateProjectionPoint(input, viewport)
  return Object.freeze({
    clientX: input.x,
    clientY: input.y,
    deltaX: input.deltaX,
    deltaY: input.deltaY,
    deltaZ: input.deltaZ ?? 0,
    deltaMode: input.deltaMode ?? 0,
    ctrlKey: input.ctrlKey ?? false,
    shiftKey: input.shiftKey ?? false,
    altKey: input.altKey ?? false,
    metaKey: input.metaKey ?? false,
  })
}

const validateProjectionPoint = (
  input: Readonly<{x: number; y: number}>,
  viewport: Readonly<{width: number; height: number}>,
): void => {
  if (
    !Number.isFinite(input.x) ||
    !Number.isFinite(input.y) ||
    input.x < 0 ||
    input.y < 0 ||
    input.x >= viewport.width ||
    input.y >= viewport.height
  ) {
    throw new RangeError("Projection input point must be inside its logical viewport")
  }
}

const synchronizeObjects = (
  tree: SpaceTree,
  runtime: DocumentSpaceRuntime,
  projections: Map<XRObjectElement, ObjectProjection>,
  font: TrueTypeFont,
): void => {
  const live = new Set(tree.objects)
  for (const [element, projection] of projections) {
    if (live.has(element)) continue
    projection.object.parent?.remove(projection.object)
    invalidateObjectGeometry(runtime, projection.object, element instanceof XRAssetElement)
    projections.delete(element)
  }

  for (const element of tree.objects) {
    const held = projections.get(element)
    const geometryElement = objectGeometryElement(element)
    const materialElement = objectMaterialElement(element)
    const geometry = geometryElement === null
      ? null
      : resolveGeometry(geometryElement, held?.geometry ?? null)
    const material = materialElement === null
      ? null
      : resolveMaterial(materialElement, held?.material ?? null)
    const factory = element.factory
    const factoryChanged = held !== undefined && (
      held.factory !== factory ||
      held.factoryRevision !== element.factoryRevision
    )
    const factoryInputsChanged = held !== undefined && factory !== null && (
      held.geometry?.resource !== geometry?.resource ||
      held.material?.resource !== material?.resource
    )
    let projection = held

    if (projection === undefined || factoryChanged || factoryInputsChanged) {
      const object = factory === null
        ? createBuiltInObject(element, geometry?.resource ?? null, material?.resource ?? null, font)
        : factory(element, {
            geometry: geometry?.resource ?? null,
            material: material?.resource ?? null,
            font,
          })
      validateObjectProjection(element, object)
      if (projection !== undefined) {
        projection.object.parent?.remove(projection.object)
        invalidateObjectGeometry(runtime, projection.object, element instanceof XRAssetElement)
      }
      projection = {
        object,
        factory,
        factoryRevision: element.factoryRevision,
        geometry,
        material,
      }
      projections.set(element, projection)
    } else {
      if (projection.factory === null) {
        updateBuiltInObjectResources(runtime, element, projection, geometry, material, font)
      }
      projection.geometry = geometry
      projection.material = material
    }

    applyObjectState(element, projection.object)
  }

  for (const projection of projections.values()) {
    projection.object.parent?.remove(projection.object)
  }
  for (const [element, projection] of projections) {
    if (element instanceof XRAssetElement) continue
    if (projection.object.children.length !== 0) {
      throw new Error(
        `${element.localName} projection acquired an opaque Engine child after validation`,
      )
    }
  }
  for (const element of tree.objects) {
    const projection = projections.get(element)!
    const parent = element.parentElement instanceof XRObjectElement
      ? projections.get(element.parentElement)?.object
      : runtime.space
    if (parent === undefined) throw new Error("Nested XRObjectElement parent is not projected")
    parent.add(projection.object)
  }
}

const objectGeometryElement = (
  element: XRObjectElement,
): XRGeometryElement | null => {
  if (
    element instanceof XRMeshElement ||
    element instanceof XRLineElement ||
    element instanceof XRLineSegmentsElement
  ) return element.geometry
  return null
}

const objectMaterialElement = (
  element: XRObjectElement,
): XRMaterialElement | null => {
  if (
    element instanceof XRMeshElement ||
    element instanceof XRLineElement ||
    element instanceof XRLineSegmentsElement ||
    element instanceof XRTextElement
  ) return element.material
  return null
}

const resolveGeometry = (
  element: XRGeometryElement,
  held: LeafProjection<BufferGeometry> | null,
): LeafProjection<BufferGeometry> => {
  const factory = element.factory
  const signature = factory === null ? elementAttributeSignature(element) : "factory"
  if (
    held !== null &&
    held.element === element &&
    held.factory === factory &&
    held.factoryRevision === element.factoryRevision &&
    held.signature === signature
  ) return held

  const resource = factory === null
    ? createBuiltInGeometry(element)
    : factory(element)
  if (!(resource instanceof BufferGeometry)) {
    throw new TypeError("Geometry factory must return BufferGeometry")
  }
  return {
    element,
    factory,
    factoryRevision: element.factoryRevision,
    signature,
    resource,
  }
}

const resolveMaterial = (
  element: XRMaterialElement,
  held: LeafProjection<Material> | null,
): LeafProjection<Material> => {
  const factory = element.factory
  const signature = factory === null ? elementAttributeSignature(element) : "factory"
  if (
    held !== null &&
    held.element === element &&
    held.factory === factory &&
    held.factoryRevision === element.factoryRevision &&
    held.signature === signature
  ) return held

  const resource = factory === null
    ? createBuiltInMaterial(element)
    : factory(element)
  if (!(resource instanceof Material)) {
    throw new TypeError("Material factory must return Material")
  }
  return {
    element,
    factory,
    factoryRevision: element.factoryRevision,
    signature,
    resource,
  }
}

const elementAttributeSignature = (
  element: XRGeometryElement | XRMaterialElement,
): string => element.getAttributeNames()
  .sort()
  .map(name => `${name}=${element.getAttribute(name)}`)
  .join("\u0000")

const createBuiltInGeometry = (
  element: XRGeometryElement,
): BufferGeometry => {
  switch (element.kind) {
    case "box":
      return new BoxGeometry({
        width: element.width,
        height: element.height,
        depth: element.depth,
        widthSegments: element.widthSegments,
        heightSegments: element.heightSegments,
        depthSegments: element.depthSegments,
      })
    case "plane":
      return new PlaneGeometry({
        width: element.width,
        height: element.height,
        widthSegments: element.widthSegments,
        heightSegments: element.heightSegments,
      })
    case "textured-plane":
      return new TexturedPlaneGeometry({width: element.width, height: element.height})
    case "sphere":
      return new SphereGeometry({
        radius: element.radius,
        widthSegments: element.widthSegments,
        heightSegments: element.heightSegments,
      })
    case "torus":
      return new TorusGeometry({
        radius: element.radius,
        tube: element.tube,
        radialSegments: element.radialSegments,
        tubularSegments: element.tubularSegments,
      })
    default:
      throw new TypeError(`Unsupported built-in XRGeometryElement kind: ${element.kind}`)
  }
}

const createBuiltInMaterial = (
  element: XRMaterialElement,
): Material => {
  const color = new Color(element.color)
  switch (element.kind) {
    case "basic":
      return new MeshBasicMaterial({color})
    case "lambert":
      return new MeshLambertMaterial({color})
    case "line-basic":
      return new LineBasicMaterial({color})
    case "text":
      return new TextMaterial({color})
    default:
      throw new TypeError(`Unsupported built-in XRMaterialElement kind: ${element.kind}`)
  }
}

const createBuiltInObject = (
  element: XRObjectElement,
  geometry: BufferGeometry | null,
  material: Material | null,
  font: TrueTypeFont,
): Object3D => {
  if (element instanceof XRGroupElement) return new Object3D()
  if (element instanceof XRAssetElement) {
    throw new TypeError("XRAssetElement requires an object projection factory")
  }
  if (element instanceof XRMeshElement) {
    return new Mesh(requiredGeometry(element, geometry), requiredMaterial(element, material))
  }
  if (element instanceof XRLineElement) {
    return new Line(requiredGeometry(element, geometry), requiredMaterial(element, material))
  }
  if (element instanceof XRLineSegmentsElement) {
    return new LineSegments(requiredGeometry(element, geometry), requiredMaterial(element, material))
  }
  if (element instanceof XRTextElement) {
    if (!(material instanceof TextMaterial)) {
      throw new TypeError("XRTextElement requires a TextMaterial resource")
    }
    const text = new EngineText(element.text, font, element.fontSize, material)
    text.letterSpacing = element.letterSpacing
    text.updateGeometry()
    return text
  }
  if (element instanceof XRLightElement) {
    if (element.kind !== "directional") {
      throw new TypeError(`Unsupported built-in XRLightElement kind: ${element.kind}`)
    }
    const light = new DirectionalLight(new Color(element.color), element.intensity)
    light.target.position.set(element.targetX, element.targetY, element.targetZ)
    return light
  }
  throw new TypeError(`Unsupported XRObjectElement: ${element.localName}`)
}

const requiredGeometry = (
  element: XRObjectElement,
  geometry: BufferGeometry | null,
): BufferGeometry => {
  if (geometry === null) throw new TypeError(`${element.localName} requires one Geometry`)
  return geometry
}

const requiredMaterial = (
  element: XRObjectElement,
  material: Material | null,
): Material => {
  if (material === null) throw new TypeError(`${element.localName} requires one Material`)
  return material
}

const validateObjectProjection = (
  element: XRObjectElement,
  object: Object3D,
): void => {
  if (!(object instanceof Object3D)) {
    throw new TypeError("Object factory must return Object3D")
  }
  if (object.parent !== null) {
    throw new TypeError("Object factory must return one unattached identity")
  }
  if (!(element instanceof XRAssetElement) && object.children.length !== 0) {
    throw new TypeError("Only XRAssetElement may own an opaque derived Object subtree")
  }
  if (element instanceof XRMeshElement && !(object instanceof Mesh)) {
    throw new TypeError("XRMeshElement factory must return Mesh")
  }
  if (element instanceof XRLineElement && !(object instanceof Line)) {
    throw new TypeError("XRLineElement factory must return Line")
  }
  if (element instanceof XRLineSegmentsElement && !(object instanceof LineSegments)) {
    throw new TypeError("XRLineSegmentsElement factory must return LineSegments")
  }
  if (element instanceof XRTextElement && !(object instanceof EngineText)) {
    throw new TypeError("XRTextElement factory must return Text")
  }
  if (element instanceof XRLightElement && !(object instanceof Light)) {
    throw new TypeError("XRLightElement factory must return Light")
  }
}

const updateBuiltInObjectResources = (
  runtime: DocumentSpaceRuntime,
  element: XRObjectElement,
  projection: ObjectProjection,
  geometry: LeafProjection<BufferGeometry> | null,
  material: LeafProjection<Material> | null,
  font: TrueTypeFont,
): void => {
  const object = projection.object
  if (object instanceof Mesh || object instanceof Line || object instanceof LineSegments) {
    const nextGeometry = requiredGeometry(element, geometry?.resource ?? null)
    const nextMaterial = requiredMaterial(element, material?.resource ?? null)
    if (object.geometry !== nextGeometry) {
      const previous = object.geometry
      object.geometry = nextGeometry
      runtime.engineRenderer.invalidateGeometry(previous)
    }
    object.material = nextMaterial
    return
  }
  if (object instanceof EngineText && element instanceof XRTextElement) {
    const nextMaterial = material?.resource
    if (!(nextMaterial instanceof TextMaterial)) {
      throw new TypeError("XRTextElement requires a TextMaterial resource")
    }
    object.material = nextMaterial
    if (
      object.text !== element.text ||
      object.font !== font ||
      object.fontSize !== element.fontSize ||
      object.letterSpacing !== element.letterSpacing
    ) {
      const previousStencil = object.stencilGeometry
      const previousCover = object.coverGeometry
      object.text = element.text
      object.font = font
      object.fontSize = element.fontSize
      object.letterSpacing = element.letterSpacing
      object.updateGeometry()
      if (previousStencil !== object.stencilGeometry) {
        runtime.engineRenderer.invalidateGeometry(previousStencil)
      }
      if (previousCover !== object.coverGeometry) {
        runtime.engineRenderer.invalidateGeometry(previousCover)
      }
    }
    return
  }
  if (object instanceof DirectionalLight && element instanceof XRLightElement) {
    object.color = new Color(element.color)
    object.intensity = element.intensity
    object.target.position.set(element.targetX, element.targetY, element.targetZ)
  }
}

const applyObjectState = (
  element: XRObjectElement,
  object: Object3D,
): void => {
  object.position.set(element.x, element.y, element.z)
  object.quaternion
    .set(element.quaternionX, element.quaternionY, element.quaternionZ, element.quaternionW)
    .normalize()
  object.scale.set(element.scaleX, element.scaleY, element.scaleZ)
  object.visible = element.visible
  object.name = element.name
}

const invalidateObjectGeometry = (
  runtime: DocumentSpaceRuntime,
  object: Object3D,
  recursive = false,
): void => {
  if (object instanceof Mesh || object instanceof Line || object instanceof LineSegments) {
    runtime.engineRenderer.invalidateGeometry(object.geometry)
  }
  if (object instanceof EngineText) {
    runtime.engineRenderer.invalidateGeometry(object.stencilGeometry)
    runtime.engineRenderer.invalidateGeometry(object.coverGeometry)
  }
  if (recursive) {
    for (const child of object.children) invalidateObjectGeometry(runtime, child, true)
  }
}

const synchronizeAnimations = (
  tree: SpaceTree,
  runtime: DocumentSpaceRuntime,
  objects: ReadonlyMap<XRObjectElement, ObjectProjection>,
  animations: Map<XRAnimationElement, AnimationProjection>,
): void => {
  const elements = tree.objects.flatMap(object => object.children.filter(
    (child): child is XRAnimationElement => child instanceof XRAnimationElement,
  ))
  const live = new Set(elements)
  for (const [element, projection] of animations) {
    if (live.has(element)) continue
    projection.action.stop()
    animations.delete(element)
  }

  for (const element of elements) {
    const ownerElement = element.parentElement
    if (!(ownerElement instanceof XRObjectElement)) {
      throw new TypeError("XRAnimationElement requires one XRObjectElement parent")
    }
    const owner = objects.get(ownerElement)?.object
    if (owner === undefined) throw new Error("Animation owner is not projected")
    const factory = element.factory
    if (factory === null) throw new TypeError("XRAnimationElement requires a clip factory")
    let projection = animations.get(element)
    if (
      projection === undefined ||
      projection.owner !== owner ||
      projection.factory !== factory ||
      projection.factoryRevision !== element.factoryRevision
    ) {
      projection?.action.stop()
      const clip = factory(element)
      if (!(clip instanceof AnimationClip)) {
        throw new TypeError("Animation factory must return AnimationClip")
      }
      if (!Number.isFinite(clip.duration) || clip.duration <= 0) {
        throw new RangeError("Semantic AnimationClip duration must be finite and positive")
      }
      const mixer = new AnimationMixer(owner)
      const action = mixer.clipAction(clip, owner)
      action.loop = element.loop
      action.timeScale = element.timeScale
      if (element.playing) action.play()
      projection = {
        element,
        owner,
        factory,
        factoryRevision: element.factoryRevision,
        clip,
        mixer,
        action,
        playing: element.playing,
      }
      animations.set(element, projection)
      continue
    }
    projection.action.loop = element.loop
    projection.action.timeScale = element.timeScale
    if (projection.playing !== element.playing) {
      if (element.playing) projection.action.play()
      else projection.action.stop()
      projection.playing = element.playing
    }
  }
  if ([...animations.values()].some(animation => animation.playing)) {
    runtime.requestRender()
  }
}

const releaseAnimations = (
  animations: Map<XRAnimationElement, AnimationProjection>,
): void => {
  for (const projection of animations.values()) projection.action.stop()
  animations.clear()
}

const releaseObjects = (
  runtime: DocumentSpaceRuntime,
  projections: Map<XRObjectElement, ObjectProjection>,
): void => {
  for (const [element, projection] of projections) {
    projection.object.parent?.remove(projection.object)
    invalidateObjectGeometry(runtime, projection.object, element instanceof XRAssetElement)
  }
  projections.clear()
}

const validateOptions = (
  options: CreateExperienceOptions,
  createRuntime: ExperienceRuntimeFactory,
  seams: ExperienceSeams,
): void => {
  if (options === null || typeof options !== "object") {
    throw new TypeError("Experience options are required")
  }
  if (typeof createRuntime !== "function") {
    throw new TypeError("Experience runtime factory is required")
  }
  if (
    seams === null ||
    typeof seams !== "object" ||
    typeof seams.createLinkedAuthorStyleSheetHost !== "function"
  ) {
    throw new TypeError("Experience seams are required")
  }
  if (
    options.canvas === null ||
    typeof options.canvas !== "object" ||
    typeof options.canvas.getContext !== "function"
  ) {
    throw new TypeError("Experience requires one HTMLCanvasElement-compatible canvas")
  }
  if (options.font === null || typeof options.font !== "object") {
    throw new TypeError("Experience requires one resolved TrueTypeFont")
  }
  if (options.styleSheets !== undefined && !Array.isArray(options.styleSheets)) {
    throw new TypeError("Experience styleSheets must be an array")
  }
  if (
    options.linkedAuthorStyleSheets !== undefined &&
    !Array.isArray(options.linkedAuthorStyleSheets)
  ) {
    throw new TypeError("Experience linkedAuthorStyleSheets must be an array")
  }
  if (
    options.onLinkedAuthorStyleSheetError !== undefined &&
    typeof options.onLinkedAuthorStyleSheetError !== "function"
  ) {
    throw new TypeError("Experience linked stylesheet error handler must be a function")
  }
}

const assertActive = (disposed: boolean): void => {
  if (disposed) throw new Error("Experience is disposed")
}
