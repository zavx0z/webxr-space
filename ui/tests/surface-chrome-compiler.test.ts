import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {JsxCompilerSession} from "@zavx0z/template/compiler"

const root = resolve(import.meta.dir, "../..")
const uiRoot = resolve(root, "ui")

test("[UI-COMPILED-SURFACE-001] shared surface chrome is governed TSX rather than CSS transport", async () => {
  const sharedPath = resolve(uiRoot, "src/shared/surface-chrome.tsx")
  const sharedSource = await Bun.file(sharedPath).text()
  for (const owner of [
    "SurfaceOwner",
    "SurfaceHeader",
    "SurfaceTitle",
    "SurfaceNavigation",
    "SurfaceBody",
    "SurfaceButton",
  ]) {
    expect(sharedSource).toContain(`export function ${owner}(`)
  }
  expect(sharedSource).not.toMatch(/export const surface\w*Css/u)

  const compiler = new JsxCompilerSession({cwd: root, sourceRoots: [uiRoot]})
  try {
    for (const relativePath of [
      "surfaces/window.tsx",
      "surfaces/frame.tsx",
      "views/timeline.tsx",
    ]) {
      const result = await compiler.compileFile(resolve(uiRoot, relativePath))
      expect(result.code).toContain('from "@zavx0z/component"')
    }
  } finally {
    await compiler.close()
  }
}, 30_000)
