import {
  equalNodeJsonValue,
  ownNodeJsonValue,
  ownNodeValueType,
  type NodeJsonValue,
  type NodeValueType,
  type ParameterReference,
  type ParameterSnapshot,
} from "./parameter.ts"
import type {
  NodeTreeProjectionRequest,
  NodeTreeProjector,
  PriorNodeTreeProjection,
} from "./projection-types.ts"
import {
  consumeNodeTreePolicy,
  type InternalNodeTreePolicy,
} from "./node-tree-policy.ts"

const freeze = Object.freeze

export {
  requireNodeTreeDocumentShape,
} from "./node-tree-document.ts"

const MAX_GENERATION_CAPTURE_ATTEMPTS = 25

export type Frame<TMetadata extends NodeJsonValue = NodeJsonValue> = Readonly<{
  id: string
  parentFrameId?: string
  scopeId?: string
  groupId?: string
  metadata?: TMetadata
}>

export type GraphScope<TMetadata extends NodeJsonValue = NodeJsonValue> = Readonly<{
  id: string
  kind: "graph" | "subgraph"
  parentScopeId?: string
  instance?: NodeInstanceReference
  metadata?: TMetadata
}>

export type NodeGroup<TMetadata extends NodeJsonValue = NodeJsonValue> = Readonly<{
  id: string
  scopeId?: string
  parentGroupId?: string
  metadata?: TMetadata
}>

export type NodeTemplate<TMetadata extends NodeJsonValue = NodeJsonValue> = Readonly<{
  id: string
  version: number
  kind: "node" | "graph"
  metadata?: TMetadata
}>

export type NodeInstanceReference = Readonly<{
  id: string
  templateId: string
  templateVersion: number
  localId: string
}>

export type SocketDirection = "input" | "output" | "bidirectional"
export type SocketSide = "left" | "right"

export type Socket<TMetadata extends NodeJsonValue = NodeJsonValue> = Readonly<{
  id: string
  direction: SocketDirection
  parameterId?: string
  side?: SocketSide
  valueType?: NodeValueType
  metadata?: TMetadata
}>

export type Node<
  TParameter extends ParameterReference = ParameterReference,
  TNodeMetadata extends NodeJsonValue = NodeJsonValue,
  TSocketMetadata extends NodeJsonValue = NodeJsonValue,
> = Readonly<{
  id: string
  frameId?: string
  scopeId?: string
  groupId?: string
  instance?: NodeInstanceReference
  parameters?: readonly TParameter[]
  sockets?: readonly Socket<TSocketMetadata>[]
  metadata?: TNodeMetadata
}>

export type SocketEndpoint = Readonly<{
  nodeId: string
  socketId: string
}>

export type Link<TMetadata extends NodeJsonValue = NodeJsonValue> = Readonly<{
  id: string
  from: SocketEndpoint
  to: SocketEndpoint
  metadata?: TMetadata
}>

export type NodeTreeDefinition<
  TParameter extends ParameterReference = ParameterReference,
  TFrameMetadata extends NodeJsonValue = NodeJsonValue,
  TNodeMetadata extends NodeJsonValue = NodeJsonValue,
  TSocketMetadata extends NodeJsonValue = NodeJsonValue,
  TLinkMetadata extends NodeJsonValue = NodeJsonValue,
> = Readonly<{
  scopes?: readonly GraphScope[]
  groups?: readonly NodeGroup[]
  templates?: readonly NodeTemplate[]
  frames?: readonly Frame<TFrameMetadata>[]
  nodes: readonly Node<TParameter, TNodeMetadata, TSocketMetadata>[]
  links?: readonly Link<TLinkMetadata>[]
}>

export type NodeTreeParameterSnapshot<TParameter extends ParameterReference> =
  TParameter extends ParameterReference<infer TValue, infer TPresentation>
    ? ParameterSnapshot<TValue, TPresentation>
    : ParameterSnapshot

export type NodeTreeNodeSnapshot<
  TParameter extends ParameterReference,
  TNodeMetadata extends NodeJsonValue,
  TSocketMetadata extends NodeJsonValue,
> = Readonly<{
  id: string
  frameId?: string
  scopeId?: string
  groupId?: string
  instance?: NodeInstanceReference
  parameters: readonly NodeTreeParameterSnapshot<TParameter>[]
  sockets: readonly Socket<TSocketMetadata>[]
  metadata?: TNodeMetadata
}>

export type NodeTreeSnapshot<
  TParameter extends ParameterReference = ParameterReference,
  TFrameMetadata extends NodeJsonValue = NodeJsonValue,
  TNodeMetadata extends NodeJsonValue = NodeJsonValue,
  TSocketMetadata extends NodeJsonValue = NodeJsonValue,
  TLinkMetadata extends NodeJsonValue = NodeJsonValue,
> = Readonly<{
  revision: number
  topologyRevision: number
  scopes?: readonly GraphScope[]
  groups?: readonly NodeGroup[]
  templates?: readonly NodeTemplate[]
  frames: readonly Frame<TFrameMetadata>[]
  nodes: readonly NodeTreeNodeSnapshot<TParameter, TNodeMetadata, TSocketMetadata>[]
  links: readonly Link<TLinkMetadata>[]
}>

export type Ordered<T> = Readonly<{
  order: readonly string[]
  byId: Readonly<Record<string, T>>
}>

export type NodeTreeFrameDocument<
  TMetadata extends NodeJsonValue = NodeJsonValue,
> = Readonly<{
  parentFrameId?: string
  scopeId?: string
  groupId?: string
  metadata?: TMetadata
}>

export type NodeTreeParameterDocument<TParameter extends ParameterReference> =
  TParameter extends ParameterReference<infer TValue, infer TPresentation>
    ? Readonly<{
        value: TValue
        presentation: TPresentation
        valueType?: NodeValueType
      }>
    : Readonly<{
        value: NodeJsonValue
        presentation: NodeJsonValue
        valueType?: NodeValueType
      }>

export type NodeTreeSocketDocument<
  TMetadata extends NodeJsonValue = NodeJsonValue,
> = Readonly<{
  direction: SocketDirection
  parameterId?: string
  side?: SocketSide
  valueType?: NodeValueType
  metadata?: TMetadata
}>

export type NodeTreeNodeDocument<
  TParameter extends ParameterReference = ParameterReference,
  TNodeMetadata extends NodeJsonValue = NodeJsonValue,
  TSocketMetadata extends NodeJsonValue = NodeJsonValue,
> = Readonly<{
  frameId?: string
  scopeId?: string
  groupId?: string
  instance?: NodeInstanceReference
  parameters: Ordered<NodeTreeParameterDocument<TParameter>>
  sockets: Ordered<NodeTreeSocketDocument<TSocketMetadata>>
  metadata?: TNodeMetadata
}>

export type NodeTreeLinkDocument<
  TMetadata extends NodeJsonValue = NodeJsonValue,
> = Readonly<{
  from: SocketEndpoint
  to: SocketEndpoint
  metadata?: TMetadata
}>

export type LegacyNodeTreeFrameDocument<
  TMetadata extends NodeJsonValue = NodeJsonValue,
> = Readonly<{
  parentFrameId?: string
  scopeId?: never
  groupId?: never
  metadata?: TMetadata
}>

export type LegacyNodeTreeParameterDocument<TParameter extends ParameterReference> =
  Readonly<Omit<NodeTreeParameterDocument<TParameter>, "valueType"> & {valueType?: never}>

export type LegacyNodeTreeSocketDocument<
  TMetadata extends NodeJsonValue = NodeJsonValue,
> = Readonly<Omit<NodeTreeSocketDocument<TMetadata>, "valueType"> & {valueType?: never}>

export type LegacyNodeTreeNodeDocument<
  TParameter extends ParameterReference = ParameterReference,
  TNodeMetadata extends NodeJsonValue = NodeJsonValue,
  TSocketMetadata extends NodeJsonValue = NodeJsonValue,
> = Readonly<{
  frameId?: string
  scopeId?: never
  groupId?: never
  instance?: never
  parameters: Ordered<LegacyNodeTreeParameterDocument<TParameter>>
  sockets: Ordered<LegacyNodeTreeSocketDocument<TSocketMetadata>>
  metadata?: TNodeMetadata
}>

export type NodeTreeDocument<
  TParameter extends ParameterReference = ParameterReference,
  TFrameMetadata extends NodeJsonValue = NodeJsonValue,
  TNodeMetadata extends NodeJsonValue = NodeJsonValue,
  TSocketMetadata extends NodeJsonValue = NodeJsonValue,
  TLinkMetadata extends NodeJsonValue = NodeJsonValue,
> = Readonly<{
  formatVersion: 1
  scopes?: never
  groups?: never
  templates?: never
  frames: Ordered<LegacyNodeTreeFrameDocument<TFrameMetadata>>
  nodes: Ordered<LegacyNodeTreeNodeDocument<TParameter, TNodeMetadata, TSocketMetadata>>
  links: Ordered<NodeTreeLinkDocument<TLinkMetadata>>
}> | Readonly<{
  formatVersion: 2
  scopes?: Ordered<GraphScopeDocument>
  groups?: Ordered<NodeGroupDocument>
  templates?: Ordered<NodeTemplateDocument>
  frames: Ordered<NodeTreeFrameDocument<TFrameMetadata>>
  nodes: Ordered<NodeTreeNodeDocument<TParameter, TNodeMetadata, TSocketMetadata>>
  links: Ordered<NodeTreeLinkDocument<TLinkMetadata>>
}>

export type GraphScopeDocument = Readonly<Omit<GraphScope, "id">>
export type NodeGroupDocument = Readonly<Omit<NodeGroup, "id">>
export type NodeTemplateDocument = Readonly<Omit<NodeTemplate, "id">>

export type NodeTreeGenerationParameter<TParameter extends ParameterReference> =
  TParameter extends ParameterReference<infer TValue, infer TPresentation>
    ? Readonly<{
        id: string
        revision: number
        value: TValue
        presentation: TPresentation
        valueType?: NodeValueType
        store: TParameter
      }>
    : Readonly<{
        id: string
        revision: number
        value: NodeJsonValue
        presentation: NodeJsonValue
        valueType?: NodeValueType
        store: TParameter
      }>

export type NodeTreeGenerationNode<
  TParameter extends ParameterReference = ParameterReference,
  TNodeMetadata extends NodeJsonValue = NodeJsonValue,
  TSocketMetadata extends NodeJsonValue = NodeJsonValue,
> = Readonly<{
  id: string
  frameId?: string
  scopeId?: string
  groupId?: string
  instance?: NodeInstanceReference
  parameters: readonly NodeTreeGenerationParameter<TParameter>[]
  sockets: readonly Socket<TSocketMetadata>[]
  metadata?: TNodeMetadata
}>

export type NodeTreeGenerationView<
  TParameter extends ParameterReference = ParameterReference,
  TFrameMetadata extends NodeJsonValue = NodeJsonValue,
  TNodeMetadata extends NodeJsonValue = NodeJsonValue,
  TSocketMetadata extends NodeJsonValue = NodeJsonValue,
  TLinkMetadata extends NodeJsonValue = NodeJsonValue,
> = Readonly<{
  revision: number
  topologyRevision: number
  scopes?: readonly GraphScope[]
  groups?: readonly NodeGroup[]
  templates?: readonly NodeTemplate[]
  frames: readonly Frame<TFrameMetadata>[]
  nodes: readonly NodeTreeGenerationNode<TParameter, TNodeMetadata, TSocketMetadata>[]
  links: readonly Link<TLinkMetadata>[]
  parameter(nodeId: string, parameterId: string): NodeTreeGenerationParameter<TParameter>
}>

export type NodeTreeParameterChange = Readonly<{
  kind: "parameter"
  revision: number
  topologyRevision: number
  nodeId: string
  parameterId: string
  parameterRevision: number
}>

export type NodeTreeTopologyChange = Readonly<{
  kind: "topology"
  revision: number
  topologyRevision: number
}>

export type NodeTreeTopLevelEntityKind = "scope" | "group" | "template" | "frame" | "node" | "link"
export type NodeTreeEntityKind = NodeTreeTopLevelEntityKind | "parameter" | "socket"

export type NodeTreeEntityAddress =
  | Readonly<{kind: NodeTreeTopLevelEntityKind; id: string}>
  | Readonly<{kind: "parameter" | "socket"; nodeId: string; id: string}>

export type NodeTreeTopologyDelta = Readonly<{
  kind: "topology"
  revision: number
  topologyRevision: number
  added: readonly NodeTreeEntityAddress[]
  removed: readonly NodeTreeEntityAddress[]
  updated: readonly NodeTreeEntityAddress[]
}>

export type NodeTreeParameterDelta = NodeTreeParameterChange
export type NodeTreeDelta = NodeTreeTopologyDelta | NodeTreeParameterDelta

export type NodeTreeChange = NodeTreeParameterChange | NodeTreeTopologyChange

export type NodeTreeReconcileRequest<
  TParameter extends ParameterReference = ParameterReference,
  TFrameMetadata extends NodeJsonValue = NodeJsonValue,
  TNodeMetadata extends NodeJsonValue = NodeJsonValue,
  TSocketMetadata extends NodeJsonValue = NodeJsonValue,
  TLinkMetadata extends NodeJsonValue = NodeJsonValue,
> = Readonly<{
  expectedRevision: number
  definition: NodeTreeDefinition<
    TParameter,
    TFrameMetadata,
    TNodeMetadata,
    TSocketMetadata,
    TLinkMetadata
  >
}>

export type NodeTreeReconcileResult = Readonly<{
  changed: boolean
  revision: number
  topologyRevision: number
}>

type CompletedProjection = Readonly<{
  revision: number
  topologyRevision: number
  projection: unknown
}>

type ProjectionCacheEntry = {
  completed?: CompletedProjection
  pending: Map<string, Promise<unknown>>
}

/** Projection finished after the live tree moved to a newer revision. */
export class StaleNodeTreeProjectionError extends Error {
  constructor(
    readonly sourceRevision: number,
    readonly currentRevision: number,
  ) {
    super(`Stale NodeTree projection: ${sourceRevision} < ${currentRevision}`)
    this.name = "StaleNodeTreeProjectionError"
  }
}

/** A structural authoring request was based on an older live tree revision. */
export class NodeTreeRevisionConflictError extends Error {
  constructor(
    readonly expectedRevision: number,
    readonly currentRevision: number,
  ) {
    super(`NodeTree revision conflict: expected ${expectedRevision}, current ${currentRevision}`)
    this.name = "NodeTreeRevisionConflictError"
  }
}

type ParameterSubscription<TParameter extends ParameterReference> = Readonly<{
  key: string
  parameter: TParameter
  unsubscribe: () => void
}>

type NodeTreePublication = Readonly<{
  change: NodeTreeChange
  delta: NodeTreeDelta
}>

/**
 * Live owner of immutable Node topology and observable Parameter values.
 * Concrete UI measurement and layout remain injected through `project()`.
 */
export class NodeTree<
  TParameter extends ParameterReference = ParameterReference,
  TFrameMetadata extends NodeJsonValue = NodeJsonValue,
  TNodeMetadata extends NodeJsonValue = NodeJsonValue,
  TSocketMetadata extends NodeJsonValue = NodeJsonValue,
  TLinkMetadata extends NodeJsonValue = NodeJsonValue,
> {
  #scopes: readonly GraphScope[]
  #groups: readonly NodeGroup[]
  #templates: readonly NodeTemplate[]
  #frames: readonly Frame<TFrameMetadata>[]
  #nodes: readonly Node<TParameter, TNodeMetadata, TSocketMetadata>[]
  #links: readonly Link<TLinkMetadata>[]
  #parameters: Map<string, TParameter>
  #parameterSubscriptions: Map<string, ParameterSubscription<TParameter>>
  readonly #orphanedParameterSubscriptions = new Set<ParameterSubscription<TParameter>>()
  readonly #listeners = new Set<(change: NodeTreeChange) => void>()
  readonly #deltaListeners = new Set<(delta: NodeTreeDelta) => void>()
  readonly #publicationQueue: NodeTreePublication[] = []
  #deliveringPublications = false
  #projectionCache = new WeakMap<object, Map<string, ProjectionCacheEntry>>()
  #revision = 0
  #topologyRevision = 0
  #externalSnapshot: NodeTreeSnapshot<
    TParameter,
    TFrameMetadata,
    TNodeMetadata,
    TSocketMetadata,
    TLinkMetadata
  > | null = null
  #disposed = false
  readonly #policy: InternalNodeTreePolicy | undefined

  constructor(
    definition: NodeTreeDefinition<
      TParameter,
      TFrameMetadata,
      TNodeMetadata,
      TSocketMetadata,
      TLinkMetadata
    >,
  ) {
    this.#policy = consumeNodeTreePolicy(definition)
    const owned = ownAndValidateDefinition(definition, this.#policy)
    this.#scopes = owned.scopes
    this.#groups = owned.groups
    this.#templates = owned.templates
    this.#frames = owned.frames
    this.#nodes = owned.nodes
    this.#links = owned.links
    this.#parameters = indexParameters(owned.nodes)
    this.#parameterSubscriptions = this.#prepareParameterSubscriptions(this.#parameters)
  }

  get revision(): number {
    return this.#revision
  }

  get topologyRevision(): number {
    return this.#topologyRevision
  }

  get frames(): readonly Frame<TFrameMetadata>[] {
    return this.#frames
  }

  get scopes(): readonly GraphScope[] {
    return this.#scopes
  }

  get groups(): readonly NodeGroup[] {
    return this.#groups
  }

  get templates(): readonly NodeTemplate[] {
    return this.#templates
  }

  get nodes(): readonly Node<TParameter, TNodeMetadata, TSocketMetadata>[] {
    return this.#nodes
  }

  get links(): readonly Link<TLinkMetadata>[] {
    return this.#links
  }

  /** Current immutable topology with its exact live Parameter stores. */
  definition(): NodeTreeDefinition<
    TParameter,
    TFrameMetadata,
    TNodeMetadata,
    TSocketMetadata,
    TLinkMetadata
  > {
    return freeze({
      ...(this.#scopes.length === 0 ? {} : {scopes: this.#scopes}),
      ...(this.#groups.length === 0 ? {} : {groups: this.#groups}),
      ...(this.#templates.length === 0 ? {} : {templates: this.#templates}),
      frames: this.#frames,
      nodes: this.#nodes,
      links: this.#links,
    })
  }

  /** Stable ID-addressed JSON authoring view without runtime methods or revisions. */
  document(): NodeTreeDocument<
    TParameter,
    TFrameMetadata,
    TNodeMetadata,
    TSocketMetadata,
    TLinkMetadata
  > {
    return this.#readRevisionFenced(() => documentFromDefinition(this.definition()))
  }

  parameter(nodeId: string, parameterId: string): TParameter {
    const parameter = this.#parameters.get(parameterKey(nodeId, parameterId))
    if (parameter === undefined) throw new Error(`Unknown Parameter: ${nodeId}/${parameterId}`)
    return parameter
  }

  subscribe(listener: (change: NodeTreeChange) => void): () => void {
    this.#listeners.add(listener)
    let subscribed = true
    return () => {
      if (!subscribed) return
      subscribed = false
      this.#listeners.delete(listener)
    }
  }

  /** Detailed incremental changes without introducing another graph store. */
  subscribeDelta(listener: (delta: NodeTreeDelta) => void): () => void {
    this.#deltaListeners.add(listener)
    let subscribed = true
    return () => {
      if (!subscribed) return
      subscribed = false
      this.#deltaListeners.delete(listener)
    }
  }

  reconcile(
    request: NodeTreeReconcileRequest<
      TParameter,
      TFrameMetadata,
      TNodeMetadata,
      TSocketMetadata,
      TLinkMetadata
    >,
  ): NodeTreeReconcileResult {
    this.#requireReconcileRevision(request.expectedRevision)

    const owned = ownAndValidateDefinition(request.definition, this.#policy)
    const nextParameters = indexParameters(owned.nodes)
    requirePreservedParameterIdentity(this.#parameters, nextParameters)
    if (sameDefinition(this.definition(), owned, this.#policy)) {
      return freeze({
        changed: false,
        revision: this.#revision,
        topologyRevision: this.#topologyRevision,
      })
    }
    const delta = this.#policy?.delta(
      this.definition(),
      owned,
      this.#revision + 1,
      this.#topologyRevision + 1,
    ) ?? emptyTopologyDelta(this.#revision + 1, this.#topologyRevision + 1)

    const preparedSubscriptions = new Map<string, ParameterSubscription<TParameter>>()
    try {
      for (const [key, parameter] of nextParameters) {
        const current = this.#parameterSubscriptions.get(key)
        if (current?.parameter === parameter) {
          preparedSubscriptions.set(key, current)
          continue
        }
        preparedSubscriptions.set(key, this.#subscribeParameter(key, parameter))
      }
    } catch (error) {
      throw this.#rollbackPreparedSubscriptions(
        preparedSubscriptions,
        this.#parameterSubscriptions,
        error,
      )
    }

    try {
      this.#requireExpectedRevision(request.expectedRevision)
    } catch (error) {
      throw this.#rollbackPreparedSubscriptions(
        preparedSubscriptions,
        this.#parameterSubscriptions,
        error,
      )
    }

    const removedSubscriptions = [...this.#parameterSubscriptions]
      .filter(([key, subscription]) => preparedSubscriptions.get(key) !== subscription)
      .map(([, subscription]) => subscription)

    this.#scopes = owned.scopes
    this.#groups = owned.groups
    this.#templates = owned.templates
    this.#frames = owned.frames
    this.#nodes = owned.nodes
    this.#links = owned.links
    this.#parameters = nextParameters
    this.#parameterSubscriptions = preparedSubscriptions
    this.#policy?.reconciled?.(this.definition())
    return this.#finishTopologyCommit(delta, removedSubscriptions)
  }

  protected commitAppend(
    expectedRevision: number,
    node: Node<TParameter, TNodeMetadata, TSocketMetadata>,
    delta: NodeTreeTopologyDelta,
    committed: () => void,
  ): NodeTreeReconcileResult {
    this.#requireReconcileRevision(expectedRevision)
    const subscriptions = new Map<string, ParameterSubscription<TParameter>>()
    try {
      for (const parameter of node.parameters ?? []) {
        const key = parameterKey(node.id, parameter.id)
        subscriptions.set(key, this.#subscribeParameter(key, parameter))
      }
      this.#requireExpectedRevision(expectedRevision)
    } catch (error) {
      throw this.#rollbackPreparedSubscriptions(subscriptions, this.#parameterSubscriptions, error)
    }
    this.#nodes = freeze(this.#nodes.concat(node))
    for (const parameter of node.parameters ?? []) {
      const key = parameterKey(node.id, parameter.id)
      this.#parameters.set(key, parameter)
      this.#parameterSubscriptions.set(key, subscriptions.get(key)!)
    }
    committed()
    return this.#finishTopologyCommit(delta, [])
  }

  #finishTopologyCommit(
    delta: NodeTreeTopologyDelta,
    removedSubscriptions: readonly ParameterSubscription<TParameter>[],
  ): NodeTreeReconcileResult {
    this.#revision = delta.revision
    this.#topologyRevision = delta.topologyRevision
    this.#externalSnapshot = null
    const result = freeze({
      changed: true,
      revision: this.#revision,
      topologyRevision: this.#topologyRevision,
    })
    const errors: unknown[] = []
    for (const subscription of removedSubscriptions) {
      try { subscription.unsubscribe() } catch (error) {
        this.#orphanedParameterSubscriptions.add(subscription)
        errors.push(error)
      }
    }
    const change: NodeTreeTopologyChange = freeze({
      kind: "topology",
      revision: result.revision,
      topologyRevision: result.topologyRevision,
    })
    errors.push(...this.#publish(change, delta))
    if (errors.length > 0) throw new AggregateError(errors, "NodeTree topology listener failure")
    return result
  }

  snapshot(): NodeTreeSnapshot<
    TParameter,
    TFrameMetadata,
    TNodeMetadata,
    TSocketMetadata,
    TLinkMetadata
  > {
    return snapshotFromGeneration(this.#captureGeneration())
  }

  /** Stable by reference until the next committed tree revision. */
  getSnapshot(): NodeTreeSnapshot<
    TParameter,
    TFrameMetadata,
    TNodeMetadata,
    TSocketMetadata,
    TLinkMetadata
  > {
    this.#externalSnapshot ??= this.snapshot()
    return this.#externalSnapshot
  }

  toJSON(): NodeTreeSnapshot<
    TParameter,
    TFrameMetadata,
    TNodeMetadata,
    TSocketMetadata,
    TLinkMetadata
  > {
    return this.snapshot()
  }

  project<TContext, TProjection>(
    projector: NodeTreeProjector<
      NodeTreeGenerationView<
        TParameter,
        TFrameMetadata,
        TNodeMetadata,
        TSocketMetadata,
        TLinkMetadata
      >,
      NodeTreeSnapshot<TParameter, TFrameMetadata, TNodeMetadata, TSocketMetadata, TLinkMetadata>,
      TContext,
      TProjection
    >,
    request: NodeTreeProjectionRequest<TContext>,
  ): Promise<TProjection> {
    if (typeof projector !== "object" || projector === null || typeof projector.project !== "function") {
      return Promise.reject(new TypeError("NodeTree projector must provide project()"))
    }
    if (request.cacheKey.trim().length === 0) {
      return Promise.reject(new Error("NodeTree projection cacheKey must be non-empty"))
    }

    let contexts = this.#projectionCache.get(projector)
    if (contexts === undefined) {
      contexts = new Map()
      this.#projectionCache.set(projector, contexts)
    }
    let cache = contexts.get(request.cacheKey)
    if (cache === undefined) {
      cache = {pending: new Map()}
      contexts.set(request.cacheKey, cache)
    }
    if (cache.completed?.revision === this.#revision &&
      cache.completed.topologyRevision === this.#topologyRevision) {
      return Promise.resolve(cache.completed.projection as TProjection)
    }

    const generation = this.#captureGeneration()
    const sourceRevision = generation.revision
    const sourceTopologyRevision = generation.topologyRevision
    const generationKey = `${sourceTopologyRevision}:${sourceRevision}`
    const pending = cache.pending.get(generationKey)
    if (pending !== undefined) return pending as Promise<TProjection>

    const previous = cache.completed === undefined ? undefined : freeze({
      revision: cache.completed.revision,
      topologyRevision: cache.completed.topologyRevision,
      projection: cache.completed.projection as TProjection,
    }) satisfies PriorNodeTreeProjection<TProjection>
    const snapshot = snapshotFromGeneration(generation)
    const promise = Promise.resolve().then(() => projector.project({
      tree: generation,
      snapshot,
      context: request.context,
      ...(previous === undefined ? {} : {previous}),
    })).then((projection) => {
      cache!.pending.delete(generationKey)
      if (this.#revision !== sourceRevision || this.#topologyRevision !== sourceTopologyRevision) {
        throw new StaleNodeTreeProjectionError(sourceRevision, this.#revision)
      }
      const completed = cache!.completed
      if (completed === undefined || isLaterProjection(
        sourceRevision,
        sourceTopologyRevision,
        completed.revision,
        completed.topologyRevision,
      )) {
        cache!.completed = freeze({
          revision: sourceRevision,
          topologyRevision: sourceTopologyRevision,
          projection,
        })
      }
      return projection
    }, (error: unknown) => {
      cache!.pending.delete(generationKey)
      throw error
    })
    cache.pending.set(generationKey, promise)
    return promise
  }

  clearProjectionCache(): void {
    this.#projectionCache = new WeakMap()
  }

  dispose(): void {
    this.#disposed = true
    this.#listeners.clear()
    this.#deltaListeners.clear()
    this.clearProjectionCache()
    const errors: unknown[] = []
    for (const [key, subscription] of [...this.#parameterSubscriptions]) {
      try {
        subscription.unsubscribe()
        if (this.#parameterSubscriptions.get(key) === subscription) {
          this.#parameterSubscriptions.delete(key)
        }
      } catch (error) {
        errors.push(error)
      }
    }
    for (const subscription of [...this.#orphanedParameterSubscriptions]) {
      try {
        subscription.unsubscribe()
        this.#orphanedParameterSubscriptions.delete(subscription)
      } catch (error) {
        errors.push(error)
      }
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, "NodeTree disposal cleanup failure")
    }
  }

  #captureGeneration(): NodeTreeGenerationView<
    TParameter,
    TFrameMetadata,
    TNodeMetadata,
    TSocketMetadata,
    TLinkMetadata
  > {
    return this.#readRevisionFenced((revision, topologyRevision) =>
      this.#captureGenerationAttempt(revision, topologyRevision))
  }

  #captureGenerationAttempt(
    revision: number,
    topologyRevision: number,
  ): NodeTreeGenerationView<
    TParameter,
    TFrameMetadata,
    TNodeMetadata,
    TSocketMetadata,
    TLinkMetadata
  > {
    const parameters = new Map<string, NodeTreeGenerationParameter<TParameter>>()
    const nodes = freeze(this.#nodes.map((node): NodeTreeGenerationNode<
      TParameter,
      TNodeMetadata,
      TSocketMetadata
    > => {
      const generationParameters = freeze((node.parameters ?? []).map((parameter) => {
        const captured = captureGenerationParameter(parameter, node.id)
        parameters.set(parameterKey(node.id, parameter.id), captured)
        return captured
      }))
      return freeze({
        id: node.id,
        ...(node.frameId === undefined ? {} : {frameId: node.frameId}),
        ...(node.scopeId === undefined ? {} : {scopeId: node.scopeId}),
        ...(node.groupId === undefined ? {} : {groupId: node.groupId}),
        ...(node.instance === undefined ? {} : {instance: node.instance}),
        parameters: generationParameters,
        sockets: node.sockets ?? freeze([]),
        ...(node.metadata === undefined ? {} : {metadata: node.metadata}),
      })
    }))
    return freeze({
      revision,
      topologyRevision,
      ...(this.#scopes.length === 0 ? {} : {scopes: this.#scopes}),
      ...(this.#groups.length === 0 ? {} : {groups: this.#groups}),
      ...(this.#templates.length === 0 ? {} : {templates: this.#templates}),
      frames: this.#frames,
      nodes,
      links: this.#links,
      parameter(nodeId: string, parameterId: string): NodeTreeGenerationParameter<TParameter> {
        const parameter = parameters.get(parameterKey(nodeId, parameterId))
        if (parameter === undefined) throw new Error(`Unknown Parameter: ${nodeId}/${parameterId}`)
        return parameter
      },
    })
  }

  #readRevisionFenced<Result>(
    read: (revision: number, topologyRevision: number) => Result,
  ): Result {
    for (let attempt = 0; attempt < MAX_GENERATION_CAPTURE_ATTEMPTS; attempt += 1) {
      const revision = this.#revision
      const topologyRevision = this.#topologyRevision
      const result = read(revision, topologyRevision)
      if (revision === this.#revision && topologyRevision === this.#topologyRevision) return result
    }
    throw new Error("Unstable NodeTree read")
  }

  #prepareParameterSubscriptions(
    parameters: ReadonlyMap<string, TParameter>,
  ): Map<string, ParameterSubscription<TParameter>> {
    const subscriptions = new Map<string, ParameterSubscription<TParameter>>()
    try {
      for (const [key, parameter] of parameters) {
        subscriptions.set(key, this.#subscribeParameter(key, parameter))
      }
      return subscriptions
    } catch (error) {
      throw this.#rollbackPreparedSubscriptions(subscriptions, new Map(), error)
    }
  }

  #subscribeParameter(
    key: string,
    parameter: TParameter,
  ): ParameterSubscription<TParameter> {
    const [nodeId, parameterId] = parseParameterKey(key)
    let subscription: ParameterSubscription<TParameter> | undefined
    const unsubscribe = parameter.subscribe(() => {
      if (this.#disposed || subscription === undefined ||
        this.#parameterSubscriptions.get(key) !== subscription) return
      this.#revision += 1
      this.#externalSnapshot = null
      const change: NodeTreeParameterChange = freeze({
        kind: "parameter",
        revision: this.#revision,
        topologyRevision: this.#topologyRevision,
        nodeId,
        parameterId,
        parameterRevision: parameter.revision,
      })
      const errors = this.#publish(change, change)
      if (errors.length > 0) {
        throw new AggregateError(errors, `NodeTree Parameter listener failure: ${nodeId}/${parameterId}`)
      }
    })
    subscription = freeze({key, parameter, unsubscribe})
    return subscription
  }

  #publish(change: NodeTreeChange, delta: NodeTreeDelta): unknown[] {
    this.#publicationQueue.push({change, delta})
    if (this.#deliveringPublications) return []
    this.#deliveringPublications = true
    const errors: unknown[] = []
    try {
      for (let index = 0; index < this.#publicationQueue.length; index += 1) {
        const publication = this.#publicationQueue[index]!
        for (const listener of [...this.#deltaListeners]) {
          try {
            listener(publication.delta)
          } catch (error) {
            errors.push(error)
          }
        }
        for (const listener of [...this.#listeners]) {
          try {
            listener(publication.change)
          } catch (error) {
            errors.push(error)
          }
        }
      }
    } finally {
      this.#publicationQueue.length = 0
      this.#deliveringPublications = false
    }
    return errors
  }

  #rollbackPreparedSubscriptions(
    prepared: ReadonlyMap<string, ParameterSubscription<TParameter>>,
    retained: ReadonlyMap<string, ParameterSubscription<TParameter>>,
    cause: unknown,
  ): unknown {
    const errors: unknown[] = [cause]
    for (const [key, subscription] of prepared) {
      if (retained.get(key) === subscription) continue
      try {
        subscription.unsubscribe()
      } catch (error) {
        this.#orphanedParameterSubscriptions.add(subscription)
        errors.push(error)
      }
    }
    return errors.length === 1
      ? cause
      : new AggregateError(errors, "NodeTree subscription rollback failure")
  }

  #requireExpectedRevision(expectedRevision: number): void {
    if (this.#revision !== expectedRevision) {
      throw new NodeTreeRevisionConflictError(expectedRevision, this.#revision)
    }
  }

  #requireReconcileRevision(expectedRevision: number): void {
    if (this.#disposed) throw new Error("NodeTree is disposed")
    requireRevision(expectedRevision)
    this.#requireExpectedRevision(expectedRevision)
  }
}

/** @internal Canonical specialization with no state beyond the inherited NodeTree. */
export class FoundationNodeTree<
  TParameter extends ParameterReference = ParameterReference,
  TFrameMetadata extends NodeJsonValue = NodeJsonValue,
  TNodeMetadata extends NodeJsonValue = NodeJsonValue,
  TSocketMetadata extends NodeJsonValue = NodeJsonValue,
  TLinkMetadata extends NodeJsonValue = NodeJsonValue,
> extends NodeTree<TParameter, TFrameMetadata, TNodeMetadata, TSocketMetadata, TLinkMetadata> {
  readonly #foundationPolicy: InternalNodeTreePolicy

  constructor(
    definition: NodeTreeDefinition<
      TParameter,
      TFrameMetadata,
      TNodeMetadata,
      TSocketMetadata,
      TLinkMetadata
    >,
    policy: InternalNodeTreePolicy,
  ) {
    super(definition)
    this.#foundationPolicy = policy
  }

  override reconcile(
    request: NodeTreeReconcileRequest<
      TParameter,
      TFrameMetadata,
      TNodeMetadata,
      TSocketMetadata,
      TLinkMetadata
    >,
  ): NodeTreeReconcileResult {
    const current = this.definition()
    const source = singleAppendedNode(current, request.definition)
    if (source === null || this.#foundationPolicy.append === undefined) return super.reconcile(request)
    const candidate = ownAndValidateDefinition({
      ...(current.scopes === undefined ? {} : {scopes: current.scopes}),
      ...(current.groups === undefined ? {} : {groups: current.groups}),
      ...(current.templates === undefined ? {} : {templates: current.templates}),
      frames: current.frames ?? [],
      nodes: [source],
      links: [],
    }, this.#foundationPolicy)
    const node = candidate.nodes[0] as Node<TParameter, TNodeMetadata, TSocketMetadata>
    const plan = this.#foundationPolicy.append(
      current,
      node,
      this.revision + 1,
      this.topologyRevision + 1,
    )
    return this.commitAppend(request.expectedRevision, node, plan.delta, plan.committed)
  }
}

function captureGenerationParameter<TParameter extends ParameterReference>(
  parameter: TParameter,
  nodeId: string,
): NodeTreeGenerationParameter<TParameter> {
  const snapshot = parameter.snapshot()
  if (snapshot.id !== parameter.id) {
    throw new Error(`Parameter snapshot identity differs: ${nodeId}/${parameter.id}/${snapshot.id}`)
  }
  return freeze({
    id: parameter.id,
    revision: snapshot.revision,
    value: ownNodeJsonValue(snapshot.value, `Parameter generation value: ${nodeId}/${parameter.id}`),
    presentation: ownNodeJsonValue(
      snapshot.presentation,
      `Parameter generation presentation: ${nodeId}/${parameter.id}`,
    ),
    ...(snapshot.valueType === undefined ? {} : {valueType: snapshot.valueType}),
    store: parameter,
  }) as NodeTreeGenerationParameter<TParameter>
}

function snapshotFromGeneration<
  TParameter extends ParameterReference,
  TFrameMetadata extends NodeJsonValue,
  TNodeMetadata extends NodeJsonValue,
  TSocketMetadata extends NodeJsonValue,
  TLinkMetadata extends NodeJsonValue,
>(
  generation: NodeTreeGenerationView<
    TParameter,
    TFrameMetadata,
    TNodeMetadata,
    TSocketMetadata,
    TLinkMetadata
  >,
): NodeTreeSnapshot<
  TParameter,
  TFrameMetadata,
  TNodeMetadata,
  TSocketMetadata,
  TLinkMetadata
> {
  return freeze({
    revision: generation.revision,
    topologyRevision: generation.topologyRevision,
    ...(generation.scopes === undefined ? {} : {scopes: generation.scopes}),
    ...(generation.groups === undefined ? {} : {groups: generation.groups}),
    ...(generation.templates === undefined ? {} : {templates: generation.templates}),
    frames: generation.frames,
    nodes: freeze(generation.nodes.map((node) => freeze({
      id: node.id,
      ...(node.frameId === undefined ? {} : {frameId: node.frameId}),
      ...(node.scopeId === undefined ? {} : {scopeId: node.scopeId}),
      ...(node.groupId === undefined ? {} : {groupId: node.groupId}),
      ...(node.instance === undefined ? {} : {instance: node.instance}),
      parameters: freeze(node.parameters.map((parameter) => freeze({
        id: parameter.id,
        revision: parameter.revision,
        value: parameter.value,
        presentation: parameter.presentation,
        ...(parameter.valueType === undefined ? {} : {valueType: parameter.valueType}),
      }))) as readonly NodeTreeParameterSnapshot<TParameter>[],
      sockets: node.sockets,
      ...(node.metadata === undefined ? {} : {metadata: node.metadata}),
    }))),
    links: generation.links,
  })
}

function documentFromDefinition<
  TParameter extends ParameterReference,
  TFrameMetadata extends NodeJsonValue,
  TNodeMetadata extends NodeJsonValue,
  TSocketMetadata extends NodeJsonValue,
  TLinkMetadata extends NodeJsonValue,
>(
  definition: NodeTreeDefinition<
    TParameter,
    TFrameMetadata,
    TNodeMetadata,
    TSocketMetadata,
    TLinkMetadata
  >,
): NodeTreeDocument<
  TParameter,
  TFrameMetadata,
  TNodeMetadata,
  TSocketMetadata,
  TLinkMetadata
> {
  const scopes = definition.scopes === undefined ? undefined : ordered(definition.scopes.map((scope) => [
    scope.id,
    freeze({
      kind: scope.kind,
      ...(scope.parentScopeId === undefined ? {} : {parentScopeId: scope.parentScopeId}),
      ...(scope.instance === undefined ? {} : {instance: scope.instance}),
      ...(scope.metadata === undefined ? {} : {metadata: scope.metadata}),
    }),
  ] as const))
  const groups = definition.groups === undefined ? undefined : ordered(definition.groups.map((group) => [
    group.id,
    freeze({
      ...(group.scopeId === undefined ? {} : {scopeId: group.scopeId}),
      ...(group.parentGroupId === undefined ? {} : {parentGroupId: group.parentGroupId}),
      ...(group.metadata === undefined ? {} : {metadata: group.metadata}),
    }),
  ] as const))
  const templates = definition.templates === undefined ? undefined : ordered(definition.templates.map((template) => [
    template.id,
    freeze({
      version: template.version,
      kind: template.kind,
      ...(template.metadata === undefined ? {} : {metadata: template.metadata}),
    }),
  ] as const))
  const frames = ordered((definition.frames ?? []).map((frame) => [
    frame.id,
    freeze({
      ...(frame.parentFrameId === undefined ? {} : {parentFrameId: frame.parentFrameId}),
      ...(frame.scopeId === undefined ? {} : {scopeId: frame.scopeId}),
      ...(frame.groupId === undefined ? {} : {groupId: frame.groupId}),
      ...(frame.metadata === undefined ? {} : {metadata: frame.metadata}),
    }),
  ] as const))
  const nodes = ordered(definition.nodes.map((node) => [
    node.id,
    freeze({
      ...(node.frameId === undefined ? {} : {frameId: node.frameId}),
      ...(node.scopeId === undefined ? {} : {scopeId: node.scopeId}),
      ...(node.groupId === undefined ? {} : {groupId: node.groupId}),
      ...(node.instance === undefined ? {} : {instance: node.instance}),
      parameters: ordered((node.parameters ?? []).map((parameter) => {
        const snapshot = parameter.snapshot()
        return [parameter.id, freeze({
          value: ownNodeJsonValue(snapshot.value, `Parameter document value: ${node.id}/${parameter.id}`),
          presentation: ownNodeJsonValue(
            snapshot.presentation,
            `Parameter document presentation: ${node.id}/${parameter.id}`,
          ),
          ...(snapshot.valueType === undefined ? {} : {valueType: snapshot.valueType}),
        })] as const
      })) as Ordered<NodeTreeParameterDocument<TParameter>>,
      sockets: ordered((node.sockets ?? []).map((socket) => [
        socket.id,
        freeze({
          direction: socket.direction,
          ...(socket.parameterId === undefined ? {} : {parameterId: socket.parameterId}),
          ...(socket.side === undefined ? {} : {side: socket.side}),
          ...(socket.valueType === undefined ? {} : {valueType: socket.valueType}),
          ...(socket.metadata === undefined ? {} : {metadata: socket.metadata}),
        }),
      ] as const)),
      ...(node.metadata === undefined ? {} : {metadata: node.metadata}),
    }),
  ] as const))
  const links = ordered((definition.links ?? []).map((link) => [
    link.id,
    freeze({
      from: freeze({...link.from}),
      to: freeze({...link.to}),
      ...(link.metadata === undefined ? {} : {metadata: link.metadata}),
    }),
  ] as const))
  const formatVersion = hasFoundationDocumentFeatures(definition) ? 2 : 1
  return freeze({
    formatVersion,
    ...(scopes === undefined ? {} : {scopes}),
    ...(groups === undefined ? {} : {groups}),
    ...(templates === undefined ? {} : {templates}),
    frames,
    nodes,
    links,
  }) as unknown as NodeTreeDocument<
    TParameter,
    TFrameMetadata,
    TNodeMetadata,
    TSocketMetadata,
    TLinkMetadata
  >
}

function hasFoundationDocumentFeatures(definition: NodeTreeDefinition): boolean {
  if (definition.scopes !== undefined || definition.groups !== undefined || definition.templates !== undefined) return true
  if ((definition.frames ?? []).some((frame) => frame.scopeId !== undefined || frame.groupId !== undefined)) return true
  return definition.nodes.some((node) => node.scopeId !== undefined || node.groupId !== undefined ||
    node.instance !== undefined || (node.parameters ?? []).some((parameter) => parameter.valueType !== undefined) ||
    (node.sockets ?? []).some((socket) => socket.valueType !== undefined))
}

function hasFoundationDefinitionFeatures(definition: NodeTreeDefinition): boolean {
  return hasFoundationDocumentFeatures(definition)
}

function ordered<T>(entries: readonly (readonly [string, T])[]): Ordered<T> {
  return freeze({
    order: freeze(entries.map(([id]) => id)),
    byId: freeze(Object.fromEntries(entries)) as Readonly<Record<string, T>>,
  })
}

function indexParameters<TParameter extends ParameterReference>(
  nodes: readonly Node<TParameter, NodeJsonValue, NodeJsonValue>[],
): Map<string, TParameter> {
  const parameters = new Map<string, TParameter>()
  for (const node of nodes) {
    for (const parameter of node.parameters ?? []) {
      parameters.set(parameterKey(node.id, parameter.id), parameter)
    }
  }
  return parameters
}

function singleAppendedNode(
  current: NodeTreeDefinition,
  next: NodeTreeDefinition,
): Node | null {
  if (next.nodes.length !== current.nodes.length + 1 || next.frames !== current.frames ||
    next.links !== current.links || next.scopes !== current.scopes || next.groups !== current.groups ||
    next.templates !== current.templates) return null
  for (let index = 0; index < current.nodes.length; index += 1) {
    if (next.nodes[index] !== current.nodes[index]) return null
  }
  return next.nodes[next.nodes.length - 1] ?? null
}

function requirePreservedParameterIdentity<TParameter extends ParameterReference>(
  current: ReadonlyMap<string, TParameter>,
  next: ReadonlyMap<string, TParameter>,
): void {
  for (const [key, parameter] of current) {
    const nextParameter = next.get(key)
    if (nextParameter !== undefined && nextParameter !== parameter) {
      const [nodeId, parameterId] = parseParameterKey(key)
      throw new Error(`Parameter identity must be preserved: ${nodeId}/${parameterId}`)
    }
  }
}

function sameDefinition<
  TParameter extends ParameterReference,
  TFrameMetadata extends NodeJsonValue,
  TNodeMetadata extends NodeJsonValue,
  TSocketMetadata extends NodeJsonValue,
  TLinkMetadata extends NodeJsonValue,
>(
  left: NodeTreeDefinition<TParameter, TFrameMetadata, TNodeMetadata, TSocketMetadata, TLinkMetadata>,
  right: NodeTreeDefinition<TParameter, TFrameMetadata, TNodeMetadata, TSocketMetadata, TLinkMetadata>,
  validation: InternalNodeTreePolicy | undefined,
): boolean {
  if (validation?.same(left, right) === false) return false
  const leftFrames = left.frames ?? []
  const rightFrames = right.frames ?? []
  if (leftFrames.length !== rightFrames.length) return false
  for (let index = 0; index < leftFrames.length; index += 1) {
    const leftFrame = leftFrames[index]!
    const rightFrame = rightFrames[index]!
    if (leftFrame.id !== rightFrame.id || leftFrame.parentFrameId !== rightFrame.parentFrameId ||
      !equalOptionalNodeJsonValue(leftFrame.metadata, rightFrame.metadata)) return false
  }

  if (left.nodes.length !== right.nodes.length) return false
  for (let index = 0; index < left.nodes.length; index += 1) {
    const leftNode = left.nodes[index]!
    const rightNode = right.nodes[index]!
    if (leftNode.id !== rightNode.id || leftNode.frameId !== rightNode.frameId ||
      !equalOptionalNodeJsonValue(leftNode.metadata, rightNode.metadata)) return false
    const leftParameters = leftNode.parameters ?? []
    const rightParameters = rightNode.parameters ?? []
    if (leftParameters.length !== rightParameters.length ||
      leftParameters.some((parameter, parameterIndex) => parameter !== rightParameters[parameterIndex])) return false
    const leftSockets = leftNode.sockets ?? []
    const rightSockets = rightNode.sockets ?? []
    if (leftSockets.length !== rightSockets.length) return false
    for (let socketIndex = 0; socketIndex < leftSockets.length; socketIndex += 1) {
      const leftSocket = leftSockets[socketIndex]!
      const rightSocket = rightSockets[socketIndex]!
      if (leftSocket.id !== rightSocket.id || leftSocket.direction !== rightSocket.direction ||
        leftSocket.parameterId !== rightSocket.parameterId || leftSocket.side !== rightSocket.side ||
        !equalOptionalNodeJsonValue(leftSocket.metadata, rightSocket.metadata)) return false
    }
  }

  const leftLinks = left.links ?? []
  const rightLinks = right.links ?? []
  if (leftLinks.length !== rightLinks.length) return false
  for (let index = 0; index < leftLinks.length; index += 1) {
    const leftLink = leftLinks[index]!
    const rightLink = rightLinks[index]!
    if (leftLink.id !== rightLink.id || leftLink.from.nodeId !== rightLink.from.nodeId ||
      leftLink.from.socketId !== rightLink.from.socketId || leftLink.to.nodeId !== rightLink.to.nodeId ||
      leftLink.to.socketId !== rightLink.to.socketId ||
      !equalOptionalNodeJsonValue(leftLink.metadata, rightLink.metadata)) return false
  }
  return true
}

function emptyTopologyDelta(revision: number, topologyRevision: number): NodeTreeTopologyDelta {
  return freeze({
    kind: "topology",
    revision,
    topologyRevision,
    added: freeze([]),
    removed: freeze([]),
    updated: freeze([]),
  })
}

function equalOptionalNodeJsonValue(
  left: NodeJsonValue | undefined,
  right: NodeJsonValue | undefined,
): boolean {
  if (left === undefined || right === undefined) return left === right
  return equalNodeJsonValue(left, right)
}

function requireRevision(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError("Invalid NodeTree expectedRevision")
  }
}

function ownAndValidateDefinition<
  TParameter extends ParameterReference,
  TFrameMetadata extends NodeJsonValue,
  TNodeMetadata extends NodeJsonValue,
  TSocketMetadata extends NodeJsonValue,
  TLinkMetadata extends NodeJsonValue,
>(
  definition: NodeTreeDefinition<TParameter, TFrameMetadata, TNodeMetadata, TSocketMetadata, TLinkMetadata>,
  policy: InternalNodeTreePolicy | undefined,
): Readonly<{
  scopes: readonly GraphScope[]
  groups: readonly NodeGroup[]
  templates: readonly NodeTemplate[]
  frames: readonly Frame<TFrameMetadata>[]
  nodes: readonly Node<TParameter, TNodeMetadata, TSocketMetadata>[]
  links: readonly Link<TLinkMetadata>[]
}> {
  if (hasFoundationDefinitionFeatures(definition) && policy === undefined) {
    throw new Error("Use createNodeTree()")
  }
  policy?.validate(definition as NodeTreeDefinition)
  const templates = ownTemplateData(definition.templates ?? [])
  const scopes = ownScopeData(definition.scopes ?? [])
  const groups = ownGroupData(definition.groups ?? [])
  const frameIds = new Set<string>()
  const frames = freeze((definition.frames ?? []).map((frame): Frame<TFrameMetadata> => {
    requireIdentifier(frame.id, "Frame")
    if (frameIds.has(frame.id)) throw new Error(`Duplicate Frame id: ${frame.id}`)
    frameIds.add(frame.id)
    return freeze({
      id: frame.id,
      ...(frame.parentFrameId === undefined ? {} : {parentFrameId: frame.parentFrameId}),
      ...(frame.scopeId === undefined ? {} : {scopeId: frame.scopeId}),
      ...(frame.groupId === undefined ? {} : {groupId: frame.groupId}),
      ...(frame.metadata === undefined ? {} : {
        metadata: ownNodeJsonValue(frame.metadata, `Frame metadata: ${frame.id}`),
      }),
    })
  }))
  const frameById = new Map(frames.map((frame) => [frame.id, frame]))
  for (const frame of frames) {
    if (frame.parentFrameId === undefined) continue
    requireIdentifier(frame.parentFrameId, `Parent Frame on ${frame.id}`)
    const parent = frameById.get(frame.parentFrameId)
    if (parent === undefined) {
      throw new Error(`Unknown parent Frame: ${frame.id}/${frame.parentFrameId}`)
    }
    if (parent.scopeId !== frame.scopeId) throw new Error(`Frame parent must share scope: ${frame.id}`)
  }
  validateFrameAncestry(frameById)

  const nodeIds = new Set<string>()
  const socketsByNode = new Map<string, ReadonlyMap<string, Socket<TSocketMetadata>>>()
  const ownedParameters = new Set<ParameterReference>()
  const nodes = freeze(definition.nodes.map((node): Node<TParameter, TNodeMetadata, TSocketMetadata> => {
    requireIdentifier(node.id, "Node")
    if (nodeIds.has(node.id)) throw new Error(`Duplicate Node id: ${node.id}`)
    if (frameIds.has(node.id)) throw new Error(`Frame and Node ids must be distinct: ${node.id}`)
    nodeIds.add(node.id)
    if (node.frameId !== undefined && !frameIds.has(node.frameId)) {
      throw new Error(`Unknown Node Frame: ${node.id}/${node.frameId}`)
    }
    const instance = node.instance === undefined
      ? undefined
      : ownInstanceData(node.instance)

    const parameterIds = new Set<string>()
    const parameters = freeze((node.parameters ?? []).map((parameter) => {
      requireParameterReference(parameter, node.id)
      if (parameterIds.has(parameter.id)) throw new Error(`Duplicate Parameter id: ${node.id}/${parameter.id}`)
      if (ownedParameters.has(parameter)) throw new Error(`Parameter is shared by multiple Nodes: ${parameter.id}`)
      parameterIds.add(parameter.id)
      ownedParameters.add(parameter)
      return parameter
    }))

    const socketIds = new Set<string>()
    const explicitParameterSides = new Set<string>()
    const sockets = freeze((node.sockets ?? []).map((socket): Socket<TSocketMetadata> => {
      requireIdentifier(socket.id, `Socket on ${node.id}`)
      if (socketIds.has(socket.id)) throw new Error(`Duplicate Socket id: ${node.id}/${socket.id}`)
      socketIds.add(socket.id)
      if (socket.direction !== "input" && socket.direction !== "output" && socket.direction !== "bidirectional") {
        throw new Error(`Invalid Socket direction: ${node.id}/${socket.id}`)
      }
      if (socket.side !== undefined && socket.side !== "left" && socket.side !== "right") {
        throw new Error(`Invalid Socket side: ${node.id}/${socket.id}`)
      }
      if (socket.parameterId !== undefined) {
        if (!parameterIds.has(socket.parameterId)) {
          throw new Error(`Unknown Socket Parameter: ${node.id}/${socket.id}/${socket.parameterId}`)
        }
        if (socket.side !== undefined) {
          const sideKey = `${socket.parameterId}:${socket.side}`
          if (explicitParameterSides.has(sideKey)) {
            throw new Error(`Duplicate Parameter Socket side: ${node.id}/${sideKey}`)
          }
          explicitParameterSides.add(sideKey)
        }
      }
      const valueType = socket.valueType === undefined
        ? undefined
        : ownNodeValueType(socket.valueType, `Socket type: ${node.id}/${socket.id}`)
      return freeze({
        id: socket.id,
        direction: socket.direction,
        ...(socket.parameterId === undefined ? {} : {parameterId: socket.parameterId}),
        ...(socket.side === undefined ? {} : {side: socket.side}),
        ...(valueType === undefined ? {} : {valueType}),
        ...(socket.metadata === undefined ? {} : {
          metadata: ownNodeJsonValue(socket.metadata, `Socket metadata: ${node.id}/${socket.id}`),
        }),
      })
    }))
    socketsByNode.set(node.id, new Map(sockets.map((socket) => [socket.id, socket])))
    return freeze({
      id: node.id,
      ...(node.frameId === undefined ? {} : {frameId: node.frameId}),
      ...(node.scopeId === undefined ? {} : {scopeId: node.scopeId}),
      ...(node.groupId === undefined ? {} : {groupId: node.groupId}),
      ...(instance === undefined ? {} : {instance}),
      parameters,
      sockets,
      ...(node.metadata === undefined ? {} : {
        metadata: ownNodeJsonValue(node.metadata, `Node metadata: ${node.id}`),
      }),
    })
  }))

  const linkIds = new Set<string>()
  const links = freeze((definition.links ?? []).map((link): Link<TLinkMetadata> => {
    requireIdentifier(link.id, "Link")
    if (linkIds.has(link.id)) throw new Error(`Duplicate Link id: ${link.id}`)
    linkIds.add(link.id)
    const from = validateEndpoint(link.from, "from", link.id, nodeIds, socketsByNode)
    const to = validateEndpoint(link.to, "to", link.id, nodeIds, socketsByNode)
    if (from.direction === "input") {
      throw new Error(`Input Socket cannot be a Link source: ${link.id}/${link.from.nodeId}/${link.from.socketId}`)
    }
    if (to.direction === "output") {
      throw new Error(`Output Socket cannot be a Link target: ${link.id}/${link.to.nodeId}/${link.to.socketId}`)
    }
    return freeze({
      id: link.id,
      from: freeze({...link.from}),
      to: freeze({...link.to}),
      ...(link.metadata === undefined ? {} : {
        metadata: ownNodeJsonValue(link.metadata, `Link metadata: ${link.id}`),
      }),
    })
  }))
  return freeze({scopes, groups, templates, frames, nodes, links})
}

function ownTemplateData(source: readonly NodeTemplate[]): readonly NodeTemplate[] {
  return freeze(source.map((template) => freeze({
    id: template.id,
    version: template.version,
    kind: template.kind,
    ...(template.metadata === undefined ? {} : {
      metadata: ownNodeJsonValue(template.metadata, `Template metadata: ${template.id}`),
    }),
  })))
}

function ownScopeData(source: readonly GraphScope[]): readonly GraphScope[] {
  return freeze(source.map((scope) => freeze({
    id: scope.id,
    kind: scope.kind,
    ...(scope.parentScopeId === undefined ? {} : {parentScopeId: scope.parentScopeId}),
    ...(scope.instance === undefined ? {} : {instance: ownInstanceData(scope.instance)}),
    ...(scope.metadata === undefined ? {} : {
      metadata: ownNodeJsonValue(scope.metadata, `Graph Scope metadata: ${scope.id}`),
    }),
  })))
}

function ownGroupData(source: readonly NodeGroup[]): readonly NodeGroup[] {
  return freeze(source.map((group) => freeze({
    id: group.id,
    ...(group.scopeId === undefined ? {} : {scopeId: group.scopeId}),
    ...(group.parentGroupId === undefined ? {} : {parentGroupId: group.parentGroupId}),
    ...(group.metadata === undefined ? {} : {
      metadata: ownNodeJsonValue(group.metadata, `Node Group metadata: ${group.id}`),
    }),
  })))
}

function ownInstanceData(source: NodeInstanceReference): NodeInstanceReference {
  return freeze({...source})
}

function validateFrameAncestry<TMetadata extends NodeJsonValue>(
  frameById: ReadonlyMap<string, Frame<TMetadata>>,
): void {
  const done = new Set<string>()
  for (const frame of frameById.values()) {
    if (done.has(frame.id)) continue
    const path: string[] = []
    const inPath = new Set<string>()
    let frameId: string | undefined = frame.id
    while (frameId !== undefined && !done.has(frameId)) {
      if (inPath.has(frameId)) throw new Error(`Cyclic Frame ancestry: ${frame.id}`)
      inPath.add(frameId)
      path.push(frameId)
      frameId = frameById.get(frameId)?.parentFrameId
    }
    for (const entry of path) done.add(entry)
  }
}

function validateEndpoint<TMetadata extends NodeJsonValue>(
  endpoint: SocketEndpoint,
  role: "from" | "to",
  linkId: string,
  nodeIds: ReadonlySet<string>,
  socketsByNode: ReadonlyMap<string, ReadonlyMap<string, Socket<TMetadata>>>,
): Socket<TMetadata> {
  requireIdentifier(endpoint.nodeId, `${role} Node on Link ${linkId}`)
  requireIdentifier(endpoint.socketId, `${role} Socket on Link ${linkId}`)
  if (!nodeIds.has(endpoint.nodeId)) throw new Error(`Unknown Link Node: ${linkId}/${endpoint.nodeId}`)
  const socket = socketsByNode.get(endpoint.nodeId)?.get(endpoint.socketId)
  if (socket === undefined) {
    throw new Error(`Unknown Link Socket: ${linkId}/${endpoint.nodeId}/${endpoint.socketId}`)
  }
  return socket
}

function requireParameterReference(value: ParameterReference, nodeId: string): void {
  if (typeof value !== "object" || value === null || typeof value.subscribe !== "function" ||
    typeof value.snapshot !== "function") {
    throw new TypeError(`Invalid Parameter on Node: ${nodeId}`)
  }
  requireIdentifier(value.id, `Parameter on ${nodeId}`)
}

function requireIdentifier(value: string, label: string): void {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`${label} id must be non-empty`)
}

function parameterKey(nodeId: string, parameterId: string): string {
  return JSON.stringify([nodeId, parameterId])
}

function parseParameterKey(key: string): readonly [string, string] {
  const parsed = JSON.parse(key) as unknown
  if (!Array.isArray(parsed) || parsed.length !== 2 ||
    typeof parsed[0] !== "string" || typeof parsed[1] !== "string") {
    throw new Error("Invalid internal Parameter key")
  }
  return [parsed[0], parsed[1]]
}

function isLaterProjection(
  revision: number,
  topologyRevision: number,
  previousRevision: number,
  previousTopologyRevision: number,
): boolean {
  return topologyRevision > previousTopologyRevision ||
    (topologyRevision === previousTopologyRevision && revision >= previousRevision)
}
