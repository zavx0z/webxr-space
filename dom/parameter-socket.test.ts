import {describe, expect, test} from "bun:test"
import {
  createDocument,
  HTMLButtonElement,
  HTMLDivElement,
  HTMLInputElement,
  HTMLSelectElement,
  InputEvent,
  MouseEvent,
  Text,
} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {
  createParameterSocket,
  parameterSocketCss,
  parameterSocketDefaultProps,
  type ParameterSocketProps,
} from "./parameter-socket.ts"

describe("node-specific DOM Parameter/Socket composition", () => {
  test("creates exact keyed label/input and Socket rows", () => {
    const controller = createParameterSocket(createDocument())
    const {root, header, headerText, list} = controller.refs
    const name = controller.parameterRefs("name")!
    const strength = controller.parameterRefs("strength")!
    const left = strength.socketRefs("strength-input")!
    const right = strength.socketRefs("strength-output")!

    expect(controller.element).toBe(root)
    expect(root.localName).toBe("section")
    expect(root.className).toBe("parameter-socket")
    expect(root.getAttribute("style")).toBe("width: 420px")
    expect(root.getAttribute("data-parameter-count")).toBe("2")
    expect(header.localName).toBe("header")
    expect(headerText).toBeInstanceOf(Text)
    expect(headerText.data).toBe("Parameters")
    expect(list).toBeInstanceOf(HTMLDivElement)
    expect(list.childNodes).toEqual([name.row, strength.row])
    expect(name.input).toBeInstanceOf(HTMLInputElement)
    expect(name.label.localName).toBe("label")
    expect(name.label.getAttribute("for")).toBe(name.controlId)
    expect(name.input.id).toBe(name.controlId)
    expect(name.input.getAttribute("aria-labelledby")).toBe(name.label.id)
    expect(name.labelText.data).toBe("Name")
    expect(name.input.type).toBe("text")
    expect(name.input.value).toBe("Output")
    expect(name.row.childNodes).toEqual([
      name.socketRefs("name-input")!.button,
      name.label,
      name.input,
    ])
    expect(left.button).toBeInstanceOf(HTMLButtonElement)
    expect(right.button).toBeInstanceOf(HTMLButtonElement)
    expect(left.button.getAttribute("data-side")).toBe("left")
    expect(right.button.getAttribute("data-side")).toBe("right")
    expect(right.button.getAttribute("aria-pressed")).toBe("true")
    expect(left.text.data).toBe("Strength input")
    expect(strength.row.childNodes).toEqual([left.button, strength.label, strength.input, right.button])
    expect(controller.props).toEqual(parameterSocketDefaultProps)
    expect(Object.isFrozen(controller.props)).toBeTrue()
    expect(Object.isFrozen(controller.props.parameters)).toBeTrue()
    expect(Object.isFrozen(controller.props.parameters[1]?.sockets)).toBeTrue()
  })

  test("reconciles Parameter and Socket keys while preserving generated control identity", () => {
    const controller = createParameterSocket(createDocument())
    const fixed = controller.refs
    const name = controller.parameterRefs("name")!
    const strength = controller.parameterRefs("strength")!
    const output = strength.socketRefs("strength-output")!
    const removedInput = strength.socketRefs("strength-input")!
    const next: ParameterSocketProps = {
      ...controller.props,
      title: "Node parameters",
      width: 460,
      parameters: [
        {
          ...controller.props.parameters[1]!,
          label: "Gain",
          value: "1.25",
          sockets: [
            {...controller.props.parameters[1]!.sockets[1]!, selected: false},
          ],
        },
        {
          id: "mode",
          fieldKind: "text",
          variant: "output",
          label: "Mode",
          title: "Mode parameter",
          value: "Preview",
          checked: false,
          type: "text",
          options: [],
          placeholder: "",
          min: "",
          max: "",
          step: "",
          controlVisible: true,
          connected: false,
          disabled: false,
          readOnly: true,
          sockets: [{
            id: "mode-output",
            side: "right",
            kind: "menu",
            direction: "output",
            label: "Mode output",
            title: "Mode output Socket",
            selected: true,
            disabled: false,
          }],
        },
        {...controller.props.parameters[0]!, value: "Result"},
      ],
    }

    controller.update(next)

    const mode = controller.parameterRefs("mode")!
    expect(controller.refs).toBe(fixed)
    expect(controller.parameterRefs("strength")).toBe(strength)
    expect(controller.parameterRefs("name")).toBe(name)
    expect(strength.labelText.data).toBe("Gain")
    expect(strength.input.value).toBe("1.25")
    expect(strength.controlId).toBe(controller.parameterRefs("strength")!.controlId)
    expect(strength.socketRefs("strength-output")).toBe(output)
    expect(strength.socketRefs("strength-input")).toBeNull()
    expect(removedInput.button.parentNode).toBeNull()
    expect(mode.input.readOnly).toBeTrue()
    expect(controller.refs.list.childNodes).toEqual([strength.row, mode.row, name.row])

    controller.update({
      ...controller.props,
      parameters: controller.props.parameters.filter(({id}) => id !== "name"),
    })
    expect(name.row.parentNode).toBeNull()
    controller.update({
      ...controller.props,
      parameters: [...controller.props.parameters, parameterSocketDefaultProps.parameters[0]!],
    })
    const recreatedName = controller.parameterRefs("name")!
    expect(recreatedName).not.toBe(name)
    expect(recreatedName.input).not.toBe(name.input)
    expect(recreatedName.controlId).not.toBe(name.controlId)
  })

  test("keeps native input and Socket click bubbling while props remain controlled", () => {
    const document = createDocument()
    const host = document.createElement("div")
    const controller = createParameterSocket(document)
    const name = controller.parameterRefs("name")!
    const socket = controller.parameterRefs("strength")!.socketRefs("strength-input")!
    const props = controller.props
    const events: string[] = []
    document.appendChild(host)
    host.appendChild(controller.element)
    host.addEventListener("input", (event) => events.push(event.type))
    host.addEventListener("click", (event) => events.push(event.type))

    name.input.value = "Live value"
    name.input.dispatchEvent(new InputEvent("input", {bubbles: true, data: "e", inputType: "insertText"}))
    socket.button.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}))
    expect(events).toEqual(["input", "click"])
    expect(controller.props).toBe(props)
    expect(controller.props.parameters[0]?.value).toBe("Output")
    expect(controller.props.parameters[1]?.sockets[0]?.selected).toBeFalse()

    controller.update({
      ...controller.props,
      parameters: controller.props.parameters.map((parameter) => parameter.id === "name"
        ? {...parameter, value: name.input.value}
        : {
            ...parameter,
            sockets: parameter.sockets.map((entry) => ({
              ...entry,
              selected: entry.id === "strength-input",
            })),
          }),
    })
    expect(controller.props.parameters[0]?.value).toBe("Live value")
    expect(socket.button.getAttribute("aria-pressed")).toBe("true")
    expect(events).toHaveLength(2)
  })

  test("uses native number sanitation without replacing the input", () => {
    const controller = createParameterSocket(createDocument())
    const strength = controller.parameterRefs("strength")!
    const input = strength.input
    controller.update({
      ...controller.props,
      parameters: controller.props.parameters.map((parameter) => parameter.id === "strength"
        ? {...parameter, value: "not-a-number"}
        : parameter),
    })
    expect(strength.input).toBe(input)
    expect(strength.input.value).toBe("")
    expect(controller.props.parameters.find(({id}) => id === "strength")?.value).toBe("")
  })

  test("projects checkbox/select/composite variant data through standard controls", () => {
    const controller = createParameterSocket(createDocument())
    const name = controller.props.parameters[0]!
    const strength = controller.props.parameters[1]!
    controller.update({
      ...controller.props,
      parameters: [
        {
          ...name,
          id: "boolean-field",
          fieldKind: "boolean",
          variant: "field",
          label: "Boolean",
          value: "true",
          checked: true,
          type: "checkbox",
          sockets: [],
        },
        {
          ...strength,
          id: "enum-output",
          fieldKind: "enum",
          variant: "output",
          label: "Enum",
          value: "multiply",
          checked: false,
          type: "select",
          options: [
            {value: "add", label: "Add", disabled: false},
            {value: "multiply", label: "Multiply", disabled: false},
          ],
          min: "",
          max: "",
          step: "",
          sockets: [{...strength.sockets[1]!, id: "enum-output-socket", kind: "menu"}],
        },
        {
          ...name,
          id: "text-connected",
          fieldKind: "text",
          variant: "connected",
          label: "Connected",
          connected: true,
          readOnly: true,
          sockets: [{...name.sockets[0]!, id: "text-connected-input", selected: true}],
        },
      ],
    })

    const checkbox = controller.parameterRefs("boolean-field")!
    const select = controller.parameterRefs("enum-output")!
    const connected = controller.parameterRefs("text-connected")!
    expect(checkbox.input.type).toBe("checkbox")
    expect(checkbox.input.checked).toBeTrue()
    expect(checkbox.activeControl()).toBe(checkbox.input)
    expect(select.select).toBeInstanceOf(HTMLSelectElement)
    expect(select.activeControl()).toBe(select.select)
    expect(select.label.getAttribute("for")).toBe(select.selectControlId)
    expect([...select.select.options].map(({value, label}) => ({value, label}))).toEqual([
      {value: "add", label: "Add"},
      {value: "multiply", label: "Multiply"},
    ])
    expect(select.select.value).toBe("multiply")
    expect(select.socketRefs("enum-output-socket")?.button.getAttribute("data-socket-kind")).toBe("menu")
    expect(select.socketRefs("enum-output-socket")?.button.getAttribute("data-direction")).toBe("output")
    expect(connected.row.getAttribute("data-connected")).toBe("true")
    expect(connected.input.hasAttribute("hidden")).toBeTrue()
  })

  test("rejects duplicate keys, duplicate sides and malformed definitions before mutation", () => {
    const controller = createParameterSocket(createDocument())
    const props = controller.props
    const children = [...controller.refs.list.childNodes]
    const name = controller.parameterRefs("name")!

    expect(() => controller.update({
      ...controller.props,
      parameters: [controller.props.parameters[0]!, {...controller.props.parameters[0]!}],
    })).toThrow("ParameterSocket Parameter id must be unique: name")
    expect(() => controller.update({
      ...controller.props,
      parameters: controller.props.parameters.map((parameter) => parameter.id === "strength"
        ? {...parameter, sockets: [parameter.sockets[0]!, {...parameter.sockets[0]!, id: "other"}]}
        : parameter),
    })).toThrow("ParameterSocket Parameter strength has duplicate left Socket")
    expect(() => controller.update({
      ...controller.props,
      parameters: controller.props.parameters.map((parameter) => parameter.id === "name"
        ? {...parameter, type: "email" as never}
        : parameter),
    })).toThrow("ParameterSocket Parameter name type is invalid")
    expect(controller.props).toBe(props)
    expect(controller.refs.list.childNodes).toEqual(children)
    expect(controller.parameterRefs("name")).toBe(name)
  })

  test("renders exact labels, controls and selected Socket without parallel UI owners", () => {
    const document = createDocument()
    const controller = createParameterSocket(document)
    document.appendChild(controller.element)
    const renderer = createDocumentRenderer({
      document,
      root: controller.element,
      viewport: {width: 560, height: 300},
      styleSheets: [parameterSocketCss],
    })
    const frame = renderer.flush()
    const input = controller.parameterRefs("name")!.input
    const selectedSocket = controller.parameterRefs("strength")!.socketRefs("strength-output")!.button
    expect(frame.boxByNode.get(input)).toBeDefined()
    expect(frame.hits.get(input)).toMatchObject({interactive: true, role: "textbox"})
    expect(frame.hits.get(selectedSocket)).toMatchObject({interactive: true, role: "button"})
    expect(frame.displayList.filter((item) => item.kind === "text").map((item) => item.text))
      .toEqual(expect.arrayContaining(["Parameters", "Name", "Strength", "Output", "0.75"]))
    expect(renderer.flush()).toBe(frame)
    renderer.dispose()
  })

  test("disposes without removing consumer DOM and keeps the leaf private", async () => {
    const document = createDocument()
    const host = document.createElement("div")
    const controller = createParameterSocket(document)
    document.appendChild(host)
    host.appendChild(controller.element)
    const source = await Bun.file(new URL("./parameter-socket.ts", import.meta.url)).text()
    const requirements = await Bun.file(new URL("../requirements.md", import.meta.url)).text()
    const manifest = await Bun.file(new URL("../package.json", import.meta.url)).json() as {
      dependencies: Record<string, string>
      exports: Record<string, string>
    }

    controller.dispose()
    controller.dispose()
    expect(controller.element.parentNode).toBe(host)
    expect(() => controller.update({...controller.props, title: "Disposed"}))
      .toThrow("ParameterSocket controller is disposed")
    expect(source).toContain('from "@zavx0z/dom"')
    for (const forbidden of [
      "@ui/components",
      "field-stories",
      "@engine/core",
      "@layout/core",
      "@ui/elements",
      "@zavx0z/renderer",
      "UiSurface",
      "addEventListener",
      "dispatchEvent",
      "onValueChange",
      "onSocketClick",
    ]) expect(source).not.toContain(forbidden)
    expect(manifest.dependencies["@zavx0z/dom"]).toBe("link:@zavx0z/dom")
    expect(manifest.exports["./dom/parameter-socket"]).toBeUndefined()
    expect(manifest.exports["./parameter-socket"]).toBe("./dom/parameter-socket.ts")
    expect(requirements).toContain("NODES-UI-DOM-PARAMETER-001")
  })
})
