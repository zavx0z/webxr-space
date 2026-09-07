import {expect, test} from "bun:test"
import {createDocument, HTMLElement, setDocumentTextHighlights, clearDocumentTextHighlights} from "@zavx0z/dom"
import {createDocumentRenderer, createDocumentInteractionController} from "../src/index.ts"
import {isRendererOwnedFrame, readCanonicalRenderFrameChanges} from "../src/frame-changes.ts"

function fixture() {
  const document = createDocument()
  const root = document.createElement("main")
  root.setAttribute("style", "display:block;width:400px;height:200px;font-size:10px;line-height:14px")
  const header = document.createElement("button")
  header.title = "Stable title"
  header.textContent = "Header"
  header.setAttribute("style", "display:block;width:100px;height:24px")
  const log = document.createElement("section") as HTMLElement
  log.setAttribute("style", "display:block;width:300px;height:100px;overflow:auto")
  const footer = document.createElement("p")
  footer.textContent = "Footer"
  root.append(header, log, footer)
  document.append(root)
  const append = (index: number) => {
    const row = document.createElement("p")
    row.setAttribute("style", "display:block;margin:0;height:14px;white-space:pre;line-height:14px")
    row.textContent = `row ${index}`
    log.append(row)
    return row
  }
  const rows = Array.from({length: 300}, (_, index) => append(index))
  const renderer = createDocumentRenderer({document, root, viewport: {width: 400, height: 200}})
  const interaction = createDocumentInteractionController({document})
  return {document, root, header, log, footer, rows, append, renderer, interaction,
    dispose() { interaction.dispose(); renderer.dispose() },
  }
}

test("owned append and head-trim deltas retain exact Node/key geometry and conservative legacy indexes", () => {
  const f = fixture()
  try {
    const before = f.renderer.flush()
    f.append(300)
    const after = f.renderer.flush()
    const changes = readCanonicalRenderFrameChanges(after)!
    expect(changes.previous).toBe(before)
    expect(changes.structural?.owner).toBe(f.log)
    expect(changes.structural?.retained).toHaveLength(1)
    expect(changes.structural?.inserted).toHaveLength(1)
    expect(changes.structural?.removed).toHaveLength(0)
    expect([...changes.indexes]).toEqual(Array.from({length: after.displayList.length}, (_, index) => index))
    expect(Object.isFrozen(changes.structural)).toBe(true)
    expect(Object.isFrozen(changes.structural!.retained[0])).toBe(true)
    f.log.scrollTop = 28
    const scrolled = f.renderer.flush()
    f.rows[0]!.remove()
    f.append(301)
    const trimmed = f.renderer.flush()
    const trim = readCanonicalRenderFrameChanges(trimmed)!
    expect(trim.previous).toBe(scrolled)
    expect(trim.structural?.removed).toHaveLength(1)
    expect(trim.structural?.retained[0]?.dy).toBe(-14)
    for (const range of trim.structural!.retained) for (const offset of [0, range.count - 1]) {
      const old = scrolled.displayList[range.previousStart + offset]!
      const next = trimmed.displayList[range.nextStart + offset]!
      expect(next.node).toBe(old.node)
      expect(next.key).toBe(old.key)
      expect(next.x).toBe(old.x + range.dx)
      expect(next.y).toBe(old.y + range.dy)
      expect(next.clips).toEqual(old.clips)
      expect(next.transform).toEqual(old.transform)
    }
  } finally {f.dispose()}
})

test("selection and secondary highlights transport structural changes to the exact last composed frame", () => {
  const f = fixture()
  const highlightOwner = {}
  try {
    const selection = f.document.getSelection()
    const range = f.document.createRange()
    range.setStart(f.rows[1]!.firstChild!, 0)
    range.setEnd(f.rows[3]!.firstChild!, 3)
    selection.addRange(range)
    const base = f.renderer.flush()
    const first = f.interaction.composeFrame(base)
    expect(first.textHighlights?.length).toBeGreaterThan(0)
    f.append(300)
    const nextBase = f.renderer.flush()
    const next = f.interaction.composeFrame(nextBase)
    expect(readCanonicalRenderFrameChanges(next)?.previous).toBe(first)
    expect(readCanonicalRenderFrameChanges(next)?.structural).toBeDefined()
    const caret = f.document.createRange()
    caret.setStart(f.rows[4]!.firstChild!, 2)
    caret.collapse(true)
    setDocumentTextHighlights(f.document, highlightOwner, [caret])
    const highlight = f.interaction.composeFrame(nextBase)
    expect(readCanonicalRenderFrameChanges(highlight)?.structural).toBeUndefined()
    expect(readCanonicalRenderFrameChanges(highlight)?.previous).toBe(next)
    selection.removeAllRanges()
    clearDocumentTextHighlights(f.document, highlightOwner)
    f.append(301)
    const lastBase = f.renderer.flush()
    const producerPrevious = readCanonicalRenderFrameChanges(lastBase)?.previous
    const clear = f.interaction.composeFrame(lastBase)
    expect(readCanonicalRenderFrameChanges(clear)?.previous).toBe(highlight)
    expect(readCanonicalRenderFrameChanges(clear)?.structural).toBeDefined()
    expect(readCanonicalRenderFrameChanges(lastBase)?.previous).toBe(producerPrevious)
    expect(isRendererOwnedFrame(clear)).toBe(true)
  } finally {clearDocumentTextHighlights(f.document, highlightOwner); f.dispose()}
})

test("stable tooltip topology transports structural ranges, while insertion/removal forces a predecessor fallback", () => {
  const f = fixture()
  try {
    const firstBase = f.renderer.flush()
    f.interaction.pointerMove(firstBase, {clientX: 5, clientY: 5, timeStamp: 0})
    const first = f.interaction.composeFrame(firstBase, 500)
    expect(first.displayList.length).toBe(firstBase.displayList.length + 2)
    f.append(300)
    const nextBase = f.renderer.flush()
    const next = f.interaction.composeFrame(nextBase, 600)
    expect(readCanonicalRenderFrameChanges(next)?.previous).toBe(first)
    expect(readCanonicalRenderFrameChanges(next)?.structural).toBeDefined()
    f.header.title = ""
    f.append(301)
    const noTitle = f.interaction.composeFrame(f.renderer.flush(), 700)
    expect(readCanonicalRenderFrameChanges(noTitle)?.previous).not.toBe(next)
    f.header.title = "Returned title"
    f.append(302)
    const titleBase = f.renderer.flush()
    f.interaction.pointerMove(titleBase, {clientX: 5, clientY: 5, timeStamp: 800})
    const title = f.interaction.composeFrame(titleBase, 1400)
    expect(readCanonicalRenderFrameChanges(title)?.previous).not.toBe(noTitle)
  } finally {f.dispose()}
})

test("foreign roots, changed clip geometry, middle reorder and unbranded compositions never receive a structural proof", () => {
  const f = fixture()
  try {
    const first = f.renderer.flush()
    const clone = {...first}
    f.interaction.composeFrame(clone)
    f.append(300)
    const composed = f.interaction.composeFrame(f.renderer.flush())
    expect(readCanonicalRenderFrameChanges(composed)?.previous).not.toBe(clone)
    f.log.setAttribute("style", "display:block;width:280px;height:90px;overflow:auto;border-radius:12px")
    f.append(301)
    expect(readCanonicalRenderFrameChanges(f.renderer.flush())?.structural).toBeUndefined()
    f.log.insertBefore(f.rows[90]!, f.rows[40]!)
    expect(readCanonicalRenderFrameChanges(f.renderer.flush())?.structural).toBeUndefined()
    const other = fixture()
    try {
      expect(() => f.interaction.composeFrame(other.renderer.flush())).toThrow("another Document")
    } finally {other.dispose()}
  } finally {f.dispose()}
})
