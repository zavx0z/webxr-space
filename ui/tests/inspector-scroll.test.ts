import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {createDocument, type HTMLElement} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/component"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import {createDocumentRenderer} from "@renderer/html"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"

const workspace = resolve(import.meta.dir, "../..")
Bun.plugin(createTemplateJsxBunPlugin({cwd: workspace, persistent: true, sourceRoots: [resolve(workspace, "ui")]}))
const {InspectorFixture} = await import("./inspector.fixture.tsx")
const theme = await Bun.file(resolve(workspace, "ui/themes/theme.css")).text()

test("Inspector ограничивает стек панелей доступной высотой и прокручивает его содержимое", async () => {
  const document = createDocument()
  const staging = document.createElement("div")
  const component = createRoot(staging)
  component.render(InspectorFixture as unknown as CompiledTemplate<{}>, {})
  const owner = staging.querySelector("aside") as HTMLElement
  staging.removeChild(owner)
  const container = document.createElement("div")
  container.setAttribute("style", "display:flex;width:400px;height:300px")
  container.append(owner)
  document.append(container)
  const panels = owner.querySelector("[data-inspector-panels]") as HTMLElement
  const tall = document.createElement("div")
  tall.setAttribute("style", "height:1000px;min-height:1000px;flex-shrink:0")
  panels.append(tall)
  const renderer = createDocumentRenderer({
    document,
    root: container,
    viewport: {width: 400, height: 300},
    styleSheets: [theme],
  })
  try {
    const initial = renderer.flush()
    const scroll = initial.scrolls.get(panels)
    expect(initial.boxByNode.get(owner)?.height).toBe(300)
    expect(scroll?.clientHeight).toBeLessThan(scroll?.scrollHeight ?? 0)
    expect(scroll?.maxScrollTop).toBeGreaterThan(0)
    panels.scrollTop = 160
    expect(renderer.flush().scrolls.get(panels)?.scrollTop).toBe(160)
  } finally {
    renderer.dispose()
    component.unmount()
  }
  expect(document.childNodes).toHaveLength(1)
}, 30_000)
