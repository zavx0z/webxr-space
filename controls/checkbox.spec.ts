import {describe, expect, test} from "bun:test"
import {type HTMLInputElement} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {Checkbox} from "./checkbox.tsx"
import {createDocument} from "../document.fixture.ts"

describe("compiled production Checkbox", () => {
  test("keeps Checkbox live checked/indeterminate state and controlled proposals", () => {
    expect(isCompiledTemplate(Checkbox)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const proposed: boolean[] = []
    root.render(Checkbox as any, {
      checked: false,
      indeterminate: true,
      onChange: (checked: boolean) => proposed.push(checked)
    })
    const input = host.querySelector("input") as HTMLInputElement
    expect(input.className).toBe("")
    expect(input.checked).toBe(false)
    expect(input.indeterminate).toBe(true)
    expect(input.getAttribute("aria-checked")).toBe("mixed")
    input.click()
    expect(proposed).toEqual([true])

    root.render(Checkbox as any, {checked: true, indeterminate: false})
    expect(host.querySelector("input")).toBe(input)
    expect(input.checked).toBe(true)
    expect(input.indeterminate).toBe(false)
    expect(input.getAttribute("aria-checked")).toBe("true")
    const renderer = createDocumentRenderer({
      document,
      root: host,
      viewport: {width: 80, height: 50}
    })
    expect(renderer.flush().boxByNode.get(input)).toMatchObject({width: 18, height: 18})
    renderer.dispose()
    root.unmount()
  })

  test("uses class-free native pseudo owner sheets", () => {
    const checkboxCss = (Checkbox as any).styleSheets.map((sheet: any) => sheet.cssText).join("\n")
    expect(checkboxCss).toContain(":checked")
    expect(checkboxCss).toContain(":indeterminate")
    expect(checkboxCss).not.toContain(".ui-")
  })
})
