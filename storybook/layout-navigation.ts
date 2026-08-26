import {storybookRouteTreeUrl} from "@zavx0z/storybook/route-tree"
import {LAYOUT_STORIES} from "./layout-stories.ts"

export const LAYOUT_STORYBOOK_BASE_PATH = "/layout" as const
export const LAYOUT_STORYBOOK_ROUTE_TREE = LAYOUT_STORIES.routeTree
export const LAYOUT_STORYBOOK_OVERVIEW_PATH = storybookRouteTreeUrl(
  LAYOUT_STORYBOOK_ROUTE_TREE,
  "",
  {basePath: LAYOUT_STORYBOOK_BASE_PATH},
)
export const LAYOUT_STORYBOOK_FIXED_PATH = storybookRouteTreeUrl(
  LAYOUT_STORYBOOK_ROUTE_TREE,
  "fixed/baseline/right",
  {basePath: LAYOUT_STORYBOOK_BASE_PATH},
)
export const LAYOUT_STORYBOOK_DAGRE_LAYERED_PATH = storybookRouteTreeUrl(
  LAYOUT_STORYBOOK_ROUTE_TREE,
  "dagre-layered/default/default",
  {basePath: LAYOUT_STORYBOOK_BASE_PATH},
)
export const LAYOUT_STORYBOOK_COFFMAN_GRAHAM_PATH = storybookRouteTreeUrl(
  LAYOUT_STORYBOOK_ROUTE_TREE,
  "coffman-graham/default/default",
  {basePath: LAYOUT_STORYBOOK_BASE_PATH},
)
