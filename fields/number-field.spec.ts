import {describe, expect, test} from "bun:test"
import {Event, type HTMLInputElement} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {NumberField} from "./number-field.tsx"

describe("compiled production NumberField", () => {
  test("directly composes NumberControl or SliderControl", () => {
    expect(isCompiledTemplate(NumberField)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const values: number[] = []
    root.render(NumberField as any, {id: "ratio", label: "Ratio", value: 0.25, presentation: "slider", min: 0, max: 1, step: 0.05, onChange: (value: number) => values.push(value)})
    const range = host.querySelector('input[type="range"]') as HTMLInputElement
    expect(range).not.toBeNull()
    expect(host.querySelector('input[type="number"]')).toBeNull()
    range.valueAsNumber = 0.6
    range.dispatchEvent(new Event("input", {bubbles: true}))
    expect(values[0]).toBeCloseTo(0.6, 12)
    root.render(NumberField as any, {id: "ratio", label: "Ratio", value: 0.6})
    expect(host.querySelector('input[type="number"]')).not.toBeNull()
    root.unmount()
  })
})
