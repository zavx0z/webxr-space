import {expect, test} from "bun:test"
import {createDocument, type EventTarget, type HTMLElement, type HTMLInputElement, type HTMLTextAreaElement} from "@zavx0z/dom"
import {createDocumentInteractionController, createDocumentRenderer} from "../src/index.ts"

function fixture() {
  const document = createDocument()
  const root = document.createElement("article") as HTMLElement
  root.setAttribute("style", "display:block;width:240px;height:160px;font-size:10px;line-height:14px;background:#222")
  const paragraph = document.createElement("p")
  paragraph.setAttribute("style", "display:block;margin:0")
  paragraph.textContent = "abcdefghijklmnop"
  root.append(paragraph)
  document.append(root)
  const renderer = createDocumentRenderer({document, root, viewport: {width: 240, height: 160}})
  const interaction = createDocumentInteractionController({document})
  const pointer = (x = 6, y = 7, buttons = 1) => ({clientX: x, clientY: y, pointerId: 9, button: 0, buttons})
  return {document, root, paragraph, renderer, interaction, pointer, dispose() {
    interaction.dispose()
    renderer.dispose()
  }}
}

test("pending capture takes over default text selection before move and dispatches capture lifecycle once", () => {
  const f = fixture()
  const events: string[] = []
  f.root.addEventListener("gotpointercapture", () => events.push("got"))
  f.root.addEventListener("lostpointercapture", () => events.push("lost"))
  const targets: Array<EventTarget | null> = []
  f.document.addEventListener("pointermove", event => { targets.push(event.target) })
  try {
    const frame = f.renderer.flush()
    f.interaction.pointerDown(frame, f.pointer())
    f.interaction.pointerMove(frame, f.pointer(24))
    expect(f.document.getSelection().toString()).toBe("bcd")
    expect(f.interaction.selectionPointerId).toBe(9)
    f.root.setPointerCapture(9)
    expect(events).toEqual([])
    expect(f.interaction.pointerMove(frame, f.pointer(42))).toBe(f.root)
    expect(targets.at(-1)).toBe(f.root)
    expect(f.interaction.selectionPointerId).toBeNull()
    expect(f.document.getSelection().toString()).toBe("bcd")
    expect(events).toEqual(["got"])
    f.interaction.composeFrame(frame)
    expect(f.interaction.hoveredElement).toBe(f.root)
    expect(f.interaction.pointerUp(frame, f.pointer(60, 7, 0))).toBe(f.root)
    expect(events).toEqual(["got", "lost"])
    expect(f.root.hasPointerCapture(9)).toBe(false)
  } finally {f.dispose()}
})

test("author-owned scrollbar capture preserves its move target without starting document selection", () => {
  const f = fixture()
  const thumb = f.document.createElement("div")
  thumb.setAttribute("role", "scrollbar")
  thumb.setAttribute("style", "display:block;width:40px;height:20px;background:#777")
  thumb.textContent = "thumb"
  f.root.append(thumb)
  let moves = 0
  thumb.addEventListener("pointerdown", event => {
    event.preventDefault()
    thumb.setPointerCapture(9)
  })
  thumb.addEventListener("pointermove", () => moves++)
  try {
    const frame = f.renderer.flush()
    f.interaction.pointerDown(frame, f.pointer(6, 21))
    expect(f.interaction.selectionPointerId).toBeNull()
    expect(f.interaction.pointerMove(frame, f.pointer(200, 130))).toBe(thumb)
    expect(moves).toBe(1)
    expect(f.document.getSelection().rangeCount).toBe(0)
    f.interaction.pointerUp(frame, f.pointer(200, 130, 0))
    expect(thumb.hasPointerCapture(9)).toBe(false)
  } finally {f.dispose()}
})

test("capture requested in a move handler prevents that event's old selection default action", () => {
  const f = fixture()
  f.paragraph.addEventListener("pointermove", () => f.root.setPointerCapture(9), {once: true})
  try {
    const frame = f.renderer.flush()
    f.interaction.pointerDown(frame, f.pointer())
    f.interaction.pointerMove(frame, f.pointer(60))
    expect(f.interaction.selectionPointerId).toBeNull()
    expect(f.document.getSelection().isCollapsed).toBe(true)
    expect(f.document.getSelection().anchorOffset).toBe(1)
  } finally {f.dispose()}
})

test("selection owner capture keeps normal selection, but transfer and release never resume a cancelled gesture", () => {
  const f = fixture()
  try {
    const frame = f.renderer.flush()
    f.interaction.pointerDown(frame, f.pointer())
    f.paragraph.setPointerCapture(9)
    f.interaction.pointerMove(frame, f.pointer(24))
    expect(f.interaction.selectionPointerId).toBe(9)
    expect(f.document.getSelection().toString()).toBe("bcd")
    f.root.setPointerCapture(9)
    f.document.readPointerCaptureTarget(9)
    expect(f.interaction.selectionPointerId).toBeNull()
    f.root.releasePointerCapture(9)
    f.interaction.pointerMove(frame, f.pointer(60))
    expect(f.document.getSelection().toString()).toBe("bcd")
    f.interaction.pointerUp(frame, f.pointer(60, 7, 0))
    f.interaction.pointerDown(frame, f.pointer())
    f.interaction.pointerMove(frame, f.pointer(18))
    expect(f.document.getSelection().toString()).toBe("bc")
  } finally {f.dispose()}
})

test.each(["pointerup", "pointercancel"] as const)("pending capture is processed even when the next event is %s", kind => {
  const f = fixture()
  const events: string[] = []
  const targets: Array<EventTarget | null> = []
  f.document.addEventListener(kind, event => { targets.push(event.target) })
  f.root.addEventListener("gotpointercapture", () => events.push("got"))
  f.root.addEventListener("lostpointercapture", () => events.push("lost"))
  try {
    const frame = f.renderer.flush()
    f.interaction.pointerDown(frame, f.pointer())
    f.root.setPointerCapture(9)
    if (kind === "pointerup") f.interaction.pointerUp(frame, f.pointer(60, 7, 0))
    else f.interaction.pointerCancel(frame, f.pointer())
    expect(targets.at(-1)).toBe(f.root)
    expect(events).toEqual(["got", "lost"])
    expect(f.interaction.selectionPointerId).toBeNull()
    expect(f.document.getSelection().isCollapsed).toBe(true)
    f.interaction.pointerMove(frame, f.pointer(60, 7, 0))
    expect(f.document.getSelection().isCollapsed).toBe(true)
  } finally {f.dispose()}
})

test("removing a selection owner or disposing its controller clears gesture state and pending capture", () => {
  const f = fixture()
  try {
    const frame = f.renderer.flush()
    f.interaction.pointerDown(frame, f.pointer())
    f.paragraph.remove()
    expect(f.interaction.selectionPointerId).toBeNull()
    f.root.setPointerCapture(9)
    f.interaction.dispose()
    expect(f.root.hasPointerCapture(9)).toBe(false)
    expect(f.document.readPointerCaptureTarget(9)).toBeNull()
    expect(f.interaction.selectionPointerId).toBeNull()
  } finally {f.dispose()}
})

test("capture during pointerdown owns the gesture before ordinary selection starts", () => {
  const f = fixture()
  f.paragraph.addEventListener("pointerdown", () => f.root.setPointerCapture(9))
  try {
    const frame = f.renderer.flush()
    f.interaction.pointerDown(frame, f.pointer())
    expect(f.interaction.selectionPointerId).toBeNull()
    f.interaction.pointerMove(frame, f.pointer(60))
    expect(f.document.getSelection().isCollapsed).toBe(true)
  } finally {f.dispose()}
})

test("short button click is preserved, captured handoff suppresses activation even after release", () => {
  const f = fixture()
  const button = f.document.createElement("button")
  button.setAttribute("style", "display:block;width:80px;height:24px")
  button.textContent = "Action"
  f.root.replaceChildren(button)
  let clicks = 0
  button.addEventListener("click", () => clicks++)
  try {
    const frame = f.renderer.flush()
    f.interaction.pointerDown(frame, f.pointer())
    f.interaction.pointerUp(frame, f.pointer(6, 7, 0))
    expect(clicks).toBe(1)
    f.interaction.pointerDown(frame, f.pointer())
    f.root.setPointerCapture(9)
    f.interaction.pointerMove(frame, f.pointer(8))
    f.root.releasePointerCapture(9)
    f.interaction.pointerUp(frame, f.pointer(6, 7, 0))
    expect(clicks).toBe(1)
  } finally {f.dispose()}
})

test("native textarea selection and range dragging still work, and explicit transfer cancels their defaults", () => {
  const f = fixture()
  const text = f.document.createElement("textarea") as HTMLTextAreaElement
  text.value = "abcdefghijklmnop"
  text.wrap = "off"
  text.setAttribute("style", "display:block;width:180px;height:28px;padding:0;border:0;font-size:10px;line-height:14px;white-space:pre")
  const range = f.document.createElement("input") as HTMLInputElement
  range.type = "range"
  range.setAttribute("style", "display:block;width:160px;height:24px")
  f.root.replaceChildren(text, range)
  try {
    const frame = f.renderer.flush()
    f.interaction.pointerDown(frame, f.pointer())
    text.setPointerCapture(9)
    f.interaction.pointerMove(frame, f.pointer(36))
    expect(text.selectionEnd).toBeGreaterThan(text.selectionStart)
    const end = text.selectionEnd
    f.root.setPointerCapture(9)
    expect(f.interaction.pointerMove(frame, f.pointer(72))).toBe(f.root)
    expect(text.selectionEnd).toBe(end)
    f.interaction.pointerUp(frame, f.pointer(72, 7, 0))
    f.interaction.pointerDown(frame, f.pointer(30, 40))
    const initial = range.value
    f.interaction.pointerMove(frame, f.pointer(100, 40))
    expect(range.value).not.toBe(initial)
    const held = range.value
    f.root.setPointerCapture(9)
    expect(f.interaction.pointerMove(frame, f.pointer(150, 40))).toBe(f.root)
    expect(range.value).toBe(held)
    f.interaction.pointerCancel(frame, f.pointer(150, 40))
  } finally {f.dispose()}
})
