import {describe, expect, test} from "bun:test"
import {
  Parameter,
  createNodeTree,
  createNodeTreeExternalStore,
  type NodeJsonValue,
} from "@nodes/core"
import {NodeTreeEditor} from "@nodes/editor"
import {
  WheelEvent,
  createDocument,
  type MutationBatch,
  type StateChangeBatch,
} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {Frame} from "./frame.tsx"
import {Node} from "./node.tsx"
import {NodeEditor} from "./node-editor.tsx"
import {NodeTree} from "./node-tree.tsx"
import {NumberParameter} from "./parameter-presentations.tsx"

describe("one compiled Node component tree", () => {
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

  test("pan mutates only shared transforms and retains Node, Parameter, Field, Socket and Link geometry", () => {
    const fixture = createFixture()
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const mutations: MutationBatch[] = []
    document.subscribeMutations(batch => mutations.push(batch))
    const root = createRoot(host)
    root.render(<NodeEditor store={fixture.store} width={760} height={480} />)
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
    root.render(<NodeTree
      store={store}
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
          side: "right" as const,
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
    dispose() {
      editor.dispose()
      tree.dispose()
    },
  })
}

function required<T>(value: T | null): T {
  if (value === null) throw new Error("Required test element is missing")
  return value
}
