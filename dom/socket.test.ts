import {describe, expect, test} from "bun:test"
import {createDocument, MouseEvent} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {
  SOCKET_KINDS,
  SOCKET_PRESETS,
  SOCKET_SHAPES,
  createSocket,
  socketCss,
} from "./socket.ts"

describe("Blender-like DOM Socket", () => {
  test("keeps the complete kind, shape and color inventory", () => {
    expect(SOCKET_KINDS).toHaveLength(19)
    expect(SOCKET_SHAPES).toEqual([
      "circle", "square", "diamond", "circle-dot", "square-dot", "diamond-dot", "line", "volume-grid",
    ])
    expect(Object.keys(SOCKET_PRESETS).sort()).toEqual([...SOCKET_KINDS].sort())
    expect(SOCKET_PRESETS.float).toMatchObject({color: "#9e9e9e", shape: "circle"})
    expect(SOCKET_PRESETS.rotation).toMatchObject({color: "#946be0", shape: "diamond"})
  })

  test("preserves endpoint identity and represents specialized shapes without rotate", () => {
    const document = createDocument()
    const controller = createSocket(document, {
      id: "rotation-input",
      kind: "rotation",
      direction: "input",
      side: "left",
      label: "Rotation",
      selected: false,
    })
    const refs = controller.refs
    expect(refs.button.getAttribute("data-shape")).toBe("diamond")
    expect(refs.glyphText.data).toBe("◆")
    expect(refs.button.getAttribute("style")).toContain("#946be0")
    controller.update({...controller.definition, selected: true, shape: "diamond-dot"})
    expect(controller.refs).toBe(refs)
    expect(refs.button.getAttribute("aria-pressed")).toBe("true")
    expect(refs.glyphText.data).toBe("◈")
    expect(socketCss).not.toContain("rotate(")
    expect(socketCss).not.toContain('$="-dot"')
  })

  test("uses a standard button event and renderer hit", () => {
    const document = createDocument()
    const controller = createSocket(document, {
      id: "value-output",
      kind: "float",
      direction: "output",
      side: "right",
      label: "Value",
    })
    const events: string[] = []
    controller.element.addEventListener("click", ({type}) => events.push(type))
    controller.element.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}))
    document.appendChild(controller.element)
    const renderer = createDocumentRenderer({
      document,
      root: controller.element,
      viewport: {width: 48, height: 48},
      styleSheets: [socketCss],
    })
    expect(events).toEqual(["click"])
    const frame = renderer.flush()
    const visual = frame.displayList.find((item) => item.kind === "rect" && item.node === controller.element)
    expect(frame.boxByNode.get(controller.element)).toMatchObject({width: 10, height: 10})
    expect(frame.hits.get(controller.element)).toBeDefined()
    expect(visual).toMatchObject({
      color: "#9e9e9e",
      border: {widths: {top: 1, right: 1, bottom: 1, left: 1}},
    })
    expect(socketCss).toContain("border: 1px solid #202020")
    expect(socketCss).toContain("background: currentcolor")
    renderer.dispose()
  })
})
