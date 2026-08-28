import {describe, expect, test} from "bun:test"
import {NodeTree, type Node, type NodeTreeDelta, type NodeTreeDefinition} from "./node-tree.ts"
import {
  createNodeTree,
  createNodeTreeExternalStore,
  createValidatedParameter,
  diffNodeTreeDefinitions,
  instantiateGraphTemplate,
  instantiateNodeTemplate,
} from "./foundation.ts"
import {Parameter, type NodeJsonValue, type ParameterReference} from "./parameter.ts"
import {stageNodeTreePolicy} from "./node-tree-policy.ts"
import {hydrateNodeTree, serializeNodeTreeDocument} from "./serialization.ts"

const numberType = Object.freeze({id: "number", version: 1})

function appendNode<
  TParameter extends ParameterReference,
  TFrameMetadata extends NodeJsonValue,
  TNodeMetadata extends NodeJsonValue,
  TSocketMetadata extends NodeJsonValue,
  TLinkMetadata extends NodeJsonValue,
>(
  tree: NodeTree<TParameter, TFrameMetadata, TNodeMetadata, TSocketMetadata, TLinkMetadata>,
  request: Readonly<{
    expectedRevision: number
    node: Node<TParameter, TNodeMetadata, TSocketMetadata>
  }>,
) {
  return tree.reconcile({
    expectedRevision: request.expectedRevision,
    definition: {...tree.definition(), nodes: [...tree.nodes, request.node]},
  })
}

function foundationDefinition(): NodeTreeDefinition<Parameter<number, null>> {
  const sourceValue = new Parameter("value", 1, null, numberType)
  const targetValue = new Parameter("value", 0, null, numberType)
  return {
    templates: [
      {id: "math-node", version: 1, kind: "node"},
      {id: "subgraph", version: 2, kind: "graph"},
    ],
    scopes: [
      {id: "root", kind: "graph"},
      {
        id: "nested",
        kind: "subgraph",
        parentScopeId: "root",
        instance: {id: "nested-1", templateId: "subgraph", templateVersion: 2, localId: "root"},
      },
    ],
    groups: [{id: "math", scopeId: "nested"}],
    frames: [{id: "frame", scopeId: "nested", groupId: "math"}],
    nodes: [
      {
        id: "source",
        scopeId: "nested",
        groupId: "math",
        frameId: "frame",
        instance: {id: "math-1", templateId: "math-node", templateVersion: 1, localId: "source"},
        parameters: [sourceValue],
        sockets: [{id: "out", direction: "bidirectional", parameterId: "value", valueType: numberType}],
      },
      {
        id: "target",
        scopeId: "nested",
        groupId: "math",
        frameId: "frame",
        instance: {id: "math-1", templateId: "math-node", templateVersion: 1, localId: "target"},
        parameters: [targetValue],
        sockets: [{id: "in", direction: "bidirectional", parameterId: "value", valueType: numberType}],
      },
    ],
    links: [{
      id: "value",
      from: {nodeId: "source", socketId: "out"},
      to: {nodeId: "target", socketId: "in"},
    }],
  }
}

describe("general-purpose NodeTree foundation", () => {
  test("materializes stable node and graph instances without cloning Parameter stores", () => {
    const nodeTemplate = {id: "node", version: 3, kind: "node"} as const
    const graphTemplate = {id: "graph", version: 2, kind: "graph"} as const
    const parameter = new Parameter("value", 1)
    const node = instantiateNodeTemplate(nodeTemplate, {id: "instance", localId: "source"}, {
      id: "source",
      parameters: [parameter],
    })
    const scope = instantiateGraphTemplate(graphTemplate, {id: "nested", localId: "root"}, {
      id: "nested",
      parentScopeId: "root",
    })

    expect(node.parameters?.[0]).toBe(parameter)
    expect(node.instance).toEqual({id: "instance", templateId: "node", templateVersion: 3, localId: "source"})
    expect(scope).toEqual({
      id: "nested",
      kind: "subgraph",
      parentScopeId: "root",
      instance: {id: "nested", templateId: "graph", templateVersion: 2, localId: "root"},
    })
  })

  test("owns typed nested scopes, groups, frames and template instance identity", () => {
    const tree = createNodeTree(foundationDefinition(), {cyclePolicy: "acyclic"})
    const document = tree.document()

    expect(document.formatVersion).toBe(2)
    expect(document.scopes?.order).toEqual(["root", "nested"])
    expect(document.groups?.byId.math).toEqual({scopeId: "nested"})
    expect(document.templates?.byId["math-node"]).toEqual({version: 1, kind: "node"})
    expect(document.nodes.byId.source?.instance).toEqual({
      id: "math-1",
      templateId: "math-node",
      templateVersion: 1,
      localId: "source",
    })
    expect(document.nodes.byId.source?.parameters.byId.value?.valueType).toEqual(numberType)
    expect(document.nodes.byId.source?.sockets.byId.out?.valueType).toEqual(numberType)
    expect(JSON.parse(JSON.stringify(document))).toEqual(document)
  })

  test("fails closed for unknown hierarchy, template identity and duplicate instance locals", () => {
    const definition = foundationDefinition()
    expect(() => new NodeTree(definition)).toThrow("createNodeTree")
    expect(() => createNodeTree({...definition, scopes: [{id: "nested", kind: "subgraph"}]}))
      .toThrow("requires a parent")
    expect(() => createNodeTree({...definition, groups: [{id: "bad", scopeId: "missing"}]}))
      .toThrow("Unknown Graph Scope")
    expect(() => createNodeTree({
      ...definition,
      nodes: definition.nodes.map((node) => ({
        ...node,
        instance: {id: "same", templateId: "math-node", templateVersion: 1, localId: "same"},
      })),
    })).toThrow("Duplicate Node instance local identity")
    expect(() => createNodeTree({
      ...definition,
      nodes: [{...definition.nodes[0]!, instance: {
        id: "bad",
        templateId: "missing",
        templateVersion: 1,
        localId: "source",
      }}],
      links: [],
    })).toThrow("Unknown Template")
  })

  test("does not accept a caller-forged constructor validation policy", () => {
    const definition = {
      scopes: [{id: "nested", kind: "subgraph" as const}],
      nodes: [],
    }
    const ForgeableNodeTree = NodeTree as unknown as new (
      definition: NodeTreeDefinition,
      options: unknown,
    ) => NodeTree
    expect(() => new ForgeableNodeTree(definition, {validation: {validate() {}}}))
      .toThrow("createNodeTree")
  })

  test("validates Parameter/Socket types and directed cycle policy before commit", () => {
    const definition = foundationDefinition()
    expect(() => createNodeTree({
      ...definition,
      nodes: definition.nodes.map((node, index) => index === 0 ? {
        ...node,
        sockets: [{id: "out", direction: "output", parameterId: "value", valueType: {id: "text", version: 1}}],
      } : node),
    })).toThrow("Parameter and Socket value types must match")

    const tree = createNodeTree(definition, {cyclePolicy: "acyclic"})
    const before = tree.document()
    expect(() => tree.reconcile({
      expectedRevision: 0,
      definition: {
        ...tree.definition(),
        links: [
          ...tree.links,
          {id: "cycle", from: {nodeId: "target", socketId: "in"}, to: {nodeId: "source", socketId: "out"}},
        ],
      },
    })).toThrow()
    expect(tree.document()).toEqual(before)
    expect(tree.revision).toBe(0)

    const integer = Object.freeze({id: "integer", version: 1})
    const numeric = Object.freeze({id: "number", version: 1})
    const convertible: NodeTreeDefinition<Parameter<number, null>> = {
      nodes: [
        {
          id: "integer-source",
          parameters: [new Parameter("value", 1, null, integer)],
          sockets: [{id: "out", direction: "output", parameterId: "value", valueType: integer}],
        },
        {
          id: "number-target",
          parameters: [new Parameter("value", 0, null, numeric)],
          sockets: [{id: "in", direction: "input", parameterId: "value", valueType: numeric}],
        },
      ],
      links: [{
        id: "convert",
        from: {nodeId: "integer-source", socketId: "out"},
        to: {nodeId: "number-target", socketId: "in"},
      }],
    }
    expect(() => createNodeTree(convertible)).toThrow("Incompatible Socket value types")
    expect(createNodeTree(convertible, {
      compatibleSocketTypes: (source, target) => source.id === "integer" && target.id === "number",
    }).links).toHaveLength(1)
    expect(() => createNodeTree({
      nodes: [{id: "invalid-value", parameters: [new Parameter("value", "not-a-number", null, numberType)]}],
    }, {
      validateParameterValue: (valueType, value) => valueType.id !== "number" || typeof value === "number",
    })).toThrow("does not satisfy its value type")
  })

  test("validates a deep acyclic graph iteratively without call-stack recursion", () => {
    const size = 4_096
    const nodes = Array.from({length: size}, (_, index) => ({
      id: `node-${index}`,
      sockets: [{id: "io", direction: "bidirectional" as const}],
    }))
    const links = Array.from({length: size - 1}, (_, index) => ({
      id: `link-${index}`,
      from: {nodeId: `node-${index}`, socketId: "io"},
      to: {nodeId: `node-${index + 1}`, socketId: "io"},
    }))

    expect(createNodeTree({nodes, links}, {cyclePolicy: "acyclic"}).links).toHaveLength(size - 1)
  })

  test("publishes detailed deltas and a useSyncExternalStore-compatible cached snapshot", () => {
    const tree = createNodeTree(foundationDefinition())
    const deltas: NodeTreeDelta[] = []
    let storeNotifications = 0
    let topologyNotifications = 0
    let parameterNotifications = 0
    const store = createNodeTreeExternalStore(tree)
    tree.subscribeDelta((delta) => deltas.push(delta))
    store.subscribe(() => { storeNotifications += 1 })
    store.subscribeTopology(() => { topologyNotifications += 1 })

    const initial = store.getSnapshot()
    const initialTopology = store.getTopologySnapshot()
    const parameterStore = store.parameter("source", "value")
    parameterStore.subscribe(() => { parameterNotifications += 1 })
    const initialParameter = parameterStore.getSnapshot()
    expect(store.parameter("source", "value")).toBe(parameterStore)
    expect(store.getSnapshot()).toBe(initial)
    tree.parameter("source", "value").set(2)
    const valueSnapshot = store.getSnapshot()
    expect(valueSnapshot).not.toBe(initial)
    expect(store.getSnapshot()).toBe(valueSnapshot)
    expect(store.getTopologySnapshot()).toBe(initialTopology)
    expect(parameterStore.getSnapshot()).not.toBe(initialParameter)
    expect(parameterStore.getSnapshot()).toMatchObject({value: 2, revision: 1})
    expect(parameterNotifications).toBe(1)
    expect(topologyNotifications).toBe(0)
    expect(deltas[0]).toMatchObject({kind: "parameter", nodeId: "source", parameterId: "value"})

    const definition = tree.definition()
    tree.reconcile({
      expectedRevision: tree.revision,
      definition: {
        ...definition,
        groups: [{id: "math", scopeId: "nested", metadata: {collapsed: false}}],
        nodes: [...definition.nodes, {id: "observer", scopeId: "nested", groupId: "math"}],
      },
    })
    expect(deltas[1]).toEqual({
      kind: "topology",
      revision: 2,
      topologyRevision: 1,
      added: [{kind: "node", id: "observer"}],
      removed: [],
      updated: [{kind: "group", id: "math"}],
    })
    expect(storeNotifications).toBe(2)
    expect(topologyNotifications).toBe(1)
    expect(store.getTopologySnapshot()).not.toBe(initialTopology)
  })

  test("appends one validated Node with exact nested delta and canonical Parameter identity", () => {
    const tree = createNodeTree(foundationDefinition(), {cyclePolicy: "acyclic"})
    const parameter = new Parameter<number>("value", 3, null, numberType)
    const deltas: NodeTreeDelta[] = []
    const store = createNodeTreeExternalStore(tree)
    const topology = store.getTopologySnapshot()
    tree.subscribeDelta(delta => deltas.push(delta))

    expect(appendNode(tree, {
      expectedRevision: 0,
      node: {
        id: "observer",
        scopeId: "nested",
        groupId: "math",
        frameId: "frame",
        instance: {id: "math-1", templateId: "math-node", templateVersion: 1, localId: "observer"},
        parameters: [parameter],
        sockets: [{id: "in", direction: "input", parameterId: "value", valueType: numberType}],
        metadata: {title: "Observer"},
      },
    })).toEqual({changed: true, revision: 1, topologyRevision: 1})
    expect(tree.nodes.map(node => node.id)).toEqual(["source", "target", "observer"])
    expect(tree.parameter("observer", "value")).toBe(parameter)
    expect(store.getTopologySnapshot().nodes[0]).toBe(topology.nodes[0])
    expect(store.getTopologySnapshot().nodes[2]?.parameters[0]).toMatchObject({value: 3})
    expect(deltas).toEqual([{
      kind: "topology",
      revision: 1,
      topologyRevision: 1,
      added: [
        {kind: "node", id: "observer"},
        {kind: "parameter", nodeId: "observer", id: "value"},
        {kind: "socket", nodeId: "observer", id: "in"},
      ],
      removed: [],
      updated: [],
    }])
    parameter.set(4)
    expect(tree.revision).toBe(2)
  })

  test("rejects invalid append candidates and rolls back prepared observation", () => {
    class FailingParameter extends Parameter<number> {
      override subscribe(): () => void {
        throw new Error("append subscription failed")
      }
    }
    const tree = createNodeTree(foundationDefinition())
    const before = tree.definition()
    expect(() => appendNode(tree, {expectedRevision: 0, node: {id: "source"}}))
      .toThrow("Duplicate Node id")
    expect(() => appendNode(tree, {expectedRevision: 0, node: {
      id: "bad-frame",
      frameId: "missing",
    }})).toThrow("Unknown Node Frame")
    expect(() => appendNode(tree, {expectedRevision: 0, node: {
      id: "shared",
      parameters: [tree.parameter("source", "value")],
    }})).toThrow("shared by multiple Nodes")
    expect(() => appendNode(tree, {expectedRevision: 0, node: {
      id: "duplicate-instance",
      instance: {id: "math-1", templateId: "math-node", templateVersion: 1, localId: "source"},
    }})).toThrow("Duplicate Node instance local identity")
    expect(() => appendNode(tree, {expectedRevision: 0, node: {
      id: "subscription",
      parameters: [new FailingParameter("value", 1)],
    }})).toThrow("append subscription failed")
    expect(tree.definition()).toEqual(before)
    expect(tree.revision).toBe(0)
    expect(tree.topologyRevision).toBe(0)
  })

  test("rolls back append observation when subscription reentrancy changes the expected revision", () => {
    const tree = createNodeTree(foundationDefinition())
    class ReentrantParameter extends Parameter<number> {
      cleanups = 0

      override subscribe(listener: () => void): () => void {
        const unsubscribe = super.subscribe(listener)
        tree.parameter("source", "value").set(2)
        return () => {
          this.cleanups += 1
          unsubscribe()
        }
      }
    }
    const parameter = new ReentrantParameter("value", 1)
    expect(() => appendNode(tree, {
      expectedRevision: 0,
      node: {id: "reentrant", parameters: [parameter]},
    })).toThrow("expected 0, current 1")
    expect(tree.nodes.some(node => node.id === "reentrant")).toBeFalse()
    expect(parameter.cleanups).toBe(1)
    expect(tree.revision).toBe(1)
    expect(tree.topologyRevision).toBe(0)
  })

  test("notifies every topology-store listener before reporting an append listener failure", () => {
    const tree = createNodeTree(foundationDefinition())
    const store = createNodeTreeExternalStore(tree)
    let observed = 0
    store.subscribeTopology(() => { throw new Error("topology store failed") })
    store.subscribeTopology(() => { observed += 1 })

    expect(() => appendNode(tree, {expectedRevision: 0, node: {id: "committed"}}))
      .toThrow("NodeTree topology listener failure")
    expect(observed).toBe(1)
    expect(tree.nodes.some(node => node.id === "committed")).toBeTrue()
    expect(store.getTopologySnapshot().nodes.some(node => node.id === "committed")).toBeTrue()
  })

  test("addresses Template versions and nested Parameter/Socket topology canonically", () => {
    const value = new Parameter("value", 1)
    const gain = new Parameter("gain", 0)
    const delta = diffNodeTreeDefinitions({
      templates: [{id: "node", version: 1, kind: "node"}],
      nodes: [{id: "node", parameters: [value], sockets: []}],
    }, {
      templates: [{id: "node", version: 2, kind: "node"}],
      nodes: [{
        id: "node",
        parameters: [value, gain],
        sockets: [{id: "gain", direction: "input", parameterId: "gain"}],
      }],
    }, 1, 1)

    expect(delta.updated).toContainEqual({kind: "template", id: "node"})
    expect(delta.added).toContainEqual({kind: "parameter", nodeId: "node", id: "gain"})
    expect(delta.added).toContainEqual({kind: "socket", nodeId: "node", id: "gain"})
    expect(delta.added).not.toContainEqual({kind: "template", id: "node@2"})
  })

  test("includes nested Parameter and Socket addresses when their owning Node enters or leaves", () => {
    const value = new Parameter("value", 1)
    const node = {
      id: "node",
      parameters: [value],
      sockets: [{id: "value", direction: "bidirectional" as const, parameterId: "value"}],
    }
    const added = diffNodeTreeDefinitions({nodes: []}, {nodes: [node]}, 1, 1)
    const removed = diffNodeTreeDefinitions({nodes: [node]}, {nodes: []}, 2, 2)

    expect(added.added).toEqual([
      {kind: "node", id: "node"},
      {kind: "parameter", nodeId: "node", id: "value"},
      {kind: "socket", nodeId: "node", id: "value"},
    ])
    expect(removed.removed).toEqual([
      {kind: "node", id: "node"},
      {kind: "parameter", nodeId: "node", id: "value"},
      {kind: "socket", nodeId: "node", id: "value"},
    ])
  })

  test("publishes change and delta pairs in revision order under cross-channel reentrancy", () => {
    const value = new Parameter<number>("value", 0)
    const tree = createNodeTree({nodes: [{id: "source", parameters: [value]}]})
    const order: string[] = []
    tree.subscribeDelta((delta) => {
      order.push(`delta:${delta.kind}:${delta.revision}`)
      if (delta.kind === "topology") value.set(1)
    })
    tree.subscribe((change) => order.push(`change:${change.kind}:${change.revision}`))

    tree.reconcile({
      expectedRevision: 0,
      definition: {nodes: [{id: "source", parameters: [value]}, {id: "target"}]},
    })
    expect(order).toEqual([
      "delta:topology:1",
      "change:topology:1",
      "delta:parameter:2",
      "change:parameter:2",
    ])
  })

  test("keeps the same publication order when reentrancy starts in the change channel", () => {
    const value = new Parameter<number>("value", 0)
    const tree = createNodeTree({nodes: [{id: "source", parameters: [value]}]})
    const order: string[] = []
    tree.subscribeDelta((delta) => order.push(`delta:${delta.kind}:${delta.revision}`))
    tree.subscribe((change) => {
      order.push(`change:${change.kind}:${change.revision}`)
      if (change.kind === "topology") value.set(1)
    })

    tree.reconcile({
      expectedRevision: 0,
      definition: {nodes: [{id: "source", parameters: [value]}, {id: "target"}]},
    })
    expect(order).toEqual([
      "delta:topology:1",
      "change:topology:1",
      "delta:parameter:2",
      "change:parameter:2",
    ])
  })

  test("does not subscribe new Parameters when internal delta preparation fails", () => {
    class CountingParameter extends Parameter<number> {
      subscriptions = 0
      cleanups = 0

      override subscribe(listener: () => void): () => void {
        this.subscriptions += 1
        const unsubscribe = super.subscribe(listener)
        return () => {
          this.cleanups += 1
          unsubscribe()
        }
      }
    }
    const initial: NodeTreeDefinition = {nodes: []}
    stageNodeTreePolicy(initial, Object.freeze({
      validate() {},
      same: () => false,
      delta() { throw new Error("delta failed") },
    }))
    const tree = new NodeTree(initial)
    const parameter = new CountingParameter("value", 0)

    expect(() => tree.reconcile({
      expectedRevision: 0,
      definition: {nodes: [{id: "node", parameters: [parameter]}]},
    })).toThrow("delta failed")
    expect(parameter.subscriptions).toBe(0)
    expect(parameter.cleanups).toBe(0)
    expect(tree.revision).toBe(0)
  })

  test("retains the runtime value validator on the canonical Parameter only", () => {
    const validate = (valueType: typeof numberType, value: unknown) =>
      valueType.id !== "number" || typeof value === "number"
    const parameter = createValidatedParameter<number>("value", 1, null, numberType, validate)
    const tree = createNodeTree({nodes: [{id: "node", parameters: [parameter]}]}, {
      validateParameterValue: validate,
    })

    expect(() => parameter.set("invalid" as never)).toThrow("does not satisfy its value type")
    expect(parameter.value).toBe(1)
    expect(tree.revision).toBe(0)
    expect(parameter.set(2)).toBeTrue()
    expect(tree.revision).toBe(1)
    const hydrated = hydrateNodeTree(tree.document(), {validateParameterValue: validate})
    expect(() => hydrated.parameter("node", "value").set("hydrated-invalid"))
      .toThrow("does not satisfy its value type")
    tree.dispose()
    expect(() => parameter.set("external" as never)).toThrow("does not satisfy its value type")
  })

  test("keeps structurally equal metadata a no-op independent of object key order", () => {
    const definition = foundationDefinition()
    const tree = createNodeTree({
      ...definition,
      groups: [{id: "math", scopeId: "nested", metadata: {alpha: 1, beta: 2}}],
    })
    const deltas: NodeTreeDelta[] = []
    tree.subscribeDelta((delta) => deltas.push(delta))

    expect(tree.reconcile({
      expectedRevision: 0,
      definition: {
        ...tree.definition(),
        groups: [{id: "math", scopeId: "nested", metadata: {beta: 2, alpha: 1}}],
      },
    })).toEqual({changed: false, revision: 0, topologyRevision: 0})
    expect(deltas).toEqual([])
  })

  test("round-trips the exact versioned document and rejects unknown versions", () => {
    const source = createNodeTree(foundationDefinition(), {cyclePolicy: "acyclic"})
    const serialized = serializeNodeTreeDocument(source.document())
    const hydrated = hydrateNodeTree(serialized, {cyclePolicy: "acyclic"})

    expect(serialized).not.toContain("FoundationNodeTree")
    expect(hydrated.document()).toEqual(source.document())
    expect(hydrated.parameter("source", "value")).not.toBe(source.parameter("source", "value"))
    expect(hydrated.parameter("source", "value").value).toBe(1)
    expect(appendNode(hydrated, {
      expectedRevision: 0,
      node: {id: "hydrated-additive"},
    })).toEqual({changed: true, revision: 1, topologyRevision: 1})
    expect(hydrated.document().formatVersion).toBe(2)
    expect(() => hydrateNodeTree({...source.document(), formatVersion: 3} as never))
      .toThrow("expected 1 or 2")
    expect(() => hydrateNodeTree("{bad json"))
      .toThrow("must be valid JSON")
  })

  test("rejects malformed and unknown persisted entity members without normalization", () => {
    const ordered = (order: readonly string[], byId: Record<string, unknown>) => ({order, byId})
    const base = {
      formatVersion: 1,
      frames: ordered([], {}),
      nodes: ordered([], {}),
      links: ordered([], {}),
    } as const
    expect(() => hydrateNodeTree({
      ...base,
      frames: ordered(["frame"], {frame: 42}),
    } as never)).toThrow("Frame frame must be an object")
    expect(() => hydrateNodeTree({
      ...base,
      frames: ordered(["frame"], {frame: {futureField: true}}),
    } as never)).toThrow("unknown member")
    expect(() => hydrateNodeTree({
      ...base,
      scopes: ordered(["root"], {root: {kind: "graph"}}),
    } as never)).toThrow("unknown member")

    const deepMetadata: Record<string, unknown> = {}
    let cursor = deepMetadata
    for (let depth = 0; depth < 20_000; depth += 1) {
      const next: Record<string, unknown> = {}
      cursor["next"] = next
      cursor = next
    }
    expect(() => hydrateNodeTree({
      ...base,
      frames: ordered(["frame"], {frame: {metadata: deepMetadata}}),
    } as never)).toThrow("exceeds JSON depth")
  })

  test("deeply owns instance descriptors while retaining exact Parameter stores", () => {
    const template = {id: "node", version: 1, kind: "node"} as const
    const parameter = new Parameter("value", 1)
    const parameters = [parameter]
    const metadata = {nested: {label: "owned"}}
    const socketMetadata = {color: "blue"}
    const sockets = [{
      id: "out",
      direction: "output" as const,
      metadata: socketMetadata,
    }]
    const node = instantiateNodeTemplate(template, {id: "instance", localId: "node"}, {
      id: "node",
      parameters,
      sockets,
      metadata,
    })
    parameters.length = 0
    metadata.nested.label = "mutated"
    socketMetadata.color = "red"

    expect(node.parameters).toEqual([parameter])
    expect(node.parameters?.[0]).toBe(parameter)
    expect(node.metadata).toEqual({nested: {label: "owned"}})
    expect(node.sockets?.[0]?.metadata).toEqual({color: "blue"})
    expect(Object.isFrozen(node.parameters)).toBeTrue()
    expect(Object.isFrozen(node.metadata)).toBeTrue()
    expect(Object.isFrozen((node.metadata as {nested: object}).nested)).toBeTrue()
  })

  test("validates deep Frame, Scope and Group ancestry in linear iterative work", () => {
    const size = 12_000
    const frames = Array.from({length: size}, (_, index) => ({
      id: `frame-${index}`,
      ...(index === 0 ? {} : {parentFrameId: `frame-${index - 1}`}),
    }))
    const scopes = Array.from({length: size}, (_, index) => ({
      id: `scope-${index}`,
      kind: index === 0 ? "graph" as const : "subgraph" as const,
      ...(index === 0 ? {} : {parentScopeId: `scope-${index - 1}`}),
    }))
    const groups = Array.from({length: size}, (_, index) => ({
      id: `group-${index}`,
      scopeId: "scope-0",
      ...(index === 0 ? {} : {parentGroupId: `group-${index - 1}`}),
    }))
    const tree = createNodeTree({frames, scopes, groups, nodes: []})
    expect(tree.frames).toHaveLength(size)
    expect(tree.scopes).toHaveLength(size)
    expect(tree.groups).toHaveLength(size)
  })
})
