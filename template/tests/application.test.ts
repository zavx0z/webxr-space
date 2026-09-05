import {expect, test} from "bun:test"
import {mkdtemp, rm} from "node:fs/promises"
import {join, resolve} from "node:path"
import {pathToFileURL} from "node:url"
import {createDocument} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/component"
import type {CompiledTemplate} from "../compiled.ts"
import {JsxCompilerSession} from "../compiler/index.ts"

test("Browser attach компилирует App, фиксированные соседи обходятся без key и сохраняют состояние", async () => {
  const directory = await mkdtemp(join(import.meta.dir, ".application-"))
  const compiler = new JsxCompilerSession({cwd: resolve(import.meta.dir, "../.."), sourceRoots: [import.meta.dir]})
  try {
    await compiler.prepareFiles([join(import.meta.dir, "application.fixture.tsx"), join(import.meta.dir, "browser-hook-invalid.fixture.tsx")])
    const result = await compiler.compileFile(join(import.meta.dir, "application.fixture.tsx"))
    expect(result.code).not.toContain("<TestApp")
    expect(result.code).toContain("fixedChildren as")
    expect(result.code).toContain("attach({canvas, app:")
    const invalidPath = join(import.meta.dir, "browser-hook-invalid.fixture.tsx")
    await expect(compiler.compileFile(invalidPath)).rejects.toThrow("useSpace must be called unconditionally")
    const path = join(directory, "application.ts")
    await Bun.write(path, result.code)
    const module = await import(pathToFileURL(path).href) as {TestApp: CompiledTemplate<{label: string}>}
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
    root.unmount()
  } finally {
    try { await compiler.close() } finally {
      await rm(directory, {recursive: true, force: true})
    }
  }
}, 30_000)
