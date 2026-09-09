import {expect, test} from "bun:test"
import {createDocument, HTMLElement} from "@zavx0z/dom"
import {createDocumentRenderer, hitTestProjection} from "../src/index.ts"

function fixture() {
  const document = createDocument()
  const root = document.createElement("main") as HTMLElement
  root.setAttribute("style", "display:block;width:400px;height:300px")
  document.append(root)
  const add = (parent: HTMLElement, style: string) => {
    const node = document.createElement("div") as HTMLElement
    node.setAttribute("style", `display:block;${style}`)
    parent.append(node)
    return node
  }
  const renderer = createDocumentRenderer({document, root, viewport: {width: 400, height: 300}})
  return {document, root, add, renderer}
}

test("viewport-fixed boxes escape positioned overflow ancestors and do not enlarge their scroll range", () => {
  const f = fixture()
  const parent = f.add(f.root, "position:relative;left:100px;top:80px;width:80px;height:60px;overflow:auto;border:2px solid #888")
  const content = f.add(parent, "height:200px")
  const fixed = f.add(content, "position:fixed;left:20px;top:30px;width:40px;height:20px;background:#abcdef")
  try {
    let frame = f.renderer.flush()
    expect(frame.boxByNode.get(fixed)).toMatchObject({x: 20, y: 30, width: 40, height: 20})
    expect(frame.hits.get(fixed)?.clips).toHaveLength(1)
    expect(frame.hits.get(fixed)?.clips[0]).toMatchObject({x: 0, y: 0, width: 400, height: 300})
    expect(hitTestProjection(frame, 30, 40)?.node).toBe(fixed)
    expect(frame.scrolls.get(parent)?.maxScrollLeft).toBe(0)
    const height = frame.scrolls.get(parent)?.scrollHeight
    parent.scrollTop = 100
    frame = f.renderer.flush()
    expect(frame.boxByNode.get(fixed)).toMatchObject({x: 20, y: 30})
    expect(frame.hits.get(fixed)).toMatchObject({x: 20, y: 30})
    expect(frame.displayList.find(item => item.node === fixed)).toMatchObject({x: 20, y: 30})
    expect(frame.scrolls.get(parent)?.scrollHeight).toBe(height)
    expect(hitTestProjection(frame, 30, 40)?.node).toBe(fixed)
  } finally {f.renderer.dispose()}
})

test("fixed percentage insets and opposing edges resolve against the projection viewport", () => {
  const f = fixture()
  const parent = f.add(f.root, "width:40px;height:40px;position:relative")
  const fixed = f.add(parent, "position:fixed;left:10%;right:20%;top:10%;bottom:20%;background:#abc")
  try {
    const frame = f.renderer.flush()
    expect(frame.boxByNode.get(fixed)).toMatchObject({x: 40, y: 30, width: 280, height: 210})
    expect(frame.boxByNode.get(parent)).toMatchObject({width: 40, height: 40})
  } finally {f.renderer.dispose()}
})

test("transformed fixed containing block matches positioned absolute placement and scrolling", () => {
  const f = fixture()
  const containing = f.add(f.root, "width:150px;height:100px;padding:5px;border:3px solid #888;overflow:auto;transform:translate(7px,9px);transform-origin:0 0")
  const wrapper = f.add(containing, "width:100px;height:300px")
  const fixed = f.add(wrapper, "position:fixed;right:0;bottom:0;width:10%;height:10%;background:#abc")
  try {
    let frame = f.renderer.flush()
    expect(frame.boxByNode.get(fixed)).toMatchObject({x: 147, y: 102, width: 16, height: 11,
      transform: {scaleX: 1, scaleY: 1, translateX: 7, translateY: 9}})
    expect(frame.hits.get(fixed)?.clips).toHaveLength(1)
    containing.scrollTop = 30
    frame = f.renderer.flush()
    expect(frame.boxByNode.get(fixed)?.y).toBe(72)
    const box = frame.boxByNode.get(fixed)!
    expect(hitTestProjection(frame, box.x + 8 + box.transform.translateX, box.y + 5 + box.transform.translateY)?.node).toBe(fixed)
  } finally {f.renderer.dispose()}
})

test("scroll containers below the transformed fixed containing block do not move or clip its fixed descendants", () => {
  const f = fixture()
  const containing = f.add(f.root, "width:200px;height:160px;transform:translate(10px,5px);transform-origin:0 0")
  const scroller = f.add(containing, "width:50px;height:40px;overflow:auto")
  const content = f.add(scroller, "height:200px")
  const fixed = f.add(content, "position:fixed;left:90px;top:80px;width:30px;height:20px;background:#abc")
  try {
    f.renderer.flush()
    scroller.scrollTop = 100
    const frame = f.renderer.flush()
    expect(frame.boxByNode.get(fixed)).toMatchObject({x: 90, y: 80})
    expect(frame.hits.get(fixed)?.clips).toHaveLength(0)
    expect(hitTestProjection(frame, 110, 90)?.node).toBe(fixed)
  } finally {f.renderer.dispose()}
})

test("nested scrolling inside a viewport-fixed box still scrolls its own normal-flow contents", () => {
  const f = fixture()
  const outside = f.add(f.root, "height:80px;overflow:auto")
  const flow = f.add(outside, "height:500px")
  const fixed = f.add(flow, "position:fixed;left:20px;top:20px;width:80px;height:40px;overflow:auto;background:#333")
  const child = f.add(fixed, "height:200px;background:#abc")
  try {
    f.renderer.flush()
    outside.scrollTop = 120
    fixed.scrollTop = 30
    const frame = f.renderer.flush()
    expect(frame.boxByNode.get(fixed)).toMatchObject({x: 20, y: 20})
    expect(frame.boxByNode.get(child)).toMatchObject({x: 20, y: -10})
    expect(frame.scrolls.get(fixed)?.scrollTop).toBe(30)
    expect(frame.hits.get(child)?.clips).toHaveLength(2)
  } finally {f.renderer.dispose()}
})

test("adding and removing an ancestor transform recomputes fixed containing blocks", () => {
  const f = fixture()
  const parent = f.add(f.root, "position:relative;left:80px;top:60px;width:100px;height:100px")
  const fixed = f.add(parent, "position:fixed;left:10px;top:20px;width:30px;height:20px;background:#abc")
  const original = parent.getAttribute("style")!
  try {
    expect(f.renderer.flush().boxByNode.get(fixed)).toMatchObject({x: 10, y: 20})
    parent.setAttribute("style", `${original};transform:translate(3px,4px)`)
    expect(f.renderer.flush().boxByNode.get(fixed)).toMatchObject({x: 90, y: 80,
      transform: {scaleX: 1, scaleY: 1, translateX: 3, translateY: 4}})
    parent.setAttribute("style", original)
    expect(f.renderer.flush().boxByNode.get(fixed)).toMatchObject({x: 10, y: 20})
  } finally {f.renderer.dispose()}
})

test("fixed inline elements are blockified and clipped at their projection viewport", () => {
  const f = fixture()
  const fixed = f.document.createElement("span")
  fixed.setAttribute("style", "position:fixed;left:390px;top:10px;width:30px;height:20px;background:#abc")
  f.root.append(fixed)
  try {
    const frame = f.renderer.flush()
    expect(frame.boxByNode.get(fixed)?.display).toBe("block")
    expect(hitTestProjection(frame, 395, 15)?.node).toBe(fixed)
    expect(hitTestProjection(frame, 405, 15)).toBeNull()
  } finally {f.renderer.dispose()}
})
