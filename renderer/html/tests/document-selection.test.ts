import {describe, expect, test} from "bun:test"
import {createDocument, setDocumentTextHighlights, clearDocumentTextHighlights, textPositionAtOffset, type HTMLElement} from "../../../dom/src/index.ts"
import {caretPositionAtPoint, createDocumentInteractionController, createDocumentRenderer, getRangeClientRects,
  readRenderedSelectionText, selectTextWordAtPoint} from "../src/index.ts"

function fixture(width = 120, style = "") {
  const document = createDocument()
  const root = document.createElement("article") as HTMLElement
  root.setAttribute("style", `display:block;width:${width}px;font-size:10px;line-height:14px;${style}`)
  document.append(root)
  const renderer = createDocumentRenderer({document, root, viewport: {width: 300, height: 180}})
  const interaction = createDocumentInteractionController({document})
  const block = (text: string, css = "") => {
    const node = document.createElement("p")
    node.setAttribute("style", `display:block;${css}`)
    node.textContent = text
    root.append(node)
    return node
  }
  return {document, root, renderer, interaction, block, dispose() {
    interaction.dispose()
    renderer.dispose()
  }}
}

describe("ordinary document text selection", () => {
  test("maps wrapped and collapsed whitespace back to original UTF-16 offsets", () => {
    const f = fixture(60)
    const paragraph = f.block("alpha   beta gamma")
    try {
      const frame = f.renderer.flush()
      const runs = frame.displayList.filter(item => item.kind === "text")
      expect(runs.map(item => item.text)).toEqual(["alpha beta", "gamma"])
      expect(caretPositionAtPoint(frame, 37, 7)).toEqual({offsetNode: paragraph.firstChild!, offset: 8})
      expect(caretPositionAtPoint(frame, 1, 21)).toEqual({offsetNode: paragraph.firstChild!, offset: 13})
      const range = f.document.createRange()
      range.setStart(paragraph.firstChild!, 8)
      range.setEnd(paragraph.firstChild!, 18)
      expect(getRangeClientRects(frame, range).map(rect => [rect.x, rect.y, rect.width])).toEqual([[36, 0, 24], [0, 14, 30]])
      expect(readRenderedSelectionText(frame, range)).toBe("beta gamma")
    } finally { f.dispose() }
  })

  test("pointer boundaries use proportional advances and never split a grapheme", () => {
    const f = fixture()
    f.renderer.dispose()
    const paragraph = f.block("Wi👩‍💻é")
    let measures = 0
    const renderer = createDocumentRenderer({document: f.document, root: f.root, viewport: {width: 300, height: 180},
      textMeasurer: {measureTextAdvance(value) {
        measures++
        return [...new Intl.Segmenter(undefined, {granularity: "grapheme"}).segment(value)]
          .reduce((width, segment) => width + (segment.segment === "W" ? 20 : segment.segment === "i" ? 3 : 12), 0)
      }}})
    try {
      const frame = renderer.flush()
      expect(caretPositionAtPoint(frame, 16, 7)?.offset).toBe(1)
      expect(caretPositionAtPoint(frame, 21, 7)?.offset).toBe(1)
      expect(caretPositionAtPoint(frame, 31, 7)?.offset).toBe(7)
      const count = measures
      for (let index = 0; index < 30; index++) caretPositionAtPoint(frame, 31, 7)
      expect(measures).toBe(count)
      expect(paragraph.textContent).toBe("Wi👩‍💻é")
    } finally {
      renderer.dispose()
      f.interaction.dispose()
    }
  })

  test("drag crosses blocks, preserves original text and excludes user-select none", () => {
    const f = fixture()
    const first = f.block("alpha")
    f.block("42", "user-select:none")
    const last = f.block("omega")
    try {
      const frame = f.renderer.flush()
      f.interaction.pointerDown(frame, {clientX: 6, clientY: 7})
      f.interaction.pointerMove(frame, {clientX: 24, clientY: 35, buttons: 1})
      f.interaction.pointerUp(frame, {clientX: 24, clientY: 35})
      const selection = f.document.getSelection()
      expect(selection.anchorNode).toBe(first.firstChild)
      expect(selection.focusNode).toBe(last.firstChild)
      expect(readRenderedSelectionText(frame)).toBe("lpha\nomeg")
      expect(caretPositionAtPoint(frame, 6, 21)).toBeNull()
      expect(f.renderer.flush()).toBe(frame)
      const presentation = f.interaction.composeFrame(frame)
      expect(presentation.displayList).toBe(frame.displayList)
      expect(presentation.boxes).toBe(frame.boxes)
      expect(presentation.textHighlights).toHaveLength(2)
    } finally { f.dispose() }
  })

  test("right click preserves selection and shift click extends its anchor", () => {
    const f = fixture()
    const paragraph = f.block("abcdefgh")
    try {
      const frame = f.renderer.flush()
      f.document.getSelection().setBaseAndExtent(paragraph.firstChild!, 1, paragraph.firstChild!, 3)
      f.interaction.pointerDown(frame, {clientX: 36, clientY: 7, button: 2})
      f.interaction.pointerUp(frame, {clientX: 36, clientY: 7, button: 2})
      expect(f.document.getSelection().toString()).toBe("bc")
      f.interaction.pointerDown(frame, {clientX: 36, clientY: 7, shiftKey: true})
      f.interaction.pointerUp(frame, {clientX: 36, clientY: 7, shiftKey: true})
      expect(f.document.getSelection().toString()).toBe("bcdef")
    } finally {f.dispose()}
  })

  test("double click selects one word across differently styled inline spans", () => {
    const f = fixture()
    const paragraph = f.block("")
    const prefix = f.document.createElement("strong")
    prefix.textContent = "hel"
    paragraph.append(prefix, "lo world")
    try {
      const frame = f.renderer.flush()
      expect(selectTextWordAtPoint(frame, 24, 7)).toBe(true)
      expect(f.document.getSelection().toString()).toBe("hello")
    } finally {f.dispose()}
  })

  test("all is atomic, contain bounds gestures, and explicit text overrides none", () => {
    const f = fixture()
    const atomic = f.block("atomic", "user-select:all")
    const contained = f.block("inside", "user-select:contain")
    const excluded = f.block("", "user-select:none")
    const enabled = f.document.createElement("span")
    enabled.setAttribute("style", "user-select:text")
    enabled.textContent = "outside"
    excluded.append(enabled)
    try {
      const frame = f.renderer.flush()
      f.interaction.pointerDown(frame, {clientX: 12, clientY: 7})
      f.interaction.pointerUp(frame, {clientX: 12, clientY: 7})
      expect(f.document.getSelection().toString()).toBe(atomic.textContent!)
      f.interaction.pointerDown(frame, {clientX: 6, clientY: 21})
      f.interaction.pointerMove(frame, {clientX: 42, clientY: 35, buttons: 1})
      f.interaction.pointerUp(frame, {clientX: 42, clientY: 35})
      expect(f.document.getSelection().focusNode).toBe(contained.firstChild)
      expect(caretPositionAtPoint(frame, 6, 35)?.offsetNode).toBe(enabled.firstChild!)
    } finally {f.dispose()}
  })

  test("copy preserves pre whitespace, empty block lines and explicit br", () => {
    const f = fixture()
    const first = f.block("  first", "white-space:pre")
    f.block("", "height:14px;white-space:pre")
    const last = f.block("third ", "white-space:pre")
    last.append(f.document.createElement("br"), "fourth")
    try {
      const frame = f.renderer.flush()
      const range = f.document.createRange()
      range.setStart(first.firstChild!, 0)
      range.setEnd(last.lastChild!, 6)
      expect(readRenderedSelectionText(frame, range)).toBe("  first\n\nthird \nfourth")
      expect(caretPositionAtPoint(frame, 12, 21)?.offsetNode).toBe(f.root.children[1]!)
    } finally {f.dispose()}
  })

  test("selection overlays track transformed scrolling and keep the original clip chain", () => {
    const f = fixture(60, "height:20px;overflow:auto;transform:translate(10px, 20px) scale(2)")
    const paragraph = f.block("first\nsecond\nthird", "white-space:pre")
    try {
      const before = f.renderer.flush()
      const range = f.document.createRange()
      range.selectNodeContents(paragraph)
      f.document.getSelection().addRange(range)
      f.root.scrollTop = 14
      const after = f.renderer.flush()
      const firstY = getRangeClientRects(before, range)[0]!.y
      expect(getRangeClientRects(after, range)[0]!.y).toBe(firstY - 28)
      const presentation = f.interaction.composeFrame(after)
      expect(presentation.textHighlights?.every(item => item.clips.length > 0)).toBe(true)
      expect(presentation.displayList).toBe(after.displayList)
    } finally {f.dispose()}
  })

  test("secondary caret transport does not replace primary document selection", () => {
    const f = fixture()
    const paragraph = f.block("abcdef")
    const owner = {}
    try {
      const frame = f.renderer.flush()
      f.document.getSelection().setBaseAndExtent(paragraph.firstChild!, 1, paragraph.firstChild!, 3)
      const secondary = f.document.createRange()
      secondary.setStart(paragraph.firstChild!, 5)
      secondary.collapse(true)
      setDocumentTextHighlights(f.document, owner, [secondary], {caretColor: "#ff0000"})
      const presentation = f.interaction.composeFrame(frame)
      expect(presentation.textHighlights).toHaveLength(2)
      expect(presentation.textHighlights?.[1]?.width).toBe(1)
      expect(presentation.textHighlights?.[1]?.color).toBe("#ff0000")
      expect(f.document.getSelection().toString()).toBe("bc")
      clearDocumentTextHighlights(f.document, owner)
      expect(f.interaction.composeFrame(frame).textHighlights).toHaveLength(1)
    } finally {f.dispose()}
  })

  test("thousands of selected lines only measure and paint visible highlights while scrolling", () => {
    const f = fixture(120, "height:56px;overflow:auto")
    f.renderer.dispose()
    let measurements = 0
    const renderer = createDocumentRenderer({document: f.document, root: f.root, viewport: {width: 300, height: 180},
      textMeasurer: {measureTextAdvance(text) {
        measurements++
        return Array.from(text).length * 6
      }}})
    for (let index = 0; index < 2_000; index++) f.block(`line ${index}`, "height:14px;white-space:pre")
    try {
      const before = renderer.flush()
      const range = f.document.createRange()
      range.selectNodeContents(f.root)
      f.document.getSelection().addRange(range)
      measurements = 0
      const first = f.interaction.composeFrame(before)
      expect(first.textHighlights!.length).toBeLessThanOrEqual(5)
      expect(measurements).toBeLessThanOrEqual(5)
      expect(renderer.flush()).toBe(before)
      measurements = 0
      f.root.scrollTop = 14_000
      const scroll = renderer.flush()
      expect(measurements).toBe(0)
      const selected = f.interaction.composeFrame(scroll)
      expect(selected.displayList).toBe(scroll.displayList)
      expect(selected.textHighlights!.length).toBeLessThanOrEqual(6)
      expect(measurements).toBeLessThanOrEqual(6)
      expect(selected.textHighlights?.some(item => item.node.textContent === "line 1000")).toBe(true)
      measurements = 0
      f.interaction.composeFrame(scroll)
      expect(measurements).toBe(0)
    } finally {
      renderer.dispose()
      f.interaction.dispose()
    }
  }, 30_000)

  test("two projections of one Document share selection and copy in semantic order", () => {
    const f = fixture()
    const first = f.block("display")
    const other = f.document.createElement("section")
    other.textContent = "hud"
    const common = f.document.createElement("main")
    f.document.removeChild(f.root)
    common.append(f.root, other)
    f.document.append(common)
    const otherRenderer = createDocumentRenderer({document: f.document, root: other, viewport: {width: 100, height: 100}})
    const otherInteraction = createDocumentInteractionController({document: f.document})
    try {
      const display = f.renderer.flush()
      const hud = otherRenderer.flush()
      f.document.getSelection().setBaseAndExtent(first.firstChild!, 1, other.firstChild!, 2)
      expect(readRenderedSelectionText([hud, display])).toBe("isplay\nhu")
      expect(f.interaction.composeFrame(display).textHighlights).toHaveLength(1)
      expect(otherInteraction.composeFrame(hud).textHighlights).toHaveLength(1)
    } finally {
      otherInteraction.dispose()
      otherRenderer.dispose()
      f.dispose()
    }
  })

  test("pointer default prevention and modifier delivery remain component-owned", () => {
    const f = fixture()
    const paragraph = f.block("abcdef")
    let modifiers: readonly boolean[] = []
    paragraph.addEventListener("pointerdown", event => {
      if (!("altKey" in event) || !("metaKey" in event)) return
      modifiers = [Boolean(event.altKey), Boolean(event.metaKey)]
      event.preventDefault()
    })
    try {
      const frame = f.renderer.flush()
      f.interaction.pointerDown(frame, {clientX: 6, clientY: 7, altKey: true, metaKey: true})
      f.interaction.pointerMove(frame, {clientX: 24, clientY: 7, buttons: 1})
      f.interaction.pointerUp(frame, {clientX: 24, clientY: 7})
      expect(modifiers).toEqual([true, true])
      expect(f.document.getSelection().rangeCount).toBe(0)
    } finally {f.dispose()}
  })

  test("editing hosts receive focus and a primary caret while ordinary read-only text never does", () => {
    const f = fixture()
    const editing = f.block("editor") as HTMLElement
    editing.setAttribute("contenteditable", "plaintext-only")
    const readonly = f.block("paragraph")
    try {
      const frame = f.renderer.flush()
      f.interaction.pointerDown(frame, {clientX: 12, clientY: 7})
      f.interaction.pointerUp(frame, {clientX: 12, clientY: 7})
      expect(f.document.activeElement).toBe(editing)
      expect(f.document.getSelection().isCollapsed).toBe(true)
      expect(f.interaction.composeFrame(frame).textHighlights?.[0]?.width).toBe(1)
      f.interaction.pointerDown(frame, {clientX: 12, clientY: 21})
      f.interaction.pointerUp(frame, {clientX: 12, clientY: 21})
      expect(f.document.activeElement).toBeNull()
      expect(f.document.getSelection().anchorNode).toBe(readonly.firstChild)
      expect(f.interaction.composeFrame(frame).textHighlights).toBeUndefined()
    } finally {f.dispose()}
  })

  test("character-data updates refresh source boundaries without rewriting earlier frames", () => {
    const f = fixture(240)
    const paragraph = f.block("first", "height:14px;white-space:nowrap")
    try {
      const before = f.renderer.flush()
      const previous = before.displayList.find(item => item.kind === "text")!
      paragraph.firstChild!.textContent = "a   second"
      const after = f.renderer.flush()
      expect(caretPositionAtPoint(after, 13, 7)?.offset).toBe(4)
      expect(previous.kind === "text" ? previous.source?.offsets : []).toEqual([0, 1, 2, 3, 4, 5])
      const range = f.document.createRange()
      range.setStart(paragraph.firstChild!, 2)
      range.setEnd(paragraph.firstChild!, 3)
      expect(getRangeClientRects(after, range).map(rect => [rect.x, rect.width])).toEqual([[6, 6]])
    } finally {f.dispose()}
  })

  test("copy retains selected line breaks before an empty last row or a following text boundary", () => {
    const f = fixture()
    const first = f.block("first", "white-space:pre")
    const second = f.block("second", "white-space:pre")
    f.block("", "height:14px;white-space:pre")
    try {
      const frame = f.renderer.flush()
      const range = f.document.createRange()
      range.setStart(first.firstChild!, 0)
      range.setEnd(second.firstChild!, 0)
      expect(readRenderedSelectionText(frame, range)).toBe("first\n")
      range.selectNodeContents(f.root)
      expect(readRenderedSelectionText(frame, range)).toBe("first\nsecond\n")
    } finally {f.dispose()}
  })

  test("equivalent invisible DOM boundaries resolve to painted text and blank block carets", () => {
    const f = fixture()
    f.root.append("")
    f.block("first", "height:14px;white-space:pre")
    f.root.append("\n")
    const blank = f.block("", "height:14px;white-space:pre")
    f.root.append("\n")
    f.block("last", "height:14px;white-space:pre")
    try {
      const frame = f.renderer.flush()
      const range = f.document.createRange()
      for (const [offset, y] of [[0, 0], [6, 14], [7, 28], [11, 28]]) {
        const position = textPositionAtOffset(f.root, offset!)
        range.setStart(position.node, position.offset)
        range.collapse(true)
        const rects = getRangeClientRects(frame, range, {caret: true})
        expect(rects).toHaveLength(1)
        expect(rects[0]?.y).toBe(y!)
        if (offset === 6) expect(rects[0]?.node).toBe(blank)
      }
    } finally {f.dispose()}
  })
})
