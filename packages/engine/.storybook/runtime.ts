import type {Color, Object3D, Space} from "@engine/core"
import type {Document, HTMLElement} from "@zavx0z/dom"
import type {
  EngineStory,
  StoryScene,
} from "../storybook/story.ts"
import {
  createEngineStorybookPreview,
  type EngineStorybookPreviewRoot,
} from "./preview.tsx"

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
  projection: "world"
  document: Document
  signal: AbortSignal
  space: Space
  present(value: Readonly<{
    protocol: "story-presentation/1"
    node: HTMLElement
    componentRoot: EngineStorybookPreviewRoot["componentRoot"]
    source: Readonly<{html: string; typescript: string}>
    values: Readonly<{props: Readonly<Record<string, unknown>>}>
  }>): void
  reportDiagnostic(value: unknown): void
  mountWorldPreview(registration: Readonly<{
    node: HTMLElement
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
    node: HTMLElement,
  ): Promise<boolean>
  reset(signal: AbortSignal, node: HTMLElement): Promise<boolean>
  clear(): void
  requestRender(): void
  dispose(): void
}>

export type EngineStorybookRuntimeDependencies = Readonly<{
  createStage?(context: EngineStorybookRuntimeContext): Promise<EngineStorybookStage>
  createPreview?(document: Document): EngineStorybookPreviewRoot
}>

/** Plain structural adapter loaded only in the exact @engine/core package tab. */
export function createEngineStorybookRuntime(
  dependencies: EngineStorybookRuntimeDependencies = {},
) {
  const createStage = dependencies.createStage ?? (async (context) =>
    new EngineHostedStage(context))
  const createPreview = dependencies.createPreview ?? createEngineStorybookPreview
  return Object.freeze({
    protocol: "storybook-runtime/3" as const,
    async create(context: EngineStorybookRuntimeContext) {
      if (context.projection !== "world") {
        throw new Error("Engine Storybook requires a declared world presentation")
      }
      const stage = await createStage(context)
      const preview = createPreview(context.document)
      let currentStory: EngineStory | null = null
      let currentRoute = ""
      let disposed = false

      const publish = (story: EngineStory): void => {
        preview.element.setAttribute("data-story", story.id)
        context.present(Object.freeze({
          protocol: "story-presentation/1",
          node: preview.element,
          componentRoot: preview.componentRoot,
          source: Object.freeze({
            html: `<section data-engine-storybook-preview="" aria-label="Живая сцена @engine/core" data-story="${escapeHtml(story.id)}"></section>`,
            typescript: story.source,
          }),
          values: Object.freeze({props: Object.freeze({
            route: currentRoute,
            id: story.id,
            group: story.group,
            icon: story.icon,
            materialIcon: story.materialIcon,
            sourceFile: story.sourceFile,
            tags: Object.freeze([...story.tags]),
            frames: stage.frames,
          })}),
        }))
      }
      const show = async (input: EngineStorybookStoryInput): Promise<void> => {
        assertActive(disposed)
        const story = engineStory(input.story)
        currentStory = story
        currentRoute = exactRoute(input.route)
        const committed = await stage.show(story, input.signal, preview.element)
        if (!committed || input.signal.aborted || disposed) return
        publish(story)
      }
      const unmount = (): void => {
        if (disposed) return
        currentStory = null
        currentRoute = ""
        stage.clear()
        if (preview.element.parentNode !== null) {
          preview.element.parentNode.removeChild(preview.element)
        }
      }
      const dispose = (): void => {
        if (disposed) return
        disposed = true
        context.signal.removeEventListener("abort", dispose)
        stage.dispose()
        if (preview.element.parentNode !== null) {
          preview.element.parentNode.removeChild(preview.element)
        }
        preview.dispose()
      }
      context.signal.addEventListener("abort", dispose, {once: true})

      return Object.freeze({
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
  #attachedRoot: Object3D | null = null
  #restoredBackground: Color | null = null
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
    node: HTMLElement,
  ): Promise<boolean> {
    const scene = await this.#storyState.show(story)
    if (scene === null || signal.aborted || this.#disposed) {
      if (signal.aborted) this.#storyState.invalidate()
      return false
    }
    this.#attachScene(scene)
    try {
      this.#replacePreview(node)
    } catch (error) {
      this.#detachScene()
      throw error
    }
    return true
  }

  async reset(
    signal: AbortSignal,
    node: HTMLElement,
  ): Promise<boolean> {
    const scene = await this.#storyState.reset()
    if (scene === null || signal.aborted || this.#disposed) return false
    this.#attachScene(scene)
    try {
      this.#replacePreview(node)
    } catch (error) {
      this.#detachScene()
      throw error
    }
    return true
  }

  clear(): void {
    this.#storyState.clear()
    this.#scene = null
    this.#preview?.dispose()
    this.#preview = null
    this.#detachScene()
  }

  requestRender(): void {
    if (!this.#disposed) this.#preview?.requestRender()
  }

  dispose(): void {
    if (this.#disposed) return
    this.#disposed = true
    this.clear()
  }

  #replacePreview(node: HTMLElement): void {
    this.#preview?.dispose()
    const scene = this.#scene
    if (scene === null) {
      this.#preview = null
      return
    }
    this.#preview = this.#context.mountWorldPreview({
      node,
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

  #attachScene(scene: StoryScene): void {
    if (scene.root.parent !== null) {
      throw new Error("Engine Storybook scene root must be unattached")
    }
    this.#detachScene()
    this.#restoredBackground = this.#context.space.background
    this.#context.space.background = scene.background
    this.#context.space.add(scene.root)
    this.#attachedRoot = scene.root
    this.#scene = scene
  }

  #detachScene(): void {
    const root = this.#attachedRoot
    this.#attachedRoot = null
    if (root !== null && root.parent === this.#context.space) {
      this.#context.space.remove(root)
    }
    const background = this.#restoredBackground
    this.#restoredBackground = null
    if (background !== null) this.#context.space.background = background
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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

function assertActive(disposed: boolean): void {
  if (disposed) throw new Error("Engine Storybook runtime is disposed")
}
