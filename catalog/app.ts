import {join} from "node:path"
import {
  defineStorybookApp,
  type StorybookAppManifest,
  type StorybookStaticFile,
} from "@zavx0z/storybook/app"
import {defineStorybookRouteTree} from "@zavx0z/storybook/route-tree"

export type WebxrSpaceCatalogAppOptions = Readonly<{
  publicBasePath?: string
}>

const CATALOG_ROUTES = defineStorybookRouteTree({leaves: ["ui/component-graph"]})

export function createWebxrSpaceCatalogApp(
  options: WebxrSpaceCatalogAppOptions = {},
): StorybookAppManifest {
  return defineStorybookApp({
    id: "webxr-space",
    title: "webxr-space · UI component graph",
    basePath: options.publicBasePath ?? "",
    home: {path: "/", label: "Главная", ariaLabel: "На главную webxr-space"},
    footer: {
      lead: "Создано для",
      owner: {label: "webxr-space", href: "https://github.com/zavx0z/webxr-space"},
      detail: "живой UI component graph",
    },
    head: {meta: [{
      kind: "public-path",
      name: "engine-default-font",
      path: "/fonts/jetbrains-mono-bold.ttf",
    }]},
    pages: [{
      id: "ui-component-graph",
      title: "UI component graph",
      mountPath: "/",
      entrypoint: join(import.meta.dir, "entry.ts"),
      stylePath: join(import.meta.dir, "style.css"),
      body: {kind: "canvas", canvasId: "webxr-space-canvas"},
      capability: "webgpu-diagnostic",
      readiness: {dataset: "webxrSpaceCatalog", value: "ready"},
      canvas: {id: "webxr-space-canvas", evidence: "non-black"},
      routeTree: CATALOG_ROUTES,
    }],
  })
}

export function webxrSpaceCatalogStaticFiles(superprojectRoot: string): readonly StorybookStaticFile[] {
  return Object.freeze([{
    publicPath: "/fonts/jetbrains-mono-bold.ttf",
    sourcePath: join(superprojectRoot, "projects/engine/packages/core/static/fonts/jetbrains-mono-bold.ttf"),
  }])
}
