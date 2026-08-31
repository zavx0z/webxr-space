import {describe, expect, test} from "bun:test"
import {
  DEFAULT_FONT_META_NAME,
  documentDefaultFontUrl,
  loadDocumentDefaultFont,
  loadSharedFont,
  type DefaultFontDocument,
} from "./default-font"

const fontUrl = new URL("../../static/fonts/inter-regular.ttf", import.meta.url).href

describe("shared default font", () => {
  test("resolves one document declaration without fetching during resolution", () => {
    let queries = 0
    const documentRef = fontDocument("./static/fonts/inter-regular.ttf", () => queries++)
    expect(documentDefaultFontUrl(documentRef)).toBe(fontUrl)
    expect(queries).toBe(1)
  })

  test("deduplicates direct and document-owned loads by absolute URL", async () => {
    const documentRef = fontDocument(fontUrl)
    const direct = loadSharedFont(fontUrl)
    const declared = loadDocumentDefaultFont(documentRef)
    expect(declared).toBe(direct)
    expect(await declared).toBe(await direct)
  })

  test("rejects a missing declaration without starting a fallback request", () => {
    const documentRef = fontDocument(null)
    expect(() => documentDefaultFontUrl(documentRef)).toThrow(DEFAULT_FONT_META_NAME)
  })
})

function fontDocument(content: string | null, onQuery: () => void = () => {}): DefaultFontDocument {
  return {
    baseURI: new URL("../../", fontUrl).href,
    querySelector(selector) {
      onQuery()
      expect(selector).toBe(`meta[name="${DEFAULT_FONT_META_NAME}"]`)
      return content === null ? null : {getAttribute: (name) => name === "content" ? content : null}
    },
  }
}
