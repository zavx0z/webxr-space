import {expect, test} from "bun:test"
import {createDocument, HTMLElement, textOffsetAtPosition} from "@zavx0z/dom"
import {createDocumentRenderer, readRenderedSelectionText} from "@zavx0z/renderer"
import {createDocumentSelectionInput, type DocumentSelectionKeyInput} from "../src/document-selection-input.ts"

function fixture(style = "width:120px") {
  const document = createDocument()
  const root = document.createElement("article") as HTMLElement
  root.setAttribute("style", `display:block;font-size:10px;line-height:14px;${style}`)
  document.append(root)
  const renderer = createDocumentRenderer({document, root, viewport: {width: 300, height: 180}})
  let requests = 0
  const input = createDocumentSelectionInput({document, readFrames: () => [renderer.flush()], readActiveFrame: () => renderer.flush(),
    isSelectionActive: () => true,
    requestFrame() { requests++ }})
  const block = (text: string, style = "") => {
    const node = document.createElement("p") as HTMLElement
    node.setAttribute("style", `display:block;${style}`)
    node.textContent = text
    root.append(node)
    return node
  }
  const key = (key: string, flags: Omit<DocumentSelectionKeyInput, "key" | "preventDefault"> = {}) => {
    let prevented = false
    const accepted = input.keyDown({key, ...flags, preventDefault() { prevented = true }})
    return {accepted, prevented}
  }
  return {document, root, renderer, input, block, key, requests: () => requests, dispose() {
    input.dispose()
    renderer.dispose()
  }}
}

test("document keyboard select-all is projection-scoped and rendered copy excludes user-select none", () => {
  const f = fixture()
  f.block("42", "user-select:none")
  f.block("alpha")
  f.block("omega")
  try {
    expect(f.key("a", {metaKey: true})).toEqual({accepted: true, prevented: true})
    expect(readRenderedSelectionText(f.renderer.flush())).toBe("alpha\nomega")
    expect(f.requests()).toBe(1)
    expect(f.key("a", {ctrlKey: true, defaultPrevented: true}).accepted).toBe(false)
    expect(f.key("a", {ctrlKey: true, isComposing: true}).accepted).toBe(false)
  } finally {f.dispose()}
})

test("Shift arrows preserve anchor and extend by entire Unicode graphemes", () => {
  const f = fixture()
  const paragraph = f.block("a👩‍💻éz")
  try {
    const selection = f.document.getSelection()
    selection.setBaseAndExtent(paragraph.firstChild!, 1, paragraph.firstChild!, 1)
    expect(f.key("ArrowRight", {shiftKey: true}).accepted).toBe(true)
    expect(selection.anchorOffset).toBe(1)
    expect(selection.focusOffset).toBe(6)
    expect(selection.toString()).toBe("👩‍💻")
    f.key("ArrowRight", {shiftKey: true})
    expect(selection.focusOffset).toBe(8)
    f.key("ArrowLeft", {shiftKey: true})
    expect(selection.focusOffset).toBe(6)
    expect(f.key("ArrowLeft").accepted).toBe(false)
  } finally {f.dispose()}
})

test("Shift Home End Up Down use visual wrapped lines and preserve desired column", () => {
  const f = fixture("width:60px")
  const paragraph = f.block("alpha beta gamma delta")
  try {
    const selection = f.document.getSelection()
    selection.setBaseAndExtent(paragraph.firstChild!, 8, paragraph.firstChild!, 8)
    expect(f.key("Home", {shiftKey: true}).accepted).toBe(true)
    expect(selection.focusOffset).toBe(0)
    f.key("End", {shiftKey: true})
    expect(selection.focusOffset).toBe(10)
    f.key("ArrowDown", {shiftKey: true})
    expect(selection.focusOffset).toBe(16)
    f.key("ArrowDown", {shiftKey: true})
    expect(selection.focusOffset).toBe(22)
    f.key("ArrowUp", {shiftKey: true})
    expect(selection.focusOffset).toBe(16)
    f.key("ArrowUp", {shiftKey: true})
    expect(selection.focusOffset).toBe(10)
    expect(selection.anchorOffset).toBe(8)
    f.key("Home", {shiftKey: true, ctrlKey: true})
    expect(selection.focusOffset).toBe(0)
    f.key("ArrowDown", {shiftKey: true, metaKey: true})
    expect(selection.focusOffset).toBe(22)
  } finally {f.dispose()}
})

test("native controls and contenteditable keep their independent keyboard editing owners", () => {
  const f = fixture()
  const paragraph = f.block("ordinary")
  try {
    f.document.getSelection().selectAllChildren(paragraph)
    for (const tag of ["input", "textarea", "select", "div"]) {
      const field = f.document.createElement(tag) as HTMLElement
      if (tag === "div") field.contentEditable = "plaintext-only"
      f.root.append(field)
      field.focus()
      expect(f.document.activeElement).toBe(field)
      expect(f.key("a", {ctrlKey: true}).accepted).toBe(false)
      expect(f.key("ArrowLeft", {shiftKey: true}).accepted).toBe(false)
      expect(f.document.getSelection().toString()).toBe("ordinary")
      field.remove()
    }
  } finally {f.dispose()}
})

test("shared frame steps autoscroll both axes and extend selection without their own timer", () => {
  const f = fixture("width:80px;height:56px;overflow:auto")
  const paragraphs = Array.from({length: 40}, (_, index) => f.block(`line ${index} with long text`, "width:240px;height:14px;white-space:pre"))
  try {
    const selection = f.document.getSelection()
    selection.setBaseAndExtent(paragraphs[0]!.firstChild!, 1, paragraphs[0]!.firstChild!, 1)
    f.input.updatePointer(f.renderer.flush(), {clientX: 130, clientY: 96, pointerId: 7, buttons: 1}, true)
    expect(f.input.advance(16)).toBe(true)
    expect(f.root.scrollLeft).toBeGreaterThan(0)
    expect(f.root.scrollTop).toBeGreaterThan(0)
    expect(textOffsetAtPosition(f.root, selection.focusNode!, selection.focusOffset)).toBeGreaterThan(1)
    const firstTop = f.root.scrollTop
    expect(f.input.advance(16)).toBe(true)
    expect(f.root.scrollTop).toBeGreaterThan(firstTop)
    f.input.clearPointer(2)
    expect(f.input.advance(16)).toBe(true)
    f.input.clearPointer(7)
    expect(f.input.advance(16)).toBe(false)
  } finally {f.dispose()}
})

test("autoscroll chooses nearest eligible nested scrollport and stops at all limits", () => {
  const f = fixture("width:100px;height:70px;overflow:auto")
  const inner = f.document.createElement("section") as HTMLElement
  inner.setAttribute("style", "display:block;width:80px;height:40px;overflow:auto")
  f.root.append(inner)
  const rows = Array.from({length: 30}, (_, index) => {
    const row = f.document.createElement("p")
    row.setAttribute("style", "display:block;height:14px;white-space:pre")
    row.textContent = `row ${index}`
    inner.append(row)
    return row
  })
  f.block("outer tail", "height:300px")
  try {
    f.document.getSelection().setBaseAndExtent(rows[0]!.firstChild!, 0, rows[0]!.firstChild!, 0)
    f.input.updatePointer(f.renderer.flush(), {clientX: 20, clientY: 150, buttons: 1}, true)
    expect(f.input.advance(16)).toBe(true)
    expect(inner.scrollTop).toBeGreaterThan(0)
    expect(f.root.scrollTop).toBe(0)
    inner.scrollTop = 100_000
    expect(f.input.advance(16)).toBe(true)
    expect(f.root.scrollTop).toBeGreaterThan(0)
    f.root.scrollTop = 100_000
    const count = f.requests()
    expect(f.input.advance(16)).toBe(false)
    expect(f.requests()).toBe(count)
  } finally {f.dispose()}
})

test("prevented component drags do not autoscroll from an earlier document selection", () => {
  const f = fixture("height:40px;overflow:auto")
  const paragraph = f.block("text", "height:300px")
  try {
    f.document.getSelection().selectAllChildren(paragraph)
    f.input.updatePointer(f.renderer.flush(), {clientX: 50, clientY: 160, buttons: 1}, false)
    expect(f.input.advance(16)).toBe(false)
    expect(f.root.scrollTop).toBe(0)
    expect(f.requests()).toBe(0)
    f.input.dispose()
    expect(f.key("a", {ctrlKey: true}).accepted).toBe(false)
  } finally {f.dispose()}
})
