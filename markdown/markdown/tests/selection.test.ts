import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {createDocument, type HTMLElement} from "@zavx0z/dom"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import {createDocumentRenderer, readRenderedSelectionText} from "@zavx0z/renderer"

const workspace = resolve(import.meta.dir, "../../..")
Bun.plugin(createTemplateJsxBunPlugin({cwd: workspace, persistent: true, sourceRoots: [resolve(workspace, "markdown"), resolve(workspace, "ui")]}))
const markdown = await import("../../.storybook/stories/subjects/components-data-markdown.ts")

test("cross-block story copies ordinary paragraphs, Markdown and code while excluding gutter numbers", async () => {
  const document = createDocument()
  const {story} = await markdown.story_selection_cross_block.create(document)
  const owner = story.element as HTMLElement
  document.append(owner)
  const renderer = createDocumentRenderer({document, root: owner, viewport: {width: 760, height: 1000}})
  try {
    const first = owner.children[0]!
    const last = owner.children[2]!
    document.getSelection().setBaseAndExtent(first.firstChild!, 0, last.lastChild!, (last.lastChild!.textContent ?? "").length)
    const text = readRenderedSelectionText(renderer.flush())
    expect(text).toContain("Начало: это обычный абзац")
    expect(text).toContain("Markdown в том же документе")
    expect(text).toContain('const message = "Выделение проходит через код"')
    expect(text).toContain("Конец: это снова обычный абзац")
    expect(text).not.toContain("\n1\n")
    expect(text).not.toContain("\n2\n")
    const readOnlyCode = Array.from(owner.querySelectorAll("code")).find(code => code.getAttribute("contenteditable") === "false")
    expect(readOnlyCode?.textContent).toContain("\n\nconsole.log")
  } finally {
    renderer.dispose()
    story.dispose()
  }
})
