import {describe, expect, test} from "bun:test"
import {resolve} from "node:path"
import {JsxCompilerSession} from "@zavx0z/template/compiler"

const root = resolve(import.meta.dir, "../..")
const spaceRoot = resolve(root, "space")

const owners = Object.freeze([
  ["space.tsx", "xr-space"],
  ["view-point.tsx", "xr-view-point"],
  ["asset.tsx", "xr-asset"],
  ["group.tsx", "xr-group"],
  ["mesh.tsx", "xr-mesh"],
  ["line.tsx", "xr-line"],
  ["line-segments.tsx", "xr-line-segments"],
  ["text.tsx", "xr-text"],
  ["light.tsx", "xr-light"],
  ["animation.tsx", "xr-animation"],
  ["geometry.tsx", "xr-geometry"],
  ["material.tsx", "xr-material"],
  ["display.tsx", "xr-display"],
  ["hud.tsx", "xr-hud"],
] as const)

describe("Публичные пространственные компоненты", () => {
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
