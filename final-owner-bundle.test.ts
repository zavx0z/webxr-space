import {describe, expect, test} from "bun:test"
import {readFileSync} from "node:fs"
import {resolve} from "node:path"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"

const componentsRoot = import.meta.dir

describe("final public component runtime bundle", () => {
  test("covers every public TSX subpath and exported Component factory", async () => {
    const packageJson = await Bun.file(resolve(componentsRoot, "package.json")).json() as {
      exports: Record<string, string>
    }
    const runtimeSubpaths = Object.entries(packageJson.exports)
      .filter(([, target]) => target.endsWith(".tsx"))
      .map(([subpath]) => `@ui/components/${subpath.slice(2)}`)
      .sort()
    const resourceExports = Object.fromEntries(Object.entries(packageJson.exports)
      .filter(([, target]) => !target.endsWith(".tsx")))
    const fixtureSource = readFileSync(resolve(componentsRoot, "final-owner-bundle.fixture.ts"), "utf8")
    const fixtureSubpaths = [...fixtureSource.matchAll(/from "(@ui\/components\/[^"]+)"/gu)]
      .map(([, subpath]) => subpath!)
      .sort()
    const expectedFactories = Object.values(packageJson.exports)
      .filter(target => target.endsWith(".tsx"))
      .flatMap(target => [...readFileSync(resolve(componentsRoot, target), "utf8")
        .matchAll(/export function ([A-Z][A-Za-z0-9_]*)\s*\(/gu)]
        .map(([, name]) => name!))
      .sort()
    const arrayBody = fixtureSource.match(/globalThis\.__uiFinalOwners = Object\.freeze\(\[([\s\S]*?)\]\)/u)?.[1]
    const fixtureFactories = [...(arrayBody ?? "").matchAll(/\b([A-Z][A-Za-z0-9_]*)\b/gu)]
      .map(([, name]) => name!)
      .sort()
    expect(runtimeSubpaths).toHaveLength(29)
    expect(fixtureSubpaths).toEqual(runtimeSubpaths)
    expect(expectedFactories).toHaveLength(32)
    expect(fixtureFactories).toEqual(expectedFactories)
    expect(resourceExports).toEqual({
      "./icons": "./icons.ts",
      "./syntax-theme": "./syntax-theme.ts",
      "./theme.css": "./theme.css"
    })

    const result = await Bun.build({
      entrypoints: [resolve(componentsRoot, "final-owner-bundle.fixture.ts")],
      target: "browser",
      format: "esm",
      minify: true,
      external: [
        "@zavx0z/dom",
        "@zavx0z/highlighter",
        "@zavx0z/react",
        "@zavx0z/template/compiled"
      ],
      plugins: [createTemplateJsxBunPlugin({sourceRoots: [componentsRoot]})]
    })
    expect(result.success).toBe(true)
    expect(result.logs).toEqual([])
    const output = await result.outputs[0]!.text()
    expect(output).not.toContain(".ui-")
    expect(output).not.toContain("data-ui-state")
    expect(output).not.toMatch(/\bcreate(?:Button|Field|Inspector|HudWindow|CodeEditor)\b/u)
    expect(result.outputs[0]!.size).toBeLessThan(131_500)
    expect(Bun.gzipSync(new TextEncoder().encode(output)).byteLength).toBeLessThan(31_750)
  }, 30_000)
})
