import {
  FoundationNodeTree,
  NodeTree,
  type Frame,
  type GraphScope,
  type Link,
  type Node,
  type NodeGroup,
  type NodeInstanceReference,
  type NodeTemplate,
  type NodeTreeDefinition,
  type NodeTreeEntityAddress,
  type NodeTreeTopLevelEntityKind,
  type NodeTreeTopologyDelta,
  type NodeTreeSnapshot,
  type NodeTreeParameterSnapshot,
  type Socket,
} from "./node-tree.ts"
import {
  Parameter,
  ownNodeJsonValue,
  ownNodeValueType,
  type NodeJsonValue,
  type NodeValueType,
  type ParameterReference,
} from "./parameter.ts"
import {
  cancelNodeTreePolicy,
  stageNodeTreePolicy,
  type InternalNodeTreePolicy,
} from "./node-tree-policy.ts"

export type NodeTreeCyclePolicy = "allow" | "acyclic"

export type FoundationNodeTreeOptions = Readonly<{
  cyclePolicy?: NodeTreeCyclePolicy
  compatibleSocketTypes?(source: NodeValueType, target: NodeValueType): boolean
  validateParameterValue?(valueType: NodeValueType, value: NodeJsonValue): boolean
}>

/** Creates one canonical Parameter whose runtime writes retain the supplied schema policy. */
export function createValidatedParameter<
  TValue extends NodeJsonValue,
  TPresentation extends NodeJsonValue = null,
>(
  id: string,
  initialValue: TValue,
  presentation: TPresentation,
  valueType: NodeValueType,
  validate: NonNullable<FoundationNodeTreeOptions["validateParameterValue"]>,
): Parameter<TValue, TPresentation> {
  if (typeof validate !== "function") throw new TypeError("Parameter value validator must be a function")
  const ownedType = ownNodeValueType(valueType, `Parameter type: ${id}`)
  const ownedValue = ownNodeJsonValue(initialValue, `Parameter value: ${id}`)
  if (validate(ownedType, ownedValue) !== true) {
    throw new TypeError(`Parameter value does not satisfy its value type: ${id}/${ownedType.id}`)
  }
  return new RuntimeValidatedParameter(id, ownedValue, presentation, ownedType, validate)
}

class RuntimeValidatedParameter<
  TValue extends NodeJsonValue,
  TPresentation extends NodeJsonValue,
> extends Parameter<TValue, TPresentation> {
  readonly #validate: NonNullable<FoundationNodeTreeOptions["validateParameterValue"]>

  constructor(
    id: string,
    initialValue: TValue,
    presentation: TPresentation,
    valueType: NodeValueType,
    validate: NonNullable<FoundationNodeTreeOptions["validateParameterValue"]>,
  ) {
    super(id, initialValue, presentation, valueType)
    this.#validate = validate
  }

  override set(value: TValue): boolean {
    const owned = ownNodeJsonValue(value, `Parameter value: ${this.id}`)
    const valueType = this.valueType!
    if (this.#validate(valueType, owned) !== true) {
      throw new TypeError(`Parameter value does not satisfy its value type: ${this.id}/${valueType.id}`)
    }
    return super.set(owned)
  }
}

export type ExternalStore<TSnapshot> = Readonly<{
  subscribe(listener: () => void): () => void
  getSnapshot(): TSnapshot
}>

export type NodeTreeExternalStore<TSnapshot, TParameterSnapshot> = ExternalStore<TSnapshot> & Readonly<{
  subscribeTopology(listener: () => void): () => void
  getTopologySnapshot(): TSnapshot
  parameter(nodeId: string, parameterId: string): ExternalStore<TParameterSnapshot>
}>

export type TemplateInstanceIdentity = Readonly<{
  id: string
  localId: string
}>

/** Materializes one immutable Node instance without cloning any Parameter Store. */
export function instantiateNodeTemplate<
  TParameter extends ParameterReference,
  TNodeMetadata extends NodeJsonValue,
  TSocketMetadata extends NodeJsonValue,
>(
  template: NodeTemplate,
  identity: TemplateInstanceIdentity,
  node: Omit<Node<TParameter, TNodeMetadata, TSocketMetadata>, "instance">,
): Node<TParameter, TNodeMetadata, TSocketMetadata> {
  if (template.kind !== "node") throw new Error(`Cannot instantiate graph Template as Node: ${template.id}`)
  requireIdentifier(node.id, "Node")
  const parameters = node.parameters === undefined
    ? undefined
    : Object.freeze([...node.parameters])
  const sockets = node.sockets === undefined
    ? undefined
    : Object.freeze(node.sockets.map((socket) => Object.freeze({
        id: socket.id,
        direction: socket.direction,
        ...(socket.parameterId === undefined ? {} : {parameterId: socket.parameterId}),
        ...(socket.side === undefined ? {} : {side: socket.side}),
        ...(socket.valueType === undefined ? {} : {
          valueType: ownNodeValueType(socket.valueType, `Socket type: ${node.id}/${socket.id}`),
        }),
        ...(socket.metadata === undefined ? {} : {
          metadata: ownNodeJsonValue(socket.metadata, `Socket metadata: ${node.id}/${socket.id}`),
        }),
      })))
  return Object.freeze({
    id: node.id,
    ...(node.frameId === undefined ? {} : {frameId: node.frameId}),
    ...(node.scopeId === undefined ? {} : {scopeId: node.scopeId}),
    ...(node.groupId === undefined ? {} : {groupId: node.groupId}),
    ...(parameters === undefined ? {} : {parameters}),
    ...(sockets === undefined ? {} : {sockets}),
    ...(node.metadata === undefined ? {} : {
      metadata: ownNodeJsonValue(node.metadata, `Node metadata: ${node.id}`),
    }),
    instance: instanceReference(template, identity),
  })
}

/** Materializes one immutable nested Graph Scope instance. */
export function instantiateGraphTemplate<TMetadata extends NodeJsonValue>(
  template: NodeTemplate,
  identity: TemplateInstanceIdentity,
  scope: Omit<GraphScope<TMetadata>, "instance" | "kind">,
): GraphScope<TMetadata> {
  if (template.kind !== "graph") throw new Error(`Cannot instantiate node Template as Graph Scope: ${template.id}`)
  requireIdentifier(scope.id, "Graph Scope")
  return Object.freeze({
    id: scope.id,
    kind: "subgraph",
    ...(scope.parentScopeId === undefined ? {} : {parentScopeId: scope.parentScopeId}),
    instance: instanceReference(template, identity),
    ...(scope.metadata === undefined ? {} : {
      metadata: ownNodeJsonValue(scope.metadata, `Graph Scope metadata: ${scope.id}`),
    }),
  })
}

function instanceReference(
  template: NodeTemplate,
  identity: TemplateInstanceIdentity,
): NodeInstanceReference {
  requireIdentifier(template.id, "Template")
  requireIdentifier(identity.id, "Template instance")
  requireIdentifier(identity.localId, "Template local identity")
  if (!Number.isSafeInteger(template.version) || template.version < 1) {
    throw new TypeError(`Template version must be a positive safe integer: ${template.id}`)
  }
  return Object.freeze({
    id: identity.id,
    templateId: template.id,
    templateVersion: template.version,
    localId: identity.localId,
  })
}

/** Stable callback pair accepted directly by useSyncExternalStore-like hooks. */
export function createNodeTreeExternalStore<
  TParameter extends ParameterReference,
  TFrameMetadata extends NodeJsonValue,
  TNodeMetadata extends NodeJsonValue,
  TSocketMetadata extends NodeJsonValue,
  TLinkMetadata extends NodeJsonValue,
>(tree: NodeTree<
  TParameter,
  TFrameMetadata,
  TNodeMetadata,
  TSocketMetadata,
  TLinkMetadata
>): NodeTreeExternalStore<NodeTreeSnapshot<
  TParameter,
  TFrameMetadata,
  TNodeMetadata,
  TSocketMetadata,
  TLinkMetadata
>, NodeTreeParameterSnapshot<TParameter>> {
  type ParameterStore = ExternalStore<NodeTreeParameterSnapshot<TParameter>>
  type ParameterStoreRecord = Readonly<{
    nodeId: string
    parameterId: string
    parameter: TParameter
    store: ParameterStore
  }>
  let topologySnapshot = tree.getSnapshot()
  const parameterStores = new Map<string, ParameterStoreRecord>()
  const topologyListeners = new Set<() => void>()
  const parameter = (nodeId: string, parameterId: string): ParameterStore => {
    const key = JSON.stringify([nodeId, parameterId])
    const current = tree.parameter(nodeId, parameterId)
    const retained = parameterStores.get(key)
    if (retained?.parameter === current) return retained.store
    let snapshot = current.snapshot() as NodeTreeParameterSnapshot<TParameter>
    const store = Object.freeze({
      subscribe(listener: () => void) {
        return current.subscribe(() => {
          snapshot = current.snapshot() as NodeTreeParameterSnapshot<TParameter>
          listener()
        })
      },
      getSnapshot() { return snapshot },
    }) satisfies ParameterStore
    parameterStores.set(key, Object.freeze({nodeId, parameterId, parameter: current, store}))
    return store
  }
  const pruneParameterStores = (): void => {
    for (const [key, record] of parameterStores) {
      try {
        if (tree.parameter(record.nodeId, record.parameterId) !== record.parameter) parameterStores.delete(key)
      } catch {
        parameterStores.delete(key)
      }
    }
  }
  tree.subscribeDelta(delta => {
    if (delta.kind !== "topology") return
    topologySnapshot = appendTopologySnapshot(topologySnapshot, tree, delta) ?? tree.getSnapshot()
    pruneParameterStores()
    const errors: unknown[] = []
    for (const listener of [...topologyListeners]) {
      try { listener() } catch (error) { errors.push(error) }
    }
    if (errors.length > 0) throw new AggregateError(errors, "NodeTree topology store listener failure")
  })
  return Object.freeze({
    subscribe: (listener: () => void) => tree.subscribe(listener),
    getSnapshot: () => tree.getSnapshot(),
    subscribeTopology(listener: () => void) {
      topologyListeners.add(listener)
      let subscribed = true
      return () => {
        if (!subscribed) return
        subscribed = false
        topologyListeners.delete(listener)
      }
    },
    getTopologySnapshot: () => topologySnapshot,
    parameter,
  })
}

function appendTopologySnapshot<
  TParameter extends ParameterReference,
  TFrameMetadata extends NodeJsonValue,
  TNodeMetadata extends NodeJsonValue,
  TSocketMetadata extends NodeJsonValue,
  TLinkMetadata extends NodeJsonValue,
>(
  previous: NodeTreeSnapshot<
    TParameter,
    TFrameMetadata,
    TNodeMetadata,
    TSocketMetadata,
    TLinkMetadata
  >,
  tree: NodeTree<TParameter, TFrameMetadata, TNodeMetadata, TSocketMetadata, TLinkMetadata>,
  delta: NodeTreeTopologyDelta,
): NodeTreeSnapshot<TParameter, TFrameMetadata, TNodeMetadata, TSocketMetadata, TLinkMetadata> | null {
  if (delta.removed.length !== 0 || delta.updated.length !== 0 ||
    tree.nodes.length !== previous.nodes.length + 1 || tree.links !== previous.links) return null
  const addedNodes = delta.added.filter(address => address.kind === "node")
  if (addedNodes.length !== 1) return null
  const addedId = addedNodes[0]!.id
  if (delta.added.some(address => address.kind !== "node" &&
    (!("nodeId" in address) || address.nodeId !== addedId))) return null
  const node = tree.nodes[tree.nodes.length - 1]
  if (node === undefined || node.id !== addedId) return null
  const snapshotNode = Object.freeze({
    id: node.id,
    ...(node.frameId === undefined ? {} : {frameId: node.frameId}),
    ...(node.scopeId === undefined ? {} : {scopeId: node.scopeId}),
    ...(node.groupId === undefined ? {} : {groupId: node.groupId}),
    ...(node.instance === undefined ? {} : {instance: node.instance}),
    parameters: Object.freeze((node.parameters ?? []).map(parameter => parameter.snapshot())),
    sockets: node.sockets ?? Object.freeze([]),
    ...(node.metadata === undefined ? {} : {metadata: node.metadata}),
  })
  return Object.freeze({
    ...previous,
    revision: delta.revision,
    topologyRevision: delta.topologyRevision,
    nodes: Object.freeze([...previous.nodes, snapshotNode]),
  }) as NodeTreeSnapshot<TParameter, TFrameMetadata, TNodeMetadata, TSocketMetadata, TLinkMetadata>
}

/**
 * Creates the one canonical NodeTree with strict general-purpose foundation
 * validation retained for every later reconcile.
 */
export function createNodeTree<
  TParameter extends ParameterReference = ParameterReference,
  TFrameMetadata extends NodeJsonValue = NodeJsonValue,
  TNodeMetadata extends NodeJsonValue = NodeJsonValue,
  TSocketMetadata extends NodeJsonValue = NodeJsonValue,
  TLinkMetadata extends NodeJsonValue = NodeJsonValue,
>(
  definition: NodeTreeDefinition<
    TParameter,
    TFrameMetadata,
    TNodeMetadata,
    TSocketMetadata,
    TLinkMetadata
  >,
  options: FoundationNodeTreeOptions = {},
): NodeTree<TParameter, TFrameMetadata, TNodeMetadata, TSocketMetadata, TLinkMetadata> {
  const cyclePolicy = options.cyclePolicy ?? "allow"
  if (cyclePolicy !== "allow" && cyclePolicy !== "acyclic") {
    throw new TypeError(`Unknown NodeTree cycle policy: ${cyclePolicy}`)
  }
  const policy = Object.freeze({
    cyclePolicy,
    ...(options.compatibleSocketTypes === undefined ? {} : {
      compatibleSocketTypes: options.compatibleSocketTypes,
    }),
    ...(options.validateParameterValue === undefined ? {} : {
      validateParameterValue: options.validateParameterValue,
    }),
  }) satisfies FoundationNodeTreeOptions
  const validation = Object.freeze({
    validate(candidate: NodeTreeDefinition): void {
      validateFoundationDefinition(candidate, policy)
    },
    delta: diffNodeTreeDefinitions,
    same: sameFoundationDefinitions,
    ...createFoundationAppendPolicy(),
    ...(policy.validateParameterValue === undefined ? {} : {
      validateParameterValue: policy.validateParameterValue,
    }),
  }) satisfies InternalNodeTreePolicy
  stageNodeTreePolicy(definition, validation)
  try {
    const tree = new FoundationNodeTree(definition, validation)
    validation.reconciled?.(tree.definition())
    return tree
  } finally {
    cancelNodeTreePolicy(definition)
  }
}

function createFoundationAppendPolicy(): Pick<InternalNodeTreePolicy, "append" | "reconciled"> {
  type Indexes = {
    nodeIds: Set<string>
    parameters: Set<ParameterReference>
    instanceLocals: Set<string>
  }
  let indexes: Indexes | null = null
  const indexDefinition = (definition: NodeTreeDefinition): Indexes => ({
    nodeIds: new Set(definition.nodes.map(node => node.id)),
    parameters: new Set(definition.nodes.flatMap(node => node.parameters ?? [])),
    instanceLocals: new Set(definition.nodes.flatMap(node => node.instance === undefined
      ? []
      : [JSON.stringify([node.instance.id, node.instance.localId])])),
  })
  const readIndexes = (definition: NodeTreeDefinition): Indexes =>
    indexes ??= indexDefinition(definition)
  return Object.freeze({
    append(current, node, revision, topologyRevision) {
      const currentIndexes = readIndexes(current)
      if (currentIndexes.nodeIds.has(node.id)) throw new Error(`Duplicate Node id: ${node.id}`)
      for (const parameter of node.parameters ?? []) {
        if (currentIndexes.parameters.has(parameter)) {
          throw new Error(`Parameter is shared by multiple Nodes: ${parameter.id}`)
        }
      }
      const instanceLocal = node.instance === undefined
        ? null
        : JSON.stringify([node.instance.id, node.instance.localId])
      if (instanceLocal !== null && currentIndexes.instanceLocals.has(instanceLocal)) {
        throw new Error(`Duplicate Node instance local identity: ${node.instance!.id}/${node.instance!.localId}`)
      }
      const added: NodeTreeEntityAddress[] = [Object.freeze({kind: "node", id: node.id})]
      for (const parameter of node.parameters ?? []) {
        added.push(Object.freeze({kind: "parameter", nodeId: node.id, id: parameter.id}))
      }
      for (const socket of node.sockets ?? []) {
        added.push(Object.freeze({kind: "socket", nodeId: node.id, id: socket.id}))
      }
      return Object.freeze({
        delta: Object.freeze({
          kind: "topology" as const,
          revision,
          topologyRevision,
          added: Object.freeze(added),
          removed: Object.freeze([]),
          updated: Object.freeze([]),
        }),
        committed() {
          currentIndexes.nodeIds.add(node.id)
          for (const parameter of node.parameters ?? []) currentIndexes.parameters.add(parameter)
          if (instanceLocal !== null) currentIndexes.instanceLocals.add(instanceLocal)
        },
      })
    },
    reconciled(definition) { indexes = indexDefinition(definition) },
  })
}

function sameFoundationDefinitions(left: NodeTreeDefinition, right: NodeTreeDefinition): boolean {
  if (stableFingerprint(left.scopes ?? []) !== stableFingerprint(right.scopes ?? []) ||
    stableFingerprint(left.groups ?? []) !== stableFingerprint(right.groups ?? []) ||
    stableFingerprint(left.templates ?? []) !== stableFingerprint(right.templates ?? [])) return false
  const leftFrames = left.frames ?? []
  const rightFrames = right.frames ?? []
  if (leftFrames.length !== rightFrames.length) return false
  for (let index = 0; index < leftFrames.length; index += 1) {
    const before = leftFrames[index]!
    const after = rightFrames[index]!
    if (before.scopeId !== after.scopeId || before.groupId !== after.groupId) return false
  }
  if (left.nodes.length !== right.nodes.length) return false
  for (let index = 0; index < left.nodes.length; index += 1) {
    const before = left.nodes[index]!
    const after = right.nodes[index]!
    if (before.scopeId !== after.scopeId || before.groupId !== after.groupId ||
      stableFingerprint(before.instance) !== stableFingerprint(after.instance)) return false
    const beforeParameters = before.parameters ?? []
    const afterParameters = after.parameters ?? []
    if (beforeParameters.length !== afterParameters.length) return false
    for (let parameterIndex = 0; parameterIndex < beforeParameters.length; parameterIndex += 1) {
      if (!sameValueType(
        beforeParameters[parameterIndex]!.valueType,
        afterParameters[parameterIndex]!.valueType,
      )) return false
    }
    const beforeSockets = before.sockets ?? []
    const afterSockets = after.sockets ?? []
    if (beforeSockets.length !== afterSockets.length) return false
    for (let socketIndex = 0; socketIndex < beforeSockets.length; socketIndex += 1) {
      if (!sameValueType(beforeSockets[socketIndex]!.valueType, afterSockets[socketIndex]!.valueType)) return false
    }
  }
  return true
}

function sameValueType(left: NodeValueType | undefined, right: NodeValueType | undefined): boolean {
  if (left === undefined || right === undefined) return left === right
  return left.id === right.id && left.version === right.version
}

/** Derives one deterministic address-level delta from two immutable definitions. */
export function diffNodeTreeDefinitions(
  previous: NodeTreeDefinition,
  next: NodeTreeDefinition,
  revision: number,
  topologyRevision: number,
): NodeTreeTopologyDelta {
  const added: NodeTreeEntityAddress[] = []
  const removed: NodeTreeEntityAddress[] = []
  const updated: NodeTreeEntityAddress[] = []
  const collect = <T>(
    kind: NodeTreeTopLevelEntityKind,
    before: readonly T[],
    after: readonly T[],
    id: (value: T) => string,
    fingerprint: (value: T) => string = stableFingerprint,
  ): void => diffEntities(kind, before, after, id, fingerprint, {added, removed, updated})
  collect("scope", previous.scopes ?? [], next.scopes ?? [], (value) => value.id)
  collect("group", previous.groups ?? [], next.groups ?? [], (value) => value.id)
  collect("template", previous.templates ?? [], next.templates ?? [],
    (value) => value.id)
  collect("frame", previous.frames ?? [], next.frames ?? [], (value) => value.id)
  collect("node", previous.nodes, next.nodes, (value) => value.id, nodeFingerprint)
  collect("link", previous.links ?? [], next.links ?? [], (value) => value.id)
  const previousNodes = new Map(previous.nodes.map((node) => [node.id, node]))
  const nextNodeIds = new Set(next.nodes.map((node) => node.id))
  for (const node of next.nodes) {
    const before = previousNodes.get(node.id)
    if (before === undefined) {
      collectNestedAddresses("parameter", node.id, node.parameters ?? [], (parameter) => parameter.id, added)
      collectNestedAddresses("socket", node.id, node.sockets ?? [], (socket) => socket.id, added)
      continue
    }
    diffNestedEntities("parameter", node.id, before.parameters ?? [], node.parameters ?? [],
      (parameter) => parameter.id, (parameter) => stableFingerprint(parameter.valueType),
      {added, removed, updated})
    diffNestedEntities("socket", node.id, before.sockets ?? [], node.sockets ?? [],
      (socket) => socket.id, stableFingerprint, {added, removed, updated})
  }
  for (const node of previous.nodes) {
    if (nextNodeIds.has(node.id)) continue
    collectNestedAddresses("parameter", node.id, node.parameters ?? [], (parameter) => parameter.id, removed)
    collectNestedAddresses("socket", node.id, node.sockets ?? [], (socket) => socket.id, removed)
  }
  return Object.freeze({
    kind: "topology",
    revision,
    topologyRevision,
    added: Object.freeze(added),
    removed: Object.freeze(removed),
    updated: Object.freeze(updated),
  })
}

function collectNestedAddresses<T>(
  kind: "parameter" | "socket",
  nodeId: string,
  values: readonly T[],
  id: (value: T) => string,
  output: NodeTreeEntityAddress[],
): void {
  for (const value of values) output.push(Object.freeze({kind, nodeId, id: id(value)}))
}

function diffEntities<T>(
  kind: NodeTreeTopLevelEntityKind,
  before: readonly T[],
  after: readonly T[],
  id: (value: T) => string,
  fingerprint: (value: T) => string,
  changes: {
    added: NodeTreeEntityAddress[]
    removed: NodeTreeEntityAddress[]
    updated: NodeTreeEntityAddress[]
  },
): void {
  const previous = new Map(before.map((value, index) => [id(value), {index, fingerprint: fingerprint(value)}]))
  const afterIds = new Set<string>()
  for (let index = 0; index < after.length; index += 1) {
    const value = after[index]!
    const entityId = id(value)
    afterIds.add(entityId)
    const prior = previous.get(entityId)
    if (prior === undefined) changes.added.push(Object.freeze({kind, id: entityId}))
    else {
      if (prior.index !== index || prior.fingerprint !== fingerprint(value)) {
        changes.updated.push(Object.freeze({kind, id: entityId}))
      }
    }
  }
  for (const value of before) {
    const entityId = id(value)
    if (!afterIds.has(entityId)) {
      changes.removed.push(Object.freeze({kind, id: entityId}))
    }
  }
}

function diffNestedEntities<T>(
  kind: "parameter" | "socket",
  nodeId: string,
  before: readonly T[],
  after: readonly T[],
  id: (value: T) => string,
  fingerprint: (value: T) => string,
  changes: {
    added: NodeTreeEntityAddress[]
    removed: NodeTreeEntityAddress[]
    updated: NodeTreeEntityAddress[]
  },
): void {
  const previous = new Map(before.map((value, index) => [id(value), {index, fingerprint: fingerprint(value)}]))
  const afterIds = new Set<string>()
  for (let index = 0; index < after.length; index += 1) {
    const value = after[index]!
    const entityId = id(value)
    afterIds.add(entityId)
    const prior = previous.get(entityId)
    const address = Object.freeze({kind, nodeId, id: entityId})
    if (prior === undefined) changes.added.push(address)
    else if (prior.index !== index || prior.fingerprint !== fingerprint(value)) changes.updated.push(address)
  }
  for (const value of before) {
    const entityId = id(value)
    if (!afterIds.has(entityId)) changes.removed.push(Object.freeze({kind, nodeId, id: entityId}))
  }
}

function nodeFingerprint(node: Node): string {
  if (node.frameId === undefined && node.scopeId === undefined && node.groupId === undefined &&
    node.instance === undefined && (node.parameters?.length ?? 0) === 0 &&
    (node.sockets?.length ?? 0) === 0 && node.metadata === undefined) return ""
  return stableFingerprint({
    id: node.id,
    frameId: node.frameId,
    scopeId: node.scopeId,
    groupId: node.groupId,
    instance: node.instance,
    metadata: node.metadata,
  })
}

function stableFingerprint(value: unknown): string {
  type Task = Readonly<{kind: "token"; token: string}> | Readonly<{kind: "value"; value: unknown}>
  const tasks: Task[] = [{kind: "value", value}]
  const output: string[] = []
  while (tasks.length > 0) {
    const task = tasks.pop()!
    if (task.kind === "token") {
      output.push(task.token)
      continue
    }
    const current = task.value
    if (current === undefined) {
      output.push("u")
      continue
    }
    if (current === null || typeof current !== "object") {
      output.push(JSON.stringify(current))
      continue
    }
    if (Array.isArray(current)) {
      output.push("[")
      tasks.push({kind: "token", token: "]"})
      for (let index = current.length - 1; index >= 0; index -= 1) {
        if (index < current.length - 1) tasks.push({kind: "token", token: ","})
        tasks.push({kind: "value", value: current[index]})
      }
      continue
    }
    const record = current as Record<string, unknown>
    const keys = Object.keys(record).sort()
    output.push("{")
    tasks.push({kind: "token", token: "}"})
    for (let index = keys.length - 1; index >= 0; index -= 1) {
      const key = keys[index]!
      if (index < keys.length - 1) tasks.push({kind: "token", token: ","})
      tasks.push({kind: "value", value: record[key]})
      tasks.push({kind: "token", token: `${JSON.stringify(key)}:`})
    }
  }
  return output.join("")
}

/** Validates reusable hierarchy/type/instance policy without creating a store. */
export function validateFoundationDefinition(
  definition: NodeTreeDefinition,
  options: FoundationNodeTreeOptions = {},
): void {
  const templates = validateTemplates(definition.templates ?? [])
  const scopes = validateScopes(definition.scopes ?? [], templates)
  const groups = validateGroups(definition.groups ?? [], scopes)
  const frames = new Map((definition.frames ?? []).map((frame) => [frame.id, frame]))
  for (const frame of definition.frames ?? []) validateFrame(frame, scopes, groups)

  const instanceLocals = new Set<string>()
  const socketsByNode = new Map<string, ReadonlyMap<string, Socket>>()
  for (const node of definition.nodes) {
    validateNode(node, frames, scopes, groups, templates, instanceLocals, options)
    socketsByNode.set(node.id, new Map((node.sockets ?? []).map((socket) => [socket.id, socket])))
  }
  for (const link of definition.links ?? []) {
    const source = socketsByNode.get(link.from.nodeId)?.get(link.from.socketId)
    const target = socketsByNode.get(link.to.nodeId)?.get(link.to.socketId)
    if (source !== undefined && target !== undefined) validateSocketCompatibility(source, target, link, options)
  }
  if ((options.cyclePolicy ?? "allow") === "acyclic") requireAcyclicLinks(definition.nodes, definition.links ?? [])
}

function validateTemplates(source: readonly NodeTemplate[]): ReadonlyMap<string, NodeTemplate> {
  const templates = new Map<string, NodeTemplate>()
  const ids = new Set<string>()
  for (const template of source) {
    requireIdentifier(template.id, "Template")
    if (ids.has(template.id)) throw new Error(`Duplicate Template id: ${template.id}`)
    ids.add(template.id)
    if (!Number.isSafeInteger(template.version) || template.version < 1) {
      throw new TypeError(`Template version must be a positive safe integer: ${template.id}`)
    }
    if (template.kind !== "node" && template.kind !== "graph") {
      throw new TypeError(`Invalid Template kind: ${template.id}`)
    }
    const key = templateKey(template.id, template.version)
    templates.set(key, template)
  }
  return templates
}

function validateScopes(
  source: readonly GraphScope[],
  templates: ReadonlyMap<string, NodeTemplate>,
): ReadonlyMap<string, GraphScope> {
  const scopes = new Map<string, GraphScope>()
  const instanceLocals = new Set<string>()
  for (const scope of source) {
    requireIdentifier(scope.id, "Graph Scope")
    if (scopes.has(scope.id)) throw new Error(`Duplicate Graph Scope id: ${scope.id}`)
    if (scope.kind !== "graph" && scope.kind !== "subgraph") {
      throw new TypeError(`Invalid Graph Scope kind: ${scope.id}`)
    }
    if (scope.kind === "graph" && scope.parentScopeId !== undefined) {
      throw new Error(`Root Graph Scope cannot have a parent: ${scope.id}`)
    }
    if (scope.kind === "subgraph" && scope.parentScopeId === undefined) {
      throw new Error(`Subgraph Scope requires a parent: ${scope.id}`)
    }
    if (scope.instance !== undefined) {
      validateInstance(scope.instance, templates, "graph", `Graph Scope ${scope.id}`)
      const key = JSON.stringify([scope.instance.id, scope.instance.localId])
      if (instanceLocals.has(key)) {
        throw new Error(`Duplicate Graph instance local identity: ${scope.instance.id}/${scope.instance.localId}`)
      }
      instanceLocals.add(key)
    }
    scopes.set(scope.id, scope)
  }
  for (const scope of source) {
    if (scope.parentScopeId !== undefined && !scopes.has(scope.parentScopeId)) {
      throw new Error(`Unknown parent Graph Scope: ${scope.id}/${scope.parentScopeId}`)
    }
  }
  validateParentMap(scopes, "Graph Scope", (value) => value.parentScopeId)
  return scopes
}

function validateGroups(
  source: readonly NodeGroup[],
  scopes: ReadonlyMap<string, GraphScope>,
): ReadonlyMap<string, NodeGroup> {
  const groups = new Map<string, NodeGroup>()
  for (const group of source) {
    requireIdentifier(group.id, "Node Group")
    if (groups.has(group.id)) throw new Error(`Duplicate Node Group id: ${group.id}`)
    if (group.scopeId !== undefined) requireScope(group.scopeId, scopes, `Node Group ${group.id}`)
    groups.set(group.id, group)
  }
  for (const group of source) {
    if (group.parentGroupId === undefined) continue
    const parent = groups.get(group.parentGroupId)
    if (parent === undefined) throw new Error(`Unknown parent Node Group: ${group.id}/${group.parentGroupId}`)
    if (parent.scopeId !== group.scopeId) throw new Error(`Node Group parent must share scope: ${group.id}`)
  }
  validateParentMap(groups, "Node Group", (value) => value.parentGroupId)
  return groups
}

function validateFrame(
  frame: Frame,
  scopes: ReadonlyMap<string, GraphScope>,
  groups: ReadonlyMap<string, NodeGroup>,
): void {
  if (frame.scopeId !== undefined) requireScope(frame.scopeId, scopes, `Frame ${frame.id}`)
  if (frame.groupId !== undefined) requireGroup(frame.groupId, frame.scopeId, groups, `Frame ${frame.id}`)
}

function validateNode(
  node: Node,
  frames: ReadonlyMap<string, Frame>,
  scopes: ReadonlyMap<string, GraphScope>,
  groups: ReadonlyMap<string, NodeGroup>,
  templates: ReadonlyMap<string, NodeTemplate>,
  instanceLocals: Set<string>,
  options: FoundationNodeTreeOptions,
): void {
  if (node.scopeId !== undefined) requireScope(node.scopeId, scopes, `Node ${node.id}`)
  if (node.groupId !== undefined) requireGroup(node.groupId, node.scopeId, groups, `Node ${node.id}`)
  if (node.frameId !== undefined) {
    const frame = frames.get(node.frameId)
    if (frame !== undefined && (frame.scopeId !== node.scopeId || frame.groupId !== node.groupId)) {
      throw new Error(`Node Frame ownership mismatch: ${node.id}/${node.frameId}`)
    }
  }
  if (node.instance !== undefined) {
    validateInstance(node.instance, templates, "node", `Node ${node.id}`)
    const key = JSON.stringify([node.instance.id, node.instance.localId])
    if (instanceLocals.has(key)) {
      throw new Error(`Duplicate Node instance local identity: ${node.instance.id}/${node.instance.localId}`)
    }
    instanceLocals.add(key)
  }
  const parameters = new Map((node.parameters ?? []).map((parameter) => [parameter.id, parameter]))
  for (const parameter of parameters.values()) {
    const valueType = parameter.valueType
    if (valueType !== undefined) ownNodeValueType(valueType, `Parameter type: ${node.id}/${parameter.id}`)
    if (valueType !== undefined && options.validateParameterValue !== undefined) {
      const snapshot = parameter.snapshot()
      if (options.validateParameterValue(valueType, snapshot.value) === true) continue
      throw new Error(`Parameter value does not satisfy its value type: ${node.id}/${parameter.id}/${valueType.id}`)
    }
  }
  for (const socket of node.sockets ?? []) {
    if (socket.valueType !== undefined) ownNodeValueType(socket.valueType, `Socket type: ${node.id}/${socket.id}`)
    if (socket.parameterId === undefined) continue
    const parameter = parameters.get(socket.parameterId)
    if (parameter === undefined) continue
    const parameterType = parameter.valueType
    if (parameterType === undefined && socket.valueType === undefined) continue
    if (parameterType === undefined || socket.valueType === undefined ||
      parameterType.id !== socket.valueType.id || parameterType.version !== socket.valueType.version) {
      throw new Error(`Parameter and Socket value types must match: ${node.id}/${socket.id}/${parameter.id}`)
    }
  }
}

function validateSocketCompatibility(
  source: Socket,
  target: Socket,
  link: Link,
  options: FoundationNodeTreeOptions,
): void {
  if (source.valueType === undefined && target.valueType === undefined) return
  if (source.valueType === undefined || target.valueType === undefined) {
    throw new Error(`Typed Link cannot connect an untyped Socket: ${link.id}`)
  }
  const compatible = options.compatibleSocketTypes === undefined
    ? source.valueType.id === target.valueType.id && source.valueType.version === target.valueType.version
    : options.compatibleSocketTypes(source.valueType, target.valueType) === true
  if (!compatible) throw new Error(`Incompatible Socket value types: ${link.id}`)
}

function validateInstance(
  instance: NodeInstanceReference,
  templates: ReadonlyMap<string, NodeTemplate>,
  kind: NodeTemplate["kind"],
  label: string,
): void {
  requireIdentifier(instance.id, `Instance on ${label}`)
  requireIdentifier(instance.templateId, `Template on ${label}`)
  requireIdentifier(instance.localId, `Local identity on ${label}`)
  if (!Number.isSafeInteger(instance.templateVersion) || instance.templateVersion < 1) {
    throw new TypeError(`Template version on ${label} must be a positive safe integer`)
  }
  const template = templates.get(templateKey(instance.templateId, instance.templateVersion))
  if (template === undefined) throw new Error(`Unknown Template on ${label}: ${instance.templateId}@${instance.templateVersion}`)
  if (template.kind !== kind) throw new Error(`Template kind mismatch on ${label}: ${instance.templateId}`)
}

function requireAcyclicLinks(nodes: readonly Node[], links: readonly Link[]): void {
  const outgoing = new Map(nodes.map((node) => [node.id, [] as string[]]))
  const indegree = new Map(nodes.map((node) => [node.id, 0]))
  for (const link of links) {
    if (!outgoing.has(link.from.nodeId) || !indegree.has(link.to.nodeId)) continue
    outgoing.get(link.from.nodeId)!.push(link.to.nodeId)
    indegree.set(link.to.nodeId, indegree.get(link.to.nodeId)! + 1)
  }
  const ready = nodes.filter((node) => indegree.get(node.id) === 0).map((node) => node.id)
  let visited = 0
  for (let index = 0; index < ready.length; index += 1) {
    const nodeId = ready[index]!
    visited += 1
    for (const target of outgoing.get(nodeId)!) {
      const next = indegree.get(target)! - 1
      indegree.set(target, next)
      if (next === 0) ready.push(target)
    }
  }
  if (visited !== nodes.length) {
    const witness = nodes.find((node) => (indegree.get(node.id) ?? 0) > 0)?.id ?? "unknown"
    throw new Error(`Directed Node cycle is forbidden by policy: ${witness}`)
  }
}

function requireScope(scopeId: string, scopes: ReadonlyMap<string, GraphScope>, label: string): void {
  if (!scopes.has(scopeId)) throw new Error(`Unknown Graph Scope on ${label}: ${scopeId}`)
}

function requireGroup(
  groupId: string,
  scopeId: string | undefined,
  groups: ReadonlyMap<string, NodeGroup>,
  label: string,
): void {
  const group = groups.get(groupId)
  if (group === undefined) throw new Error(`Unknown Node Group on ${label}: ${groupId}`)
  if (group.scopeId !== scopeId) throw new Error(`Node Group scope mismatch on ${label}: ${groupId}`)
}

function validateParentMap<T>(
  byId: ReadonlyMap<string, T>,
  label: string,
  parentOf: (value: T) => string | undefined,
): void {
  const done = new Set<string>()
  for (const id of byId.keys()) {
    if (done.has(id)) continue
    const path: string[] = []
    const inPath = new Set<string>()
    let current: string | undefined = id
    while (current !== undefined && !done.has(current)) {
      if (inPath.has(current)) throw new Error(`Cyclic ${label} ancestry: ${id}`)
      inPath.add(current)
      path.push(current)
      const value = byId.get(current)
      current = value === undefined ? undefined : parentOf(value)
    }
    for (const entry of path) done.add(entry)
  }
}

function templateKey(id: string, version: number): string {
  return JSON.stringify([id, version])
}

function requireIdentifier(value: string, label: string): void {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`${label} id must be non-empty`)
}
