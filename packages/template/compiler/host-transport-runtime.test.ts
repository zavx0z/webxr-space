import {afterAll, beforeAll, describe, expect, test} from "bun:test"
import {mkdtemp, rm} from "node:fs/promises"
import {join, resolve} from "node:path"
import {pathToFileURL} from "node:url"
import {createTemplateJsxBunPlugin} from "./bun.ts"

const fixtureRoot = resolve(import.meta.dir, "test-fixture")
const fixture = resolve(fixtureRoot, "host-transport.tsx")
const rendererRoot = resolve(import.meta.dir, "../../renderer")
let outputDirectory = ""
let compiled: any

beforeAll(async () => {
  outputDirectory = await mkdtemp(join(import.meta.dir, ".host-transport-runtime-"))
  const result = await Bun.build({
    entrypoints: [fixture],
    outdir: outputDirectory,
    target: "bun",
    format: "esm",
    plugins: [
      localRuntimePlugin(),
      createTemplateJsxBunPlugin({sourceRoots: [fixtureRoot]}),
    ],
  })
  if (!result.success) throw new Error(result.logs.map(log => log.message).join("\n"))
  const output = result.outputs.find(artifact => artifact.kind === "entry-point")
  if (!output) throw new Error("Host transport build emitted no entry point")
  compiled = await import(`${pathToFileURL(output.path).href}?host=${Date.now()}`)
})

afterAll(async () => {
  if (outputDirectory) await rm(outputDirectory, {recursive: true, force: true})
})

describe("compiled host property transport", () => {
  test("writes dynamic and literal indeterminate/tabIndex through DOM properties", () => {
    const mounted = compiled.createHostTransportRoot()
    mounted.root.render(compiled.DynamicHostTransport, {
      indeterminate: true,
      tabIndex: 3,
    })
    const input = mounted.host.querySelector("input")

    expect(input.indeterminate).toBe(true)
    expect(input.tabIndex).toBe(3)
    expect(input.getAttribute("indeterminate")).toBeNull()

    mounted.root.render(compiled.DynamicHostTransport, {
      indeterminate: false,
      tabIndex: 7,
    })
    expect(mounted.host.querySelector("input")).toBe(input)
    expect(input.indeterminate).toBe(false)
    expect(input.tabIndex).toBe(7)
    expect(input.getAttribute("indeterminate")).toBeNull()

    mounted.root.render(compiled.StaticHostTransport, {})
    const literal = mounted.host.querySelector("input")
    expect(literal.indeterminate).toBe(true)
    expect(literal.tabIndex).toBe(0)
    expect(literal.getAttribute("indeterminate")).toBeNull()
    mounted.root.unmount()
  })
})

function localRuntimePlugin(): Bun.BunPlugin {
  const aliases = new Map([
    ["@zavx0z/dom", resolve(rendererRoot, "packages/dom/src/index.ts")],
    ["@zavx0z/react", resolve(rendererRoot, "packages/react/src/index.ts")],
    ["@zavx0z/template/compiled", resolve(import.meta.dir, "../compiled.ts")],
    ["@zavx0z/template/jsx-runtime", resolve(import.meta.dir, "../jsx-runtime.ts")],
  ])
  return {
    name: "template-host-transport-runtime",
    setup(builder) {
      builder.onResolve({
        filter: /^@zavx0z\/(?:dom|react|template\/compiled|template\/jsx-runtime)$/,
      }, ({path}) => {
        const resolved = aliases.get(path)
        if (!resolved) throw new Error(`Missing local runtime alias: ${path}`)
        return {path: resolved}
      })
    },
  }
}
