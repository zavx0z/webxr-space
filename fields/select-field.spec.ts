import {describe, expect, test} from "bun:test"
import {Event, type HTMLOptionElement, type HTMLSelectElement} from "@zavx0z/dom"
import {createDocumentRenderer, type RectDisplayItem} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {createDocument} from "../document.fixture.ts"
import {SelectFieldFixture} from "./select-field.fixture.tsx"
import {SelectField} from "./select-field.tsx"
import {chevronDownIcon} from "../icon-assets.ts"

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
    const indicator = host.querySelector("[data-select-field-indicator]")!
    expect(indicator.getAttribute("src")).toBe(chevronDownIcon)
    const alpha = ([...select.querySelectorAll("option")] as HTMLOptionElement[]).find(option => option.value === "a")!
    select.value = "b"
    select.dispatchEvent(new Event("change", {bubbles: true}))
    expect(values).toEqual(["b"])
    root.render(SelectField as any, {label: "Mode", value: "a", options: [options[1]!, options[0]!], readOnly: true})
    expect(host.querySelector("[data-select-field-indicator]")).toBe(indicator)
    expect(([...select.querySelectorAll("option")] as HTMLOptionElement[]).find(option => option.value === "a")).toBe(alpha)
    select.value = "b"
    select.dispatchEvent(new Event("change", {bubbles: true}))
    expect(select.value).toBe("a")
    root.render(SelectField as any, {value: "", options: []})
    expect(select.options[0]!.textContent).toBe("No Items")
    root.render(SelectFieldFixture as any, {})
    expect(host.textContent).toContain("Mode")
    const presentedSelect = host.querySelector("select") as HTMLSelectElement
    const presentedIndicator = host.querySelector("[data-select-field-indicator]")!
    const renderer = createDocumentRenderer({document, root: host, viewport: {width: 320, height: 80}})
    const background = renderer.flush().displayList.find((item): item is RectDisplayItem =>
      item.kind === "rect" && item.node === presentedSelect.parentElement && item.key === "background")
    expect(background?.color).toBe("rgb(29 29 29)")
    const frame = renderer.flush()
    expect(frame.hits.has(presentedSelect)).toBeTrue()
    expect(frame.hits.get(presentedIndicator)?.interactive ?? false).toBeFalse()
    const indicatorBox = frame.boxByNode.get(presentedIndicator)!
    expect(indicatorBox).toMatchObject({width: 22, height: 22})
    const disclosure = frame.displayList.find(item =>
      item.kind === "text" && item.node === presentedSelect && item.key === "disclosure-indicator")
    expect(disclosure).toBeDefined()
    if (disclosure?.kind === "text") {
      expect(indicatorBox.x).toBeLessThanOrEqual(disclosure.x)
      expect(indicatorBox.x + indicatorBox.width).toBeGreaterThan(disclosure.x)
    }
    renderer.dispose()
    root.unmount()
  })
})
