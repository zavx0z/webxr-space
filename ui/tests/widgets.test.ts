import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {createRoot} from "@zavx0z/component"
import {createDocument, InputEvent, KeyboardEvent, MouseEvent, CompositionEvent, readDocumentScrollIntoViewRequests, type HTMLInputElement} from "@zavx0z/dom"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createCodeEditorModel} from "../code-editor-model.ts"
import {createTerminalModel} from "../terminal-model.ts"
import type {CodeEditorHandle} from "../views/code-editor.tsx"
import type {EditorProps} from "../widgets/editor.tsx"
import type {TerminalProps, TerminalHandle} from "../widgets/terminal.tsx"
import type {TreeProps} from "../widgets/tree.tsx"
import type {WindowProps} from "../surfaces/window.tsx"
import {createDocumentClipboardController} from "../../browser/clipboard.ts"
import {textPositionAtOffset} from "@zavx0z/dom/text-position"

const workspace = resolve(import.meta.dir, "../..")
Bun.plugin(createTemplateJsxBunPlugin({cwd: workspace, persistent: true, sourceRoots: [resolve(workspace, "ui")]}))
const {Editor} = await import("../widgets/editor.tsx")
const {Terminal} = await import("../widgets/terminal.tsx")
const {Tree} = await import("../widgets/tree.tsx")
const {Window} = await import("../surfaces/window.tsx")

function fixture() {
  const document = createDocument()
  const root = document.createElement("div")
  root.setAttribute("style", "display:flex;width:720px;height:300px")
  document.append(root)
  const component = createRoot(root)
  return {document, root, component}
}

test("Editor fills its structural parent, owns generic annotations and exposes selection/focus/reveal without consumer DOM patches", async () => {
  const f = fixture()
  const model = createCodeEditorModel({value: "first\nsecond"})
  const handles: Array<CodeEditorHandle | null> = []
  const saves: string[] = []
  const rows: number[] = []
  const props: EditorProps = {title: "Source", value: model.snapshot.value, readOnly: false, model,
    lineDecorations: [{line: 1, lineTone: "warning", markerTone: "info", gutterTone: "error", title: "Generic annotation"}],
    onReady(handle) { handles.push(handle) }, onSave: text => { saves.push(text) }, onLineNumberClick: line => { rows.push(line) }}
  f.component.render(Editor as unknown as CompiledTemplate<EditorProps>, props)
  const renderer = createDocumentRenderer({document: f.document, root: f.root, viewport: {width: 720, height: 300}})
  try {
    const handle = handles.at(-1)!
    handle.focus()
    handle.setSelections([{anchor: 0, head: 5}, {anchor: 6, head: 12}], 1)
    expect(handle.isFocused()).toBe(true)
    expect(handle.getSelection().selections).toHaveLength(2)
    const code = f.root.querySelector("code")!
    code.dispatchEvent(new KeyboardEvent("keydown", {bubbles: true, cancelable: true, key: "s", metaKey: true}))
    expect(saves).toEqual(["first\nsecond"])
    const line = code.querySelector('[data-line-index="1"]')!
    expect(line.getAttribute("data-marker-tone")).toBe("info")
    expect(line.getAttribute("data-line-tone")).toBe("warning")
    const number = f.root.querySelector('li[data-line-index="1"]')!
    expect(number.getAttribute("data-tone")).toBe("error")
    number.dispatchEvent(new MouseEvent("click", {bubbles: true}))
    expect(rows).toEqual([1])
    const frame = renderer.flush()
    expect(frame.boxByNode.get(f.root.querySelector('[data-widget="editor"]')!)?.width).toBe(720)
    expect(frame.boxByNode.get(f.root.querySelector('[data-widget="editor"]')!)?.height).toBe(300)
    expect(frame.boxByNode.get(f.root.querySelector("header")!)?.height).toBe(36)
    expect(frame.boxByNode.get(line)?.height).toBe(18)
    expect(frame.displayList.find(item => item.kind === "text" && item.text === "first")).toMatchObject({fontSize: 13, lineHeight: 18})
    handle.scrollToLine(1, {block: "center"})
    expect(readDocumentScrollIntoViewRequests(f.document).at(-1)?.target).toBe(line)
    f.component.render(Editor as unknown as CompiledTemplate<EditorProps>, {...props, readOnly: true})
    handle.setSelections([{anchor: 10, head: 2}])
    expect(f.document.getSelection().toString()).toBe("rst\nseco")
    expect(handle.getSelection().selections).toEqual([{anchor: 10, head: 2}])
    await Promise.resolve()
  } finally { renderer.dispose(); f.component.unmount() }
  expect(handles.at(-1)).toBeNull()
})

test("Editor line markers emit a real border while marked and unmarked text remain aligned", () => {
  const f = fixture()
  f.root.setAttribute("style", "display:flex;width:720px;height:300px;--state-info:#3366ff")
  f.component.render(Editor as unknown as CompiledTemplate<EditorProps>, {
    title: "Source", value: "same\nsame", readOnly: true,
    lineDecorations: [{line: 0, markerTone: "info"}],
  })
  const renderer = createDocumentRenderer({document: f.document, root: f.root, viewport: {width: 720, height: 300}})
  try {
    const lines = [...f.root.querySelector("code")!.querySelectorAll("[data-line-index]")]
    const frame = renderer.flush()
    const marker = frame.displayList.find(item => item.kind === "rect" && item.node === lines[0])
    expect(marker?.kind).toBe("rect")
    if (marker?.kind !== "rect") throw new Error("Missing line marker paint")
    expect(marker.border.widths.left).toBe(2)
    expect(marker.border.colors.left).toBe("#3366ff")
    expect(frame.displayList.some(item => item.kind === "rect" && item.node === lines[1])).toBe(false)
    const text = frame.displayList.filter(item => item.kind === "text" && item.text === "same")
    expect(text).toHaveLength(2)
    expect(text[0]!.x).toBe(text[1]!.x)
  } finally { renderer.dispose(); f.component.unmount() }
})

test("Terminal stream input resets controlled field, sends IME once, retains output rows and uses platform selection", () => {
  const f = fixture()
  const model = createTerminalModel({maxLines: 3})
  model.write("plain\r\n\x1b[31mred\x1b[0m")
  let handle: TerminalHandle | null = null
  const data: Array<[string, string]> = []
  f.component.render(Terminal as unknown as CompiledTemplate<TerminalProps>, {title: "Output", model, input: "", inputMode: "stream",
    onData: (value, source) => { data.push([value, source]) }, onReady: value => { handle = value }})
  try {
    const input = f.root.querySelector("input") as HTMLInputElement
    const first = f.root.querySelector('[data-terminal-line="0"]')
    expect(f.root.querySelector('[role="log"]')?.textContent).toBe("plain\nred")
    for (const value of ["a", "b"]) {
      input.value = value
      input.dispatchEvent(new InputEvent("input", {bubbles: true, data: value, inputType: "insertText"}))
      expect(input.value).toBe("")
    }
    input.dispatchEvent(new CompositionEvent("compositionstart", {bubbles: true}))
    input.value = "日"
    input.dispatchEvent(new InputEvent("input", {bubbles: true, data: "日", inputType: "insertCompositionText", isComposing: true}))
    input.dispatchEvent(new CompositionEvent("compositionend", {bubbles: true, data: "日本"}))
    input.value = "日本"
    input.dispatchEvent(new InputEvent("input", {bubbles: true, data: "日本", inputType: "insertText"}))
    expect(input.value).toBe("")
    input.dispatchEvent(new KeyboardEvent("keydown", {bubbles: true, cancelable: true, key: "Enter"}))
    expect(data).toEqual([["a", "keyboard"], ["b", "keyboard"], ["日本", "keyboard"], ["\r", "keyboard"]])
    model.write("!")
    expect(f.root.querySelector('[data-terminal-line="0"]')).toBe(first)
    expect(f.root.querySelector('[role="log"]')?.textContent).toBe("plain\nred!")
    expect(readDocumentScrollIntoViewRequests(f.document).at(-1)?.block).toBe("end")
    const ready = handle as TerminalHandle | null
    ready?.focus()
    expect(ready?.isFocused()).toBe(true)
  } finally { f.component.unmount() }
  expect(handle).toBeNull()
})

test("Terminal handle projects directional ANSI text and cross-block selections without changing the Document range", () => {
  const f = fixture()
  const model = createTerminalModel({maxLines: 3})
  model.write("a\x1b[31mbc\x1b[0m\r\ndef")
  let ready: TerminalHandle | null = null
  f.component.render(Terminal as unknown as CompiledTemplate<TerminalProps>, {
    title: "Output", model, input: "", showInput: false, followOutput: false,
    onReady: handle => { ready = handle },
  })
  try {
    const handle = ready as TerminalHandle | null
    const log = f.root.querySelector('[role="log"]')!
    const start = textPositionAtOffset(log, 1)
    const end = textPositionAtOffset(log, 6)
    const selection = f.document.getSelection()
    selection.setBaseAndExtent(end.node, end.offset, start.node, start.offset)
    const range = selection.getRangeAt(0)
    expect(handle?.getSelection()).toEqual({
      anchor: {line: 1, col: 2}, focus: {line: 0, col: 1},
      start: {line: 0, col: 1}, end: {line: 1, col: 2}, text: "bc\nde",
    })
    expect(selection.getRangeAt(0)).toBe(range)
    expect(f.root.querySelector("input")?.closest("[hidden]")).not.toBeNull()
    expect(readDocumentScrollIntoViewRequests(f.document)).toHaveLength(0)
    const before = f.document.createElement("p")
    before.textContent = "before"
    const after = f.document.createElement("p")
    after.textContent = "after"
    f.root.insertBefore(before, f.root.firstChild)
    f.root.append(after)
    selection.setBaseAndExtent(before.firstChild!, 2, after.firstChild!, 3)
    const cross = selection.getRangeAt(0)
    expect(handle?.getSelection()?.text).toBe("abc\ndef")
    expect(selection.getRangeAt(0)).toBe(cross)
    selection.setBaseAndExtent(after.firstChild!, 0, after.firstChild!, 2)
    expect(handle?.getSelection()).toBeNull()
    model.write("\r\nlast\r\nnew")
    const last = textPositionAtOffset(log, 5)
    selection.setBaseAndExtent(log, 0, last.node, last.offset)
    expect(handle?.getSelection()?.text).toBe("def\nl")
  } finally { f.component.unmount() }
  expect(ready).toBeNull()
})

test("Tree controls disclosure, lazy expansion, multiple selection and keyboard without filesystem semantics", () => {
  const f = fixture()
  const selections: string[][] = []
  const expanded: string[][] = []
  const activated: string[] = []
  let props: TreeProps = {title: "Hierarchy", items: [{id: "group", label: "Group", children: [
    {id: "a", label: "First", muted: true}, {id: "b", label: "Second"},
  ]}, {id: "lazy", label: "Lazy object", expandable: true}], expandedKeys: [], selectedKeys: [], selectionMode: "multiple",
    onExpandedChange(keys) { expanded.push([...keys]); props = {...props, expandedKeys: keys}; render() },
    onSelectionChange(keys) { selections.push([...keys]); props = {...props, selectedKeys: keys}; render() },
    onActivate(id) { activated.push(id) },
  }
  const render = () => f.component.render(Tree as unknown as CompiledTemplate<TreeProps>, props)
  render()
  try {
    const group = f.root.querySelector('[data-tree-id="group"]')!
    group.querySelector("button")!.dispatchEvent(new MouseEvent("click", {bubbles: true}))
    expect(expanded).toEqual([["group"]])
    const first = f.root.querySelector('[data-tree-id="a"]')!
    const second = f.root.querySelector('[data-tree-id="b"]')!
    first.querySelector('[data-tree-row]')!.dispatchEvent(new MouseEvent("click", {bubbles: true}))
    second.querySelector('[data-tree-row]')!.dispatchEvent(new MouseEvent("click", {bubbles: true, metaKey: true}))
    expect(selections.at(-1)).toEqual(["a", "b"])
    expect(f.root.querySelector('[data-tree-id="a"]')).toBe(first)
    expect(first.querySelector('[data-tree-row]')?.getAttribute("data-muted")).toBe("true")
    second.dispatchEvent(new KeyboardEvent("keydown", {bubbles: true, cancelable: true, key: "Enter"}))
    expect(activated).toEqual(["b"])
    f.root.querySelector('[data-tree-id="lazy"]')!.querySelector("button")!.dispatchEvent(new MouseEvent("click", {bubbles: true}))
    expect(expanded.at(-1)).toEqual(["group", "lazy"])
    expect(f.root.querySelector('[data-tree-id="lazy"]')?.getAttribute("aria-expanded")).toBe("true")
  } finally { f.component.unmount() }
})

test("Window fill is structural while floating defaults remain unchanged", () => {
  const f = fixture()
  const renderer = createDocumentRenderer({document: f.document, root: f.root, viewport: {width: 720, height: 300}})
  const props: WindowProps = {title: "Window", subtitle: "", active: true, minimized: false, actions: [], children: null}
  try {
    f.component.render(Window as unknown as CompiledTemplate<WindowProps>, props)
    const owner = f.root.firstElementChild!
    expect(renderer.flush().boxByNode.get(owner)?.width).toBe(320)
    f.component.render(Window as unknown as CompiledTemplate<WindowProps>, {...props, layout: "fill"})
    expect(f.root.firstElementChild).toBe(owner)
    expect(renderer.flush().boxByNode.get(owner)?.width).toBe(720)
    expect(renderer.flush().boxByNode.get(owner)?.height).toBe(300)
  } finally { renderer.dispose(); f.component.unmount() }
})

test("Terminal accepts a real paste equal to an IME commit instead of treating it as a duplicate commit", async () => {
  const f = fixture()
  const received: Array<[string, string]> = []
  f.component.render(Terminal as unknown as CompiledTemplate<TerminalProps>, {title: "Output", input: "", inputMode: "stream",
    onData: (text, source) => { received.push([text, source]) }})
  const controller = createDocumentClipboardController(f.document, {access: {
    readText: async () => "日本", writeText: async () => {},
  }})
  try {
    const input = f.root.querySelector("input") as HTMLInputElement
    input.focus()
    input.dispatchEvent(new CompositionEvent("compositionstart", {bubbles: true}))
    input.value = "日本"
    input.dispatchEvent(new InputEvent("input", {bubbles: true, data: "日本", inputType: "insertCompositionText", isComposing: true}))
    input.dispatchEvent(new CompositionEvent("compositionend", {bubbles: true, data: "日本"}))
    expect(await controller.paste()).toEqual({status: "pasted"})
    expect(received).toEqual([["日本", "keyboard"], ["日本", "paste"]])
    expect(input.value).toBe("")
  } finally { controller.dispose(); f.component.unmount() }
})
