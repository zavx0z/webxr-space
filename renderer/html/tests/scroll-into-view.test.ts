import {expect, test} from "bun:test"
import {createDocument, HTMLElement, readDocumentScrollIntoViewRequests} from "@zavx0z/dom"
import {createDocumentRenderer, fulfillScrollIntoViewRequests} from "../src/index.ts"

function fixture(style = "width:100px;height:60px;overflow:auto") {
  const document = createDocument()
  const root = document.createElement("main") as HTMLElement
  root.setAttribute("style", `display:block;${style}`)
  document.append(root)
  let measured = 0
  const renderer = createDocumentRenderer({document, root, viewport: {width: 400, height: 300},
    textMeasurer: {measureTextAdvance(text) {
      measured++
      return text.length * 6
    }}})
  const add = (parent: HTMLElement, style: string, text = "") => {
    const node = document.createElement("div") as HTMLElement
    node.setAttribute("style", `display:block;${style}`)
    node.textContent = text
    parent.append(node)
    return node
  }
  return {document, root, renderer, add, measured: () => measured, resetMeasured() { measured = 0 }}
}

test.each([['start', 200], ['center', 180], ['end', 160], ['nearest', 160]] as const)("scrollIntoView block %s uses retained row geometry", (block, expected) => {
  const f = fixture()
  const rows = Array.from({length: 20}, (_, index) => f.add(f.root, "height:20px;line-height:20px", String(index)))
  try {
    f.renderer.flush()
    const version = f.document.version
    f.resetMeasured()
    rows[10]!.scrollIntoView({block})
    const frame = fulfillScrollIntoViewRequests(f.renderer)
    expect(f.root.scrollTop).toBe(expected)
    expect(frame.scrolls.get(f.root)?.scrollTop).toBe(expected)
    expect(f.measured()).toBe(0)
    expect(f.document.version).toBe(version)
    expect(readDocumentScrollIntoViewRequests(f.document)).toHaveLength(0)
  } finally {f.renderer.dispose()}
})

test("nearest already-visible requests do not change scroll state, layout or frame identity", () => {
  const f = fixture()
  const rows = Array.from({length: 20}, () => f.add(f.root, "height:20px"))
  try {
    f.root.scrollTop = 190
    const before = f.renderer.flush()
    const state = f.document.stateVersion
    for (let index = 0; index < 5; index++) {
      rows[10]!.scrollIntoView({block: "nearest"})
      expect(fulfillScrollIntoViewRequests(f.renderer)).toBe(before)
    }
    expect(f.root.scrollTop).toBe(190)
    expect(f.document.stateVersion).toBe(state)
  } finally {f.renderer.dispose()}
})

test("nested scrollports resolve both axes inner-first against updated geometry", () => {
  const f = fixture()
  const inner = f.add(f.root, "width:80px;height:40px;margin-left:150px;margin-top:120px;overflow:auto")
  const content = f.add(inner, "position:relative;width:300px;height:300px")
  const target = f.add(content, "position:absolute;left:220px;top:220px;width:20px;height:20px;background:#abc")
  try {
    target.scrollIntoView({block: "nearest", inline: "nearest"})
    const frame = fulfillScrollIntoViewRequests(f.renderer)
    expect([inner.scrollLeft, inner.scrollTop]).toEqual([160, 200])
    expect([f.root.scrollLeft, f.root.scrollTop]).toEqual([130, 100])
    expect(frame.boxByNode.get(target)).toMatchObject({x: 80, y: 40})
  } finally {f.renderer.dispose()}
})

test("transformed target bounds use real scale instead of author coordinates", () => {
  const f = fixture()
  const content = f.add(f.root, "position:relative;width:200px;height:200px;transform:scale(2);transform-origin:0 0")
  const target = f.add(content, "position:absolute;left:100px;top:100px;width:20px;height:20px")
  try {
    target.scrollIntoView({block: "nearest", inline: "nearest"})
    const frame = fulfillScrollIntoViewRequests(f.renderer)
    expect([f.root.scrollLeft, f.root.scrollTop]).toEqual([140, 180])
    const box = frame.boxByNode.get(target)!
    expect(box.x * box.transform.scaleX + box.transform.translateX).toBe(60)
    expect(box.y * box.transform.scaleY + box.transform.translateY).toBe(20)
  } finally {f.renderer.dispose()}
})

test("oversized nearest target does not oscillate after aligning its nearest edge", () => {
  const f = fixture()
  f.add(f.root, "height:20px")
  const target = f.add(f.root, "height:120px")
  f.add(f.root, "height:200px")
  try {
    target.scrollIntoView({block: "nearest"})
    fulfillScrollIntoViewRequests(f.renderer)
    expect(f.root.scrollTop).toBe(20)
    target.scrollIntoView({block: "nearest"})
    const state = f.document.stateVersion
    fulfillScrollIntoViewRequests(f.renderer)
    expect(f.root.scrollTop).toBe(20)
    expect(f.document.stateVersion).toBe(state)
  } finally {f.renderer.dispose()}
})

test("pending pre-layout target is revealed on mount and removed roots are no-op", () => {
  const f = fixture()
  f.add(f.root, "height:200px")
  const target = f.document.createElement("div") as HTMLElement
  target.setAttribute("style", "height:20px")
  target.scrollIntoView({block: "start"})
  try {
    fulfillScrollIntoViewRequests(f.renderer)
    expect(f.root.scrollTop).toBe(0)
    expect(readDocumentScrollIntoViewRequests(f.document)).toHaveLength(1)
    f.root.append(target)
    f.add(f.root, "height:100px")
    fulfillScrollIntoViewRequests(f.renderer)
    expect(f.root.scrollTop).toBe(200)
    target.scrollIntoView({block: "end"})
    f.root.remove()
    fulfillScrollIntoViewRequests(f.renderer)
    expect(f.root.scrollTop).toBe(200)
    expect(readDocumentScrollIntoViewRequests(f.document)).toHaveLength(0)
  } finally {f.renderer.dispose()}
})

test("viewport-fixed target does not scroll semantic ancestors that cannot move it", () => {
  const f = fixture()
  const content = f.add(f.root, "height:400px")
  const target = f.add(content, "position:fixed;left:150px;top:200px;width:20px;height:20px")
  try {
    f.root.scrollTop = 100
    f.renderer.flush()
    target.scrollIntoView({block: "start", inline: "start"})
    fulfillScrollIntoViewRequests(f.renderer)
    expect([f.root.scrollLeft, f.root.scrollTop]).toEqual([0, 100])
  } finally {f.renderer.dispose()}
})
