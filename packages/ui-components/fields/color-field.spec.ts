import {describe, expect, test} from "bun:test"
import {getPopoverVisibilityState, type HTMLButtonElement, type HTMLElement} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {ColorFieldFixture} from "./color-field.fixture.tsx"
import {ColorField} from "./color-field.tsx"

describe("compiled production ColorField", () => {
  test("owns popover lifecycle and composes the exact ColorPickerField", () => {
    expect(isCompiledTemplate(ColorField)).toBe(true)
    expect(isCompiledTemplate(ColorFieldFixture)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const opens: boolean[] = []
    root.render(ColorField as any, {label: "Color", value: {r: 1, g: 0, b: 0, a: 1}, onOpenChange: (open: boolean) => opens.push(open)})
    const trigger = host.querySelector("button") as HTMLButtonElement
    const popover = host.querySelector("[popover]") as HTMLElement
    expect(popover.querySelector("[data-color-picker-field]")).not.toBeNull()
    trigger.click()
    expect(popover[getPopoverVisibilityState]()).toBe("showing")
    expect(opens).toEqual([true])
    root.render(ColorFieldFixture as any, {})
    expect(host.textContent).toContain("Color")
    root.unmount()
  })
})
