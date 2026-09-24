import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {createDocument, MouseEvent, type HTMLElement} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/component"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import {createDocumentRenderer} from "@renderer/html"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"

const workspace = resolve(import.meta.dir, "../..")
Bun.plugin(createTemplateJsxBunPlugin({cwd: workspace, persistent: true, sourceRoots: [resolve(workspace, "ui")]}))
const {CodeEditorScrollFixture, codeEditorScrollSource} = await import("./code-editor-scroll.fixture.tsx")
const theme = await Bun.file(resolve(workspace, "ui/themes/theme.css")).text()

for (const [compact, height, tooltip] of [
  [false, 440, null],
  [true, 180, "HTML · 420 строк"],
] as const) {
  test(`CodeEditor ${compact ? "компактный" : "обычный"} прокручивается без замены узлов и сдвига соседа`, async () => {
    const document = createDocument()
    const owner = document.createElement("div") as HTMLElement
    const component = createRoot(owner)
    component.render(CodeEditorScrollFixture as unknown as CompiledTemplate<{compact: boolean}>, {compact})
    document.append(owner)
    const renderer = createDocumentRenderer({document, root: owner, viewport: {width: 1000, height: 700}, styleSheets: [theme]})
    try {
      const editor = owner.querySelector('section[role="region"]') as HTMLElement
      const code = editor.querySelector("code")!
      const neighbor = owner.querySelector("aside")!
      const lines = [...code.querySelectorAll("[data-line-index]")]
      expect(owner.ownerDocument).toBe(document)
      for (const tag of ["canvas", "space", "viewpoint", "hud", "display"]) {
        expect(owner.querySelectorAll(tag)).toHaveLength(0)
      }
      expect(editor.getAttribute("aria-readonly")).toBe("true")
      expect(lines.map(line => line.textContent)).toEqual(codeEditorScrollSource.split("\n"))
      expect(lines).toHaveLength(420)
      expect(editor.getAttribute("title")).toBe(tooltip)
      const initial = renderer.flush()
      expect(initial.boxByNode.get(editor)?.height).toBe(height)
      const reference = initial.boxByNode.get(neighbor)!
      const firstText = initial.displayList.find(item => item.kind === "text" && code.contains(item.node))!
      const originalY = firstText.y
      const click = (label: string) => {
        const button = [...owner.querySelectorAll("button")].find(element => element.textContent === label)!
        button.dispatchEvent(new MouseEvent("click", {bubbles: true}))
        return renderer.flush()
      }
      click("Вниз на 320 px")
      expect(editor.scrollTop).toBe(320)
      const shifted = click("Вправо на 80 px")
      expect(editor.scrollLeft).toBeGreaterThan(0)
      expect(shifted.boxByNode.get(neighbor)).toEqual(reference)
      expect([...code.querySelectorAll("[data-line-index]")].every((line, index) => line === lines[index])).toBe(true)
      expect(lines.map(line => line.textContent)).toEqual(codeEditorScrollSource.split("\n"))
      expect(firstText.y).toBe(originalY)
      const reset = click("В начало")
      expect(editor.scrollLeft).toBe(0)
      expect(editor.scrollTop).toBe(0)
      expect(reset.boxByNode.get(neighbor)).toEqual(reference)
    } finally {
      renderer.dispose()
      component.unmount()
      owner.remove()
    }
    expect(document.childNodes).toHaveLength(0)
  }, 30_000)
}
