import {expect, test} from "bun:test"
import {createDocument, type HTMLElement} from "@zavx0z/dom"
import {caretPositionAtPoint, createDocumentInteractionController, createDocumentRenderer} from "../src/index.ts"

function scrolledSiblingFixture() {
  const document = createDocument()
  const root = document.createElement("main") as HTMLElement
  root.setAttribute("style", "display:block;width:240px;height:200px;font-size:10px;line-height:20px")
  const source = document.createElement("p") as HTMLElement
  source.setAttribute("style", "display:block;margin:0;height:60px;white-space:pre")
  source.textContent = "visible source line"
  const log = document.createElement("section") as HTMLElement
  log.setAttribute("style", "display:block;width:200px;height:60px;overflow:auto")
  const rows = Array.from({length: 30}, (_, index) => {
    const row = document.createElement("p") as HTMLElement
    row.setAttribute("style", "display:block;margin:0;line-height:20px;height:20px;white-space:pre;width:300px")
    row.textContent = `hidden log row ${index}`
    log.append(row)
    return row
  })
  root.append(source, log)
  document.append(root)
  const renderer = createDocumentRenderer({document, root, viewport: {width: 240, height: 200}})
  renderer.flush()
  log.scrollTop = 100
  const interaction = createDocumentInteractionController({document})
  return {document, root, source, log, rows, renderer, interaction, dispose() {
    interaction.dispose()
    renderer.dispose()
  }}
}

test("nearest caret excludes clipped sibling log rows whose projected coordinates overlap visible source", () => {
  const f = scrolledSiblingFixture()
  try {
    const frame = f.renderer.flush()
    const hidden = frame.displayList.find(item => item.kind === "text" && item.node === f.rows[2]!.firstChild)
    expect(hidden?.kind === "text" ? hidden.y : null).toBe(0)
    expect(caretPositionAtPoint(frame, 18, 10)?.offsetNode === f.source.firstChild).toBe(true)
    const nearest = caretPositionAtPoint(frame, 18, 10, {nearest: true})
    expect({text: nearest?.offsetNode.textContent, offset: nearest?.offset}).toEqual({text: "visible source line", offset: 3})
    f.interaction.pointerDown(frame, {clientX: 2, clientY: 10, pointerId: 1, buttons: 1})
    for (const x of [8, 14, 20, 26]) f.interaction.pointerMove(f.renderer.flush(), {clientX: x, clientY: 10, pointerId: 1, buttons: 1})
    expect(f.document.getSelection().focusNode === f.source.firstChild).toBe(true)
    expect(f.document.getSelection().toString()).toBe("visi")
  } finally {f.dispose()}
})

test("nearest outside a scroll clip chooses the closest visible text edge, not hidden horizontal characters", () => {
  const f = scrolledSiblingFixture()
  try {
    f.log.scrollLeft = 36
    const frame = f.renderer.flush()
    const caret = caretPositionAtPoint(frame, -100, 70, {nearest: true, root: f.log})
    expect({text: caret?.offsetNode.textContent, offset: caret?.offset}).toEqual({text: "hidden log row 5", offset: 6})
    const top = caretPositionAtPoint(frame, 20, -100, {nearest: true, root: f.log})
    expect(top?.offsetNode === f.rows[5]!.firstChild).toBe(true)
    const bottom = caretPositionAtPoint(frame, 20, 500, {nearest: true, root: f.log})
    expect(bottom?.offsetNode === f.rows[7]!.firstChild).toBe(true)
  } finally {f.dispose()}
})
