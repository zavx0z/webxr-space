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
  Quaternion,
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
import {createRoot, provideContext, type ComponentRoot, type ComponentValue} from "@zavx0z/component"
import {createRootEnvironment, rootContext, type RootEnvironment, type RootSize, type FrameLoop} from "./root-context.ts"
import type {JsxSourceElement} from "@zavx0z/template/jsx-runtime"
import {loadDocumentDefaultFont} from "@zavx0z/engine/default-font"
import {claimBrowserPresentationHost, type PresentationHostClaim} from "./presentation-host.ts"
import type {
  PointerInput,
  RenderFrame,
  WheelInput,
} from "@zavx0z/renderer"
import {
  createSpaceElementFactories,
  readSpaceTree,
  readDisplayProjection,
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

export type AttachOptions = Readonly<{
  canvas: HTMLCanvasElement
  app: JsxSourceElement | ComponentValue
  font?: TrueTypeFont
  fontFaces?: readonly RendererFontFace[] | undefined
  fontSources?: readonly BrowserFontFaceSource[] | undefined
  stylesheets?: readonly (string | RootLinkedAuthorStyleSheet)[]
  onStyleSheetError?: RootLinkedAuthorStyleSheetErrorHandler
  frameloop?: FrameLoop
  pixelRatio?: number
}>

export type RootLinkedAuthorStyleSheet = Readonly<{
  id: string
  link: HTMLLinkElement
}>

export type RootLinkedAuthorStyleSheetErrorHandler = (
  error: Error,
  source: RootLinkedAuthorStyleSheet | null,
) => void

export type RootProjectionKind = "display" | "hud" | "space"

/** x/y заданы в CSS px относительно browser window; это не локальные координаты Display. */
export type RootPointerInput = Readonly<{
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

export type RootWheelInput = Readonly<{
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

export type RootKeyInput = Readonly<{
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

/** Читает существующую проекцию того же Document, не создавая Renderer или отдельный ввод. */
export type RootDocumentProjection = Readonly<{
  kind: "display" | "hud"
  owner: XRDisplayElement | XRHUDElement
  readFrame(): RenderFrame | null
  subscribeFrames(listener: (frame: RenderFrame) => void): () => void
  projectPoint(point: Readonly<{x: number; y: number}>): Readonly<{x: number; y: number}> | null
}>

export type RootSpaceProjection = Readonly<{
  kind: "space"
  owner: XRSpaceElement
  orbit(deltaX: number, deltaY: number): void
  pan(deltaX: number, deltaY: number): void
  zoom(delta: number, anchor?: Readonly<{clientX: number; clientY: number}>): void
}>

export type RootProjection = RootDocumentProjection | RootSpaceProjection

export type RootInput = Readonly<{
  pointerDown(input: RootPointerInput): void
  pointerMove(input: RootPointerInput): void
  pointerUp(input: RootPointerInput): void
  pointerCancel(input: RootPointerInput): void
  wheel(input: RootWheelInput): void
}>

/**
Управление готовым подключением после attach.

Document, Space и ViewPoint — ссылки на уже смонтированное авторское дерево.
invalidate запрашивает кадр, render/resize нужны для явного управления и диагностики.
unmount освобождает ресурсы и подписки; повторный вызов безопасен.
*/
export type Root = Readonly<{
  input: RootInput
  canvas: HTMLCanvasElement
  document: Document
  space: XRSpaceElement
  viewPoint: XRViewPointElement
  presentedFrame: number
  disposed: boolean
  getProjection(owner: XRSpaceElement): RootSpaceProjection
  getProjection(owner: XRDisplayElement | XRHUDElement): RootDocumentProjection
  subscribePresented(listener: (sequence: number) => void): () => void
  dispatchKey(
    owner: XRDisplayElement | XRHUDElement,
    target: SemanticHTMLElement,
    input: RootKeyInput,
  ): boolean
  resetViewPoint(): void
  render(): void
  invalidate(): void
  resize(): void
  captureLastPresentedFramePng(): Promise<Blob | null>
  unmount(): void
}>

type RootRuntimeFactory = (
  options: CreateDocumentSpaceRuntimeOptions,
  claim: PresentationHostClaim,
) => Promise<DocumentSpaceRuntime>

type RootSeams = Readonly<{
  createLinkedAuthorStyleSheetHost(options: Readonly<{
    canvas: HTMLCanvasElement
    document: Document
    sources: readonly RootLinkedAuthorStyleSheet[]
    onError?: RootLinkedAuthorStyleSheetErrorHandler
  }>): BrowserLinkedAuthorStyleSheetHost
}>

const defaultRootSeams: RootSeams = Object.freeze({
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

/**
Подключает авторский App к Canvas и возвращает управление готовым приложением.

До монтирования создаёт контекст размера и общих кадров. Затем проверяет единственные
Space и ViewPoint, загружает объявленные стили и шрифты и представляет первый кадр.
Строки `stylesheets` — URL: Browser создаёт настоящие native links и удаляет их
при `unmount`. Переданные готовые links заимствуются и не удаляются.
Мировая система всегда правая Z-up, пространственные расстояния заданы в мм.

@returns Root после первого представленного кадра. `unmount()` идемпотентен и
освобождает компоненты, подписки, GPU runtime и право повторно подключить Canvas.
@throws Error При занятом Canvas, неверном App, ошибке ресурсов или первого кадра.
Созданные подключением ресурсы освобождаются и при ошибке.
@example
```tsx
const root = await attach({canvas, app: <App />, stylesheets: [themeUrl]})
// Когда приложение больше не нужно:
root.unmount()
```
*/
export async function attach(
  options: AttachOptions,
): Promise<Root> {
  return attachWithRuntimeFactory(options, async (runtimeOptions, claim) => {
    const {createDocumentSpaceRuntime} = await import("./space-runtime.ts")
    return createDocumentSpaceRuntime(runtimeOptions, claim)
  })
}

/** Подмена GPU runtime для тестов владельца; из публичного Browser API не экспортируется. */
export async function attachWithRuntimeFactory(
  options: AttachOptions,
  createRuntime: RootRuntimeFactory,
  seams: RootSeams = defaultRootSeams,
): Promise<Root> {
  validateOptions(options, createRuntime, seams)
  const size = readRootSize(options)
  const claim = claimBrowserPresentationHost(options.canvas)
  const document = createDocument({
    elementFactories: createSpaceElementFactories(),
  })
  const environment = createRootEnvironment(document, size, options.frameloop ?? "demand")
  const appRoot = createRoot(document)
  try {
    appRoot.render(provideContext(rootContext, environment, options.app as ComponentValue))
    appRoot.flush()
    readSpaceTree(document)
    const font = options.font ?? await loadDocumentDefaultFont(options.canvas.ownerDocument)
    return await createAttachedRoot({...options, font}, document, appRoot, environment, claim, createRuntime, seams)
  } catch (error) {
    try { appRoot.unmount() } finally { environment.dispose()
      claim.release() }
    throw error
  }
}

const createAttachedRoot = async (
  options: AttachOptions & {font: TrueTypeFont},
  document: Document,
  appRoot: ComponentRoot,
  environment: RootEnvironment,
  claim: PresentationHostClaim,
  createRuntime: RootRuntimeFactory,
  seams: RootSeams,
): Promise<Root> => {
  const {space, viewPoint} = readSpaceTree(document)
  const initialViewPoint = semanticViewPointSnapshot(viewPoint)
  const ownedLinks: HTMLLinkElement[] = []
  let linkedSources: readonly RootLinkedAuthorStyleSheet[] = []
  let linkedAuthorStyleSheetHost: BrowserLinkedAuthorStyleSheetHost | null = null
  let runtime: DocumentSpaceRuntime
  let synchronizeCamera = () => {}
  try {
    linkedSources = (options.stylesheets ?? []).map(source => {
      if (typeof source !== "string") return source
      const link = options.canvas.ownerDocument.createElement("link")
      link.rel = "stylesheet"
      link.href = source
      ownedLinks.push(link)
      options.canvas.ownerDocument.head.append(link)
      return Object.freeze({id: link.href, link})
    })
    if (linkedSources.length > 0) {
      linkedAuthorStyleSheetHost = seams.createLinkedAuthorStyleSheetHost({
        canvas: options.canvas,
        document,
        sources: linkedSources,
        ...(options.onStyleSheetError === undefined
          ? {}
          : {onError: options.onStyleSheetError}),
      })
      await linkedAuthorStyleSheetHost.ready
    }
    if (options.fontFaces !== undefined && options.fontSources !== undefined) {
      throw new TypeError("Root accepts either fontFaces or fontSources")
    }
    const fontFaces = options.fontFaces ?? (options.fontSources === undefined
      ? undefined
      : await loadFontFaces(options.fontSources, options.canvas.ownerDocument?.baseURI))
    runtime = await createRuntime({
      canvas: options.canvas,
      document,
      styleSheets: Object.freeze([]),
      onViewportChange(size) {
        synchronizeCamera()
        environment.resize(size)
      },
      font: options.font,
      ...(fontFaces === undefined ? {} : {fontFaces}),
      ...(options.pixelRatio === undefined ? {} : {pixelRatio: options.pixelRatio}),

    }, claim)
  } catch (error) {
    linkedAuthorStyleSheetHost?.dispose()
    for (const link of ownedLinks) link.remove()
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
    RootDocumentProjection
  >()
  const presentedListeners = new Set<(sequence: number) => void>()
  let presentedFrame = runtime.presentedFrames
  let viewPointSignature: string | null = null
  let writingPresentedViewPoint = false
  let disposed = false
  let inFrame = false
  let synchronizing = false
  let tree = readSpaceTree(document)
  let structureDirty = true
  let cameraDirty = true
  let displayDirty = true
  let hudDirty = true
  let backgroundDirty = true
  let animationDirty = true
  const dirtyObjects = new Set<XRObjectElement>()
  const guardedObjects = new Map<Object3D, Readonly<{children: readonly Object3D[]; tag: string}>>()

  synchronizeCamera = () => {
    if (cameraDirty || disposed) return
    const snapshot = runtime.snapshotViewPoint()
    const signature = viewPointSnapshotSignature(snapshot)
    if (signature === viewPointSignature) return
    viewPointSignature = signature
    writingPresentedViewPoint = true
    try {
      document.transaction(() => writeViewPointSnapshot(tree, snapshot))
    } finally {
      writingPresentedViewPoint = false
    }
  }

  const synchronize = (): void => {
    assertActive(disposed)
    if (synchronizing || document.documentElement === null) return
    synchronizing = true
    try {
      const structural = structureDirty
      if (structural) {
        tree = readSpaceTree(document)
        structureDirty = false
        cameraDirty = displayDirty = hudDirty = backgroundDirty = animationDirty = true
      }
      if (backgroundDirty) {
        runtime.space.background = new Color(tree.space.background)
        backgroundDirty = false
      }
      if (cameraDirty) {
        synchronizeViewPoint(tree, runtime, value => { viewPointSignature = value }, viewPointSignature)
        runtime.setCameraGesturesEnabled(tree.viewPoint.controls)
        cameraDirty = false
      }
      const projectionsDirty = displayDirty || hudDirty
      if (displayDirty) {
        if (!structural) tree = {...tree, displays: tree.displays.map(({element}) => readDisplayProjection(element))}
        synchronizeDisplays(tree, runtime)
        displayDirty = false
      }
      if (hudDirty) {
        if (tree.hud !== null) tree = {...tree, hud: {...tree.hud, distance: tree.hud.element.distance}}
        synchronizeHud(tree, runtime)
        hudDirty = false
      }
      if (projectionsDirty) synchronizeProjectionBindings(tree, runtime, projectionBindings, projectionListeners)
      if (structural || dirtyObjects.size > 0) {
        synchronizeObjects(tree, runtime, objects, options.font, guardedObjects, structural ? undefined : dirtyObjects)
        dirtyObjects.clear()
      }
      if (animationDirty) {
        synchronizeAnimations(tree, runtime, objects, animations)
        animationDirty = false
      }
    } finally {
      synchronizing = false
    }
  }

  const unsubscribeBeforeRender = runtime.subscribeBeforeRender(() => {
    inFrame = true
    try {
      synchronize()
      synchronizeCamera()
      const delta = environment.frame(space, viewPoint, typeof performance === "undefined" ? Date.now() : performance.now())
      synchronize()
      for (const animation of animations.values()) {
        if (animation.playing) animation.mixer.update(delta)
      }
      for (const [object, {children, tag}] of guardedObjects) {
        if (object.children.length !== children.length || object.children.some((child, index) => child !== children[index])) {
          object.parent?.remove(object)
          throw new Error(`${tag} projection acquired an opaque Engine child after validation`)
        }
      }
    } finally {
      inFrame = false
    }
  })

  const unsubscribeMutations = document.subscribeMutations(batch => {
    if (disposed || writingPresentedViewPoint) return
    for (const record of batch.records) {
      const target = record.target
      if (target !== document && !space.contains(target)) continue
      if (record.type === "childList") {
        if (target === document || target instanceof XRSpaceElement || target instanceof XRObjectElement) structureDirty = true
        continue
      }
      if (record.type !== "attributes") continue
      if (target instanceof XRSpaceElement) backgroundDirty = true
      else if (target instanceof XRViewPointElement) cameraDirty = true
      else if (target instanceof XRDisplayElement) {
        displayDirty = true
        if (record.attributeName === "id") structureDirty = true
      } else if (target instanceof XRHUDElement) {
        hudDirty = true
        if (record.attributeName === "id") structureDirty = true
      } else if (target instanceof XRObjectElement) {
        dirtyObjects.add(target)
        if (record.attributeName === "factory-revision") animationDirty = true
      } else if (target instanceof XRAnimationElement) animationDirty = true
      else if (target instanceof XRGeometryElement || target instanceof XRMaterialElement) {
        if (target.parentElement instanceof XRObjectElement) dirtyObjects.add(target.parentElement)
        animationDirty = true
      }
    }
    if (!inFrame) {
      synchronize()
      runtime.requestRender()
    }
  })

  const unsubscribePresented = runtime.subscribePresented(sequence => {
    if (disposed || document.documentElement === null) return
    presentedFrame = sequence
    for (const listener of presentedListeners) listener(sequence)
    if (environment.read().frameloop === "always" || environment.pendingFrame() ||
      [...animations.values()].some(animation => animation.playing)) runtime.requestRender()
  })
  environment.connect(runtime.requestRender)

  const requireDocumentProjectionRuntime = (
    owner: XRDisplayElement | XRHUDElement,
  ): ProjectionRuntime => {
    assertActive(disposed)
    if (owner.ownerDocument !== document) {
      throw new Error("Projection owner belongs to another Document")
    }
    const binding = projectionBindings.get(owner)
    if (binding === undefined || binding.runtime.root !== owner) {
      throw new Error("Projection owner is not active in this Root")
    }
    return binding.runtime
  }

  const createProjectionHandle = (
    owner: XRDisplayElement | XRHUDElement,
  ): RootDocumentProjection => {
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
      projectPoint(point: Readonly<{x: number; y: number}>) {
        requireDocumentProjectionRuntime(owner)
        validatePoint(point)
        return runtime.projectPoint(owner.id, point)
      },
    })
  }

  const spaceProjection: RootSpaceProjection = Object.freeze({
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

  function getProjection(owner: XRSpaceElement): RootSpaceProjection
  function getProjection(
    owner: XRDisplayElement | XRHUDElement,
  ): RootDocumentProjection
  function getProjection(
    owner: XRSpaceElement | XRDisplayElement | XRHUDElement,
  ): RootProjection {
    if (owner instanceof XRSpaceElement) {
      if (owner !== space) throw new Error("Space projection belongs to another Root")
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

  const experience: Root = Object.freeze({
    input: Object.freeze({
      pointerDown: (input: RootPointerInput) => runtime.dispatchPointer("pointerdown", clientPointerInput({...input, buttons: input.buttons ?? 1})),
      pointerMove: (input: RootPointerInput) => runtime.dispatchPointer("pointermove", clientPointerInput(input)),
      pointerUp: (input: RootPointerInput) => runtime.dispatchPointer("pointerup", clientPointerInput(input)),
      pointerCancel: (input: RootPointerInput) => runtime.dispatchPointer("pointercancel", clientPointerInput(input)),
      wheel: (input: RootWheelInput) => runtime.dispatchWheel(clientWheelInput(input)),
    }),
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
        throw new Error("Semantic key target does not own the Root native proxy")
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
    invalidate: environment.read().invalidate,
    resize() {
      assertActive(disposed)
      runtime.resize()
    },
    captureLastPresentedFramePng() {
      assertActive(disposed)
      return runtime.captureLastPresentedFramePng()
    },
    unmount() {
      if (disposed) return
      disposed = true
      unsubscribeMutations()
      unsubscribeBeforeRender()
      unsubscribePresented()
      releaseAnimations(animations)
      releaseObjects(runtime, objects)
      releaseProjectionBindings(projectionBindings)
      try {
        appRoot.unmount()
      } finally {
        try { runtime.dispose() } finally {
          try { linkedAuthorStyleSheetHost?.dispose() } finally {
            environment.dispose()
            guardedObjects.clear()
            dirtyObjects.clear()
            for (const link of ownedLinks) link.remove()
            projectionListeners.clear()
            projectionHandles.clear()
            presentedListeners.clear()
            claim.release()
          }
        }
      }
    },
  })

  try {
    synchronize()
    const before = presentedFrame
    runtime.render()
    if (presentedFrame <= before) throw new Error("attach did not present the application's first frame")
    return experience
  } catch (error) {
    experience.unmount()
    throw error
  }
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
      quaternion: display.transform.quaternion,
      position: display.transform.position,
      visible: display.transform.visible,
    }
    const orientation = new Quaternion(
      transform.quaternion.x, transform.quaternion.y, transform.quaternion.z, transform.quaternion.w,
    ).normalize()
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
      current.plane.quaternion.x !== orientation.x ||
      current.plane.quaternion.y !== orientation.y ||
      current.plane.quaternion.z !== orientation.z ||
      current.plane.quaternion.w !== orientation.w ||
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

const clientPointerInput = (
  input: RootPointerInput,
): PointerInput => {
  validatePoint(input)
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

const clientWheelInput = (
  input: RootWheelInput,
): WheelInput => {
  validatePoint(input)
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

const validatePoint = (input: Readonly<{x: number; y: number}>): void => {
  if (input === null || typeof input !== "object" || !Number.isFinite(input.x) || !Number.isFinite(input.y)) {
    throw new TypeError("Input point must contain finite client coordinates")
  }
}

const synchronizeObjects = (
  tree: SpaceTree,
  runtime: DocumentSpaceRuntime,
  projections: Map<XRObjectElement, ObjectProjection>,
  font: TrueTypeFont,
  guardedObjects: Map<Object3D, Readonly<{children: readonly Object3D[]; tag: string}>>,
  changed?: ReadonlySet<XRObjectElement>,
): void => {
  let hierarchyChanged = changed === undefined
  const live = changed === undefined ? new Set(tree.objects) : null
  if (live !== null) for (const [element, projection] of projections) {
    if (live.has(element)) continue
    projection.object.parent?.remove(projection.object)
    invalidateObjectGeometry(runtime, projection.object, element instanceof XRAssetElement)
    projections.delete(element)
  }

  for (const element of changed ?? tree.objects) {
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
      hierarchyChanged = true
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

  if (!hierarchyChanged) return
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
  guardedObjects.clear()
  for (const [element, projection] of projections) {
    if (projection.factory !== null && !(element instanceof XRAssetElement)) {
      guardedObjects.set(projection.object, {children: [...projection.object.children], tag: element.localName})
    }
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
  options: AttachOptions,
  createRuntime: RootRuntimeFactory,
  seams: RootSeams,
): void => {
  if (options === null || typeof options !== "object") {
    throw new TypeError("Root options are required")
  }
  if (typeof createRuntime !== "function") {
    throw new TypeError("Root runtime factory is required")
  }
  if (
    seams === null ||
    typeof seams !== "object" ||
    typeof seams.createLinkedAuthorStyleSheetHost !== "function"
  ) {
    throw new TypeError("Root seams are required")
  }
  if (
    options.canvas === null ||
    typeof options.canvas !== "object" ||
    typeof options.canvas.getContext !== "function"
  ) {
    throw new TypeError("Root requires one HTMLCanvasElement-compatible canvas")
  }
  if (options.font !== undefined && (options.font === null || typeof options.font !== "object")) {
    throw new TypeError("Root requires one resolved TrueTypeFont")
  }
  if (
    options.stylesheets !== undefined &&
    !Array.isArray(options.stylesheets)
  ) {
    throw new TypeError("Root stylesheets must be an array")
  }
  if (options.frameloop !== undefined && options.frameloop !== "demand" && options.frameloop !== "always") {
    throw new TypeError("frameloop must be demand or always")
  }
  if (
    options.onStyleSheetError !== undefined &&
    typeof options.onStyleSheetError !== "function"
  ) {
    throw new TypeError("Root linked stylesheet error handler must be a function")
  }
}

const assertActive = (disposed: boolean): void => {
  if (disposed) throw new Error("Root is disposed")
}


const readRootSize = (options: AttachOptions): RootSize => {
  const rect = options.canvas.getBoundingClientRect()
  const dimension = (value: number) => Number.isFinite(value) && value > 0 ? Math.max(1, Math.round(value)) : 1
  return {
    width: dimension(rect.width),
    height: dimension(rect.height),
    left: rect.left ?? 0,
    top: rect.top ?? 0,
    dpr: options.pixelRatio ?? options.canvas.ownerDocument?.defaultView?.devicePixelRatio ?? 1,
  }
}
