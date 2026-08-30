import {describe, expect, test} from "bun:test"
import {createDocument, Event, MouseEvent} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {parameterSocketCss} from "../../dom/parameter-socket.ts"
import {
  NODE_PARAMETER_FIELD_KINDS,
  NODE_PARAMETER_VARIANTS,
} from "../parameter-catalog.ts"
import {
  NODE_SOCKET_DIRECTIONS,
  NODE_SOCKET_KINDS,
} from "../socket-catalog.ts"
import {
  createParameterSocketRouteStory,
  type ParameterSocketDomRoute,
} from "./parameter-socket-route-story.ts"

const parameterRoutes = (): readonly ParameterSocketDomRoute[] => [
  "ui/parameter",
  ...NODE_PARAMETER_FIELD_KINDS.flatMap((kind) => [
    `ui/parameter/${kind}` as const,
    ...NODE_PARAMETER_VARIANTS.map((variant) => `ui/parameter/${kind}/${variant}` as const),
  ]),
]
const socketRoutes = (): readonly ParameterSocketDomRoute[] => [
  "ui/socket",
  ...NODE_SOCKET_KINDS.flatMap((kind) => [
    `ui/socket/${kind}` as const,
    ...NODE_SOCKET_DIRECTIONS.map((direction) => `ui/socket/${kind}/${direction}` as const),
  ]),
]

describe("complete Parameter/Socket DOM route family", () => {
  test("builds every 79 Parameter and 77 Socket overview/leaf from one controller", async () => {
    expect(parameterRoutes()).toHaveLength(79)
    expect(socketRoutes()).toHaveLength(77)
    for (const route of [...parameterRoutes(), ...socketRoutes()]) {
      const story = await createParameterSocketRouteStory(createDocument(), route)
      expect(story.element.className, route).toBe("parameter-socket")
      expect(story.props.parameters.length, route).toBeGreaterThan(0)
      expect(story.source().typescript, route).toContain("createParameterSocket")
      story.dispose()
    }
  })

  test("uses honest standard controls for scalar and composite Parameter data", async () => {
    const boolean = await createParameterSocketRouteStory(createDocument(), "ui/parameter/boolean/field")
    const booleanRefs = boolean.parameterRefs("boolean-field")!
    expect(booleanRefs.input.type).toBe("checkbox")
    expect(booleanRefs.input.checked).toBeTrue()
    booleanRefs.input.click()
    expect(boolean.props.parameters[0]).toMatchObject({value: "false", checked: false})

    const enumeration = await createParameterSocketRouteStory(createDocument(), "ui/parameter/enum/field")
    const enumRefs = enumeration.parameterRefs("enum-field")!
    expect(enumRefs.activeControl()).toBe(enumRefs.select)
    expect([...enumRefs.select.options].map(({value}) => value)).toEqual(["add", "multiply", "power"])
    enumRefs.select.value = "power"
    enumRefs.select.dispatchEvent(new Event("change", {bubbles: true}))
    expect(enumeration.props.parameters[0]?.value).toBe("power")

    const vector = await createParameterSocketRouteStory(createDocument(), "ui/parameter/vector/output")
    expect(vector.props.parameters[0]).toMatchObject({
      fieldKind: "vector",
      variant: "output",
      value: "1, 2, 3",
      type: "text",
    })
    expect(vector.props.parameters[0]?.sockets).toMatchObject([{side: "right", direction: "output", kind: "vector"}])
  })

  test("reflects connected Parameter and independent Socket kind/direction data", async () => {
    const connected = await createParameterSocketRouteStory(createDocument(), "ui/parameter/text/connected")
    const parameter = connected.parameterRefs("text-connected")!
    expect(connected.props.parameters[0]).toMatchObject({variant: "connected", connected: true, readOnly: true})
    expect(parameter.input.hasAttribute("hidden")).toBeTrue()
    expect(parameter.socketRefs("text-connected-input")?.button).toMatchObject({disabled: false})
    expect(parameter.socketRefs("text-connected-input")?.button.getAttribute("aria-pressed")).toBe("true")

    const kindOverview = await createParameterSocketRouteStory(createDocument(), "ui/socket/boolean")
    expect(kindOverview.props.parameters.map(({sockets}) => sockets[0]?.direction)).toEqual([
      "input", "output", "bidirectional",
    ])
    const bidirectional = await createParameterSocketRouteStory(createDocument(), "ui/socket/boolean/bidirectional")
    const socket = bidirectional.props.parameters[0]!.sockets[0]!
    const refs = bidirectional.parameterRefs("boolean-bidirectional")!.socketRefs(socket.id)!
    expect(socket).toMatchObject({kind: "boolean", direction: "bidirectional", side: "left"})
    expect(refs.button.getAttribute("data-socket-kind")).toBe("boolean")
    expect(refs.button.getAttribute("data-direction")).toBe("bidirectional")
    refs.button.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}))
    expect(bidirectional.props.parameters[0]?.sockets[0]?.selected).toBeTrue()
  })

  test("renders representative Parameter and Socket routes through the document renderer", async () => {
    for (const route of ["ui/parameter/enum/both", "ui/socket/boolean/input"] as const) {
      const document = createDocument()
      const story = await createParameterSocketRouteStory(document, route)
      document.appendChild(story.element)
      const renderer = createDocumentRenderer({
        document,
        root: story.element,
        viewport: {width: 720, height: 560},
        styleSheets: [parameterSocketCss],
      })
      const frame = renderer.flush()
      const refs = story.parameterRefs(story.props.parameters[0]!.id)!
      expect(frame.hits.get(refs.activeControl()), route).toBeDefined()
      expect(frame.displayList.filter((item) => item.kind === "text").map((item) => item.text), route)
        .toContain(story.props.parameters[0]!.label)
      renderer.dispose()
    }
  })

  test("keeps family data lazy and free of retained Field/Socket renderers", async () => {
    const routeStory = await Bun.file(new URL("./parameter-socket-route-story.ts", import.meta.url)).text()
    const parameterData = await Bun.file(new URL("./parameter-dom-data.ts", import.meta.url)).text()
    const socketData = await Bun.file(new URL("./socket-dom-data.ts", import.meta.url)).text()
    expect(routeStory).toContain('import("./parameter-dom-data.ts")')
    expect(routeStory).toContain('import("./socket-dom-data.ts")')
    for (const source of [routeStory, parameterData, socketData]) {
      for (const forbidden of [
        "@ui/components",
        "@ui/elements",
        "@layout/core",
        "@engine/core",
        "@nodes/ui/node",
        "@nodes/ui/parameter",
        "Field(",
        "socketRenderer",
        "parameterRenderer",
        "UiSurface",
      ]) expect(source).not.toContain(forbidden)
    }
  })
})
