import {expect, test} from "bun:test"
import {mkdtemp, rm} from "node:fs/promises"
import {join, resolve} from "node:path"
import {pathToFileURL} from "node:url"
import {createDocument, HTMLButtonElement, MouseEvent} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/component"
import type {CompiledTemplate} from "../compiled.ts"
import {JsxCompilerSession} from "../compiler/index.ts"

test("fragments preserve keyed multi-root identity, focus, state and exactly-once cleanup", async () => {
  const directory = await mkdtemp(join(import.meta.dir, ".fragments-"))
  const compiler = new JsxCompilerSession({cwd: resolve(import.meta.dir, "../.."), sourceRoots: [import.meta.dir]})
  const document = createDocument()
  const host = document.createElement("div")
  document.append(host)
  const root = createRoot(host)
  try {
    const compiled = await compiler.compileFile(join(import.meta.dir, "fragments.fixture.tsx"))
    expect(compiled.code).not.toContain("<>")
    const path = join(directory, "fragments.ts")
    await Bun.write(path, compiled.code)
    const module = await import(pathToFileURL(path).href) as {
      FragmentList: CompiledTemplate<{rows: readonly {id: string; label: string}[]; onDispose(id: string): void}>
      TextFragment: CompiledTemplate<{value: string}>
      EmptyFragment: CompiledTemplate<Record<string, never>>
      FragmentInExpression: CompiledTemplate<{value: string}>
    }
    const disposed: string[] = []
    const onDispose = (id: string) => { disposed.push(id) }
    root.render(module.FragmentList, {rows: [{id: "a", label: "A"}, {id: "b", label: "B"}], onDispose})
    const section = host.querySelector("section")!
    const first = host.querySelector('[data-action="a"]')!
    if (!(first instanceof HTMLButtonElement)) throw new Error("Expected the original semantic button")
    const label = host.querySelector('[data-label="a"]')!
    expect(section.children).toHaveLength(4)
    first.dispatchEvent(new MouseEvent("click", {bubbles: true}))
    expect(first.textContent).toBe("1")
    first.focus()
    expect(document.activeElement === first).toBe(true)
    root.render(module.FragmentList, {rows: [{id: "b", label: "B2"}, {id: "a", label: "A2"}], onDispose})
    expect(host.querySelector('[data-action="a"]')).toBe(first)
    expect(host.querySelector('[data-label="a"]')).toBe(label)
    expect(label.textContent).toBe("A2!")
    expect(first.textContent).toBe("1")
    expect(document.activeElement === first).toBe(true)
    expect([...section.children].map(node => node.getAttribute("data-action") ?? node.getAttribute("data-label"))).toEqual(["b", "b", "a", "a"])
    expect(disposed).toEqual([])
    root.render(module.FragmentList, {rows: [{id: "a", label: "A3"}], onDispose})
    expect(disposed).toEqual(["b"])
    root.render(module.TextFragment, {value: "plain"})
    expect(disposed).toEqual(["b", "a"])
    expect(host.children).toHaveLength(0)
    expect(host.textContent).toBe("plain")
    const text = [...host.childNodes].find(node => node.nodeType === 3)
    root.render(module.TextFragment, {value: "changed"})
    expect([...host.childNodes].find(node => node.nodeType === 3)).toBe(text)
    expect(host.textContent).toBe("changed")
    root.render(module.EmptyFragment, {})
    expect(host.textContent).toBe("")
    root.render(module.FragmentInExpression, {value: "head"})
    expect(host.querySelector("p")?.textContent).toBe("headtail")
    expect(host.querySelectorAll("em")).toHaveLength(1)
    root.unmount()
    root.unmount()
    expect(disposed).toEqual(["b", "a"])
    expect(host.childNodes).toHaveLength(0)
  } finally {
    root.unmount()
    await compiler.close()
    await rm(directory, {recursive: true, force: true})
  }
}, 30_000)
