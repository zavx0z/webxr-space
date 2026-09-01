import {describe, expect, test} from "bun:test"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {RotationField} from "./rotation-field.tsx"

describe("compiled production RotationField", () => {
  test("is a distinct field leaf over VectorControl", () => {
    expect(isCompiledTemplate(RotationField)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    root.render(RotationField as any, {id: "rotation", label: "Rotation", value: [0, 0, 0]})
    expect(host.querySelector('[data-field-kind="rotation"]')).not.toBeNull()
    expect(host.querySelectorAll("label")).toHaveLength(3)
    root.unmount()
  })
})
