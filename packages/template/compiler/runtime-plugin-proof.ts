import {resolve} from "node:path"
import {pathToFileURL} from "node:url"
import * as compiledRuntime from "../compiled.ts"

const adapterPath = resolve(process.argv[2] ?? "compiler/bun.ts")
const sourcePath = resolve(process.argv[3] ?? "compiler/test-fixture/application.tsx")
const {createTemplateJsxBunPlugin} = await import(pathToFileURL(adapterPath).href)

Bun.plugin({
  name: "template-runtime-proof-modules",
  setup(builder) {
    builder.module("@zavx0z/template/compiled", () => ({
      exports: compiledRuntime,
      loader: "object",
    }))
    builder.module("@zavx0z/react", () => ({
      exports: {
        component: () => {
          throw new Error("component helper must not run while defining an intrinsic-only template")
        },
        keyedComponents: () => {
          throw new Error("keyed helper must not run while defining an intrinsic-only template")
        },
      },
      loader: "object",
    }))
  },
})
Bun.plugin(createTemplateJsxBunPlugin({
  cwd: resolve(sourcePath, ".."),
  persistent: true,
  sourceRoots: [sourcePath],
}))

const authored = await import(`${pathToFileURL(sourcePath).href}?runtime-proof=${Date.now()}`)
if (!compiledRuntime.isCompiledTemplate(authored.Badge)) {
  throw new Error("runtime Bun plugin did not compile Badge into a CompiledTemplate")
}
console.log(JSON.stringify({displayName: authored.Badge.displayName, ok: true}))
process.exit(0)
