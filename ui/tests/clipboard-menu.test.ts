import {expect, test} from "bun:test"
import {resolve} from "node:path"
import {createRoot} from "@zavx0z/component"
import {createDocument, MouseEvent, KeyboardEvent, HTMLElement, getPopoverVisibilityState} from "@zavx0z/dom"
import {createTemplateJsxBunPlugin} from "@zavx0z/template/bun"
import type {CompiledTemplate} from "@zavx0z/template/compiled"
import {createDocumentClipboardController} from "../../browser/clipboard.ts"

const workspace = resolve(import.meta.dir, "../..")
Bun.plugin(createTemplateJsxBunPlugin({cwd: workspace, persistent: true, sourceRoots: [resolve(workspace, "ui")]}))
const {ClipboardMenu} = await import("../menus/clipboard-menu.tsx")

test("global clipboard menu uses existing commands and retains the original selection target", async () => {
  const document = createDocument()
  const root = document.createElement("div")
  const input = document.createElement("textarea")
  const host = document.createElement("div")
  root.append(input, host)
  document.append(root)
  input.value = "alpha beta"
  input.setSelectionRange(0, 5)
  input.focus()
  const written: string[] = []
  const commands = createDocumentClipboardController(document, {access: {
    readText: async () => "inserted", writeText: async text => { written.push(text) },
  }})
  const component = createRoot(host)
  component.render(ClipboardMenu as unknown as CompiledTemplate<{controller: typeof commands}>, {controller: commands})
  try {
    const menu = host.querySelector('[role="menu"]')!
    if (!(menu instanceof HTMLElement)) throw new Error("Expected an HTML menu")
    expect(menu[getPopoverVisibilityState]()).toBe("hidden")
    expect(commands.openContextMenu(input, {x: 20, y: 30})).toBe(true)
    component.flush()
    expect(menu[getPopoverVisibilityState]()).toBe("showing")
    const buttons = host.querySelectorAll('[role="menuitem"]')
    expect([...buttons].map(button => button.textContent)).toEqual(["Копировать⌘/Ctrl+C", "Вставить⌘/Ctrl+V"])
    buttons[0]!.dispatchEvent(new MouseEvent("click", {bubbles: true}))
    await Promise.resolve()
    component.flush()
    expect(written).toEqual(["alpha"])
    expect(commands.getSnapshot().open).toBe(false)
    expect(input.value).toBe("alpha beta")
    commands.openContextMenu(input, {x: 20, y: 30})
    component.flush()
    buttons[1]!.dispatchEvent(new MouseEvent("click", {bubbles: true}))
    await Promise.resolve()
    await Promise.resolve()
    component.flush()
    expect(input.value).toBe("inserted beta")
    expect(document.activeElement).toBe(input)
    commands.openContextMenu(input, {x: 20, y: 30})
    component.flush()
    menu.dispatchEvent(new KeyboardEvent("keydown", {bubbles: true, cancelable: true, key: "Escape"}))
    component.flush()
    expect(commands.getSnapshot().open).toBe(false)
  } finally {
    component.unmount()
    commands.dispose()
  }
}, 30_000)
