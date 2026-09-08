import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {createDocument, MouseEvent, type HTMLElement} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"

const workspace = resolve(import.meta.dir, "../..")
Bun.plugin(createTemplateJsxBunPlugin({cwd: workspace, persistent: true, sourceRoots: [resolve(workspace, "ui")]}))
const stories = await import("../.storybook/stories/subjects/components-data-code-editor.ts")
const {codeEditorScrollSource} = await import("../.storybook/stories/compiled/compiled-code-editor-scroll-story.tsx")
const theme = await Bun.file(resolve(workspace, "ui/themes/theme.css")).text()

for (const [descriptor, height, tooltip] of [
  [stories.story_performance_large, 440, null],
  [stories.story_performance_compact, 180, "HTML · 420 строк"],
] as const) {
  test(`${descriptor.route} uses production code and scrolls both axes without replacing nodes or moving its neighbor`, async () => {
    const catalog = await Bun.file(resolve(workspace, "ui/.storybook/catalog.json")).text()
    expect(catalog).toContain(`"route": "${descriptor.route}"`)
    const document = createDocument()
    const {story} = await descriptor.create(document)
    const owner = story.element as HTMLElement
    document.append(owner)
    const renderer = createDocumentRenderer({document, root: owner, viewport: {width: 1000, height: 700}, styleSheets: [theme]})
    try {
      const editor = owner.querySelector('section[role="region"]') as HTMLElement
      const code = editor.querySelector("code")!
      const neighbor = owner.querySelector("aside")!
      const lines = [...code.querySelectorAll("[data-line-index]")]
      expect(owner.ownerDocument).toBe(document)
      for (const tag of ["canvas", "xr-space", "xr-view-point", "xr-hud", "display"]) {
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
      expect(story.source.typescript).toContain("Array.from({length: 420}")
      expect(story.source.typescript).toContain('createRoot(container).render(<CodeEditor')
    } finally {
      renderer.dispose()
      story.dispose()
    }
    expect(document.childNodes).toHaveLength(0)
  }, 30_000)
}
