import {expect, test} from "bun:test"
import {resolve} from "node:path"

const layoutRoot = resolve(import.meta.dir, "..")

test("[LAYOUT-STATIC-001] dev catalog CSS is absent from the production package", async () => {
  const packageJson = await Bun.file(resolve(layoutRoot, "package.json")).json()

  expect(packageJson.sideEffects).toBe(false)
  expect(packageJson.exports["./layout-presentation.css"]).toBeUndefined()
  expect(packageJson.exports["./worker/worker-protocol.css"]).toBeUndefined()
  expect(await Bun.file(resolve(layoutRoot, "layout-presentation.css")).exists()).toBe(false)
  expect(await Bun.file(resolve(layoutRoot, "worker/worker-protocol.css")).exists()).toBe(false)
})
