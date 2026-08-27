import {UiRuntime} from "@layout/core/runtime"
import {waitForStorybookFrameBoundary} from "@zavx0z/storybook/environment"
import {
  StorybookStatusBarSurface,
  planStorybookStatusBarShell,
} from "@zavx0z/storybook/workbench"
import {UiComponentGraphSurface} from "./preview.ts"
import {UiComponentGraphLabState} from "./state/lab-state.ts"

declare global {
  var __webxrSpaceCapturePresentedFrame: (() => Promise<Blob | null>) | undefined
  var __webxrSpaceStorybookSnapshot: (() => Readonly<Record<string, unknown>>) | undefined
}

async function startStorybook(): Promise<void> {
  const canvas = document.getElementById("webxr-space-storybook-canvas")
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error("webxr-space-storybook-canvas not found")
  document.documentElement.dataset.webxrSpaceStorybook = "starting"
  try {
    const state = await UiComponentGraphLabState.create()
    const runtime = await UiRuntime.create(canvas, {
      virtualDisplay: {initial: "near", surfaceDisplay: true, grid: false},
    })
    const surface = new UiComponentGraphSurface(state.graph, state.previews)
    const statusBar = new StorybookStatusBarSurface()
    const frames = (w: number, h: number) => planStorybookStatusBarShell(w, h)
    runtime.addSurface(surface, ({w, h}) => frames(w, h).content)
    runtime.addSurface(statusBar, ({w, h}) => frames(w, h).status)
    globalThis.__webxrSpaceCapturePresentedFrame = () => runtime.renderer.captureLastPresentedFramePng()
    globalThis.__webxrSpaceStorybookSnapshot = () => Object.freeze({
      source: state.graph.source,
      ...surface.diagnostics,
    })
    const publish = (): void => {
      surface.flushPendingRender()
      statusBar.flushPendingRender()
      document.documentElement.dataset.webxrSpaceGraphSource = state.graph.source.revision
      document.documentElement.dataset.webxrSpaceGraphDirty = String(state.graph.source.dirty)
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
    document.documentElement.dataset.webxrSpaceStorybook = "ready"
  } catch (error) {
    document.documentElement.dataset.webxrSpaceStorybook = "error"
    document.documentElement.dataset.webxrSpaceStorybookError = errorText(error)
    throw error
  }
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.stack ?? error.message : String(error)
}

if (typeof document !== "undefined") await startStorybook()
