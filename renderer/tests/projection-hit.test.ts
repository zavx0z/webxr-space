import {expect, test} from "bun:test"
import {createDocument} from "@zavx0z/dom"
import {createDocumentInteractionController, createDocumentRenderer, hitTestProjection} from "../src/index.ts"

const fixture = () => {
  const document = createDocument()
  const root = document.createElement("div")
  root.setAttribute("style", "position: relative; width: 200px; height: 200px")
  document.append(root)
  const renderer = createDocumentRenderer({document, root, viewport: {width: 200, height: 200}})
  const add = (style: string, tag: "div" | "button" = "div") => {
    const node = document.createElement(tag)
    node.setAttribute("style", style)
    root.append(node)
    return node
  }
  const hit = (x: number, y: number) => hitTestProjection(renderer.flush(), x, y)?.node ?? null
  return {document, root, renderer, add, hit}
}

test("empty projection wrappers pass input while a passive painted panel occludes it", () => {
  const f = fixture()
  const wrapper = f.add("width: 200px; height: 200px")
  expect(f.hit(100, 100)).toBeNull()
  wrapper.setAttribute("style", "width: 50px; height: 50px; background: #333")
  expect(f.hit(20, 20)).toBe(wrapper)
  expect(f.hit(100, 100)).toBeNull()
  f.renderer.dispose()
})

test("a border-only frame owns its border without masking its empty center", () => {
  const f = fixture()
  const frame = f.add("box-sizing: border-box; width: 100px; height: 100px; border: 2px solid #fff")
  expect(f.hit(1, 50)).toBe(frame)
  expect(f.hit(50, 1)).toBe(frame)
  expect(f.hit(99, 50)).toBe(frame)
  expect(f.hit(50, 99)).toBe(frame)
  expect(f.hit(50, 50)).toBeNull()
  f.renderer.dispose()
})

test("transparent and disabled controls retain input ownership and exact bubbling", () => {
  const f = fixture()
  const button = f.add("width: 80px; height: 40px; background: transparent; border: 0", "button")
  const span = f.document.createElement("span")
  span.append("Go")
  button.append(span)
  const interaction = createDocumentInteractionController({document: f.document, hitTest: hitTestProjection})
  const clicked: unknown[] = []
  button.addEventListener("click", event => clicked.push(event.target))
  const frame = f.renderer.flush()
  interaction.pointerDown(frame, {clientX: 10, clientY: 10, pointerId: 1})
  interaction.pointerUp(frame, {clientX: 10, clientY: 10, pointerId: 1})
  expect(clicked.length).toBe(1)
  expect(button.contains(clicked[0] as never)).toBe(true)
  button.setAttribute("disabled", "")
  expect(f.hit(70, 30)).toBe(button)
  interaction.pointerDown(f.renderer.flush(), {clientX: 70, clientY: 30, pointerId: 2})
  interaction.pointerUp(f.renderer.flush(), {clientX: 70, clientY: 30, pointerId: 2})
  expect(clicked.length).toBe(1)
  interaction.dispose()
  f.renderer.dispose()
})

test("scroll viewport owns wheel at its limit without leaking to another projection", () => {
  const f = fixture()
  const scroll = f.add("width: 100px; height: 50px; overflow: auto")
  const content = f.document.createElement("div")
  content.setAttribute("style", "width: 100px; height: 200px")
  scroll.append(content)
  expect(f.hit(20, 20)).toBe(scroll)
  const interaction = createDocumentInteractionController({document: f.document, hitTest: hitTestProjection})
  interaction.wheel(f.renderer.flush(), {clientX: 20, clientY: 20, deltaY: 500})
  expect(scroll.scrollTop).toBe(150)
  expect(f.hit(20, 20)).toBe(scroll)
  interaction.dispose()
  f.renderer.dispose()
})

test("transformed clipped content owns only the presented region", () => {
  const f = fixture()
  const clip = f.add("width: 40px; height: 40px; overflow: clip; transform: translate(50px, 50px)")
  const child = f.document.createElement("div")
  child.setAttribute("style", "width: 100px; height: 100px; background: #fff")
  clip.append(child)
  expect(f.hit(60, 60)).toBe(child)
  expect(f.hit(95, 60)).toBeNull()
  expect(f.hit(10, 10)).toBeNull()
  f.renderer.dispose()
})

test("transparent siblings do not steal a lower element's pointer target", () => {
  const f = fixture()
  const lower = f.add("position: absolute; width: 80px; height: 40px; background: #333")
  f.add("position: absolute; width: 200px; height: 200px; background: rgba(0, 0, 0, 0)")
  expect(f.hit(10, 10)).toBe(lower)
  expect(f.hit(100, 100)).toBeNull()
  f.renderer.dispose()
})
