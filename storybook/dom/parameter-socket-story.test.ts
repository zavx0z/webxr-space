import {describe, expect, test} from "bun:test"
import {
  createDocument,
  InputEvent,
  MouseEvent,
} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {parameterSocketCss} from "../../dom/parameter-socket.ts"
import {
  createParameterSocketStory,
  parameterSocketStoryDefaultProps,
} from "./parameter-socket-story.ts"

describe("package-owned Parameter/Socket DOM story", () => {
  test("publishes exact both-side native composition and live source", () => {
    const story = createParameterSocketStory(createDocument())
    const parameter = story.parameterRefs("text")!
    const input = parameter.socketRefs("text-input")!
    const output = parameter.socketRefs("text-output")!
    const source = story.source()

    expect(story.props).toEqual(parameterSocketStoryDefaultProps)
    expect(parameter.input.value).toBe("Output")
    expect(parameter.row.childNodes).toEqual([input.button, parameter.label, parameter.input, output.button])
    expect(input.button.getAttribute("data-side")).toBe("left")
    expect(output.button.getAttribute("data-side")).toBe("right")
    expect(output.button.getAttribute("aria-pressed")).toBe("true")
    expect(source.html).toContain('data-parameter-id="text"')
    expect(source.html).toContain('data-socket-id="text-input"')
    expect(source.html).toContain('data-socket-id="text-output"')
    expect(source.html).not.toContain(' value="Output"')
    expect(source.html).not.toContain("</input>")
    expect(Object.keys(source).sort()).toEqual(["html", "typescript"])
    expect(story.componentRoot.readStyleSheets()).toEqual({revision: 0, styleSheets: []})
    expect(source.typescript).toContain('from "../../dom/parameter-socket.ts"')
    expect(source.typescript).toContain('"value": "Output"')
    expect(source.typescript).toContain('addEventListener("input"')
    expect(source.typescript).toContain('addEventListener("click"')
  })

  test("controls native input value without replacing Parameter identities", () => {
    const document = createDocument()
    const host = document.createElement("div")
    const story = createParameterSocketStory(document)
    const parameter = story.parameterRefs("text")!
    const input = parameter.input
    const events: string[] = []
    document.appendChild(host)
    host.appendChild(story.element)
    host.addEventListener("input", (event) => events.push(event.type))

    input.value = "Live Output"
    input.dispatchEvent(new InputEvent("input", {bubbles: true, data: "t", inputType: "insertText"}))

    expect(events).toEqual(["input"])
    expect(story.parameterRefs("text")).toBe(parameter)
    expect(parameter.input).toBe(input)
    expect(story.props.parameters[0]?.value).toBe("Live Output")
    expect(story.source().html).not.toContain('value="Live Output"')
    expect(story.source().typescript).toContain('"value": "Live Output"')
  })

  test("controls one selected Socket through cancelable standard click", () => {
    const document = createDocument()
    const host = document.createElement("div")
    const story = createParameterSocketStory(document)
    const parameter = story.parameterRefs("text")!
    const input = parameter.socketRefs("text-input")!
    const output = parameter.socketRefs("text-output")!
    const fabricated: string[] = []
    document.appendChild(host)
    host.appendChild(story.element)
    for (const type of ["input", "change", "selectionchange"]) {
      host.addEventListener(type, (event) => fabricated.push(event.type))
    }

    const cancel = (event: import("@zavx0z/dom").Event): void => event.preventDefault()
    host.addEventListener("click", cancel, {capture: true})
    input.button.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}))
    expect(output.button.getAttribute("aria-pressed")).toBe("true")
    expect(input.button.getAttribute("aria-pressed")).toBe("false")

    host.removeEventListener("click", cancel, {capture: true})
    input.button.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}))
    expect(input.button.getAttribute("aria-pressed")).toBe("true")
    expect(output.button.getAttribute("aria-pressed")).toBe("false")
    expect(story.props.parameters[0]?.sockets.filter(({selected}) => selected).map(({id}) => id))
      .toEqual(["text-input"])
    expect(fabricated).toEqual([])
  })

  test("preserves keyed refs across controlled owner updates", () => {
    const story = createParameterSocketStory(createDocument())
    const refs = story.refs
    const parameter = story.parameterRefs("text")!
    const inputSocket = parameter.socketRefs("text-input")!
    const outputSocket = parameter.socketRefs("text-output")!

    story.update({
      ...story.props,
      width: 460,
      parameters: [{
        ...story.props.parameters[0]!,
        label: "Строка",
        value: "Updated",
        sockets: [...story.props.parameters[0]!.sockets].reverse(),
      }],
    })

    expect(story.refs).toBe(refs)
    expect(story.parameterRefs("text")).toBe(parameter)
    expect(parameter.socketRefs("text-input")).toBe(inputSocket)
    expect(parameter.socketRefs("text-output")).toBe(outputSocket)
    expect(parameter.labelText.data).toBe("Строка")
    expect(parameter.input.value).toBe("Updated")
    expect(parameter.row.childNodes).toEqual([inputSocket.button, parameter.label, parameter.input, outputSocket.button])
  })

  test("renders native standard control and selected Socket runtime state", () => {
    const document = createDocument()
    const story = createParameterSocketStory(document)
    document.appendChild(story.element)
    const renderer = createDocumentRenderer({
      document,
      root: story.element,
      viewport: {width: 560, height: 260},
      styleSheets: [parameterSocketCss],
    })
    const frame = renderer.flush()
    const parameter = story.parameterRefs("text")!
    const output = parameter.socketRefs("text-output")!.button
    expect(frame.hits.get(parameter.input)).toMatchObject({interactive: true, role: "textbox"})
    expect(frame.hits.get(output)).toMatchObject({interactive: true, role: "button"})
    expect(frame.displayList.filter((item) => item.kind === "text").map((item) => item.text))
      .toEqual(expect.arrayContaining(["Parameter · Text · Both", "Текст", "Output"]))
    expect(renderer.flush()).toBe(frame)
    renderer.dispose()
  })

  test("disposes private story behavior without retained owner imports", async () => {
    const document = createDocument()
    const host = document.createElement("div")
    const story = createParameterSocketStory(document)
    const input = story.parameterRefs("text")!.input
    document.appendChild(host)
    host.appendChild(story.element)
    const props = story.props
    story.dispose()
    story.dispose()
    input.value = "Ignored"
    input.dispatchEvent(new InputEvent("input", {bubbles: true}))
    expect(story.element.parentNode).toBe(host)
    expect(story.props).toBe(props)
    expect(() => story.update({...story.props, title: "Disposed"}))
      .toThrow("ParameterSocketStory controller is disposed")

    const source = await Bun.file(new URL("./parameter-socket-story.ts", import.meta.url)).text()
    const manifest = await Bun.file(new URL("../../package.json", import.meta.url)).json() as {
      exports: Record<string, string>
    }
    for (const forbidden of [
      "@ui/components",
      "field-stories",
      "@engine/core",
      "@layout/core",
      "@ui/elements",
      "@zavx0z/renderer",
      "UiSurface",
    ]) expect(source).not.toContain(forbidden)
    expect(manifest.exports["./storybook/dom/parameter-socket-story"]).toBeUndefined()
    expect(Object.values(manifest.exports)).not.toContain("./storybook/dom/parameter-socket-story.ts")
  })
})
