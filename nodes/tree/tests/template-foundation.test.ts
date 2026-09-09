import {expect, test} from "bun:test"
import {
  createNodeTree,
  createValidatedParameter,
  hydrateNodeTree,
  instantiateGraphTemplate,
  instantiateNodeTemplate,
  serializeNodeTreeDocument,
  type NodeTemplate,
  type NodeTreeChange,
  type NodeValueType,
} from "@nodes/tree"

const numberType: NodeValueType = {id: "float", version: 1}
const numberTemplate: NodeTemplate = {id: "example/number-source", version: 1, kind: "node"}

// These fixtures assemble the existing expanded model; they are not a NodeType factory.
function sourceFixture(id: string, initialValue = 0) {
  const value = createValidatedParameter(
    "value",
    initialValue,
    {label: "Значение"},
    numberType,
    (type, candidate) => type.id === "float" && type.version === 1 &&
      typeof candidate === "number" && Number.isFinite(candidate),
  )
  const node = instantiateNodeTemplate(numberTemplate, {id: `instance:${id}`, localId: "source"}, {
    id,
    parameters: [value],
    sockets: [{id: "out", direction: "output", parameterId: "value", side: "right", valueType: numberType}],
  })
  return {node, value}
}

test("[NODETREE-TEMPLATE-001] template materialization preserves the supplied Store and exact identity", () => {
  const {node, value} = sourceFixture("source", 2)
  expect(node.parameters?.[0]).toBe(value)
  expect(node.instance).toEqual({
    id: "instance:source",
    templateId: numberTemplate.id,
    templateVersion: 1,
    localId: "source",
  })
  expect(Object.isFrozen(node)).toBe(true)
  expect(Object.isFrozen(node.parameters)).toBe(true)
  expect(Object.isFrozen(node.sockets?.[0])).toBe(true)
  const tree = createNodeTree({templates: [numberTemplate], nodes: [node]})
  try {
    expect(tree.parameter("source", "value")).toBe(value)
    expect(tree.templates).toEqual([numberTemplate])
    value.set(7)
    expect(tree.parameter("source", "value").value).toBe(7)
    expect(tree.topologyRevision).toBe(0)
    expect(tree.nodes[0]?.instance).toEqual(node.instance)
  } finally {
    tree.dispose()
  }
})

test("[NODETREE-TEMPLATE-002] independently supplied Stores stay independent under the same Template", () => {
  const first = sourceFixture("source-a", 2)
  const second = sourceFixture("source-b")
  const tree = createNodeTree({templates: [numberTemplate], nodes: [first.node, second.node]})
  let secondNotifications = 0
  const unsubscribe = second.value.subscribe(() => secondNotifications += 1)
  try {
    expect(first.value).not.toBe(second.value)
    first.value.set(7)
    expect(first.value.value).toBe(7)
    expect(second.value.value).toBe(0)
    expect(second.value.revision).toBe(0)
    expect(secondNotifications).toBe(0)
    expect(tree.parameter("source-a", "value")).toBe(first.value)
    expect(tree.parameter("source-b", "value")).toBe(second.value)
  } finally {
    unsubscribe()
    tree.dispose()
  }
})

test("[NODETREE-TEMPLATE-003] unknown and simultaneous versions fail before a tree is published", () => {
  const {node} = sourceFixture("source")
  const nextVersion: NodeTemplate = {...numberTemplate, version: 2}
  expect(() => createNodeTree({templates: [nextVersion], nodes: [node]}))
    .toThrow("Unknown Template")
  expect(() => createNodeTree({templates: [numberTemplate, nextVersion], nodes: [node]}))
    .toThrow("Duplicate Template id")
  expect(() => instantiateNodeTemplate({...numberTemplate, kind: "graph"}, {
    id: "instance:wrong-kind",
    localId: "source",
  }, {id: "wrong-kind"})).toThrow("Cannot instantiate graph Template as Node")
  expect(() => instantiateNodeTemplate({...numberTemplate, version: 0}, {
    id: "instance:wrong-version",
    localId: "source",
  }, {id: "wrong-version"})).toThrow("positive safe integer")
})

test("[NODETREE-TEMPLATE-004] value validation remains active on later writes and rejects before notification", () => {
  const value = createValidatedParameter<number>("amount", 2, null, numberType,
    (type, candidate) => type.id === "float" && typeof candidate === "number" && candidate >= 0)
  let notifications = 0
  const unsubscribe = value.subscribe(() => notifications += 1)
  try {
    expect(() => value.set(-1)).toThrow("does not satisfy its value type")
    expect(value.value).toBe(2)
    expect(value.revision).toBe(0)
    expect(notifications).toBe(0)
    expect(value.set(2)).toBe(false)
    expect(value.set(4)).toBe(true)
    expect(value.revision).toBe(1)
    expect(notifications).toBe(1)
  } finally {
    unsubscribe()
  }
})

test("[NODETREE-TEMPLATE-005] bound Socket and Link type compatibility are separate model checks", () => {
  const {node} = sourceFixture("source")
  const incompatibleType: NodeValueType = {id: "integer", version: 1}
  expect(() => createNodeTree({
    templates: [numberTemplate],
    nodes: [{...node, sockets: [{...node.sockets![0]!, valueType: incompatibleType}]}],
  })).toThrow("Parameter and Socket value types must match")

  const target = {
    id: "target",
    sockets: [{id: "in", direction: "input" as const, side: "left" as const, valueType: incompatibleType}],
  }
  const definition = {
    templates: [numberTemplate],
    nodes: [node, target],
    links: [{id: "connection", from: {nodeId: "source", socketId: "out"}, to: {nodeId: "target", socketId: "in"}}],
  }
  expect(() => createNodeTree(definition)).toThrow("Incompatible Socket value types")
  const tree = createNodeTree(definition, {
    compatibleSocketTypes: (source, destination) =>
      source.id === "float" && destination.id === "integer" &&
      source.version === 1 && destination.version === 1,
  })
  try {
    expect(tree.links.map(link => link.id)).toEqual(["connection"])
  } finally {
    tree.dispose()
  }
})

test("[NODETREE-TEMPLATE-006] v2 round trip preserves template, subgraph, group, instance and typed value data", () => {
  const {node, value} = sourceFixture("source", 2)
  const graphTemplate: NodeTemplate = {id: "example/subgraph", version: 1, kind: "graph"}
  const subgraph = instantiateGraphTemplate(graphTemplate, {id: "instance:group", localId: "graph"}, {
    id: "nested",
    parentScopeId: "root",
  })
  const tree = createNodeTree({
    templates: [numberTemplate, graphTemplate],
    scopes: [{id: "root", kind: "graph"}, subgraph],
    groups: [{id: "logical-group", scopeId: "nested"}],
    frames: [{id: "visual-frame", scopeId: "nested", groupId: "logical-group"}],
    nodes: [{...node, scopeId: "nested", groupId: "logical-group", frameId: "visual-frame"}],
  })
  value.set(7)
  const serialized = serializeNodeTreeDocument(tree.document())
  const restored = hydrateNodeTree(serialized, {
    validateParameterValue: (type, candidate) => type.id === "float" && typeof candidate === "number",
  })
  try {
    expect(restored.document()).toEqual(tree.document())
    expect(restored.templates).toEqual(tree.templates)
    expect(restored.scopes).toEqual(tree.scopes)
    expect(restored.groups).toEqual(tree.groups)
    expect(restored.nodes[0]?.instance).toEqual(node.instance)
    const restoredValue = restored.parameter("source", "value")
    expect(restoredValue).not.toBe(value)
    expect(restoredValue.value).toBe(7)
    expect(restoredValue.valueType).toEqual(numberType)
    expect(() => restoredValue.set("invalid")).toThrow("does not satisfy its value type")
    expect(serializeNodeTreeDocument(restored.document())).toBe(serialized)
  } finally {
    restored.dispose()
    tree.dispose()
  }
})

test("[NODETREE-TEMPLATE-007] topology reconciliation retains surviving Stores and their subscriptions", () => {
  const first = sourceFixture("source-a", 2)
  const second = sourceFixture("source-b")
  const tree = createNodeTree({templates: [numberTemplate], nodes: [first.node]})
  const changes: NodeTreeChange[] = []
  tree.subscribe(change => changes.push(change))
  try {
    const result = tree.reconcile({
      expectedRevision: tree.revision,
      definition: {...tree.definition(), nodes: [first.node, second.node]},
    })
    expect(result.changed).toBe(true)
    expect(tree.parameter("source-a", "value")).toBe(first.value)
    expect(tree.parameter("source-b", "value")).toBe(second.value)
    expect(tree.topologyRevision).toBe(1)
    first.value.set(9)
    expect(changes.map(change => change.kind)).toEqual(["topology", "parameter"])
    expect(changes[1]).toMatchObject({nodeId: "source-a", parameterId: "value", parameterRevision: 1})
    expect(tree.topologyRevision).toBe(1)
    expect(tree.reconcile({expectedRevision: tree.revision, definition: tree.definition()}).changed).toBe(false)
    expect(changes).toHaveLength(2)
  } finally {
    tree.dispose()
  }
})

test("[NODETREE-TEMPLATE-008] Store replacement and stale revisions leave the existing tree untouched", () => {
  const original = sourceFixture("source", 2)
  const replacement = sourceFixture("source", 99)
  const tree = createNodeTree({templates: [numberTemplate], nodes: [original.node]})
  const changes: NodeTreeChange[] = []
  tree.subscribe(change => changes.push(change))
  try {
    expect(() => tree.reconcile({
      expectedRevision: tree.revision,
      definition: {...tree.definition(), nodes: [replacement.node]},
    })).toThrow("Parameter identity must be preserved")
    expect(tree.parameter("source", "value")).toBe(original.value)
    expect(tree.revision).toBe(0)
    expect(changes).toHaveLength(0)
    const staleRevision = tree.revision
    original.value.set(3)
    expect(() => tree.reconcile({expectedRevision: staleRevision, definition: tree.definition()})).toThrow()
    expect(tree.parameter("source", "value")).toBe(original.value)
    expect(tree.parameter("source", "value").value).toBe(3)
    expect(tree.topologyRevision).toBe(0)
    expect(changes.map(change => change.kind)).toEqual(["parameter"])
  } finally {
    tree.dispose()
  }
})
