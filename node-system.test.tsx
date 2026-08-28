import {describe, expect, test} from "bun:test"
import {
  Parameter,
  createNodeTree,
  createNodeTreeExternalStore,
  type NodeJsonValue,
} from "@nodes/core"
import {NodeTreeEditor} from "@nodes/editor"
import {Event, HTMLInputElement, createDocument, type MutationBatch} from "@zavx0z/dom"
import {createDocumentRenderer, type RenderFrame} from "@zavx0z/renderer"
import {RendererWebGpuBackend} from "@zavx0z/renderer-webgpu"
import {createRoot} from "@zavx0z/react"
import {
  NodeSystem,
  nodeSystemCss,
  type NodeSystemParameterInput,
} from "./node-system.tsx"

describe("compiled general Node system", () => {
  test("subscribes to the one Core tree and preserves keyed identities across Editor commits", () => {
    const enabled = new Parameter<NodeJsonValue, NodeJsonValue>(
      "enabled",
      true,
      Object.freeze({label: "Enabled"}),
      Object.freeze({id: "boolean", version: 1}),
    )
    const tree = createNodeTree<Parameter<NodeJsonValue, NodeJsonValue>>({
      nodes: Object.freeze([Object.freeze({
        id: "source",
        metadata: Object.freeze({label: "Source", x: 32, y: 44, width: 240}),
        parameters: Object.freeze([enabled]),
        sockets: Object.freeze([Object.freeze({
          id: "enabled-output",
          parameterId: "enabled",
          direction: "output" as const,
          side: "right" as const,
          valueType: Object.freeze({id: "boolean", version: 1}),
          metadata: Object.freeze({label: "Enabled"}),
        })]),
      })]),
      links: Object.freeze([]),
    })
    const editor = new NodeTreeEditor(tree)
    const store = createNodeTreeExternalStore(tree)
    const document = createDocument()
    const host = document.createElement("main")
    const root = createRoot(host)
    const onParameterInput = (change: NodeSystemParameterInput) => editor.setParameterValue({
      expectedRevision: tree.revision,
      nodeId: change.nodeId,
      parameterId: change.parameterId,
      value: change.value,
    })

    root.render(<NodeSystem store={store} onParameterInput={onParameterInput} />)
    const source = host.querySelector('[data-node-id="source"]')!
    const socket = host.querySelector('[data-socket-id="enabled-output"]')!
    const input = host.querySelector('input[type="checkbox"]') as HTMLInputElement
    expect(input.checked).toBeTrue()
    expect(host.querySelector('[data-node-system]')?.textContent).toContain("1 visible nodes")

    const beforeValueStats = root.stats()
    input.checked = false
    input.dispatchEvent(new Event("change", {bubbles: true}))
    expect(tree.parameter("source", "enabled").value).toBeFalse()
    expect(host.querySelector('[data-node-id="source"]')).toBe(source)
    expect(host.querySelector('[data-socket-id="enabled-output"]')).toBe(socket)
    expect(host.querySelector('input[type="checkbox"]')).toBe(input)
    expect(root.stats().renders - beforeValueStats.renders).toBeLessThanOrEqual(3)

    editor.addNode({
      expectedRevision: tree.revision,
      node: Object.freeze({
        id: "target",
        metadata: Object.freeze({label: "Target", x: 340, y: 92, width: 240}),
        parameters: Object.freeze([Object.freeze({
          id: "name",
          value: "General",
          presentation: Object.freeze({label: "Name"}),
          valueType: Object.freeze({id: "string", version: 1}),
        })]),
        sockets: Object.freeze([]),
      }),
    })
    expect(host.querySelector('[data-node-id="source"]')).toBe(source)
    expect(host.querySelector('[data-node-id="target"]')).not.toBeNull()
    expect(host.querySelectorAll("article")).toHaveLength(2)
    expect(tree.nodes).toHaveLength(2)

    root.unmount()
    editor.dispose()
    tree.dispose()
  })

  test("owns class-free compiled styles and no npm React path", async () => {
    const source = await Bun.file(new URL("./node-system.tsx", import.meta.url)).text()
    expect(source).toContain('defineStyles("@nodes/ui/node-system"')
    expect(source).toContain("useSyncExternalStore(")
    expect(source).toContain("key={entry.node.id}")
    expect(source).toContain("key={parameter.id}")
    expect(source).not.toContain("className")
    expect(source).not.toContain('from "react"')
    expect(source).not.toContain('from "react-dom')
    expect(nodeSystemCss).toContain("[data-z-")
  })

  test("culls a 1k canonical tree and scopes offscreen value/topology work to zero DOM mutations", () => {
    const parameters = Array.from({length: 1_000}, (_, index) =>
      new Parameter<NodeJsonValue, NodeJsonValue>(
        "value",
        index,
        Object.freeze({label: "Value"}),
        Object.freeze({id: "float", version: 1}),
      ))
    const tree = createNodeTree<Parameter<NodeJsonValue, NodeJsonValue>>({
      nodes: Object.freeze(parameters.map((parameter, index) => Object.freeze({
        id: `node-${index}`,
        parameters: Object.freeze([parameter]),
        sockets: Object.freeze([]),
        metadata: Object.freeze({
          label: `Node ${index}`,
          x: index % 100 * 292,
          y: Math.floor(index / 100) * 260,
          width: 260,
        }),
      }))),
      links: Object.freeze([]),
    })
    const editor = new NodeTreeEditor(tree)
    const store = createNodeTreeExternalStore(tree)
    const document = createDocument()
    const host = document.createElement("main")
    const mutations: MutationBatch[] = []
    document.appendChild(host)
    const unsubscribe = document.subscribeMutations(batch => mutations.push(batch))
    const root = createRoot(host)
    const viewport = Object.freeze({x: 0, y: 0, width: 850, height: 500, overscan: 0})
    root.render(<NodeSystem store={store} viewport={viewport} />)
    expect(host.querySelectorAll("article")).toHaveLength(6)
    const stable = host.querySelector('[data-node-id="node-0"]')!
    const stableInput = stable.querySelector("input")!
    mutations.length = 0

    const renderer = createDocumentRenderer({
      document,
      root: host,
      viewport: {width: 850, height: 500},
      styleSheets: [nodeSystemCss],
    })
    const frame = renderer.flush()
    const backend = new RendererWebGpuBackend({invalidateGeometry() {}})
    backend.applyFrame(rectFrame(frame))

    const beforeOffscreen = root.stats()
    editor.setParameterValue({
      expectedRevision: tree.revision,
      nodeId: "node-999",
      parameterId: "value",
      value: 2_000,
    })
    expect(root.stats().renders - beforeOffscreen.renders).toBe(0)
    expect(mutations).toEqual([])
    expect(renderer.flush()).toBe(frame)
    backend.applyFrame(rectFrame(frame))
    expect(backend.diagnostics).toMatchObject({rectPlanReused: true, rectPreparedItems: 0})

    const beforeTopology = root.stats()
    editor.addNode({
      expectedRevision: tree.revision,
      node: {
        id: "node-1000",
        parameters: [{
          id: "value",
          value: 1_000,
          presentation: {label: "Value"},
          valueType: {id: "float", version: 1},
        }],
        metadata: {label: "Node 1000", x: 0, y: 2_600, width: 260},
      },
    })
    expect(root.stats().renders - beforeTopology.renders).toBe(0)
    expect(mutations).toEqual([])
    expect(renderer.flush()).toBe(frame)
    expect(host.querySelector('[data-node-id="node-1000"]')).toBeNull()

    const beforeVisible = root.stats()
    editor.setParameterValue({
      expectedRevision: tree.revision,
      nodeId: "node-0",
      parameterId: "value",
      value: 0.5,
    })
    expect(root.stats().renders - beforeVisible.renders).toBeLessThanOrEqual(3)
    expect(host.querySelector('[data-node-id="node-0"]')).toBe(stable)
    expect(stable.querySelector("input")).toBe(stableInput)

    backend.dispose()
    renderer.dispose()
    root.unmount()
    unsubscribe()
    editor.dispose()
    tree.dispose()
  })
})

function rectFrame(frame: RenderFrame): RenderFrame {
  return Object.freeze({
    ...frame,
    displayList: Object.freeze(frame.displayList.filter(item => item.kind === "rect")),
  })
}
