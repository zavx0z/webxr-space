import {expect, test} from "bun:test"
import {createDocument, Element, type Document, type Node} from "@zavx0z/dom"
import {createRoot, type Ref} from "@zavx0z/component"
import {bindProperty, bindRef, bindText, defineCompiledTemplate, writeBinding} from "@zavx0z/template/compiled"

class TestObject extends Element {
  reads = 0
  writes = 0
  #x = 0

  constructor(document: Document) {
    super(document, "test-object")
  }

  get x() {
    this.reads++
    return this.#x
  }

  set x(value: number) {
    if (!Number.isFinite(value)) throw new TypeError("x must be finite")
    this.writes++
    this.#x = value
  }
}

function fixture() {
  const document = createDocument()
  const container = document.createElement("div")
  document.append(container)
  const target = new TestObject(document)
  const text = document.createTextNode("")
  const template = defineCompiledTemplate<{x?: number; text: unknown; ref?: Ref<Node>}>({
    bindingCount: 3,
    mount: () => ({nodes: [target, text], bindings: [bindProperty(target, "x"), bindText(text), bindRef(target)]}),
    render(props, values) {
      writeBinding(values, 0, props.x)
      writeBinding(values, 1, props.text)
      writeBinding(values, 2, props.ref)
    },
  })
  return {document, target, template, root: createRoot(container)}
}

test("неизменённые spatial props не читают и не сбрасывают прямое движение элемента", () => {
  const {root, template, target} = fixture()
  root.render(template, {x: 10, text: "initial"})
  target.x = 42
  target.reads = target.writes = 0
  for (let index = 0; index < 100; index++) root.render(template, {x: 10, text: index})
  expect(target.reads).toBe(0)
  expect(target.writes).toBe(0)
  expect(target.x).toBe(42)
  root.render(template, {x: 20, text: "new authored position"})
  expect(target.x).toBe(20)
  root.render(template, {text: "remove authored position"})
  expect(target.x).toBe(0)
  target.x = 75
  root.render(template, {text: "still absent"})
  expect(target.x).toBe(75)
  root.unmount()
})

test("failed render не принимает новое авторское значение и не публикует ref", () => {
  const {root, template, target} = fixture()
  const previous = {current: null as Node | null}
  const next = {current: null as Node | null}
  root.render(template, {x: 1, text: "initial", ref: previous})
  target.x = 2
  expect(() => root.render(template, {x: 2, text: {}, ref: next})).toThrow("primitive value")
  expect(previous.current).toBe(target)
  expect(next.current).toBeNull()
  target.x = 3
  root.render(template, {x: 2, text: "retry", ref: next})
  expect(target.x).toBe(2)
  expect(previous.current).toBeNull()
  expect(next.current).toBe(target)
  root.unmount()
  expect(next.current).toBeNull()
})

test("object ref сохраняет identity, очищается при замене и сочетается с callback cleanup", () => {
  const {root, template, target} = fixture()
  const ref = {current: null as Node | null}
  const calls: unknown[] = []
  const callback = (node: Node | null) => {
    calls.push(node?.isConnected ?? false)
    return () => { calls.push("cleanup") }
  }
  root.render(template, {x: 1, text: "initial", ref})
  expect(ref.current).toBe(target)
  root.render(template, {x: 1, text: "update", ref})
  expect(ref.current).toBe(target)
  root.render(template, {x: 1, text: "callback", ref: callback})
  expect(ref.current).toBeNull()
  expect(calls).toEqual([true])
  root.render(template, {x: 1, text: "object", ref})
  expect(calls).toEqual([true, "cleanup"])
  root.unmount()
  expect(ref.current).toBeNull()
  expect(calls).toEqual([true, "cleanup"])
})

test("unmount прежнего root не очищает ref, уже переданный другому элементу", () => {
  const first = fixture()
  const second = fixture()
  const ref = {current: null as Node | null}
  first.root.render(first.template, {x: 1, text: "first", ref})
  second.root.render(second.template, {x: 2, text: "second", ref})
  first.root.unmount()
  expect(ref.current).toBe(second.target)
  second.root.unmount()
  expect(ref.current).toBeNull()
})

test("controlled HTML input продолжает восстанавливать value после нативного редактирования", () => {
  const document = createDocument()
  const input = document.createElement("input")
  const template = defineCompiledTemplate<{value: string}>({
    bindingCount: 1,
    mount: () => ({nodes: [input], bindings: [bindProperty(input, "value")]}),
    render(props, values) { writeBinding(values, 0, props.value) },
  })
  const root = createRoot(document)
  root.render(template, {value: "authored"})
  input.value = "edited"
  root.render(template, {value: "authored"})
  expect(input.value).toBe("authored")
  root.unmount()
})
