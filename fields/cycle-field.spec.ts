import {describe, expect, test} from "bun:test"
import {getPopoverVisibilityState, type HTMLButtonElement, type HTMLElement} from "@zavx0z/dom"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {CycleFieldFixture} from "./cycle-field.fixture.tsx"
import {CycleField} from "./cycle-field.tsx"

describe("compiled production CycleField", () => {
  test("owns the explicit icon-capable popover mechanism", () => {
    expect(isCompiledTemplate(CycleField)).toBe(true)
    expect(isCompiledTemplate(CycleFieldFixture)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const values: string[] = []
    const options = [
      {key: "a", value: "a", label: "Alpha", iconSrc: "icon:alpha"},
      {key: "b", value: "b", label: "Beta", iconSrc: "icon:beta"}
    ]
    root.render(CycleField as any, {value: "a", options, onChange: (value: string) => values.push(value)})
    const trigger = host.querySelector("button") as HTMLButtonElement
    const popover = host.querySelector("[popover]") as HTMLElement
    trigger.click()
    expect(popover[getPopoverVisibilityState]()).toBe("showing")
    const rows = [...popover.querySelectorAll("button")] as HTMLButtonElement[]
    rows[1]!.click()
    expect(values).toEqual(["b"])
    root.render(CycleField as any, {label: "Mode", value: "a", options, readOnly: true, onChange: (value: string) => values.push(value)})
    trigger.click()
    rows[1]!.click()
    expect(values).toEqual(["b"])
    root.render(CycleFieldFixture as any, {})
    expect(host.textContent).toContain("Mode")
    root.unmount()
  })
})
