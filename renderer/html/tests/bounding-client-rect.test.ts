import {expect, test} from "bun:test"
import {createDocument, DOMRect, type HTMLElement} from "@zavx0z/dom"
import {createDocumentRenderer} from "../src/index.ts"

function fixture() {
  const document = createDocument()
  const root = document.createElement("div")
  root.setAttribute("style", "width:400px;height:300px;position:relative")
  document.append(root)
  const renderer = createDocumentRenderer({document, root, viewport: {width: 400, height: 300}, textMeasurer: {measureTextAdvance: value => value.length * 8}})
  const add = (style: string, parent: HTMLElement = root, tag: "div" | "span" = "div") => {
    const element = document.createElement(tag)
    element.setAttribute("style", style)
    parent.append(element)
    return element
  }
  return {document, root, renderer, add}
}

test("[RENDERER-CLIENT-RECT] border-box includes padding and borders, excludes margin and shadow and reads fresh layout", () => {
  const f = fixture()
  const node = f.add("width:100px;height:30px;padding:8px;border:2px solid red;margin:7px;box-shadow:0 0 20px black")
  try {
    const rect = node.getBoundingClientRect()
    expect(rect instanceof DOMRect).toBe(true)
    expect(rect.toJSON()).toEqual({x: 7, y: 7, width: 120, height: 50, left: 7, right: 127, top: 7, bottom: 57})
    rect.width = 999
    expect(node.getBoundingClientRect().width).toBe(120)
    node.setAttribute("style", "box-sizing:border-box;width:100px;height:30px;padding:8px;border:2px solid red")
    expect(node.getBoundingClientRect().width).toBe(100)
    expect(node.getBoundingClientRect().height).toBe(30)
    const frame = f.renderer.flush()
    node.getBoundingClientRect()
    expect(f.renderer.flush()).toBe(frame)
    f.renderer.dispose()
    expect(node.getBoundingClientRect().width).toBe(0)
  } finally { f.renderer.dispose() }
})

test("[RENDERER-CLIENT-RECT] scrolling and transforms affect client coordinates but viewport clipping does not truncate them", () => {
  const f = fixture()
  const scroll = f.add("position:absolute;left:20px;top:30px;width:100px;height:60px;overflow:auto")
  const node = f.add("width:300px;height:200px;transform:translate(5px,7px) scale(2);transform-origin:0 0", scroll)
  try {
    expect(node.getBoundingClientRect().toJSON()).toEqual({x: 25, y: 37, width: 600, height: 400, left: 25, right: 625, top: 37, bottom: 437})
    scroll.scrollLeft = 15
    scroll.scrollTop = 20
    const rect = node.getBoundingClientRect()
    expect(rect.x).toBe(10)
    expect(rect.y).toBe(17)
    expect(rect.width).toBe(600)
    node.setAttribute("style", "width:40px;height:30px;transform:scale(-2,3);transform-origin:0 0")
    expect(node.getBoundingClientRect().width).toBe(80)
    expect(node.getBoundingClientRect().height).toBe(90)
  } finally { f.renderer.dispose() }
})

test("[RENDERER-CLIENT-RECT] inline fragments, hidden visibility, display none and same-Document reparent remain coherent", () => {
  const f = fixture()
  const narrow = f.add("width:60px;line-height:20px;font-size:16px")
  const span = f.add("display:inline", narrow, "span")
  span.textContent = "ab cd ef gh"
  const hidden = f.add("position:absolute;left:140px;top:20px;width:50px;height:25px;visibility:hidden")
  try {
    const first = span.getBoundingClientRect()
    expect(first.height).toBeGreaterThan(20)
    expect(first.width).toBeLessThanOrEqual(60)
    expect(hidden.getBoundingClientRect().width).toBe(50)
    hidden.setAttribute("style", "display:none")
    expect(hidden.getBoundingClientRect().toJSON()).toEqual(new DOMRect().toJSON())
    const secondRoot = f.document.createElement("div")
    secondRoot.setAttribute("style", "width:300px;height:100px")
    f.root.append(secondRoot)
    const second = createDocumentRenderer({document: f.document, root: secondRoot, viewport: {width: 300, height: 100}, projectClientPoint: point => ({x: point.x + 500, y: point.y + 100})})
    try {
      secondRoot.append(span)
      expect(span.getBoundingClientRect().left).toBeGreaterThanOrEqual(500)
      f.root.append(span)
      expect(span.getBoundingClientRect().left).toBeLessThan(500)
    } finally { second.dispose() }
    span.remove()
    expect(span.getBoundingClientRect().width).toBe(0)
  } finally { f.renderer.dispose() }
})

test("[RENDERER-CLIENT-RECT] empty positioned boxes preserve their location", () => {
  const f = fixture()
  const node = f.add("position:absolute;left:11px;top:22px;width:0;height:0")
  try { expect(node.getBoundingClientRect().toJSON()).toEqual(new DOMRect(11, 22, 0, 0).toJSON()) }
  finally { f.renderer.dispose() }
})


test("[RENDERER-CLIENT-RECT] flex text determines the complete auto-sized box and updates synchronously", () => {
  const f = fixture()
  const row = f.add("display:flex;align-items:flex-start;width:400px")
  const node = f.add("display:flex;flex-direction:column;flex:0 0 auto;padding:8px;border:2px solid red", row)
  const label = f.add("line-height:20px", node, "span")
  label.textContent = "Node"
  try {
    const initial = node.getBoundingClientRect()
    expect(initial.width).toBe(4 * 8 + 20)
    expect(initial.height).toBe(40)
    label.textContent = "ContentNode"
    const changed = node.getBoundingClientRect()
    expect(changed.width).toBe(11 * 8 + 20)
    expect(changed.height).toBe(40)
    expect(initial.width).toBe(52)
  } finally { f.renderer.dispose() }
})
