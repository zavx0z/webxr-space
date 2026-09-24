import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {createDocument, type HTMLElement} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/component"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import {createDocumentRenderer, readRenderedSelectionText} from "@renderer/html"

const workspace = resolve(import.meta.dir, "../../..")
Bun.plugin(createTemplateJsxBunPlugin({cwd: workspace, persistent: true, sourceRoots: [resolve(workspace, "markdown"), resolve(workspace, "ui"), resolve(workspace, "nodes")]}))
const {CrossBlockSelectionFixture} = await import("./selection.fixture.tsx")

// Компиляция тестового TSX на Intel Mac может занимать больше 5 секунд.
test("cross-block composition copies ordinary paragraphs, Markdown and code while excluding gutter numbers", async () => {
  const document = createDocument()
  const staging = document.createElement("div")
  const component = createRoot(staging)
  component.render(CrossBlockSelectionFixture as never, {})
  const owner = staging.firstElementChild as HTMLElement
  staging.removeChild(owner)
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
    component.unmount()
    owner.remove()
  }
}, 30_000)
