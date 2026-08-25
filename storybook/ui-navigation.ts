import {
  defineStorybookRouteTree,
} from "@zavx0z/storybook/route-tree"
import type {StorybookNavigationItem} from "@zavx0z/storybook/workbench"
import type {StorybookStoryIndexItem} from "@zavx0z/storybook/stories"
import {
  NODE_COMPONENT_STORIES,
  NODE_COMPONENT_STORY_ROUTES,
  NODE_SOCKET_STORIES,
  NODE_SOCKET_STORY_ROUTES,
  isNodeComponentStoryRoute,
  isNodeSocketStoryRoute,
  type NodeComponentStoryRoute,
  type NodeSocketStoryRoute,
} from "./ui-story-catalog.ts"
import {NODE_PARAMETER_FALLBACK_ROUTE} from "./parameter-catalog.ts"

export const NODE_UI_STORYBOOK_BASE_PATH = "/ui" as const

export const NODE_STORYBOOK_ROUTES = Object.freeze([
  ...NODE_COMPONENT_STORY_ROUTES,
  ...NODE_SOCKET_STORY_ROUTES,
])

export type NodeStorybookStoryRoute = NodeComponentStoryRoute | NodeSocketStoryRoute
export type NodeStorybookRoute = string
export type NodeStorybookGroup = "overview" | "editor" | "parameter" | "socket" | "comparison"
type NodeStorybookCatalogGroup = "editor" | "components" | "comparison"

const NODE_STORYBOOK_GROUP_LABELS = Object.freeze({
  editor: "Редактор",
  components: "Компоненты",
  comparison: "Сравнение",
} satisfies Readonly<Record<NodeStorybookCatalogGroup, string>>)

/** Canonical package route hierarchy: root overview, prefix overviews and leaves. */
export const NODE_STORYBOOK_ROUTE_TREE = defineStorybookRouteTree({
  leaves: NODE_STORYBOOK_ROUTES,
})
export const NODE_STORYBOOK_FALLBACK_ROUTE = NODE_PARAMETER_FALLBACK_ROUTE

const COMPONENT_ROUTES = Object.freeze({
  "node-editor": "node-editor",
  frame: "frame",
  parameter: "parameter",
  link: "link",
  socket: "socket",
  comparison: "comparison",
} satisfies Readonly<Record<string, NodeStorybookRoute>>)

export const NODE_STORYBOOK_CATALOG: readonly StorybookNavigationItem<NodeStorybookRoute>[] = [
  {
    id: "node-editor",
    label: "Редактор нод",
    route: COMPONENT_ROUTES["node-editor"],
    group: {id: "editor", label: NODE_STORYBOOK_GROUP_LABELS.editor},
  },
  {
    id: "frame",
    label: "Frame",
    route: COMPONENT_ROUTES.frame,
    group: {id: "editor", label: NODE_STORYBOOK_GROUP_LABELS.editor},
  },
  {
    id: "link",
    label: "Link",
    route: COMPONENT_ROUTES.link,
    group: {id: "editor", label: NODE_STORYBOOK_GROUP_LABELS.editor},
  },
  {
    id: "parameter",
    label: "Параметры",
    route: COMPONENT_ROUTES.parameter,
    group: {id: "components", label: NODE_STORYBOOK_GROUP_LABELS.components},
  },
  {
    id: "socket",
    label: "Сокеты",
    route: COMPONENT_ROUTES.socket,
    group: {id: "components", label: NODE_STORYBOOK_GROUP_LABELS.components},
  },
  {
    id: "comparison",
    label: "Сравнение",
    route: COMPONENT_ROUTES.comparison,
    group: {id: "comparison", label: NODE_STORYBOOK_GROUP_LABELS.comparison},
  },
]

const STORY_INDEX = Object.freeze([
  ...NODE_COMPONENT_STORIES.index,
  ...NODE_SOCKET_STORIES.index,
])

export function nodeStorybookGroup(route: NodeStorybookRoute): NodeStorybookGroup {
  const componentId = nodeStorybookComponentId(route)
  if (componentId === null) return "overview"
  if (componentId === "parameter") return "parameter"
  if (componentId === "socket") return "socket"
  if (componentId === "comparison") return "comparison"
  return "editor"
}

export function nodeStorybookCatalog(
  _route: NodeStorybookRoute,
  collapsedGroups: ReadonlySet<string> = new Set(),
): readonly StorybookNavigationItem<NodeStorybookRoute>[] {
  return NODE_STORYBOOK_CATALOG.map((item) => ({
    ...item,
    ...(item.group === undefined ? {} : {group: {
      ...item.group,
      ...(collapsedGroups.has(item.group.id) ? {collapsed: true} : {}),
    }}),
  }))
}

export function nodeStorybookSections(
  route: NodeStorybookRoute,
): readonly StorybookNavigationItem<NodeStorybookRoute>[] {
  const componentId = nodeStorybookComponentId(route)
  if (componentId === null) return Object.freeze([])
  return NODE_STORYBOOK_ROUTE_TREE.children(componentId).map((node) => ({
    id: node.segment,
    label: nodeStorybookRouteLabel(node.path),
    route: node.path,
  }))
}

export function nodeStorybookDockItems(
  route: NodeStorybookRoute,
): readonly StorybookNavigationItem<NodeStorybookRoute>[] {
  const sectionPath = nodeStorybookSectionRoute(route)
  if (sectionPath === null) return Object.freeze([])
  return NODE_STORYBOOK_ROUTE_TREE.children(sectionPath).map((node) => ({
    id: node.segment,
    label: nodeStorybookRouteLabel(node.path),
    route: node.path,
  }))
}

export function nodeStorybookCatalogRoute(route: NodeStorybookRoute): NodeStorybookRoute {
  return nodeStorybookComponentId(route) ?? ""
}

export function nodeStorybookSectionRoute(route: NodeStorybookRoute): NodeStorybookRoute | null {
  const segments = routeSegments(route)
  if (segments.length < 2) return null
  return segments.slice(0, 2).join("/")
}

export function nodeStorybookSectionTitle(route: NodeStorybookRoute): string {
  const componentId = nodeStorybookComponentId(route)
  return componentId === null ? "Разделы" : nodeStorybookRouteLabel(componentId)
}

export function nodeStorybookDockTitle(route: NodeStorybookRoute): string {
  return nodeStorybookComponentId(route) === "socket" ? "Направление" : "Варианты"
}

export function nodeStorybookWorkbenchStoryRoute(route: NodeStorybookRoute): NodeStorybookStoryRoute {
  const node = NODE_STORYBOOK_ROUTE_TREE.find(route)
  if (node === undefined) throw new Error(`Unknown Node storybook route: ${route}`)
  if (node.kind === "leaf") return node.path as NodeStorybookStoryRoute
  const prefix = node.path.length === 0 ? "" : `${node.path}/`
  if (NODE_STORYBOOK_FALLBACK_ROUTE.startsWith(prefix)) return NODE_STORYBOOK_FALLBACK_ROUTE
  const descendant = NODE_STORYBOOK_ROUTE_TREE.leaves.find((leaf) => leaf.startsWith(prefix))
  if (descendant === undefined) throw new Error(`Node storybook overview has no detail descendant: ${route}`)
  return descendant as NodeStorybookStoryRoute
}

export async function loadNodeStorybookStory(route: NodeStorybookRoute) {
  if (isNodeSocketStoryRoute(route)) return NODE_SOCKET_STORIES.load(route)
  if (isNodeComponentStoryRoute(route)) return NODE_COMPONENT_STORIES.load(route)
  throw new Error(`Node storybook route is not a detail story: ${route}`)
}

export function nodeStorybookStoryIndex(route: NodeStorybookRoute): StorybookStoryIndexItem {
  const story = STORY_INDEX.find((item) => item.route === route)
  if (story === undefined) throw new Error(`Node storybook route is not a detail story: ${route}`)
  return story
}

export function isNodeEditorStoryRoute(route: NodeStorybookRoute): route is NodeComponentStoryRoute {
  return isNodeComponentStoryRoute(route) && nodeStorybookStoryIndex(route).componentId === "node-editor"
}

export function isNodeFrameStoryRoute(route: NodeStorybookRoute): route is NodeComponentStoryRoute {
  return isNodeComponentStoryRoute(route) && nodeStorybookStoryIndex(route).componentId === "frame"
}

export function isNodeParameterStoryRoute(route: NodeStorybookRoute): route is NodeComponentStoryRoute {
  return isNodeComponentStoryRoute(route) && nodeStorybookStoryIndex(route).componentId === "parameter"
}

export function isNodeLinkStoryRoute(route: NodeStorybookRoute): route is NodeComponentStoryRoute {
  return isNodeComponentStoryRoute(route) && nodeStorybookStoryIndex(route).componentId === "link"
}

function nodeStorybookComponentId(route: NodeStorybookRoute): string | null {
  const componentId = routeSegments(route)[0]
  return componentId !== undefined && NODE_STORYBOOK_CATALOG.some(({id}) => id === componentId)
    ? componentId
    : null
}

function nodeStorybookRouteLabel(route: NodeStorybookRoute): string {
  const segments = routeSegments(route)
  if (segments.length === 0) return "Компоненты @nodes/ui"
  if (segments.length === 1) {
    return NODE_STORYBOOK_CATALOG.find(({id}) => id === segments[0])?.label ?? segments[0]!
  }
  const story = firstStoryUnder(route)
  if (segments.length === 2) return story?.sectionLabel ?? segments[1]!
  return story?.variantLabel ?? segments.at(-1)!
}

function firstStoryUnder(route: NodeStorybookRoute): StorybookStoryIndexItem | undefined {
  return STORY_INDEX.find((story) => story.route === route || story.route.startsWith(`${route}/`))
}

function routeSegments(route: NodeStorybookRoute): readonly string[] {
  return route === "" ? Object.freeze([]) : Object.freeze(route.split("/"))
}
