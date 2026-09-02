import {afterAll, beforeAll, describe, expect, test} from "bun:test"
import {mkdtemp, rm} from "node:fs/promises"
import {join, resolve} from "node:path"
import {pathToFileURL} from "node:url"
import {createTemplateJsxBunPlugin} from "./bun.ts"

const fixtureRoot = resolve(import.meta.dir, "test-fixture")
const fixture = resolve(fixtureRoot, "style-custom-property.tsx")
const rendererRoot = resolve(import.meta.dir, "../../renderer")
let outputDirectory = ""
let compiled: any

beforeAll(async () => {
  outputDirectory = await mkdtemp(join(import.meta.dir, ".style-custom-property-runtime-"))
  const result = await Bun.build({
    entrypoints: [fixture],
    outdir: outputDirectory,
    target: "bun",
    format: "esm",
    plugins: [
      localRuntimePlugin(),
      createTemplateJsxBunPlugin({sourceRoots: [fixtureRoot]})
    ]
  })
  if (!result.success) throw new Error(result.logs.map(log => log.message).join("\n"))
  const output = result.outputs.find(artifact => artifact.kind === "entry-point")
  if (!output) throw new Error("Custom-property style build emitted no entry point")
  compiled = await import(`${pathToFileURL(output.path).href}?style=${Date.now()}`)
})

afterAll(async () => {
  if (outputDirectory) await rm(outputDirectory, {recursive: true, force: true})
})

describe("compiled custom-property style runtime", () => {
  test("adopts one static pseudo sheet and updates only the explicit inline variable", () => {
    const mounted = compiled.createStyleRuntimeRoot()
    mounted.root.render(compiled.HoverButton, {hoverColor: "rgb(12 34 56)"})
    const button = mounted.host.querySelector("button")
    const snapshot = mounted.readStyleSheets()

    expect(button.getAttribute("style")).toBe("--hover-color: rgb(12 34 56)")
    expect(snapshot.styleSheets).toHaveLength(1)
    expect(snapshot.styleSheets[0]!.cssText).toContain(":hover{")
    expect(snapshot.styleSheets[0]!.cssText).toContain("background:var(--hover-color)")
    expect(snapshot.styleSheets[0]!.cssText).toContain(
      "color:var(--hover-text, rgb(255 255 255))",
    )
    expect(snapshot.styleSheets[0]!.cssText).not.toMatch(/--z-[a-z0-9-]+/)

    mounted.root.render(compiled.HoverButton, {hoverColor: "rgb(71 114 179)"})
    expect(mounted.host.querySelector("button")).toBe(button)
    expect(button.getAttribute("style")).toBe("--hover-color: rgb(71 114 179)")
    expect(mounted.readStyleSheets()).toBe(snapshot)

    mounted.root.unmount()
    expect(mounted.readStyleSheets().styleSheets).toEqual([])
  })
})

function localRuntimePlugin(): Bun.BunPlugin {
  const aliases = new Map([
    ["@zavx0z/dom", resolve(rendererRoot, "packages/dom/src/index.ts")],
    ["@zavx0z/react", resolve(rendererRoot, "packages/react/src/index.ts")],
    ["@zavx0z/template/compiled", resolve(import.meta.dir, "../compiled.ts")],
    ["@zavx0z/template/jsx-runtime", resolve(import.meta.dir, "../jsx-runtime.ts")]
  ])
  return {
    name: "template-custom-property-style-runtime",
    setup(builder) {
      builder.onResolve({filter: /^@zavx0z\/(?:dom|react|template\/compiled|template\/jsx-runtime)$/}, ({path}) => {
        const resolved = aliases.get(path)
        if (!resolved) throw new Error(`Missing local runtime alias: ${path}`)
        return {path: resolved}
      })
    }
  }
}
