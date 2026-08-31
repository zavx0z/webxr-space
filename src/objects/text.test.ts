import {describe, expect, test} from "bun:test"
import {TextMaterial} from "../materials/text-material"
import type {TrueTypeFont} from "../text/true-type-font"
import {Text} from "./text"

describe("Text font-owned geometry", () => {
  test("keeps the cover through the glyph advance cell instead of ending at ink xMax", () => {
    const text = new Text("A", fakeFont({glyph: 101, xMax: 500, advanceWidth: 800}), 100, new TextMaterial())
    text.letterSpacing = 0
    text.updateGeometry()

    expect(maxX(text.coverGeometry.attributes.position?.array)).toBe(80)
  })

  test("keys cached glyph geometry by exact font identity as well as glyph id", () => {
    const first = new Text("A", fakeFont({glyph: 102, xMax: 400, advanceWidth: 800}), 100, new TextMaterial())
    const second = new Text("A", fakeFont({glyph: 102, xMax: 700, advanceWidth: 800}), 100, new TextMaterial())

    expect(maxX(first.stencilGeometry.attributes.position?.array)).toBe(40)
    expect(maxX(second.stencilGeometry.attributes.position?.array)).toBe(70)
  })
})

function fakeFont(values: Readonly<{
  glyph: number
  xMax: number
  advanceWidth: number
}>): TrueTypeFont {
  return {
    unitsPerEm: 1_000,
    ascent: 800,
    descent: 200,
    lineGap: 0,
    mapCharToGlyph: () => values.glyph,
    getGlyphOutline: () => ({
      points: new Float32Array([
        0, 0,
        values.xMax, 0,
        values.xMax, 700,
        0, 700,
      ]),
      onCurve: new Uint8Array([1, 1, 1, 1]),
      contours: new Uint16Array([3]),
    }),
    getHMetric: () => ({advanceWidth: values.advanceWidth, lsb: 0}),
  } as unknown as TrueTypeFont
}

function maxX(values: ArrayLike<number> | undefined): number {
  if (values === undefined) throw new Error("Expected position geometry")
  let maximum = -Infinity
  for (let index = 0; index < values.length; index += 3) {
    maximum = Math.max(maximum, values[index] ?? -Infinity)
  }
  return maximum
}
