import {expect, test} from "bun:test"
import {resolve} from "node:path"

test("[SPC-005] Space не владеет Canvas, native input и frame lifecycle", async () => {
  const root = resolve(import.meta.dir, "..")
  const sources: string[] = []
  for await (const relativePath of new Bun.Glob("**/*.{ts,tsx}").scan({cwd: root})) {
    if (relativePath.startsWith("tests/")) continue
    sources.push(await Bun.file(resolve(root, relativePath)).text())
  }
  const source = sources.join("\n")

  expect(source).not.toContain("HTMLCanvasElement")
  expect(source).not.toContain("requestAnimationFrame")
  expect(source).not.toContain("@zavx0z/browser")
  expect(source).not.toContain("@zavx0z/webgpu")
})
