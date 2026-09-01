import {describe, expect, test} from "bun:test"
import {createDocument, InputEvent, type HTMLInputElement} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {
  createParameter,
  parameterCss,
  type ParameterDefinition,
} from "./parameter.ts"

// @ts-expect-error Node Parameters never expose a caller-owned Field style channel
const typedStyleRegression: ParameterDefinition = {id: "typed", kind: "number", label: "Typed", value: 1, style: undefined}
void typedStyleRegression

describe("embedded DOM Parameter", () => {
  test("uses the exact VectorField and stable typed Socket endpoints", () => {
    const values: (readonly number[])[] = []
    const document = createDocument()
    const controller = createParameter(document, {
      id: "vector",
      kind: "vector",
      label: "Vector",
      value: [1, 2, 3],
      onChange: (value) => values.push(value),
      sockets: [
        {id: "vector-in", kind: "vector", direction: "input", side: "left", label: "Vector input"},
        {id: "vector-out", kind: "vector", direction: "output", side: "right", label: "Vector output"},
      ],
    })
    const field = controller.refs.field
    const x = field.querySelector('[data-control-key="X"] input') as HTMLInputElement
    const left = controller.refs.socket("vector-in")!
    const right = controller.refs.socket("vector-out")!
    expect(field.getAttribute("data-field-kind")).toBe("vector")
    expect([...field.querySelectorAll("[data-control-key]")].map((element) => element.getAttribute("data-control-key")))
      .toEqual(["X", "Y", "Z"])
    expect(controller.element.childNodes).toEqual([left.element, field, right.element])

    x.value = "9"
    x.dispatchEvent(new InputEvent("input", {bubbles: true}))
    expect(values).toEqual([[9, 2, 3]])
    expect(controller.definition.kind === "vector" && controller.definition.value).toEqual([1, 2, 3])
    controller.update({...controller.definition, connected: true})
    expect(controller.refs.field).toBe(field)
    expect(controller.refs.socket("vector-in")).toBe(left)
    expect(controller.refs.socket("vector-out")).toBe(right)
    expect(field.querySelector('[role="group"]')!.hasAttribute("hidden")).toBeTrue()
    controller.update({...controller.definition, connected: false})
    expect(field.querySelector('[role="group"]')!.hasAttribute("hidden")).toBeFalse()
  })

  test("keeps a connected Parameter label and Socket while hidden controls neither paint nor hit", () => {
    const document = createDocument()
    const controller = createParameter(document, {
      id: "vector",
      kind: "vector",
      label: "Vector",
      value: [0, 0, 0],
      sockets: [{id: "vector-in", kind: "vector", direction: "input", side: "left", label: "Vector"}],
      connected: true,
    })
    document.appendChild(controller.element)
    const control = controller.refs.field.querySelector('[role="group"]')!
    const inputs = [...control.querySelectorAll("input")]
    const renderer = createDocumentRenderer({
      document,
      root: controller.element,
      viewport: {width: 220, height: 40},
      styleSheets: [parameterCss],
    })
    const frame = renderer.flush()
    const texts = frame.displayList.filter((item) => item.kind === "text").map((item) => item.text)

    expect(control.hasAttribute("hidden")).toBeTrue()
    expect(frame.boxByNode.has(control)).toBeFalse()
    expect(inputs.every((input) => !frame.boxByNode.has(input) && !frame.hits.has(input))).toBeTrue()
    expect(texts).toEqual(["Vector"])
    expect(frame.hits.get(controller.refs.socket("vector-in")!.element)).toBeDefined()
    renderer.dispose()
  })

  test("renders exact composite Field controls and rejects duplicate sides", () => {
    const document = createDocument()
    const controller = createParameter(document, {
      id: "color",
      kind: "color",
      label: "Color",
      value: {r: 1, g: .5, b: .25, a: 1},
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
    expect([...controller.refs.field.querySelectorAll("[data-color-channel]")]
      .map((element) => element.getAttribute("data-color-channel")))
      .toEqual(["h", "s", "v", "a"])
    expect(frame.displayList.filter((item) => item.kind === "text").map((item) => item.text))
      .toEqual(expect.arrayContaining(["Color", "H", "S", "V", "A"]))
    renderer.dispose()
    expect(() => controller.update({
      ...controller.definition,
      sockets: [
        {id: "a", kind: "color", direction: "input", side: "left", label: "A"},
        {id: "b", kind: "color", direction: "input", side: "left", label: "B"},
      ],
    })).toThrow("duplicate left Socket")
  })

  test("retains the concrete Field root across value updates and rejects kind changes", () => {
    const controller = createParameter(createDocument(), {
      id: "value",
      kind: "number",
      label: "Value",
      value: 1,
    })
    const field = controller.refs.field
    const number = field.querySelector("input")

    controller.update({
      id: "value",
      kind: "number",
      label: "Value",
      value: 2,
    })

    expect(controller.refs.field).toBe(field)
    expect(field.getAttribute("data-field-kind")).toBe("number")
    expect(field.querySelector("input")).toBe(number)
    expect((field.querySelector("input") as HTMLInputElement).valueAsNumber).toBe(2)
    expect(field.className).toBe("")
    expect(() => controller.update({
      id: "value",
      kind: "boolean",
      label: "Value",
      value: true,
    })).toThrow("Parameter Field kind cannot change: number -> boolean")
  })

  test("rejects a forged Field style before mutating the concrete Field", () => {
    const controller = createParameter(createDocument(), {
      id: "value",
      kind: "number",
      label: "Value",
      value: 1,
    })
    const field = controller.refs.field
    const input = field.querySelector("input") as HTMLInputElement
    const style = field.getAttribute("style")
    const forged = {
      ...controller.definition,
      value: 2,
      style: "& { color: red; }",
    } as unknown as ParameterDefinition

    expect(() => controller.update(forged)).toThrow("Parameter value style is not allowed")
    expect(controller.refs.field).toBe(field)
    expect(field.getAttribute("style")).toBe(style)
    expect(field.querySelector("input")).toBe(input)
    expect(input.valueAsNumber).toBe(1)
    expect(controller.definition.kind === "number" && controller.definition.value).toBe(1)
  })
})
