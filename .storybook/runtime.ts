import {
  Renderer,
  ViewPoint,
  type Space,
} from "@engine/core"
import type {
  EngineStory,
  StoryScene,
} from "../storybook/story.ts"

export type EngineStorybookPreviewBounds = Readonly<{
  x: number
  y: number
  width: number
  height: number
  viewportWidth: number
  viewportHeight: number
}>

type EngineStorybookSemanticElement = {
  className: string
  setAttribute(name: string, value: string): void
}

export type EngineStorybookRuntimeContext = Readonly<{
  document: Readonly<{
    createElement(name: string): EngineStorybookSemanticElement
  }>
  browserDocument: globalThis.Document
  canvas: HTMLCanvasElement
  signal: AbortSignal
  mount(node: EngineStorybookSemanticElement): void
  publishInspector(value: unknown): void
  publishSource(value: unknown): void
  publishProps(value: unknown): void
  reportDiagnostic(value: unknown): void
  requestRender(): void
  subscribePreviewBounds(
    listener: (bounds: EngineStorybookPreviewBounds | null) => void,
  ): () => void
}>

export type EngineStorybookStoryInput = Readonly<{
  route: string
  story: unknown
  signal: AbortSignal
}>

export type EngineStorybookStage = Readonly<{
  readonly frames: number
  show(story: EngineStory, signal: AbortSignal): Promise<boolean>
  reset(signal: AbortSignal): Promise<boolean>
  clear(): void
  resize(width: number, height: number): void
  requestRender(): void
  dispose(): void
}>

export type EngineStorybookRuntimeDependencies = Readonly<{
  createNativeCanvas?(context: EngineStorybookRuntimeContext): HTMLCanvasElement
  createStage?(
    canvas: HTMLCanvasElement,
    context: EngineStorybookRuntimeContext,
  ): Promise<EngineStorybookStage>
}>

const PREVIEW_HOST_CSS = `
[data-engine-storybook-preview] {
  box-sizing: border-box;
  display: block;
  width: 100%;
  height: 100%;
  min-height: 220px;
  border: 1px solid #30343c;
  border-radius: 4px;
  background: #05080e;
}
`.trim()

/** Plain structural adapter loaded only in the exact @engine/core package tab. */
export function createEngineStorybookRuntime(
  dependencies: EngineStorybookRuntimeDependencies = {},
) {
  const createNativeCanvas = dependencies.createNativeCanvas ?? defaultNativeCanvas
  const createStage = dependencies.createStage ?? ((canvas, context) =>
    EngineWebGpuStage.create(canvas, context.browserDocument))
  return Object.freeze({
    protocol: "storybook-runtime/1" as const,
    async create(context: EngineStorybookRuntimeContext) {
      const canvas = createNativeCanvas(context)
      const stage = await createStage(canvas, context)
      const preview = context.document.createElement("section")
      preview.className = "engine-storybook-preview"
      preview.setAttribute("data-engine-storybook-preview", "")
      preview.setAttribute("aria-label", "Живая сцена @engine/core")
      let bounds: EngineStorybookPreviewBounds | null = null
      let mounted = false
      let currentStory: EngineStory | null = null
      let currentRoute = ""
      let disposed = false

      const position = (): void => {
        if (!mounted || bounds === null || bounds.width <= 0 || bounds.height <= 0) {
          hideNativeCanvas(canvas)
          return
        }
        const rect = context.canvas.getBoundingClientRect()
        const scaleX = rect.width / Math.max(1, bounds.viewportWidth)
        const scaleY = rect.height / Math.max(1, bounds.viewportHeight)
        const width = Math.max(1, bounds.width * scaleX)
        const height = Math.max(1, bounds.height * scaleY)
        canvas.style.left = `${rect.left + bounds.x * scaleX}px`
        canvas.style.top = `${rect.top + bounds.y * scaleY}px`
        canvas.style.width = `${width}px`
        canvas.style.height = `${height}px`
        canvas.hidden = false
        canvas.style.visibility = "visible"
        stage.resize(width, height)
        stage.requestRender()
      }
      const publish = (story: EngineStory): void => {
        context.publishInspector(Object.freeze({
          context: story.title,
          entries: Object.freeze([
            Object.freeze({id: "route", label: "Маршрут", value: `/${currentRoute}`}),
            Object.freeze({id: "story-id", label: "Story ID", value: story.id}),
            Object.freeze({id: "group", label: "Группа", value: story.group}),
            Object.freeze({id: "source-file", label: "Файл", value: story.sourceFile}),
            Object.freeze({id: "tags", label: "Теги", value: story.tags.join(", ") || "—"}),
          ]),
        }))
        context.publishSource(Object.freeze({
          html: `<canvas id="engine-story-canvas" data-story="${story.id}"></canvas>`,
          css: "#engine-story-canvas { width: 100%; height: 100%; background: #05080e; touch-action: none; }",
          typescript: story.source,
        }))
        context.publishProps(Object.freeze({
          id: story.id,
          group: story.group,
          icon: story.icon,
          materialIcon: story.materialIcon,
          frames: stage.frames,
        }))
      }
      const show = async (input: EngineStorybookStoryInput): Promise<void> => {
        assertActive(disposed)
        const story = engineStory(input.story)
        currentStory = story
        currentRoute = exactRoute(input.route)
        mounted = false
        hideNativeCanvas(canvas)
        context.mount(preview)
        context.requestRender()
        const committed = await stage.show(story, input.signal)
        if (!committed || input.signal.aborted || disposed) return
        mounted = true
        position()
        publish(story)
      }
      const unmount = (): void => {
        if (disposed) return
        mounted = false
        currentStory = null
        currentRoute = ""
        stage.clear()
        hideNativeCanvas(canvas)
        context.publishInspector(null)
        context.publishSource(null)
        context.publishProps(null)
      }
      const unsubscribeBounds = context.subscribePreviewBounds((next) => {
        bounds = next
        position()
      })
      const onReset = (): void => {
        const story = currentStory
        if (story === null || disposed) return
        void stage.reset(context.signal).then((committed) => {
          if (!committed || disposed || currentStory !== story) return
          publish(story)
        }).catch((error) => context.reportDiagnostic(error))
      }
      canvas.addEventListener("dblclick", onReset)
      const dispose = (): void => {
        if (disposed) return
        disposed = true
        mounted = false
        context.signal.removeEventListener("abort", dispose)
        canvas.removeEventListener("dblclick", onReset)
        unsubscribeBounds()
        stage.dispose()
        canvas.remove()
      }
      context.signal.addEventListener("abort", dispose, {once: true})

      return Object.freeze({
        styleSheets: Object.freeze([PREVIEW_HOST_CSS]),
        mount: show,
        update: show,
        unmount,
        dispose,
      })
    },
  })
}

export const runtime = createEngineStorybookRuntime()

/** Selection state rejects scenes that resolve after a newer route operation. */
export class EngineStorySceneState {
  #story: EngineStory | null = null
  #version = 0

  async show(story: EngineStory): Promise<StoryScene | null> {
    const version = ++this.#version
    this.#story = story
    try {
      const scene = await story.createScene()
      return version === this.#version ? scene : null
    } catch (error) {
      if (version !== this.#version) return null
      throw error
    }
  }

  async reset(): Promise<StoryScene | null> {
    if (this.#story === null) return null
    return this.show(this.#story)
  }

  invalidate(): void {
    this.#version += 1
  }

  clear(): void {
    this.#story = null
    this.#version += 1
  }
}

class EngineWebGpuStage implements EngineStorybookStage {
  readonly #canvas: HTMLCanvasElement
  readonly #browserDocument: globalThis.Document
  readonly #renderer = new Renderer()
  readonly #storyState = new EngineStorySceneState()
  readonly #requestFromInput = (): void => this.requestRender()
  #scene: StoryScene | null = null
  #viewPoint: ViewPoint | null = null
  #rafId = 0
  #presentedFrames = 0
  #disposed = false

  private constructor(canvas: HTMLCanvasElement, browserDocument: globalThis.Document) {
    this.#canvas = canvas
    this.#browserDocument = browserDocument
    canvas.addEventListener("wheel", this.#requestFromInput, {passive: true})
    canvas.addEventListener("mousedown", this.#requestFromInput)
    canvas.addEventListener("touchstart", this.#requestFromInput, {passive: true})
    browserDocument.addEventListener("mousemove", this.#requestFromInput)
    browserDocument.addEventListener("mouseup", this.#requestFromInput)
    browserDocument.addEventListener("touchmove", this.#requestFromInput, {passive: true})
    browserDocument.addEventListener("touchend", this.#requestFromInput)
  }

  static async create(
    canvas: HTMLCanvasElement,
    browserDocument: globalThis.Document,
  ): Promise<EngineWebGpuStage> {
    const stage = new EngineWebGpuStage(canvas, browserDocument)
    await stage.#renderer.init(canvas)
    stage.#renderer.setPixelRatio(Math.min(browserDocument.defaultView?.devicePixelRatio || 1, 2))
    stage.resize(1, 1)
    return stage
  }

  get frames(): number {
    return this.#presentedFrames
  }

  async show(story: EngineStory, signal: AbortSignal): Promise<boolean> {
    const scene = await this.#storyState.show(story)
    if (scene === null || signal.aborted || this.#disposed) {
      if (signal.aborted) this.#storyState.invalidate()
      return false
    }
    this.#scene = scene
    this.#replaceViewPoint()
    this.#renderNow()
    return true
  }

  async reset(signal: AbortSignal): Promise<boolean> {
    const scene = await this.#storyState.reset()
    if (scene === null || signal.aborted || this.#disposed) return false
    this.#scene = scene
    this.#replaceViewPoint()
    this.#renderNow()
    return true
  }

  clear(): void {
    this.#storyState.clear()
    this.#scene = null
    this.#viewPoint?.dispose()
    this.#viewPoint = null
    if (this.#rafId !== 0) cancelAnimationFrame(this.#rafId)
    this.#rafId = 0
  }

  resize(width: number, height: number): void {
    if (this.#disposed) return
    const nextWidth = Math.max(1, Math.round(width))
    const nextHeight = Math.max(1, Math.round(height))
    this.#renderer.setSize(nextWidth, nextHeight)
    this.#viewPoint?.setAspectRatio(nextWidth / nextHeight)
    this.#scene?.resize?.({width: this.#canvas.width, height: this.#canvas.height})
  }

  requestRender(): void {
    if (this.#disposed || this.#rafId !== 0) return
    this.#rafId = requestAnimationFrame(() => {
      this.#rafId = 0
      this.#renderNow()
    })
  }

  dispose(): void {
    if (this.#disposed) return
    this.#disposed = true
    this.clear()
    this.#canvas.removeEventListener("wheel", this.#requestFromInput)
    this.#canvas.removeEventListener("mousedown", this.#requestFromInput)
    this.#canvas.removeEventListener("touchstart", this.#requestFromInput)
    this.#browserDocument.removeEventListener("mousemove", this.#requestFromInput)
    this.#browserDocument.removeEventListener("mouseup", this.#requestFromInput)
    this.#browserDocument.removeEventListener("touchmove", this.#requestFromInput)
    this.#browserDocument.removeEventListener("touchend", this.#requestFromInput)
  }

  #replaceViewPoint(): void {
    this.#viewPoint?.dispose()
    const scene = this.#scene
    if (scene === null) {
      this.#viewPoint = null
      return
    }
    this.#viewPoint = new ViewPoint({
      element: this.#canvas,
      position: scene.camera.position,
      target: scene.camera.target,
      near: scene.camera.near ?? 1,
      far: scene.camera.far ?? 2000,
      fov: Math.PI / 4,
    })
  }

  #renderNow(): void {
    if (this.#disposed || this.#scene === null || this.#viewPoint === null) return
    renderEngineStoryScene(this.#renderer, this.#scene, this.#viewPoint)
    this.#presentedFrames += 1
  }
}

export function renderEngineStoryScene(
  renderer: Pick<Renderer, "render">,
  scene: Readonly<{space: Space}>,
  viewPoint: ViewPoint,
): void {
  scene.space.updateWorldMatrix()
  renderer.render(scene.space, viewPoint)
}

function defaultNativeCanvas(context: EngineStorybookRuntimeContext): HTMLCanvasElement {
  const canvas = context.browserDocument.createElement("canvas")
  canvas.id = "engine-story-canvas"
  canvas.setAttribute("aria-label", "Живая сцена @engine/core")
  canvas.style.position = "fixed"
  canvas.style.zIndex = "2"
  canvas.style.width = "1px"
  canvas.style.height = "1px"
  canvas.style.visibility = "hidden"
  canvas.style.border = "0"
  canvas.style.borderRadius = "3px"
  canvas.style.background = "#05080e"
  canvas.style.boxShadow = "inset 0 0 0 1px rgb(255 255 255 / 8%)"
  canvas.style.touchAction = "none"
  canvas.hidden = true
  context.canvas.after(canvas)
  return canvas
}

function hideNativeCanvas(canvas: HTMLCanvasElement): void {
  canvas.hidden = true
  canvas.style.visibility = "hidden"
}

function engineStory(value: unknown): EngineStory {
  if (value === null || typeof value !== "object") {
    throw new TypeError("Engine Storybook story must be an object")
  }
  const story = value as Partial<EngineStory>
  for (const [label, field] of [
    ["id", story.id],
    ["title", story.title],
    ["description", story.description],
    ["sourceFile", story.sourceFile],
    ["source", story.source],
    ["materialIcon", story.materialIcon],
  ] as const) {
    if (typeof field !== "string" || field.length === 0) {
      throw new TypeError(`Engine Storybook story ${label} must be text`)
    }
  }
  if (!Array.isArray(story.tags) || story.tags.some((tag) => typeof tag !== "string")) {
    throw new TypeError("Engine Storybook story tags must be text")
  }
  if (!["Foundations", "Geometry", "Materials", "Text"].includes(String(story.group))) {
    throw new TypeError("Engine Storybook story group is invalid")
  }
  if (!["architecture", "geometry", "hologram", "text", "thin-film"].includes(String(story.icon))) {
    throw new TypeError("Engine Storybook story icon is invalid")
  }
  if (typeof story.createScene !== "function") {
    throw new TypeError("Engine Storybook story createScene must be a function")
  }
  return story as EngineStory
}

function exactRoute(value: string): string {
  if (typeof value !== "string" || value.length === 0 || value.startsWith("/") ||
    value.endsWith("/") || value.includes("//")) {
    throw new Error(`Invalid Engine Storybook route: ${String(value)}`)
  }
  return value
}

function assertActive(disposed: boolean): void {
  if (disposed) throw new Error("Engine Storybook runtime is disposed")
}
