import {expect, test} from "bun:test"
import {modelCases} from "./model-cases.ts"

test("[NODETREE-CASES-002] topology, nested ownership and snapshot cases reflect real Stores", async () => {
  expect((await run("topology"))).toMatchObject({nodes: ["source", "target"], frames: ["frame"], parameterIdentity: true, topologyFrozen: true})
  expect((await run("scopes"))).toMatchObject({nodeScope: "nested", scopes: [{id: "root", kind: "graph"}, {id: "nested", kind: "subgraph", parentScopeId: "root"}]})
  expect((await run("groups"))).toMatchObject({
    groups: [{id: "parent-group", scopeId: "nested"}, {id: "child-group", scopeId: "nested", parentGroupId: "parent-group"}],
    node: {scopeId: "nested", groupId: "child-group", frameId: "child-frame"},
  })
  expect(await run("snapshots")).toEqual({stableBeforeWrite: true, newSnapshotAfterWrite: true, oldSnapshotValue: 1, liveValue: 9, definitionKeepsStore: true, portableValue: 9, documentHasNoRevisions: true})
  expect(await run("lifecycle")).toMatchObject({notifications: 1, storeStillOwnedByCaller: 3, disposedTreeRevision: 1, reconcile: {name: "Error"}})
})

test("[NODETREE-CASES-003] Parameter cases prove no-op, rejected aliasing, JSON ownership and scoped subscriptions", async () => {
  expect(await run("updates")).toMatchObject({equalWrite: false, changedWrite: true, notifications: 1, revision: 2, snapshot: {value: {amount: 3}}})
  expect(await run("shared")).toEqual({
    aliasingRejected: {name: "Error", message: "Parameter is shared by multiple Nodes: value"},
    values: [{id: "first", value: 5}, {id: "independent", value: 1}],
    suppliedIdentityPreserved: true,
    independentIdentity: true,
    changedAddresses: ["first/value"],
  })
  expect(await run("ownership")).toMatchObject({owned: {nested: {value: 1}, list: [1, 2]}, stored: {nested: {value: 1}, list: [1, 2]}, deeplyFrozen: true, distinctReference: true, structuralEquality: true, nonFiniteRejected: {name: "TypeError"}})
  expect(await run("valueValidation")).toMatchObject({afterInvalid: {value: 1, revision: 0}, changed: true, noOp: false, notifications: 1, current: {value: 4, revision: 1}, invalid: {name: "TypeError"}})
  expect(await run("subscriptions")).toEqual({afterSource: {tree: 1, target: 0}, afterTarget: {tree: 2, target: 1}, afterUnsubscribe: {tree: 2, target: 1}, targetSnapshot: {id: "value", value: 4, revision: 1, presentation: null}, stableStore: true})
})

test("[NODETREE-CASES-004] change cases exercise append/full, preserved identity, rejected revisions and entity deltas", async () => {
  expect(await run("topologyUpdates")).toMatchObject({modes: ["initial", "append-node", "full"], afterValueWrite: 0, topologyNotifications: 2, finalNodes: ["source", "target"], appendDelta: {added: [{kind: "node", id: "appended"}], removed: [], updated: []}})
  expect(await run("reconcileIdentity")).toMatchObject({append: {changed: true}, remove: {changed: true}, noOp: {changed: false, revision: 2}, exactStorePreserved: true, value: 8, revision: 3, topologyRevision: 2})
  expect(await run("reconcileConflict")).toMatchObject({stale: {name: "NodeTreeRevisionConflictError"}, replacement: {name: "Error"}, exactStorePreserved: true, value: 2, revision: 1, topologyRevision: 0})
  expect(await run("deltas")).toMatchObject({eventCount: 2, events: [
    {kind: "topology", revision: 1, added: [{kind: "node", id: "added"}], removed: [{kind: "link", id: "link"}], updated: [{kind: "node", id: "source"}]},
    {kind: "parameter", revision: 2, nodeId: "source", parameterId: "value", parameterRevision: 1},
  ]})
})

test("[NODETREE-CASES-005] projection cases prove cache reuse, previous generation, pending deduplication and stale rejection", async () => {
  expect(await run("projectionCache")).toEqual({calls: 3, cacheReused: true, first: {revision: 0, values: [1, 0]}, updated: {revision: 1, values: [3, 0]}, cleared: {revision: 1, values: [3, 0]}, previousRevisions: [null, 0, null]})
  expect(await run("projectionStale")).toMatchObject({pendingReused: true, capturedRevision: 0, currentRevision: 1, outcome: {name: "StaleNodeTreeProjectionError"}})
})

test("[NODETREE-CASES-006] template cases expose reference semantics without inventing NodeType materialization", async () => {
  expect(await run("nodeReference")).toMatchObject({suppliedStorePreserved: true, values: [5, 1], structureFrozen: true, templateDeclaresNoDefaults: true, references: [
    {id: "instance:a", templateId: "example/number", templateVersion: 1, localId: "number"},
    {id: "instance:b", templateId: "example/number", templateVersion: 1, localId: "number"},
  ]})
  expect(await run("graphReference")).toMatchObject({nodeCount: 0, scope: {id: "nested", kind: "subgraph", parentScopeId: "root", instance: {templateId: "example/subgraph"}}})
})

test("[NODETREE-CASES-007] serialization cases retain v2 identity and reject malformed documents", async () => {
  expect(await run("roundtrip")).toMatchObject({equalDocuments: true, independentStore: true, valueType: {id: "float", version: 1}, value: 7, nodeOrder: ["source"], invalidWrite: {name: "TypeError"}})
  expect(await run("invalidDocument")).toMatchObject({unknownVersion: {name: "TypeError"}, missingEntry: {name: "TypeError"}, sourcePreserved: true})
  expect(await run("patchOperations")).toEqual({patched: {"a/b~c": [4, 2, 3]}, source: {"a/b~c": [1, 2], obsolete: true}, frozen: true, limits: {operations: 256, pathLength: 4096, depth: 128}})
  expect(await run("patchAtomicError")).toMatchObject({atomic: {name: "JsonPatchError", code: "test_failed"}, unchangedSource: {value: 1}, limit: {name: "JsonPatchError", code: "limit_exceeded"}})
})

test("[NODETREE-CASES-008] validation cases run type, cycle and endpoint policies", async () => {
  expect(await run("linkTypes")).toMatchObject({strict: {name: "Error"}, explicitPolicyLinkCount: 1, parameterMismatch: {name: "Error"}})
  expect(await run("cycles")).toMatchObject({allowLinkCount: 2, acyclic: {name: "Error"}})
  const invalid = await run("references")
  for (const key of ["endpoint", "direction", "duplicate", "frame"]) expect(invalid[key]).toMatchObject({name: "Error"})
})

async function run(name: keyof typeof modelCases): Promise<Readonly<Record<string, unknown>>> {
  return (await modelCases[name]()).result
}
