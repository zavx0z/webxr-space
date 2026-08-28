import {describe, expect, test} from "bun:test"
import {
  createDocument,
  HTMLDivElement,
  HTMLElement,
  MouseEvent,
  Text,
} from "@zavx0z/dom"
import {
  createSingleNodeCanvas,
  singleNodeCanvasCss,
  singleNodeCanvasDefaultProps,
  type SingleNodeCanvasProps,
} from "./single-node-canvas.ts"

describe("single standard-DOM NodeCanvas production slice", () => {
  test("creates the exact semantic one-Node tree and standard state", () => {
    const controller = createSingleNodeCanvas(createDocument())
    const {root, header, headerText, viewport, node, nodeText} = controller.refs

    expect(controller.element).toBe(root)
    expect(root).toBeInstanceOf(HTMLElement)
    expect(root.localName).toBe("section")
    expect(root.className).toBe("single-node-canvas")
    expect(root.getAttribute("data-node-count")).toBe("1")
    expect(header).toBeInstanceOf(HTMLElement)
    expect(header.localName).toBe("header")
    expect(headerText).toBeInstanceOf(Text)
    expect(headerText.data).toBe("Node Canvas")
    expect(viewport).toBeInstanceOf(HTMLDivElement)
    expect(viewport.localName).toBe("div")
    expect(viewport.getAttribute("role")).toBe("application")
    expect(viewport.getAttribute("aria-label")).toBe("Node Canvas")
    expect(node).toBeInstanceOf(HTMLElement)
    expect(node.localName).toBe("article")
    expect(node.getAttribute("role")).toBe("option")
    expect(node.getAttribute("data-node-id")).toBe("output")
    expect(node.getAttribute("aria-selected")).toBe("false")
    expect(node.tabIndex).toBe(0)
    expect(node.getAttribute("tabindex")).toBe("0")
    expect(node.title).toBe("Output node")
    expect(nodeText).toBeInstanceOf(Text)
    expect(nodeText.data).toBe("Output")
    expect(root.childNodes).toEqual([header, viewport])
    expect(viewport.childNodes).toEqual([node])
    expect(node.childNodes).toEqual([nodeText])
    expect(root.getAttribute("style")).toBe("width: 320px; height: 220px")
    expect(node.getAttribute("style")).toBe("left: 40px; top: 30px; width: 140px; height: 80px")
    expect(controller.props).toEqual(singleNodeCanvasDefaultProps)
    expect(Object.isFrozen(controller.props)).toBeTrue()
    expect(Object.isFrozen(controller.props.node)).toBeTrue()
  })

  test("updates controlled presentation without replacing any semantic identity", () => {
    const controller = createSingleNodeCanvas(createDocument())
    const refs = controller.refs
    const rootChildren = [...refs.root.childNodes]
    const viewportChildren = [...refs.viewport.childNodes]
    const nodeChildren = [...refs.node.childNodes]
    const next: SingleNodeCanvasProps = {
      title: "Material graph",
      width: 480,
      height: 300,
      node: {
        id: "output",
        label: "Material Output",
        title: "Selected material output",
        x: 72,
        y: 48,
        width: 180,
        height: 96,
        selected: true,
      },
    }

    controller.update(next)

    expect(controller.element).toBe(refs.root)
    expect(controller.refs.header).toBe(refs.header)
    expect(controller.refs.headerText).toBe(refs.headerText)
    expect(controller.refs.viewport).toBe(refs.viewport)
    expect(controller.refs.node).toBe(refs.node)
    expect(controller.refs.nodeText).toBe(refs.nodeText)
    expect(refs.root.childNodes).toEqual(rootChildren)
    expect(refs.viewport.childNodes).toEqual(viewportChildren)
    expect(refs.node.childNodes).toEqual(nodeChildren)
    expect(refs.headerText.data).toBe("Material graph")
    expect(refs.viewport.getAttribute("aria-label")).toBe("Material graph")
    expect(refs.nodeText.data).toBe("Material Output")
    expect(refs.node.getAttribute("aria-selected")).toBe("true")
    expect(refs.node.title).toBe("Selected material output")
    expect(refs.root.getAttribute("style")).toBe("width: 480px; height: 300px")
    expect(refs.node.getAttribute("style")).toBe("left: 72px; top: 48px; width: 180px; height: 96px")
    expect(controller.props).toEqual(next)
    expect(controller.props).not.toBe(next)
  })

  test("leaves standard click bubbling observable without fabricating selected state", () => {
    const document = createDocument()
    const host = document.createElement("div")
    const controller = createSingleNodeCanvas(document)
    document.appendChild(host)
    host.appendChild(controller.element)
    const controlled = controller.props
    const events: Array<Readonly<{type: string; target: unknown}>> = []
    host.addEventListener("click", (event) => events.push({type: event.type, target: event.target}))

    expect(controller.refs.node.dispatchEvent(new MouseEvent("click", {bubbles: true}))).toBeTrue()

    expect(events).toEqual([{type: "click", target: controller.refs.node}])
    expect(controller.props).toBe(controlled)
    expect(controller.props.node.selected).toBeFalse()
    expect(controller.refs.node.getAttribute("aria-selected")).toBe("false")

    controller.update({...controller.props, node: {...controller.props.node, selected: true}})
    expect(controller.refs.node.getAttribute("aria-selected")).toBe("true")
    expect(events).toHaveLength(1)
  })

  test("rejects a new key and malformed geometry before mutating the existing tree", () => {
    const controller = createSingleNodeCanvas(createDocument())
    const props = controller.props
    const rootStyle = controller.refs.root.getAttribute("style")
    const nodeStyle = controller.refs.node.getAttribute("style")
    const label = controller.refs.nodeText.data

    expect(() => controller.update({
      ...controller.props,
      node: {...controller.props.node, id: "replacement"},
    })).toThrow("SingleNodeCanvas Node id cannot change: output -> replacement")
    expect(() => controller.update({
      ...controller.props,
      node: {...controller.props.node, x: Number.NaN},
    })).toThrow("SingleNodeCanvas Node x must be finite")
    expect(() => controller.update({
      ...controller.props,
      node: {...controller.props.node, width: 0},
    })).toThrow("SingleNodeCanvas Node width must be greater than zero")
    expect(() => controller.update({
      ...controller.props,
      node: {...controller.props.node, selected: "yes" as unknown as boolean},
    })).toThrow("SingleNodeCanvas Node selected must be a boolean")

    expect(controller.props).toBe(props)
    expect(controller.refs.root.getAttribute("style")).toBe(rootStyle)
    expect(controller.refs.node.getAttribute("style")).toBe(nodeStyle)
    expect(controller.refs.nodeText.data).toBe(label)
    expect(controller.refs.node.getAttribute("data-node-id")).toBe("output")
  })

  test("disposes controller state without removing the consumer-owned subtree", () => {
    const document = createDocument()
    const host = document.createElement("div")
    const controller = createSingleNodeCanvas(document)
    document.appendChild(host)
    host.appendChild(controller.element)
    const props = controller.props

    controller.dispose()
    controller.dispose()

    expect(controller.element.parentNode).toBe(host)
    expect(controller.props).toBe(props)
    expect(() => controller.update({...controller.props, title: "Disposed"}))
      .toThrow("SingleNodeCanvas controller is disposed")
    expect(controller.refs.headerText.data).toBe("Node Canvas")
  })

  test("keeps the package-private leaf on the exact DOM-only boundary", async () => {
    const source = await Bun.file(new URL("./single-node-canvas.ts", import.meta.url)).text()
    const requirements = await Bun.file(new URL("../requirements.md", import.meta.url)).text()
    const architecture = await Bun.file(new URL("../../../ARCHITECTURE.md", import.meta.url)).text()
    const manifest = await Bun.file(new URL("../package.json", import.meta.url)).json() as {
      dependencies: Record<string, string>
      exports: Record<string, string>
    }

    expect(source).toContain('from "@zavx0z/dom"')
    for (const forbidden of [
      "@engine/core",
      "@layout/core",
      "@ui/elements",
      "@ui/components",
      "@zavx0z/renderer",
      "UiSurface",
      "Object3D",
      "addEventListener",
      "dispatchEvent",
      "onSelectionChange",
      "onClick",
    ]) expect(source).not.toContain(forbidden)
    expect(singleNodeCanvasCss).toContain("display: flex")
    expect(singleNodeCanvasCss).toContain('[aria-selected="true"]')
    expect(singleNodeCanvasCss).toContain("box-shadow")
    expect(singleNodeCanvasCss).not.toContain("&")
    expect(manifest.dependencies["@zavx0z/dom"]).toBe("link:@zavx0z/dom")
    expect(manifest.exports["./dom/single-node-canvas"]).toBeUndefined()
    expect(Object.values(manifest.exports)).not.toContain("./dom/single-node-canvas.ts")
    expect(manifest.exports["./graph-canvas"]).toBe("./dom/graph-canvas.ts")
    expect(manifest.exports["./node-editor"]).toBe("./dom/node-editor.ts")
    expect(requirements).toContain("NODES-UI-DOM-SINGLE-NODE-001")
    expect(architecture).toContain("packages/ui/dom/single-node-canvas.ts")
  })
})
