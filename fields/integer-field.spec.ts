import {describe, expect, test} from "bun:test"
import {Event, type HTMLInputElement} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {IntegerField} from "./integer-field.tsx"

describe("compiled production IntegerField", () => {
  test("composes IntegerControl and rounds proposals", () => {
    expect(isCompiledTemplate(IntegerField)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const values: number[] = []
    root.render(IntegerField as any, {id: "count", label: "Count", value: 4, onChange: (value: number) => values.push(value)})
    const input = host.querySelector("input") as HTMLInputElement
    input.valueAsNumber = 6.7
    input.dispatchEvent(new Event("input", {bubbles: true}))
    expect(values).toEqual([7])
    root.unmount()
  })
})
