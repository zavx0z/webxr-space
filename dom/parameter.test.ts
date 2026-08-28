import {describe, expect, test} from "bun:test"
import {createDocument, InputEvent} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createParameter, parameterCss} from "./parameter.ts"

describe("embedded DOM Parameter", () => {
  test("uses the exact shared vector Field and stable typed Socket endpoints", () => {
    const values: (readonly number[])[] = []
    const document = createDocument()
    const controller = createParameter(document, {
      id: "vector",
      field: {
        id: "vector",
        kind: "vector",
        label: "Vector",
        value: [1, 2, 3],
        onChange: (value) => values.push(value),
      },
      sockets: [
        {id: "vector-in", kind: "vector", direction: "input", side: "left", label: "Vector input"},
        {id: "vector-out", kind: "vector", direction: "output", side: "right", label: "Vector output"},
      ],
    })
    const field = controller.refs.field
    const x = field.refs.inputs.get("0")!
    const left = controller.refs.socket("vector-in")!
    const right = controller.refs.socket("vector-out")!
    expect(field.definition.kind).toBe("vector")
    expect([...field.refs.inputs.keys()]).toEqual(["0", "1", "2"])
    expect(controller.element.childNodes).toEqual([left.element, field.element, right.element])

    x.value = "9"
    x.dispatchEvent(new InputEvent("input", {bubbles: true}))
    expect(values).toEqual([[9, 2, 3]])
    controller.update({...controller.definition, connected: true})
    expect(controller.refs.field).toBe(field)
    expect(controller.refs.socket("vector-in")).toBe(left)
    expect(controller.refs.socket("vector-out")).toBe(right)
    expect(field.refs.control.hasAttribute("hidden")).toBeTrue()
    controller.update({...controller.definition, connected: false})
    expect(field.refs.control.hasAttribute("hidden")).toBeFalse()
  })

  test("renders exact composite Field controls and rejects duplicate sides", () => {
    const document = createDocument()
    const controller = createParameter(document, {
      id: "color",
      field: {id: "color", kind: "color", label: "Color", value: {r: 1, g: .5, b: .25, a: 1}},
      sockets: [{id: "color-in", kind: "color", direction: "input", side: "left", label: "Color"}],
    })
    document.appendChild(controller.element)
    const renderer = createDocumentRenderer({
      document,
      root: controller.element,
      viewport: {width: 280, height: 80},
      styleSheets: [parameterCss],
    })
    const frame = renderer.flush()
    expect([...controller.refs.field.refs.inputs.keys()]).toEqual(["r", "g", "b", "a"])
    expect(frame.displayList.filter((item) => item.kind === "text").map((item) => item.text))
      .toEqual(expect.arrayContaining(["Color", "R", "G", "B", "A"]))
    renderer.dispose()
    expect(() => controller.update({
      ...controller.definition,
      sockets: [
        {id: "a", kind: "color", direction: "input", side: "left", label: "A"},
        {id: "b", kind: "color", direction: "input", side: "left", label: "B"},
      ],
    })).toThrow("duplicate left Socket")
  })
})
