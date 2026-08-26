import {resolve} from "node:path"
import {startStorybookHubServer} from "@zavx0z/storybook/server"
import {writeUiComponentGraph} from "../scripts/ui-component-graph.ts"
import {createWebxrSpaceCatalogApp, webxrSpaceCatalogStaticFiles} from "./app.ts"

const superprojectRoot = resolve(import.meta.dir, "..")
await writeUiComponentGraph({superprojectRoot})

const port = Number.parseInt(process.env.WEBXR_SPACE_CATALOG_PORT ?? "4015", 10)
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error(`Invalid WEBXR_SPACE_CATALOG_PORT: ${process.env.WEBXR_SPACE_CATALOG_PORT}`)
}

startStorybookHubServer({
  app: createWebxrSpaceCatalogApp(),
  hostname: "127.0.0.1",
  port,
  staticFiles: webxrSpaceCatalogStaticFiles(superprojectRoot),
})

console.log(`[webxr-space catalog] http://127.0.0.1:${port}/ui/component-graph`)
