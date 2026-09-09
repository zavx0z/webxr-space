import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {createRoot} from "@zavx0z/component"
import {createDocument} from "@zavx0z/dom"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import type {CompiledTemplate} from "@zavx0z/template/compiled"

const root = resolve(import.meta.dir, "../../..")
Bun.plugin(createTemplateJsxBunPlugin({
  cwd: root,
  persistent: true,
  sourceRoots: [resolve(root, "nodes"), resolve(root, "ui")],
}))

const {Frame} = await import("@webxr/nodes/frame")

test("[NODES-TITLE-001-FRAME] Frame не распространяет tooltip на всю поверхность", () => {
  const frame = mount(Frame, {
    id: "frame",
    label: "Видимая рамка",
    title: "Описание рамки",
    rect: {x: 0, y: 0, width: 320, height: 180},
  })
  const section = frame.element.querySelector('section[data-frame-id="frame"]')!
  expect(section.hasAttribute("title")).toBe(false)
  expect(section.querySelector('[data-frame-label]')?.getAttribute("title")).toBe("Описание рамки")
  frame.dispose()
})

function mount<Props extends Readonly<Record<string, unknown>>>(component: unknown, props: Props) {
  const document = createDocument()
  const element = document.createElement("div")
  document.append(element)
  const componentRoot = createRoot(element)
  componentRoot.render(component as CompiledTemplate<Props>, props)
  return {
    element,
    dispose() {
      componentRoot.unmount()
      expect(element.childNodes).toHaveLength(0)
    },
  }
}
