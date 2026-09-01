import {describe, expect, test} from "bun:test"
import {Event, type HTMLOptionElement, type HTMLSelectElement} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {SelectFieldFixture} from "./select-field.fixture.tsx"
import {SelectField} from "./select-field.tsx"

describe("compiled production SelectField", () => {
  test("owns native select options, exceptional state and readOnly restoration", () => {
    expect(isCompiledTemplate(SelectField)).toBe(true)
    expect(isCompiledTemplate(SelectFieldFixture)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const options = [{key: "a", value: "a", label: "Alpha"}, {key: "b", value: "b", label: "Beta"}]
    const values: string[] = []
    root.render(SelectField as any, {value: "a", options, onChange: (value: string) => values.push(value)})
    const select = host.querySelector("select") as HTMLSelectElement
    const alpha = ([...select.querySelectorAll("option")] as HTMLOptionElement[]).find(option => option.value === "a")!
    select.value = "b"
    select.dispatchEvent(new Event("change", {bubbles: true}))
    expect(values).toEqual(["b"])
    root.render(SelectField as any, {label: "Mode", value: "a", options: [options[1]!, options[0]!], readOnly: true})
    expect(([...select.querySelectorAll("option")] as HTMLOptionElement[]).find(option => option.value === "a")).toBe(alpha)
    select.value = "b"
    select.dispatchEvent(new Event("change", {bubbles: true}))
    expect(select.value).toBe("a")
    root.render(SelectField as any, {value: "", options: []})
    expect(select.options[0]!.textContent).toBe("No Items")
    root.render(SelectFieldFixture as any, {})
    expect(host.textContent).toContain("Mode")
    root.unmount()
  })
})
