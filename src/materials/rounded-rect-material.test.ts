import {describe, expect, test} from "bun:test"
import {Color} from "../math/color"
import {RoundedRectMaterial} from "./rounded-rect-material"

describe("RoundedRectMaterial shadow parameters", () => {
  test("distinguishes omitted default-white fill from explicit transparent null", () => {
    const omitted = new RoundedRectMaterial({width: 2, height: 1, radius: 0.2})
    const transparent = new RoundedRectMaterial({width: 2, height: 1, radius: 0.2, fill: null})
    const explicit = new RoundedRectMaterial({width: 2, height: 1, radius: 0.2, fill: 0x336699})

    expect(omitted.fill).toEqual(new Color(1, 1, 1, 1))
    expect(transparent.fill).toEqual(new Color(1, 1, 1, 0))
    expect(explicit.fill).toEqual(new Color(0x33 / 255, 0x66 / 255, 0x99 / 255, 1))
  })

  test("keeps ordinary rounded rectangles on zero shadow defaults", () => {
    const material = new RoundedRectMaterial({
      width: 2,
      height: 1,
      radius: {tl: 0.1, tr: 0.2, br: 0.3, bl: 0.4},
      borderWidth: 0.05,
      opacity: 0.75,
    })

    expect(material.width).toBe(2)
    expect(material.height).toBe(1)
    expect(material.radii).toEqual([0.1, 0.2, 0.3, 0.4])
    expect(material.borderWidth).toBe(0.05)
    expect(material.borderWidths).toEqual([0.05, 0.05, 0.05, 0.05])
    expect(material.opacity).toBe(0.75)
    expect(material.shadowBlur).toBe(0)
    expect(material.shadowSpread).toBe(0)
  })

  test("stores finite non-negative local shadow dimensions", () => {
    const material = new RoundedRectMaterial({
      width: 2,
      height: 1,
      radius: 0.2,
      shadowBlur: 0.25,
      shadowSpread: 0.125,
    })
    const invalid = new RoundedRectMaterial({
      width: 2,
      height: 1,
      radius: 0.2,
      shadowBlur: Number.NaN,
      shadowSpread: Number.POSITIVE_INFINITY,
    })
    const negative = new RoundedRectMaterial({
      width: 2,
      height: 1,
      radius: 0.2,
      shadowBlur: -1,
      shadowSpread: -2,
    })

    expect(material.shadowBlur).toBe(0.25)
    expect(material.shadowSpread).toBe(0.125)
    expect(invalid.shadowBlur).toBe(0)
    expect(invalid.shadowSpread).toBe(0)
    expect(negative.shadowBlur).toBe(0)
    expect(negative.shadowSpread).toBe(0)
  })

  test("keeps scalar borderWidth as a writable uniform shorthand", () => {
    const material = new RoundedRectMaterial({
      width: 2,
      height: 1,
      radius: 0.2,
      borderWidth: 0.125,
    })

    expect(material.borderWidths).toEqual([0.125, 0.125, 0.125, 0.125])
    expect(material.borderWidth).toBe(0.125)
    material.borderWidth = 0.25
    expect(material.borderWidths).toEqual([0.25, 0.25, 0.25, 0.25])
    material.borderWidth = -1
    expect(material.borderWidths).toEqual([0, 0, 0, 0])
  })

  test("owns canonical top/right/bottom/left widths for zero-radius rectangles", () => {
    const source: [number, number, number, number] = [1, 2, 3, 4]
    const material = new RoundedRectMaterial({
      width: 4,
      height: 2,
      radius: 0,
      borderWidths: source,
    })

    source[0] = 9
    expect(material.borderWidths).toEqual([1, 2, 3, 4])
    expect(Number.isNaN(material.borderWidth)).toBeTrue()
    material.borderWidths = [4, 3, 2, 1]
    expect(material.borderWidths).toEqual([4, 3, 2, 1])
    material.borderWidth = 0.5
    expect(material.borderWidths).toEqual([0.5, 0.5, 0.5, 0.5])
    expect(material.borderWidth).toBe(0.5)
  })

  test("fails closed for non-uniform rounded borders and malformed tuples", () => {
    expect(() => new RoundedRectMaterial({
      width: 4,
      height: 2,
      radius: 0.25,
      borderWidths: [1, 2, 3, 4],
    })).toThrow("require zero corner radii")

    const rounded = new RoundedRectMaterial({width: 4, height: 2, radius: 0.25})
    expect(() => {
      rounded.borderWidths = [1, 2, 3, 4]
    }).toThrow("require zero corner radii")
    expect(rounded.borderWidths).toEqual([0, 0, 0, 0])
    expect(() => {
      rounded.borderWidths = [1, Number.NaN, 1, 1]
    }).toThrow("finite and non-negative")
    expect(() => {
      rounded.borderWidths = [1, 2] as unknown as [number, number, number, number]
    }).toThrow("top/right/bottom/left")
  })
})
