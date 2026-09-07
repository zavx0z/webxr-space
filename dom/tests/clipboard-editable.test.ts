import {expect, test} from "bun:test"
import {ClipboardEvent, DataTransfer, InputEvent, createDocument, sealDataTransfer} from "@zavx0z/dom"

test("clipboard events carry shared text/plain and text/html, bubble and can cancel the default", () => {
  const document = createDocument()
  const root = document.createElement("article")
  document.appendChild(root)
  const transfer = new DataTransfer()
  transfer.setData("TEXT", "selected")
  transfer.setData("text/html", "<p>selected</p>")
  expect(transfer.types).toEqual(["text/plain", "text/html"])
  expect(transfer.getData("text")).toBe("selected")
  let calls = 0
  document.addEventListener("copy", event => {
    const clipboard = event as ClipboardEvent
    clipboard.clipboardData?.setData("text/plain", "custom")
    clipboard.preventDefault()
    calls += 1
  })
  const event = new ClipboardEvent("copy", {bubbles: true, cancelable: true, clipboardData: transfer})
  expect(root.dispatchEvent(event)).toBe(false)
  expect(calls).toBe(1)
  expect(transfer.getData("text/plain")).toBe("custom")
  expect(new ClipboardEvent("copy").clipboardData).toBeNull()
})

test("paste data is read-only when Browser seals it and InputEvent receives the same payload", () => {
  const transfer = new DataTransfer()
  transfer.setData("text/plain", "paste")
  transfer.setData("URL", "# comment\nhttps://example.test/one\nhttps://example.test/two")
  expect(transfer.getData("url")).toBe("https://example.test/one")
  sealDataTransfer(transfer)
  transfer.setData("text/plain", "changed")
  transfer.clearData()
  expect(transfer.getData("text/plain")).toBe("paste")
  const event = new InputEvent("beforeinput", {inputType: "insertFromPaste", dataTransfer: transfer})
  expect(event.dataTransfer).toBe(transfer)
})

test("contentEditable reflects valid states, resolves inheritance and focuses the editing host", () => {
  const document = createDocument()
  const root = document.createElement("article")
  const host = document.createElement("div")
  const child = document.createElement("span")
  document.appendChild(root)
  root.appendChild(host)
  host.appendChild(child)
  expect(host.contentEditable).toBe("inherit")
  expect(child.isContentEditable).toBe(false)
  host.contentEditable = "plaintext-only"
  expect(child.isContentEditable).toBe(true)
  expect(host.tabIndex).toBe(0)
  host.focus()
  expect(document.activeElement).toBe(host)
  child.contentEditable = "false"
  expect(child.isContentEditable).toBe(false)
  child.contentEditable = "inherit"
  expect(child.isContentEditable).toBe(true)
  expect(child.hasAttribute("contenteditable")).toBe(false)
  child.setAttribute("contenteditable", "")
  expect(child.contentEditable).toBe("true")
  expect(() => host.contentEditable = "invalid").toThrow()
})
