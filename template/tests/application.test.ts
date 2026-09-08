import {expect, test} from "bun:test"
import {mkdtemp, rm} from "node:fs/promises"
import {join, resolve} from "node:path"
import {pathToFileURL} from "node:url"
import {createDocument} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/component"
import {createSpaceElementFactories, readSpaceTree} from "@zavx0z/space"
import type {CompiledTemplate} from "../compiled.ts"
import {JsxCompilerSession} from "../compiler/index.ts"

test("Browser createRoot компилирует App, фиксированные соседи обходятся без key и сохраняют состояние", async () => {
  const directory = await mkdtemp(join(import.meta.dir, ".application-"))
  const compiler = new JsxCompilerSession({cwd: resolve(import.meta.dir, "../.."), sourceRoots: [import.meta.dir]})
  try {
    await compiler.prepareFiles([join(import.meta.dir, "application.fixture.tsx"), join(import.meta.dir, "browser-hook-invalid.fixture.tsx")])
    const result = await compiler.compileFile(join(import.meta.dir, "application.fixture.tsx"))
    expect(result.code).not.toContain("<TestApp")
    expect(result.code).toContain("fixedChildren as")
    expect(result.code).toContain("root.render(")
    expect(result.code).toContain("createHostRoot(canvas).render(")
    const invalidPath = join(import.meta.dir, "browser-hook-invalid.fixture.tsx")
    await expect(compiler.compileFile(invalidPath)).rejects.toThrow("useSpace must be called unconditionally")
    const path = join(directory, "application.ts")
    await Bun.write(join(directory, "browser.ts"), `
      import {createContext, provideContext} from "@zavx0z/component"
      export {useSpace, useFrame} from "@zavx0z/browser"
      const context = createContext(null)
      export const calls = []
      export function createRoot() {
        return {render(value) { calls.push(provideContext(context, null, value)) }}
      }
    `)
    await Bun.write(path, result.code.replaceAll('"@zavx0z/browser"', '"./browser.ts"')
      .replaceAll('"@zavx0z/browser/integration"', '"./browser.ts"'))
    const module = await import(pathToFileURL(path).href) as {connect(canvas: HTMLCanvasElement): unknown; connectHost(canvas: HTMLCanvasElement): unknown; TestApp: CompiledTemplate<{label: string}>; ResourcesApp: CompiledTemplate<{href: string; frameloop: "demand" | "always"}>}
    module.connect({} as HTMLCanvasElement)
    module.connectHost({} as HTMLCanvasElement)
    const boundary = await import(pathToFileURL(join(directory, "browser.ts")).href)
    expect(boundary.calls).toHaveLength(2)
    expect(boundary.calls[0].template).toBe(module.TestApp)
    expect(boundary.calls[0].props).toEqual({label: "Первый"})
    expect(boundary.calls[1].props).toEqual({label: "Host"})
    const document = createDocument()
    const root = createRoot(document)
    root.render(module.TestApp, {label: "Первый"})
    const buttons = [...document.querySelectorAll("button")]
    buttons[0]!.dispatchEvent(new (await import("@zavx0z/dom")).MouseEvent("click", {bubbles: true}))
    root.flush()
    expect(buttons[0]!.textContent).toBe("Первый: 1")
    root.render(module.TestApp, {label: "Обновлённый"})
    root.flush()
    expect([...document.querySelectorAll("button")]).toEqual(buttons)
    expect(buttons[0]!.textContent).toBe("Обновлённый: 1")
    expect(buttons[1]!.textContent).toBe("Второй: 0")
    expect(buttons[0]!.getAttribute("data-document-type")).toBe("9")
    expect(buttons[0]!.getAttribute("data-ref-connected")).toBe("true")
    root.unmount()
    const spatial = createDocument({elementFactories: createSpaceElementFactories()})
    const html = spatial.createElement("html")
    const body = spatial.createElement("body")
    html.append(body)
    spatial.append(html)
    const resources = createRoot(body)
    resources.render(module.ResourcesApp, {href: "/dark.css", frameloop: "demand"})
    const link = spatial.querySelector("link")!
    const tree = readSpaceTree(spatial)
    expect(body.children).toEqual([link, tree.space])
    expect(link.getAttribute("href")).toBe("/dark.css")
    resources.render(module.ResourcesApp, {href: "/light.css", frameloop: "always"})
    resources.flush()
    expect(spatial.querySelector("link")).toBe(link)
    expect(link.getAttribute("href")).toBe("/light.css")
    expect(readSpaceTree(spatial).space).toBe(tree.space)
    expect(tree.space.frameloop).toBe("always")
    resources.unmount()
  } finally {
    try { await compiler.close() } finally {
      await rm(directory, {recursive: true, force: true})
    }
  }
}, 30_000)
