/** Package-owned external Storybook story support. */
import {describe, expect, test} from "bun:test"
import {createDocument, type HTMLInputElement} from "@zavx0z/dom"
import {createStoryPropsInspector, fieldsFromProps} from "./props-inspector.tsx"

describe("UI Storybook Props Inspector", () => {
  test("renders the production Inspector and Field components from actual props", () => {
    const document = createDocument()
    const inspector = createStoryPropsInspector(
      document,
      {label: "Button", title: "Кнопка"},
      {label: "Output", disabled: false, size: 24, ratio: 0.5},
    )

    expect(inspector.element.localName).toBe("aside")
    expect(inspector.element.getAttribute("aria-label")).toBe("Инспектор свойств")
    expect(inspector.element.textContent).toContain("Button")
    expect(inspector.element.textContent).toContain("Свойства")
    expect(inspector.element.textContent).toContain("label")
    const values = [...inspector.element.querySelectorAll("input")]
      .map(input => (input as HTMLInputElement).value)
    expect(values).toContain("Output")
    expect(inspector.element.textContent).not.toContain("HTML")
    expect(inspector.element.textContent).not.toContain("CSS")
    expect(inspector.element.textContent).not.toContain("TypeScript")
    inspector.dispose()
  })

  test("updates one stable Inspector element for another component", () => {
    const document = createDocument()
    const inspector = createStoryPropsInspector(
      document,
      {label: "Button", title: "Кнопка"},
      {label: "Output"},
    )
    const element = inspector.element

    inspector.update({label: "Checkbox", title: "Флажок"}, {checked: true})

    expect(inspector.element).toBe(element)
    expect(element.textContent).toContain("Checkbox")
    expect(element.textContent).toContain("checked")
    expect(element.textContent).not.toContain("Output")
    inspector.dispose()
  })

  test("projects unsupported values as bounded read-only fields", () => {
    const fields = fieldsFromProps({
      value: {nested: [1, 2, 3]},
      callback: function activate() {},
      missing: undefined,
    })

    expect(fields.map(({kind}) => kind)).toEqual(["readonly", "readonly", "readonly"])
    expect(fields[1]).toMatchObject({value: "ƒ activate", readOnly: true})
    expect(fields[2]).toMatchObject({value: "undefined", readOnly: true})
  })
})
