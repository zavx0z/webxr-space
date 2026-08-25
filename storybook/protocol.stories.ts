import {resolveStorybookRouteTree} from "@zavx0z/storybook/route-tree"
import {storybookPublicPath} from "@zavx0z/storybook/environment"
import {
  WORKER_STORYBOOK_BASE_PATH,
  WORKER_STORYBOOK_ROUTE_TREE,
} from "./worker-navigation.ts"

document.documentElement.dataset.nodesStorybook = "starting"
document.documentElement.dataset.nodesStorybookPage = "worker"

const resolution = resolveStorybookRouteTree(
  WORKER_STORYBOOK_ROUTE_TREE,
  window.location,
  {basePath: storybookPublicPath("node", WORKER_STORYBOOK_BASE_PATH)},
)
if (resolution.kind === "not-found") {
  throw new Error(`Unknown worker storybook route: ${window.location.pathname}`)
}
document.documentElement.dataset.nodesStorybookRouteKind = resolution.node.kind
await import("./worker-detail.ts")
