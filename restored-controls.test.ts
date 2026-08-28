import {describe, expect, test} from "bun:test"
import {createDocument, Event, PointerEvent} from "@zavx0z/dom"
import {buttonCss, createButton} from "./button.ts"
import {createPane, paneCss} from "./pane.ts"
import {createBadge} from "./badge.ts"
import {createTypography} from "./typography.ts"
import {createDivider, dividerCss} from "./divider.ts"
import {createTextField, textFieldCss} from "./text-field.ts"
import {checkboxCss, createCheckbox} from "./checkbox.ts"
import {createSwitcher, switcherCss} from "./switcher.ts"
import {createNumberInput, numberInputCss} from "./number-input.ts"
import {createIntegerInput} from "./integer-input.ts"
import {createSliderControl, sliderControlCss} from "./slider-control.ts"
import {createProgressCheckbox} from "./progress-checkbox.ts"
import {controlGroupCss, createControlGroup} from "./control-group.ts"
import {createVectorInput} from "./vector-input.ts"
import {createMatrixInput} from "./matrix-input.ts"
import {createEnumInput} from "./enum-input.ts"
import {createReferenceInput} from "./reference-input.ts"
import {createPathInput} from "./path-input.ts"
import {createCollectionInput} from "./collection-input.ts"
import {createList} from "./list.ts"
import {createTable} from "./table.ts"
import {colorInputCss, createColorInput} from "./color-input.ts"
import {fieldCss} from "./field.ts"
import {hudCss} from "./hud.ts"

describe("restored production DOM controls", () => {
  test("keeps foundation roots and text identities stable", () => {
    const document = createDocument()
    const button = createButton(document, {label: "Output", title: "Output"})
    const buttonText = button.refs.text
    let clicks = 0
    button.update({label: "Render", selected: true, onClick: () => { clicks += 1 }})
    expect(button.refs.text).toBe(buttonText)
    expect(button.element.textContent).toBe("Render")
    expect(button.element.getAttribute("aria-pressed")).toBe("true")
    button.element.dispatchEvent(new PointerEvent("pointerenter"))
    expect(button.element.getAttribute("data-ui-state")).toBe("hover")
    button.element.click()
    expect(clicks).toBe(1)

    const pane = createPane(document, {content: "Panel", active: true})
    const paneText = pane.element.firstChild
    pane.update({content: "Updated", variant: "outlined", active: false})
    expect(pane.element.firstChild).toBe(paneText)
    expect(pane.element.textContent).toBe("Updated")
    expect(pane.element.getAttribute("data-active")).toBe("false")

    const badge = createBadge(document, {label: "Ready", tone: "success"})
    const badgeText = badge.refs.text
    badge.update({label: "Done", tone: "info"})
    expect(badge.refs.text).toBe(badgeText)
    const typography = createTypography(document, {text: "Title", variant: "title"})
    const typographyText = typography.refs.text
    typography.update({text: "Caption", variant: "caption"})
    expect(typography.refs.text).toBe(typographyText)
    expect(createDivider(document, {variant: "inset"}).element.localName).toBe("hr")
  })

  test("uses standard live input properties and bubbling events", () => {
    const document = createDocument()
    const host = document.createElement("div")
    document.appendChild(host)
    const values: string[] = []
    const text = createTextField(document, {value: "Output", onInput: (value) => values.push(value)})
    host.appendChild(text.element)
    text.element.value = "Preview"
    text.element.dispatchEvent(new Event("input", {bubbles: true}))
    expect(values).toEqual(["Preview"])
    expect(text.props.value).toBe("Output")
    text.update(text.props)
    expect(text.element.value).toBe("Output")

    const checks: boolean[] = []
    const checkbox = createCheckbox(document, {checked: false, onChange: (value) => checks.push(value)})
    checkbox.element.checked = true
    checkbox.element.dispatchEvent(new Event("change", {bubbles: true}))
    expect(checks).toEqual([true])
    expect(checkbox.element.getAttribute("aria-checked")).toBe("true")
    const switcher = createSwitcher(document, {checked: true})
    expect(switcher.element.getAttribute("role")).toBe("switch")
    expect(switcher.element.getAttribute("aria-checked")).toBe("true")
  })

  test("keeps numeric control identities and normalized contracts", () => {
    const document = createDocument()
    const numbers: number[] = []
    const number = createNumberInput(document, {value: 0.5, min: 0, max: 1, step: 0.1, onInput: (value) => numbers.push(value)})
    const input = number.element
    number.update({...number.props, value: 0.8})
    expect(number.element).toBe(input)
    input.valueAsNumber = 0.6
    input.dispatchEvent(new Event("input", {bubbles: true}))
    expect(numbers).toEqual([0.6])
    expect(createIntegerInput(document, {value: 4.6}).props.value).toBe(5)
    const slider = createSliderControl(document, {value: 4, min: 0, max: 10})
    expect(slider.element.type).toBe("range")
    const progress = createProgressCheckbox(document, {checked: false, indeterminate: true})
    expect(progress.element.getAttribute("aria-checked")).toBe("mixed")
  })

  test("retains keyed grouped, vector and matrix cells through updates", () => {
    const document = createDocument()
    const group = createControlGroup(document, {items: [
      {key: "x", label: "X", value: "1", type: "number"},
      {key: "y", label: "Y", value: "2", type: "number"},
    ]})
    const x = group.refs.inputs.get("x")
    const y = group.refs.inputs.get("y")
    group.update({items: [
      {key: "y", label: "Y", value: "3", type: "number"},
      {key: "x", label: "X", value: "4", type: "number"},
    ]})
    expect(group.refs.inputs.get("x")).toBe(x)
    expect(group.refs.inputs.get("y")).toBe(y)
    expect(group.element.childNodes[0]).toBe(group.refs.cells.get("y"))

    const vector = createVectorInput(document, {value: [1, 2, 3]})
    const vectorX = vector.refs.inputs.get("X")
    vector.update({value: [4, 5, 6]})
    expect(vector.refs.inputs.get("X")).toBe(vectorX)
    const matrix = createMatrixInput(document, {value: [[1, 0], [0, 1]]})
    const matrix00 = matrix.refs.inputs.get("0:0")
    matrix.update({value: [[2, 0], [0, 2]]})
    expect(matrix.refs.inputs.get("0:0")).toBe(matrix00)
  })

  test("retains resource and collection identities and emits owner intentions", () => {
    const document = createDocument()
    const enums: string[] = []
    const enumInput = createEnumInput(document, {
      value: "output",
      options: [
        {key: "preview", value: "preview", label: "Preview"},
        {key: "output", value: "output", label: "Output"},
      ],
      onChange: (value) => enums.push(value),
    })
    const outputOption = enumInput.refs.options.get("output")
    enumInput.update({...enumInput.props, options: [...enumInput.props.options].reverse()})
    expect(enumInput.refs.options.get("output")).toBe(outputOption)
    enumInput.element.value = "preview"
    enumInput.element.dispatchEvent(new Event("change", {bubbles: true}))
    expect(enums).toEqual(["preview"])

    let activated = 0
    const reference = createReferenceInput(document, {value: {id: "mat", label: "Material"}, onActivate: () => { activated += 1 }, onClear() {}})
    reference.refs.valueButton.click()
    expect(activated).toBe(1)
    const paths: string[] = []
    const path = createPathInput(document, {value: "/out", onInput: (value) => paths.push(value), onBrowse() {}})
    path.refs.input.value = "/render"
    path.refs.input.dispatchEvent(new Event("input", {bubbles: true}))
    expect(paths).toEqual(["/render"])

    const selected: string[] = []
    const collection = createCollectionInput(document, {
      selectedId: "b",
      items: [{id: "a", label: "A"}, {id: "b", label: "B"}],
      onSelect: (id) => selected.push(id),
      onAdd() {},
      onRemove() {},
    })
    const a = collection.refs.items.get("a")
    const b = collection.refs.items.get("b")
    collection.update({...collection.props, items: [...collection.props.items].reverse()})
    expect(collection.refs.items.get("a")).toBe(a)
    expect(collection.refs.items.get("b")).toBe(b)
    collection.refs.itemButtons.get("a")?.click()
    expect(selected).toEqual(["a"])
  })

  test("retains keyed List and Table rows and cells", () => {
    const document = createDocument()
    const list = createList(document, {selectedKey: "b", items: [{key: "a", label: "A"}, {key: "b", label: "B"}]})
    const itemA = list.refs.items.get("a")
    list.update({...list.props, items: [...list.props.items].reverse()})
    expect(list.refs.items.get("a")).toBe(itemA)

    const table = createTable(document, {
      columns: [{key: "name", label: "Name"}, {key: "value", label: "Value"}],
      rows: [{key: "first", cells: {name: "Output", value: "42"}}],
    })
    const row = table.refs.rows.get("first")
    const cell = table.refs.cells.get("first")?.get("name")
    table.update({...table.props, rows: [{key: "first", cells: {name: "Preview", value: "43"}}]})
    expect(table.refs.rows.get("first")).toBe(row)
    expect(table.refs.cells.get("first")?.get("name")).toBe(cell)
    expect(cell?.textContent).toBe("Preview")
  })

  test("keeps ColorInput controlled with stable channel inputs", () => {
    const document = createDocument()
    const proposals: number[] = []
    const color = createColorInput(document, {value: {r: 0.2, g: 0.4, b: 0.6, a: 1}, presentation: "open", onInput: (value) => proposals.push(value.r)})
    const red = color.refs.rangeInputs.get("r")!
    color.update({...color.props, value: {r: 0.3, g: 0.4, b: 0.6, a: 1}})
    expect(color.refs.rangeInputs.get("r")).toBe(red)
    red.valueAsNumber = 0.7
    red.dispatchEvent(new Event("input", {bubbles: true}))
    expect(proposals).toHaveLength(1)
    expect(proposals[0]).toBeCloseTo(0.7)
    expect(color.props.value.r).toBe(0.3)
  })

  test("uses renderer-supported attribute states and compact metrics", () => {
    const css = [buttonCss, paneCss, textFieldCss, checkboxCss, switcherCss, numberInputCss, sliderControlCss, controlGroupCss, colorInputCss, fieldCss, hudCss, dividerCss].join("\n")
    expect(css).not.toContain(":hover")
    expect(css).not.toContain(":active")
    expect(css).not.toContain(":focus")
    expect(css).not.toContain(":checked")
    expect(css).not.toContain("calc(")
    expect(css).not.toContain("outline:")
    expect(css).toContain('[data-ui-state="hover"]')
    expect(buttonCss).toContain("width: 92px")
    expect(buttonCss).toContain("width: 76px")
    expect(buttonCss).toContain("width: 112px")
    expect(fieldCss).toContain("min-height: 28px")
    expect(hudCss).toContain("height: 28px")
  })
})
