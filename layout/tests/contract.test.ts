import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {layoutFixed, type FixedLayoutGraph} from "@zavx0z/layout/fixed"
import {runFixedWorkerRequest} from "@zavx0z/layout/worker/fixed/executor"

const packageRoot = resolve(import.meta.dir, "..")

test("[LAYOUT-001] layout остаётся чистым numeric owner без UI/Renderer/Engine", async () => {
  const packageJson = await Bun.file(resolve(packageRoot, "package.json")).json()
  expect(Object.keys(packageJson.dependencies).sort()).toEqual(["@dagrejs/dagre", "d3-dag"])

  const source = await productionSource()
  for (const specifier of importSpecifiers(source)) {
    expect([
      "@zavx0z/browser",
      "@zavx0z/dom",
      "@zavx0z/engine",
      "@zavx0z/nodes",
      "@zavx0z/nodetree",
      "@zavx0z/renderer",
      "@zavx0z/space",
      "@zavx0z/ui",
      "@zavx0z/webgpu",
    ].some(prefix => specifier === prefix || specifier.startsWith(`${prefix}/`))).toBe(false)
  }

  const graph = layoutGraph()
  const before = structuredClone(graph)
  const result = layoutFixed(graph)
  expect(graph).toEqual(before)
  expect(result.nodes.map(({id}) => id).sort()).toEqual(["source", "target"])
  expect(result).not.toHaveProperty("viewport")
})

test("[LAYOUT-002] одинаковый graph и settings дают одинаковый LayoutResult", () => {
  const first = layoutFixed(layoutGraph())
  const second = layoutFixed(layoutGraph())
  expect(second).toEqual(first)
  expect(JSON.stringify(second)).toBe(JSON.stringify(first))
})

test("[LAYOUT-003] exact Worker executor эквивалентен прямому policy-вызову", () => {
  const graph = layoutGraph()
  const direct = layoutFixed(graph)
  const response = runFixedWorkerRequest({
    type: "layout",
    requestId: 7,
    generation: 3,
    graph,
  })

  expect(response.type).toBe("layout-result")
  expect(response.requestId).toBe(7)
  expect(response.generation).toBe(3)
  if (response.type !== "layout-result") throw new Error(response.error.message)
  expect(response.result).toEqual(direct)
})

test("[LAYOUT-004] Worker является stateless executor, а не вторым NodeTree", async () => {
  const workerSource = await sourceUnder("worker")
  expect(workerSource).not.toContain("@zavx0z/nodetree")
  expect(workerSource).not.toMatch(/\bNodeTree\b/u)
  expect(workerSource).not.toContain("createDocument")
  expect(workerSource).not.toContain("requestAnimationFrame")

  const response = runFixedWorkerRequest({
    type: "layout",
    requestId: 1,
    generation: 2,
    graph: layoutGraph(),
  })
  expect(Object.keys(response).sort()).toEqual(["generation", "requestId", "result", "type"])
  expect(response).not.toHaveProperty("graph")
})

function layoutGraph(): FixedLayoutGraph {
  return {
    viewport: {width: 900, height: 600},
    nodes: [
      {id: "source", width: 180, height: 100},
      {id: "target", width: 180, height: 100},
    ],
    ports: [
      {id: "source/socket", nodeId: "source", y: 72},
      {id: "target/socket", nodeId: "target", y: 72},
    ],
    edges: [{id: "edge", sourcePortId: "source/socket", targetPortId: "target/socket"}],
    layoutOptions: {spacing: 28, padding: 28, clearance: 28},
  }
}

async function productionSource(): Promise<string> {
  return sourceUnder("")
}

async function sourceUnder(relativeRoot: string): Promise<string> {
  const root = resolve(packageRoot, relativeRoot)
  const sources: string[] = []
  for await (const relativePath of new Bun.Glob("**/*.ts").scan({cwd: root})) {
    if (relativePath.startsWith("tests/")) continue
    sources.push(await Bun.file(resolve(root, relativePath)).text())
  }
  return sources.join("\n")
}

function importSpecifiers(source: string): readonly string[] {
  return [...source.matchAll(/(?:from\s+|import\()\s*["']([^"']+)["']/gu)]
    .map(match => match[1]!)
}
