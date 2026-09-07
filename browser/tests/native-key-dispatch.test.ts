import {expect, test} from "bun:test"
import {createDocument, HTMLElement, HTMLInputElement, HTMLTextAreaElement, InputEvent as SemanticInputEvent, textPositionAtOffset} from "@zavx0z/dom"
import {createDocumentNativeInputHostWithSeams} from "../src/native-input-host.ts"

class NativeProxy extends EventTarget {
  public value = ""
  public type = "text"
  public min = ""
  public max = ""
  public step = ""
  public readOnly = false
  public disabled = false
  public selectionStart: number | null = 0
  public selectionEnd: number | null = 0
  public selectionDirection: "forward" | "backward" | "none" | null = "none"

  focus(): void {}
  blur(): void {}
  remove(): void {}
  setSelectionRange(
    start: number,
    end: number,
    direction: "forward" | "backward" | "none" = "none",
  ): void {
    this.selectionStart = start
    this.selectionEnd = end
    this.selectionDirection = direction
  }

  setRangeText(text: string, start: number, end: number): void {
    this.value = this.value.slice(0, start) + text + this.value.slice(end)
    this.setSelectionRange(start + text.length, start + text.length)
  }
}

test("[BRW-020] native host dispatches a key only to its exact active semantic proxy target", () => {
  const input = new NativeProxy() as unknown as globalThis.HTMLInputElement
  const select = new NativeProxy() as unknown as HTMLSelectElement
  const textarea = new NativeProxy() as unknown as globalThis.HTMLTextAreaElement
  const selectionTarget = new EventTarget()
  const host = createDocumentNativeInputHostWithSeams(
    {requestFrame() {}},
    {createProxies: () => ({input, select, textarea, selectionTarget})},
  )
  const document = createDocument()
  const root = document.createElement("div")
  const button = document.createElement("button")
  const other = document.createElement("button")
  root.append(button, other)
  document.append(root)
  button.focus()
  host.setActiveRoot(root)
  host.synchronize()
  root.id = "changed-after-focus"
  host.synchronize()
  expect(host.owner).toBe(root)
  expect(host.inputTarget).toBe(button)

  let keys = 0
  button.addEventListener("keydown", event => {
    keys += 1
    event.preventDefault()
  })
  expect(host.dispatchKey(button, {type: "keydown", key: "Enter", code: "Enter"})).toBe(false)
  expect(keys).toBe(1)
  expect(() => host.dispatchKey(other, {type: "keydown", key: "Enter"}))
    .toThrow("does not own the active native proxy")
  host.dispose()
})

function textFixture() {
  const input = new NativeProxy() as unknown as globalThis.HTMLInputElement
  const select = new NativeProxy() as unknown as globalThis.HTMLSelectElement
  const textarea = new NativeProxy() as unknown as globalThis.HTMLTextAreaElement
  const host = createDocumentNativeInputHostWithSeams({requestFrame() {}}, {
    createProxies: () => ({input, select, textarea, selectionTarget: new EventTarget()}),
  })
  const document = createDocument()
  const root = document.createElement("div")
  document.append(root)
  const activate = (target: HTMLElement) => {
    root.append(target)
    target.focus()
    host.setActiveRoot(root)
    host.synchronize()
  }
  return {document, root, host, activate}
}

test("native text dispatch replaces input selection through beforeinput and input exactly once", () => {
  const f = textFixture()
  const input = f.document.createElement("input") as HTMLInputElement
  input.value = "abcdef"
  input.setSelectionRange(1, 4, "backward")
  f.activate(input)
  const events: Array<Readonly<{type: string; data: string | null; trusted: boolean}>> = []
  const observe = (event: import("@zavx0z/dom").Event) => {
    if (event instanceof SemanticInputEvent) events.push({type: event.type, data: event.data, trusted: event.isTrusted})
  }
  input.addEventListener("beforeinput", observe)
  input.addEventListener("input", observe)
  try {
    expect(f.host.dispatchText(input, "X")).toBe(true)
    expect(input.value).toBe("aXef")
    expect([input.selectionStart, input.selectionEnd]).toEqual([2, 2])
    expect(events).toEqual([{type: "beforeinput", data: "X", trusted: false}, {type: "input", data: "X", trusted: false}])
  } finally {f.host.dispose()}
})

test("native text dispatch respects readonly and exact active ownership", () => {
  const f = textFixture()
  const textarea = f.document.createElement("textarea") as HTMLTextAreaElement
  textarea.value = "unchanged"
  textarea.readOnly = true
  f.activate(textarea)
  const other = f.document.createElement("textarea") as HTMLTextAreaElement
  f.root.append(other)
  let events = 0
  textarea.addEventListener("beforeinput", () => events++)
  try {
    expect(f.host.dispatchText(textarea, "no")).toBe(false)
    expect(textarea.value).toBe("unchanged")
    expect(events).toBe(0)
    expect(() => f.host.dispatchText(other, "no")).toThrow("active native proxy")
  } finally {f.host.dispose()}
})

test("native text dispatch edits contenteditable through the existing proxy default", () => {
  const f = textFixture()
  const editor = f.document.createElement("div") as HTMLElement
  editor.contentEditable = "plaintext-only"
  const first = f.document.createElement("span")
  const last = f.document.createElement("span")
  first.textContent = "alpha "
  last.textContent = "beta"
  editor.append(first, last)
  f.activate(editor)
  f.document.getSelection().setBaseAndExtent(last.firstChild!, 0, last.firstChild!, 4)
  let inputEvents = 0
  editor.addEventListener("input", () => inputEvents++)
  try {
    expect(f.host.dispatchText(editor, "new")).toBe(true)
    expect(editor.textContent).toBe("alpha new")
    expect(editor.firstChild).toBe(first)
    expect(first.textContent).toBe("alpha ")
    expect(f.document.getSelection().isCollapsed).toBe(true)
    expect(inputEvents).toBe(1)
  } finally {f.host.dispose()}
})

test("cancelled beforeinput preserves editor-owned multi-range replacement without a second default", () => {
  const f = textFixture()
  const editor = f.document.createElement("div") as HTMLElement
  editor.contentEditable = "plaintext-only"
  editor.textContent = "one two"
  f.activate(editor)
  f.document.getSelection().setBaseAndExtent(editor.firstChild!, 0, editor.firstChild!, 3)
  let inputEvents = 0
  editor.addEventListener("input", () => inputEvents++)
  editor.addEventListener("beforeinput", event => {
    if (!(event instanceof SemanticInputEvent)) return
    editor.textContent = `${event.data} ${event.data}`
    const end = textPositionAtOffset(editor, editor.textContent.length)
    f.document.getSelection().setBaseAndExtent(end.node, end.offset, end.node, end.offset)
    event.preventDefault()
  })
  try {
    expect(f.host.dispatchText(editor, "X")).toBe(false)
    expect(editor.textContent).toBe("X X")
    expect(inputEvents).toBe(0)
  } finally {f.host.dispose()}
})

test("cancelled text-control beforeinput does not mutate native or semantic value", () => {
  const f = textFixture()
  const input = f.document.createElement("input") as HTMLInputElement
  input.value = "keep"
  input.setSelectionRange(0, 4)
  f.activate(input)
  input.addEventListener("beforeinput", event => event.preventDefault())
  try {
    expect(f.host.dispatchText(input, "replace")).toBe(false)
    expect(input.value).toBe("keep")
    expect(f.host.nativeInput.value).toBe("keep")
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, 4])
  } finally {f.host.dispose()}
})

test("rebinding a focused projection preserves its selection without synthetic pointer input", () => {
  const f = textFixture()
  const left = f.document.createElement("section") as HTMLElement
  const right = f.document.createElement("section") as HTMLElement
  const input = f.document.createElement("input") as HTMLInputElement
  const editor = f.document.createElement("div") as HTMLElement
  editor.contentEditable = "plaintext-only"
  editor.textContent = "replace middle suffix"
  left.append(input)
  right.append(editor)
  f.root.append(left, right)
  input.focus()
  f.host.setActiveRoot(left)
  try {
    editor.focus()
    const selection = f.document.getSelection()
    selection.setBaseAndExtent(editor.firstChild!, 8, editor.firstChild!, 14)
    const range = selection.getRangeAt(0)
    f.host.setActiveRoot(right)
    expect(selection.getRangeAt(0)).toBe(range)
    expect(f.host.inputTarget).toBe(editor)
    expect(f.host.dispatchText(editor, "new")).toBe(true)
    expect(editor.textContent).toBe("replace new suffix")
  } finally {f.host.dispose()}
})
