import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {createRoot} from "@zavx0z/component"
import {createDocument, type Element} from "@zavx0z/dom"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import type {CompiledTemplate} from "@zavx0z/template/compiled"

const root = resolve(import.meta.dir, "../../../..")
Bun.plugin(createTemplateJsxBunPlugin({
  cwd: root,
  persistent: true,
  sourceRoots: [resolve(root, "nodes/parameters"), resolve(root, "nodes/sockets"), resolve(root, "ui")],
}))

const {Socket} = await import("@nodes/sockets/socket")

test("[NODES-TITLE-002] Socket учитывает видимую row-подпись и сохраняет endpoint/type/description", () => {
  const endpoint = mount(Socket, socketProps({presentation: "endpoint"}))
  expect(endpoint.element.querySelector("button")?.getAttribute("title")).toBe("Float · Float")
  endpoint.dispose()

  const visibleType = mount(Socket, socketProps({presentation: "row"}))
  expect(visibleType.element.querySelector("button")?.hasAttribute("title")).toBe(false)
  visibleType.dispose()

  const additionalType = mount(Socket, socketProps({presentation: "row", label: "Значение"}))
  expect(additionalType.element.querySelector("button")?.getAttribute("title")).toBe("Float")
  additionalType.dispose()

  const description = mount(Socket, socketProps({
    presentation: "row",
    label: "Значение",
    title: "Числовой результат",
  }))
  expect(description.element.querySelector("button")?.getAttribute("title")).toBe("Числовой результат")
  description.dispose()
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

function socketProps(overrides: Readonly<Record<string, unknown>>) {
  return {
    id: "value",
    nodeId: "node",
    kind: "float" as const,
    direction: "output" as const,
    side: "right" as const,
    label: "Float",
    ...overrides,
  }
}
