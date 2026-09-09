import {resolve} from "node:path"

// Loads the pre-optimization modules in memory. The checkout, branch and files stay unchanged.
const root = resolve(import.meta.dir, "../..")
const revision = Bun.argv[2] ?? "158f27a"
const paths = [
  "renderer/html/src/renderer.ts",
  "renderer/html/src/interaction.ts",
  "renderer/html/src/projection-hit.ts",
  "renderer/html/src/immutable-array.ts",
  "webgpu/src/webgpu-backend.ts",
]
const sources = new Map<string, string>()
for (const path of paths) {
  const result = Bun.spawnSync({cmd: ["git", "show", `${revision}:${path}`], cwd: root, stdout: "pipe", stderr: "pipe"})
  if (result.exitCode !== 0) throw new Error(new TextDecoder().decode(result.stderr))
  sources.set(resolve(root, path), new TextDecoder().decode(result.stdout))
}
Bun.plugin({
  name: "reference-scroll-modules",
  setup(builder) {
    for (const [path, contents] of sources) {
      builder.onLoad({filter: new RegExp(`^${RegExp.escape(path)}$`)}, () => ({contents, loader: "ts"}))
    }
  },
})
console.log(JSON.stringify({referenceRevision: revision, bun: Bun.version}))
await import("./text-scroll.ts")
