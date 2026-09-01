import {describe, expect, test} from "bun:test"
import type {HTMLInputElement} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {BooleanField} from "./boolean-field.tsx"

describe("compiled production BooleanField", () => {
  test("directly composes checkbox and switch presentations", () => {
    expect(isCompiledTemplate(BooleanField)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const values: boolean[] = []
    root.render(BooleanField as any, {id: "enabled", label: "Enabled", value: false, onChange: (value: boolean) => values.push(value)})
    const input = host.querySelector("input") as HTMLInputElement
    input.click()
    expect(values).toEqual([true])
    root.render(BooleanField as any, {id: "enabled", label: "Enabled", value: true, presentation: "switch"})
    expect(host.querySelector('[role="switch"]')).not.toBeNull()
    root.unmount()
  })
})
