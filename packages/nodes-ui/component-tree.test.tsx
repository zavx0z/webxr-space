import {describe, expect, test} from "bun:test"
import {
  Parameter,
  createNodeTree,
  createNodeTreeExternalStore,
  type NodeJsonValue,
} from "@nodes/core"
import {NodeTreeEditor} from "@nodes/editor"
import type {LayoutResult} from "@nodes/layout/types"
import {
  WheelEvent,
  createDocument,
  type MutationBatch,
  type StateChangeBatch,
} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {Frame} from "./frame.tsx"
import {appendNodeGeometryIndex, createNodeGeometryIndex} from "./geometry.ts"
import {Node} from "./node.tsx"
import {NodeEditor} from "./node-editor.tsx"
import {NodeTree} from "./node-tree.tsx"
import {NumberParameter} from "./parameter-presentations.tsx"

describe("one compiled Node component tree", () => {
  test("fails closed before rendering when owner Layout geometry is missing or incomplete", () => {
    const tree = createNodeTree({nodes: [Object.freeze({id: "node"})], links: []})
    const document = createDocument()
    const host = document.createElement("main")
    const root = createRoot(host)
    const missingNodeLayout: LayoutResult = Object.freeze({
      direction: "RIGHT",
      bounds: Object.freeze({x: 0, y: 0, width: 1, height: 1}),
      nodes: Object.freeze([]),
      ports: Object.freeze([]),
      edges: Object.freeze([]),
    })
    expect(() => root.render(<NodeTree
      store={createNodeTreeExternalStore(tree)}
      layout={missingNodeLayout}
    />)).toThrow("Layout Node geometry is missing: node")
    expect(host.querySelector('[data-node-tree]')).toBeNull()
    tree.dispose()

    const fixture = createFixture()
    const snapshot = fixture.tree.getSnapshot()
    expect(() => createNodeGeometryIndex(
      snapshot.nodes,
      snapshot.frames,
      snapshot.links,
      Object.freeze({
        ...fixture.layout,
        nodes: Object.freeze(fixture.layout.nodes.filter(node => node.id !== "outer")),
      }),
    )).toThrow("Layout Node geometry is missing: outer")
    expect(() => createNodeGeometryIndex(
      snapshot.nodes,
      snapshot.frames,
      snapshot.links,
      Object.freeze({...fixture.layout, ports: Object.freeze([])}),
    )).toThrow("Layout Port geometry is missing: source/value-output")
    expect(() => createNodeGeometryIndex(
      snapshot.nodes,
      snapshot.frames,
      snapshot.links,
      Object.freeze({...fixture.layout, edges: Object.freeze([])}),
    )).toThrow("Layout Edge geometry is missing: value-link")
    expect(() => createNodeGeometryIndex(
      snapshot.nodes,
      snapshot.frames,
      snapshot.links,
      Object.freeze({
        ...fixture.layout,
        edges: Object.freeze([Object.freeze({
          id: "value-link",
          sections: Object.freeze([Object.freeze({
            startPoint: Object.freeze({x: 0, y: 0}),
            bendPoints: Object.freeze([]),
            endPoint: Object.freeze({x: 430, y: 232}),
          })] as const),
        })]),
      }),
    )).toThrow("Layout Edge value-link source must equal its exact Layout Port center")
    fixture.dispose()
  })

  test("allows consumer Components to author Frame -> Node -> concrete Parameter composition", () => {
    const document = createDocument()
    const host = document.createElement("main")
    const root = createRoot(host)
    root.render(<Frame
      id="authored-frame"
      label="Authored Frame"
      rect={Object.freeze({x: 0, y: 0, width: 360, height: 240})}
    >
      <AuthoredNode />
    </Frame>)
    expect(host.querySelector('[data-frame-id="authored-frame"]')?.ownerDocument).toBe(document)
    expect(host.querySelector('[data-node-id="authored-node"]')).not.toBeNull()
    expect(host.querySelector('[data-parameter-id="authored-value"]')?.getAttribute("data-field-kind")).toBe("number")
    expect(host.querySelector('[data-socket-id="authored-output"]')).not.toBeNull()
    root.unmount()
  })

  test("extends exact append geometry without mutating the previously published index", () => {
    const fixture = createFixture()
    const before = fixture.tree.getSnapshot()
    const geometry = createNodeGeometryIndex(before.nodes, before.frames, before.links, fixture.layout)
    const sourceRect = geometry.nodeRects.get("source")
    const sourcePort = geometry.portCenters.get("source\u0000value-output")
    const nodeRectCount = geometry.nodeRects.size
    const portCount = geometry.portCenters.size

    fixture.editor.addNode({
      expectedRevision: fixture.tree.revision,
      node: Object.freeze({
        id: "future",
        frameId: "outer",
        sockets: Object.freeze([Object.freeze({id: "out", direction: "output" as const})]),
      }),
    })
    const appended = fixture.tree.getSnapshot().nodes.at(-1)!
    const next = appendNodeGeometryIndex(geometry, appended)

    expect(next).not.toBe(geometry)
    expect(geometry.nodeRects.size).toBe(nodeRectCount)
    expect(geometry.portCenters.size).toBe(portCount)
    expect(geometry.nodeRects.has("future")).toBeFalse()
    expect(geometry.portCenters.has("future\u0000out")).toBeFalse()
    expect(next.nodeRects.get("source")).toBe(sourceRect)
    expect(next.portCenters.get("source\u0000value-output")).toBe(sourcePort)
    expect(next.nodeRects.get("future")).toEqual({x: 72, y: 310, width: 220, height: 80})
    expect(next.portCenters.get("future\u0000out")).toEqual({x: 292, y: 344})
    expect(next.frameRects).toBe(geometry.frameRects)
    expect(next.linkRoutes).toBe(geometry.linkRoutes)

    const nextNodeKeys = [...next.nodeRects.keys()]
    const nextPortEntries = [...next.portCenters]
    fixture.editor.addNode({
      expectedRevision: fixture.tree.revision,
      node: Object.freeze({
        id: "future-2",
        frameId: "outer",
        sockets: Object.freeze([Object.freeze({id: "out", direction: "output" as const})]),
      }),
    })
    const appendedAgain = fixture.tree.getSnapshot().nodes.at(-1)!
    const repeated = appendNodeGeometryIndex(next, appendedAgain)

    expect(next.nodeRects.size).toBe(nodeRectCount + 1)
    expect(next.portCenters.size).toBe(portCount + 1)
    expect([...next.nodeRects.keys()]).toEqual(nextNodeKeys)
    expect([...next.portCenters]).toEqual(nextPortEntries)
    expect(next.nodeRects.has("future-2")).toBeFalse()
    expect(repeated.nodeRects.size).toBe(nodeRectCount + 2)
    expect(repeated.portCenters.size).toBe(portCount + 2)
    expect([...repeated.nodeRects.keys()]).toEqual([...nextNodeKeys, "future-2"])
    expect(repeated.nodeRects.get("future-2")).toEqual({x: 430, y: 310, width: 220, height: 80})
    expect(repeated.portCenters.get("future-2\u0000out")).toEqual({x: 650, y: 344})
    fixture.dispose()
  })

  test("retains keyed Node identities across repeated appends and every full fallback shape", () => {
    const tree = createNodeTree({nodes: [Object.freeze({id: "node-0"})]})
    const store = createNodeTreeExternalStore(tree)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const mutations: MutationBatch[] = []
    document.subscribeMutations(batch => mutations.push(batch))
    const root = createRoot(host)
    const layout: LayoutResult = Object.freeze({
      direction: "RIGHT",
      bounds: Object.freeze({x: 0, y: 0, width: 960, height: 100}),
      nodes: Object.freeze(Array.from({length: 5}, (_, index) => Object.freeze({
        id: `node-${index}`,
        x: index * 200,
        y: 10,
        width: 160,
        height: 80,
      }))),
      ports: Object.freeze([]),
      edges: Object.freeze([]),
    })
    root.render(<NodeTree store={store} layout={layout} />)
    const retained = required(host.querySelector('[data-node-id="node-0"]'))
    const beforeAppend = root.stats()
    mutations.length = 0

    tree.reconcile({
      expectedRevision: tree.revision,
      definition: {nodes: [...tree.definition().nodes, Object.freeze({id: "node-1"})]},
    })
    const afterAppend = root.stats()
    expect(store.getTopologyUpdate()).toMatchObject({mode: "append-node"})
    expect(host.querySelector('[data-node-id="node-0"]')).toBe(retained)
    expect(host.querySelector('[data-node-id="node-1"]')).not.toBeNull()
    expect(afterAppend.mounts - beforeAppend.mounts).toBeGreaterThan(0)
    expect(afterAppend.moves - beforeAppend.moves).toBe(0)
    expect(afterAppend.disposes - beforeAppend.disposes).toBe(0)
    expect(mutations.flatMap(batch => batch.records).filter(record =>
      record.target === retained || retained.contains(record.target))).toEqual([])

    const nodeOne = required(host.querySelector('[data-node-id="node-1"]'))
    const beforeRepeatedAppend = root.stats()
    mutations.length = 0
    tree.reconcile({
      expectedRevision: tree.revision,
      definition: {nodes: [...tree.definition().nodes, {id: "node-2"}]},
    })
    const afterRepeatedAppend = root.stats()
    expect(store.getTopologyUpdate()).toMatchObject({mode: "append-node"})
    expect(host.querySelector('[data-node-id="node-0"]')).toBe(retained)
    expect(host.querySelector('[data-node-id="node-1"]')).toBe(nodeOne)
    expect(host.querySelector('[data-node-id="node-2"]')).not.toBeNull()
    expect(afterRepeatedAppend.moves - beforeRepeatedAppend.moves).toBe(0)
    expect(afterRepeatedAppend.disposes - beforeRepeatedAppend.disposes).toBe(0)
    expect(mutations.flatMap(batch => batch.records).filter(record =>
      record.target === retained || retained.contains(record.target) ||
      record.target === nodeOne || nodeOne.contains(record.target))).toEqual([])

    const nodeTwo = required(host.querySelector('[data-node-id="node-2"]'))
    tree.reconcile({
      expectedRevision: tree.revision,
      definition: {nodes: [...tree.definition().nodes, {id: "node-3"}, {id: "node-4"}]},
    })
    expect(store.getTopologyUpdate()).toMatchObject({mode: "full"})
    expect(host.querySelector('[data-node-id="node-0"]')).toBe(retained)
    expect(host.querySelector('[data-node-id="node-1"]')).toBe(nodeOne)
    expect(host.querySelector('[data-node-id="node-2"]')).toBe(nodeTwo)

    const identities = new Map([...host.querySelectorAll("article[data-node-id]")].map(node => [
      required(node.getAttribute("data-node-id")),
      node,
    ]))
    const byId = new Map(tree.definition().nodes.map(node => [node.id, node]))
    tree.reconcile({
      expectedRevision: tree.revision,
      definition: {nodes: [
        byId.get("node-4")!,
        byId.get("node-2")!,
        Object.freeze({...byId.get("node-0")!, metadata: Object.freeze({label: "Updated Node"})}),
        byId.get("node-3")!,
        byId.get("node-1")!,
      ]},
    })
    expect(store.getTopologyUpdate()).toMatchObject({mode: "full"})
    for (const [id, node] of identities) {
      expect(host.querySelector(`[data-node-id="${id}"]`)).toBe(node)
    }
    expect(retained.getAttribute("aria-label")).toBe("Updated Node")

    tree.reconcile({
      expectedRevision: tree.revision,
      definition: {nodes: tree.definition().nodes.filter(node => node.id !== "node-3")},
    })
    expect(store.getTopologyUpdate()).toMatchObject({mode: "full"})
    expect(host.querySelector('[data-node-id="node-3"]')).toBeNull()
    for (const [id, node] of identities) {
      if (id !== "node-3") expect(host.querySelector(`[data-node-id="${id}"]`)).toBe(node)
    }

    root.unmount()
    tree.dispose()
  })

  test("projects the exact Core store with nested Frames and retained entity identities", () => {
    const fixture = createFixture()
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const mutations: MutationBatch[] = []
    const stateChanges: StateChangeBatch[] = []
    const unsubscribeMutations = document.subscribeMutations(batch => mutations.push(batch))
    const unsubscribeState = document.subscribeStateChanges(batch => stateChanges.push(batch))
    const root = createRoot(host)
    const input = (change: Readonly<{nodeId: string; parameterId: string; value: NodeJsonValue}>) => {
      fixture.editor.setParameterValue({
        expectedRevision: fixture.tree.revision,
        nodeId: change.nodeId,
        parameterId: change.parameterId,
        value: change.value,
      })
    }
    root.render(<NodeEditor
      store={fixture.store}
      layout={fixture.layout}
      width={760}
      height={480}
      onParameterInput={input}
      onParameterChange={input}
    />)

    const outer = required(host.querySelector('[data-frame-id="outer"]'))
    const inner = required(host.querySelector('[data-frame-id="inner"]'))
    const source = required(host.querySelector('[data-node-id="source"]'))
    const parameter = required(host.querySelector('[data-parameter-id="value"]'))
    const field = required(required(parameter.querySelector("[data-parameter-field]")).firstElementChild)
    const socket = required(host.querySelector('[data-socket-id="value-output"]'))
    const link = required(host.querySelector('[data-link-id="value-link"]'))
    expect(inner.getAttribute("data-parent-frame-id")).toBe("outer")
    expect(source.getAttribute("data-frame-id")).toBe("inner")
    expect(outer.ownerDocument).toBe(inner.ownerDocument)
    expect(link.localName).toBe("vector-path")
    expect(link.childNodes).toEqual([])
    expect(socket.getAttribute("data-socket-side")).toBe("right")
    expect(host.querySelectorAll('[data-node-tree]')).toHaveLength(1)

    mutations.length = 0
    stateChanges.length = 0
    fixture.editor.setParameterValue({
      expectedRevision: fixture.tree.revision,
      nodeId: "source",
      parameterId: "value",
      value: 2.5,
    })

    expect(host.querySelector('[data-node-id="source"]')).toBe(source)
    expect(host.querySelector('[data-parameter-id="value"]')).toBe(parameter)
    expect(required(parameter.querySelector("[data-parameter-field]")).firstElementChild).toBe(field)
    expect(host.querySelector('[data-socket-id="value-output"]')).toBe(socket)
    expect(host.querySelector('[data-link-id="value-link"]')).toBe(link)
    const mutationTargets = mutations.flatMap(batch => batch.records.map(record => record.target))
    const stateTargets = stateChanges.flatMap(batch => batch.records.map(record => record.target))
    expect(mutationTargets.every(target => parameter === target || parameter.contains(target))).toBeTrue()
    expect(stateTargets.every(target => parameter === target || parameter.contains(target))).toBeTrue()

    root.unmount()
    unsubscribeMutations()
    unsubscribeState()
    fixture.dispose()
  })

  test("projects aggregate Socket glyphs onto their exact Layout Port centers", () => {
    const fixture = createFixture()
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    root.render(<NodeTree
      store={fixture.store}
      layout={fixture.layout}
      style={css`
        width: 760px;
        height: 480px;
      `}
    />)
    const renderer = createDocumentRenderer({document, root: host, viewport: {width: 760, height: 480}})
    const frame = renderer.flush()
    const cases = [
      {nodeId: "source", socketId: "value-output", portId: "source/value-output"},
      {nodeId: "target", socketId: "result-input", portId: "target/result-input"},
    ] as const
    for (const entry of cases) {
      const socket = required(host.querySelector(
        `[data-node-id="${entry.nodeId}"][data-socket-id="${entry.socketId}"]`,
      ))
      const glyph = required(socket.querySelector("[data-socket-glyph]"))
      const glyphBox = required(frame.boxByNode.get(glyph) ?? null)
      const port = required(fixture.layout.ports.find(candidate => candidate.id === entry.portId) ?? null)
      const center = Object.freeze({
        x: glyphBox.x + glyphBox.width / 2,
        y: glyphBox.y + glyphBox.height / 2,
      })
      const delta = Object.freeze({
        x: Math.abs(center.x - port.x),
        y: Math.abs(center.y - port.y),
      })
      if (delta.x > 1 || delta.y > 1) {
        const socketBox = required(frame.boxByNode.get(socket) ?? null)
        const endpointBox = required(frame.boxByNode.get(required(socket.parentElement)) ?? null)
        const rect = (box: typeof glyphBox) => Object.freeze({
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
        })
        throw new Error([
          `${entry.portId}:`,
          `glyph=${JSON.stringify(rect(glyphBox))},`,
          `socket=${JSON.stringify(rect(socketBox))},`,
          `endpoint=${JSON.stringify(rect(endpointBox))},`,
          `center=${JSON.stringify(center)},`,
          `port=${JSON.stringify(port)},`,
          `delta=${JSON.stringify(delta)}`,
        ].join(" "))
      }
    }

    renderer.dispose()
    root.unmount()
    fixture.dispose()
  })

  test("pan mutates only shared transforms and retains Node, Parameter, Field, Socket and Link geometry", () => {
    const fixture = createFixture()
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const mutations: MutationBatch[] = []
    document.subscribeMutations(batch => mutations.push(batch))
    const root = createRoot(host)
    root.render(<NodeEditor
      store={fixture.store}
      layout={fixture.layout}
      width={760}
      height={480}
    />)
    const viewport = required(host.querySelector('[data-node-editor-viewport]'))
    const scene = required(host.querySelector('[data-node-tree-scene]'))
    const grid = required(host.querySelector('[data-node-editor-grid]'))
    const source = required(host.querySelector('[data-node-id="source"]'))
    const parameter = required(host.querySelector('[data-parameter-id="value"]'))
    const field = required(required(parameter.querySelector("[data-parameter-field]")).firstElementChild)
    const socket = required(host.querySelector('[data-socket-id="value-output"]'))
    const link = required(host.querySelector('[data-link-id="value-link"]'))
    const d = link.getAttribute("d")
    const renderer = createDocumentRenderer({document, root: host, viewport: {width: 760, height: 480}})
    const beforeFrame = renderer.flush()
    const beforePath = beforeFrame.displayList.find(item => item.kind === "path" && item.node === link)
    mutations.length = 0

    viewport.dispatchEvent(new WheelEvent("wheel", {bubbles: true, deltaX: 18, deltaY: 7}))

    expect(host.querySelector('[data-node-tree-scene]')).toBe(scene)
    expect(host.querySelector('[data-node-editor-grid]')).toBe(grid)
    expect(host.querySelector('[data-node-id="source"]')).toBe(source)
    expect(host.querySelector('[data-parameter-id="value"]')).toBe(parameter)
    expect(required(parameter.querySelector("[data-parameter-field]")).firstElementChild).toBe(field)
    expect(host.querySelector('[data-socket-id="value-output"]')).toBe(socket)
    expect(host.querySelector('[data-link-id="value-link"]')).toBe(link)
    expect(link.getAttribute("d")).toBe(d)
    const afterFrame = renderer.flush()
    const afterPath = afterFrame.displayList.find(item => item.kind === "path" && item.node === link)
    expect(afterPath?.kind).toBe("path")
    expect(beforePath?.kind).toBe("path")
    if (afterPath?.kind !== "path" || beforePath?.kind !== "path") throw new Error("Expected retained Link Path")
    expect(afterPath.geometry).toBe(beforePath.geometry)
    const entityMutations = mutations.flatMap(batch => batch.records).filter(record =>
      record.target === source || source.contains(record.target) ||
      record.target === link || link.contains(record.target))
    expect(entityMutations).toEqual([])

    renderer.dispose()
    root.unmount()
    fixture.dispose()
  })

  test("keeps offscreen Parameter and additive topology updates out of the selected DOM projection", () => {
    const parameters = Array.from({length: 1_000}, (_, index) => new Parameter<NodeJsonValue, NodeJsonValue>(
      "value",
      index,
      Object.freeze({label: "Value"}),
      Object.freeze({id: "float", version: 1}),
    ))
    const tree = createNodeTree({
      nodes: Object.freeze(parameters.map((parameter, index) => Object.freeze({
        id: `node-${index}`,
        parameters: Object.freeze([parameter]),
        metadata: Object.freeze({x: index % 100 * 292, y: Math.floor(index / 100) * 260, width: 260, height: 160}),
      }))),
      links: Object.freeze([]),
    })
    const editor = new NodeTreeEditor(tree)
    const store = createNodeTreeExternalStore(tree)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const mutations: MutationBatch[] = []
    document.subscribeMutations(batch => mutations.push(batch))
    const layout: LayoutResult = Object.freeze({
      direction: "RIGHT",
      bounds: Object.freeze({x: 0, y: 0, width: 29_200, height: 5_260}),
      nodes: Object.freeze([
        ...Array.from({length: 1_000}, (_, index) => Object.freeze({
          id: `node-${index}`,
          x: index % 100 * 292,
          y: Math.floor(index / 100) * 260,
          width: 260,
          height: 160,
        })),
        Object.freeze({id: "node-1000", x: 0, y: 5_000, width: 260, height: 160}),
      ]),
      ports: Object.freeze([]),
      edges: Object.freeze([]),
    })
    root.render(<NodeTree
      store={store}
      layout={layout}
      viewport={Object.freeze({x: 0, y: 0, width: 850, height: 500, overscan: 0})}
    />)
    expect(host.querySelectorAll("article")).toHaveLength(6)
    const stable = required(host.querySelector('[data-node-id="node-0"]'))
    mutations.length = 0
    const before = root.stats()

    editor.setParameterValue({
      expectedRevision: tree.revision,
      nodeId: "node-999",
      parameterId: "value",
      value: 2_000,
    })
    expect(root.stats().renders - before.renders).toBe(0)
    expect(mutations).toEqual([])

    editor.addNode({
      expectedRevision: tree.revision,
      node: Object.freeze({
        id: "node-1000",
        parameters: Object.freeze([Object.freeze({id: "value", value: 1_000, presentation: {label: "Value"}})]),
        metadata: Object.freeze({x: 0, y: 5_000, width: 260, height: 160}),
      }),
    })
    expect(host.querySelector('[data-node-id="node-0"]')).toBe(stable)
    expect(host.querySelector('[data-node-id="node-1000"]')).toBeNull()
    expect(mutations).toEqual([])

    root.unmount()
    editor.dispose()
    tree.dispose()
  })
})

function AuthoredNode() {
  return <Node
    id="authored-node"
    label="Authored Node"
    rect={Object.freeze({x: 40, y: 48, width: 220, height: 100})}
  >
    <AuthoredParameters />
  </Node>
}

function AuthoredParameters() {
  return <section
    aria-label="Authored Parameters"
    style={css`
      display: flex;
      flex-direction: column;
      width: 100%;
      gap: 3px;
    `}
  >
    <NumberParameter
      id="authored-value"
      nodeId="authored-node"
      label="Value"
      value={1}
      step={.1}
      sockets={[Object.freeze({
        id: "authored-output",
        kind: "float",
        direction: "output",
        side: "right",
        label: "Value",
      })]}
    />
  </section>
}

function createFixture() {
  const value = new Parameter<NodeJsonValue, NodeJsonValue>(
    "value",
    1,
    Object.freeze({label: "Value", min: 0, max: 10, step: .1}),
    Object.freeze({id: "float", version: 1}),
  )
  const result = new Parameter<NodeJsonValue, NodeJsonValue>(
    "result",
    1,
    Object.freeze({label: "Result", readOnly: true}),
    Object.freeze({id: "float", version: 1}),
  )
  const tree = createNodeTree<
    Parameter<NodeJsonValue, NodeJsonValue>,
    NodeJsonValue,
    NodeJsonValue,
    NodeJsonValue,
    NodeJsonValue
  >({
    frames: Object.freeze([
      Object.freeze({id: "outer", metadata: Object.freeze({label: "Outer", x: 20, y: 20, width: 680, height: 390})}),
      Object.freeze({id: "inner", parentFrameId: "outer", metadata: Object.freeze({label: "Inner", x: 42, y: 48, width: 300, height: 260})}),
    ]),
    nodes: Object.freeze([
      Object.freeze({
        id: "source",
        frameId: "inner",
        parameters: Object.freeze([value]),
        sockets: Object.freeze([Object.freeze({
          id: "value-output",
          parameterId: "value",
          direction: "output" as const,
          side: "left" as const,
          valueType: Object.freeze({id: "float", version: 1}),
          metadata: Object.freeze({label: "Value"}),
        })]),
        metadata: Object.freeze({label: "Source", x: 72, y: 84, width: 220, height: 100, headerColor: "#506d8a"}),
      }),
      Object.freeze({
        id: "target",
        frameId: "outer",
        parameters: Object.freeze([result]),
        sockets: Object.freeze([Object.freeze({
          id: "result-input",
          parameterId: "result",
          direction: "input" as const,
          side: "left" as const,
          valueType: Object.freeze({id: "float", version: 1}),
          metadata: Object.freeze({label: "Result"}),
        })]),
        metadata: Object.freeze({label: "Target", x: 430, y: 190, width: 220, height: 100, headerColor: "#6b557c"}),
      }),
    ]),
    links: Object.freeze([Object.freeze({
      id: "value-link",
      from: Object.freeze({nodeId: "source", socketId: "value-output"}),
      to: Object.freeze({nodeId: "target", socketId: "result-input"}),
      metadata: Object.freeze({label: "Value → Result"}),
    })]),
  })
  const editor = new NodeTreeEditor(tree)
  return Object.freeze({
    tree,
    editor,
    store: createNodeTreeExternalStore(tree),
    layout: fixtureLayout,
    dispose() {
      editor.dispose()
      tree.dispose()
    },
  })
}

const fixtureLayout: LayoutResult = Object.freeze({
  direction: "RIGHT",
  bounds: Object.freeze({x: 20, y: 20, width: 680, height: 390}),
  nodes: Object.freeze([
    Object.freeze({id: "outer", x: 20, y: 20, width: 680, height: 390}),
    Object.freeze({id: "inner", x: 42, y: 48, width: 300, height: 260}),
    Object.freeze({id: "source", x: 72, y: 84, width: 220, height: 100}),
    Object.freeze({id: "target", x: 430, y: 190, width: 220, height: 100}),
    Object.freeze({id: "future", x: 72, y: 310, width: 220, height: 80}),
    Object.freeze({id: "future-2", x: 430, y: 310, width: 220, height: 80}),
  ]),
  ports: Object.freeze([
    Object.freeze({id: "source/value-output", x: 292, y: 126, side: "EAST"}),
    Object.freeze({id: "target/result-input", x: 430, y: 232, side: "WEST"}),
    Object.freeze({id: "future/out", x: 292, y: 344, side: "EAST"}),
    Object.freeze({id: "future-2/out", x: 650, y: 344, side: "EAST"}),
  ]),
  edges: Object.freeze([Object.freeze({
    id: "value-link",
    sections: Object.freeze([Object.freeze({
      startPoint: Object.freeze({x: 292, y: 126}),
      bendPoints: Object.freeze([
        Object.freeze({x: 361, y: 126}),
        Object.freeze({x: 361, y: 232}),
      ]),
      endPoint: Object.freeze({x: 430, y: 232}),
    })] as const),
  })]),
})

function required<T>(value: T | null): T {
  if (value === null) throw new Error("Required test element is missing")
  return value
}
