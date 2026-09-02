import {describe, expect, test} from "bun:test"
import {decodeCompiledStyleText, encodeCompiledStyleText} from "./style-codec.ts"

describe("compiled style text codec", () => {
  test("round-trips repeated CSS tokens and every reserved transport character", () => {
    const reserved = Array.from({length: 128}, (_, index) => String.fromCharCode(0x100 + index)).join("")
    const repeatedRules = [
      "[data-z-owner]{box-sizing:border-box;display:flex;width:20px;height:20px}",
      "[data-z-owner]:hover{background:var(--surface-background);color:var(--surface-content)}",
    ].join("\n")
    const cssText = [
      Array.from({length: 4}, () => repeatedRules).join("\n"),
      reserved
    ].join("\n")
    const encoded = encodeCompiledStyleText(cssText)

    expect(decodeCompiledStyleText(encoded)).toBe(cssText)
    expect(encoded.length).toBeLessThan(cssText.length)
  })

  test("fails a truncated escape transport closed", () => {
    expect(() => decodeCompiledStyleText(String.fromCharCode(0x17f))).toThrow("escape token")
  })
})
