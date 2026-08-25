import {
  defineStorybookRouteTree,
  storybookRouteTreeUrl,
  type StorybookRouteTree,
} from "@zavx0z/storybook/route-tree"

export const WORKER_STORYBOOK_BASE_PATH = "/worker" as const
export const WORKER_STORYBOOK_DETAIL_ROUTE = "protocol" as const
export const WORKER_STORYBOOK_ROUTE_TREE: StorybookRouteTree<typeof WORKER_STORYBOOK_DETAIL_ROUTE> =
  defineStorybookRouteTree({leaves: [WORKER_STORYBOOK_DETAIL_ROUTE] as const})
export const WORKER_STORYBOOK_OVERVIEW_PATH = storybookRouteTreeUrl(
  WORKER_STORYBOOK_ROUTE_TREE,
  "",
  {basePath: WORKER_STORYBOOK_BASE_PATH},
)
export const WORKER_STORYBOOK_DETAIL_PATH = storybookRouteTreeUrl(
  WORKER_STORYBOOK_ROUTE_TREE,
  WORKER_STORYBOOK_DETAIL_ROUTE,
  {basePath: WORKER_STORYBOOK_BASE_PATH},
)
