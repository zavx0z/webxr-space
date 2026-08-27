import {join} from "node:path"
import type {StorybookPageManifest} from "@zavx0z/storybook/app"
import {UI_COMPONENT_GRAPH_ROUTES} from "./stories.ts"

/** The package-owned page descriptor composed by the repository app. */
export function createStorybookPage(): StorybookPageManifest {
  return {
    id: "main",
    title: "webxr-space · UI component graph",
    mountPath: "/",
    entrypoint: join(import.meta.dir, "entry.ts"),
    stylePath: join(import.meta.dir, "style.css"),
    body: {
      kind: "canvas",
      canvasId: "webxr-space-storybook-canvas",
    },
    capability: "webgpu-diagnostic",
    readiness: {
      dataset: "webxrSpaceStorybook",
      value: "ready",
    },
    canvas: {
      id: "webxr-space-storybook-canvas",
      evidence: "non-black",
    },
    routeTree: UI_COMPONENT_GRAPH_ROUTES,
  }
}
