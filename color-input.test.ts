import {describe, expect, test} from "bun:test"
import {Event, type HTMLButtonElement, type HTMLInputElement} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {
  ColorInput,
  colorInputHsvaToValue,
  colorInputValueToHsva,
  formatColorInputValue,
  normalizeColorInputValue,
  parseColorInputValue,
  type ColorInputValue
} from "./color-input.tsx"
import {createDocument} from "./test-document.ts"

describe("compiled production ColorInput", () => {
  test("composes Button, TextField and SliderControl with retained channel identities", () => {
    expect(isCompiledTemplate(ColorInput)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const proposals: ColorInputValue[] = []
    const value = {r: 0.1, g: 0.2, b: 0.3, a: 1}
    root.render(ColorInput as any, {
      value,
      presentation: "open",
      onInput: (next: ColorInputValue) => proposals.push(next)
    })
    const valueChannel = host.querySelector('[data-color-channel="v"]')!
    const number = valueChannel.querySelector('input[type="number"]') as HTMLInputElement
    const range = valueChannel.querySelector('input[type="range"]') as HTMLInputElement
    const hsva = colorInputValueToHsva(value)
    number.value = "0.4"
    number.dispatchEvent(new Event("input", {bubbles: true}))
    range.valueAsNumber = 0.6
    range.dispatchEvent(new Event("input", {bubbles: true}))
    expect(proposals[0]).toEqual(colorInputHsvaToValue({...hsva, v: 0.4}))
    expect(proposals[1]).toEqual(colorInputHsvaToValue({...hsva, v: 0.6}))

    root.render(ColorInput as any, {value: {...value, b: 0.6}, presentation: "expanded"})
    expect(host.querySelector('[data-color-channel="v"]')).toBe(valueChannel)
    expect(valueChannel.querySelector('input[type="number"]')).toBe(number)
    expect(valueChannel.querySelector('input[type="range"]')).toBe(range)
    expect(number.valueAsNumber).toBeCloseTo(0.6, 12)
    expect(host.querySelectorAll('[aria-hidden="true"] span')).toHaveLength(32)
    expect(host.querySelector("fieldset")!.className).toBe("")
    root.unmount()
  })

  test("owns immutable RGBA, HSVA and exact RGB(A) hex conversion", () => {
    expect(normalizeColorInputValue({r: 1.2, g: -1, b: 0.5, a: 0.25})).toEqual({r: 1, g: 0, b: 0.5, a: 0.25})
    const exact = {r: 51 / 255, g: 102 / 255, b: 153 / 255, a: 128 / 255}
    expect(formatColorInputValue(exact)).toBe("#33669980")
    expect(formatColorInputValue(exact, false)).toBe("#336699")
    expect(parseColorInputValue("#33669980")).toEqual(exact)
    expect(parseColorInputValue("336699")).toEqual({...exact, a: 1})
    expect(parseColorInputValue("#123")).toBeNull()
    const rgba = Object.freeze({r: 0.2, g: 0.4, b: 0.8, a: 0.35})
    const hsva = colorInputValueToHsva(rgba)
    const roundTrip = colorInputHsvaToValue(hsva)
    expect(Object.isFrozen(hsva)).toBe(true)
    expect(Object.isFrozen(roundTrip)).toBe(true)
    expect(roundTrip.r).toBeCloseTo(rgba.r)
    expect(roundTrip.g).toBeCloseTo(rgba.g)
    expect(roundTrip.b).toBeCloseTo(rgba.b)
    expect(roundTrip.a).toBe(rgba.a)
  })

  test("publishes valid hex edits and ignores incomplete text", () => {
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const proposals: ColorInputValue[] = []
    root.render(ColorInput as any, {
      value: {r: 0, g: 0, b: 0, a: 1},
      presentation: "open",
      onInput: (value: ColorInputValue) => proposals.push(value)
    })
    const hex = host.querySelector('[aria-label="Hex color"]') as HTMLInputElement
    hex.value = "#33669980"
    hex.dispatchEvent(new Event("input", {bubbles: true}))
    hex.value = "#336"
    hex.dispatchEvent(new Event("input", {bubbles: true}))
    expect(proposals).toEqual([parseColorInputValue("#33669980")!])
    root.unmount()
  })

  test("keeps the controlled open proposal and exact compact owner width", () => {
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const opens: boolean[] = []
    root.render(ColorInput as any, {
      value: {r: 1, g: 0, b: 0, a: 1},
      presentation: "closed",
      onOpenChange: (open: boolean) => opens.push(open)
    })
    const fieldset = host.querySelector("fieldset")!
    const trigger = host.querySelector("button") as HTMLButtonElement
    trigger.click()
    expect(opens).toEqual([true])
    expect(trigger.getAttribute("aria-expanded")).toBe("false")
    const renderer = createDocumentRenderer({
      document,
      root: host,
      viewport: {width: 340, height: 280}
    })
    expect(renderer.flush().boxByNode.get(fieldset)?.width).toBe(280)
    renderer.dispose()
    root.unmount()
  })
})
