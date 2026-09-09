import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {createRoot} from "@zavx0z/component"
import {createDocument, type HTMLElement, readDocumentTextHighlights} from "@zavx0z/dom"
import {InputEvent} from "@zavx0z/dom/input-event"
import {CompositionEvent} from "@zavx0z/dom/composition-event"
import {KeyboardEvent} from "@zavx0z/dom/keyboard-event"
import {PointerEvent} from "@zavx0z/dom/pointer-event"
import {MouseEvent} from "@zavx0z/dom/mouse-event"
import {ClipboardEvent} from "@zavx0z/dom/clipboard-event"
import {DataTransfer} from "@zavx0z/dom/data-transfer"
import {textPositionAtOffset} from "@zavx0z/dom/text-position"
import {registerLanguageHighlighter} from "@zavx0z/highlighter"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import {createDocumentInteractionController, createDocumentRenderer, getRangeClientRects} from "@renderer/html"
import {createCodeEditorModel} from "../code-editor-model.ts"
import type {CodeEditorProps} from "../src/code-editor/model.ts"
import {createDocumentClipboardController} from "../../browser/clipboard.ts"

const root = resolve(import.meta.dir, "../..")
Bun.plugin(createTemplateJsxBunPlugin({cwd: root, persistent: true, sourceRoots: [resolve(root, "ui")]}))
const {CodeEditor} = await import("../views/code-editor.tsx")
const template = CodeEditor as unknown as CompiledTemplate<CodeEditorProps>

function mount(value: string, options: Partial<CodeEditorProps> = {}) {
  const document = createDocument()
  const container = document.createElement("div")
  document.append(container)
  const model = options.model ?? createCodeEditorModel({value})
  const component = createRoot(container)
  component.render(template, {value, readOnly: false, model, ...options})
  const code = container.querySelector("code") as HTMLElement
  return {document, container, model, component, code, dispose() { component.unmount() }}
}

function select(fixture: ReturnType<typeof mount>, anchor: number, head: number) {
  const start = textPositionAtOffset(fixture.code, anchor)
  const end = textPositionAtOffset(fixture.code, head)
  fixture.document.getSelection().setBaseAndExtent(start.node, start.offset, end.node, end.offset)
}

function input(fixture: ReturnType<typeof mount>, inputType: string, data?: string) {
  const event = new InputEvent("beforeinput", {bubbles: true, cancelable: true, inputType, data: data ?? null})
  fixture.code.dispatchEvent(event)
  return event
}

test("production code keeps exact text including LF/CRLF and line height without separator wrappers", () => {
  const value = "first\r\n\nlast\r"
  const f = mount(value, {readOnly: true})
  const renderer = createDocumentRenderer({document: f.document, root: f.container, viewport: {width: 600, height: 400}})
  try {
    expect(f.code.textContent).toBe(value)
    expect(f.code.getAttribute("contenteditable")).toBe("false")
    const frame = renderer.flush()
    const lines = f.code.querySelectorAll("[data-line-index]")
    expect(lines).toHaveLength(4)
    const boxes = Array.from(lines, line => frame.boxByNode.get(line)!)
    expect(boxes.map(box => box.height)).toEqual([16, 16, 16, 16])
    expect(boxes.map(box => box.y - boxes[0]!.y)).toEqual([0, 16, 32, 48])
    expect(frame.boxByNode.get(f.container.querySelector("ul")!)?.userSelect).toBe("none")
  } finally { renderer.dispose(); f.dispose() }
})

test("semantic beforeinput edits all carets, updates rendered value, and notifies only text changes", () => {
  const changes: string[] = []
  const f = mount("one\ntwo", {onChange: value => changes.push(value)})
  try {
    expect(f.code.contentEditable).toBe("plaintext-only")
    f.code.focus()
    f.model.setSelections([{anchor: 3, head: 3}, {anchor: 7, head: 7}], 1)
    expect(changes).toEqual([])
    expect(input(f, "insertText", "!").defaultPrevented).toBe(true)
    expect(f.model.snapshot.value).toBe("one!\ntwo!")
    expect(f.code.textContent).toBe("one!\ntwo!")
    expect(changes).toEqual(["one!\ntwo!"])
    expect(readDocumentTextHighlights(f.document)).toHaveLength(1)
    expect(readDocumentTextHighlights(f.document)[0]?.range.collapsed).toBe(true)
    input(f, "deleteContentBackward")
    expect(f.code.textContent).toBe("one\ntwo")
    input(f, "historyUndo")
    expect(f.code.textContent).toBe("one!\ntwo!")
  } finally { f.dispose() }
  expect(readDocumentTextHighlights(f.document)).toHaveLength(0)
})

test("DOM primary selection mirrors offsets across styled runs and Alt adds independent ranges", async () => {
  const f = mount("const alpha = beta", {languageId: "typescript"})
  try {
    f.code.focus()
    select(f, 6, 11)
    await Promise.resolve()
    expect(f.model.snapshot.selections).toEqual([{anchor: 6, head: 11}])
    f.code.dispatchEvent(new PointerEvent("pointerdown", {button: 0, altKey: true, bubbles: true}))
    select(f, 18, 14)
    await Promise.resolve()
    f.code.dispatchEvent(new PointerEvent("pointerup", {button: 0, altKey: true, bubbles: true}))
    await Promise.resolve()
    expect(f.model.snapshot.selections).toEqual([{anchor: 6, head: 11}, {anchor: 18, head: 14}])
    expect(f.model.snapshot.primary).toBe(1)
    expect(readDocumentTextHighlights(f.document)).toHaveLength(1)
    const transfer = new DataTransfer()
    const copy = new ClipboardEvent("copy", {bubbles: true, cancelable: true, clipboardData: transfer})
    f.code.dispatchEvent(copy)
    expect(copy.defaultPrevented).toBe(true)
    expect(transfer.getData("text/plain")).toBe("alpha\nbeta")
    input(f, "insertFromPaste", "first\nsecond")
    expect(f.code.textContent).toBe("const first = second")
  } finally { f.dispose() }
})

test("selection changes do not rerender TSX, retokenize or replace code text nodes", () => {
  let calls = 0
  registerLanguageHighlighter({id: "editor-selection-no-tokenize", name: "test", tokenize(lines) {
    calls++
    return lines.map(line => line.length ? [{s: 0, e: line.length, c: "k", fg: "#123456"}] : [])
  }})
  const f = mount("alpha\nbeta", {languageId: "editor-selection-no-tokenize"})
  try {
    f.code.focus()
    const stats = f.component.stats()
    const first = f.code.querySelector('[data-line-index="0"]')
    const second = f.code.querySelector('[data-line-index="1"]')
    const text = second?.textContent
    for (let index = 0; index < 20; index++) f.model.setSelections([{anchor: 0, head: index % 5}])
    expect(f.component.stats()).toEqual(stats)
    expect(calls).toBe(1)
    f.model.setSelections([{anchor: 5, head: 5}])
    input(f, "insertText", "!")
    expect(f.code.querySelector('[data-line-index="0"]')).toBe(first)
    expect(f.code.querySelector('[data-line-index="1"]')).toBe(second)
    expect(second?.textContent).toBe(text)
  } finally { f.dispose() }
})

test("additive selection ends when a capturing parent receives pointerup instead of the editor", async () => {
  const f = mount("alpha beta gamma")
  try {
    f.code.focus()
    select(f, 0, 5)
    await Promise.resolve()
    f.code.dispatchEvent(new PointerEvent("pointerdown", {pointerId: 7, button: 0, altKey: true, bubbles: true}))
    select(f, 6, 10)
    await Promise.resolve()
    expect(f.model.snapshot.selections).toEqual([{anchor: 0, head: 5}, {anchor: 6, head: 10}])
    f.container.dispatchEvent(new PointerEvent("pointerup", {pointerId: 7, button: 0, bubbles: true}))
    await Promise.resolve()
    select(f, 11, 16)
    await Promise.resolve()
    expect(f.model.snapshot.selections).toEqual([{anchor: 11, head: 16}])
  } finally { f.dispose() }
})

test("pointerup includes its final selection default before ending the additive gesture", async () => {
  const f = mount("alpha beta gamma")
  try {
    f.code.focus()
    select(f, 0, 5)
    await Promise.resolve()
    f.code.dispatchEvent(new PointerEvent("pointerdown", {pointerId: 7, button: 0, altKey: true, bubbles: true}))
    f.container.dispatchEvent(new PointerEvent("pointerup", {pointerId: 7, button: 0, bubbles: true}))
    select(f, 6, 10)
    await Promise.resolve()
    await Promise.resolve()
    expect(f.model.snapshot.selections).toEqual([{anchor: 0, head: 5}, {anchor: 6, head: 10}])
    select(f, 11, 16)
    await Promise.resolve()
    expect(f.model.snapshot.selections).toEqual([{anchor: 11, head: 16}])
  } finally { f.dispose() }
})

test("another pointer or an old queued completion cannot end a newer editor gesture", async () => {
  const f = mount("alpha beta gamma")
  try {
    f.code.focus()
    select(f, 0, 5)
    await Promise.resolve()
    f.code.dispatchEvent(new PointerEvent("pointerdown", {pointerId: 7, button: 0, altKey: true, bubbles: true}))
    f.container.dispatchEvent(new PointerEvent("pointerup", {pointerId: 8, button: 0, bubbles: true}))
    await Promise.resolve()
    await Promise.resolve()
    select(f, 6, 10)
    await Promise.resolve()
    expect(f.model.snapshot.selections).toEqual([{anchor: 0, head: 5}, {anchor: 6, head: 10}])
    f.container.dispatchEvent(new PointerEvent("pointerup", {pointerId: 7, button: 0, bubbles: true}))
    f.code.dispatchEvent(new PointerEvent("pointerdown", {pointerId: 7, button: 0, altKey: true, bubbles: true}))
    await Promise.resolve()
    await Promise.resolve()
    select(f, 11, 16)
    await Promise.resolve()
    expect(f.model.snapshot.selections).toEqual([{anchor: 0, head: 5}, {anchor: 6, head: 10}, {anchor: 11, head: 16}])
    f.container.dispatchEvent(new PointerEvent("pointercancel", {pointerId: 7, bubbles: true}))
    select(f, 0, 2)
    await Promise.resolve()
    expect(f.model.snapshot.selections).toEqual([{anchor: 0, head: 2}])
    f.component.unmount()
    const snapshot = f.model.snapshot
    f.container.dispatchEvent(new PointerEvent("pointerup", {pointerId: 7, bubbles: true}))
    await Promise.resolve()
    await Promise.resolve()
    expect(f.model.snapshot).toBe(snapshot)
  } finally { f.dispose() }
})

test("composition uses one shared transaction and clipboard command leaves no independent input listener", () => {
  const f = mount("a b")
  try {
    f.code.focus()
    f.model.setSelections([{anchor: 0, head: 1}, {anchor: 2, head: 3}])
    f.code.dispatchEvent(new CompositionEvent("compositionstart", {bubbles: true}))
    f.code.dispatchEvent(new CompositionEvent("compositionupdate", {bubbles: true, data: "日"}))
    input(f, "insertCompositionText", "日本")
    expect(f.code.textContent).toBe("日本 日本")
    f.code.dispatchEvent(new CompositionEvent("compositionend", {bubbles: true, data: "日本語"}))
    input(f, "insertFromComposition", "日本語")
    expect(f.code.textContent).toBe("日本語 日本語")
    f.code.dispatchEvent(new KeyboardEvent("keydown", {bubbles: true, cancelable: true, key: "z", metaKey: true}))
    expect(f.code.textContent).toBe("a b")
    expect(f.model.snapshot.selections).toEqual([{anchor: 0, head: 1}, {anchor: 2, head: 3}])
    f.component.unmount()
    const before = f.model.snapshot
    input(f, "insertText", "must not edit")
    expect(f.model.snapshot).toBe(before)
  } finally { f.dispose() }
})

test("read-only source remains part of cross-block Document selection and owns no caret", async () => {
  const f = mount("code\nvalue", {readOnly: true})
  try {
    const before = f.document.createElement("p")
    before.textContent = "before"
    const after = f.document.createElement("p")
    after.textContent = "after"
    f.container.prepend(before)
    f.container.append(after)
    f.document.getSelection().setBaseAndExtent(before.firstChild!, 2, after.firstChild!, 3)
    await Promise.resolve()
    expect(f.document.getSelection().toString()).toContain("code\nvalue")
    expect(f.document.getSelection().anchorNode).toBe(before.firstChild)
    expect(f.document.getSelection().focusNode).toBe(after.firstChild)
    expect(readDocumentTextHighlights(f.document)).toHaveLength(0)
    expect(input(f, "insertText", "no").defaultPrevented).toBe(false)
    expect(f.code.textContent).toBe("code\nvalue")
  } finally { f.dispose() }
})

test("production Renderer drag updates model and additive carets without component hit testing", async () => {
  const f = mount("alpha\nbeta", {showLineNumbers: false})
  const renderer = createDocumentRenderer({document: f.document, root: f.container, viewport: {width: 600, height: 400}})
  const interaction = createDocumentInteractionController({document: f.document})
  try {
    const frame = renderer.flush()
    const rows = frame.displayList.filter(item => item.kind === "text")
    const first = rows.find(item => item.text === "alpha")!
    const second = rows.find(item => item.text === "beta")!
    interaction.pointerDown(frame, {clientX: first.x + 1, clientY: first.y + 5})
    interaction.pointerMove(frame, {clientX: first.x + 20, clientY: first.y + 5, buttons: 1})
    interaction.pointerUp(frame, {clientX: first.x + 20, clientY: first.y + 5})
    await Promise.resolve()
    expect(f.document.activeElement).toBe(f.code)
    expect(f.model.snapshot.selections[0]?.head).toBeGreaterThan(0)
    interaction.pointerDown(frame, {clientX: second.x + 1, clientY: second.y + 5, altKey: true})
    interaction.pointerUp(frame, {clientX: second.x + 1, clientY: second.y + 5, altKey: true})
    await Promise.resolve()
    expect(f.model.snapshot.selections).toHaveLength(2)
    expect(f.model.snapshot.primary).toBe(1)
  } finally { interaction.dispose(); renderer.dispose(); f.dispose() }
})

test("readonly toggling preserves local text, and external value changes explicitly reset history", () => {
  const changes: string[] = []
  const f = mount("initial", {onChange: value => changes.push(value)})
  try {
    f.code.focus()
    f.model.setSelections([{anchor: 7, head: 7}])
    input(f, "insertText", "!")
    f.component.render(template, {value: "initial", readOnly: true, model: f.model, onChange: value => changes.push(value)})
    expect(f.code.textContent).toBe("initial!")
    expect(f.code.isContentEditable).toBe(false)
    expect(f.code.tabIndex).toBe(-1)
    expect(f.model.snapshot.canUndo).toBe(true)
    f.component.render(template, {value: "replacement", readOnly: false, model: f.model, onChange: value => changes.push(value)})
    expect(f.code.textContent).toBe("replacement")
    expect(f.code.isContentEditable).toBe(true)
    expect(f.code.tabIndex).toBe(0)
    expect(f.model.snapshot.canUndo).toBe(false)
    expect(changes).toEqual(["initial!"])
  } finally { f.dispose() }
})

test("only the changed line renders and supplied tokens never apply to a different local value", () => {
  const value = Array.from({length: 100}, (_value, index) => `line${index}`).join("\n")
  const f = mount(value)
  try {
    f.code.focus()
    f.model.setSelections([{anchor: 0, head: 0}])
    const before = f.component.stats().renders
    input(f, "insertText", "x")
    expect(f.component.stats().renders - before).toBeLessThan(8)
    f.component.render(template, {value: "abc", readOnly: false, model: f.model, tokens: [[{s: 0, e: 3, c: "k", fg: "#ff0000"}]]})
    f.model.setSelections([{anchor: 0, head: 3}])
    expect(() => input(f, "insertText", "z")).not.toThrow()
    expect(f.code.textContent).toBe("z")
  } finally { f.dispose() }
})

test("plain click collapses additional carets even at the unchanged primary position", () => {
  const f = mount("abc")
  try {
    f.code.focus()
    f.model.setSelections([{anchor: 0, head: 0}, {anchor: 3, head: 3}], 1)
    f.code.dispatchEvent(new PointerEvent("pointerdown", {button: 0, bubbles: true}))
    expect(f.model.snapshot.selections).toEqual([{anchor: 3, head: 3}])
    expect(readDocumentTextHighlights(f.document)).toHaveLength(0)
  } finally { f.dispose() }
})

test("controlled props echo IME previews without cancelling composition or losing undo", () => {
  const f = mount("abc")
  const onChange = (value: string) => f.component.render(template, {value, readOnly: false, model: f.model, onChange})
  try {
    f.component.render(template, {value: "abc", readOnly: false, model: f.model, onChange})
    f.code.focus()
    f.model.setSelections([{anchor: 0, head: 3}])
    f.code.dispatchEvent(new CompositionEvent("compositionstart", {bubbles: true}))
    input(f, "insertCompositionText", "日")
    expect(f.model.snapshot.composing).toBe(true)
    input(f, "insertCompositionText", "日本")
    expect(f.model.snapshot.composing).toBe(true)
    f.code.dispatchEvent(new CompositionEvent("compositionend", {bubbles: true, data: "日本語"}))
    expect(f.code.textContent).toBe("日本語")
    expect(f.model.snapshot.composing).toBe(false)
    f.model.undo()
    expect(f.code.textContent).toBe("abc")
  } finally { f.dispose() }
})

test("one Browser clipboard path copies every selection and pastes through production beforeinput", async () => {
  const f = mount("a b")
  const written: string[] = []
  const controller = createDocumentClipboardController(f.document, {access: {
    writeText: async text => { written.push(text) }, readText: async () => "first\nsecond",
  }})
  try {
    f.code.focus()
    f.model.setSelections([{anchor: 0, head: 1}, {anchor: 2, head: 3}], 1)
    expect((await controller.copy()).status).toBe("copied")
    expect(written).toEqual(["a\nb"])
    await controller.paste()
    expect(f.model.snapshot.value).toBe("first second")
    expect(f.code.textContent).toBe("first second")
    expect(f.model.snapshot.selections).toEqual([{anchor: 5, head: 5}, {anchor: 12, head: 12}])
    f.model.undo()
    expect(f.model.snapshot.value).toBe("a b")
    expect(f.model.snapshot.selections).toEqual([{anchor: 0, head: 1}, {anchor: 2, head: 3}])
  } finally { controller.dispose(); f.dispose() }
})

test("generic caret geometry handles code start, LF boundary, empty line and final offset", () => {
  const f = mount("first\n\nlast", {showLineNumbers: false})
  const renderer = createDocumentRenderer({document: f.document, root: f.container, viewport: {width: 600, height: 400}})
  try {
    f.code.focus()
    const frame = renderer.flush()
    const first = frame.boxByNode.get(f.code.querySelector('[data-line-index="0"]')!)!
    for (const [offset, y] of [[0, 0], [6, 16], [7, 32], [11, 32]]) {
      f.model.setSelections([{anchor: offset!, head: offset!}])
      const range = f.document.getSelection().getRangeAt(0)
      const rects = getRangeClientRects(frame, range, {caret: true})
      expect(rects).toHaveLength(1)
      expect(rects[0]?.y).toBe(first.contentY + y!)
      expect(rects[0]?.height).toBe(16)
    }
  } finally { renderer.dispose(); f.dispose() }
})

test("public root ref and delegated line number click retain standard same-Document element identity", () => {
  const refs: Array<globalThis.HTMLElement | null> = []
  const lines: number[] = []
  const f = mount("first\nsecond", {
    ref: element => { refs.push(element) },
    onLineNumberClick: (line, event) => {
      lines.push(line)
      expect(event.type).toBe("click")
    },
  })
  try {
    expect(refs).toHaveLength(1)
    expect(refs[0] as unknown).toBe(f.container.querySelector("section"))
    const second = f.container.querySelector('li[data-line-index="1"]')!
    second.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}))
    expect(lines).toEqual([1])
    f.code.dispatchEvent(new MouseEvent("click", {bubbles: true}))
    expect(lines).toEqual([1])
  } finally { f.dispose() }
  expect(refs.at(-1)).toBeNull()
})
