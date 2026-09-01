import {describe, expect, test} from "bun:test"
import {
  Event,
  KeyboardEvent,
  getPopoverVisibilityState,
  type HTMLButtonElement,
  type HTMLElement,
  type HTMLInputElement,
  type HTMLOptionElement,
  type HTMLSelectElement
} from "@zavx0z/dom"
import {
  createDocumentInteractionController,
  createDocumentRenderer
} from "@zavx0z/renderer"
import {createRoot} from "@zavx0z/react"
import {isCompiledTemplate} from "@zavx0z/template/compiled"
import {
  EnumInput,
  findEnumInputOption,
  nextEnumInputValue
} from "./enum-input.tsx"
import {ProgressCheckbox} from "./progress-checkbox.tsx"
import {SliderControl} from "./slider-control.tsx"
import {createDocument} from "./test-document.ts"

describe("compiled select, range and progress controls", () => {
  test("retains keyed options and proposes the standard select value", () => {
    expect(isCompiledTemplate(EnumInput)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const options = [
      {key: "a", value: "a", label: "Alpha"},
      {key: "b", value: "b", label: "Beta"}
    ]
    const proposals: string[] = []
    root.render(EnumInput as any, {value: "b", options, onChange: (value: string) => proposals.push(value)})
    const select = host.querySelector("select") as HTMLSelectElement
    const realOptions = ([...select.querySelectorAll("option")] as HTMLOptionElement[])
      .filter(option => option.value !== "")
    const alpha = realOptions[0]!
    const beta = realOptions[1]!
    expect(select.value).toBe("b")
    select.value = "a"
    select.dispatchEvent(new Event("change", {bubbles: true}))
    expect(proposals).toEqual(["a"])

    root.render(EnumInput as any, {value: "a", options: [options[1]!, options[0]!]})
    expect(host.querySelector("select")).toBe(select)
    expect(select.querySelectorAll("option")[1]).toBe(beta)
    expect(select.querySelectorAll("option")[2]).toBe(alpha)
    expect(select.value).toBe("a")
    expect(select.className).toBe("")
    root.unmount()
  })

  test("preserves expanded, exceptional, invalid and read-only enum semantics", () => {
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const options = [
      {key: "a", value: "a", label: "Alpha", description: "First", iconSrc: "icon:alpha"},
      {key: "b", value: "b", label: "Beta", disabled: true}
    ]
    const proposals: string[] = []
    expect(findEnumInputOption("a", options)).toBe(options[0])
    expect(nextEnumInputValue("a", options)).toBe("b")
    expect(nextEnumInputValue("missing", options)).toBe("b")

    root.render(EnumInput as any, {
      value: "a",
      options,
      presentation: "expanded",
      onChange: (value: string) => proposals.push(value)
    })
    const expanded = host.querySelector('[data-enum-input]')!
    expect(expanded.getAttribute("role")).toBe("radiogroup")
    const expandedOptions = expanded.querySelector('[data-enum-expanded]')!
    expect(expandedOptions.querySelectorAll("button")).toHaveLength(2)
    expect(expandedOptions.querySelector("img")!.getAttribute("src")).toBe("icon:alpha")
    const expandedButtons = [...expandedOptions.querySelectorAll("button")] as HTMLButtonElement[]
    expandedButtons[0]!.click()
    expandedButtons[1]!.click()
    expect(proposals).toEqual(["a"])

    root.render(EnumInput as any, {value: "missing", options})
    const invalid = host.querySelector("select") as HTMLSelectElement
    expect(invalid.value).toBe("missing")
    expect(([...invalid.querySelectorAll("option")] as HTMLOptionElement[])
      .find(option => option.value === "missing")?.textContent).toBe("missing")

    root.render(EnumInput as any, {value: "a", options, readOnly: true, onChange: (value: string) => proposals.push(value)})
    const readOnly = host.querySelector("select") as HTMLSelectElement
    readOnly.value = "b"
    readOnly.dispatchEvent(new Event("change", {bubbles: true}))
    expect(readOnly.disabled).toBe(false)
    expect(readOnly.value).toBe("a")
    expect(proposals).toEqual(["a"])

    root.render(EnumInput as any, {value: "", options: []})
    expect((host.querySelector("select") as HTMLSelectElement).options[0]!.textContent).toBe("No Items")
    root.render(EnumInput as any, {value: "", state: "undefined"})
    expect((host.querySelector("select") as HTMLSelectElement).options[0]!.textContent).toBe("Menu Undefined")
    root.render(EnumInput as any, {value: "", options, state: "error"})
    expect((host.querySelector("select") as HTMLSelectElement).options[0]!.textContent).toBe("Menu Error")
    root.unmount()
  })

  test("opens and chooses the native cycle picker through Core interaction", () => {
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const proposals: string[] = []
    root.render(EnumInput as any, {
      value: "a",
      options: [
        {key: "a", value: "a", label: "Alpha"},
        {key: "b", value: "b", label: "Beta"}
      ],
      onChange: (value: string) => proposals.push(value)
    })
    const select = host.querySelector("select") as HTMLSelectElement
    const second = ([...select.querySelectorAll("option")] as HTMLOptionElement[])
      .find(option => option.value === "b")!
    const renderer = createDocumentRenderer({document, root: host, viewport: {width: 240, height: 120}})
    const interaction = createDocumentInteractionController({document})
    const closed = renderer.flush()
    const selectBox = closed.boxByNode.get(select)!
    interaction.pointerDown(closed, {clientX: selectBox.x + 4, clientY: selectBox.y + 4})
    interaction.pointerUp(closed, {clientX: selectBox.x + 4, clientY: selectBox.y + 4})
    expect(select.pickerVisibilityState).toBe("open")
    const open = renderer.flush()
    const secondBox = open.boxByNode.get(second)!
    interaction.pointerDown(open, {clientX: secondBox.x + 4, clientY: secondBox.y + 4})
    interaction.pointerUp(open, {clientX: secondBox.x + 4, clientY: secondBox.y + 4})
    expect(select.value).toBe("b")
    expect(proposals).toEqual(["b"])
    expect(select.pickerVisibilityState).toBe("closed")
    interaction.dispose()
    renderer.dispose()
    root.unmount()
  })

  test("renders icon cycle options in a same-Document popover", () => {
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const proposals: string[] = []
    root.render(EnumInput as any, {
      value: "a",
      options: [
        {key: "a", value: "a", label: "Alpha", iconSrc: "icon:alpha"},
        {key: "b", value: "b", label: "Beta", iconSrc: "icon:beta"}
      ],
      popupLabel: "Icon options",
      onChange: (value: string) => proposals.push(value)
    })
    const trigger = host.querySelector('[data-enum-icon-cycle]')!.querySelector("button") as HTMLButtonElement
    const popover = host.querySelector("[popover]") as HTMLElement
    expect(trigger.querySelector("img")?.getAttribute("src")).toBe("icon:alpha")
    expect(trigger.getAttribute("aria-controls")).toBe(popover.id)
    expect(popover.getAttribute("role")).toBe("listbox")
    expect(popover[getPopoverVisibilityState]()).toBe("hidden")

    trigger.click()
    expect(trigger.getAttribute("aria-expanded")).toBe("true")
    expect(popover[getPopoverVisibilityState]()).toBe("showing")
    const options = [...popover.querySelectorAll('[role="option"]')] as HTMLButtonElement[]
    expect(options[0]!.getAttribute("aria-pressed")).toBeNull()
    expect(options[0]!.getAttribute("aria-selected")).toBe("true")
    expect(options.map(option => option.querySelector("img")?.getAttribute("src")))
      .toEqual(["icon:alpha", "icon:beta"])
    const alphaRow = options[0]!
    const alphaIcon = alphaRow.querySelector("img")
    options[1]!.focus()
    expect(document.activeElement?.textContent).toBe("Beta")
    alphaRow.focus()
    alphaRow.dispatchEvent(new KeyboardEvent("keydown", {key: "ArrowDown", bubbles: true}))
    expect(document.activeElement?.textContent).toBe("Beta")
    options[1]!.dispatchEvent(new KeyboardEvent("keydown", {key: "Enter", bubbles: true}))
    expect(proposals).toEqual(["b"])
    expect(popover[getPopoverVisibilityState]()).toBe("hidden")

    root.render(EnumInput as any, {
      value: "alpha-next",
      options: [
        {key: "a", value: "alpha-next", label: "Alpha next", iconSrc: "icon:alpha-next"},
        {key: "b", value: "b", label: "Beta", iconSrc: "icon:beta"}
      ]
    })
    const retainedAlpha = host.querySelectorAll('[role="option"]')[0]!
    expect(retainedAlpha).toBe(alphaRow)
    expect(retainedAlpha.querySelector("img")).toBe(alphaIcon)
    expect(alphaIcon?.getAttribute("src")).toBe("icon:alpha-next")
    root.unmount()
  })

  test("keeps range live properties and native pseudo geometry", () => {
    expect(isCompiledTemplate(SliderControl)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    const proposals: number[] = []
    root.render(SliderControl as any, {
      value: 0.5,
      min: 0,
      max: 1,
      step: 0.1,
      onInput: (value: number) => proposals.push(value)
    })
    const input = host.querySelector("input") as HTMLInputElement
    expect(input.valueAsNumber).toBeCloseTo(0.5, 12)
    input.valueAsNumber = 0.7
    input.dispatchEvent(new Event("input", {bubbles: true}))
    expect(proposals).toHaveLength(1)
    expect(proposals[0]).toBeCloseTo(0.7, 12)
    const renderer = createDocumentRenderer({
      document,
      root: host,
      viewport: {width: 240, height: 80}
    })
    expect(renderer.flush().boxByNode.get(input)).toMatchObject({width: 180, height: 28})
    expect(input.className).toBe("")
    const sliderControlCss = (SliderControl as any).styleSheets.map((sheet: any) => sheet.cssText).join("\n")
    expect(sliderControlCss).toContain(":active")
    renderer.dispose()
    root.unmount()
  })

  test("implements progress state by composing Checkbox", () => {
    expect(isCompiledTemplate(ProgressCheckbox)).toBe(true)
    const document = createDocument()
    const host = document.createElement("main")
    document.appendChild(host)
    const root = createRoot(host)
    root.render(ProgressCheckbox as any, {checked: false, indeterminate: true})
    const input = host.querySelector("input") as HTMLInputElement
    expect(input.indeterminate).toBe(true)
    expect(input.getAttribute("aria-checked")).toBe("mixed")
    expect(input.className).toBe("")
    expect(root.stats().mounts).toBe(2)
    root.unmount()
  })

  test("publishes class-free sheets", () => {
    const enumInputCss = (EnumInput as any).styleSheets.map((sheet: any) => sheet.cssText).join("\n")
    const sliderControlCss = (SliderControl as any).styleSheets.map((sheet: any) => sheet.cssText).join("\n")
    expect(enumInputCss).not.toContain(".ui-")
    expect(sliderControlCss).not.toContain(".ui-")
  })
})
