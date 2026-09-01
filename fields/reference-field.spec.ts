import {describe, expect, test} from "bun:test"
import type {HTMLButtonElement} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {ReferenceField} from "./reference-field.tsx"

describe("compiled production ReferenceField", () => {
  test("composes ReferenceControl actions through direct callbacks", () => {
    expect(isCompiledTemplate(ReferenceField)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const actions: string[] = []
    root.render(ReferenceField as any, {id: "target", label: "Target", value: {id: "a", label: "Alpha"}, onClear: () => actions.push("clear")})
    const clear = host.querySelector('[aria-label="Clear reference"]') as HTMLButtonElement
    clear.click()
    expect(actions).toEqual(["clear"])
    root.unmount()
  })
})
