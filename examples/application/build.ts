import {resolve} from "node:path"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"

const root = resolve(import.meta.dir, "../..")
export const buildApplication = async (outdir = resolve(import.meta.dir, "dist")) => {
  const manifest = await Bun.file(resolve(root, "package.json")).json() as {workspaces: string[]}
  const result = await Bun.build({
    entrypoints: [resolve(import.meta.dir, "main.tsx")],
    outdir,
    target: "browser",
    format: "esm",
    minify: true,
    loader: {".wgsl": "text"},
    plugins: [createTemplateJsxBunPlugin({
      cwd: root,
      sourceRoots: [import.meta.dir, ...manifest.workspaces.map(directory => resolve(root, directory))],
    })],
  })
  if (!result.success) throw new AggregateError(result.logs, "Application build failed")
  await Bun.write(resolve(outdir, "index.html"), Bun.file(resolve(import.meta.dir, "index.html")))
  await Bun.write(resolve(outdir, "inter-regular.ttf"), Bun.file(resolve(root, "engine/static/fonts/inter-regular.ttf")))
  return outdir
}

if (import.meta.main) console.log(await buildApplication())
