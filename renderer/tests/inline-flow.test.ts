import {describe, expect, test} from "bun:test"
import {createDocument} from "../../dom/src/index.ts"
import {createDocumentRenderer, hitTest, hitTestProjection} from "../src/index.ts"

const base = "display:block;width:60px;font-size:10px;line-height:14px;overflow:auto"
function fixture(text?: string, style = base) {
  const document = createDocument()
  const paragraph = document.createElement("p")
  paragraph.setAttribute("style", style)
  if (text !== undefined) paragraph.textContent = text
  document.append(paragraph)
  const renderer = createDocumentRenderer({document, root: paragraph, viewport: {width: 300, height: 300}})
  return {document, paragraph, renderer}
}

describe("shared inline line layout", () => {
  test("column flex bases include wrapped text height through nested block owners", () => {
    const document = createDocument()
    const column = document.createElement("section")
    column.setAttribute("style", "display:flex;flex-direction:column;width:80px;padding:0 10px;box-sizing:border-box;font-size:10px;line-height:14px")
    const blocks = Array.from({length: 2}, () => {
      const block = document.createElement("div")
      block.setAttribute("style", "display:block;flex-shrink:0")
      const paragraph = document.createElement("p")
      paragraph.setAttribute("style", "display:block")
      paragraph.textContent = "alpha beta gamma delta"
      block.append(paragraph)
      column.append(block)
      return block
    })
    document.append(column)
    const renderer = createDocumentRenderer({document, root: column, viewport: {width: 300, height: 300}})
    try {
      const frame = renderer.flush()
      expect(frame.boxByNode.get(blocks[0]!)?.height).toBe(42)
      expect(frame.boxByNode.get(blocks[1]!)?.y).toBe(42)
      expect(frame.boxByNode.get(column)?.height).toBe(84)
    } finally { renderer.dispose() }
  })

  test("wraps a text node at spaces and measures the resulting paragraph height", () => {
    const f = fixture("alpha beta gamma delta")
    try {
      const frame = f.renderer.flush()
      const text = frame.displayList.filter(item => item.kind === "text")
      expect(text.map(item => item.text)).toEqual(["alpha beta", "gamma", "delta"])
      expect(text.map(item => item.y)).toEqual([0, 14, 28])
      expect(frame.boxByNode.get(f.paragraph)?.height).toBe(42)
      expect(frame.scrolls.get(f.paragraph)?.maxScrollLeft).toBe(0)
    } finally { f.renderer.dispose() }
  })

  test("nested inline code and links share lines and preserve their node identities and colors", () => {
    const f = fixture()
    const link = f.document.createElement("a")
    link.setAttribute("href", "https://example.com")
    link.setAttribute("style", "color:#ff0000;background:#0000ff")
    const code = f.document.createElement("code")
    code.textContent = "two three"
    link.append(code)
    f.paragraph.append("one ", link, " four")
    try {
      const frame = f.renderer.flush()
      const text = frame.displayList.filter(item => item.kind === "text")
      expect(text.map(item => [item.text, item.x, item.y])).toEqual([
        ["one ", 0, 0], ["two", 24, 0], ["three", 0, 14], [" four", 30, 14],
      ])
      expect(text.filter(item => item.node === code.firstChild).every(item => item.color === "#ff0000")).toBe(true)
      expect(f.paragraph.children[0]).toBe(link)
      expect(link.children[0]).toBe(code)
      expect(frame.boxByNode.get(f.paragraph)?.height).toBe(28)
      expect(frame.hits.get(link)?.fragments).toHaveLength(2)
      expect(link.contains(hitTest(frame, 25, 2)?.node ?? null)).toBe(true)
      expect(link.contains(hitTest(frame, 2, 16)?.node ?? null)).toBe(true)
      expect(link.contains(hitTest(frame, 35, 16)?.node ?? null)).toBe(false)
      expect(link.contains(hitTestProjection(frame, 35, 16)?.node ?? null)).toBe(false)
      expect(frame.displayList.filter(item => item.kind === "rect" && item.node === link)).toHaveLength(2)
    } finally { f.renderer.dispose() }
  })

  test("collapses whitespace across nodes while keeping a word intact across element boundaries", () => {
    const f = fixture(undefined, base.replace("60px", "30px"))
    const first = f.document.createElement("span")
    const second = f.document.createElement("em")
    first.textContent = "abc"
    second.textContent = "def"
    f.paragraph.append("  ", first, second, "  \n  ", "xy", "  ")
    try {
      const frame = f.renderer.flush()
      const text = frame.displayList.filter(item => item.kind === "text")
      expect(text.map(item => [item.text, item.y])).toEqual([["abc", 0], ["def", 0], ["xy", 14]])
      expect(frame.scrolls.get(f.paragraph)?.maxScrollLeft).toBe(6)
    } finally { f.renderer.dispose() }
  })

  test("toggling normal and nowrap reflows existing nodes without changing the source text", () => {
    const f = fixture("alpha beta gamma delta")
    const original = f.paragraph.firstChild
    try {
      expect(f.renderer.flush().boxByNode.get(f.paragraph)?.height).toBe(42)
      f.paragraph.setAttribute("style", `${base};white-space:nowrap`)
      const nowrap = f.renderer.flush()
      expect(nowrap.boxByNode.get(f.paragraph)?.height).toBe(14)
      expect(nowrap.scrolls.get(f.paragraph)?.maxScrollLeft).toBeGreaterThan(0)
      f.paragraph.setAttribute("style", base)
      expect(f.renderer.flush().boxByNode.get(f.paragraph)?.height).toBe(42)
      expect(f.paragraph.firstChild).toBe(original)
      expect(f.paragraph.textContent).toBe("alpha beta gamma delta")
    } finally { f.renderer.dispose() }
  })

  test("text mutation and max-width recompute line breaks", () => {
    const f = fixture("one", `${base};width:100%;max-width:60px`)
    try {
      f.renderer.flush()
      f.paragraph.firstChild!.textContent = "alpha beta gamma delta"
      const frame = f.renderer.flush()
      expect(frame.boxByNode.get(f.paragraph)?.width).toBe(60)
      expect(frame.boxByNode.get(f.paragraph)?.height).toBe(42)
      expect(frame.scrolls.get(f.paragraph)?.maxScrollLeft).toBe(0)
    } finally { f.renderer.dispose() }
  })

  test("pre preserves explicit newlines and nowrap subtrees keep their own spacing policy", () => {
    const f = fixture()
    const pre = f.document.createElement("code")
    pre.setAttribute("style", "white-space:pre")
    pre.textContent = "a\n b"
    f.paragraph.append(pre)
    try {
      const frame = f.renderer.flush()
      expect(frame.displayList.filter(item => item.kind === "text").map(item => [item.text, item.y]))
        .toEqual([["a", 0], [" b", 14]])
      expect(frame.boxByNode.get(f.paragraph)?.height).toBe(28)
    } finally { f.renderer.dispose() }
  })

  test("br forces a new line in ordinary text", () => {
    const f = fixture()
    f.paragraph.append("one", f.document.createElement("br"), "two")
    try {
      const frame = f.renderer.flush()
      expect(frame.displayList.filter(item => item.kind === "text").map(item => [item.text, item.y]))
        .toEqual([["one", 0], ["two", 14]])
      expect(frame.boxByNode.get(f.paragraph)?.height).toBe(28)
    } finally { f.renderer.dispose() }
  })

  test("letter spacing is measured on complete line runs", () => {
    const f = fixture("aa bb", `${base};width:37px;letter-spacing:2px`)
    try {
      const frame = f.renderer.flush()
      const text = frame.displayList.filter(item => item.kind === "text")
      expect(text.map(item => item.text)).toEqual(["aa", "bb"])
      expect(text.map(item => item.width)).toEqual([14, 14])
    } finally { f.renderer.dispose() }
  })

  test("uses the supplied proportional font advances to choose line breaks", () => {
    const document = createDocument()
    const paragraph = document.createElement("p")
    paragraph.setAttribute("style", `${base};width:42px`)
    paragraph.textContent = "WWW iii"
    document.append(paragraph)
    const renderer = createDocumentRenderer({
      document, root: paragraph, viewport: {width: 300, height: 300},
      textMeasurer: {
        measureTextAdvance(value) {
          return Array.from(value).reduce((sum, character) => sum + (character === "W" ? 12 : character === "i" ? 2 : 4), 0)
        },
      },
    })
    try {
      const frame = renderer.flush()
      expect(frame.displayList.filter(item => item.kind === "text").map(item => item.text)).toEqual(["WWW", "iii"])
      expect(frame.boxByNode.get(paragraph)?.height).toBe(28)
    } finally { renderer.dispose() }
  })

  test("replaced inline elements retain their own layout and spaces around them", () => {
    const f = fixture()
    const image = f.document.createElement("img")
    image.src = "data:image/png;base64,"
    image.setAttribute("style", "width:10px;height:10px")
    f.paragraph.append("one ", image, " two")
    try {
      const frame = f.renderer.flush()
      expect(frame.boxByNode.get(image)?.x).toBe(24)
      expect(frame.displayList.filter(item => item.kind === "text").map(item => [item.text, item.x]))
        .toEqual([["one ", 0], [" two", 34]])
    } finally { f.renderer.dispose() }
  })

  test("scrolling translates all inline hit fragments with their paint", () => {
    const f = fixture(undefined, `${base};height:14px`)
    const link = f.document.createElement("a")
    link.textContent = "two three"
    f.paragraph.append("one ", link, " four")
    try {
      f.renderer.flush()
      f.paragraph.scrollTop = 14
      const frame = f.renderer.flush()
      expect(frame.scrolls.get(f.paragraph)?.scrollTop).toBe(14)
      expect(hitTest(frame, 2, 2)?.node).toBe(link)
      expect(hitTest(frame, 35, 2)?.node).not.toBe(link)
    } finally { f.renderer.dispose() }
  })
})
