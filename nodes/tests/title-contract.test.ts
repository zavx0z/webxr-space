import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {createRoot} from "@zavx0z/component"
import {createDocument, type Element} from "@zavx0z/dom"
import {Parameter as ParameterModel, type NodeJsonValue} from "@zavx0z/nodetree"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import type {CompiledTemplate} from "@zavx0z/template/compiled"

const root = resolve(import.meta.dir, "../..")
Bun.plugin(createTemplateJsxBunPlugin({
  cwd: root,
  persistent: true,
  sourceRoots: [resolve(root, "nodes"), resolve(root, "ui")],
}))

const {Frame} = await import("@zavx0z/nodes/frame")
const {Node} = await import("@zavx0z/nodes/node")
const {Parameter, TextParameter} = await import("@zavx0z/nodes/parameter")
const {Socket} = await import("@zavx0z/nodes/socket")

test("[NODES-TITLE-001] Node и Frame не распространяют tooltip на всю поверхность", () => {
  const node = mount(Node, {
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

test("[NODES-TITLE-003] Parameter проецирует description ровно на один видимый target", () => {
  const field = mount(TextParameter, {
    id: "text",
    nodeId: "node",
    label: "Текст",
    title: "Описание текста",
    value: "Значение",
  })
  expect(field.element.querySelector('[data-parameter-id="text"]')?.hasAttribute("title")).toBe(false)
  expect(titleTargets(field.element, "Описание текста")).toHaveLength(1)
  field.dispose()

  const connected = mount(TextParameter, {
    id: "connected",
    nodeId: "node",
    label: "Связанный текст",
    title: "Описание связи",
    value: "Значение",
    connected: true,
    sockets: [{
      id: "in",
      kind: "string",
      direction: "input",
      side: "left",
      label: "Вход",
      connected: true,
    }],
  })
  expect(titleTargets(connected.element, "Описание связи")).toHaveLength(1)
  expect(connected.element.querySelector('[data-parameter-label]')?.getAttribute("title")).toBe("Описание связи")
  connected.dispose()

  const model = new ParameterModel<NodeJsonValue, NodeJsonValue>(
    "projected",
    "Значение",
    {label: "Проекция", description: "Описание проекции"},
    {id: "string", version: 1},
  )
  const projected = mount(Parameter, {
    nodeId: "node",
    snapshot: model.snapshot(),
    sockets: [],
  })
  expect(projected.element.querySelector('[data-parameter-id="projected"]')?.hasAttribute("title")).toBe(false)
  expect(titleTargets(projected.element, "Описание проекции")).toHaveLength(1)
  projected.dispose()
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

function titleTargets(element: Element, title: string): readonly Element[] {
  return [...element.querySelectorAll("[title]")].filter(candidate => candidate.getAttribute("title") === title)
}
