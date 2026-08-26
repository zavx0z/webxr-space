import {UiRuntime} from "@layout/core/runtime"
import {waitForStorybookFrameBoundary} from "@zavx0z/storybook/environment"
import graph from "../graphs/ui-component-graph.json"
import type {UiComponentGraph} from "../scripts/ui-component-graph.ts"
import {UiComponentGraphSurface} from "./ui-component-graph-surface.ts"
import {loadUiGraphStories} from "./ui-story-adapter.ts"

declare global {
  var __webxrSpaceCapturePresentedFrame: (() => Promise<Blob | null>) | undefined
  var __webxrSpaceCatalogSnapshot: (() => Readonly<Record<string, unknown>>) | undefined
}

async function startCatalog(): Promise<void> {
  const canvas = document.getElementById("webxr-space-canvas")
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error("webxr-space-canvas not found")
  document.documentElement.dataset.webxrSpaceCatalog = "starting"
  try {
    const typedGraph = graph as unknown as UiComponentGraph
    const previews = await loadUiGraphStories(typedGraph)
    const runtime = await UiRuntime.create(canvas, {
      virtualDisplay: {initial: "near", surfaceDisplay: true, grid: false},
    })
    const surface = new UiComponentGraphSurface(typedGraph, previews)
    runtime.addSurface(surface, ({w, h}) => ({x: 0, y: 0, w, h}))
    globalThis.__webxrSpaceCapturePresentedFrame = () => runtime.renderer.captureLastPresentedFramePng()
    globalThis.__webxrSpaceCatalogSnapshot = () => Object.freeze({
      source: typedGraph.source,
      ...surface.diagnostics,
    })
    const publish = (): void => {
      document.documentElement.dataset.webxrSpaceGraphSource = typedGraph.source.revision
      document.documentElement.dataset.webxrSpaceGraphDirty = String(typedGraph.source.dirty)
      document.documentElement.dataset.webxrSpaceGraphNodes = String(surface.diagnostics.nodes)
      document.documentElement.dataset.webxrSpaceGraphEdges = String(surface.diagnostics.edges)
      document.documentElement.dataset.webxrSpaceGraphLive = String(surface.diagnostics.livePreviews)
      document.documentElement.dataset.webxrSpaceGraphMissing = String(surface.diagnostics.missingPreviews)
      document.documentElement.dataset.webxrSpaceGraphFailed = String(surface.diagnostics.failedPreviews)
      document.documentElement.dataset.webxrSpaceGraphFitScale = String(surface.diagnostics.fitScale)
    }
    new ResizeObserver(() => {
      runtime.handleResize()
      publish()
    }).observe(canvas)
    runtime.handleResize()
    publish()
    runtime.requestRender()
    await waitForStorybookFrameBoundary()
    publish()
    document.documentElement.dataset.webxrSpaceCatalog = "ready"
  } catch (error) {
    document.documentElement.dataset.webxrSpaceCatalog = "error"
    document.documentElement.dataset.webxrSpaceCatalogError = errorText(error)
    throw error
  }
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.stack ?? error.message : String(error)
}

if (typeof document !== "undefined") await startCatalog()
