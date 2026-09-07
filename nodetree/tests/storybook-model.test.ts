import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {getScenario, scenarios} from "../.storybook/stories/scenarios.ts"
import * as descriptors from "../.storybook/stories/subjects.ts"

const packageRoot = resolve(import.meta.dir, "..")

test("[NODETREE-STORYBOOK-001] every catalog variant resolves to one executable owner scenario and existing resources", async () => {
  const catalog = await Bun.file(resolve(packageRoot, ".storybook/catalog.json")).json()
  const routes: string[] = []
  const resources = new Set<string>()
  for (const category of catalog.categories) {
    expect(category.subjects.length).toBeGreaterThan(0)
    for (const subject of category.subjects) {
      expect(subject.variants.length).toBeGreaterThan(0)
      expect(subject.presentation.protocol).toBe("story-presentation/1")
      expect(subject.presentation.projection).toBe("display")
      resources.add(subject.readme)
      for (const variant of subject.variants) {
        routes.push(variant.route)
        expect(variant.route.startsWith(`${subject.route}/`)).toBe(true)
        const descriptor = descriptors[variant.module.export as keyof typeof descriptors]
        expect(descriptor.route).toBe(variant.route)
        expect(getScenario(variant.route).label).toBe(variant.label)
        resources.add(variant.module.path)
        resources.add(variant.resources.fixture)
        for (const path of [...variant.resources.tests, ...variant.resources.references]) resources.add(path)
      }
    }
  }
  expect(new Set(routes).size).toBe(routes.length)
  expect(routes.sort()).toEqual(scenarios.map(scenario => scenario.route).sort())
  expect(catalog.categories.map((category: {id: string}) => category.id)).toEqual([
    "model", "parameters", "changes", "projections", "templates", "serialization", "validation",
  ])
  for (const path of resources) expect(await Bun.file(resolve(packageRoot, ".storybook", path)).exists()).toBe(true)
})

test("[NODETREE-STORYBOOK-002] topology, nested ownership and snapshot stories reflect real Stores", async () => {
  expect((await run("model/topology/baseline"))).toMatchObject({nodes: ["source", "target"], frames: ["frame"], parameterIdentity: true, topologyFrozen: true})
  expect((await run("model/scopes/nested"))).toMatchObject({nodeScope: "nested", scopes: [{id: "root", kind: "graph"}, {id: "nested", kind: "subgraph", parentScopeId: "root"}]})
  expect((await run("model/groups/nested"))).toMatchObject({
    groups: [{id: "parent-group", scopeId: "nested"}, {id: "child-group", scopeId: "nested", parentGroupId: "parent-group"}],
    node: {scopeId: "nested", groupId: "child-group", frameId: "child-frame"},
  })
  expect(await run("model/snapshots/identity")).toEqual({stableBeforeWrite: true, newSnapshotAfterWrite: true, oldSnapshotValue: 1, liveValue: 9, definitionKeepsStore: true, portableValue: 9, documentHasNoRevisions: true})
  expect(await run("model/lifecycle/dispose")).toMatchObject({notifications: 1, storeStillOwnedByCaller: 3, disposedTreeRevision: 1, reconcile: {name: "Error"}})
})

test("[NODETREE-STORYBOOK-003] Parameter stories prove no-op, rejected aliasing, JSON ownership and scoped subscriptions", async () => {
  expect(await run("parameters/store/updates")).toMatchObject({equalWrite: false, changedWrite: true, notifications: 1, revision: 2, snapshot: {value: {amount: 3}}})
  expect(await run("parameters/store/shared")).toEqual({
    aliasingRejected: {name: "Error", message: "Parameter is shared by multiple Nodes: value"},
    values: [{id: "first", value: 5}, {id: "independent", value: 1}],
    suppliedIdentityPreserved: true,
    independentIdentity: true,
    changedAddresses: ["first/value"],
  })
  expect(await run("parameters/value/ownership")).toMatchObject({owned: {nested: {value: 1}, list: [1, 2]}, stored: {nested: {value: 1}, list: [1, 2]}, deeplyFrozen: true, distinctReference: true, structuralEquality: true, nonFiniteRejected: {name: "TypeError"}})
  expect(await run("parameters/value-type/validation")).toMatchObject({afterInvalid: {value: 1, revision: 0}, changed: true, noOp: false, notifications: 1, current: {value: 4, revision: 1}, invalid: {name: "TypeError"}})
  expect(await run("parameters/subscriptions/scoped")).toEqual({afterSource: {tree: 1, target: 0}, afterTarget: {tree: 2, target: 1}, afterUnsubscribe: {tree: 2, target: 1}, targetSnapshot: {id: "value", value: 4, revision: 1, presentation: null}, stableStore: true})
})

test("[NODETREE-STORYBOOK-004] change stories exercise append/full, preserved identity, rejected revisions and entity deltas", async () => {
  expect(await run("changes/topology/append")).toMatchObject({modes: ["initial", "append-node", "full"], afterValueWrite: 0, topologyNotifications: 2, finalNodes: ["source", "target"], appendDelta: {added: [{kind: "node", id: "appended"}], removed: [], updated: []}})
  expect(await run("changes/reconcile/identity")).toMatchObject({append: {changed: true}, remove: {changed: true}, noOp: {changed: false, revision: 2}, exactStorePreserved: true, value: 8, revision: 3, topologyRevision: 2})
  expect(await run("changes/reconcile/conflict")).toMatchObject({stale: {name: "NodeTreeRevisionConflictError"}, replacement: {name: "Error"}, exactStorePreserved: true, value: 2, revision: 1, topologyRevision: 0})
  expect(await run("changes/delta/entities")).toMatchObject({eventCount: 2, events: [
    {kind: "topology", revision: 1, added: [{kind: "node", id: "added"}], removed: [{kind: "link", id: "link"}], updated: [{kind: "node", id: "source"}]},
    {kind: "parameter", revision: 2, nodeId: "source", parameterId: "value", parameterRevision: 1},
  ]})
})

test("[NODETREE-STORYBOOK-005] projection stories prove cache reuse, previous generation, pending deduplication and stale rejection", async () => {
  expect(await run("projections/cache/reuse")).toEqual({calls: 3, cacheReused: true, first: {revision: 0, values: [1, 0]}, updated: {revision: 1, values: [3, 0]}, cleared: {revision: 1, values: [3, 0]}, previousRevisions: [null, 0, null]})
  expect(await run("projections/generation/stale")).toMatchObject({pendingReused: true, capturedRevision: 0, currentRevision: 1, outcome: {name: "StaleNodeTreeProjectionError"}})
})

test("[NODETREE-STORYBOOK-006] template stories expose reference semantics without inventing NodeType materialization", async () => {
  expect(await run("templates/node/reference")).toMatchObject({suppliedStorePreserved: true, values: [5, 1], structureFrozen: true, templateDeclaresNoDefaults: true, references: [
    {id: "instance:a", templateId: "example/number", templateVersion: 1, localId: "number"},
    {id: "instance:b", templateId: "example/number", templateVersion: 1, localId: "number"},
  ]})
  expect(await run("templates/graph/reference")).toMatchObject({nodeCount: 0, scope: {id: "nested", kind: "subgraph", parentScopeId: "root", instance: {templateId: "example/subgraph"}}})
})

test("[NODETREE-STORYBOOK-007] serialization stories retain v2 identity and reject malformed documents", async () => {
  expect(await run("serialization/document/roundtrip")).toMatchObject({equalDocuments: true, independentStore: true, valueType: {id: "float", version: 1}, value: 7, nodeOrder: ["source"], invalidWrite: {name: "TypeError"}})
  expect(await run("serialization/document/invalid")).toMatchObject({unknownVersion: {name: "TypeError"}, missingEntry: {name: "TypeError"}, sourcePreserved: true})
  expect(await run("serialization/json-patch/operations")).toEqual({patched: {"a/b~c": [4, 2, 3]}, source: {"a/b~c": [1, 2], obsolete: true}, frozen: true, limits: {operations: 256, pathLength: 4096, depth: 128}})
  expect(await run("serialization/json-patch/atomic-error")).toMatchObject({atomic: {name: "JsonPatchError", code: "test_failed"}, unchangedSource: {value: 1}, limit: {name: "JsonPatchError", code: "limit_exceeded"}})
})

test("[NODETREE-STORYBOOK-008] validation stories run type, cycle and endpoint policies", async () => {
  expect(await run("validation/links/types")).toMatchObject({strict: {name: "Error"}, explicitPolicyLinkCount: 1, parameterMismatch: {name: "Error"}})
  expect(await run("validation/topology/cycles")).toMatchObject({allowLinkCount: 2, acyclic: {name: "Error"}})
  const invalid = await run("validation/topology/references")
  for (const key of ["endpoint", "direction", "duplicate", "frame"]) expect(invalid[key]).toMatchObject({name: "Error"})
})

async function run(route: string): Promise<Readonly<Record<string, unknown>>> {
  return (await getScenario(route).run()).result
}
