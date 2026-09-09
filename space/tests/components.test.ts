import {describe, expect, test} from "bun:test"
import {resolve} from "node:path"
import {JsxCompilerSession} from "@zavx0z/template/compiler"

const root = resolve(import.meta.dir, "../..")
const spaceRoot = resolve(root, "space")

const owners = Object.freeze([
  ["gizmos/grid.tsx", "xr-line-segments"],
  ["abstractions/asset.tsx", "xr-asset"],
  ["abstractions/group.tsx", "xr-group"],
  ["shapes/mesh.tsx", "xr-mesh"],
  ["shapes/line.tsx", "xr-line"],
  ["shapes/line-segments.tsx", "xr-line-segments"],
  ["abstractions/text.tsx", "xr-text"],
  ["staging/light.tsx", "xr-light"],
  ["abstractions/animation.tsx", "xr-animation"],
  ["shapes/geometry.tsx", "xr-geometry"],
  ["shaders/material.tsx", "xr-material"],
  ["portals/hud.tsx", "xr-hud"],
] as const)

describe("Публичные пространственные компоненты", () => {
  test("компоненты экспортируются из разделов без плоских дублей", async () => {
    const manifest = await Bun.file(resolve(spaceRoot, "package.json")).json()
    const components = Object.entries(manifest.exports as Record<string, string>).filter(([, path]) => path.endsWith(".tsx"))
    expect(manifest.exports["./gizmos/grid"]).toBe("./gizmos/grid.tsx")
    expect(components.every(([path]) => path.split("/").length === 3)).toBe(true)
    expect(new Set(components.map(([, path]) => path)).size).toBe(components.length)
    expect([...new Bun.Glob("*.tsx").scanSync({cwd: spaceRoot})]).toEqual([])
  })

  test("[SPC-001] каждый Component создаёт точный semantic Element", async () => {
    const compiler = new JsxCompilerSession({cwd: root, sourceRoots: [spaceRoot]})
    try {
      for (const [file, tagName] of owners) {
        const result = await compiler.compileFile(resolve(spaceRoot, file))
        expect(result.code).toContain(`document.createElement("${tagName}")`)
        expect(result.code).toContain('from "@zavx0z/component"')
      }
    } finally {
      await compiler.close()
    }
  }, 30_000)
})
