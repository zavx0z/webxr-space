import {resolve} from "node:path"
import {buildStaticStorybook, readGitIdentity} from "@zavx0z/storybook/build"
import {writeUiComponentGraph} from "../scripts/ui-component-graph.ts"
import {createWebxrSpaceCatalogApp, webxrSpaceCatalogStaticFiles} from "./app.ts"

const superprojectRoot = resolve(import.meta.dir, "..")
await writeUiComponentGraph({superprojectRoot})

const dependencyRoots = Object.freeze([
  ["@engine/core", resolve(superprojectRoot, "projects/engine")],
  ["@layout/core", resolve(superprojectRoot, "projects/layout")],
  ["@ui/workspace", resolve(superprojectRoot, "projects/ui")],
  ["@nodes/layout", resolve(superprojectRoot, "projects/node")],
  ["@zavx0z/highlighter", resolve(superprojectRoot, "../highlighter")],
  ["@zavx0z/storybook", resolve(superprojectRoot, "../storybook")],
] as const)

const manifest = await buildStaticStorybook({
  app: createWebxrSpaceCatalogApp({publicBasePath: "/webxr-space"}),
  outputRoot: resolve(import.meta.dir, "dist"),
  source: await readGitIdentity(superprojectRoot),
  dependencies: await Promise.all(dependencyRoots.map(async ([name, root]) => ({
    name,
    ...await readGitIdentity(root),
  }))),
  staticFiles: webxrSpaceCatalogStaticFiles(superprojectRoot),
})

console.log(`[webxr-space catalog] built ${manifest.pages.length} page with ${manifest.assets.length} assets`)
