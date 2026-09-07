import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {createDocument, MouseEvent, readDocumentTextHighlights, type HTMLElement} from "@zavx0z/dom"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import {createDocumentRenderer, readRenderedSelectionText} from "@zavx0z/renderer"
import {createDocumentClipboardController} from "../../browser/clipboard.ts"
import type {OwnerStoryDescriptor} from "../.storybook/stories/story-types.ts"

const workspace = resolve(import.meta.dir, "../..")
Bun.plugin(createTemplateJsxBunPlugin({cwd: workspace, persistent: true, sourceRoots: [resolve(workspace, "ui")]}))
const editor = await import("../.storybook/stories/subjects/components-data-code-editor.ts")
const markdown = await import("../.storybook/stories/subjects/components-data-markdown.ts")

const descriptors: readonly OwnerStoryDescriptor[] = [
  editor.story_state_editable,
  editor.story_selection_multiple,
  markdown.story_selection_cross_block,
]

test("selection stories resolve exact lazy catalog routes and use the supplied Document without a second menu", async () => {
  const catalog = await Bun.file(resolve(import.meta.dir, "../.storybook/catalog.json")).text()
  for (const descriptor of descriptors) {
    expect(catalog).toContain(`"route": "${descriptor.route}"`)
    const document = createDocument()
    const {story} = await descriptor.create(document)
    const owner = story.element as HTMLElement
    document.append(owner)
    try {
      expect(owner.ownerDocument).toBe(document)
      expect(owner.querySelectorAll("canvas")).toHaveLength(0)
      expect(owner.querySelectorAll('[role="menu"]')).toHaveLength(0)
      expect(owner.querySelectorAll('code[contenteditable="plaintext-only"]')).toHaveLength(1)
      expect(story.source.typescript).toContain('createRoot(container).render(')
      expect(story.source.html).toContain("<code")
    } finally { story.dispose() }
    expect(document.childNodes).toHaveLength(0)
    expect(readDocumentTextHighlights(document)).toHaveLength(0)
  }
})

test("multiselection story executes real editor copy and distributed paste", async () => {
  const document = createDocument()
  const {story} = await editor.story_selection_multiple.create(document)
  const owner = story.element as HTMLElement
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
  } finally { clipboard.dispose(); story.dispose() }
})

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
  } finally { renderer.dispose(); story.dispose() }
})
