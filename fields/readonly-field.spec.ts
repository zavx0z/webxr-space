import {describe, expect, test} from "bun:test"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {ReadonlyField} from "./readonly-field.tsx"

describe("compiled production ReadonlyField", () => {
  test("keeps the passive value and exact 28px row", () => {
    expect(isCompiledTemplate(ReadonlyField)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    root.render(ReadonlyField as any, {id: "status", label: "Status", value: "Ready"})
    const owner = host.querySelector('[data-field-id="status"]')!
    expect(owner.textContent).toContain("Ready")
    const renderer = createDocumentRenderer({document, root: host, viewport: {width: 480, height: 120}})
    expect(renderer.flush().boxByNode.get(owner)?.height).toBe(28)
    renderer.dispose()
    root.unmount()
  })
})
