import {afterAll, beforeAll, describe, expect, test} from "bun:test"
import {mkdtemp, rm} from "node:fs/promises"
import {join, resolve} from "node:path"
import {pathToFileURL} from "node:url"
import {createTemplateJsxBunPlugin} from "./bun.ts"

const fixtureRoot = resolve(import.meta.dir, "test-fixture")
const fixture = resolve(fixtureRoot, "component-children.tsx")
const rendererRoot = resolve(import.meta.dir, "../../renderer")
let outputDirectory = ""
let compiled: any

beforeAll(async () => {
  outputDirectory = await mkdtemp(join(import.meta.dir, ".component-children-runtime-"))
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
  if (!result.success) {
    throw new Error(result.logs.map(log => log.message).join("\n"))
  }
  const output = result.outputs.find(artifact => artifact.kind === "entry-point")
  if (!output) throw new Error("Component children build emitted no entry point")
  compiled = await import(`${pathToFileURL(output.path).href}?children=${Date.now()}`)
})

afterAll(async () => {
  if (outputDirectory) await rm(outputDirectory, {recursive: true, force: true})
})

describe("compiled component children runtime", () => {
  test("retains a direct nested component and its Text across updates", () => {
    const mounted = compiled.createChildrenRuntimeRoot()
    mounted.root.render(compiled.SingleChildrenApplication, {label: "One"})
    const pane = mounted.host.querySelector("section")
    const child = pane.querySelector("p")
    const text = child.firstChild

    mounted.root.render(compiled.SingleChildrenApplication, {label: "Two"})
    expect(mounted.host.querySelector("section")).toBe(pane)
    expect(pane.querySelector("p")).toBe(child)
    expect(child.firstChild).toBe(text)
    expect(child.textContent).toBe("Two")
    mounted.root.unmount()
  })

  test("mounts and removes nullable children through one bounded range", () => {
    const mounted = compiled.createChildrenRuntimeRoot()
    mounted.root.render(compiled.NullableChildrenApplication, {label: "One", show: true})
    const pane = mounted.host.querySelector("article")
    const child = pane.querySelector("p")
    mounted.root.render(compiled.NullableChildrenApplication, {label: "Two", show: true})
    expect(pane.querySelector("p")).toBe(child)
    expect(child.textContent).toBe("Two")

    mounted.root.render(compiled.NullableChildrenApplication, {label: "Two", show: false})
    expect(pane.querySelector("p")).toBeNull()
    expect(pane.textContent).toBe("")
    mounted.root.unmount()
  })

  test("uses the existing text ABI for primitive children", () => {
    const mounted = compiled.createChildrenRuntimeRoot()
    mounted.root.render(compiled.TextChildrenApplication, {label: "Label"})
    const pane = mounted.host.querySelector("span")
    const text = pane.firstChild
    mounted.root.render(compiled.TextChildrenApplication, {label: 42})
    expect(mounted.host.querySelector("span")).toBe(pane)
    expect(pane.firstChild).toBe(text)
    expect(pane.textContent).toBe("42")
    mounted.root.unmount()
  })

  test("retains compiler-owned keyed children across reorder", () => {
    const mounted = compiled.createChildrenRuntimeRoot()
    mounted.root.render(compiled.KeyedChildrenApplication, {items: [
      {id: "a", label: "A"},
      {id: "b", label: "B"}
    ]})
    const pane = mounted.host.querySelector("div")
    const initial = [...pane.querySelectorAll("p")]
    mounted.root.render(compiled.KeyedChildrenApplication, {items: [
      {id: "b", label: "B2"},
      {id: "a", label: "A2"}
    ]})
    const reordered = [...pane.querySelectorAll("p")]
    expect(reordered[0]).toBe(initial[1])
    expect(reordered[1]).toBe(initial[0])
    expect(reordered.map((element: any) => element.textContent)).toEqual(["B2", "A2"])
    mounted.root.unmount()
  })

  test("keeps update cost retained without growing the component graph", () => {
    const mounted = compiled.createChildrenRuntimeRoot()
    mounted.root.render(compiled.SingleChildrenApplication, {label: "0"})
    const pane = mounted.host.querySelector("section")
    const child = pane.querySelector("p")
    const text = child.firstChild
    const mounts = mounted.root.stats().mounts
    for (let index = 1; index <= 1_000; index += 1) {
      mounted.root.render(compiled.SingleChildrenApplication, {label: String(index)})
    }
    expect(mounted.root.stats().mounts).toBe(mounts)
    expect(mounted.host.querySelector("section")).toBe(pane)
    expect(pane.querySelector("p")).toBe(child)
    expect(child.firstChild).toBe(text)
    expect(child.textContent).toBe("1000")
    mounted.root.unmount()
  })

  test("rejects raw values that bypass compiler-owned child wrappers", () => {
    const single = compiled.createChildrenRuntimeRoot()
    expect(() => single.root.render(compiled.Pane, {children: null}))
      .toThrow("child binding requires a compiled component value")

    const keyed = compiled.createChildrenRuntimeRoot()
    expect(() => keyed.root.render(compiled.Stack, {children: []}))
      .toThrow("keyed binding requires keyedComponents(entries)")
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
    name: "template-component-children-runtime",
    setup(builder) {
      builder.onResolve({filter: /^@zavx0z\/(?:dom|react|template\/compiled|template\/jsx-runtime)$/}, ({path}) => {
        const resolved = aliases.get(path)
        if (!resolved) throw new Error(`Missing local runtime alias: ${path}`)
        return {path: resolved}
      })
    }
  }
}
