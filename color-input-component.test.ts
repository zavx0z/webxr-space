import {describe, expect, test} from "bun:test"
import {Event, createDocument, type HTMLButtonElement, type HTMLInputElement} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {ColorInput, colorInputComponentCss, type ColorInputValue} from "./color-input-component.tsx"

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
    const red = host.querySelector('[data-color-channel="r"]')!
    const number = red.querySelector('input[type="number"]') as HTMLInputElement
    const range = red.querySelector('input[type="range"]') as HTMLInputElement
    number.value = "0.4"
    number.dispatchEvent(new Event("input", {bubbles: true}))
    range.valueAsNumber = 0.6
    range.dispatchEvent(new Event("input", {bubbles: true}))
    expect(proposals[0]).toEqual({r: 0.4, g: 0.2, b: 0.3, a: 1})
    expect(proposals[1]!.r).toBeCloseTo(0.6, 12)

    root.render(ColorInput as any, {value: {...value, r: 0.6}, presentation: "expanded"})
    expect(host.querySelector('[data-color-channel="r"]')).toBe(red)
    expect(red.querySelector('input[type="number"]')).toBe(number)
    expect(red.querySelector('input[type="range"]')).toBe(range)
    expect(number.valueAsNumber).toBeCloseTo(0.6, 12)
    expect(host.querySelector("fieldset")!.className).toBe("")
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
      viewport: {width: 340, height: 280},
      styleSheets: [colorInputComponentCss]
    })
    expect(renderer.flush().boxByNode.get(fieldset)?.width).toBe(280)
    expect(colorInputComponentCss).not.toContain(".ui-")
    renderer.dispose()
    root.unmount()
  })
})
