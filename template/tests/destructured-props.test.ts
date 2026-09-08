import {expect, test} from "bun:test"
import {mkdtemp, rm} from "node:fs/promises"
import {join, resolve} from "node:path"
import {pathToFileURL} from "node:url"
import {createDocument, HTMLButtonElement, MouseEvent} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/component"
import type {CompiledTemplate} from "../compiled.ts"
import {JsxCompilerSession} from "../compiler/index.ts"

test("destructured and renamed children/style preserve DOM identity, focus, state and cleanup", async () => {
  const directory = await mkdtemp(join(import.meta.dir, ".destructured-props-"))
  const compiler = new JsxCompilerSession({
    cwd: resolve(import.meta.dir, "../.."),
    sourceRoots: [import.meta.dir],
  })
  const document = createDocument()
  const host = document.createElement("div")
  document.append(host)
  const root = createRoot(host)
  try {
    const result = await compiler.compileFile(join(import.meta.dir, "destructured-props.fixture.tsx"))
    const path = join(directory, "compiled.ts")
    await Bun.write(path, result.code)
    const module = await import(pathToFileURL(path).href) as {
      DestructuredPropsDemo: CompiledTemplate<{
        rows: readonly {id: string; label: string}[]
        caption: string
        padding: number
        show: boolean
        onDispose(id: string): void
      }>
    }
    const disposed: string[] = []
    const onDispose = (id: string) => { disposed.push(id) }
    root.render(module.DestructuredPropsDemo, {
      rows: [{id: "a", label: "A"}, {id: "b", label: "B"}],
      caption: "Before",
      padding: 4,
      show: true,
      onDispose,
    })
    const section = host.querySelector("section")!
    const first = host.querySelector('[data-counter="a"]')!
    const second = host.querySelector('[data-counter="b"]')!
    const caption = host.querySelector("article span")!
    if (!(first instanceof HTMLButtonElement)) throw new Error("Expected a semantic button")
    expect(section.getAttribute("style")).toContain("padding: 4px")
    expect(section.getAttribute("style")).toContain("color: red")
    expect(host.querySelectorAll("section")[1]!.textContent).toBe("")
    expect([...host.querySelectorAll("p")].map(node => node.textContent)).toEqual(["default", "Before"])
    expect(first.ownerDocument).toBe(document)
    first.dispatchEvent(new MouseEvent("click", {bubbles: true}))
    first.focus()
    expect(first.textContent).toBe("A:1")
    const sheets = root.readStyleSheets().styleSheets

    root.render(module.DestructuredPropsDemo, {
      rows: [{id: "b", label: "B2"}, {id: "a", label: "A2"}],
      caption: "After",
      padding: 12,
      show: false,
      onDispose,
    })
    expect(host.querySelector("section")).toBe(section)
    expect([...section.children]).toEqual([second, first])
    expect(first.textContent).toBe("A2:1")
    expect(document.activeElement).toBe(first)
    expect(host.querySelector("article span")).toBe(caption)
    expect(caption.textContent).toBe("After")
    expect(host.querySelector("aside")!.textContent).toBe("")
    expect([...host.querySelectorAll("p")].map(node => node.textContent)).toEqual(["default", "After"])
    expect(section.getAttribute("style")).toContain("padding: 12px")
    expect(root.readStyleSheets().styleSheets).toEqual(sheets)
    expect(disposed).toEqual(["optional"])
    root.unmount()
    root.unmount()
    expect(disposed.sort()).toEqual(["a", "b", "optional"])
    expect(host.childNodes).toHaveLength(0)
  } finally {
    root.unmount()
    await compiler.close()
    await rm(directory, {recursive: true, force: true})
  }
}, 30_000)

test("destructuring does not treat unrelated fields or rest objects as children/style props", async () => {
  const compiler = new JsxCompilerSession({
    cwd: resolve(import.meta.dir, "../.."),
    sourceRoots: [import.meta.dir],
  })
  try {
    const cases = [
      {
        name: "destructured-foreign-children.fixture.tsx",
        error: "component-valued children require props.children or its destructured parameter binding",
      },
      {
        name: "destructured-rest-children.fixture.tsx",
        error: "component-valued children require props.children or its destructured parameter binding",
      },
      {
        name: "destructured-foreign-style.fixture.tsx",
        error: "intrinsic style authoring requires a css tagged template or direct props.style",
      },
    ]
    const paths = cases.map(entry => join(import.meta.dir, entry.name))
    for (let index = 0; index < cases.length; index++) {
      const failure = await compiler.compileFile(paths[index]!).then(
        () => null,
        error => error,
      )
      expect(failure).toBeInstanceOf(Error)
      expect(failure.message).toContain(cases[index]!.error)
    }
  } finally {
    await compiler.close()
  }
}, 30_000)
