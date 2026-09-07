import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {algorithmReport} from "../.storybook/stories/reports.ts"
import {workerReport} from "../.storybook/stories/worker-reports.ts"
import {layoutFixed} from "@zavx0z/layout/fixed"
import {layoutAdaptiveWithDiagnostics} from "@zavx0z/layout/adaptive"
import {layoutTopDown} from "@zavx0z/layout/top-down"
import {layoutCoffmanGraham} from "@zavx0z/layout/coffman-graham"
import {fixedGraph, adaptiveGraph, topDownGraph, coffmanGrahamGraph} from "../.storybook/stories/fixtures.ts"

const root = resolve(import.meta.dir, "..")

test("[LAYOUT-STORYBOOK-001] все algorithms/protocol/workers имеют исполняемые маршруты и ресурсы", async () => {
  const manifest = await Bun.file(resolve(root, ".storybook/manifest.json")).json()
  expect(manifest).toMatchObject({readme: "../README.md", runtime: {module: "./runtime.ts", export: "runtime"}, catalog: "./catalog.json"})
  const catalog = await readCatalog()
  expect(catalog.categories.map(category => category.id)).toEqual(["algorithms", "protocol", "workers"])
  expect(catalog.categories[0]!.subjects.map(subject => subject.id)).toEqual(["fixed", "adaptive", "top-down", "coffman-graham"])
  expect(catalog.categories[2]!.subjects.map(subject => subject.id)).toEqual(["fixed", "adaptive", "top-down", "coffman-graham", "transport"])
  const exports = await import("../.storybook/stories/subjects.ts") as Record<string, {route: string; create: unknown}>
  const routes = new Set<string>()
  for (const category of catalog.categories) {
    for (const subject of category.subjects) {
      expect(subject.presentation.projection).toBe("display")
      for (const variant of subject.variants) {
        expect(routes.has(variant.route)).toBe(false)
        routes.add(variant.route)
        expect(exports[variant.module.export]?.route).toBe(variant.route)
        expect(typeof exports[variant.module.export]?.create).toBe("function")
        for (const resource of [variant.resources.fixture, ...variant.resources.tests, ...variant.resources.references]) {
          expect(await Bun.file(resolve(root, ".storybook", resource)).exists()).toBe(true)
        }
      }
    }
  }
  expect(routes.size).toBe(26)
})

test("[LAYOUT-STORYBOOK-002] каждый числовой вариант вызывает реальный алгоритм или typed отказ", async () => {
  const catalog = await readCatalog()
  for (const category of catalog.categories.filter(category => category.id !== "workers")) {
    for (const subject of category.subjects) {
      for (const variant of subject.variants) {
        const report = algorithmReport(variant.route)
        expect(report.route).toBe(variant.route)
        expect(report.input).toBeDefined()
        expect(report.output).toBeDefined()
        if (report.status === "expected-error") {
          const error = report.output as {name: string; code?: string; witness?: {nodeIds?: string[]; reason?: string}}
          if (subject.id === "adaptive") expect(error.witness?.reason).toBe("PORT_HAS_NO_ALLOWED_SIDE")
          if (subject.id === "top-down" || subject.id === "coffman-graham") {
            expect(error.code).toBe("CYCLE_DETECTED")
            expect(error.witness?.nodeIds).toContain("source")
            expect(error.witness?.nodeIds).toContain("left")
          }
        }
      }
    }
  }
})

test("[LAYOUT-STORYBOOK-003] реальные стороны, направления, compound containment и независимые входы", () => {
  for (const direction of ["RIGHT", "DOWN"] as const) {
    const graph = fixedGraph(direction)
    const before = structuredClone(graph)
    const result = layoutFixed(graph)
    expect(graph).toEqual(before)
    expect(result.direction).toBe(direction)
    expect(result.ports.find(port => port.id === "source/out")?.side).toBe("EAST")
    expect(result.ports.find(port => port.id === "target/in")?.side).toBe("WEST")
    const sourcePort = result.ports.find(port => port.id === "source/out")!
    expect(result.edges[0]!.sections[0].startPoint).toEqual({x: sourcePort.x, y: sourcePort.y})
    expect(layoutFixed(graph)).toEqual(result)
  }
  const compound = layoutFixed(fixedGraph("RIGHT", true))
  const group = compound.nodes.find(node => node.id === "group")!
  const source = compound.nodes.find(node => node.id === "source")!
  expect(source.x).toBeGreaterThanOrEqual(group.x)
  expect(source.y).toBeGreaterThan(group.y + 32)
  expect(source.x + source.width).toBeLessThanOrEqual(group.x + group.width)
  expect(source.y + source.height).toBeLessThanOrEqual(group.y + group.height)
  const adaptive = layoutAdaptiveWithDiagnostics(adaptiveGraph())
  expect(adaptive.result.ports.filter(port => port.id === "source/shared")).toHaveLength(1)
  expect(adaptive.diagnostics.attemptedCandidates).toBeLessThanOrEqual(adaptive.diagnostics.candidateBudget)
  expect(adaptive.diagnostics.selectedSides.find(side => side.portId === "source/shared")?.side).toBe(adaptive.result.ports.find(port => port.id === "source/shared")!.side)
})

test("[LAYOUT-STORYBOOK-004] вертикальные алгоритмы возвращают NORTH/SOUTH и связные кубические маршруты", () => {
  for (const result of [layoutTopDown(topDownGraph()), layoutCoffmanGraham(coffmanGrahamGraph())]) {
    expect(result.direction).toBe("DOWN")
    expect(result.ports.find(port => port.id === "source/out-left")?.side).toBe("SOUTH")
    expect(result.ports.find(port => port.id === "left/in")?.side).toBe("NORTH")
    for (const edge of result.edges) {
      expect(edge.curves.length).toBeGreaterThan(0)
      for (let index = 1; index < edge.curves.length; index += 1) {
        expect(edge.curves[index]!.startPoint).toEqual(edge.curves[index - 1]!.endPoint)
      }
    }
  }
  const narrow = layoutCoffmanGraham(coffmanGrahamGraph(2))
  const wide = layoutCoffmanGraham(coffmanGrahamGraph(3))
  const narrowLayers = new Map<number, number>()
  for (const node of narrow.nodes) narrowLayers.set(node.y, (narrowLayers.get(node.y) ?? 0) + 1)
  expect([...narrowLayers.values()].every(count => count <= 2)).toBe(true)
  expect(narrowLayers.size).toBeGreaterThan(new Set(wide.nodes.map(node => node.y)).size)
})

for (const policy of ["fixed", "adaptive", "top-down", "coffman-graham"] as const) {
  test(`[LAYOUT-STORYBOOK-WORKER] ${policy}: отдельный Worker и сериализованный отказ`, async () => {
    const success = await workerReport(`workers/${policy}/equivalence`)
    expect(success.status).toBe("result")
    expect(success.output).toMatchObject({equivalent: true, diagnosticsEqual: true, response: {generation: 7, requestId: 1}})
    const failure = await workerReport(`workers/${policy}/failure`)
    expect(failure.status).toBe("expected-error")
    if (policy === "top-down" || policy === "coffman-graham") expect(failure.output).toMatchObject({code: "CYCLE_DETECTED"})
    if (policy === "adaptive") expect(failure.output).toMatchObject({code: "NO_LEGAL_ADAPTIVE_SIDE_ASSIGNMENT", witness: {reason: "PORT_HAS_NO_ALLOWED_SIDE"}})
  }, 30_000)
}

test("[LAYOUT-STORYBOOK-TRANSPORT] поколения и dispose настоящего Worker; fault injection отмечен отдельно", async () => {
  const lifecycle = await workerReport("workers/transport/lifecycle")
  expect(lifecycle.output).toMatchObject({cancelled: "Stale layout generation: 1", response: {requestId: 2, generation: 2}, disposedPending: "Layout Worker is disposed", disposedNew: "Layout Worker is disposed"})
  const faults = await workerReport("workers/transport/faults")
  expect(faults.input).toMatchObject({endpoint: "controlled test double"})
  expect(faults.output).toMatchObject({terminated: true, listenerCount: 0, errors: {generation: "Layout Worker generation mismatch: 1", remote: "Проба: remote error", errorEventA: "Проба: endpoint error event", errorEventB: "Проба: endpoint error event", postMessage: "Проба: postMessage отказал"}})
}, 30_000)

type Catalog = Readonly<{
  categories: readonly Readonly<{
    id: string
    subjects: readonly Readonly<{
      id: string
      presentation: Readonly<{projection: string}>
      variants: readonly Readonly<{
        route: string
        module: Readonly<{export: string}>
        resources: Readonly<{fixture: string; tests: readonly string[]; references: readonly string[]}>
      }>[]
    }>[]
  }>[]
}>

async function readCatalog(): Promise<Catalog> {
  return Bun.file(resolve(root, ".storybook/catalog.json")).json()
}
