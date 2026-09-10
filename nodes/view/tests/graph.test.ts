import {expect, test} from "bun:test"
import {dirname, resolve} from "node:path"
import {createDocument, MouseEvent, PointerEvent, WheelEvent} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/component"
import {createDocumentRenderer} from "@renderer/html"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import type {GraphViewProps, GraphSelection} from "@webxr/nodes/view"

const root = resolve(import.meta.dir, "../../..")
Bun.plugin(createTemplateJsxBunPlugin({cwd: root, persistent: true, sourceRoots: ["nodes", "ui"].map(path => resolve(root, path))}))
const {GraphView} = await import("@webxr/nodes/view")
const {scene, MeasurementNode} = await import("./graph.fixture.tsx")

test("[GRAPH-VIEW-001] просмотр самостоятельно выполняет навигацию и сохраняет состояние при pending и смене режима", async () => {
  const document = createDocument()
  const owner = document.createElement("div")
  document.append(owner)
  const component = createRoot(owner)
  const selected: GraphSelection[] = []
  const template = GraphView as unknown as CompiledTemplate<GraphViewProps>
  const props: GraphViewProps = {scene, width: 500, height: 300, navigation: "pan-zoom", onSelectionChange: value => selected.push(value)}
  try {
    component.render(template, props)
    const node = owner.querySelector('[data-node-id="counter"]')!
    const button = node.querySelector("button")!
    expect(() => button.dispatchEvent(new PointerEvent("pointerdown", {pointerId: 1, bubbles: true}))).not.toThrow()
    button.dispatchEvent(new PointerEvent("pointerup", {pointerId: 1, bubbles: true}))
    button.dispatchEvent(new MouseEvent("click", {bubbles: true}))
    await Promise.resolve()
    expect(button.textContent).toBe("1")
    const surface = owner.querySelector("[data-graph-scene]")!
    const before = surface.getAttribute("style")
    owner.querySelector("[data-graph-viewport]")!.dispatchEvent(new WheelEvent("wheel", {deltaY: 25, bubbles: true, cancelable: true}))
    await Promise.resolve()
    expect(surface.getAttribute("style")).not.toBe(before)
    component.render(template, {...props, pending: true})
    const count = selected.length
    node.dispatchEvent(new MouseEvent("click", {bubbles: true}))
    expect(selected).toHaveLength(count)
    expect(surface.hasAttribute("hidden")).toBe(true)
    component.render(template, {...props, navigation: "scroll"})
    expect(owner.querySelector('[data-node-id="counter"]')).toBe(node)
    expect(node.querySelector("button")).toBe(button)
    expect(button.textContent).toBe("1")
    expect(owner.querySelector('[data-graph-editor]')).toBeNull()
    expect(owner.querySelector('button[aria-label="Вписать"]')).toBeNull()
  } finally {
    component.unmount()
    owner.remove()
  }
})

test("[GRAPH-MEASUREMENT-GAP-001] client rect до GPU уже доступен, но содержит масштаб проекции вместо локального размера", () => {
  const document = createDocument()
  const owner = document.createElement("div")
  document.append(owner)
  const component = createRoot(owner)
  component.render(MeasurementNode as unknown as CompiledTemplate<{}>, {})
  let scale = 1
  const renderer = createDocumentRenderer({
    document,
    root: owner,
    viewport: {width: 700, height: 400},
    projectClientPoint: point => ({x: point.x * scale, y: point.y * scale}),
    textMeasurer: {measureTextAdvance: text => text.length * 8},
  })
  try {
    const element = owner.querySelector('[data-measurement-node]')!
    const first = element.getBoundingClientRect()
    expect(first.width).toBeGreaterThan(18)
    scale = 2
    const second = element.getBoundingClientRect()
    expect(second.width).toBe(first.width * 2)
    expect(second.height).toBe(first.height * 2)
    // Только тестовый oracle: production Nodes не получает объект Renderer.
    expect(renderer.flush().boxByNode.get(element)!.width).toBe(first.width)
    expect("offsetWidth" in element).toBe(false)
    expect(owner.querySelector('[data-measurement-node]')).toBe(element)
    element.querySelector("span")!.textContent += " длиннее"
    expect(element.getBoundingClientRect().width).toBeGreaterThan(second.width)
    expect(owner.querySelectorAll("canvas")).toHaveLength(0)
  } finally {
    renderer.dispose()
    component.unmount()
    owner.remove()
  }
})

test("[GRAPH-VIEW-DEPENDENCIES] основной модуль просмотра не импортирует редактор или набор параметризованных нод", async () => {
  const visited = new Set<string>()
  const visit = async (file: string): Promise<void> => {
    if (visited.has(file)) return
    visited.add(file)
    const source = await Bun.file(file).text()
    // Парсер Bun исключает type imports из загружаемого замыкания.
    const transpiler = new Bun.Transpiler({loader: file.endsWith(".tsx") ? "tsx" : "ts"})
    for (const entry of transpiler.scan(source).imports) {
      const specifier = entry.path
      if (!specifier.startsWith(".") && !specifier.startsWith("@")) continue
      const target = Bun.resolveSync(specifier, dirname(file))
      if (target.startsWith(root) && !target.includes("/node_modules/")) await visit(target)
    }
  }
  await visit(resolve(root, "nodes/view/index.tsx"))
  expect(visited.size).toBeGreaterThan(5)
  for (const path of visited) {
    expect(path).not.toContain("/nodes/editor/")
    expect(path).not.toContain("/nodes/shared/model-node/")
    expect(path).not.toContain("/nodes/parameters/")
    expect(path).not.toContain("/nodes/node/parameter/")
    expect(path).not.toContain("/nodes/node/content/")
  }
})
