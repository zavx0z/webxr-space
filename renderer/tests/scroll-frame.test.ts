import {expect, test} from "bun:test"
import {createDocument, HTMLElement, Node} from "@zavx0z/dom"
import {createDocumentRenderer, hitTestProjection, type RenderFrame} from "../src/index.ts"
import {readCanonicalRenderFrameChanges} from "../src/frame-changes.ts"

function fixture() {
  const document = createDocument()
  const root = document.createElement("div")
  root.setAttribute("style", "width:320px;height:240px")
  document.append(root)
  const add = (parent: Node, style: string, tag: "div" | "button" | "p" | "a" = "div") => {
    const node = document.createElement(tag)
    if (!(node instanceof HTMLElement)) throw new TypeError("Expected an HTML fixture element")
    node.setAttribute("style", style)
    parent.appendChild(node)
    return node
  }
  let measurements = 0
  const renderer = createDocumentRenderer({document, root, viewport: {width: 320, height: 240},
    textMeasurer: {measureTextAdvance(text) {
      measurements++
      return text.length * 6
    }},
  })
  const ids = new WeakMap<Node, number>()
  let id = 0
  const snapshot = (frame: RenderFrame) => JSON.parse(JSON.stringify({
    boxes: [...frame.boxes], display: [...frame.displayList], hits: [...frame.hits],
    hitOrder: frame.hitOrder, scrolls: [...frame.scrolls], transforms: [...frame.presentationTransforms ?? []],
  }, (_key, value: unknown) => {
    if (value instanceof Node) {
      if (!ids.has(value)) ids.set(value, ++id)
      return ids.get(value)
    }
    return typeof value === "number" ? Math.round(value * 1e7) / 1e7 : value
  }))
  const compareFull = (incremental: RenderFrame) => {
    const before = snapshot(incremental)
    renderer.invalidate(root)
    const full = renderer.flush()
    expect(snapshot(full)).toEqual(before)
    for (const [x, y] of [[8, 8], [24, 35], [80, 80], [170, 130], [220, 190]]) {
      expect(hitTestProjection(full, x!, y!)?.node === hitTestProjection(incremental, x!, y!)?.node).toBe(true)
    }
    expect(snapshot(incremental)).toEqual(before)
    return full
  }
  return {document, root, add, renderer, snapshot, compareFull,
    measured: () => measurements, resetMeasured: () => { measurements = 0 },
  }
}

test("scroll retains line layout, sibling records and canonical sparse paint changes", () => {
  const f = fixture()
  const outer = f.add(f.root, "width:180px;height:100px;overflow:auto;border:2px solid #555;border-radius:12px")
  const paragraph = f.add(outer, "width:280px;line-height:20px", "p")
  const link = f.add(paragraph, "color:#abcdef", "a")
  link.textContent = "wrapped inline text ".repeat(30)
  const sibling = f.add(f.root, "width:50px;height:30px;background:#fff")
  try {
    let previous = f.renderer.flush()
    expect(f.measured()).toBeGreaterThan(0)
    for (const [left, top] of [[25, 30], [60, 90], [0, 0], [10000, 10000], [10001, 10001]]) {
      const oldSnapshot = f.snapshot(previous)
      f.resetMeasured()
      f.document.transaction(() => {
        outer.scrollLeft = left!
        outer.scrollTop = top!
      })
      const next = f.renderer.flush()
      expect(f.measured()).toBe(0)
      expect(next.boxByNode.get(sibling) === previous.boxByNode.get(sibling)).toBe(true)
      expect(next.boxByNode.get(outer) === previous.boxByNode.get(outer)).toBe(true)
      expect(readCanonicalRenderFrameChanges(next)?.previous === previous).toBe(true)
      expect(f.snapshot(previous)).toEqual(oldSnapshot)
      previous = f.compareFull(next)
    }
  } finally { f.renderer.dispose() }
})

test("nested scrolling on both axes with scaled content matches a full layout", () => {
  const f = fixture()
  const outer = f.add(f.root, "width:230px;height:180px;overflow:auto;border:3px solid #444;padding:5px;transform:translate(8px,6px) scale(0.9);transform-origin:0 0")
  const inner = f.add(outer, "width:280px;height:240px;overflow:auto;border:2px solid #555;border-radius:9px;margin:8px")
  const transformed = f.add(inner, "width:400px;transform:translate(4px,3px) scale(1.1);transform-origin:0 0")
  const paragraph = f.add(transformed, "width:400px;line-height:20px", "p")
  paragraph.textContent = "Many lines of text ".repeat(100)
  try {
    f.renderer.flush()
    for (const [a, b] of [[10, 35], [20, 70], [0, 20], [5, 0]]) {
      f.resetMeasured()
      f.document.transaction(() => {
        inner.scrollLeft = b!
        inner.scrollTop = b! * 2
        outer.scrollTop = a!
        outer.scrollLeft = a! / 2
      })
      const next = f.renderer.flush()
      expect(f.measured()).toBe(0)
      f.compareFull(next)
    }
  } finally { f.renderer.dispose() }
})

test("content, styles and resize invalidate the scroll projection before reusing it again", () => {
  const f = fixture()
  const scroll = f.add(f.root, "width:180px;height:100px;overflow:auto")
  const text = f.add(scroll, "line-height:20px", "p")
  text.textContent = "content ".repeat(100)
  try {
    f.renderer.flush()
    for (const update of [
      () => { text.textContent = "new content ".repeat(200) },
      () => { text.setAttribute("style", "line-height:25px;width:160px") },
      () => { f.renderer.resize({width:280,height:200}) },
      () => { text.setAttribute("style", "line-height:25px;width:160px;transform:translate(3px,4px)") },
    ]) {
      f.resetMeasured()
      f.document.transaction(() => {
        scroll.scrollTop += 10
        update()
      })
      f.compareFull(f.renderer.flush())
      expect(f.measured()).toBeGreaterThan(0)
      f.resetMeasured()
      scroll.scrollTop += 10
      const next = f.renderer.flush()
      expect(f.measured()).toBe(0)
      f.compareFull(next)
    }
  } finally { f.renderer.dispose() }
})

test("hidden overflow and textarea scrolling use the same projection path", () => {
  const f = fixture()
  const scroll = f.add(f.root, "width:200px;height:80px;overflow:hidden")
  const textarea = f.document.createElement("textarea")
  textarea.setAttribute("style", "width:280px;height:160px;line-height:20px;overflow:auto")
  textarea.value = Array.from({length:30}, (_, i) => `line ${i}`).join("\n")
  scroll.append(textarea)
  try {
    f.renderer.flush()
    f.resetMeasured()
    f.document.transaction(() => {
      scroll.scrollTop = 25
      textarea.scrollTop = 35
    })
    const next = f.renderer.flush()
    expect(f.measured()).toBe(0)
    f.compareFull(next)
  } finally { f.renderer.dispose() }
})

test("vector paths and images keep their geometry during repeated scroll", () => {
  const f = fixture()
  const scroll = f.add(f.root, "width:200px;height:100px;overflow:auto")
  const group = f.add(scroll, "position:relative;width:400px;height:500px;transform:translate(-5px,2px) scale(1.05);transform-origin:0 0")
  const path = f.document.createElement("vector-path")
  path.setAttribute("d", "M 10 20 L 180 80")
  path.setAttribute("style", "position:absolute;display:block;left:0;top:0;width:0;height:0;stroke:#abcdef;stroke-width:4px")
  group.append(path)
  const image = f.document.createElement("img")
  image.src = "image.png"
  image.width = 80
  image.height = 60
  f.add(group, "display:block").append(image)
  try {
    let previous = f.renderer.flush()
    expect(hitTestProjection(previous, 184, 86)?.node === path).toBe(true)
    for (const top of [15, 35, 80, 0]) {
      scroll.scrollTop = top
      const next = f.renderer.flush()
      const oldPath = previous.displayList.find(item => item.kind === "path")
      const nextPath = next.displayList.find(item => item.kind === "path")
      expect(hitTestProjection(next, 184, 86 - top)?.node === path).toBe(true)
      expect(oldPath?.kind === "path" && nextPath?.kind === "path" && oldPath.geometry === nextPath.geometry).toBe(true)
      previous = f.compareFull(next)
    }
  } finally { f.renderer.dispose() }
})

test("an open anchored popover keeps the normal placement path", () => {
  const f = fixture()
  const scroll = f.add(f.root, "width:200px;height:100px;overflow:auto")
  const content = f.add(scroll, "height:500px")
  const button = f.add(content, "width:80px;height:30px", "button")
  button.textContent = "Open"
  const popover = f.add(content, "width:100px;height:50px;background:#333")
  popover.popover = "manual"
  popover.textContent = "Popover"
  try {
    popover.showPopover({source: button})
    f.renderer.flush()
    f.resetMeasured()
    scroll.scrollTop = 30
    const next = f.renderer.flush()
    expect(f.measured()).toBeGreaterThan(0)
    f.compareFull(next)
    popover.hidePopover()
    f.renderer.flush()
    f.resetMeasured()
    scroll.scrollTop = 40
    f.renderer.flush()
    expect(f.measured()).toBe(0)
  } finally { f.renderer.dispose() }
})
