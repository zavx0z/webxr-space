import {resolveStorybookRouteTree} from "@zavx0z/storybook/route-tree"
import {storybookPublicPath} from "@zavx0z/storybook/environment"
import {
  LAYOUT_STORYBOOK_BASE_PATH,
  LAYOUT_STORYBOOK_ROUTE_TREE,
} from "./layout-navigation.ts"

document.documentElement.dataset.nodesStorybook = "starting"
document.documentElement.dataset.nodesStorybookPage = "layout"
document.documentElement.dataset.nodesLayoutStorybook = "starting"

const resolution = resolveStorybookRouteTree(
  LAYOUT_STORYBOOK_ROUTE_TREE,
  window.location,
  {basePath: storybookPublicPath("node", LAYOUT_STORYBOOK_BASE_PATH)},
)
if (resolution.kind === "not-found") throw new Error(`Неизвестный route стенда раскладки: ${window.location.pathname}`)
document.documentElement.dataset.nodesStorybookRouteKind = resolution.node.kind
await import("./layout-detail.ts")
