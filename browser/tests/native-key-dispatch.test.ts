import {expect, test} from "bun:test"
import {createDocument} from "@zavx0z/dom"
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
}

test("[BRW-020] native host dispatches a key only to its exact active semantic proxy target", () => {
  const input = new NativeProxy() as unknown as HTMLInputElement
  const select = new NativeProxy() as unknown as HTMLSelectElement
  const textarea = new NativeProxy() as unknown as HTMLTextAreaElement
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
  host.setActiveDocument(document, "display")
  host.synchronize()

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
