import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {createDocument} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/component"
import {createDocumentRenderer} from "@renderer/html"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import type {CompiledTemplate} from "@zavx0z/template/compiled"

const root = resolve(import.meta.dir, "../../..")
Bun.plugin(createTemplateJsxBunPlugin({cwd: root, persistent: true, sourceRoots: [resolve(root, "nodes")]}))
const {FilledMarkerFixture} = await import("./filled-marker.fixture.tsx")

test("[NODES-MARKER-FILL-GAP] fill-only замкнутый vector-path должен создать paint", () => {
  const document = createDocument()
  const owner = document.createElement("div")
  document.append(owner)
  const component = createRoot(owner)
  const renderer = createDocumentRenderer({document, root: owner, viewport: {width: 100, height: 100}})
  try {
    component.render(FilledMarkerFixture as unknown as CompiledTemplate<{}>, {})
    const element = owner.querySelector("[data-filled-marker-reproduction]")!
    expect(element).not.toBeNull()
    expect(renderer.flush().displayList.some(item => item.node === element)).toBe(true)
  } finally {
    component.unmount()
    renderer.dispose()
    owner.remove()
  }
})
