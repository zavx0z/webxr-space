import {expect, test} from "bun:test"
import {createDocument, Element, type Document} from "@zavx0z/dom"
import {bindProperty, defineCompiledTemplate, writeBinding} from "@zavx0z/template/compiled"
import {component, createRoot} from "../src/index.ts"

class SceneElement extends Element {
  constructor(document: Document) { super(document, "scene") }
  get viewportWidth() { return Number(this.getAttribute("viewport-width") ?? 1) }
  set viewportWidth(value: number) { this.setAttribute("viewport-width", String(value)) }
  private factoryValue: (() => object) | null = null
  get factory() { return this.factoryValue }
  set factory(value: (() => object) | null) { this.factoryValue = value }
}

test("Document root монтирует compiled App, сохраняет reflected properties и освобождает ownership", () => {
  const document = createDocument({elementFactories: {scene: owner => new SceneElement(owner)}})
  const template = defineCompiledTemplate<{viewportWidth?: number; factory?: () => object}>({
    displayName: "App",
    bindingCount: 2,
    mount(document) {
      const scene = document.createElement("scene")
      return {nodes: [scene], bindings: [bindProperty(scene, "viewportWidth"), bindProperty(scene, "factory")]}
    },
    render(props, values) {
      writeBinding(values, 0, props.viewportWidth)
      writeBinding(values, 1, props.factory)
    },
  })
  const root = createRoot(document)
  const factory = () => ({})
  root.render(component(template, {viewportWidth: 7, factory}))
  const scene = document.documentElement as SceneElement
  expect(scene.viewportWidth).toBe(7)
  expect(scene.getAttribute("viewport-width")).toBe("7")
  expect(scene.hasAttribute("viewportWidth")).toBe(false)
  expect(scene.factory).toBe(factory)
  root.render(component(template, {}))
  root.flush()
  expect(document.documentElement).toBe(scene)
  expect(scene.viewportWidth).toBe(1)
  expect(scene.factory).toBeNull()
  expect(() => createRoot(document)).toThrow("live component root")
  root.unmount()
  expect(document.documentElement).toBeNull()
  createRoot(document).unmount()
})

test("Document root не принимает два корневых элемента и не повреждает предыдущее дерево", () => {
  const document = createDocument()
  const root = createRoot(document)
  const template = (count: number) => defineCompiledTemplate({
    displayName: "Roots",
    bindingCount: 0,
    mount(document) { return {nodes: Array.from({length: count}, () => document.createElement("div")), bindings: []} },
    render() {},
  })
  root.render(template(1), {})
  const before = document.documentElement
  expect(() => root.render(template(2), {})).toThrow()
  expect(document.documentElement).toBe(before)
  root.unmount()
})
