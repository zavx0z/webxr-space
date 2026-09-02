import {describe, expect, test} from "bun:test"
import {NodeTree, type NodeTreeDelta} from "@nodes/core/node-tree"
import {createNodeTree} from "@nodes/core"
import {applyJsonPatch} from "@nodes/core/json-patch"
import {Parameter, type NodeJsonValue} from "@nodes/core/parameter"
import {NodeTreeEditor, NodeTreeEditorError} from "./node-tree-editor.ts"

describe("NodeTreeEditor structural batch", () => {
  test("commits several topology operations through one reconcile and preserves foundation metadata", () => {
    const tree = createNodeTree({
      templates: [{id: "node", version: 1, kind: "node"}],
      scopes: [{id: "root", kind: "graph"}],
      groups: [{id: "group", scopeId: "root"}],
      nodes: [{
        id: "source",
        scopeId: "root",
        groupId: "group",
        instance: {id: "instance", templateId: "node", templateVersion: 1, localId: "source"},
        parameters: [new Parameter("value", 1)],
        sockets: [{id: "out", direction: "output"}],
      }],
    })
    const editor = new NodeTreeEditor(tree)
    const deltas: NodeTreeDelta[] = []
    tree.subscribeDelta((delta) => deltas.push(delta))
    const target = {
      scopeId: "root",
      groupId: "group",
      instance: {id: "instance", templateId: "node", templateVersion: 1, localId: "target"},
      parameters: {order: [], byId: {}},
      sockets: {order: ["in"], byId: {in: {direction: "input"}}},
    } as const
    const link = {
      from: {nodeId: "source", socketId: "out"},
      to: {nodeId: "target", socketId: "in"},
    } as const

    const transaction = editor.transact({
      expectedRevision: 0,
      forward: [
        {op: "add", path: "/nodes/byId/target", value: target},
        {op: "add", path: "/nodes/order/-", value: "target"},
        {op: "add", path: "/links/byId/value", value: link},
        {op: "add", path: "/links/order/-", value: "value"},
      ],
      inverse: [
        {op: "remove", path: "/links/order/0"},
        {op: "remove", path: "/links/byId/value"},
        {op: "remove", path: "/nodes/order/1"},
        {op: "remove", path: "/nodes/byId/target"},
      ],
    })

    expect(transaction.result).toEqual({changed: true, revision: 1, topologyRevision: 1})
    expect(tree.nodes.map(({id}) => id)).toEqual(["source", "target"])
    expect(tree.links.map(({id}) => id)).toEqual(["value"])
    expect(tree.document().scopes?.order).toEqual(["root"])
    expect(tree.document().templates?.order).toEqual(["node"])
    expect(deltas).toHaveLength(1)
    expect(deltas[0]).toMatchObject({
      kind: "topology",
      added: [
        {kind: "node", id: "target"},
        {kind: "link", id: "value"},
        {kind: "socket", nodeId: "target", id: "in"},
      ],
    })
  })

  test("rejects a non-reversible batch before the canonical tree changes", () => {
    const tree = new NodeTree<Parameter<NodeJsonValue, NodeJsonValue>>({nodes: [{id: "source"}]})
    const editor = new NodeTreeEditor(tree)
    const before = tree.document()

    expect(() => editor.transact({
      expectedRevision: 0,
      forward: [{op: "add", path: "/nodes/order/-", value: "ghost"}],
      inverse: [],
    })).toThrow(NodeTreeEditorError)
    expect(tree.document()).toEqual(before)
    expect(tree.revision).toBe(0)
  })

  test("returns a canonical inverse across automatic document v1/v2 transitions", () => {
    const tree = createNodeTree<Parameter<NodeJsonValue, NodeJsonValue>>({nodes: []})
    const editor = new NodeTreeEditor(tree)
    const source = tree.document()

    const transaction = editor.transact({
      expectedRevision: 0,
      forward: [{
        op: "add",
        path: "/scopes",
        value: {order: ["root"], byId: {root: {kind: "graph"}}},
      }],
      inverse: [{op: "remove", path: "/scopes"}],
    })
    const committed = tree.document()
    const restored = applyJsonPatch(committed as never, transaction.inverse)

    expect(source.formatVersion).toBe(1)
    expect(committed.formatVersion).toBe(2)
    expect(transaction.forward).toContainEqual({op: "replace", path: "/formatVersion", value: 2})
    expect(transaction.inverse).toContainEqual({op: "replace", path: "/formatVersion", value: 1})
    expect(applyJsonPatch(source as never, transaction.forward)).toEqual(committed)
    expect(restored).toEqual(source)
  })

  test("removes empty optional foundation collections and returns exact v2/v1 evidence", () => {
    const tree = createNodeTree<Parameter<NodeJsonValue, NodeJsonValue>>({
      scopes: [{id: "root", kind: "graph"}],
      nodes: [],
    })
    const editor = new NodeTreeEditor(tree)
    const source = tree.document()

    const transaction = editor.transact({
      expectedRevision: 0,
      forward: [
        {op: "remove", path: "/scopes/order/0"},
        {op: "remove", path: "/scopes/byId/root"},
      ],
      inverse: [
        {op: "add", path: "/scopes/byId/root", value: {kind: "graph"}},
        {op: "add", path: "/scopes/order/0", value: "root"},
      ],
    })
    const committed = tree.document()

    expect(committed.formatVersion).toBe(1)
    expect("scopes" in committed).toBeFalse()
    expect(applyJsonPatch(source as never, transaction.forward)).toEqual(committed)
    expect(applyJsonPatch(committed as never, transaction.inverse)).toEqual(source)
    expect(transaction.forward).toContainEqual({op: "remove", path: "/scopes"})
    expect(transaction.inverse).toContainEqual({
      op: "add",
      path: "/scopes",
      value: {order: [], byId: {}},
    })
  })

  test("canonicalizes a redundant empty foundation collection without false commit evidence", () => {
    const tree = createNodeTree<Parameter<NodeJsonValue, NodeJsonValue>>({nodes: []})
    const editor = new NodeTreeEditor(tree)
    const source = tree.document()
    const transaction = editor.transact({
      expectedRevision: 0,
      forward: [{op: "add", path: "/scopes", value: {order: [], byId: {}}}],
      inverse: [{op: "remove", path: "/scopes"}],
    })

    expect(transaction.result).toEqual({changed: false, revision: 0, topologyRevision: 0})
    expect(applyJsonPatch(source as never, transaction.forward)).toEqual(tree.document())
    expect(applyJsonPatch(tree.document() as never, transaction.inverse)).toEqual(source)
  })

  test("rejects an explicit unknown or mismatched document version instead of normalizing it", () => {
    const tree = createNodeTree<Parameter<NodeJsonValue, NodeJsonValue>>({nodes: []})
    const editor = new NodeTreeEditor(tree)

    expect(() => editor.transact({
      expectedRevision: 0,
      forward: [{op: "replace", path: "/formatVersion", value: 99}],
      inverse: [{op: "replace", path: "/formatVersion", value: 1}],
    })).toThrow("invalid formatVersion")
    expect(() => editor.transact({
      expectedRevision: 0,
      forward: [
        {op: "replace", path: "/formatVersion", value: 1},
        {op: "add", path: "/scopes", value: {order: ["root"], byId: {root: {kind: "graph"}}}},
      ],
      inverse: [
        {op: "remove", path: "/scopes"},
        {op: "replace", path: "/formatVersion", value: 1},
      ],
    })).toThrow("does not match")
    expect(tree.revision).toBe(0)
  })

  test("rejects malformed transaction entities before Core canonicalization", () => {
    const tree = new NodeTree<Parameter<NodeJsonValue, NodeJsonValue>>({nodes: []})
    const editor = new NodeTreeEditor(tree)
    expect(() => editor.transact({
      expectedRevision: 0,
      forward: [
        {op: "add", path: "/frames/byId/frame", value: 42},
        {op: "add", path: "/frames/order/-", value: "frame"},
      ],
      inverse: [
        {op: "remove", path: "/frames/order/0"},
        {op: "remove", path: "/frames/byId/frame"},
      ],
    })).toThrow(NodeTreeEditorError)
    expect(tree.revision).toBe(0)
  })
})
