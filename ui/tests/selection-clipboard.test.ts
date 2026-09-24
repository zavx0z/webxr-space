import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {createDocument, MouseEvent, readDocumentTextHighlights, type HTMLElement} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/component"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import {createDocumentClipboardController} from "../../browser/clipboard.ts"

const workspace = resolve(import.meta.dir, "../..")
Bun.plugin(createTemplateJsxBunPlugin({cwd: workspace, persistent: true, sourceRoots: [resolve(workspace, "ui")]}))
const {EditableSelectionFixture} = await import("./selection.fixture.tsx")

test("несколько выделений выполняют настоящее копирование и распределённую вставку", async () => {
  const document = createDocument()
  const owner = document.createElement("div") as HTMLElement
  const component = createRoot(owner)
  component.render(EditableSelectionFixture as unknown as CompiledTemplate<{multiple: boolean}>, {multiple: true})
  document.append(owner)
  const written: string[] = []
  const clipboard = createDocumentClipboardController(document, {access: {
    writeText: async text => { written.push(text) }, readText: async () => "first\nsecond",
  }})
  try {
    const select = Array.from(owner.querySelectorAll("button")).find(button => button.textContent === "Выделить два значения")!
    select.dispatchEvent(new MouseEvent("click", {bubbles: true}))
    expect(document.getSelection().toString()).toBe("Мир")
    expect(readDocumentTextHighlights(document)[0]?.range.toString()).toBe("Привет")
    expect((await clipboard.copy()).status).toBe("copied")
    expect(written).toEqual(["Привет\nМир"])
    expect((await clipboard.paste()).status).toBe("pasted")
    expect(owner.querySelector("code")?.textContent).toContain('const first = "first"\nconst second = "second"')
  } finally { clipboard.dispose(); component.unmount() }
})
