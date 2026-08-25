import {UiRuntime} from "@layout/core/runtime"
import {storybookPublicPath} from "@zavx0z/storybook/environment"
import {StorybookRouteTreeRouter} from "@zavx0z/storybook/route-tree"
import type {StorybookStoryArgs} from "@zavx0z/storybook/stories"
import {
  StorybookBackdropSurface,
  StorybookDockSurface,
  StorybookNavigationSurface,
  StorybookStoryPanelSurface,
  planStorybookShell,
  type StorybookStoryPanelMode,
  type StorybookStoryPanelOptions,
} from "@zavx0z/storybook/workbench"
import {LAYOUT_STORYBOOK_BASE_PATH} from "./layout-navigation.ts"
import {LayoutStoryPreviewSurface} from "./layout-preview-surface.ts"
import {
  LAYOUT_STORIES,
  layoutCatalogItems,
  layoutComponentPath,
  layoutSectionItems,
  layoutSectionPath,
  layoutStoryIndex,
  layoutStoryRoute,
  layoutVariantItems,
} from "./layout-stories.ts"

const canvas = document.getElementById("nodes-storybook-canvas")
if (!(canvas instanceof HTMLCanvasElement)) throw new Error("Layout Storybook canvas not found")

document.documentElement.dataset.nodesStorybook = "starting"
document.documentElement.dataset.nodesStorybookPage = "layout"
document.documentElement.dataset.nodesLayoutStorybook = "starting"

try {
  const runtime = await UiRuntime.create(canvas, {
    virtualDisplay: {initial: "near", surfaceDisplay: true, grid: false},
  })
  const router = new StorybookRouteTreeRouter(LAYOUT_STORIES.routeTree, {
    basePath: storybookPublicPath("node", LAYOUT_STORYBOOK_BASE_PATH),
  })
  let storyRoute = layoutStoryRoute(router.current.path)
  let storyIndex = layoutStoryIndex(storyRoute)
  let storyModule = await LAYOUT_STORIES.load(storyRoute)
  let storyArgs: StorybookStoryArgs = Object.freeze({...storyModule.defaultArgs})
  let storyPanelMode: StorybookStoryPanelMode = "controls"
  let storyRevision = 0
  let controlChanges = 0
  let catalogQuery = ""
  let collapsedCatalogGroups = new Set<string>()

  const navigate = (path: string): void => {
    if (!router.go(path)) throw new Error(`Unknown Layout Storybook route: ${path}`)
  }
  const backdrop = new StorybookBackdropSurface()
  const catalog = new StorybookNavigationSurface<string>({
    title: "Политики раскладки",
    items: layoutCatalogItems(collapsedCatalogGroups),
    route: layoutComponentPath(router.current.path),
    onNavigate: navigate,
    query: catalogQuery,
    searchPlaceholder: "Policy, направление, API…",
    onQueryChange: handleCatalogQuery,
    onGroupToggle: handleCatalogGroupToggle,
  })
  const sections = new StorybookNavigationSurface<string>({
    title: storyIndex.componentLabel,
    items: layoutSectionItems(storyRoute),
    route: layoutSectionPath(router.current.path),
    onNavigate: navigate,
  })
  const preview = new LayoutStoryPreviewSurface()
  preview.setStory(storyIndex, storyModule, storyArgs)
  const dock = new StorybookDockSurface<string>({
    title: "Сценарии",
    items: layoutVariantItems(storyRoute),
    route: router.current.kind === "leaf" ? router.current.path : "",
    onNavigate: navigate,
  })
  let storyPanel: StorybookStoryPanelSurface

  const storyPanelOptions = (): StorybookStoryPanelOptions => ({
    source: storyModule.source(storyArgs),
    args: storyArgs,
    controls: storyModule.controls,
    events: [
      {id: "route", label: "Сценарий", value: storyRoute},
      {id: "policy", label: "Policy", value: storyIndex.apiName},
      {id: "changes", label: "Изменения", value: String(controlChanges)},
    ],
    mode: storyPanelMode,
    onModeChange(mode) {
      storyPanelMode = mode
      storyPanel.setOptions(storyPanelOptions())
      publish()
    },
    onControlChange(key, value) {
      storyArgs = Object.freeze({...storyArgs, [key]: value})
      controlChanges += 1
      preview.setArgs(storyArgs)
      storyPanel.setOptions(storyPanelOptions())
      publish()
    },
    async onCopy(source) {
      try {
        await navigator.clipboard.writeText(source)
        document.documentElement.dataset.nodesLayoutStoryCopy = "copied"
      } catch {
        document.documentElement.dataset.nodesLayoutStoryCopy = "error"
      }
    },
  })
  storyPanel = new StorybookStoryPanelSurface(storyPanelOptions())

  const frames = (width: number, height: number) => planStorybookShell(width, height, {
    responsive: {
      compactBelow: 980,
      compactPanels: ["catalog", "section", "dock", "info"],
    },
  })
  runtime.addSurface(backdrop, ({w, h}) => ({x: 0, y: 0, w, h}))
  runtime.addSurface(catalog, ({w, h}) => frames(w, h).catalog)
  runtime.addSurface(sections, ({w, h}) => frames(w, h).section)
  runtime.addSurface(preview, ({w, h}) => frames(w, h).preview)
  runtime.addSurface(dock, ({w, h}) => frames(w, h).dock)
  runtime.addSurface(storyPanel, ({w, h}) => frames(w, h).info)

  function catalogOptions() {
    return {
      title: "Политики раскладки",
      items: layoutCatalogItems(collapsedCatalogGroups),
      route: layoutComponentPath(router.current.path),
      onNavigate: navigate,
      query: catalogQuery,
      searchPlaceholder: "Policy, направление, API…",
      onQueryChange: handleCatalogQuery,
      onGroupToggle: handleCatalogGroupToggle,
    }
  }

  function handleCatalogQuery(query: string): void {
    catalogQuery = query
    catalog.setOptions(catalogOptions())
    publish()
  }

  function handleCatalogGroupToggle(groupId: string, collapsed: boolean): void {
    collapsedCatalogGroups = new Set(collapsedCatalogGroups)
    if (collapsed) collapsedCatalogGroups.add(groupId)
    else collapsedCatalogGroups.delete(groupId)
    catalog.setOptions(catalogOptions())
    publish()
  }

  async function applyPath(path: string): Promise<void> {
    const revision = ++storyRevision
    const nextRoute = layoutStoryRoute(path)
    const nextIndex = layoutStoryIndex(nextRoute)
    const nextModule = await LAYOUT_STORIES.load(nextRoute)
    if (revision !== storyRevision || router.current.path !== path) return
    storyRoute = nextRoute
    storyIndex = nextIndex
    storyModule = nextModule
    storyArgs = Object.freeze({...nextModule.defaultArgs})
    controlChanges = 0
    catalog.setOptions(catalogOptions())
    sections.setOptions({
      title: storyIndex.componentLabel,
      items: layoutSectionItems(storyRoute),
      route: layoutSectionPath(path),
      onNavigate: navigate,
    })
    dock.setOptions({
      title: "Сценарии",
      items: layoutVariantItems(storyRoute),
      route: router.current.kind === "leaf" ? path : "",
      onNavigate: navigate,
    })
    preview.setStory(storyIndex, storyModule, storyArgs)
    storyPanel.setOptions(storyPanelOptions())
    runtime.relayout()
    publish()
  }

  function publish(): void {
    for (const surface of [catalog, sections, preview, dock, storyPanel]) surface.flushPendingRender()
    document.documentElement.dataset.nodesLayoutStorybookRoute = router.current.path
    document.documentElement.dataset.nodesLayoutStoryRoute = storyRoute
    document.documentElement.dataset.nodesLayoutStorySource = storyModule.source(storyArgs)
    document.documentElement.dataset.nodesLayoutStoryArgs = JSON.stringify(storyArgs)
    document.documentElement.dataset.nodesLayoutStorybookRetained = JSON.stringify({
      catalog: catalog.diagnostics,
      sections: sections.diagnostics,
      dock: dock.diagnostics,
      panel: storyPanel.diagnostics,
    })
    runtime.space.updateWorldMatrix()
    runtime.renderer.renderFrame(runtime.space, runtime.hud, runtime.viewPoint)
  }

  router.subscribe((node) => {
    void applyPath(node.path).catch(publishLayoutError)
  })
  new ResizeObserver(() => {
    runtime.handleResize()
    publish()
  }).observe(canvas)
  runtime.handleResize()
  await applyPath(router.current.path)
  publish()
  document.documentElement.dataset.nodesLayoutStorybook = "ready"
  document.documentElement.dataset.nodesStorybook = "ready"
} catch (error) {
  publishLayoutError(error)
  throw error
}

function publishLayoutError(error: unknown): void {
  document.documentElement.dataset.nodesLayoutStorybook = "error"
  document.documentElement.dataset.nodesStorybook = "error"
  document.documentElement.dataset.nodesLayoutStorybookError = error instanceof Error
    ? error.stack ?? error.message
    : String(error)
}
