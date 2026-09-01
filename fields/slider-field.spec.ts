import {describe, expect, test} from "bun:test"
import {Event, type HTMLInputElement} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {SliderFieldFixture} from "./slider-field.fixture.tsx"
import {SliderField} from "./slider-field.tsx"

describe("compiled production SliderField", () => {
  test("owns range interaction instead of a NumberField presentation", () => {
    expect(isCompiledTemplate(SliderField)).toBe(true)
    expect(isCompiledTemplate(SliderFieldFixture)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const values: number[] = []
    root.render(SliderField as any, {value: 0.5, min: 0, max: 1, onInput: (value: number) => values.push(value)})
    const input = host.querySelector("input") as HTMLInputElement
    input.valueAsNumber = 0.7
    input.dispatchEvent(new Event("input", {bubbles: true}))
    expect(values[0]).toBeCloseTo(0.7, 12)
    root.render(SliderField as any, {label: "Ratio", value: 0.5, min: 0, max: 1, readOnly: true, onInput: (value: number) => values.push(value)})
    input.valueAsNumber = 0.9
    input.dispatchEvent(new Event("input", {bubbles: true}))
    expect(input.valueAsNumber).toBe(0.5)
    expect(values).toHaveLength(1)
    const renderer = createDocumentRenderer({document, root: host, viewport: {width: 240, height: 80}})
    expect(renderer.flush().boxByNode.get(input)?.height).toBe(28)
    renderer.dispose()
    root.render(SliderFieldFixture as any, {})
    expect(host.textContent).toContain("Ratio")
    root.unmount()
  })
})
