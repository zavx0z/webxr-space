import {expect, test} from "bun:test"
import {createDocument, HTMLElement, getPopoverVisibilityState} from "@zavx0z/dom"
import {createDocumentInteractionController, createDocumentInteractionState, createDocumentRenderer, hitTestProjection, readRenderedSelectionText} from "../src/index.ts"

function fixture() {
  const document = createDocument()
  const hud = document.createElement("main") as HTMLElement
  hud.setAttribute("style", "display:block;width:640px;height:400px;background:transparent;font-size:14px;line-height:20px")
  const editor = document.createElement("section") as HTMLElement
  editor.contentEditable = "plaintext-only"
  editor.setAttribute("style", "position:absolute;left:80px;top:40px;width:480px;height:320px;background:#222;overflow:auto;white-space:pre")
  editor.textContent = `original selection\n${Array.from({length: 14}, (_, index) => `line ${index} remains selectable under the menu`).join("\n")}`
  const menu = document.createElement("div") as HTMLElement
  menu.popover = "auto"
  menu.setAttribute("role", "menu")
  menu.setAttribute("style", "position:fixed;left:180px;top:140px;display:flex;flex-direction:column;width:200px;padding:4px;border:1px solid #777;border-radius:4px;background:#3a3a3a;user-select:none")
  const buttons = ["Копировать", "Вставить"].map(label => {
    const button = document.createElement("button") as HTMLElement
    button.setAttribute("role", "menuitem")
    button.setAttribute("tabindex", "-1")
    button.setAttribute("style", "display:flex;justify-content:space-between;align-items:center;box-sizing:border-box;width:100%;height:26px;padding:3px 8px;background:transparent;user-select:none")
    const caption = document.createElement("span")
    const shortcut = document.createElement("span")
    caption.textContent = label
    shortcut.textContent = "⌘C"
    button.append(caption, shortcut)
    menu.append(button)
    return button
  })
  hud.append(editor, menu)
  document.append(hud)
  const interactionState = createDocumentInteractionState(document)
  const renderer = createDocumentRenderer({document, root: hud, viewport: {width: 640, height: 400}, interactionState,
    styleSheets: ['button:hover { background: #456 } button:focus { background: #456 }']})
  const interaction = createDocumentInteractionController({document, interactionState, hitTest: hitTestProjection})
  return {document, hud, editor, menu, buttons, renderer, interaction, dispose() {
    interaction.dispose()
    renderer.dispose()
  }}
}

test("popover menu paint hit and inspector boxes agree without collapsing selected text beneath", () => {
  const f = fixture()
  let copies = 0
  try {
    f.editor.focus()
    f.document.getSelection().setBaseAndExtent(f.editor.firstChild!, 0, f.editor.firstChild!, 8)
    const selected = f.document.getSelection().getRangeAt(0)
    f.menu.showPopover()
    let frame = f.renderer.flush()
    const button = f.buttons[0]!
    button.addEventListener("click", () => {
      copies++
      f.menu.hidePopover()
    })
    for (let index = 0; index < 2; index++) {
      const box = frame.boxByNode.get(button)!
      const hit = frame.hits.get(button)!
      expect([hit.x, hit.y, hit.width, hit.height]).toEqual([box.x, box.y, box.width, box.height])
      const x = (hit.x + hit.width / 2) * hit.transform.scaleX + hit.transform.translateX
      const y = (hit.y + hit.height / 2) * hit.transform.scaleY + hit.transform.translateY
      const target = hitTestProjection(frame, x, y)?.node
      expect(target === button || target !== undefined && button.contains(target)).toBe(true)
      if (index === 0) {
        f.interaction.pointerMove(frame, {clientX: x, clientY: y})
        frame = f.renderer.flush()
      } else {
        f.interaction.pointerDown(frame, {clientX: x, clientY: y, buttons: 1})
        expect(f.document.getSelection().getRangeAt(0)).toBe(selected)
        expect(f.menu[getPopoverVisibilityState]()).toBe("showing")
        frame = f.renderer.flush()
        f.interaction.pointerUp(frame, {clientX: x, clientY: y, buttons: 0})
      }
    }
    expect(copies).toBe(1)
    expect(f.document.getSelection().getRangeAt(0)).toBe(selected)
    expect(readRenderedSelectionText(f.renderer.flush())).toBe("original")
  } finally {f.dispose()}
})

test("top-layer authored fixed insets override the default centered position consistently", () => {
  const f = fixture()
  try {
    f.menu.showPopover()
    const frame = f.renderer.flush()
    const box = frame.boxByNode.get(f.menu)!
    expect([box.x, box.y]).toEqual([180, 140])
    const paint = frame.displayList.find(item => item.node === f.menu && item.kind === "rect")!
    const hit = frame.hits.get(f.menu)!
    expect([paint.x, paint.y]).toEqual([box.x, box.y])
    expect([hit.x, hit.y]).toEqual([box.x, box.y])
  } finally {f.dispose()}
})
