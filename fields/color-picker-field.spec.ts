import {describe, expect, test} from "bun:test"
import {Event, type HTMLInputElement} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {ColorPickerFieldFixture} from "./color-picker-field.fixture.tsx"
import {ColorPickerField, type ColorPickerFieldValue} from "./color-picker-field.tsx"

describe("compiled production ColorPickerField", () => {
  test("owns in-flow RGBA editing and retained HSVA channels", () => {
    expect(isCompiledTemplate(ColorPickerField)).toBe(true)
    expect(isCompiledTemplate(ColorPickerFieldFixture)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const values: ColorPickerFieldValue[] = []
    root.render(ColorPickerField as any, {value: {r: 0.2, g: 0.4, b: 0.8, a: 0.5}, onInput: (value: ColorPickerFieldValue) => values.push(value)})
    const picker = host.querySelector("[data-color-picker-field]")!
    const hex = picker.querySelector('input[type="text"]') as HTMLInputElement
    const channel = picker.querySelector('[data-color-channel="v"]')!
    const number = channel.querySelector('input[type="number"]') as HTMLInputElement
    hex.value = "#33669980"
    hex.dispatchEvent(new Event("input", {bubbles: true}))
    expect(values[0]).toEqual({r: 51 / 255, g: 102 / 255, b: 153 / 255, a: 128 / 255})
    root.render(ColorPickerField as any, {label: "Color", value: {r: 0.2, g: 0.4, b: 0.6, a: 1}, readOnly: true})
    expect(host.querySelector('[data-color-channel="v"]')).toBe(channel)
    expect(channel.querySelector('input[type="number"]')).toBe(number)
    const renderer = createDocumentRenderer({document, root: host, viewport: {width: 480, height: 320}})
    expect(renderer.flush().boxByNode.get(picker)?.height).toBeGreaterThan(48)
    renderer.dispose()
    root.render(ColorPickerFieldFixture as any, {})
    expect(host.textContent).toContain("Color")
    root.unmount()
  })
})
