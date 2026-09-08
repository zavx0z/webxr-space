import {expect, test} from "bun:test"
import {acquireDocumentAuthorStyleSheetOwner, createDocument} from "@zavx0z/dom"
import {createBrowserLinkedAuthorStyleSheetHostWithSeams} from "../src/linked-author-style-sheet-host.ts"

test("a rejected inactive link does not retain semantic stylesheet ownership", () => {
  const document = createDocument()
  const nativeDocument = {} as globalThis.Document
  const link = {
    ownerDocument: nativeDocument,
    isConnected: false,
    rel: "stylesheet",
    disabled: false,
    type: "text/css",
    media: "",
    addEventListener() {},
    removeEventListener() {},
  } as unknown as HTMLLinkElement
  expect(() => createBrowserLinkedAuthorStyleSheetHostWithSeams({
    canvas: {ownerDocument: nativeDocument} as HTMLCanvasElement,
    document,
    sources: [{id: "theme", link}],
  }, {
    createMutationObserver() { return {observe() {}, disconnect() {}} },
  })).toThrow("not active")
  const replacement = acquireDocumentAuthorStyleSheetOwner(document)
  replacement.release()
})
