import {expect, test} from "bun:test"
import {layoutFixed} from "@nodes/layout/fixed"
import {layoutAdaptiveWithDiagnostics} from "@nodes/layout/adaptive/diagnostics"
import {layoutTopDown} from "@nodes/layout/top-down"
import {layoutCoffmanGraham} from "@nodes/layout/coffman-graham"
import {fixedGraph, adaptiveGraph, topDownGraph, coffmanGrahamGraph} from "./layout.fixture.ts"

test("[LAYOUT-ALGORITHMS-001] реальные стороны, направления, compound containment и независимые входы", () => {
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

test("[LAYOUT-ALGORITHMS-002] вертикальные алгоритмы возвращают NORTH/SOUTH и связные кубические маршруты", () => {
  for (const result of [layoutTopDown({graph: topDownGraph()}), layoutCoffmanGraham(coffmanGrahamGraph())]) {
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
