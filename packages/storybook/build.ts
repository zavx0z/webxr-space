import {dirname, join, resolve} from "node:path"
import {fileURLToPath} from "node:url"
import {
  buildStaticStorybook,
  readGitIdentity,
  type StorybookDependencyIdentity,
} from "@zavx0z/storybook/build"
import {normalizeStorybookBasePath} from "@zavx0z/storybook/environment"
import {writeUiComponentGraph} from "../../scripts/ui-component-graph.ts"
import {createStorybookApp, storybookStaticFiles} from "./app.ts"

const superprojectRoot = resolve(import.meta.dir, "../..")
await writeUiComponentGraph({superprojectRoot})
const publicBasePath = normalizeStorybookBasePath(Bun.env.STORYBOOK_BASE_PATH ?? "/webxr-space")
const manifest = await buildStaticStorybook({
  app: createStorybookApp({basePath: publicBasePath}),
  outputRoot: join(import.meta.dir, "dist"),
  source: await readGitIdentity(superprojectRoot),
  dependencies: await dependencyIdentities(),
  staticFiles: storybookStaticFiles(),
})

console.log(JSON.stringify({
  kind: "storybook-build",
  packageName: "@webxr-space/storybook",
  basePath: publicBasePath,
  pages: manifest.pages.length,
}))

async function dependencyIdentities(): Promise<readonly StorybookDependencyIdentity[]> {
  const inputs = [
    ["@engine/core", import.meta.resolve("@engine/core/default-font")],
    ["@layout/core", import.meta.resolve("@layout/core/runtime")],
    ["@nodes/layout", import.meta.resolve("@nodes/layout/coffman-graham")],
    ["@ui/elements", import.meta.resolve("@ui/elements/primitives")],
    ["@ui/components", import.meta.resolve("@ui/components/pane")],
    ["@zavx0z/highlighter", import.meta.resolve("@zavx0z/highlighter")],
    ["@zavx0z/storybook", import.meta.resolve("@zavx0z/storybook/app")],
  ] as const
  return Object.freeze(await Promise.all(inputs.map(async ([name, entry]) => ({
    name,
    ...await readGitIdentity(dirname(fileURLToPath(entry))),
  }))))
}
