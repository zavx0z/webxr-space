import {
  defineStorybookRouteTree,
  storybookRouteTreeUrl,
  type StorybookRouteTree,
} from "@zavx0z/storybook/route-tree"

export const LAYOUT_STORYBOOK_BASE_PATH = "/layout" as const
export const LAYOUT_STORYBOOK_DETAIL_ROUTE = "fixed-adaptive" as const
export const LAYOUT_STORYBOOK_ROUTE_TREE: StorybookRouteTree<typeof LAYOUT_STORYBOOK_DETAIL_ROUTE> =
  defineStorybookRouteTree({leaves: [LAYOUT_STORYBOOK_DETAIL_ROUTE] as const})
export const LAYOUT_STORYBOOK_OVERVIEW_PATH = storybookRouteTreeUrl(
  LAYOUT_STORYBOOK_ROUTE_TREE,
  "",
  {basePath: LAYOUT_STORYBOOK_BASE_PATH},
)
export const LAYOUT_STORYBOOK_DETAIL_PATH = storybookRouteTreeUrl(
  LAYOUT_STORYBOOK_ROUTE_TREE,
  LAYOUT_STORYBOOK_DETAIL_ROUTE,
  {basePath: LAYOUT_STORYBOOK_BASE_PATH},
)
