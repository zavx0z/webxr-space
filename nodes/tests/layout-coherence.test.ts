import {expect, setDefaultTimeout, test} from "bun:test"
import {resolve} from "node:path"
import {createDocument, InputEvent, MouseEvent, type Element, type HTMLInputElement} from "@zavx0z/dom"
import type {LayoutResult} from "@zavx0z/layout/types"
import type {NodeTreeSnapshot} from "@zavx0z/nodetree"
import {createSpaceElementFactories} from "@zavx0z/space"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"

const root = resolve(import.meta.dir, "../..")
setDefaultTimeout(60_000)
Bun.plugin(createTemplateJsxBunPlugin({cwd: root, persistent: true, sourceRoots: [resolve(root, "nodes"), resolve(root, "ui")]}))

const {createNodeTreeLayout, StaleNodeTreeLayoutError} = await import("@zavx0z/nodes/node-tree")
const {createLayoutGraph, graphLayout, mountLayoutFixture, textParameter} = await import("./layout-coherence.fixture.tsx")
type Graph = ReturnType<typeof createLayoutGraph>
type Mounted = ReturnType<typeof mountLayoutFixture>

test("[NODES-LAYOUT-COHERENCE-001] synchronous parent layouts publish append and removal without replacing surviving controls", async () => {
  const graph = createLayoutGraph(false)
  const mounted = mount(graph, "tree")
  const source = article(mounted, "source")
  const target = article(mounted, "target")
  const sourceInput = input(mounted, "source")
  const sourceStore = graph.store.parameter("source", "message")
  let sourceNotifications = 0
  const unsubscribe = sourceStore.subscribe(() => sourceNotifications += 1)
  try {
    enter(sourceInput, "before append")
    await settle()
    const extra = append(graph, "extra")
    await settle()
    expect(ids(mounted)).toEqual(["source", "target", "extra"])
    expect(article(mounted, "source")).toBe(source)
    expect(article(mounted, "target")).toBe(target)
    expect(input(mounted, "source")).toBe(sourceInput)
    expect(graph.tree.parameter("source", "message")).toBe(graph.source)
    expect(graph.store.parameter("source", "message")).toBe(sourceStore)
    expect(graph.tree.parameter("extra", "message")).toBe(extra)

    reconcile(graph, {nodes: graph.tree.nodes.filter(node => node.id !== "target"), links: []})
    await settle()
    expect(ids(mounted)).toEqual(["source", "extra"])
    expect(article(mounted, "source")).toBe(source)
    expect(input(mounted, "source")).toBe(sourceInput)
    enter(sourceInput, "after remove")
    await settle()
    expect(graph.source.value).toBe("after remove")
    expect(sourceNotifications).toBe(2)
    expect(pending(mounted)).toBe(false)
  } finally {
    unsubscribe()
    mounted.dispose()
    graph.tree.dispose()
  }
})

test("[NODES-LAYOUT-COHERENCE-002] NodeEditor shares accepted geometry for topology, input and fit", async () => {
  const graph = createLayoutGraph()
  const mounted = mount(graph, "editor")
  const source = article(mounted, "source")
  const sourceInput = input(mounted, "source")
  try {
    append(graph, "extra")
    await settle()
    expect(ids(mounted)).toEqual(["source", "target", "extra"])
    expect(article(mounted, "source")).toBe(source)
    expect(input(mounted, "source")).toBe(sourceInput)
    fit(mounted).dispatchEvent(new MouseEvent("click", {bubbles: true}))
    await settle()
    expect(graph.transforms).toHaveLength(1)
    expect(Number.isFinite(graph.transforms[0]!.scale)).toBe(true)
    reconcile(graph, {nodes: graph.tree.nodes.filter(node => node.id !== "extra")})
    await settle()
    enter(sourceInput, "editor remains live")
    await settle()
    expect(graph.source.value).toBe("editor remains live")
    expect(article(mounted, "source")).toBe(source)
    expect(pending(mounted)).toBe(false)
  } finally {
    mounted.dispose()
    graph.tree.dispose()
  }
})

test("[NODES-LAYOUT-COHERENCE-003] reversed async completion cannot replace the latest accepted topology", async () => {
  const graph = createLayoutGraph()
  const initial = createNodeTreeLayout(graph.store, graphLayout)
  const mounted = mount(graph, "tree", initial)
  const source = article(mounted, "source")
  const sourceInput = input(mounted, "source")
  try {
    append(graph, "first")
    const first = deferredLayout(graph)
    const firstOutcome = first.promise.then(() => null, error => error)
    await settle()
    expect(pending(mounted)).toBe(true)
    append(graph, "second")
    const second = deferredLayout(graph)
    second.resolve(graphLayout(second.snapshot))
    const latest = await second.promise
    mounted.publish(latest)
    await settle()
    expect(ids(mounted)).toEqual(["source", "target", "first", "second"])
    expect(pending(mounted)).toBe(false)
    expect(article(mounted, "source")).toBe(source)
    expect(input(mounted, "source")).toBe(sourceInput)

    first.resolve(graphLayout(first.snapshot))
    expect(await firstOutcome).toBeInstanceOf(StaleNodeTreeLayoutError)
    expect(ids(mounted)).toEqual(["source", "target", "first", "second"])
    enter(sourceInput, "latest accepted")
    await settle()
    expect(graph.source.value).toBe("latest accepted")
  } finally {
    mounted.dispose()
    graph.tree.dispose()
  }
})

test("[NODES-LAYOUT-COHERENCE-004] pending remove and same-address replacement block old input, selection and fit", async () => {
  const graph = createLayoutGraph(false)
  const mounted = mount(graph, "editor", createNodeTreeLayout(graph.store, graphLayout))
  const source = article(mounted, "source")
  const oldTarget = article(mounted, "target")
  const oldInput = input(mounted, "target")
  const oldStore = graph.store.parameter("target", "message")
  const oldParameter = graph.target
  const replacement = textParameter("replacement initial")
  let treeNotifications = 0
  const unsubscribe = graph.store.subscribe(() => treeNotifications += 1)
  try {
    reconcile(graph, {nodes: graph.tree.nodes.filter(node => node.id !== "target"), links: []})
    await settle()
    expect(pending(mounted)).toBe(true)
    expect(fit(mounted).hasAttribute("disabled")).toBe(true)
    enter(oldInput, "removed input")
    oldTarget.dispatchEvent(new MouseEvent("click", {bubbles: true}))
    fit(mounted).dispatchEvent(new MouseEvent("click", {bubbles: true}))
    await settle()
    expect(graph.changes).toEqual([])
    expect(graph.selections).toEqual([])
    expect(graph.transforms).toEqual([])
    expect(oldParameter.value).toBe("target initial")

    reconcile(graph, {nodes: [...graph.tree.nodes, {id: "target", parameters: [replacement]}]})
    await settle()
    enter(oldInput, "stale address input")
    await settle()
    expect(replacement.value).toBe("replacement initial")
    expect(graph.changes).toEqual([])
    const beforeDetachedWrite = treeNotifications
    oldParameter.set("detached store write")
    expect(treeNotifications).toBe(beforeDetachedWrite)
    expect(graph.store.parameter("target", "message")).not.toBe(oldStore)

    mounted.publish(createNodeTreeLayout(graph.store, graphLayout))
    await settle()
    expect(pending(mounted)).toBe(false)
    expect(fit(mounted).hasAttribute("disabled")).toBe(false)
    expect(article(mounted, "source")).toBe(source)
    expect(input(mounted, "target").value).toBe("replacement initial")
    enter(input(mounted, "target"), "new store input")
    await settle()
    expect(replacement.value).toBe("new store input")
    expect(oldParameter.value).toBe("detached store write")
  } finally {
    unsubscribe()
    mounted.dispose()
    graph.tree.dispose()
  }
})

test("[NODES-LAYOUT-COHERENCE-005] incomplete current geometry fails instead of becoming pending", () => {
  const graph = createLayoutGraph()
  const valid = graphLayout(graph.store.getSnapshot())
  const invalid = {...valid, nodes: valid.nodes.filter(node => node.id !== "target")}
  try {
    expect(() => createNodeTreeLayout(graph.store, () => invalid)).toThrow("Layout Node geometry is missing: target")
    expect(() => mount(graph, "tree", invalid)).toThrow("Layout Node geometry is missing: target")
  } finally { graph.tree.dispose() }
})

test("[NODES-LAYOUT-COHERENCE-006] compatible precomputed superset admits append through the same raw LayoutResult", async () => {
  const graph = createLayoutGraph()
  const extra = textParameter("extra initial")
  const snapshot = graph.store.getSnapshot()
  const future: NodeTreeSnapshot = {
    ...snapshot,
    nodes: [...snapshot.nodes, {id: "extra", parameters: [extra.snapshot()], sockets: []}],
  }
  const layout = graphLayout(future)
  const mounted = mount(graph, "tree", layout)
  const source = article(mounted, "source")
  try {
    reconcile(graph, {nodes: [...graph.tree.nodes, {id: "extra", parameters: [extra]}]})
    await settle()
    expect(ids(mounted)).toEqual(["source", "target", "extra"])
    expect(pending(mounted)).toBe(false)
    expect(article(mounted, "source")).toBe(source)
    enter(input(mounted, "extra"), "precomputed append input")
    await settle()
    expect(extra.value).toBe("precomputed append input")
  } finally {
    mounted.dispose()
    graph.tree.dispose()
  }
})

test("[NODES-LAYOUT-COHERENCE-007] receipts reject foreign Stores and structural forgeries", () => {
  const graph = createLayoutGraph()
  const other = createLayoutGraph()
  const receipt = createNodeTreeLayout(graph.store, graphLayout)
  try {
    expect(() => mount(other, "tree", receipt)).toThrow("belongs to another Store")
    expect(() => mount(graph, "tree", {...receipt})).toThrow("is not registered")
  } finally {
    other.tree.dispose()
    graph.tree.dispose()
  }
})

test("[NODES-LAYOUT-COHERENCE-008] value changes during async layout reject the captured snapshot", async () => {
  const graph = createLayoutGraph()
  try {
    const pending = deferredLayout(graph)
    const outcome = pending.promise.then(() => null, error => error)
    graph.source.set("new value")
    pending.resolve(graphLayout(pending.snapshot))
    expect(await outcome).toBeInstanceOf(StaleNodeTreeLayoutError)
    expect(createNodeTreeLayout(graph.store, graphLayout).snapshot).toBe(graph.store.getSnapshot())
  } finally { graph.tree.dispose() }
})

test("[NODES-LAYOUT-COHERENCE-009] link addition and removal retain Nodes and the surviving Link", async () => {
  const graph = createLayoutGraph()
  const mounted = mount(graph, "tree")
  const source = article(mounted, "source")
  const target = article(mounted, "target")
  const original = mounted.element.querySelector('[data-link-id="value-link"]')
  const link = graph.tree.links[0]!
  try {
    reconcile(graph, {links: [link, {...link, id: "parallel-link"}]})
    await settle()
    expect(mounted.element.querySelectorAll("[data-link-id]")).toHaveLength(2)
    expect(mounted.element.querySelector('[data-link-id="value-link"]')).toBe(original)
    const parallel = mounted.element.querySelector('[data-link-id="parallel-link"]')
    expect(parallel?.getAttribute("d")).toBeTruthy()
    reconcile(graph, {links: graph.tree.links.filter(item => item.id !== "value-link")})
    await settle()
    expect(mounted.element.querySelectorAll("[data-link-id]")).toHaveLength(1)
    expect(mounted.element.querySelector('[data-link-id="value-link"]')).toBeNull()
    expect(mounted.element.querySelector('[data-link-id="parallel-link"]')).toBe(parallel)
    expect(article(mounted, "source")).toBe(source)
    expect(article(mounted, "target")).toBe(target)
    expect(pending(mounted)).toBe(false)
  } finally {
    mounted.dispose()
    graph.tree.dispose()
  }
})

test("[NODES-LAYOUT-COHERENCE-010] late delivery of an already completed receipt blocks the retained newer view actions", async () => {
  const graph = createLayoutGraph()
  const old = createNodeTreeLayout(graph.store, graphLayout)
  const mounted = mount(graph, "editor", old)
  try {
    append(graph, "new-generation")
    const current = createNodeTreeLayout(graph.store, graphLayout)
    mounted.publish(current)
    await settle()
    expect(pending(mounted)).toBe(false)
    expect(ids(mounted)).toEqual(["source", "target", "new-generation"])
    const currentSource = article(mounted, "source")
    const currentInput = input(mounted, "source")
    const currentFit = fit(mounted)

    mounted.publish(old)
    await settle()
    expect(pending(mounted)).toBe(true)
    expect(currentFit.hasAttribute("disabled")).toBe(true)
    enter(currentInput, "input from retained newer view")
    currentSource.dispatchEvent(new MouseEvent("click", {bubbles: true}))
    currentFit.dispatchEvent(new MouseEvent("click", {bubbles: true}))
    await settle()
    expect(graph.source.value).toBe("source initial")
    expect(graph.changes).toEqual([])
    expect(graph.selections).toEqual([])
    expect(graph.transforms).toEqual([])

    mounted.publish(current)
    await settle()
    expect(pending(mounted)).toBe(false)
    expect(article(mounted, "source")).toBe(currentSource)
    expect(input(mounted, "source")).toBe(currentInput)
    expect(ids(mounted)).toEqual(["source", "target", "new-generation"])
  } finally {
    mounted.dispose()
    graph.tree.dispose()
  }
})

test("[NODES-LAYOUT-COHERENCE-011] value-only changes invalidate an exact receipt until a new receipt is delivered", async () => {
  const graph = createLayoutGraph()
  const receipt = createNodeTreeLayout(graph.store, graphLayout)
  const mounted = mount(graph, "tree", receipt)
  const source = article(mounted, "source")
  const sourceInput = input(mounted, "source")
  const topologyRevision = graph.tree.topologyRevision
  try {
    graph.source.set("value after layout")
    await settle()
    expect(graph.tree.topologyRevision).toBe(topologyRevision)
    expect(pending(mounted)).toBe(true)
    expect(mounted.element.querySelector("[data-node-tree-scene]")?.hasAttribute("hidden")).toBe(true)
    enter(sourceInput, "input before new receipt")
    source.dispatchEvent(new MouseEvent("click", {bubbles: true}))
    await settle()
    expect(graph.source.value).toBe("value after layout")
    expect(graph.changes).toEqual([])
    expect(graph.selections).toEqual([])

    const current = createNodeTreeLayout(graph.store, graphLayout)
    expect(current.snapshot).toBe(graph.store.getSnapshot())
    mounted.publish(current)
    await settle()
    expect(pending(mounted)).toBe(false)
    expect(article(mounted, "source")).toBe(source)
    expect(input(mounted, "source")).toBe(sourceInput)
    expect(sourceInput.value).toBe("value after layout")
  } finally {
    mounted.dispose()
    graph.tree.dispose()
  }
})

function mount(graph: Graph, kind: "tree" | "editor", layout?: Parameters<typeof mountLayoutFixture>[3]): Mounted {
  const document = createDocument({elementFactories: createSpaceElementFactories()})
  const space = document.createElement("xr-space")
  const display = document.createElement("xr-display")
  space.append(document.createElement("xr-view-point"), display)
  document.append(space)
  const mounted = mountLayoutFixture(document, graph, kind, layout)
  display.append(mounted.element)
  return mounted
}

function append(graph: Graph, id: string) {
  const parameter = textParameter(`${id} initial`)
  reconcile(graph, {nodes: [...graph.tree.nodes, {id, parameters: [parameter]}]})
  return parameter
}

function reconcile(graph: Graph, update: Partial<ReturnType<Graph["tree"]["definition"]>>) {
  graph.tree.reconcile({expectedRevision: graph.tree.revision, definition: {...graph.tree.definition(), ...update}})
}

function article(mounted: Mounted, id: string): Element {
  const result = mounted.element.querySelector(`article[data-node-id="${id}"]`)
  if (result === null) throw new Error(`Missing Node ${id}`)
  return result
}

function input(mounted: Mounted, id: string): HTMLInputElement {
  const result = article(mounted, id).querySelector('[data-parameter-id="message"] input')
  if (result === null) throw new Error(`Missing message input for ${id}`)
  return result as HTMLInputElement
}

function enter(input: HTMLInputElement, value: string) {
  input.value = value
  input.dispatchEvent(new InputEvent("input", {bubbles: true, data: value, inputType: "insertText"}))
}

function ids(mounted: Mounted): string[] {
  return [...mounted.element.querySelectorAll("article[data-node-id]")].map(node => node.getAttribute("data-node-id")!)
}

function pending(mounted: Mounted): boolean {
  return mounted.element.querySelector("[data-node-tree]")?.getAttribute("data-layout-pending") === "true"
}

function fit(mounted: Mounted): Element {
  const result = mounted.element.querySelector('[data-action="fit-node-tree"]')
  if (result === null) throw new Error("Missing NodeEditor fit control")
  return result
}

function deferredLayout(graph: Graph) {
  let captured: NodeTreeSnapshot | undefined
  let complete: ((result: LayoutResult) => void) | undefined
  const promise = createNodeTreeLayout(graph.store, snapshot => {
    captured = snapshot
    return new Promise<LayoutResult>(resolve => { complete = resolve })
  })
  if (captured === undefined || complete === undefined) throw new Error("Layout compute was not started")
  return {promise, snapshot: captured, resolve: complete}
}

async function settle() {
  await Promise.resolve()
  await Promise.resolve()
}
