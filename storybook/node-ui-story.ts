import {TextureLoader} from "@engine/core"
import type {UiSurfaceNode} from "@layout/core/runtime"
import type {
  StorybookStoryArgs,
  StorybookStoryControl,
  StorybookStoryModule,
  StorybookStorySource,
} from "@zavx0z/storybook/stories"
import {
  createNodeRenderers,
  type FrameView,
  type LinkView,
  type NodePlan,
  type NodeView,
  type SocketView,
} from "@nodes/ui/node"
import {
  NodeEditor,
  type NodeEditorSelection,
} from "@nodes/ui/node-editor"
import {waitForReferenceFrame, type ReferenceTextureStatus} from "./evidence/reference-readiness.ts"
import {createCatalogNodeTree, createNoiseComparisonTree} from "./fixtures/ui-fixtures.ts"
import {
  bindNodeFieldValueState,
  createNodeFieldValueState,
  updateNodeFieldValueState,
  type NodeFieldAction,
  type NodeFieldValueState,
} from "./state/controlled-field-state.ts"
import {applyNodeEditorStoryState} from "./state/node-editor-story-state.ts"
import {
  ACCEPTED_REFERENCE_SRC,
  AcceptedReferenceSurface,
} from "./surfaces/reference-surfaces.ts"
import type {
  NodeComponentStoryRoute,
  NodeEditorStoryRoute,
} from "./ui-story-catalog.ts"

export const NODE_UI_STORY_KIND = "node-ui-preview" as const

export type NodeUiStoryRoute =
  | NodeEditorStoryRoute
  | "frame/nested/default"
  | "link/orthogonal/selected"
  | "comparison/reference/default"

export type NodeUiStorySurfaceId = "editor" | "reference" | "comparison"

export type NodeUiStoryViewport = Readonly<{
  width: number
  height: number
}>

export type NodeUiStoryFrame = Readonly<{
  x: number
  y: number
  w: number
  h: number
  visible?: boolean
}>

/** Root-owned lifecycle and layout hooks; this owner never creates a runtime or shell. */
export type NodeUiStoryPreviewHost = Readonly<{
  viewport(): NodeUiStoryViewport
  frame(id: NodeUiStorySurfaceId): NodeUiStoryFrame
  renderNextFrame(): Promise<void>
  referenceStatus?(): ReferenceTextureStatus
  onChange?(snapshot: NodeUiStorySnapshot): void
  onError?(error: unknown): void
}>

export type NodeUiStorySelection = Readonly<{
  route: NodeUiStoryRoute
  module: StorybookStoryModule
  args: StorybookStoryArgs
}>

export type NodeUiStorySurface = Readonly<{
  id: NodeUiStorySurfaceId
  slot: "preview"
  surface: UiSurfaceNode
  frame(): NodeUiStoryFrame
}>

export type NodeUiStorySnapshot = Readonly<{
  route: NodeUiStoryRoute
  component: "node-editor" | "frame" | "link" | "comparison"
  args: StorybookStoryArgs
  source: StorybookStorySource
  controls: readonly StorybookStoryControl[]
  activeSurfaceIds: readonly NodeUiStorySurfaceId[]
  selection: NodeEditorSelection
  targetNodeId: string | null
  fieldValues: NodeFieldValueState
  fieldActions: readonly NodeFieldAction[]
  previewEnabledByNode: Readonly<Record<string, boolean>>
  referenceStatus: ReferenceTextureStatus
}>

export type NodeUiStoryPreview = Readonly<{
  surfaces: readonly NodeUiStorySurface[]
  snapshot(): NodeUiStorySnapshot
  update(selection: NodeUiStorySelection): NodeUiStorySnapshot
  ready(): Promise<NodeUiStorySnapshot>
}>

/**
 * A lazy adapter around exact package-owned story metadata.
 *
 * The generic Storybook can keep one Workbench and Story panel while the Node
 * owner supplies the retained production surfaces that cannot render into an
 * arbitrary generic preview surface.
 */
export type NodeUiStoryModule = Readonly<{
  kind: typeof NODE_UI_STORY_KIND
  defaultArgs: StorybookStoryArgs
  controls: readonly StorybookStoryControl[]
  source(args: StorybookStoryArgs): StorybookStorySource
  selection(args?: StorybookStoryArgs): NodeUiStorySelection
  createPreview(
    host: NodeUiStoryPreviewHost,
    initial?: NodeUiStorySelection,
  ): Promise<NodeUiStoryPreview>
}>

export function createNodeUiStoryModule(
  route: NodeComponentStoryRoute,
  module: StorybookStoryModule,
  args: StorybookStoryArgs = module.defaultArgs,
): NodeUiStoryModule {
  const previewRoute = assertNodeUiStoryRoute(route)
  const initial = freezeSelection(previewRoute, module, args)
  return Object.freeze({
    kind: NODE_UI_STORY_KIND,
    defaultArgs: module.defaultArgs,
    controls: module.controls,
    source(nextArgs) {
      return module.source(nextArgs)
    },
    selection(nextArgs = module.defaultArgs) {
      return freezeSelection(previewRoute, module, nextArgs)
    },
    async createPreview(host, requested = initial) {
      const controller = new NodeUiStoryPreviewController(host)
      controller.publicApi.update(requested)
      return controller.publicApi
    },
  })
}

export function isNodeUiStoryRoute(route: string): route is NodeUiStoryRoute {
  return route.startsWith("node-editor/") ||
    route === "frame/nested/default" ||
    route === "link/orthogonal/selected" ||
    route === "comparison/reference/default"
}

export function normalizeNodeUiStoryModule(
  route: string,
  loaded: unknown,
): NodeUiStoryModule {
  if (loaded === null || typeof loaded !== "object") {
    throw new Error(`Invalid Node UI story module: ${route}`)
  }
  const candidate = loaded as Partial<NodeUiStoryModule>
  if (candidate.kind !== NODE_UI_STORY_KIND ||
    candidate.defaultArgs === null || typeof candidate.defaultArgs !== "object" || Array.isArray(candidate.defaultArgs) ||
    !Array.isArray(candidate.controls) || typeof candidate.source !== "function" ||
    typeof candidate.selection !== "function" || typeof candidate.createPreview !== "function") {
    throw new Error(`Invalid Node UI story module: ${route}`)
  }
  return candidate as NodeUiStoryModule
}

class NodeUiStoryPreviewController {
  readonly #host: NodeUiStoryPreviewHost
  readonly #editor: NodeEditor<NodeView, SocketView, LinkView, FrameView, NodePlan>
  readonly #reference = new AcceptedReferenceSurface()
  readonly #comparison: NodeEditor<NodeView, SocketView, LinkView, FrameView, NodePlan>
  readonly #surfaces: readonly NodeUiStorySurface[]
  readonly publicApi: NodeUiStoryPreview
  #current: NodeUiStorySelection | null = null
  #fieldRoute: NodeUiStoryRoute | null = null
  #fieldValues: NodeFieldValueState = Object.freeze({})
  #fieldActions: readonly NodeFieldAction[] = Object.freeze([])
  #previewEnabledByNode: Readonly<Record<string, boolean>> = Object.freeze({})
  #referenceStatus: ReferenceTextureStatus = "idle"
  #referencePending: Promise<void> | null = null
  #targetNodeId: string | null = null

  constructor(host: NodeUiStoryPreviewHost) {
    this.#host = host
    this.#editor = new NodeEditor({
      renderers: createNodeRenderers(),
      title: "РЕДАКТОР НОД · КОМПОНЕНТНАЯ СЦЕНА",
      minScale: 0.26,
      maxScale: 2.4,
      onSelectionChange: () => this.#publish(),
    })
    this.#comparison = new NodeEditor({
      renderers: createNodeRenderers(),
      title: "СРАВНЕНИЕ · ЖИВАЯ НОДА",
      minScale: 0.6,
      maxScale: 2.4,
    })
    this.#comparison.setTree(createNoiseComparisonTree())
    this.#surfaces = Object.freeze([
      this.#surface("editor", this.#editor),
      this.#surface("reference", this.#reference),
      this.#surface("comparison", this.#comparison),
    ])
    for (const entry of this.#surfaces) entry.surface.node.visible = false
    this.publicApi = Object.freeze({
      surfaces: this.#surfaces,
      snapshot: () => this.#snapshot(),
      update: (next) => this.#update(next),
      ready: () => this.#ready(),
    })
  }

  #surface(id: NodeUiStorySurfaceId, surface: UiSurfaceNode): NodeUiStorySurface {
    return Object.freeze({
      id,
      slot: "preview" as const,
      surface,
      frame: () => this.#host.frame(id),
    })
  }

  #update(next: NodeUiStorySelection): NodeUiStorySnapshot {
    const route = assertNodeUiStoryRoute(next.route)
    assertStoryModule(route, next.module)
    const routeChanged = this.#current?.route !== route
    this.#current = freezeSelection(route, next.module, next.args)
    this.#targetNodeId = null

    if (route === "comparison/reference/default") {
      this.#fieldRoute = null
      this.#fieldValues = Object.freeze({})
      this.#fieldActions = Object.freeze([])
      this.#previewEnabledByNode = Object.freeze({})
      this.#setVisible(["reference", "comparison"])
      this.#comparison.fitToView()
      if (this.#referenceStatus !== "ready") this.#referenceStatus = "loading"
      return this.#publish()
    }

    this.#setVisible(["editor"])
    this.#applyEditorStory(route, routeChanged)
    return this.#publish()
  }

  #applyEditorStory(route: Exclude<NodeUiStoryRoute, "comparison/reference/default">, routeChanged: boolean): void {
    const current = this.#requireCurrent()
    const args = current.args
    const previewable = args["previewable"] === true
    const previewNodeIds = previewable && Array.isArray(args["preview-nodes"])
      ? args["preview-nodes"].filter((value): value is string => typeof value === "string")
      : []
    const existingFlags = routeChanged ? {} : this.#previewEnabledByNode
    this.#previewEnabledByNode = Object.freeze(Object.fromEntries(previewNodeIds.map((nodeId) => [
      nodeId,
      nodeId === "scalar"
        ? args["preview-enabled"] === true
        : existingFlags[nodeId] ?? true,
    ])))
    this.#editor.setOverlayState({
      overlays: args["overlays-visible"] !== false,
      previews: args["previews-visible"] !== false,
    })
    const baseTree = createCatalogNodeTree({
      openSelect: route.startsWith("node-editor/") && args["select-open"] === true,
      translationLinked: args["translation-linked"] !== false,
      rotationLinked: args["rotation-linked"] === true,
      rotationOutput: args["rotation-output"] === true,
      colorLinked: args["color-linked"] !== false,
      ...(previewable ? {
        previewEnabled: args["preview-enabled"] === true,
        previewNodeIds,
        previewEnabledByNode: this.#previewEnabledByNode,
        previewBuffer: previewBuffer(args["preview-buffer"]),
        onPreviewToggle: (nodeId: string, enabled: boolean) => {
          if (this.#current?.route !== route) return
          this.#previewEnabledByNode = Object.freeze({...this.#previewEnabledByNode, [nodeId]: enabled})
          const nextArgs = nodeId === "scalar"
            ? Object.freeze({...this.#current.args, "preview-enabled": enabled})
            : this.#current.args
          this.#current = freezeSelection(route, this.#current.module, nextArgs)
          this.#applyEditorStory(route, false)
          this.#publish()
        },
      } : {}),
    })
    if (this.#fieldRoute !== route) {
      this.#fieldRoute = route
      this.#fieldValues = createNodeFieldValueState(baseTree)
      this.#fieldActions = Object.freeze([])
    }
    this.#editor.setTree(bindNodeFieldValueState(baseTree, this.#fieldValues, (nodeId, fieldId, value) => {
      if (this.#current?.route !== route) return
      this.#fieldValues = updateNodeFieldValueState(this.#fieldValues, nodeId, fieldId, value)
      this.#applyEditorStory(route, false)
      this.#publish()
    }, (action) => {
      if (this.#current?.route !== route) return
      this.#fieldActions = Object.freeze([...this.#fieldActions, action].slice(-32))
      this.#publish()
    }))

    if (route.startsWith("node-editor/")) {
      const state = applyNodeEditorStoryState(args, {
        select: (nextSelection) => this.#editor.select(nextSelection),
        publish: (nextState) => {
          this.#targetNodeId = nextState.nodeId
        },
      })
      this.#targetNodeId = state.nodeId
    } else if (route === "frame/nested/default" && args.selected === true) {
      this.#editor.select({kind: "frame", id: "data-frame"})
    } else if (route === "link/orthogonal/selected" && args.selected === true) {
      this.#editor.select({kind: "link", id: "matrix-shader"})
    } else {
      this.#editor.select(null)
    }
  }

  async #ready(): Promise<NodeUiStorySnapshot> {
    if (this.#current?.route !== "comparison/reference/default") return this.#snapshot()
    if (this.#referenceStatus === "ready") return this.#snapshot()
    if (this.#referencePending === null) {
      this.#referencePending = this.#waitForReference().finally(() => {
        this.#referencePending = null
      })
    }
    await this.#referencePending
    return this.#snapshot()
  }

  async #waitForReference(): Promise<void> {
    try {
      await this.#host.renderNextFrame()
      await waitForReferenceFrame({
        readStatus: () => this.#host.referenceStatus?.() ?? TextureLoader.status(ACCEPTED_REFERENCE_SRC),
        renderNextFrame: () => this.#host.renderNextFrame(),
      })
      this.#referenceStatus = "ready"
      this.#publish()
    } catch (error) {
      this.#referenceStatus = "failed"
      this.#publish()
      this.#host.onError?.(error)
      throw error
    }
  }

  #setVisible(active: readonly NodeUiStorySurfaceId[]): void {
    const selected = new Set(active)
    for (const entry of this.#surfaces) {
      const visible = selected.has(entry.id)
      entry.surface.node.visible = visible
      if (visible) entry.surface.requestRender?.()
    }
  }

  #snapshot(): NodeUiStorySnapshot {
    const current = this.#requireCurrent()
    const component = componentForRoute(current.route)
    const activeSurfaceIds = this.#surfaces
      .filter(({surface}) => surface.node.visible)
      .map(({id}) => id)
    return Object.freeze({
      route: current.route,
      component,
      args: current.args,
      source: current.module.source(current.args),
      controls: current.module.controls,
      activeSurfaceIds: Object.freeze(activeSurfaceIds),
      selection: component === "comparison" ? this.#comparison.selection : this.#editor.selection,
      targetNodeId: this.#targetNodeId,
      fieldValues: this.#fieldValues,
      fieldActions: this.#fieldActions,
      previewEnabledByNode: this.#previewEnabledByNode,
      referenceStatus: this.#referenceStatus,
    })
  }

  #publish(): NodeUiStorySnapshot {
    const snapshot = this.#snapshot()
    this.#host.onChange?.(snapshot)
    return snapshot
  }

  #requireCurrent(): NodeUiStorySelection {
    if (this.#current === null) throw new Error("Node UI story preview has no active story")
    return this.#current
  }
}

function freezeSelection(
  route: NodeUiStoryRoute,
  module: StorybookStoryModule,
  args: StorybookStoryArgs,
): NodeUiStorySelection {
  assertStoryModule(route, module)
  if (args === null || typeof args !== "object" || Array.isArray(args)) {
    throw new Error(`Invalid Node UI story args: ${route}`)
  }
  return Object.freeze({route, module, args: Object.freeze({...args})})
}

function assertStoryModule(route: string, module: StorybookStoryModule): void {
  if (module === null || typeof module !== "object" ||
    module.defaultArgs === null || typeof module.defaultArgs !== "object" || Array.isArray(module.defaultArgs) ||
    !Array.isArray(module.controls) || typeof module.source !== "function" || typeof module.render !== "function") {
    throw new Error(`Invalid Node UI owner story module: ${route}`)
  }
}

function assertNodeUiStoryRoute(route: string): NodeUiStoryRoute {
  if (!isNodeUiStoryRoute(route)) throw new Error(`Unsupported Node UI preview route: ${route}`)
  return route
}

function componentForRoute(route: NodeUiStoryRoute): NodeUiStorySnapshot["component"] {
  if (route.startsWith("node-editor/")) return "node-editor"
  if (route.startsWith("frame/")) return "frame"
  if (route.startsWith("link/")) return "link"
  return "comparison"
}

function previewBuffer(value: unknown): "primary" | "alternate" | "missing" | "zero" {
  return value === "alternate" || value === "missing" || value === "zero" ? value : "primary"
}
