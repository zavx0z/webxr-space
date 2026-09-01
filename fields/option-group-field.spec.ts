import {describe, expect, test} from "bun:test"
import type {HTMLButtonElement} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {OptionGroupFieldFixture} from "./option-group-field.fixture.tsx"
import {OptionGroupField} from "./option-group-field.tsx"

describe("compiled production OptionGroupField", () => {
  test("owns the persistent option-button group without a presentation prop", () => {
    expect(isCompiledTemplate(OptionGroupField)).toBe(true)
    expect(isCompiledTemplate(OptionGroupFieldFixture)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const values: string[] = []
    const options = [{key: "a", value: "a", label: "Alpha"}, {key: "b", value: "b", label: "Beta"}]
    root.render(OptionGroupField as any, {label: "Mode", value: "a", options, onChange: (value: string) => values.push(value)})
    const buttons = [...host.querySelectorAll("button")] as HTMLButtonElement[]
    buttons[1]!.click()
    expect(values).toEqual(["b"])
    root.render(OptionGroupField as any, {value: "a", options, readOnly: true, onChange: (value: string) => values.push(value)})
    buttons[1]!.click()
    expect(buttons[1]!.disabled).toBe(false)
    expect(values).toEqual(["b"])
    root.render(OptionGroupFieldFixture as any, {})
    expect(host.textContent).toContain("Mode")
    root.unmount()
  })
})
