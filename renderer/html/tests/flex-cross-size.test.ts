import {describe, expect, test} from "bun:test"
import {createDocument} from "../../../dom/src/index.ts"
import {createDocumentRenderer, type RenderFrame} from "../src/index.ts"
import type {Element} from "../../../dom/src/index.ts"

function containsText(frame: RenderFrame, element: Element) {
  const box = frame.boxByNode.get(element)!
  const text = frame.displayList.filter(item => item.kind === "text" && element.contains(item.node))
  expect(text.length).toBeGreaterThan(0)
  for (const item of text) {
    if (item.kind === "text") expect(item.y + item.lineHeight).toBeLessThanOrEqual(box.y + box.height + 1e-8)
  }
}

function fixture(rowStyle = "", cellStyle = "flex:1 1 0;min-width:0") {
  const document = createDocument()
  const root = document.createElement("section")
  root.setAttribute("style", "display:flex;flex-direction:column;width:240px;font-size:10px;line-height:14px")
  const row = document.createElement("div")
  row.setAttribute("style", `display:flex;flex-direction:row;flex-shrink:0;${rowStyle}`)
  const cells = ["Short", "alpha beta gamma delta epsilon zeta eta theta"].map(text => {
    const cell = document.createElement("div")
    cell.setAttribute("style", `display:block;box-sizing:border-box;padding:5px;border:1px solid #fff;${cellStyle}`)
    cell.textContent = text
    row.append(cell)
    return cell
  })
  const next = document.createElement("p")
  next.textContent = "Next row"
  root.append(row, next)
  document.append(root)
  let measurements = 0
  const renderer = createDocumentRenderer({
    document, root, viewport: {width: 600, height: 600},
    textMeasurer: {
      measureTextAdvance(text) {
        measurements++
        return text.length * 6
      },
    },
  })
  return {document, root, row, cells, next, renderer, measurements: () => measurements}
}

describe("flex cross size after main size resolution", () => {
  for (const align of ["stretch", "flex-start", "center", "flex-end"]) {
    test(`auto row contains wrapping with align-items:${align}`, () => {
      const f = fixture(`align-items:${align}`)
      try {
        const frame = f.renderer.flush()
        expect(frame.boxByNode.get(f.cells[1]!)?.width).toBe(120)
        containsText(frame, f.cells[1]!)
        const row = frame.boxByNode.get(f.row)!
        expect(row.height).toBe(54)
        expect(frame.boxByNode.get(f.next)!.y).toBeGreaterThanOrEqual(row.y + row.height)
        if (align === "stretch") expect(frame.boxByNode.get(f.cells[0]!)!.height).toBe(row.height)
      } finally { f.renderer.dispose() }
    })
  }

  test("shrunk declared widths use the final border box for text wrapping", () => {
    const f = fixture("", "width:200px;flex-shrink:1;min-width:0")
    try {
      const frame = f.renderer.flush()
      expect(frame.boxByNode.get(f.cells[1]!)!.width).toBe(120)
      expect(frame.boxByNode.get(f.row)!.height).toBe(54)
      containsText(frame, f.cells[1]!)
    } finally { f.renderer.dispose() }
  })

  test("wrapped lines include the cross size after growing each line's items", () => {
    const f = fixture("flex-wrap:wrap;gap:10px", "flex:1 1 140px;min-width:0")
    try {
      const frame = f.renderer.flush()
      expect(frame.boxByNode.get(f.cells[1]!)!.width).toBe(240)
      expect(frame.boxByNode.get(f.cells[1]!)!.height).toBe(40)
      expect(frame.boxByNode.get(f.cells[1]!)!.y).toBe(36)
      expect(frame.boxByNode.get(f.row)!.height).toBe(76)
      containsText(frame, f.cells[1]!)
    } finally { f.renderer.dispose() }
  })

  test("resizes and invalidates changed text while clean frames reuse measurements", () => {
    const f = fixture()
    try {
      const first = f.renderer.flush()
      const calls = f.measurements()
      expect(f.renderer.flush()).toBe(first)
      expect(f.measurements()).toBe(calls)
      f.root.setAttribute("style", "display:flex;flex-direction:column;width:480px;font-size:10px;line-height:14px")
      const wide = f.renderer.flush()
      expect(wide.boxByNode.get(f.row)!.height).toBeLessThan(first.boxByNode.get(f.row)!.height)
      containsText(wide, f.cells[1]!)
      f.cells[1]!.firstChild!.textContent = "Changed text ".repeat(12)
      const changed = f.renderer.flush()
      expect(changed.boxByNode.get(f.row)!.height).toBeGreaterThan(wide.boxByNode.get(f.row)!.height)
      containsText(changed, f.cells[1]!)
    } finally { f.renderer.dispose() }
  })

  test("nested row and column content receives the final width, including percentage descendants", () => {
    const f = fixture("gap:12px")
    const cell = f.cells[1]!
    cell.setAttribute("style", "display:flex;flex-direction:column;flex:1 1 0;min-width:0;padding:6px;box-sizing:border-box")
    const nested = f.document.createElement("div")
    nested.setAttribute("style", "display:flex;width:100%;gap:4px")
    const paragraph = f.document.createElement("p")
    paragraph.setAttribute("style", "display:block;flex:1 1 0;min-width:0")
    paragraph.textContent = "alpha beta gamma delta epsilon zeta"
    const sibling = f.document.createElement("div")
    sibling.setAttribute("style", "width:20px;flex-shrink:0")
    nested.append(paragraph, sibling)
    cell.replaceChildren(nested)
    try {
      const frame = f.renderer.flush()
      expect(frame.boxByNode.get(cell)!.width).toBe(114)
      expect(frame.boxByNode.get(nested)!.width).toBe(102)
      expect(frame.boxByNode.get(paragraph)!.width).toBe(78)
      containsText(frame, paragraph)
      containsText(frame, cell)
      containsText(frame, f.row)
    } finally { f.renderer.dispose() }
  })

  test("declared and maximum heights preserve intended overflow instead of growing to fit", () => {
    for (const style of ["height:30px", "max-height:30px"]) {
      const f = fixture(`${style};overflow:auto`)
      try {
        const frame = f.renderer.flush()
        expect(frame.boxByNode.get(f.row)!.height).toBe(30)
        expect(frame.scrolls.get(f.row)!.maxScrollTop).toBeGreaterThan(0)
      } finally { f.renderer.dispose() }
    }
  })

  test("intrinsic image ratio follows the resolved flex width", () => {
    const document = createDocument()
    const row = document.createElement("div")
    row.setAttribute("style", "display:flex;width:200px;align-items:flex-start")
    const image = document.createElement("img")
    image.src = "image.png"
    image.setAttribute("style", "flex:1 1 0;min-width:0;padding:5px;box-sizing:border-box")
    const sibling = document.createElement("div")
    sibling.setAttribute("style", "width:80px;flex-shrink:0")
    row.append(image, sibling)
    document.append(row)
    const renderer = createDocumentRenderer({document, root: row, viewport: {width: 400, height: 400},
      imageMeasurer: {measureImage() { return {width: 400, height: 200} }},
    })
    try {
      const frame = renderer.flush()
      expect(frame.boxByNode.get(image)).toMatchObject({width: 120, height: 65})
      expect(frame.boxByNode.get(row)!.height).toBe(65)
    } finally { renderer.dispose() }
  })
})
