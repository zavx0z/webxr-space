import {resolveStorybookRouteTree} from "@zavx0z/storybook/route-tree"
import {storybookPublicPath} from "@zavx0z/storybook/environment"
import {
  CORE_STORYBOOK_BASE_PATH,
  CORE_STORYBOOK_ROUTE_TREE,
} from "./core-navigation.ts"

document.documentElement.dataset.nodesStorybook = "starting"
document.documentElement.dataset.nodesStorybookPage = "core"

const resolution = resolveStorybookRouteTree(
  CORE_STORYBOOK_ROUTE_TREE,
  window.location,
  {basePath: storybookPublicPath("node", CORE_STORYBOOK_BASE_PATH)},
)
if (resolution.kind === "not-found") throw new Error(`Unknown core storybook route: ${window.location.pathname}`)
document.documentElement.dataset.nodesStorybookRouteKind = resolution.node.kind
await import("./core-detail.ts")
