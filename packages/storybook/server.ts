import {resolve} from "node:path"
import {startStorybookPackageServer} from "@zavx0z/storybook/server"
import {writeUiComponentGraph} from "../../scripts/ui-component-graph.ts"
import {createStorybookApp, storybookStaticFiles} from "./app.ts"

await writeUiComponentGraph({superprojectRoot: resolve(import.meta.dir, "../..")})

startStorybookPackageServer({
  app: createStorybookApp(),
  staticFiles: storybookStaticFiles(),
})
