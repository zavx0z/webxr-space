import {describe, expect, test} from "bun:test"
import {
  createDocument,
  HTMLDivElement,
  HTMLElement,
  MouseEvent,
  Text,
  type MutationBatch,
} from "@zavx0z/dom"
import {
  createDocumentRenderer,
  hitTest,
} from "@zavx0z/renderer"
import {
  createMultiNodeCanvas,
  multiNodeCanvasCss,
  multiNodeCanvasDefaultProps,
  type MultiNodeCanvasProps,
} from "./multi-node-canvas.ts"

describe("keyed standard-DOM multi NodeCanvas", () => {
  test("creates one exact stable scene and keyed Article/Text pairs", () => {
    const controller = createMultiNodeCanvas(createDocument())
    const {root, header, headerText, viewport, scene} = controller.refs

    expect(controller.element).toBe(root)
    expect(root).toBeInstanceOf(HTMLElement)
    expect(root.localName).toBe("section")
    expect(root.className).toBe("multi-node-canvas")
    expect(root.getAttribute("data-node-count")).toBe("3")
    expect(root.getAttribute("style")).toBe("width: 600px; height: 320px")
    expect(header.localName).toBe("header")
    expect(headerText).toBeInstanceOf(Text)
    expect(headerText.data).toBe("Node Canvas")
    expect(viewport).toBeInstanceOf(HTMLDivElement)
    expect(viewport.getAttribute("role")).toBe("application")
    expect(viewport.getAttribute("aria-label")).toBe("Node Canvas")
    expect(scene).toBeInstanceOf(HTMLDivElement)
    expect(scene.className).toBe("multi-node-canvas__scene")
    expect(scene.getAttribute("style")).toBe("transform: translate(0px, 0px) scale(1); transform-origin: 0 0")
    expect(root.childNodes).toEqual([header, viewport])
    expect(viewport.childNodes).toEqual([scene])

    const records = controller.props.nodes.map(({id}) => controller.nodeRefs(id)!)
    expect(scene.childNodes).toEqual(records.map(({element}) => element))
    for (const [index, node] of controller.props.nodes.entries()) {
      const record = records[index]!
      expect(record.element.localName).toBe("article")
      expect(record.element.getAttribute("role")).toBe("option")
      expect(record.element.getAttribute("data-node-id")).toBe(node.id)
      expect(record.element.getAttribute("aria-selected")).toBe(String(node.selected))
      expect(record.element.tabIndex).toBe(0)
      expect(record.element.title).toBe(node.title)
      expect(record.element.getAttribute("style")).toBe(
        `left: ${node.x}px; top: ${node.y}px; width: ${node.width}px; height: ${node.height}px`,
      )
      expect(record.text).toBeInstanceOf(Text)
      expect(record.text.data).toBe(node.label)
      expect(record.element.childNodes).toEqual([record.text])
      expect(Object.isFrozen(record)).toBeTrue()
    }
    expect(controller.props).toEqual(multiNodeCanvasDefaultProps)
    expect(Object.isFrozen(controller.props)).toBeTrue()
    expect(Object.isFrozen(controller.props.scene)).toBeTrue()
    expect(Object.isFrozen(controller.props.nodes)).toBeTrue()
    expect(controller.props.nodes.every(Object.isFrozen)).toBeTrue()
    expect(controller.nodeRefs("missing")).toBeNull()
  })

  test("reconciles exact keys through update, reorder, removal and later recreation", () => {
    const controller = createMultiNodeCanvas(createDocument())
    const fixed = controller.refs
    const input = controller.nodeRefs("input")!
    const process = controller.nodeRefs("process")!
    const output = controller.nodeRefs("output")!
    const next: MultiNodeCanvasProps = {
      ...controller.props,
      title: "Reordered graph",
      nodes: [
        {...controller.props.nodes[2]!, x: 360, y: 70},
        {...controller.props.nodes[0]!, label: "Source", selected: true},
        {
          id: "preview",
          label: "Preview",
          title: "Preview node",
          x: 212,
          y: 190,
          width: 144,
          height: 82,
          selected: false,
        },
      ],
    }

    controller.update(next)

    const preview = controller.nodeRefs("preview")!
    expect(controller.refs).toBe(fixed)
    expect(controller.refs.root).toBe(fixed.root)
    expect(controller.refs.header).toBe(fixed.header)
    expect(controller.refs.headerText).toBe(fixed.headerText)
    expect(controller.refs.viewport).toBe(fixed.viewport)
    expect(controller.refs.scene).toBe(fixed.scene)
    expect(controller.nodeRefs("output")).toBe(output)
    expect(controller.nodeRefs("input")).toBe(input)
    expect(controller.nodeRefs("process")).toBeNull()
    expect(process.element.parentNode).toBeNull()
    expect(input.text.data).toBe("Source")
    expect(input.element.getAttribute("aria-selected")).toBe("true")
    expect(output.element.getAttribute("style")).toContain("left: 360px")
    expect(controller.refs.scene.childNodes).toEqual([
      output.element,
      input.element,
      preview.element,
    ])
    expect(controller.props.nodes.map(({id}) => id)).toEqual(["output", "input", "preview"])

    controller.update({
      ...controller.props,
      nodes: [...controller.props.nodes, {...multiNodeCanvasDefaultProps.nodes[1]!}],
    })
    const recreated = controller.nodeRefs("process")!
    expect(recreated).not.toBe(process)
    expect(recreated.element).not.toBe(process.element)
    expect(recreated.text).not.toBe(process.text)
    expect(controller.refs.scene.lastChild).toBe(recreated.element)
  })

  test("updates only the stable scene transform for a scene-only change", () => {
    const document = createDocument()
    const host = document.createElement("div")
    const controller = createMultiNodeCanvas(document)
    const records = controller.props.nodes.map(({id}) => controller.nodeRefs(id)!)
    const batches: MutationBatch[] = []
    document.appendChild(host)
    host.appendChild(controller.element)
    document.subscribeMutations((batch) => batches.push(batch))

    controller.update({
      ...controller.props,
      scene: {translateX: -24, translateY: 36, scale: 1.25},
    })

    expect(controller.refs.scene.getAttribute("style")).toBe(
      "transform: translate(-24px, 36px) scale(1.25); transform-origin: 0 0",
    )
    expect(controller.props.scene).toEqual({translateX: -24, translateY: 36, scale: 1.25})
    expect(controller.props.nodes.map(({id}) => controller.nodeRefs(id))).toEqual(records)
    expect(batches).toHaveLength(1)
    expect(batches[0]?.records).toEqual([{
      type: "attributes",
      target: controller.refs.scene,
      attributeName: "style",
      oldValue: "transform: translate(0px, 0px) scale(1); transform-origin: 0 0",
      newValue: "transform: translate(-24px, 36px) scale(1.25); transform-origin: 0 0",
    }])

    controller.update({...controller.props, scene: {...controller.props.scene}})
    expect(batches).toHaveLength(1)
  })

  test("projects the one stable scene transform through renderer paint and hits", () => {
    const document = createDocument()
    const controller = createMultiNodeCanvas(document)
    const input = controller.nodeRefs("input")!
    const nodeRecords = controller.props.nodes.map(({id}) => controller.nodeRefs(id)!)
    document.appendChild(controller.element)
    const renderer = createDocumentRenderer({
      document,
      root: controller.element,
      viewport: {width: 800, height: 500},
      styleSheets: [multiNodeCanvasCss],
    })
    const first = renderer.flush()
    const firstInputBox = first.boxByNode.get(input.element)!
    const firstInputPaint = first.displayList.find((item) =>
      item.kind === "rect" && item.node === input.element && item.key === "background"
    )
    expect(firstInputPaint?.transform).toEqual({
      scaleX: 1,
      scaleY: 1,
      translateX: 0,
      translateY: 0,
    })
    expect(renderer.flush()).toBe(first)

    controller.update({
      ...controller.props,
      scene: {translateX: 50, translateY: 20, scale: 1.5},
    })
    const transformed = renderer.flush()
    const sceneBox = transformed.boxByNode.get(controller.refs.scene)!
    const transformedInputBox = transformed.boxByNode.get(input.element)!
    const transformedInputPaint = transformed.displayList.find((item) =>
      item.kind === "rect" && item.node === input.element && item.key === "background"
    )

    expect(transformed).not.toBe(first)
    expect(transformedInputBox).toMatchObject({
      x: firstInputBox.x,
      y: firstInputBox.y,
      width: firstInputBox.width,
      height: firstInputBox.height,
    })
    expect(sceneBox.transform.scaleX).toBe(1.5)
    expect(sceneBox.transform.scaleY).toBe(1.5)
    expect(transformedInputPaint?.transform).toEqual(sceneBox.transform)
    expect(transformed.hits.get(input.element)?.transform).toEqual(sceneBox.transform)
    expect(controller.props.nodes.map(({id}) => controller.nodeRefs(id))).toEqual(nodeRecords)

    const transformedCenter = {
      x: (firstInputBox.x + firstInputBox.width / 2) * sceneBox.transform.scaleX +
        sceneBox.transform.translateX,
      y: (firstInputBox.y + firstInputBox.height / 2) * sceneBox.transform.scaleY +
        sceneBox.transform.translateY,
    }
    expect(hitTest(transformed, transformedCenter.x, transformedCenter.y)?.node).toBe(input.element)
    expect(renderer.flush()).toBe(transformed)
    renderer.dispose()
  })

  test("leaves standard Node clicks controlled and fabricates no events", () => {
    const document = createDocument()
    const host = document.createElement("div")
    const controller = createMultiNodeCanvas(document)
    const input = controller.nodeRefs("input")!
    const props = controller.props
    const clicks: Array<Readonly<{phase: string; target: unknown}>> = []
    const fabricated: string[] = []
    document.appendChild(host)
    host.appendChild(controller.element)
    host.addEventListener("click", (event) => clicks.push({phase: "capture", target: event.target}), {capture: true})
    host.addEventListener("click", (event) => clicks.push({phase: "bubble", target: event.target}))
    for (const type of ["input", "change", "selectionchange"]) {
      host.addEventListener(type, (event) => fabricated.push(event.type))
    }

    expect(input.element.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}))).toBeTrue()
    expect(clicks).toEqual([
      {phase: "capture", target: input.element},
      {phase: "bubble", target: input.element},
    ])
    expect(fabricated).toEqual([])
    expect(controller.props).toBe(props)
    expect(controller.props.nodes[0]?.selected).toBeFalse()
    expect(input.element.getAttribute("aria-selected")).toBe("false")

    controller.update({
      ...controller.props,
      nodes: controller.props.nodes.map((node) => node.id === "input"
        ? {...node, selected: true}
        : node),
    })
    expect(input.element.getAttribute("aria-selected")).toBe("true")
    expect(clicks).toHaveLength(2)
    expect(fabricated).toEqual([])
  })

  test("rejects duplicate keys and malformed scene or Node data before mutation", () => {
    const controller = createMultiNodeCanvas(createDocument())
    const props = controller.props
    const sceneStyle = controller.refs.scene.getAttribute("style")
    const children = [...controller.refs.scene.childNodes]
    const input = controller.nodeRefs("input")!

    expect(() => controller.update({
      ...controller.props,
      nodes: [controller.props.nodes[0]!, {...controller.props.nodes[0]!}],
    })).toThrow("MultiNodeCanvas Node id must be unique: input")
    expect(() => controller.update({
      ...controller.props,
      scene: {...controller.props.scene, scale: 0},
    })).toThrow("MultiNodeCanvas scene scale must be greater than zero")
    expect(() => controller.update({
      ...controller.props,
      scene: {...controller.props.scene, translateX: Number.NaN},
    })).toThrow("MultiNodeCanvas scene translateX must be finite")
    expect(() => controller.update({
      ...controller.props,
      nodes: controller.props.nodes.map((node) => node.id === "input"
        ? {...node, width: 0}
        : node),
    })).toThrow("MultiNodeCanvas Node input width must be greater than zero")
    expect(() => controller.update({
      ...controller.props,
      nodes: {} as unknown as readonly typeof controller.props.nodes[number][],
    })).toThrow("MultiNodeCanvas nodes must be an array")

    expect(controller.props).toBe(props)
    expect(controller.refs.scene.getAttribute("style")).toBe(sceneStyle)
    expect(controller.refs.scene.childNodes).toEqual(children)
    expect(controller.nodeRefs("input")).toBe(input)
  })

  test("supports an empty keyed scene and disposes without removing consumer DOM", () => {
    const document = createDocument()
    const host = document.createElement("div")
    const controller = createMultiNodeCanvas(document)
    const removed = controller.nodeRefs("input")!
    document.appendChild(host)
    host.appendChild(controller.element)

    controller.update({...controller.props, nodes: []})
    expect(controller.props.nodes).toEqual([])
    expect(controller.refs.root.getAttribute("data-node-count")).toBe("0")
    expect(controller.refs.scene.childNodes).toEqual([])
    expect(controller.nodeRefs("input")).toBeNull()
    expect(removed.element.parentNode).toBeNull()

    const props = controller.props
    controller.dispose()
    controller.dispose()
    expect(controller.element.parentNode).toBe(host)
    expect(controller.props).toBe(props)
    expect(() => controller.update({...controller.props, title: "Disposed"}))
      .toThrow("MultiNodeCanvas controller is disposed")
  })

  test("keeps the independent controller package-private and DOM-only", async () => {
    const source = await Bun.file(new URL("./multi-node-canvas.ts", import.meta.url)).text()
    const requirements = await Bun.file(new URL("../requirements.md", import.meta.url)).text()
    const manifest = await Bun.file(new URL("../package.json", import.meta.url)).json() as {
      dependencies: Record<string, string>
      exports: Record<string, string>
    }

    expect(source).toContain('from "@zavx0z/dom"')
    for (const forbidden of [
      "single-node-canvas",
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
      "onTransformChange",
      "onClick",
    ]) expect(source).not.toContain(forbidden)
    expect(multiNodeCanvasCss).toContain("position: absolute")
    expect(multiNodeCanvasCss).toContain('[aria-selected="true"]')
    expect(multiNodeCanvasCss).toContain("box-shadow")
    expect(multiNodeCanvasCss).not.toContain("&")
    expect(manifest.dependencies["@zavx0z/dom"]).toBe("link:@zavx0z/dom")
    expect(manifest.exports["./dom/multi-node-canvas"]).toBeUndefined()
    expect(Object.values(manifest.exports)).not.toContain("./dom/multi-node-canvas.ts")
    expect(requirements).toContain("NODES-UI-DOM-MULTI-NODE-001")
  })
})
