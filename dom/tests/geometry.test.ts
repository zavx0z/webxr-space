import {expect, test} from "bun:test"
import {createDocument, DOMRect, DOMRectReadOnly, registerDocumentGeometryReader} from "../src/index.ts"

test("[DOM-CLIENT-RECT] DOMRect snapshots implement derived edges, mutation, cloning and JSON", () => {
  const rect = new DOMRect(10, 20, -4, -8)
  expect(rect.toJSON()).toEqual({x: 10, y: 20, width: -4, height: -8, left: 6, right: 10, top: 12, bottom: 20})
  rect.width = 12
  expect(rect.right).toBe(22)
  const copy = DOMRect.fromRect(rect)
  copy.x = 100
  expect(rect.x).toBe(10)
  const readonly = DOMRectReadOnly.fromRect(rect)
  expect(Object.prototype.toString.call(readonly)).toBe("[object DOMRectReadOnly]")
  expect(Object.prototype.toString.call(copy)).toBe("[object DOMRect]")
  expect(readonly.width).toBe(12)
  expect(() => DOMRect.fromRect(3 as never)).toThrow(TypeError)
})

test("[DOM-CLIENT-RECT] detached and unrendered elements return independent empty rectangles", () => {
  const document = createDocument()
  const element = document.createElement("section")
  const first = element.getBoundingClientRect()
  document.append(element)
  const second = element.getBoundingClientRect()
  expect(first).not.toBe(second)
  expect(second.toJSON()).toEqual({x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0})
  expect(first instanceof DOMRect).toBe(true)
})

test("[DOM-CLIENT-RECT] CSSOM union includes one-dimensional fragments, falls back to the first empty and follows the nearest root", () => {
  const document = createDocument()
  const parent = document.createElement("div")
  const child = document.createElement("div")
  const node = document.createElement("span")
  document.append(parent)
  parent.append(child)
  child.append(node)
  const release = registerDocumentGeometryReader(document, parent, () => [{x: 4, y: 5, width: 10, height: 20}, {x: -50, y: -50, width: 0, height: 2}, {x: 30, y: 8, width: 5, height: 2}])
  const releaseChild = registerDocumentGeometryReader(document, child, () => [{x: 9, y: 11, width: 0, height: 4}, {x: 200, y: 200, width: 0, height: 0}])
  try {
    expect(node.getBoundingClientRect().toJSON()).toEqual({x: 9, y: 11, width: 0, height: 4, left: 9, right: 9, top: 11, bottom: 15})
    parent.append(node)
    expect(node.getBoundingClientRect().toJSON()).toEqual({x: -50, y: -50, width: 85, height: 75, left: -50, right: 35, top: -50, bottom: 25})
    node.remove()
    expect(node.getBoundingClientRect().width).toBe(0)
    expect(() => registerDocumentGeometryReader(createDocument(), parent, () => [])).toThrow()
  } finally {
    releaseChild()
    release()
  }
  parent.append(node)
  expect(node.getBoundingClientRect().width).toBe(0)
  const replacement = registerDocumentGeometryReader(document, parent, () => [{width: 42, height: 5}])
  release()
  expect(node.getBoundingClientRect().width).toBe(42)
  replacement()
})
