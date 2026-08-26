import {describe, expect, test} from "bun:test"
import graph from "../graphs/ui-component-graph.json"
import type {UiComponentGraph} from "../scripts/ui-component-graph.ts"
import {createUiComponentGraphLayout} from "./ui-component-graph-model.ts"
import {loadUiGraphStories} from "./ui-story-adapter.ts"
import {
  fitUiComponentGraphBounds,
  summarizeUiComponentGraphPreviews,
  uiComponentEdgePoints,
} from "./ui-component-graph-surface.ts"

const layout = createUiComponentGraphLayout(graph as unknown as UiComponentGraph)

describe("UI component graph fit-only presentation", () => {
  test("fits the complete graph inside the initial viewport without a zoom input", () => {
    const viewport = {x: 0, y: 38, w: 1920, h: 1050}
    const padding = 28
    const fit = fitUiComponentGraphBounds(layout.result.bounds, viewport, padding)
    const left = fit.x + (layout.result.bounds.x - padding) * fit.scale
    const top = fit.y + (layout.result.bounds.y - padding) * fit.scale
    const right = fit.x + (layout.result.bounds.x + layout.result.bounds.width + padding) * fit.scale
    const bottom = fit.y + (layout.result.bounds.y + layout.result.bounds.height + padding) * fit.scale

    expect(fit.scale).toBeGreaterThan(0)
    expect(fit.scale).toBeLessThanOrEqual(1)
    expect(left).toBeGreaterThanOrEqual(viewport.x - 1e-6)
    expect(top).toBeGreaterThanOrEqual(viewport.y - 1e-6)
    expect(right).toBeLessThanOrEqual(viewport.x + viewport.w + 1e-6)
    expect(bottom).toBeLessThanOrEqual(viewport.y + viewport.h + 1e-6)
  })

  test("recomputes only the deterministic fit transform for a smaller viewport", () => {
    const large = fitUiComponentGraphBounds(layout.result.bounds, {x: 0, y: 38, w: 1920, h: 1050})
    const small = fitUiComponentGraphBounds(layout.result.bounds, {x: 0, y: 38, w: 960, h: 540})
    expect(small.scale).toBeLessThan(large.scale)
    expect(layout.result.nodes.length).toBe(graph.nodes.length)
    expect(layout.result.edges.length).toBe(graph.edges.length)
  })

  test("publishes every dense relation through one downward cubic edge pipeline", () => {
    expect(layout.result.edges).toHaveLength(graph.edges.length)
    expect(JSON.stringify(layout.input.edges)).not.toMatch(/tree|cross|shortcut|constraint/)
    expect(layout.result.edges.every(({curves}) => curves.length > 0)).toBeTrue()
    expect(layout.result.edges.every(({curves}) => curves.every((curve) =>
      curve.startPoint.y < curve.controlPoints[0].y &&
      curve.controlPoints[0].y < curve.controlPoints[1].y &&
      curve.controlPoints[1].y < curve.endPoint.y))).toBeTrue()
  })

  test("keeps every spline connection outside unrelated node interiors", () => {
    const inputEdgeById = new Map(layout.input.edges.map((edge) => [edge.id, edge]))
    const portById = new Map(layout.input.ports.map((port) => [port.id, port]))
    for (const edge of layout.result.edges) {
      const input = inputEdgeById.get(edge.id)!
      const sourceNodeId = portById.get(input.sourcePortId)!.nodeId
      const targetNodeId = portById.get(input.targetPortId)!.nodeId
      const points = uiComponentEdgePoints(edge.curves)
      expect(points[0]).toEqual(edge.curves[0]!.startPoint)
      expect(points.at(-1)).toEqual(edge.curves.at(-1)!.endPoint)
      for (const point of points.slice(1, -1)) {
        expect(layout.result.nodes.some((node) =>
          node.id !== sourceNodeId && node.id !== targetNodeId &&
          point.x > node.x && point.x < node.x + node.width &&
          point.y > node.y && point.y < node.y + node.height)).toBeFalse()
      }
    }
  })

  test("counts a caught node render failure instead of reporting it live", async () => {
    const typedGraph = graph as unknown as UiComponentGraph
    const subset: UiComponentGraph = {...typedGraph, nodes: typedGraph.nodes.slice(0, 2), edges: []}
    const previews = await loadUiGraphStories(subset)
    const failedId = subset.nodes[0]!.id
    const diagnostics = summarizeUiComponentGraphPreviews(previews, new Map([[failedId, "render failed"]]))
    expect(diagnostics.livePreviews).toBe(1)
    expect(diagnostics.missingPreviews).toBe(0)
    expect(diagnostics.failedPreviews).toBe(1)
    expect(diagnostics.renderErrors).toEqual({[failedId]: "render failed"})
  })
})
