import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {
  Parameter,
  createNodeTree,
  createNodeTreeExternalStore,
  hydrateNodeTree,
  serializeNodeTreeDocument,
  type NodeTreeChange,
} from "@zavx0z/nodetree"

const packageRoot = resolve(import.meta.dir, "..")

test("[NODETREE-001] один NodeTree владеет topology и exact Parameter Store", () => {
  const {tree, sourceValue} = createFixture()
  try {
    expect(tree.frames.map(({id}) => id)).toEqual(["frame"])
    expect(tree.nodes.map(({id}) => id)).toEqual(["source", "target"])
    expect(tree.links).toEqual([{
      id: "link",
      from: {nodeId: "source", socketId: "out"},
      to: {nodeId: "target", socketId: "in"},
    }])
    expect(tree.nodes[0]?.parameters?.[0]).toBe(sourceValue)
    expect(tree.parameter("source", "value")).toBe(sourceValue)
    expect(tree.nodes[0]?.sockets?.[0]?.parameterId).toBe(sourceValue.id)

    const changes: NodeTreeChange[] = []
    tree.subscribe(change => changes.push(change))
    expect(sourceValue.set(2)).toBe(true)
    expect(tree.parameter("source", "value")).toBe(sourceValue)
    expect(changes).toEqual([{
      kind: "parameter",
      revision: 1,
      topologyRevision: 0,
      nodeId: "source",
      parameterId: "value",
      parameterRevision: 1,
    }])
  } finally {
    tree.dispose()
  }
})

test("[NODETREE-002] external snapshots and subscriptions project the same Store", () => {
  const {tree, sourceValue} = createFixture()
  try {
    const store = createNodeTreeExternalStore(tree)
    const before = store.getSnapshot()
    expect(store.getSnapshot()).toBe(before)
    expect(store.getSnapshot()).toBe(tree.getSnapshot())

    const parameterStore = store.parameter("source", "value")
    expect(store.parameter("source", "value")).toBe(parameterStore)
    expect(parameterStore.getSnapshot()).toEqual(sourceValue.snapshot())
    let treeNotifications = 0
    let parameterNotifications = 0
    const unsubscribeTree = store.subscribe(() => treeNotifications += 1)
    const unsubscribeParameter = parameterStore.subscribe(() => parameterNotifications += 1)

    sourceValue.set(3)
    const after = store.getSnapshot()
    expect(after).not.toBe(before)
    expect(before.nodes[0]?.parameters[0]?.value).toBe(1)
    expect(after.nodes[0]?.parameters[0]?.value).toBe(3)
    expect(parameterStore.getSnapshot()).toEqual(sourceValue.snapshot())
    expect(treeNotifications).toBe(1)
    expect(parameterNotifications).toBe(1)

    unsubscribeTree()
    unsubscribeParameter()
  } finally {
    tree.dispose()
  }
})

test("[NODETREE-003] serialization preserves stable ids, values and relations", () => {
  const {tree, sourceValue} = createFixture()
  sourceValue.set(4)
  const serialized = serializeNodeTreeDocument(tree.document())
  const hydrated = hydrateNodeTree(serialized)
  try {
    expect(hydrated.document()).toEqual(tree.document())
    expect(hydrated.frames.map(({id}) => id)).toEqual(["frame"])
    expect(hydrated.nodes.map(({id}) => id)).toEqual(["source", "target"])
    expect(hydrated.links[0]).toEqual(tree.links[0])
    expect(hydrated.parameter("source", "value")).toBe(hydrated.parameter("source", "value"))
    expect(hydrated.parameter("source", "value")).not.toBe(sourceValue)
    expect(hydrated.parameter("source", "value").value).toBe(4)
    expect(serializeNodeTreeDocument(hydrated.document())).toBe(serialized)
  } finally {
    hydrated.dispose()
    tree.dispose()
  }
})

test("[NODETREE-004] NodeTree остаётся headless и предметно-нейтральным", async () => {
  const packageJson = await Bun.file(resolve(packageRoot, "package.json")).json()
  expect(packageJson.dependencies ?? {}).toEqual({})

  const source = await productionSource()
  const forbiddenImports = [
    "@engine/",
    "@metafor/",
    "@zavx0z/browser",
    "@zavx0z/dom",
    "@zavx0z/engine",
    "@zavx0z/layout",
    "@zavx0z/nodes",
    "@zavx0z/renderer",
    "@zavx0z/space",
    "@zavx0z/ui",
    "@zavx0z/webgpu",
  ]
  for (const specifier of importSpecifiers(source)) {
    expect(forbiddenImports.some(prefix => specifier.startsWith(prefix))).toBe(false)
  }
  expect(source).not.toContain("HTMLCanvasElement")
  expect(source).not.toContain("requestAnimationFrame")
})

function createFixture() {
  const sourceValue = new Parameter<number, {label: string}>("value", 1, {label: "Source"})
  const targetValue = new Parameter<number, {label: string}>("value", 0, {label: "Target"})
  const tree = createNodeTree({
    frames: [{id: "frame"}],
    nodes: [
      {
        id: "source",
        frameId: "frame",
        parameters: [sourceValue],
        sockets: [{id: "out", direction: "output", parameterId: "value", side: "right"}],
      },
      {
        id: "target",
        frameId: "frame",
        parameters: [targetValue],
        sockets: [{id: "in", direction: "input", parameterId: "value", side: "left"}],
      },
    ],
    links: [{
      id: "link",
      from: {nodeId: "source", socketId: "out"},
      to: {nodeId: "target", socketId: "in"},
    }],
  })
  return {tree, sourceValue, targetValue}
}

async function productionSource(): Promise<string> {
  const sources: string[] = []
  for await (const relativePath of new Bun.Glob("**/*.ts").scan({cwd: packageRoot})) {
    if (relativePath.startsWith("tests/")) continue
    sources.push(await Bun.file(resolve(packageRoot, relativePath)).text())
  }
  return sources.join("\n")
}

function importSpecifiers(source: string): readonly string[] {
  return [...source.matchAll(/(?:from\s+|import\()\s*["']([^"']+)["']/gu)]
    .map(match => match[1]!)
}
