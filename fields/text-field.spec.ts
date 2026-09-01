import {describe, expect, test} from "bun:test"
import {Event, type HTMLInputElement} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {DuplicateIdTextFieldsFixture} from "./text-field.fixture.tsx"
import {TextField} from "./text-field.tsx"

describe("compiled production TextField", () => {
  test("retains its row and TextControl while proposing direct controlled values", () => {
    expect(isCompiledTemplate(TextField)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const values: string[] = []
    root.render(TextField as any, {id: "name", label: "Name", value: "Alpha", onChange: (value: string) => values.push(value)})
    const owner = host.querySelector('[data-field-id="name"]')!
    const input = owner.querySelector("input") as HTMLInputElement
    input.value = "Beta"
    input.dispatchEvent(new Event("input", {bubbles: true}))
    expect(values).toEqual(["Beta"])
    root.render(TextField as any, {id: "name", label: "Name", value: "Beta"})
    expect(host.querySelector('[data-field-id="name"]')).toBe(owner)
    expect(owner.querySelector("input")).toBe(input)
    root.unmount()
  })

  test("uses stable unique labels for repeated semantic ids", () => {
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    root.render(DuplicateIdTextFieldsFixture as any, {})
    const fields = [...host.querySelectorAll('[data-field-id="same"]')]
    const labels = fields.map(field => field.querySelector("span")!.id)
    expect(new Set(labels).size).toBe(2)
    expect(fields.map(field => field.querySelector('[role="group"]')!.getAttribute("aria-labelledby"))).toEqual(labels)
    root.unmount()
  })
})
