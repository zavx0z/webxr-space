import type {Space} from "@engine/core"
import type {
  EngineStory,
  StoryScene,
} from "../storybook/story.ts"

type EngineStorybookSemanticElement = {
  className: string
  setAttribute(name: string, value: string): void
}

type EngineStorybookWorldPreview = Readonly<{
  readonly frames: number
  readonly disposed: boolean
  requestRender(): void
  resetViewPoint(): void
  dispose(): void
}>

type EngineStorybookWorldViewport = Readonly<{
  x: number
  y: number
  width: number
  height: number
  backingX: number
  backingY: number
  backingWidth: number
  backingHeight: number
  pixelRatio: number
}>

export type EngineStorybookRuntimeContext = Readonly<{
  document: Readonly<{
    createElement(name: string): EngineStorybookSemanticElement
  }>
  signal: AbortSignal
  mount(node: EngineStorybookSemanticElement): void
  publishInspector(value: unknown): void
  publishSource(value: unknown): void
  publishProps(value: unknown): void
  reportDiagnostic(value: unknown): void
  requestRender(): void
  mountWorldPreview(registration: Readonly<{
    node: EngineStorybookSemanticElement
    space: Space
    camera: StoryScene["camera"]
    cameraGestures?: boolean
    resize?(viewport: EngineStorybookWorldViewport): void
    onDoubleClick?(): void
  }>): EngineStorybookWorldPreview
}>

export type EngineStorybookStoryInput = Readonly<{
  route: string
  story: unknown
  signal: AbortSignal
}>

export type EngineStorybookStage = Readonly<{
  readonly frames: number
  show(
    story: EngineStory,
    signal: AbortSignal,
    node: EngineStorybookSemanticElement,
  ): Promise<boolean>
  reset(signal: AbortSignal, node: EngineStorybookSemanticElement): Promise<boolean>
  clear(): void
  requestRender(): void
  dispose(): void
}>

export type EngineStorybookRuntimeDependencies = Readonly<{
  createStage?(context: EngineStorybookRuntimeContext): Promise<EngineStorybookStage>
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
  background: transparent;
}
`.trim()

/** Plain structural adapter loaded only in the exact @engine/core package tab. */
export function createEngineStorybookRuntime(
  dependencies: EngineStorybookRuntimeDependencies = {},
) {
  const createStage = dependencies.createStage ?? (async (context) =>
    new EngineHostedStage(context))
  return Object.freeze({
    protocol: "storybook-runtime/1" as const,
    async create(context: EngineStorybookRuntimeContext) {
      const stage = await createStage(context)
      const preview = context.document.createElement("section")
      preview.className = "engine-storybook-preview"
      preview.setAttribute("data-engine-storybook-preview", "")
      preview.setAttribute("aria-label", "Живая сцена @engine/core")
      let currentStory: EngineStory | null = null
      let currentRoute = ""
      let disposed = false

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
          html: `<section data-engine-storybook-preview data-story="${story.id}"></section>`,
          css: PREVIEW_HOST_CSS,
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
        const committed = await stage.show(story, input.signal, preview)
        if (!committed || input.signal.aborted || disposed) return
        publish(story)
      }
      const unmount = (): void => {
        if (disposed) return
        currentStory = null
        currentRoute = ""
        stage.clear()
        context.publishInspector(null)
        context.publishSource(null)
        context.publishProps(null)
      }
      const dispose = (): void => {
        if (disposed) return
        disposed = true
        context.signal.removeEventListener("abort", dispose)
        stage.dispose()
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

class EngineHostedStage implements EngineStorybookStage {
  readonly #context: EngineStorybookRuntimeContext
  readonly #storyState = new EngineStorySceneState()
  #scene: StoryScene | null = null
  #preview: EngineStorybookWorldPreview | null = null
  #disposed = false

  constructor(context: EngineStorybookRuntimeContext) {
    this.#context = context
  }

  get frames(): number {
    return this.#preview?.frames ?? 0
  }

  async show(
    story: EngineStory,
    signal: AbortSignal,
    node: EngineStorybookSemanticElement,
  ): Promise<boolean> {
    const scene = await this.#storyState.show(story)
    if (scene === null || signal.aborted || this.#disposed) {
      if (signal.aborted) this.#storyState.invalidate()
      return false
    }
    this.#scene = scene
    this.#replacePreview(node)
    return true
  }

  async reset(
    signal: AbortSignal,
    node: EngineStorybookSemanticElement,
  ): Promise<boolean> {
    const scene = await this.#storyState.reset()
    if (scene === null || signal.aborted || this.#disposed) return false
    this.#scene = scene
    this.#replacePreview(node)
    return true
  }

  clear(): void {
    this.#storyState.clear()
    this.#scene = null
    this.#preview?.dispose()
    this.#preview = null
  }

  requestRender(): void {
    if (!this.#disposed) this.#preview?.requestRender()
  }

  dispose(): void {
    if (this.#disposed) return
    this.#disposed = true
    this.clear()
  }

  #replacePreview(node: EngineStorybookSemanticElement): void {
    this.#preview?.dispose()
    const scene = this.#scene
    if (scene === null) {
      this.#preview = null
      return
    }
    this.#preview = this.#context.mountWorldPreview({
      node,
      space: scene.space,
      camera: scene.camera,
      cameraGestures: true,
      resize(viewport) {
        scene.resize?.({
          width: viewport.backingWidth,
          height: viewport.backingHeight,
        })
      },
      onDoubleClick: () => {
        if (this.#disposed) return
        void this.reset(this.#context.signal, node)
          .catch((error) => this.#context.reportDiagnostic(error))
      },
    })
    this.#preview.requestRender()
  }
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
