import {describe, expect, test} from "bun:test"
import {Event, type HTMLInputElement} from "@zavx0z/dom"
import {createDocumentInteractionController, createDocumentRenderer} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {NumberFieldFixture} from "./number-field.fixture.tsx"
import {NumberField} from "./number-field.tsx"

describe("compiled production NumberField", () => {
  test("keeps one continuous scalar identity and does not own integer semantics", () => {
    expect(isCompiledTemplate(NumberField)).toBe(true)
    expect(isCompiledTemplate(NumberFieldFixture)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const values: number[] = []
    root.render(NumberField as any, {value: 1.5, min: 0, max: 10, step: 0.1, onInput: (value: number) => values.push(value)})
    const input = host.querySelector("input") as HTMLInputElement
    input.valueAsNumber = 2.6
    input.dispatchEvent(new Event("input", {bubbles: true}))
    expect(values).toEqual([2.6])
    root.render(NumberField as any, {label: "Value", value: 2.6, readOnly: true})
    expect(host.querySelector("input")).toBe(input)
    expect(input.readOnly).toBe(true)
    root.render(NumberField as any, {label: "Value", value: 2.6, precision: 3})
    expect(host.querySelector("input")).toBe(input)
    expect(input.value).toBe("2.600")
    expect(input.valueAsNumber).toBe(2.6)
    root.render(NumberFieldFixture as any, {})
    expect(host.textContent).toContain("Value")
    root.unmount()
  })

  test("preserves the 120x22 scrub contour and pointer capture", () => {
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const values: number[] = []
    root.render(NumberField as any, {value: 0, softMin: -10, softMax: 10, onInput: (value: number) => values.push(value)})
    const input = host.querySelector("input")!
    const owner = host.querySelector("[data-number-field-value]")!
    const renderer = createDocumentRenderer({document, root: host, viewport: {width: 240, height: 80}})
    const frame = renderer.flush()
    expect(frame.boxByNode.get(owner)).toMatchObject({width: 120, height: 22})
    const box = frame.boxByNode.get(input)!
    const interaction = createDocumentInteractionController({document})
    const startX = box.x + box.width / 2
    const y = box.y + box.height / 2
    interaction.pointerDown(frame, {clientX: startX, clientY: y, pointerId: 5})
    interaction.pointerMove(frame, {clientX: startX + 30, clientY: y, pointerId: 5})
    interaction.pointerUp(frame, {clientX: startX + 30, clientY: y, pointerId: 5})
    expect(values.length).toBeGreaterThan(0)
    interaction.dispose()
    renderer.dispose()
    root.unmount()
  })

  test("keeps the optional label and value inside one filled contour", () => {
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    root.render(NumberField as any, {label: "Scale", value: 5, min: 0, max: 10})
    const owner = host.querySelector("[data-number-field]")!
    const label = [...owner.querySelectorAll("span")]
      .find(element => !element.hasAttribute("data-number-fill"))!
    const value = owner.querySelector("[data-number-field-value]")!
    const fill = owner.querySelector("[data-number-fill]")!
    const renderer = createDocumentRenderer({document, root: host, viewport: {width: 240, height: 80}})
    const frame = renderer.flush()

    expect(frame.boxByNode.get(owner)).toMatchObject({width: 240, height: 28})
    expect(frame.boxByNode.get(label)).toMatchObject({width: 96, height: 28})
    expect(frame.boxByNode.get(value)).toMatchObject({width: 144, height: 28})
    expect(frame.boxByNode.get(fill)).toMatchObject({width: 120, height: 28})
    expect(owner.contains(fill)).toBeTrue()
    expect(value.contains(fill)).toBeFalse()
    renderer.dispose()
    root.unmount()
  })
})
