import {describe, expect, test} from "bun:test"
import {createDocument, MouseEvent} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {createNode, nodeCss, type NodeDefinition} from "./node.ts"

function noiseNode(actions: string[]): NodeDefinition {
  return {
    id: "noise",
    label: "Noise Texture",
    title: "Noise Texture",
    headerColor: "#5b466b",
    x: 20,
    y: 30,
    width: 220,
    height: 270,
    selected: true,
    collapsed: false,
    onCollapseChange: (collapsed) => actions.push(`collapse:${collapsed}`),
    preview: {
      enabled: true,
      image: {src: "data:image/png;base64,AA==", width: 320, height: 180, alt: "Noise"},
      onToggle: (enabled) => actions.push(`preview:${enabled}`),
    },
    properties: [{
      id: "operation",
      kind: "enum",
      label: "Dimensions",
      value: "3d",
      options: [{value: "2d", label: "2D"}, {value: "3d", label: "3D"}],
    }],
    parameters: [{
      id: "vector",
      field: {id: "vector", kind: "vector", label: "Vector", value: [0, 0, 0]},
      sockets: [{id: "vector-in", kind: "vector", direction: "input", side: "left", label: "Vector"}],
    }, {
      id: "scale",
      field: {id: "scale", kind: "number", label: "Scale", value: 5},
      sockets: [{id: "scale-in", kind: "float", direction: "input", side: "left", label: "Scale"}],
    }],
    sockets: [{id: "color-out", kind: "color", direction: "output", side: "right", label: "Color"}],
  }
}

describe("Blender-like standard-DOM Node", () => {
  test("restores compact header, preview, shared Fields and typed endpoints", () => {
    const actions: string[] = []
    const controller = createNode(createDocument(), noiseNode(actions))
    expect(controller.element.localName).toBe("article")
    expect(controller.element.getAttribute("style")).toContain("box-shadow: 0 0 12px #5b466b")
    expect(controller.refs.header.getAttribute("style")).toBe("background: #5b466b")
    expect(controller.refs.collapseText.data).toBe("▾")
    expect(controller.refs.preview.hasAttribute("hidden")).toBeFalse()
    expect(controller.refs.property("operation")?.definition.kind).toBe("enum")
    expect(controller.refs.parameter("vector")?.refs.field.definition.kind).toBe("vector")
    expect([...controller.refs.parameter("vector")!.refs.field.refs.inputs.keys()]).toEqual(["0", "1", "2"])
    expect(controller.refs.socket("vector-in")?.definition.kind).toBe("vector")
    expect(controller.refs.socket("color-out")?.definition.kind).toBe("color")
    expect(controller.refs.socket("color-out")?.refs.button.getAttribute("style")).toContain("#ebc73d")

    controller.refs.collapse.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}))
    controller.refs.previewToggle.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}))
    expect(actions).toEqual(["collapse:true", "preview:false"])
  })

  test("keeps keyed child identities through collapse, selection and value updates", () => {
    const controller = createNode(createDocument(), noiseNode([]))
    const root = controller.element
    const property = controller.refs.property("operation")!
    const vector = controller.refs.parameter("vector")!
    const vectorInput = vector.refs.field.refs.inputs.get("0")!
    const socket = controller.refs.socket("vector-in")!
    const next = noiseNode([])
    controller.update({
      ...next,
      selected: false,
      collapsed: true,
      parameters: next.parameters!.map((parameter) => {
        if (parameter.id !== "vector" || parameter.field.kind !== "vector") return parameter
        return {...parameter, field: {...parameter.field, value: [2, 3, 4]}}
      }),
    })
    expect(controller.element).toBe(root)
    expect(controller.refs.property("operation")).toBe(property)
    expect(controller.refs.parameter("vector")).toBe(vector)
    expect(vector.refs.field.refs.inputs.get("0")).toBe(vectorInput)
    expect(controller.refs.socket("vector-in")).toBe(socket)
    expect(controller.refs.body.hasAttribute("hidden")).toBeTrue()
    expect(controller.refs.collapseText.data).toBe("▸")
    expect(vectorInput.valueAsNumber).toBe(2)
  })

  test("renders the rich Node subtree with exact shared CSS", () => {
    const document = createDocument()
    const controller = createNode(document, noiseNode([]))
    document.appendChild(controller.element)
    const renderer = createDocumentRenderer({
      document,
      root: controller.element,
      viewport: {width: 360, height: 420},
      styleSheets: [nodeCss],
    })
    const frame = renderer.flush()
    const texts = frame.displayList.filter((item) => item.kind === "text").map((item) => item.text)
    expect(texts).toEqual(expect.arrayContaining(["Noise Texture", "Dimensions", "Vector", "Scale", "Color"]))
    expect(frame.hits.get(controller.refs.parameter("vector")!.refs.field.refs.inputs.get("0")!)).toBeDefined()
    expect(frame.hits.get(controller.refs.socket("color-out")!.element)).toBeDefined()
    expect(nodeCss).toContain("height: 24px")
    expect(nodeCss).toContain("box-shadow: 0 0 12px")
    renderer.dispose()
  })
})
