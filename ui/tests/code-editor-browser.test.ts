import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {createRoot} from "@zavx0z/component"
import {createDocument, type HTMLElement} from "@zavx0z/dom"
import {DataTransfer} from "@zavx0z/dom/data-transfer"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import {createDocumentClipboardController} from "../../browser/clipboard.ts"
import {createDocumentNativeInputHostWithSeams} from "../../browser/src/native-input-host.ts"
import {createCodeEditorModel} from "../code-editor-model.ts"
import type {CodeEditorProps} from "../src/code-editor/model.ts"
import type {ClipboardMenuController} from "../menus/clipboard-menu.tsx"

const workspace = resolve(import.meta.dir, "../..")
Bun.plugin(createTemplateJsxBunPlugin({cwd: workspace, persistent: true, sourceRoots: [resolve(workspace, "ui")]}))
const {CodeEditor} = await import("../views/code-editor.tsx")
const {ClipboardMenu} = await import("../menus/clipboard-menu.tsx")

class NativeProxy extends EventTarget {
  value = ""
  type = "text"
  min = ""
  max = ""
  step = ""
  readOnly = false
  disabled = false
  selectionStart: number | null = 0
  selectionEnd: number | null = 0
  selectionDirection: "forward" | "backward" | "none" | null = "none"
  focus(): void {}
  blur(): void {}
  remove(): void {}
  setSelectionRange(start: number, end: number, direction: "forward" | "backward" | "none" = "none"): void {
    this.selectionStart = start
    this.selectionEnd = end
    this.selectionDirection = direction
  }
}

function fixture() {
  const document = createDocument()
  const root = document.createElement("div")
  const editorHost = document.createElement("div")
  const menuHost = document.createElement("div")
  root.append(editorHost, menuHost)
  document.append(root)
  const model = createCodeEditorModel({value: "a b", selections: [{anchor: 0, head: 1}, {anchor: 2, head: 3}], primary: 1})
  const editor = createRoot(editorHost)
  editor.render(CodeEditor as unknown as CompiledTemplate<CodeEditorProps>, {value: "a b", readOnly: false, model})
  const code = editorHost.querySelector("code") as HTMLElement
  code.focus()
  return {document, root, menuHost, code, model, dispose() { editor.unmount() }}
}

test("global production menu preserves multicursor paste target across focus and failed clipboard access", async () => {
  const f = fixture()
  let fail = true
  const written: string[] = []
  const clipboard = createDocumentClipboardController(f.document, {access: {
    writeText: async text => { written.push(text) },
    readText: async () => {
      if (fail) throw new Error("Clipboard denied")
      return "first\nsecond"
    },
  }})
  const menu = createRoot(f.menuHost)
  menu.render(ClipboardMenu as unknown as CompiledTemplate<{controller: ClipboardMenuController}>, {controller: clipboard})
  try {
    expect(clipboard.openContextMenu(f.code, {x: 30, y: 40})).toBe(true)
    const paste = f.menuHost.querySelectorAll('[role="menuitem"]')[1] as HTMLElement
    paste.focus()
    expect(f.document.activeElement).toBe(paste)
    expect((await clipboard.paste()).status).toBe("error")
    expect(f.model.snapshot.value).toBe("a b")
    expect(f.model.snapshot.selections).toEqual([{anchor: 0, head: 1}, {anchor: 2, head: 3}])
    expect(clipboard.getSnapshot().open).toBe(true)
    fail = false
    expect((await clipboard.paste()).status).toBe("pasted")
    expect(f.document.activeElement).toBe(f.code)
    expect(f.model.snapshot.value).toBe("first second")
    expect(f.code.textContent).toBe("first second")
    expect(f.model.snapshot.selections).toEqual([{anchor: 5, head: 5}, {anchor: 12, head: 12}])
    f.model.undo()
    clipboard.openContextMenu(f.code, {x: 30, y: 40})
    const copy = f.menuHost.querySelectorAll('[role="menuitem"]')[0] as HTMLElement
    copy.focus()
    expect((await clipboard.copy()).status).toBe("copied")
    expect(written).toEqual(["a\nb"])
  } finally { menu.unmount(); clipboard.dispose(); f.dispose() }
})

test("native proxy IME forwards non-cancelable updates to every editor cursor without replacing keyed DOM", async () => {
  const f = fixture()
  const input = new NativeProxy()
  const select = new NativeProxy()
  const textarea = new NativeProxy()
  const host = createDocumentNativeInputHostWithSeams({requestFrame() {}}, {createProxies: () => ({
    input: input as unknown as HTMLInputElement,
    select: select as unknown as HTMLSelectElement,
    textarea: textarea as unknown as HTMLTextAreaElement,
    selectionTarget: new EventTarget(),
  })})
  const native = (type: string, data: string, extra: Readonly<Record<string, unknown>> = {}) => {
    const event = Object.assign(new Event(type, {bubbles: true, cancelable: false}), {data, ...extra})
    textarea.dispatchEvent(event)
    return event
  }
  try {
    host.setActiveRoot(f.root)
    expect(host.inputTarget).toBe(f.code)
    expect(host.activeProxy).toBe("textarea")
    const line = f.code.querySelector('[data-line-index="0"]')
    native("compositionstart", "")
    native("compositionupdate", "日")
    textarea.value = "a 日"
    textarea.setSelectionRange(3, 3)
    native("beforeinput", "日", {inputType: "insertCompositionText", isComposing: true})
    native("input", "日", {inputType: "insertCompositionText", isComposing: true})
    expect(f.model.snapshot.value).toBe("日 日")
    expect(f.code.textContent).toBe("日 日")
    native("compositionupdate", "日本")
    textarea.value = "a 日本"
    textarea.setSelectionRange(4, 4)
    native("beforeinput", "日本", {inputType: "insertCompositionText", isComposing: true})
    native("input", "日本", {inputType: "insertCompositionText", isComposing: true})
    native("compositionend", "日本")
    // Some native editing flows emit a final commit beforeinput after compositionend.
    // No new key was pressed and the native proxy contains the same committed value.
    native("beforeinput", "日本", {inputType: "insertText", isComposing: false})
    native("input", "日本", {inputType: "insertText", isComposing: false})
    await Promise.resolve()
    expect(f.code.textContent).toBe("日本 日本")
    expect(textarea.value).toBe("日本 日本")
    expect(f.code.querySelector('[data-line-index="0"]')).toBe(line)
    // The same text after an actual subsequent key is a new intentional edit.
    native("keydown", "", {key: "x", code: "KeyX", isComposing: false})
    native("beforeinput", "日本", {inputType: "insertText", isComposing: false})
    native("input", "日本", {inputType: "insertText", isComposing: false})
    expect(f.code.textContent).toBe("日本日本 日本日本")
    expect(host.dispatchKey(f.code, {type: "keydown", key: "z", metaKey: true})).toBe(false)
    expect(f.code.textContent).toBe("日本 日本")
    expect(host.dispatchKey(f.code, {type: "keydown", key: "z", metaKey: true})).toBe(false)
    expect(f.code.textContent).toBe("a b")
    expect(f.model.snapshot.selections).toEqual([{anchor: 0, head: 1}, {anchor: 2, head: 3}])
  } finally { host.dispose(); f.dispose() }
})

test("readonly CodeEditor blocks inherited editing and clipboard paste but keeps ordinary selection", async () => {
  const document = createDocument()
  const parent = document.createElement("div") as HTMLElement
  parent.contentEditable = "plaintext-only"
  document.append(parent)
  const component = createRoot(parent)
  component.render(CodeEditor as unknown as CompiledTemplate<CodeEditorProps>, {value: "readonly text", readOnly: true})
  const code = parent.querySelector("code") as HTMLElement
  const controller = createDocumentClipboardController(document, {access: {
    readText: async () => "must not insert", writeText: async () => {},
  }})
  const unsubscribe = controller.subscribe(() => {})
  try {
    expect(parent.isContentEditable).toBe(true)
    expect(code.isContentEditable).toBe(false)
    expect(code.tabIndex).toBe(-1)
    const range = document.createRange()
    range.selectNodeContents(code)
    document.getSelection().addRange(range)
    expect(document.getSelection().toString()).toBe("readonly text")
    expect(controller.openContextMenu(code, {x: 10, y: 10})).toBe(true)
    expect(controller.getSnapshot().canCopy).toBe(true)
    expect(controller.getSnapshot().canPaste).toBe(false)
    expect((await controller.paste()).status).toBe("unavailable")
    const clipboardData = new DataTransfer()
    clipboardData.setData("text/plain", "must not insert")
    const paste = Object.assign(new Event("paste", {cancelable: true}), {clipboardData}) as unknown as ClipboardEvent
    expect(controller.handleNative(paste, code)).toBe(false)
    expect(code.textContent).toBe("readonly text")
    expect(document.getSelection().toString()).toBe("readonly text")
  } finally { unsubscribe(); controller.dispose(); component.unmount() }
})

test("native cut copies and deletes every editor selection with one undo step", () => {
  const f = fixture()
  const controller = createDocumentClipboardController(f.document)
  const input = new NativeProxy()
  const select = new NativeProxy()
  const textarea = new NativeProxy()
  const host = createDocumentNativeInputHostWithSeams({requestFrame() {}, clipboard: controller}, {createProxies: () => ({
    input: input as unknown as HTMLInputElement,
    select: select as unknown as HTMLSelectElement,
    textarea: textarea as unknown as HTMLTextAreaElement,
    selectionTarget: new EventTarget(),
  })})
  try {
    host.setActiveRoot(f.root)
    const clipboardData = new DataTransfer()
    const event = Object.assign(new Event("cut", {bubbles: true, cancelable: true}), {clipboardData})
    textarea.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(clipboardData.getData("text/plain")).toBe("a\nb")
    expect(f.code.textContent).toBe(" ")
    expect(f.model.snapshot.value).toBe(" ")
    expect(f.model.undo()).toBe(true)
    expect(f.code.textContent).toBe("a b")
    expect(f.model.snapshot.selections).toEqual([{anchor: 0, head: 1}, {anchor: 2, head: 3}])
    expect(f.model.undo()).toBe(false)
  } finally { host.dispose(); controller.dispose(); f.dispose() }
})

test("denied native cut payload keeps production editor text, all selections and undo history unchanged", () => {
  const f = fixture()
  const controller = createDocumentClipboardController(f.document)
  try {
    const before = f.model.snapshot
    const selection = f.document.getSelection()
    const anchor = selection.anchorNode
    const focus = selection.focusNode
    const event = Object.assign(new Event("cut", {cancelable: true}), {clipboardData: {
      setData() { throw new Error("native clipboard denied") },
    }}) as unknown as ClipboardEvent
    expect(() => controller.handleNative(event, f.code)).not.toThrow()
    expect(event.defaultPrevented).toBe(true)
    expect(controller.getSnapshot().error).toBe("native clipboard denied")
    expect(f.model.snapshot).toBe(before)
    expect(f.code.textContent).toBe("a b")
    expect(f.model.snapshot.canUndo).toBe(false)
    expect(selection.anchorNode).toBe(anchor)
    expect(selection.focusNode).toBe(focus)
    expect(selection.toString()).toBe("b")
  } finally { controller.dispose(); f.dispose() }
})

test("async editor paste aborts when the primary caret or additional selection changes while awaiting clipboard", async () => {
  for (const additionalOnly of [false, true]) {
    const f = fixture()
    let deliver: (text: string) => void = () => {}
    const controller = createDocumentClipboardController(f.document, {access: {
      readText: () => new Promise<string>(resolve => { deliver = resolve }), writeText: async () => {},
    }})
    try {
      const pending = controller.paste()
      f.model.setSelections(additionalOnly ? [{anchor: 0, head: 0}, {anchor: 2, head: 3}] : [{anchor: 3, head: 3}], additionalOnly ? 1 : 0)
      const changed = f.model.snapshot
      deliver("unexpected")
      expect(await pending).toEqual({status: "stale"})
      expect(f.model.snapshot).toBe(changed)
      expect(f.code.textContent).toBe("a b")
      expect(f.model.snapshot.canUndo).toBe(false)
    } finally { controller.dispose(); f.dispose() }
  }
})
