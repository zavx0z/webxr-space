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

const {ParameterNode} = await import("@nodes/node/parameter")

test("[NODES-TITLE-001-NODE] ParameterNode не распространяет tooltip на всю поверхность", () => {
  const node = mount(ParameterNode, {
    id: "node",
    label: "Видимая нода",
    title: "Описание ноды",
    rect: {x: 0, y: 0, width: 240, height: 96},
    collapsed: false,
    preview: {enabled: false},
  })
  const article = node.element.querySelector('article[data-node-id="node"]')!
  expect(article.hasAttribute("title")).toBe(false)
  expect(article.querySelector('[data-node-label]')?.getAttribute("title")).toBe("Описание ноды")
  for (const action of article.querySelectorAll("button")) {
    expect(action.getAttribute("title")).toBe(action.getAttribute("aria-label"))
  }
  node.dispose()
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
