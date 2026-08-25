import {
  defineStorybookRouteTree,
  storybookRouteTreeUrl,
  type StorybookRouteTree,
} from "@zavx0z/storybook/route-tree"

export const CORE_STORYBOOK_BASE_PATH = "/core" as const
export const CORE_STORYBOOK_DETAIL_ROUTE = "live-node-tree" as const
export const CORE_STORYBOOK_ROUTE_TREE: StorybookRouteTree<typeof CORE_STORYBOOK_DETAIL_ROUTE> =
  defineStorybookRouteTree({leaves: [CORE_STORYBOOK_DETAIL_ROUTE] as const})
export const CORE_STORYBOOK_OVERVIEW_PATH = storybookRouteTreeUrl(
  CORE_STORYBOOK_ROUTE_TREE,
  "",
  {basePath: CORE_STORYBOOK_BASE_PATH},
)
export const CORE_STORYBOOK_DETAIL_PATH = storybookRouteTreeUrl(
  CORE_STORYBOOK_ROUTE_TREE,
  CORE_STORYBOOK_DETAIL_ROUTE,
  {basePath: CORE_STORYBOOK_BASE_PATH},
)
