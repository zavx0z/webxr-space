import {
  defineStorybookRouteTree,
  storybookRouteTreeUrl,
} from "@zavx0z/storybook/route-tree"

export const NODE_EDITOR_STORYBOOK_BASE_PATH = "/editor" as const
export const NODE_EDITOR_STORYBOOK_ROUTE = "live-node-tree" as const
export const NODE_EDITOR_STORYBOOK_ROUTE_TREE = defineStorybookRouteTree({
  leaves: [NODE_EDITOR_STORYBOOK_ROUTE] as const,
})
export const NODE_EDITOR_STORYBOOK_OVERVIEW_PATH = storybookRouteTreeUrl(NODE_EDITOR_STORYBOOK_ROUTE_TREE, "", {
  basePath: NODE_EDITOR_STORYBOOK_BASE_PATH,
})
export const NODE_EDITOR_STORYBOOK_PATH = storybookRouteTreeUrl(NODE_EDITOR_STORYBOOK_ROUTE_TREE, NODE_EDITOR_STORYBOOK_ROUTE, {
  basePath: NODE_EDITOR_STORYBOOK_BASE_PATH,
})
export const NODE_EDITOR_STORYBOOK_READY_MARKER = Object.freeze({
  dataset: "nodesStorybook",
  value: "ready",
})

export type NodeEditorStorybookRoute = typeof NODE_EDITOR_STORYBOOK_ROUTE
