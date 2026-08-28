import {describe, expect, test} from "bun:test"
import {Event, createDocument, type HTMLInputElement, type HTMLSelectElement} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {EnumInput, enumInputComponentCss} from "./enum-input-component.tsx"
import {ProgressCheckbox, progressCheckboxComponentCss} from "./progress-checkbox-component.tsx"
import {SliderControl, sliderControlComponentCss} from "./slider-control-component.tsx"

describe("compiled select, range and progress controls", () => {
  test("retains keyed options and proposes the standard select value", () => {
    expect(isCompiledTemplate(EnumInput)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const options = [
      {key: "a", value: "a", label: "Alpha"},
      {key: "b", value: "b", label: "Beta"}
    ]
    const proposals: string[] = []
    root.render(EnumInput as any, {value: "b", options, onChange: (value: string) => proposals.push(value)})
    const select = host.querySelector("select") as HTMLSelectElement
    const alpha = select.querySelectorAll("option")[0]!
    const beta = select.querySelectorAll("option")[1]!
    expect(select.value).toBe("b")
    select.value = "a"
    select.dispatchEvent(new Event("change", {bubbles: true}))
    expect(proposals).toEqual(["a"])

    root.render(EnumInput as any, {value: "a", options: [options[1]!, options[0]!]})
    expect(host.querySelector("select")).toBe(select)
    expect(select.querySelectorAll("option")[0]).toBe(beta)
    expect(select.querySelectorAll("option")[1]).toBe(alpha)
    expect(select.value).toBe("a")
    expect(select.className).toBe("")
    root.unmount()
  })

  test("keeps range live properties and native pseudo geometry", () => {
    expect(isCompiledTemplate(SliderControl)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const proposals: number[] = []
    root.render(SliderControl as any, {
      value: 0.5,
      min: 0,
      max: 1,
      step: 0.1,
      onInput: (value: number) => proposals.push(value)
    })
    const input = host.querySelector("input") as HTMLInputElement
    expect(input.valueAsNumber).toBeCloseTo(0.5, 12)
    input.valueAsNumber = 0.7
    input.dispatchEvent(new Event("input", {bubbles: true}))
    expect(proposals).toHaveLength(1)
    expect(proposals[0]).toBeCloseTo(0.7, 12)
    const renderer = createDocumentRenderer({
      document,
      root: host,
      viewport: {width: 240, height: 80},
      styleSheets: [sliderControlComponentCss]
    })
    expect(renderer.flush().boxByNode.get(input)).toMatchObject({width: 180, height: 28})
    expect(input.className).toBe("")
    expect(sliderControlComponentCss).toContain(":active")
    renderer.dispose()
    root.unmount()
  })

  test("implements progress state by composing Checkbox", () => {
    expect(isCompiledTemplate(ProgressCheckbox)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    root.render(ProgressCheckbox as any, {checked: false, indeterminate: true})
    const input = host.querySelector("input") as HTMLInputElement
    expect(input.indeterminate).toBe(true)
    expect(input.getAttribute("aria-checked")).toBe("mixed")
    expect(input.className).toBe("")
    expect(root.stats().mounts).toBe(2)
    expect(progressCheckboxComponentCss).not.toContain(".ui-")
    root.unmount()
  })

  test("publishes class-free sheets", () => {
    expect(enumInputComponentCss).not.toContain(".ui-")
    expect(sliderControlComponentCss).not.toContain(".ui-")
  })
})
