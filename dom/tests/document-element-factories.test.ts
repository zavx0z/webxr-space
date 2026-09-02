import {describe, expect, test} from "bun:test"
import {
  Element,
  HTMLDivElement,
  HTMLElement,
  createDocument,
} from "../src/index.ts"
import type {Document} from "../src/index.ts"

class XRElement extends Element {
  constructor(ownerDocument: Document, localName: string) {
    super(ownerDocument, localName)
  }
}

describe("Document-local element factories", () => {
  test("creates a sibling Element extension only in its owning Document", () => {
    const document = createDocument({
      elementFactories: {
        "xr-space": (ownerDocument, localName) =>
          new XRElement(ownerDocument, localName),
      },
    })

    const element = document.createElement("XR-SPACE")
    const unrelatedDocument = createDocument()
    const genericElement = unrelatedDocument.createElement("xr-space")

    expect(element).toBeInstanceOf(XRElement)
    expect(element).not.toBeInstanceOf(HTMLElement)
    expect(element.ownerDocument).toBe(document)
    expect(element.localName).toBe("xr-space")
    expect(genericElement).toBeInstanceOf(HTMLElement)
    expect(genericElement).not.toBeInstanceOf(XRElement)
  })

  test("exact built-ins take precedence over a same-name extension factory", () => {
    let extensionCalls = 0
    const document = createDocument({
      elementFactories: {
        div: (ownerDocument, localName) => {
          extensionCalls += 1
          return new XRElement(ownerDocument, localName)
        },
      },
    })

    expect(document.createElement("div")).toBeInstanceOf(HTMLDivElement)
    expect(extensionCalls).toBe(0)
  })

  test("rejects an extension Element owned by another Document", () => {
    const otherDocument = createDocument()
    const document = createDocument({
      elementFactories: {
        "xr-space": (_, localName) => new XRElement(otherDocument, localName),
      },
    })

    expect(() => document.createElement("xr-space")).toThrow("another Document")
  })

  test("rejects an extension Element with a different localName", () => {
    const document = createDocument({
      elementFactories: {
        "xr-space": ownerDocument => new XRElement(ownerDocument, "xr-panel"),
      },
    })

    expect(() => document.createElement("xr-space")).toThrow(
      "returned localName xr-panel",
    )
  })

  test("rejects a non-Element factory result", () => {
    const document = createDocument({
      elementFactories: {
        "xr-space": (() => ({})) as never,
      },
    })

    expect(() => document.createElement("xr-space")).toThrow("must return an Element")
  })
})
