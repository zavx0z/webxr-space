import {expect, test} from "bun:test"
import {createDocument, ClipboardEvent, InputEvent, HTMLElement} from "@zavx0z/dom"
import {createDocumentClipboardController} from "../clipboard.ts"

test("menu copy preserves the selected source while menu focus changes", async () => {
  const document = createDocument()
  const root = document.createElement("div")
  const source = document.createElement("p")
  const menu = document.createElement("button")
  source.textContent = "alpha beta"
  root.append(source, menu)
  document.append(root)
  document.getSelection().setBaseAndExtent(source.firstChild!, 0, source.firstChild!, 5)
  const written: string[] = []
  const commands = createDocumentClipboardController(document, {
    access: {readText: async () => "unused", writeText: async text => { written.push(text) }},
  })
  const unsubscribe = commands.subscribe(() => {})
  expect(commands.openContextMenu(source, {x: 10, y: 20})).toBe(true)
  menu.focus()
  expect(commands.getSnapshot().canCopy).toBe(true)
  expect(commands.getSnapshot().canPaste).toBe(false)
  expect(await commands.copy()).toEqual({status: "copied"})
  expect(written).toEqual(["alpha"])
  expect(document.getSelection().toString()).toBe("alpha")
  unsubscribe()
  commands.dispose()
})

test("menu paste targets the captured editable control and does not depend on menu DOM changes", async () => {
  const document = createDocument()
  const root = document.createElement("div")
  const input = document.createElement("textarea")
  const menu = document.createElement("button")
  root.append(input, menu)
  document.append(root)
  input.value = "alpha beta"
  input.setSelectionRange(6, 10)
  input.focus()
  let inputs = 0
  input.addEventListener("input", () => { inputs++ })
  const commands = createDocumentClipboardController(document, {
    access: {readText: async () => "γ", writeText: async () => {}},
  })
  commands.subscribe(() => {})
  commands.openContextMenu(input, {x: 0, y: 0})
  menu.textContent = "Вставить"
  menu.focus()
  expect(await commands.paste()).toEqual({status: "pasted"})
  expect(input.value).toBe("alpha γ")
  expect(input.selectionStart).toBe(7)
  expect(document.activeElement).toBe(input)
  expect(inputs).toBe(1)
  commands.dispose()
})

test("failed or stale async paste never changes text or replaces clipboard with empty text", async () => {
  const document = createDocument()
  const input = document.createElement("textarea")
  document.append(input)
  input.value = "original"
  input.focus()
  let resolve: (text: string) => void = () => {}
  const writes: string[] = []
  const commands = createDocumentClipboardController(document, {
    access: {readText: () => new Promise<string>(done => { resolve = done }), writeText: async text => { writes.push(text) }},
  })
  expect(await commands.copy()).toEqual({status: "empty"})
  expect(writes).toEqual([])
  const pending = commands.paste()
  input.value = "changed meanwhile"
  resolve("late")
  expect(await pending).toEqual({status: "stale"})
  expect(input.value).toBe("changed meanwhile")
  commands.dispose()
  const denied = createDocumentClipboardController(document, {
    access: {readText: async () => { throw new Error("denied") }, writeText: async () => {}},
  })
  expect(await denied.paste()).toEqual({status: "error", message: "denied"})
  expect(input.value).toBe("changed meanwhile")
  denied.dispose()
})

test("readonly targets reject paste, editor clipboard overrides and beforeinput cancellation share the path", async () => {
  const document = createDocument()
  const editor = document.createElement("code")
  if (!(editor instanceof HTMLElement)) throw new Error("Expected an HTML editing host")
  editor.contentEditable = "plaintext-only"
  editor.textContent = "alpha beta"
  document.append(editor)
  editor.focus()
  document.getSelection().setBaseAndExtent(editor.firstChild!, 0, editor.firstChild!, 5)
  const written: string[] = []
  let edits = 0
  editor.addEventListener("copy", event => {
    const copy = event as ClipboardEvent
    copy.clipboardData!.setData("text/plain", "alpha\nbeta")
    copy.preventDefault()
  })
  editor.addEventListener("beforeinput", event => {
    expect((event as InputEvent).inputType).toBe("insertFromPaste")
    event.preventDefault()
    edits++
  })
  const commands = createDocumentClipboardController(document, {
    access: {readText: async () => "new", writeText: async text => { written.push(text) }},
  })
  expect(await commands.copy()).toEqual({status: "copied"})
  expect(written).toEqual(["alpha\nbeta"])
  expect(await commands.paste()).toEqual({status: "cancelled"})
  expect(edits).toBe(1)
  expect(editor.textContent).toBe("alpha beta")
  editor.contentEditable = "false"
  expect(await commands.paste()).toEqual({status: "unavailable"})
  commands.dispose()
})

test("native copy and paste reuse command events and do not invoke asynchronous permission APIs", () => {
  const document = createDocument()
  const input = document.createElement("textarea")
  document.append(input)
  input.value = "abcd"
  input.setSelectionRange(1, 3)
  input.focus()
  let copyCount = 0
  input.addEventListener("copy", () => { copyCount++ })
  const commands = createDocumentClipboardController(document, {access: {
    readText: async () => { throw new Error("unexpected read") },
    writeText: async () => { throw new Error("unexpected write") },
  }})
  const data = new Map<string, string>()
  const native = (type: string) => ({type, defaultPrevented: false,
    clipboardData: {getData: (name: string) => data.get(name) ?? "", setData: (name: string, text: string) => data.set(name, text)},
    preventDefault() { this.defaultPrevented = true },
  })
  const copy = native("copy")
  expect(commands.handleNative(copy as unknown as globalThis.ClipboardEvent)).toBe(true)
  expect(copyCount).toBe(1)
  expect(data.get("text/plain")).toBe("bc")
  data.set("text/plain", "X")
  expect(commands.handleNative(native("paste") as unknown as globalThis.ClipboardEvent)).toBe(true)
  expect(input.value).toBe("aXd")
  commands.dispose()
})

test("native cut cancellation preserves text and respects both empty and custom non-plain clipboard payloads", () => {
  for (const customPayload of [false, true]) {
    const document = createDocument()
    const input = document.createElement("textarea")
    document.append(input)
    input.value = "source"
    input.setSelectionRange(0, 6)
    input.focus()
    input.addEventListener("cut", event => {
      const cut = event as ClipboardEvent
      if (customPayload) cut.clipboardData!.setData("text/html", "<b>custom</b>")
      cut.preventDefault()
    })
    const commands = createDocumentClipboardController(document)
    const data = new Map<string, string>()
    const event = {type: "cut", defaultPrevented: false,
      clipboardData: {setData: (format: string, value: string) => data.set(format, value)},
      preventDefault() { this.defaultPrevented = true },
    }
    try {
      expect(commands.handleNative(event as unknown as globalThis.ClipboardEvent)).toBe(true)
      expect(event.defaultPrevented).toBe(true)
      expect(input.value).toBe("source")
      expect(input.selectionStart).toBe(0)
      expect(input.selectionEnd).toBe(6)
      expect(data.get("text/plain")).toBeUndefined()
      expect(data.get("text/html")).toBe(customPayload ? "<b>custom</b>" : undefined)
    } finally { commands.dispose() }
  }
})

test("native cut write denial cancels the native default before ordinary control deletion", () => {
  const document = createDocument()
  const input = document.createElement("textarea")
  document.append(input)
  input.value = "source"
  input.setSelectionRange(1, 4)
  input.focus()
  const commands = createDocumentClipboardController(document)
  const event = {type: "cut", defaultPrevented: false,
    clipboardData: {setData() { throw new Error("denied") }},
    preventDefault() { this.defaultPrevented = true },
  }
  try {
    expect(commands.handleNative(event as unknown as globalThis.ClipboardEvent)).toBe(true)
    expect(event.defaultPrevented).toBe(true)
    expect(commands.getSnapshot().error).toBe("denied")
    expect(input.value).toBe("source")
    expect([input.selectionStart, input.selectionEnd]).toEqual([1, 4])
  } finally { commands.dispose() }
})

test("native custom copy payload is handed off once without URL alias data loss", () => {
  const document = createDocument()
  const source = document.createElement("p")
  source.textContent = "source"
  document.append(source)
  source.addEventListener("copy", event => {
    const copy = event as ClipboardEvent
    copy.clipboardData!.setData("url", "# comment\nhttps://example.com/\n")
    copy.preventDefault()
  })
  const calls: Array<[string, string]> = []
  const event = {type: "copy", defaultPrevented: false,
    clipboardData: {setData: (format: string, value: string) => { calls.push([format, value]) }},
    preventDefault() { this.defaultPrevented = true },
  }
  const commands = createDocumentClipboardController(document)
  try {
    expect(commands.handleNative(event as unknown as globalThis.ClipboardEvent, source)).toBe(true)
    expect(calls).toEqual([["url", "# comment\nhttps://example.com/\n"]])
    expect(event.defaultPrevented).toBe(true)
  } finally { commands.dispose() }
})

test("async control paste is stale after caret changes even if the caret returns to its original position", async () => {
  const document = createDocument()
  const input = document.createElement("textarea")
  document.append(input)
  input.value = "abcdef"
  input.setSelectionRange(1, 1)
  input.focus()
  let deliver: (value: string) => void = () => {}
  const commands = createDocumentClipboardController(document, {access: {
    readText: () => new Promise<string>(resolve => { deliver = resolve }), writeText: async () => {},
  }})
  try {
    const pending = commands.paste()
    input.setSelectionRange(5, 5)
    input.setSelectionRange(1, 1)
    deliver("unexpected")
    expect(await pending).toEqual({status: "stale"})
    expect(input.value).toBe("abcdef")
    expect(input.selectionStart).toBe(1)
  } finally { commands.dispose() }
})

test("disposing an awaiting paste leaves no late edit", async () => {
  const document = createDocument()
  const input = document.createElement("textarea")
  document.append(input)
  input.value = "original"
  input.focus()
  let deliver: (value: string) => void = () => {}
  const commands = createDocumentClipboardController(document, {access: {
    readText: () => new Promise<string>(resolve => { deliver = resolve }), writeText: async () => {},
  }})
  const pending = commands.paste()
  commands.dispose()
  input.setSelectionRange(3, 3)
  deliver("late")
  expect(await pending).toEqual({status: "stale"})
  expect(input.value).toBe("original")
})
