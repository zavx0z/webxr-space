import type {UiSurfaceNode} from "@layout/core/runtime"
import type {FieldDefinition} from "@ui/components/field"
import type {
  StorybookStoryArgs,
  StorybookStoryControl,
  StorybookStorySource,
} from "@zavx0z/storybook/stories"
import {
  NodeTreeEditor,
  type NodeTreeEditorResult,
} from "@nodes/editor"
import {
  NodeTree,
  StaleNodeTreeProjectionError,
} from "@nodes/core/node-tree"
import {Parameter, type NodeJsonValue} from "@nodes/core/parameter"
import {
  createNodeRenderers,
  type FrameView,
  type LinkView,
  type NodePlan,
  type NodeView,
  type SocketView,
} from "@nodes/ui/node"
import {NodeEditor, type NodeEditorSelection} from "@nodes/ui/node-editor"
import {
  createNodeTreeProjector,
  type FrameMetadata,
  type LinkMetadata,
  type NodeMetadata,
  type NodeTreeProjection,
  type ParameterPresentation,
  type RuntimeParameter,
  type RuntimeTree,
  type SocketMetadata,
} from "@nodes/ui/projection"
import {
  NodeTreeEditorDockSurface,
  type NodeTreeEditorDockOptions,
} from "./editor-dock-surface.ts"

export const NODE_TREE_EDITOR_STORY_KIND = "node-tree-editor-preview" as const

export type NodeTreeEditorStoryViewport = Readonly<{
  width: number
  height: number
}>

/**
 * The root Storybook supplies viewport and lifecycle observation while keeping
 * ownership of its one UiRuntime, router and Workbench shell.
 */
export type NodeTreeEditorStoryPreviewHost = Readonly<{
  viewport(): NodeTreeEditorStoryViewport
  onChange?(snapshot: NodeTreeEditorStorySnapshot): void
  onError?(error: unknown): void
}>

export type NodeTreeEditorStorySurfaceSlot = "preview" | "dock"

/** A package surface that the existing root UiRuntime registers in one Workbench slot. */
export type NodeTreeEditorStorySurface = Readonly<{
  slot: NodeTreeEditorStorySurfaceSlot
  surface: UiSurfaceNode
}>

export type NodeTreeEditorStorySnapshot = Readonly<{
  treeRevision: number
  topologyRevision: number
  projectionRevision: number | null
  projectionTopologyRevision: number | null
  layoutDirty: boolean
  gain: NodeJsonValue
  selectedNodeId: string | null
  selectedParameterId: string | null
  selectedLinkId: string | null
  nodeIds: readonly string[]
  parameterIds: readonly string[]
  linkIds: readonly string[]
  lastPatch: NodeTreeEditorResult["forward"] | null
}>

/**
 * Package-owned authoring scenario hosted by the existing root Workbench.
 *
 * `NodeEditor` and the retained dock must remain separate surfaces so the
 * root UiRuntime can route pointer, keyboard and Field input to their real
 * production owners. A generic StorybookStoryModule.render(surface, ...)
 * callback cannot honestly preserve that interaction contract.
 */
export type NodeTreeEditorStoryPreview = Readonly<{
  surfaces: readonly NodeTreeEditorStorySurface[]
  snapshot(): NodeTreeEditorStorySnapshot
  setGain(value: number): Promise<NodeTreeEditorStorySnapshot>
  addParameter(nodeId?: string): NodeTreeEditorStorySnapshot
  removeSelectedParameter(): NodeTreeEditorStorySnapshot
  toggleConnection(): NodeTreeEditorStorySnapshot
  addNode(): NodeTreeEditorStorySnapshot
  removeSelectedNode(): NodeTreeEditorStorySnapshot
  rebuildLayout(): Promise<NodeTreeEditorStorySnapshot>
}>

/**
 * Lazy module consumed through defineStorybookStoryCatalog's owner normalizer.
 *
 * It intentionally shares Storybook args/control/source metadata but replaces
 * the single-surface render callback with an explicit two-surface preview
 * adapter. The root catalog remains eager metadata; this implementation and
 * its production Node/Core/UI imports load only for the exact authoring leaf.
 */
export type NodeTreeEditorStoryModule = Readonly<{
  kind: typeof NODE_TREE_EDITOR_STORY_KIND
  defaultArgs: StorybookStoryArgs
  controls: readonly StorybookStoryControl[]
  source(args: StorybookStoryArgs): StorybookStorySource
  createPreview(host: NodeTreeEditorStoryPreviewHost): Promise<NodeTreeEditorStoryPreview>
}>

export function createNodeTreeEditorStoryModule(): NodeTreeEditorStoryModule {
  return Object.freeze({
    kind: NODE_TREE_EDITOR_STORY_KIND,
    defaultArgs: Object.freeze({}),
    controls: Object.freeze([]),
    source() {
      const typescript = [
        'import {NodeTreeEditor} from "@nodes/editor"',
        'import {createNodeTreeProjector} from "@nodes/ui/projection"',
        'import {NodeEditor} from "@nodes/ui/node-editor"',
        'import {createNodeRenderers} from "@nodes/ui/node"',
        "",
        "const author = new NodeTreeEditor(tree)",
        "const projector = createNodeTreeProjector()",
        "const editor = new NodeEditor({renderers: createNodeRenderers()})",
        "",
        "const transaction = author.addNode({expectedRevision: tree.revision, node})",
        "// Structural authoring keeps the accepted projection visible.",
        "void transaction.forward",
        "const projection = await tree.project(projector, {context: {viewport}})",
        "editor.setProjection(projection)",
        "author.markLayoutApplied(projection)",
      ].join("\n")
      return Object.freeze({
        html: `<node-tree-editor class="node-tree-editor">
  <node-editor class="node-tree-editor__preview"></node-editor>
  <aside class="node-tree-editor__dock"></aside>
</node-tree-editor>`,
        css: `.node-tree-editor {
  display: grid;
  width: 100%;
  height: 100%;
  grid-template-rows: minmax(0, 1fr) auto;
  overflow: hidden;
}

.node-tree-editor__preview {
  min-width: 0;
  min-height: 0;
}

.node-tree-editor__dock {
  min-height: 24px;
}`,
        typescript,
      })
    },
    async createPreview(host) {
      const preview = new NodeTreeEditorStoryPreviewController(host)
      await preview.publicApi.rebuildLayout()
      return preview.publicApi
    },
  })
}

/** Exact owner normalizer for the generic central lazy catalog. */
export function normalizeNodeTreeEditorStoryModule(
  route: string,
  loaded: unknown,
): NodeTreeEditorStoryModule {
  if (loaded === null || typeof loaded !== "object") {
    throw new Error(`Invalid NodeTreeEditor story module: ${route}`)
  }
  const candidate = loaded as Partial<NodeTreeEditorStoryModule>
  if (candidate.kind !== NODE_TREE_EDITOR_STORY_KIND ||
    candidate.defaultArgs === null || typeof candidate.defaultArgs !== "object" || Array.isArray(candidate.defaultArgs) ||
    !Array.isArray(candidate.controls) || typeof candidate.source !== "function" ||
    typeof candidate.createPreview !== "function") {
    throw new Error(`Invalid NodeTreeEditor story module: ${route}`)
  }
  return candidate as NodeTreeEditorStoryModule
}

class NodeTreeEditorStoryPreviewController {
  readonly #host: NodeTreeEditorStoryPreviewHost
  readonly #tree: RuntimeTree
  readonly #author: NodeTreeEditor
  readonly #projector = createNodeTreeProjector()
  readonly #gain: RuntimeParameter
  readonly #editor: NodeEditor<NodeView, SocketView, LinkView, FrameView, NodePlan>
  readonly #dock: NodeTreeEditorDockSurface
  readonly #surfaces: readonly NodeTreeEditorStorySurface[]
  readonly publicApi: NodeTreeEditorStoryPreview
  #latestProjection: NodeTreeProjection | null = null
  #projectionQueue: Promise<void> = Promise.resolve()
  #selectedNodeId: string | null = "source"
  #selectedParameterId: string | null = "gain"
  #selectedLinkId: string | null = "runtime-link"
  #fromEndpointId = endpointValue("source", "value-out")
  #toEndpointId = endpointValue("target", "value-in")
  #parameterSequence = 0
  #nodeSequence = 0
  #linkSequence = 0
  #lastTransaction: NodeTreeEditorResult | null = null

  constructor(host: NodeTreeEditorStoryPreviewHost) {
    this.#host = host
    const gain = numberParameter("gain", "Gain", 1)
    const output = numberParameter("value", "Value", 0.5)
    const input = numberParameter("value", "Value", 0.5)
    this.#gain = gain
    this.#tree = new NodeTree<
      RuntimeParameter,
      FrameMetadata,
      NodeMetadata,
      SocketMetadata,
      LinkMetadata
    >({
      nodes: [
        {
          id: "source",
          parameters: [gain, output],
          metadata: {title: "Runtime Source", category: "NodeTree"},
          sockets: [{
            id: "value-out",
            direction: "output",
            parameterId: "value",
            side: "right",
            metadata: {label: "Value", socketType: "float"},
          }],
        },
        {
          id: "target",
          parameters: [input],
          metadata: {title: "Runtime Target", category: "NodeTree"},
          sockets: [{
            id: "value-in",
            direction: "input",
            parameterId: "value",
            side: "left",
            metadata: {label: "Value", socketType: "float"},
          }],
        },
      ],
      links: [{
        id: "runtime-link",
        from: {nodeId: "source", socketId: "value-out"},
        to: {nodeId: "target", socketId: "value-in"},
        metadata: {label: "Runtime value", socketType: "float"},
      }],
    })
    this.#author = new NodeTreeEditor(this.#tree, {
      parameterAffectsLayout: ({presentation}) => presentation.geometrySensitiveValue === true,
    })
    this.#editor = new NodeEditor({
      renderers: createNodeRenderers(),
      title: "NODETREE · UNIVERSAL EDITOR",
      minScale: 0.4,
      maxScale: 2.4,
      onSelectionChange: (selection) => this.#acceptCanvasSelection(selection),
    })
    this.#dock = new NodeTreeEditorDockSurface(this.#dockOptions())
    this.#surfaces = Object.freeze([
      Object.freeze({slot: "preview", surface: this.#editor}),
      Object.freeze({slot: "dock", surface: this.#dock}),
    ])
    this.publicApi = Object.freeze({
      surfaces: this.#surfaces,
      snapshot: () => this.#snapshot(),
      setGain: (value) => this.#setGain(value),
      addParameter: (nodeId) => this.#addParameter(nodeId),
      removeSelectedParameter: () => this.#removeSelectedParameter(),
      toggleConnection: () => this.#toggleConnection(),
      addNode: () => this.#addNode(),
      removeSelectedNode: () => this.#removeSelectedNode(),
      rebuildLayout: () => this.#rebuildLayout(),
    })
  }

  #snapshot(): NodeTreeEditorStorySnapshot {
    const selected = this.#selectedNodeId === null
      ? undefined
      : this.#tree.nodes.find(({id}) => id === this.#selectedNodeId)
    return Object.freeze({
      treeRevision: this.#tree.revision,
      topologyRevision: this.#tree.topologyRevision,
      projectionRevision: this.#latestProjection?.revision ?? null,
      projectionTopologyRevision: this.#latestProjection?.topologyRevision ?? null,
      layoutDirty: this.#author.layoutDirty,
      gain: this.#gain.value,
      selectedNodeId: this.#selectedNodeId,
      selectedParameterId: this.#selectedParameterId,
      selectedLinkId: this.#selectedLinkId,
      nodeIds: Object.freeze(this.#tree.nodes.map(({id}) => id)),
      parameterIds: Object.freeze((selected?.parameters ?? []).map(({id}) => id)),
      linkIds: Object.freeze(this.#tree.links.map(({id}) => id)),
      lastPatch: this.#lastTransaction?.forward ?? null,
    })
  }

  #publish(): NodeTreeEditorStorySnapshot {
    this.#normalizeSelections()
    this.#dock.setOptions(this.#dockOptions())
    const snapshot = this.#snapshot()
    this.#host.onChange?.(snapshot)
    return snapshot
  }

  #dockOptions(): NodeTreeEditorDockOptions {
    this.#normalizeSelections()
    const node = this.#selectedNodeId === null
      ? undefined
      : this.#tree.nodes.find(({id}) => id === this.#selectedNodeId)
    const parameters = (node?.parameters ?? []).map((parameter) => {
      const socket = (node?.sockets ?? []).find(({parameterId}) => parameterId === parameter.id)
      return Object.freeze({
        id: parameter.id,
        label: parameter.presentation.label,
        ...(socket === undefined ? {} : {
          description: `Используется Socket ${socket.id}`,
          removable: false,
        }),
      })
    })
    return Object.freeze({
      nodes: Object.freeze(this.#tree.nodes.map((entry) => Object.freeze({
        id: entry.id,
        label: entry.metadata?.title ?? entry.id,
      }))),
      selectedNodeId: this.#selectedNodeId,
      parameters: Object.freeze(parameters),
      selectedParameterId: this.#selectedParameterId,
      parameterField: this.#selectedParameterField(),
      links: Object.freeze(this.#tree.links.map((link) => Object.freeze({
        id: link.id,
        label: `${link.from.nodeId}/${link.from.socketId} → ${link.to.nodeId}/${link.to.socketId}`,
      }))),
      selectedLinkId: this.#selectedLinkId,
      fromEndpointId: this.#fromEndpointId,
      fromEndpoints: this.#endpointOptions("from"),
      toEndpointId: this.#toEndpointId,
      toEndpoints: this.#endpointOptions("to"),
      canConnect: this.#canConnectCurrent(),
      layoutDirty: this.#author.layoutDirty,
      onSelectNode: (id) => {
        this.#selectedNodeId = id
        this.#selectedParameterId = null
        this.#editor.select({kind: "node", id})
        this.#publish()
      },
      onAddNode: () => { this.#runUiEdit(() => this.#addNode()) },
      onRemoveNode: (id) => {
        this.#selectedNodeId = id
        this.#runUiEdit(() => this.#removeSelectedNode())
      },
      onSelectParameter: (id) => {
        this.#selectedParameterId = id
        this.#publish()
      },
      onAddParameter: () => { this.#runUiEdit(() => this.#addParameter()) },
      onRemoveParameter: (id) => {
        this.#selectedParameterId = id
        this.#runUiEdit(() => this.#removeSelectedParameter())
      },
      onSelectLink: (id) => {
        this.#selectedLinkId = id
        this.#editor.select({kind: "link", id})
        this.#publish()
      },
      onConnect: () => { this.#runUiEdit(() => this.#connectCurrent()) },
      onDisconnect: (id) => {
        this.#selectedLinkId = id
        this.#runUiEdit(() => this.#disconnectSelected())
      },
      onFromEndpointChange: (id) => {
        this.#fromEndpointId = id
        this.#publish()
      },
      onToEndpointChange: (id) => {
        this.#toEndpointId = id
        this.#publish()
      },
      onRebuildLayout: () => { void this.#rebuildLayout().catch((error) => this.#publishError(error)) },
    })
  }

  #selectedParameterField(): FieldDefinition | null {
    if (this.#selectedNodeId === null || this.#selectedParameterId === null) return null
    const nodeId = this.#selectedNodeId
    const parameterId = this.#selectedParameterId
    let parameter: RuntimeParameter
    try {
      parameter = this.#tree.parameter(nodeId, parameterId)
    } catch {
      return null
    }
    if (typeof parameter.value !== "number") {
      return Object.freeze({
        id: `editor-${nodeId}-${parameterId}`,
        kind: "readonly",
        label: parameter.presentation.label,
        value: JSON.stringify(parameter.value),
      })
    }
    const precision = parameter.presentation.field["precision"]
    return Object.freeze({
      id: `editor-${nodeId}-${parameterId}`,
      key: `editor-${nodeId}-${parameterId}`,
      kind: "number",
      label: parameter.presentation.label,
      value: parameter.value,
      ...(typeof precision === "number" ? {precision} : {}),
      onChange: (value) => {
        void this.#setGainFor(nodeId, parameterId, value).catch((error) => this.#publishError(error))
      },
    })
  }

  #endpointOptions(role: "from" | "to"): readonly Readonly<{value: string; label: string}>[] {
    return Object.freeze(this.#tree.nodes.flatMap((node) => (node.sockets ?? []).flatMap((socket) => {
      const allowed = role === "from" ? socket.direction !== "input" : socket.direction !== "output"
      if (!allowed) return []
      return [Object.freeze({
        value: endpointValue(node.id, socket.id),
        label: `${node.metadata?.title ?? node.id} · ${socket.metadata?.label ?? socket.id}`,
      })]
    })))
  }

  #canConnectCurrent(): boolean {
    if (this.#fromEndpointId.length === 0 || this.#toEndpointId.length === 0) return false
    const from = parseEndpointValue(this.#fromEndpointId)
    const to = parseEndpointValue(this.#toEndpointId)
    return !this.#tree.links.some((link) => link.from.nodeId === from.nodeId &&
      link.from.socketId === from.socketId && link.to.nodeId === to.nodeId &&
      link.to.socketId === to.socketId)
  }

  #normalizeSelections(): void {
    if (this.#selectedNodeId === null || !this.#tree.nodes.some(({id}) => id === this.#selectedNodeId)) {
      this.#selectedNodeId = this.#tree.nodes[0]?.id ?? null
    }
    const node = this.#selectedNodeId === null
      ? undefined
      : this.#tree.nodes.find(({id}) => id === this.#selectedNodeId)
    if (this.#selectedParameterId === null || !(node?.parameters ?? []).some(({id}) => id === this.#selectedParameterId)) {
      this.#selectedParameterId = node?.parameters?.[0]?.id ?? null
    }
    if (this.#selectedLinkId === null || !this.#tree.links.some(({id}) => id === this.#selectedLinkId)) {
      this.#selectedLinkId = this.#tree.links[0]?.id ?? null
    }
    this.#normalizeEndpointSelections()
  }

  #normalizeEndpointSelections(): void {
    const from = this.#endpointOptions("from")
    const to = this.#endpointOptions("to")
    if (!from.some(({value}) => value === this.#fromEndpointId)) this.#fromEndpointId = from[0]?.value ?? ""
    if (!to.some(({value}) => value === this.#toEndpointId)) this.#toEndpointId = to[0]?.value ?? ""
  }

  #recordTransaction(transaction: NodeTreeEditorResult): NodeTreeEditorStorySnapshot {
    this.#lastTransaction = transaction
    return this.#publish()
  }

  async #setGain(value: number): Promise<NodeTreeEditorStorySnapshot> {
    if (!Number.isFinite(value)) throw new Error("Gain must be finite")
    return this.#setGainFor("source", "gain", value)
  }

  async #setGainFor(nodeId: string, parameterId: string, value: number): Promise<NodeTreeEditorStorySnapshot> {
    this.#lastTransaction = this.#author.setParameterValue({
      expectedRevision: this.#tree.revision,
      nodeId,
      parameterId,
      value,
    })
    this.#publish()
    if (!this.#author.layoutDirty) return this.#rebuildLayout()
    return this.#snapshot()
  }

  #addParameter(nodeId = this.#selectedNodeId ?? undefined): NodeTreeEditorStorySnapshot {
    if (nodeId === undefined) throw new Error("Select a Node before adding a Parameter")
    this.#parameterSequence += 1
    const id = `parameter-${this.#parameterSequence}`
    const transaction = this.#author.addParameter({
      expectedRevision: this.#tree.revision,
      nodeId,
      parameter: {
        id,
        value: 0,
        presentation: numberPresentation(id, `Parameter ${this.#parameterSequence}`),
      },
    })
    this.#selectedNodeId = nodeId
    this.#selectedParameterId = id
    return this.#recordTransaction(transaction)
  }

  #removeSelectedParameter(): NodeTreeEditorStorySnapshot {
    if (this.#selectedNodeId === null || this.#selectedParameterId === null) {
      throw new Error("Select a Parameter before removing it")
    }
    const transaction = this.#author.removeParameter({
      expectedRevision: this.#tree.revision,
      nodeId: this.#selectedNodeId,
      parameterId: this.#selectedParameterId,
    })
    this.#selectedParameterId = null
    return this.#recordTransaction(transaction)
  }

  #addNode(): NodeTreeEditorStorySnapshot {
    this.#nodeSequence += 1
    const id = `dynamic-${this.#nodeSequence}`
    const transaction = this.#author.addNode({
      expectedRevision: this.#tree.revision,
      node: {
        id,
        parameters: [{
          id: "value",
          value: this.#nodeSequence,
          presentation: numberPresentation("value", "Value"),
        }],
        sockets: [
          {
            id: "value-in",
            direction: "input",
            parameterId: "value",
            side: "left",
            metadata: {label: "Value", socketType: "float"},
          },
          {
            id: "value-out",
            direction: "output",
            parameterId: "value",
            side: "right",
            metadata: {label: "Value", socketType: "float"},
          },
        ],
        metadata: {title: `Dynamic ${this.#nodeSequence}`, category: "Editor"},
      },
    })
    this.#selectedNodeId = id
    this.#selectedParameterId = "value"
    this.#normalizeEndpointSelections()
    return this.#recordTransaction(transaction)
  }

  #removeSelectedNode(): NodeTreeEditorStorySnapshot {
    if (this.#selectedNodeId === null) throw new Error("Select a Node before removing it")
    const transaction = this.#author.removeNode({
      expectedRevision: this.#tree.revision,
      nodeId: this.#selectedNodeId,
      disconnectLinks: true,
    })
    this.#selectedNodeId = null
    this.#selectedParameterId = null
    this.#selectedLinkId = null
    this.#normalizeEndpointSelections()
    return this.#recordTransaction(transaction)
  }

  #connectCurrent(): NodeTreeEditorStorySnapshot {
    const from = parseEndpointValue(this.#fromEndpointId)
    const to = parseEndpointValue(this.#toEndpointId)
    this.#linkSequence += 1
    const id = `editor-link-${this.#linkSequence}`
    const transaction = this.#author.connect({
      expectedRevision: this.#tree.revision,
      link: {
        id,
        from,
        to,
        metadata: {label: `${from.nodeId} → ${to.nodeId}`, socketType: "float"},
      },
    })
    this.#selectedLinkId = id
    return this.#recordTransaction(transaction)
  }

  #disconnectSelected(): NodeTreeEditorStorySnapshot {
    if (this.#selectedLinkId === null) throw new Error("Select a Link before disconnecting it")
    const transaction = this.#author.disconnect({
      expectedRevision: this.#tree.revision,
      linkId: this.#selectedLinkId,
    })
    this.#selectedLinkId = null
    return this.#recordTransaction(transaction)
  }

  #toggleConnection(): NodeTreeEditorStorySnapshot {
    const existing = this.#tree.links[0]
    if (existing !== undefined) {
      this.#selectedLinkId = existing.id
      return this.#disconnectSelected()
    }
    return this.#connectCurrent()
  }

  async #rebuildLayout(): Promise<NodeTreeEditorStorySnapshot> {
    const pending = this.#projectionQueue.then(() => this.#applyProjection())
    this.#projectionQueue = pending.catch((error) => this.#publishError(error))
    await pending
    return this.#snapshot()
  }

  async #applyProjection(): Promise<void> {
    const viewport = normalizeViewport(this.#host.viewport())
    try {
      const projection = await this.#tree.project(this.#projector, {
        cacheKey: `node-view:${viewport.width}x${viewport.height}`,
        context: {viewport},
      })
      this.#latestProjection = projection
      this.#editor.setProjection(projection)
      if (!this.#author.markLayoutApplied(projection)) return this.#applyProjection()
      this.#normalizeSelections()
      if (this.#selectedNodeId !== null) this.#editor.select({kind: "node", id: this.#selectedNodeId})
      this.#publish()
    } catch (error) {
      if (error instanceof StaleNodeTreeProjectionError) return this.#applyProjection()
      throw error
    }
  }

  #acceptCanvasSelection(selection: NodeEditorSelection): void {
    if (selection?.kind === "node") {
      this.#selectedNodeId = selection.id
      this.#selectedParameterId = null
    } else if (selection?.kind === "link") {
      this.#selectedLinkId = selection.id
    }
    this.#publish()
  }

  #runUiEdit(action: () => void): void {
    try {
      action()
    } catch (error) {
      this.#publishError(error)
    }
  }

  #publishError(error: unknown): void {
    this.#host.onError?.(error)
  }
}

function numberParameter(id: string, label: string, value: number): RuntimeParameter {
  return new Parameter<NodeJsonValue, ParameterPresentation>(id, value, numberPresentation(id, label))
}

function numberPresentation(id: string, label: string): ParameterPresentation {
  return Object.freeze({
    label,
    field: Object.freeze({id: `${id}-field`, kind: "number", label, precision: 2}),
  })
}

function endpointValue(nodeId: string, socketId: string): string {
  return JSON.stringify([nodeId, socketId])
}

function parseEndpointValue(value: string): Readonly<{nodeId: string; socketId: string}> {
  const parsed = JSON.parse(value) as unknown
  if (!Array.isArray(parsed) || parsed.length !== 2 ||
    typeof parsed[0] !== "string" || typeof parsed[1] !== "string") {
    throw new Error(`Invalid editor Socket endpoint: ${value}`)
  }
  return Object.freeze({nodeId: parsed[0], socketId: parsed[1]})
}

function normalizeViewport(viewport: NodeTreeEditorStoryViewport): NodeTreeEditorStoryViewport {
  if (!Number.isFinite(viewport.width) || !Number.isFinite(viewport.height)) {
    throw new Error("NodeTreeEditor story viewport must be finite")
  }
  return Object.freeze({
    width: Math.max(1, Math.round(viewport.width)),
    height: Math.max(1, Math.round(viewport.height)),
  })
}
