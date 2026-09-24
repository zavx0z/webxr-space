import {
  Parameter,
  JSON_PATCH_LIMITS,
  JsonPatchError,
  applyJsonPatch,
  createNodeTree,
  createNodeTreeExternalStore,
  createValidatedParameter,
  encodeJsonPointerToken,
  equalNodeJsonValue,
  hydrateNodeTree,
  instantiateGraphTemplate,
  instantiateNodeTemplate,
  ownNodeJsonValue,
  ownNodeValueType,
  serializeNodeTreeDocument,
  type NodeJsonValue,
  type NodeTemplate,
  type NodeTreeDefinition,
  type NodeTreeDelta,
  type NodeTreeSnapshot,
  type NodeValueType,
} from "@nodes/tree"

export type ScenarioResult = Readonly<{
  input: Readonly<Record<string, unknown>>
  result: Readonly<Record<string, unknown>>
}>

const floatType: NodeValueType = {id: "float", version: 1}
const nodeTemplate: NodeTemplate = {id: "example/number", version: 1, kind: "node"}
const graphTemplate: NodeTemplate = {id: "example/subgraph", version: 1, kind: "graph"}

function basicDefinition(): NodeTreeDefinition<Parameter<number>> {
  return {
    frames: [{id: "frame"}],
    nodes: [
      {
        id: "source",
        frameId: "frame",
        parameters: [new Parameter<number>("value", 1)],
        sockets: [{id: "out", direction: "output", parameterId: "value", side: "right"}],
      },
      {
        id: "target",
        parameters: [new Parameter<number>("value", 0)],
        sockets: [{id: "in", direction: "input", parameterId: "value", side: "left"}],
      },
    ],
    links: [{id: "link", from: {nodeId: "source", socketId: "out"}, to: {nodeId: "target", socketId: "in"}}],
  }
}

function nestedDefinition(): NodeTreeDefinition<Parameter<number>> {
  const value = new Parameter<number>("value", 7, null, floatType)
  const node = instantiateNodeTemplate(nodeTemplate, {id: "instance:source", localId: "source"}, {
    id: "source",
    scopeId: "nested",
    groupId: "child-group",
    frameId: "child-frame",
    parameters: [value],
    sockets: [{id: "out", direction: "output", parameterId: "value", valueType: floatType}],
  })
  return {
    templates: [nodeTemplate, graphTemplate],
    scopes: [
      {id: "root", kind: "graph"},
      instantiateGraphTemplate(graphTemplate, {id: "instance:graph", localId: "graph"}, {
        id: "nested",
        parentScopeId: "root",
      }),
    ],
    groups: [
      {id: "parent-group", scopeId: "nested"},
      {id: "child-group", scopeId: "nested", parentGroupId: "parent-group"},
    ],
    frames: [
      {id: "parent-frame", scopeId: "nested", groupId: "parent-group"},
      {id: "child-frame", parentFrameId: "parent-frame", scopeId: "nested", groupId: "child-group"},
    ],
    nodes: [node],
  }
}

/** Expected rejection is evidence only if the actual public call throws. */
function rejection(action: () => unknown): Readonly<{name: string; message: string; code?: string}> {
  try {
    const value = action()
    if (value !== null && typeof value === "object" && "dispose" in value && typeof value.dispose === "function") {
      value.dispose()
    }
  } catch (error) {
    if (!(error instanceof Error)) throw error
    return {
      name: error.name,
      message: error.message,
      ...(error instanceof JsonPatchError ? {code: error.code} : {}),
    }
  }
  throw new Error("Сценарий ожидал отказ public API, но вызов завершился успешно")
}

function topology(): ScenarioResult {
  const definition = basicDefinition()
  const tree = createNodeTree(definition)
  try {
    return {
      input: {nodes: ["source", "target"], connection: "source/out → target/in"},
      result: {
        nodes: tree.nodes.map(node => node.id),
        frames: tree.frames.map(frame => frame.id),
        links: tree.links,
        parameterIdentity: tree.parameter("source", "value") === definition.nodes[0]?.parameters?.[0],
        topologyFrozen: Object.isFrozen(tree.nodes),
      },
    }
  } finally { tree.dispose() }
}

function scopes(): ScenarioResult {
  const tree = createNodeTree(nestedDefinition())
  try {
    return {
      input: {root: "root", subgraph: "nested", template: graphTemplate},
      result: {scopes: tree.scopes, nodeScope: tree.nodes[0]?.scopeId, nestedNodeCount: tree.nodes.length},
    }
  } finally { tree.dispose() }
}

function groups(): ScenarioResult {
  const tree = createNodeTree(nestedDefinition())
  try {
    return {
      input: {scope: "nested", logicalGroup: "child-group", frame: "child-frame"},
      result: {groups: tree.groups, frames: tree.frames, node: tree.snapshot().nodes[0]},
    }
  } finally { tree.dispose() }
}

function snapshots(): ScenarioResult {
  const tree = createNodeTree(basicDefinition())
  try {
    const first = tree.getSnapshot()
    const stableBeforeWrite = tree.getSnapshot() === first
    const value = tree.parameter("source", "value")
    value.set(9)
    return {
      input: {initialValue: 1, nextValue: 9},
      result: {
        stableBeforeWrite,
        newSnapshotAfterWrite: tree.getSnapshot() !== first,
        oldSnapshotValue: first.nodes[0]?.parameters[0]?.value,
        liveValue: value.value,
        definitionKeepsStore: tree.definition().nodes[0]?.parameters?.[0] === value,
        portableValue: tree.document().nodes.byId.source?.parameters.byId.value?.value,
        documentHasNoRevisions: !("revision" in tree.document()),
      },
    }
  } finally { tree.dispose() }
}

function lifecycle(): ScenarioResult {
  const tree = createNodeTree(basicDefinition())
  const value = tree.parameter("source", "value")
  let notifications = 0
  const unsubscribe = tree.subscribe(() => notifications += 1)
  value.set(2)
  tree.dispose()
  tree.dispose()
  value.set(3)
  unsubscribe()
  return {
    input: {steps: ["set(2)", "dispose() × 2", "set(3)", "reconcile()"]},
    result: {
      notifications,
      storeStillOwnedByCaller: value.value,
      disposedTreeRevision: tree.revision,
      reconcile: rejection(() => tree.reconcile({expectedRevision: tree.revision, definition: tree.definition()})),
    },
  }
}

function updates(): ScenarioResult {
  const value = new Parameter("value", {amount: 1})
  let notifications = 0
  const unsubscribe = value.subscribe(() => notifications += 1)
  const initial = value.snapshot()
  const equalWrite = value.set({amount: 1})
  const changedWrite = value.set({amount: 2})
  unsubscribe()
  unsubscribe()
  value.set({amount: 3})
  return {
    input: {initial: initial.value, writes: [{amount: 1}, {amount: 2}, {amount: 3}]},
    result: {equalWrite, changedWrite, notifications, revision: value.revision, snapshot: value.snapshot()},
  }
}

function shared(): ScenarioResult {
  const sharedValue = new Parameter<number>("value", 1)
  const independent = new Parameter<number>("value", 1)
  const aliasingRejected = rejection(() => createNodeTree({nodes: [
    {id: "first", parameters: [sharedValue]},
    {id: "alias", parameters: [sharedValue]},
  ]}))
  const tree = createNodeTree({nodes: [
    {id: "first", parameters: [sharedValue]},
    {id: "independent", parameters: [independent]},
  ]})
  const changedAddresses: string[] = []
  tree.subscribe(change => {
    if (change.kind === "parameter") changedAddresses.push(`${change.nodeId}/${change.parameterId}`)
  })
  try {
    sharedValue.set(5)
    return {
      input: {rejectedAlias: ["first/value", "alias/value"], acceptedOwners: ["first/value", "independent/value"]},
      result: {
        aliasingRejected,
        values: tree.snapshot().nodes.map(node => ({id: node.id, value: node.parameters[0]?.value})),
        suppliedIdentityPreserved: tree.parameter("first", "value") === sharedValue,
        independentIdentity: tree.parameter("first", "value") !== tree.parameter("independent", "value"),
        changedAddresses,
      },
    }
  } finally { tree.dispose() }
}

function ownership(): ScenarioResult {
  const input = {nested: {value: 1}, list: [1, 2]}
  const owned = ownNodeJsonValue(input)
  const value = new Parameter("json", input)
  input.nested.value = 99
  input.list.push(3)
  return {
    input: {callerAfterMutation: input},
    result: {
      owned,
      stored: value.value,
      distinctReference: owned !== input && value.value !== input,
      deeplyFrozen: Object.isFrozen(owned.nested) && Object.isFrozen(owned.list),
      structuralEquality: equalNodeJsonValue(owned, value.value),
      nonFiniteRejected: rejection(() => ownNodeJsonValue(Number.NaN)),
    },
  }
}

function valueValidation(): ScenarioResult {
  const value = createValidatedParameter<NodeJsonValue>("value", 1, null, floatType,
    (type, candidate) => type.id === "float" && typeof candidate === "number")
  let notifications = 0
  const unsubscribe = value.subscribe(() => notifications += 1)
  try {
    const invalid = rejection(() => value.set("invalid"))
    const afterInvalid = value.snapshot()
    const changed = value.set(4)
    const noOp = value.set(4)
    return {
      input: {valueType: floatType, writes: ["invalid", 4, 4]},
      result: {invalid, afterInvalid, changed, noOp, notifications, current: value.snapshot(), typeIdentity: ownNodeValueType(floatType)},
    }
  } finally { unsubscribe() }
}

function subscriptions(): ScenarioResult {
  const tree = createNodeTree(basicDefinition())
  const store = createNodeTreeExternalStore(tree)
  const target = store.parameter("target", "value")
  let treeNotifications = 0
  let targetNotifications = 0
  const unsubscribeTree = store.subscribe(() => treeNotifications += 1)
  const unsubscribeTarget = target.subscribe(() => targetNotifications += 1)
  try {
    tree.parameter("source", "value").set(2)
    const afterSource = {tree: treeNotifications, target: targetNotifications}
    tree.parameter("target", "value").set(4)
    const afterTarget = {tree: treeNotifications, target: targetNotifications}
    const targetSnapshot = target.getSnapshot()
    unsubscribeTarget()
    unsubscribeTree()
    tree.parameter("target", "value").set(6)
    return {
      input: {subscriptions: ["tree", "target/value"], writes: ["source=2", "target=4", "unsubscribe", "target=6"]},
      result: {afterSource, afterTarget, afterUnsubscribe: {tree: treeNotifications, target: targetNotifications}, targetSnapshot, stableStore: target === store.parameter("target", "value")},
    }
  } finally {
    unsubscribeTarget()
    unsubscribeTree()
    tree.dispose()
  }
}

function topologyUpdates(): ScenarioResult {
  const tree = createNodeTree(basicDefinition())
  const store = createNodeTreeExternalStore(tree)
  const modes = [store.getTopologyUpdate().mode]
  let notifications = 0
  const unsubscribe = store.subscribeTopology(() => notifications += 1)
  try {
    tree.parameter("source", "value").set(2)
    const afterValueWrite = notifications
    tree.reconcile({expectedRevision: tree.revision, definition: {...tree.definition(), nodes: [...tree.nodes, {id: "appended"}]}})
    modes.push(store.getTopologyUpdate().mode)
    const appendDelta = store.getTopologyUpdate().delta
    tree.reconcile({expectedRevision: tree.revision, definition: {...tree.definition(), nodes: tree.nodes.filter(node => node.id !== "appended")}})
    modes.push(store.getTopologyUpdate().mode)
    return {
      input: {steps: ["value write", "append node", "remove node"]},
      result: {modes, afterValueWrite, topologyNotifications: notifications, appendDelta, finalNodes: store.getTopologySnapshot().nodes.map(node => node.id)},
    }
  } finally {
    unsubscribe()
    tree.dispose()
  }
}

function reconcileIdentity(): ScenarioResult {
  const tree = createNodeTree(basicDefinition())
  const value = tree.parameter("source", "value")
  try {
    const append = tree.reconcile({expectedRevision: tree.revision, definition: {...tree.definition(), nodes: [...tree.nodes, {id: "temporary"}]}})
    const remove = tree.reconcile({expectedRevision: tree.revision, definition: {...tree.definition(), nodes: tree.nodes.filter(node => node.id !== "temporary")}})
    const beforeNoOp = tree.revision
    const noOp = tree.reconcile({expectedRevision: tree.revision, definition: tree.definition()})
    value.set(8)
    return {
      input: {steps: ["append temporary", "remove temporary", "reconcile same definition", "source.set(8)"]},
      result: {append, remove, noOp, beforeNoOp, exactStorePreserved: tree.parameter("source", "value") === value, value: value.value, revision: tree.revision, topologyRevision: tree.topologyRevision},
    }
  } finally { tree.dispose() }
}

function reconcileConflict(): ScenarioResult {
  const tree = createNodeTree(basicDefinition())
  const value = tree.parameter("source", "value")
  try {
    const sourceRevision = tree.revision
    value.set(2)
    const stale = rejection(() => tree.reconcile({expectedRevision: sourceRevision, definition: tree.definition()}))
    const replacement = rejection(() => tree.reconcile({
      expectedRevision: tree.revision,
      definition: {...tree.definition(), nodes: tree.nodes.map(node => node.id === "source" ? {...node, parameters: [new Parameter<number>("value", 99)]} : node)},
    }))
    return {
      input: {expectedRevision: sourceRevision, attemptedReplacement: 99},
      result: {stale, replacement, exactStorePreserved: tree.parameter("source", "value") === value, value: value.value, revision: tree.revision, topologyRevision: tree.topologyRevision},
    }
  } finally { tree.dispose() }
}

function deltas(): ScenarioResult {
  const tree = createNodeTree(basicDefinition())
  const events: NodeTreeDelta[] = []
  const unsubscribe = tree.subscribeDelta(delta => events.push(delta))
  try {
    tree.reconcile({expectedRevision: tree.revision, definition: {
      ...tree.definition(),
      nodes: [...tree.nodes.map(node => node.id === "source" ? {...node, metadata: {label: "Изменено"}} : node), {id: "added"}],
      links: [],
    }})
    tree.parameter("source", "value").set(6)
    tree.parameter("source", "value").set(6)
    return {input: {steps: ["update source metadata", "add node", "remove link", "set(6) × 2"]}, result: {events, eventCount: events.length}}
  } finally {
    unsubscribe()
    tree.dispose()
  }
}

async function projectionCache(): Promise<ScenarioResult> {
  const tree = createNodeTree(basicDefinition())
  let calls = 0
  const previousRevisions: (number | null)[] = []
  const projector = {
    project(input: Readonly<{snapshot: NodeTreeSnapshot; previous?: Readonly<{revision: number}>}>) {
      calls += 1
      previousRevisions.push(input.previous?.revision ?? null)
      return {revision: input.snapshot.revision, values: input.snapshot.nodes.map(node => node.parameters[0]?.value)}
    },
  }
  try {
    const request = {cacheKey: "numbers", context: null}
    const first = await tree.project(projector, request)
    const cached = await tree.project(projector, request)
    tree.parameter("source", "value").set(3)
    const updated = await tree.project(projector, request)
    tree.clearProjectionCache()
    const cleared = await tree.project(projector, request)
    return {
      input: {cacheKey: request.cacheKey, steps: ["project × 2", "set(3)", "project", "clear cache", "project"]},
      result: {calls, cacheReused: first === cached, first, updated, cleared, previousRevisions},
    }
  } finally { tree.dispose() }
}

async function projectionStale(): Promise<ScenarioResult> {
  const tree = createNodeTree(basicDefinition())
  let resolveProjection: (value: number) => void = () => { throw new Error("Projection has not started") }
  let capturedRevision = -1
  const projector = {
    project(input: Readonly<{snapshot: NodeTreeSnapshot}>) {
      capturedRevision = input.snapshot.revision
      return new Promise<number>(resolve => { resolveProjection = resolve })
    },
  }
  try {
    const request = {cacheKey: "delayed", context: null}
    const pending = tree.project(projector, request)
    const duplicate = tree.project(projector, request)
    await Promise.resolve()
    tree.parameter("source", "value").set(2)
    resolveProjection(capturedRevision)
    const outcome = await pending.then(
      () => { throw new Error("Устаревшая проекция неожиданно принята") },
      (error: unknown) => {
        if (!(error instanceof Error)) throw error
        return {name: error.name, message: error.message}
      },
    )
    return {input: {steps: ["start async projection", "same request", "set(2)", "complete old projection"]}, result: {pendingReused: pending === duplicate, capturedRevision, currentRevision: tree.revision, outcome}}
  } finally { tree.dispose() }
}

function nodeReference(): ScenarioResult {
  const first = new Parameter<number>("value", 1)
  const second = new Parameter<number>("value", 1)
  const a = instantiateNodeTemplate(nodeTemplate, {id: "instance:a", localId: "number"}, {id: "a", parameters: [first]})
  const b = instantiateNodeTemplate(nodeTemplate, {id: "instance:b", localId: "number"}, {id: "b", parameters: [second]})
  const tree = createNodeTree({templates: [nodeTemplate], nodes: [a, b]})
  try {
    first.set(5)
    return {
      input: {template: nodeTemplate, suppliedStores: "Два отдельных new Parameter, готовый состав нод"},
      result: {references: tree.nodes.map(node => node.instance), suppliedStorePreserved: a.parameters?.[0] === first, values: [first.value, second.value], structureFrozen: Object.isFrozen(a), templateDeclaresNoDefaults: !("parameters" in nodeTemplate)},
    }
  } finally { tree.dispose() }
}

function graphReference(): ScenarioResult {
  const scope = instantiateGraphTemplate(graphTemplate, {id: "instance:graph", localId: "graph"}, {id: "nested", parentScopeId: "root"})
  const tree = createNodeTree({templates: [graphTemplate], scopes: [{id: "root", kind: "graph"}, scope], nodes: []})
  try {
    return {
      input: {template: graphTemplate, suppliedScope: {id: "nested", parentScopeId: "root"}},
      result: {scope, nodeCount: tree.nodes.length, note: "Функция добавляет reference к Scope; тело подграфа задаётся отдельно."},
    }
  } finally { tree.dispose() }
}

function roundtrip(): ScenarioResult {
  const tree = createNodeTree(nestedDefinition())
  const serialized = serializeNodeTreeDocument(tree.document())
  const restored = hydrateNodeTree(serialized, {validateParameterValue: (type, value) => type.id === "float" && typeof value === "number"})
  try {
    const original = tree.parameter("source", "value")
    const hydrated = restored.parameter("source", "value")
    const invalidWrite = rejection(() => hydrated.set("invalid"))
    return {
      input: {formatVersion: tree.document().formatVersion, serializedBytes: serialized.length},
      result: {
        equalDocuments: serializeNodeTreeDocument(restored.document()) === serialized,
        independentStore: original !== hydrated,
        valueType: hydrated.valueType,
        value: hydrated.value,
        nodeOrder: restored.document().nodes.order,
        scopes: restored.scopes,
        groups: restored.groups,
        templates: restored.templates,
        invalidWrite,
      },
    }
  } finally {
    restored.dispose()
    tree.dispose()
  }
}

function invalidDocument(): ScenarioResult {
  const tree = createNodeTree(basicDefinition())
  try {
    const source = JSON.parse(serializeNodeTreeDocument(tree.document())) as NodeJsonValue
    const unknownVersion = applyJsonPatch(source, [{op: "replace", path: "/formatVersion", value: 99}])
    const missingEntry = applyJsonPatch(source, [{op: "remove", path: "/nodes/byId/source"}])
    return {
      input: {mutations: ["formatVersion = 99", "remove nodes.byId.source while order retains source"]},
      result: {unknownVersion: rejection(() => hydrateNodeTree(unknownVersion)), missingEntry: rejection(() => hydrateNodeTree(missingEntry)), sourcePreserved: tree.nodes.length === 2},
    }
  } finally { tree.dispose() }
}

function patchOperations(): ScenarioResult {
  const source = {"a/b~c": [1, 2], obsolete: true}
  const path = `/${encodeJsonPointerToken("a/b~c")}`
  const result = applyJsonPatch(source, [
    {op: "test", path: `${path}/0`, value: 1},
    {op: "replace", path: `${path}/0`, value: 4},
    {op: "add", path: `${path}/-`, value: 3},
    {op: "remove", path: "/obsolete"},
  ])
  return {input: {source, operations: ["test", "replace", "add", "remove"], escapedPath: path}, result: {patched: result, source, frozen: Object.isFrozen(result), limits: JSON_PATCH_LIMITS}}
}

function patchAtomicError(): ScenarioResult {
  const source = {value: 1}
  const atomic = rejection(() => applyJsonPatch(source, [
    {op: "replace", path: "/value", value: 2},
    {op: "test", path: "/value", value: 99},
  ]))
  const limit = rejection(() => applyJsonPatch(source, Array.from({length: JSON_PATCH_LIMITS.operations + 1}, () => ({op: "test" as const, path: "/value", value: 1}))))
  return {input: {source, steps: ["replace 1 → 2", "test value = 99 fails"]}, result: {atomic, unchangedSource: source, limit}}
}

function linkTypes(): ScenarioResult {
  const definition: NodeTreeDefinition = {
    nodes: [
      {id: "source", sockets: [{id: "out", direction: "output", valueType: floatType}]},
      {id: "target", sockets: [{id: "in", direction: "input", valueType: {id: "integer", version: 1}}]},
    ],
    links: [{id: "link", from: {nodeId: "source", socketId: "out"}, to: {nodeId: "target", socketId: "in"}}],
  }
  const strict = rejection(() => createNodeTree(definition))
  const tree = createNodeTree(definition, {compatibleSocketTypes: (source, target) => source.id === "float" && target.id === "integer"})
  try {
    const parameterMismatch = rejection(() => createNodeTree({nodes: [{
      id: "typed",
      parameters: [new Parameter<number>("value", 1, null, floatType)],
      sockets: [{id: "out", direction: "output", parameterId: "value", valueType: {id: "integer", version: 1}}],
    }]}))
    return {input: {connection: "float@1 → integer@1"}, result: {strict, explicitPolicyLinkCount: tree.links.length, parameterMismatch}}
  } finally { tree.dispose() }
}

function cycles(): ScenarioResult {
  const definition: NodeTreeDefinition = {
    nodes: ["a", "b"].map(id => ({id, sockets: [{id: "io", direction: "bidirectional"}]})),
    links: [
      {id: "ab", from: {nodeId: "a", socketId: "io"}, to: {nodeId: "b", socketId: "io"}},
      {id: "ba", from: {nodeId: "b", socketId: "io"}, to: {nodeId: "a", socketId: "io"}},
    ],
  }
  const tree = createNodeTree(definition, {cyclePolicy: "allow"})
  try {
    return {input: {graph: "a ⇄ b", socketDirection: "bidirectional"}, result: {allowLinkCount: tree.links.length, acyclic: rejection(() => createNodeTree(definition, {cyclePolicy: "acyclic"}))}}
  } finally { tree.dispose() }
}

function references(): ScenarioResult {
  const definition = basicDefinition()
  const invalidEndpoint = {...definition, links: [{id: "missing", from: {nodeId: "unknown", socketId: "out"}, to: {nodeId: "target", socketId: "in"}}]}
  const reversed = {...definition, links: [{id: "reversed", from: {nodeId: "target", socketId: "in"}, to: {nodeId: "source", socketId: "out"}}]}
  return {
    input: {invalid: ["unknown endpoint", "input → output", "duplicate node id", "unknown frame"]},
    result: {
      endpoint: rejection(() => createNodeTree(invalidEndpoint)),
      direction: rejection(() => createNodeTree(reversed)),
      duplicate: rejection(() => createNodeTree({nodes: [{id: "same"}, {id: "same"}]})),
      frame: rejection(() => createNodeTree({nodes: [{id: "source", frameId: "unknown"}]})),
    },
  }
}

export const modelCases = {
  topology: topology,
  scopes: scopes,
  groups: groups,
  snapshots: snapshots,
  lifecycle: lifecycle,
  updates: updates,
  shared: shared,
  ownership: ownership,
  valueValidation: valueValidation,
  subscriptions: subscriptions,
  topologyUpdates: topologyUpdates,
  reconcileIdentity: reconcileIdentity,
  reconcileConflict: reconcileConflict,
  deltas: deltas,
  projectionCache: projectionCache,
  projectionStale: projectionStale,
  nodeReference: nodeReference,
  graphReference: graphReference,
  roundtrip: roundtrip,
  invalidDocument: invalidDocument,
  patchOperations: patchOperations,
  patchAtomicError: patchAtomicError,
  linkTypes: linkTypes,
  cycles: cycles,
  references: references,
} as const
