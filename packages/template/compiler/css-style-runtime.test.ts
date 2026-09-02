import {afterAll, beforeAll, describe, expect, test} from "bun:test"
import {mkdtemp, rm} from "node:fs/promises"
import {join, resolve} from "node:path"
import {pathToFileURL} from "node:url"
import {createTemplateJsxBunPlugin} from "./bun.ts"

const fixtureRoot = resolve(import.meta.dir, "test-fixture")
const fixture = resolve(fixtureRoot, "css-style.tsx")
const rendererRoot = resolve(import.meta.dir, "../../renderer")
let outputDirectory = ""
let compiled: any
let productionOutput = ""

beforeAll(async () => {
  outputDirectory = await mkdtemp(join(import.meta.dir, ".css-style-runtime-"))
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
  if (!output) throw new Error("Scoped css style build emitted no entry point")
  productionOutput = await output.text()
  compiled = await import(`${pathToFileURL(output.path).href}?css=${Date.now()}`)
})

afterAll(async () => {
  if (outputDirectory) await rm(outputDirectory, {recursive: true, force: true})
})

describe("compiled scoped css runtime", () => {
  test("removes owner css tags from production output", () => {
    expect(productionOutput).not.toContain("const ownerCss = css")
    expect(productionOutput).not.toContain("generic runtime style binding")
    expect(productionOutput).toContain("compiledStyleSheet")
    expect(compiled.CssButton.styleSheets.every(
      (styleSheet: {source?: unknown}) => styleSheet.source === undefined,
    )).toBe(true)
  })

  test("adopts static rules once and updates addressed base declaration values", () => {
    const mounted = compiled.createCssStyleRuntimeRoot()
    mounted.root.render(compiled.DynamicCallerStyledButton, {
      color: "black",
      hoverColor: "rgb(12 34 56)",
      selected: false,
      width: 40,
    })
    const button = mounted.host.querySelector("button")
    const snapshot = mounted.readStyleSheets()

    expect(button.getAttribute("style")).toBe(
      "--hover-color: rgb(12 34 56); width: 40px; color: black",
    )
    expect(snapshot.styleSheets).toHaveLength(1)
    expect(snapshot.styleSheets[0]!.cssText).toContain(
      ":hover{background:var(--hover-color);color:var(--hover-text, rgb(255 255 255))}",
    )
    expect(snapshot.styleSheets[0]!.cssText).toContain(
      ':hover [data-part="glyph"]{box-shadow:0 0 6px currentcolor}',
    )

    mounted.root.render(compiled.DynamicCallerStyledButton, {
      color: "rgb(1 2 3)",
      hoverColor: "rgb(71 114 179)",
      selected: true,
      width: 64,
    })
    expect(mounted.host.querySelector("button")).toBe(button)
    expect(button.getAttribute("style")).toBe(
      "--hover-color: rgb(71 114 179); width: 64px; color: rgb(1 2 3)",
    )
    expect(mounted.readStyleSheets()).toBe(snapshot)

    mounted.root.unmount()
    expect(mounted.readStyleSheets().styleSheets).toEqual([])
  })

  test("passes a base-only component css prop through the final inline fragment", () => {
    const mounted = compiled.createCssStyleRuntimeRoot()
    mounted.root.render(compiled.CallerStyledButton, {})
    const button = mounted.host.querySelector("button")

    expect(button.getAttribute("style")).toBe(
      "--hover-color: rgb(12 34 56); width: 40px; color: rgb(1 2 3)",
    )
    expect(mounted.readStyleSheets().styleSheets).toHaveLength(1)
    mounted.root.unmount()
  })
})

function localRuntimePlugin(): Bun.BunPlugin {
  const aliases = new Map([
    ["@zavx0z/dom", resolve(rendererRoot, "packages/dom/src/index.ts")],
    ["@zavx0z/react", resolve(rendererRoot, "packages/react/src/index.ts")],
    ["@zavx0z/template", resolve(import.meta.dir, "../index.ts")],
    ["@zavx0z/template/compiled", resolve(import.meta.dir, "../compiled.ts")],
    ["@zavx0z/template/jsx-runtime", resolve(import.meta.dir, "../jsx-runtime.ts")]
  ])
  return {
    name: "template-scoped-css-runtime",
    setup(builder) {
      builder.onResolve({filter: /^@zavx0z\/(?:dom|react|template(?:\/compiled|\/jsx-runtime)?)$/}, ({path}) => {
        const resolved = aliases.get(path)
        if (!resolved) throw new Error(`Missing local runtime alias: ${path}`)
        return {path: resolved}
      })
    }
  }
}
