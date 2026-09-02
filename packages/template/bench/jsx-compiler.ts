import {resolve} from "node:path"
import {JsxCompilerSession} from "../compiler/session.ts"

const sourcePath = resolve(process.argv[2] ?? "compiler/test-fixture/application.tsx")
const cachedRuns = Number.parseInt(process.argv[3] ?? "100", 10)
if (!Number.isSafeInteger(cachedRuns) || cachedRuns <= 0) throw new Error("cached runs must be positive")

const session = new JsxCompilerSession({
  cwd: process.cwd(),
  sourceRoots: [sourcePath]
})
const coldStartedAt = performance.now()
const output = await session.transformFile(sourcePath)
const coldMs = performance.now() - coldStartedAt
const warmStartedAt = performance.now()
for (let index = 0; index < cachedRuns; index += 1) await session.transformFile(sourcePath)
const warmMs = performance.now() - warmStartedAt

console.log(JSON.stringify({
  benchmark: "template-jsx-compiler",
  sourcePath,
  emittedBytes: Buffer.byteLength(output),
  coldMs,
  cachedRuns,
  cachedTotalMs: warmMs,
  cachedMeanMs: warmMs / cachedRuns,
  stats: session.stats,
}))

await session.close()
