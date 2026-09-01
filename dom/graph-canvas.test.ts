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
  createGraphCanvas,
  graphCanvasCss,
  graphCanvasDefaultProps,
  replaceGraphCanvasLink,
  replaceGraphCanvasLinks,
  type GraphCanvasProps,
} from "./graph-canvas.ts"

describe("keyed standard-DOM GraphCanvas", () => {
  test("creates exact Frame, one-Path Link and Node semantic order", () => {
    const controller = createGraphCanvas(createDocument())
    const {root, header, headerText, viewport, scene} = controller.refs
    const frame = controller.frameRefs("pipeline")!
    const firstLink = controller.linkRefs("input-process")!
    const selectedLink = controller.linkRefs("process-output")!
    const input = controller.nodeRefs("input")!
    const process = controller.nodeRefs("process")!
    const output = controller.nodeRefs("output")!

    expect(controller.element).toBe(root)
    expect(root).toBeInstanceOf(HTMLElement)
    expect(root.localName).toBe("section")
    expect(root.className).toBe("graph-canvas")
    expect(root.getAttribute("style")).toBe("width: 640px; height: 360px")
    expect(root.getAttribute("data-frame-count")).toBe("1")
    expect(root.getAttribute("data-link-count")).toBe("2")
    expect(root.getAttribute("data-node-count")).toBe("3")
    expect(header.localName).toBe("header")
    expect(headerText).toBeInstanceOf(Text)
    expect(headerText.data).toBe("Graph Canvas")
    expect(viewport).toBeInstanceOf(HTMLDivElement)
    expect(viewport.getAttribute("role")).toBe("application")
    expect(scene).toBeInstanceOf(HTMLDivElement)
    expect(scene.getAttribute("role")).toBe("listbox")
    expect(scene.getAttribute("aria-multiselectable")).toBe("true")
    expect(scene.getAttribute("style")).toBe("transform: translate(0px, 0px) scale(1); transform-origin: 0 0")
    expect(root.childNodes).toEqual([header, viewport])
    expect(viewport.childNodes).toEqual([scene])
    expect(scene.childNodes).toEqual([
      frame.element,
      firstLink.element,
      selectedLink.element,
      input.element,
      process.element,
      output.element,
    ])

    expect(frame.element.localName).toBe("section")
    expect(frame.element.getAttribute("data-frame-id")).toBe("pipeline")
    expect(frame.element.getAttribute("role")).toBe("option")
    expect(frame.element.getAttribute("aria-selected")).toBe("false")
    expect(frame.element.getAttribute("style")).toBe("left: 18px; top: 20px; width: 584px; height: 248px")
    expect(frame.label.localName).toBe("span")
    expect(frame.labelText.data).toBe("Pipeline")
    expect(frame.element.childNodes).toEqual([frame.label])

    expect(firstLink.element.getAttribute("data-link-id")).toBe("input-process")
    expect(firstLink.element.localName).toBe("vector-path")
    expect(firstLink.element.getAttribute("role")).toBe("option")
    expect(firstLink.element.getAttribute("aria-selected")).toBe("false")
    expect(firstLink.element.childNodes).toEqual([])
    expect(firstLink.element.getAttribute("style")).toBe("stroke: #d659d1")
    expect(firstLink.element.getAttribute("d")).toBe(firstLink.projection.d)
    expect(firstLink.projection.d).toStartWith("M 180 106 L 206 106 C")
    expect(firstLink.projection.d).toEndWith("L 250 171")
    expect(selectedLink.element.getAttribute("aria-selected")).toBe("true")

    expect(process.element.localName).toBe("article")
    expect(process.element.getAttribute("data-node-id")).toBe("process")
    expect(process.element.getAttribute("aria-selected")).toBe("true")
    expect(process.text.data).toBe("Process")
    expect(process.element.childNodes).toEqual([process.preview, process.header, process.body])
    expect(process.header.childNodes).toEqual([process.collapse, process.title, process.previewToggle])
    expect(process.body.childNodes).toEqual([
      process.rightSockets,
      process.properties,
      process.parameters,
      process.leftSockets,
    ])
    expect(process.element.getAttribute("style")).toContain("box-shadow: 0 0 12px #5b466b")
    expect(controller.props).toEqual(graphCanvasDefaultProps)
    expect(Object.isFrozen(controller.props)).toBeTrue()
    expect(Object.isFrozen(controller.props.scene)).toBeTrue()
    expect(Object.isFrozen(controller.props.frames)).toBeTrue()
    expect(Object.isFrozen(controller.props.links)).toBeTrue()
    expect(Object.isFrozen(controller.props.links[0]?.route)).toBeTrue()
    expect(Object.isFrozen(controller.props.links[0]?.route.kind === "orthogonal"
      ? controller.props.links[0].route.points
      : controller.props.links[0]?.route.projection)).toBeTrue()
    expect(Object.isFrozen(controller.props.nodes)).toBeTrue()
  })

  test("reconciles entity ids and Path geometry without replacing retained Link identity", () => {
    const controller = createGraphCanvas(createDocument())
    const fixed = controller.refs
    const pipeline = controller.frameRefs("pipeline")!
    const removedLink = controller.linkRefs("input-process")!
    const retainedLink = controller.linkRefs("process-output")!
    const retainedPath = retainedLink.element
    const previousProjection = retainedLink.projection
    const input = controller.nodeRefs("input")!
    const removedProcess = controller.nodeRefs("process")!
    const output = controller.nodeRefs("output")!
    const next: GraphCanvasProps = {
      ...controller.props,
      title: "Reconciled Graph",
      frames: [
        {
          id: "preview-frame",
          label: "Preview",
          title: "Preview frame",
          x: 300,
          y: 26,
          width: 290,
          height: 238,
          selected: true,
        },
        {...controller.props.frames[0]!, label: "Pipeline A"},
      ],
      links: [
        {
          ...controller.props.links[1]!,
          title: "Updated output route",
          route: {kind: "orthogonal", points: [{x: 400, y: 180}, {x: 440, y: 180}, {x: 440, y: 110}]},
        },
        {
          id: "preview-output",
          title: "Preview to output",
          selected: false,
          route: {kind: "orthogonal", points: [{x: 360, y: 236}, {x: 500, y: 236}]},
        },
      ],
      nodes: [
        {...controller.props.nodes[2]!, x: 450},
        {...controller.props.nodes[0]!, label: "Source"},
        {
          id: "preview",
          label: "Preview",
          title: "Preview node",
          x: 310,
          y: 200,
          width: 140,
          height: 70,
          selected: false,
        },
      ],
    }

    controller.update(next)

    const previewFrame = controller.frameRefs("preview-frame")!
    const previewLink = controller.linkRefs("preview-output")!
    const previewNode = controller.nodeRefs("preview")!
    expect(controller.refs).toBe(fixed)
    expect(controller.frameRefs("pipeline")).toBe(pipeline)
    expect(pipeline.labelText.data).toBe("Pipeline A")
    expect(controller.linkRefs("process-output")).toBe(retainedLink)
    expect(retainedLink.element).toBe(retainedPath)
    expect(retainedLink.projection).not.toBe(previousProjection)
    expect(retainedLink.element.getAttribute("d")).toBe(retainedLink.projection.d)
    expect(controller.linkRefs("input-process")).toBeNull()
    expect(removedLink.element.parentNode).toBeNull()
    expect(controller.nodeRefs("output")).toBe(output)
    expect(controller.nodeRefs("input")).toBe(input)
    expect(input.text.data).toBe("Source")
    expect(controller.nodeRefs("process")).toBeNull()
    expect(removedProcess.element.parentNode).toBeNull()
    expect(controller.refs.scene.childNodes).toEqual([
      previewFrame.element,
      pipeline.element,
      retainedLink.element,
      previewLink.element,
      output.element,
      input.element,
      previewNode.element,
    ])

    controller.update({
      ...controller.props,
      frames: controller.props.frames.filter(({id}) => id !== "pipeline"),
      links: [...controller.props.links, graphCanvasDefaultProps.links[0]!],
      nodes: [...controller.props.nodes, graphCanvasDefaultProps.nodes[1]!],
    })
    expect(pipeline.element.parentNode).toBeNull()
    const recreatedLink = controller.linkRefs("input-process")!
    const recreatedNode = controller.nodeRefs("process")!
    expect(recreatedLink).not.toBe(removedLink)
    expect(recreatedLink.element).not.toBe(removedLink.element)
    expect(recreatedNode).not.toBe(removedProcess)

    controller.update({
      ...controller.props,
      frames: [...controller.props.frames, graphCanvasDefaultProps.frames[0]!],
    })
    expect(controller.frameRefs("pipeline")).not.toBe(pipeline)
  })

  test("updates only the stable Scene transform for a transform-only change", () => {
    const document = createDocument()
    const host = document.createElement("div")
    const controller = createGraphCanvas(document)
    const frames = controller.props.frames.map(({id}) => controller.frameRefs(id))
    const links = controller.props.links.map(({id}) => controller.linkRefs(id))
    const nodes = controller.props.nodes.map(({id}) => controller.nodeRefs(id))
    const batches: MutationBatch[] = []
    document.appendChild(host)
    host.appendChild(controller.element)
    document.subscribeMutations((batch) => batches.push(batch))

    controller.update({
      ...controller.props,
      scene: {translateX: -28, translateY: 34, scale: 1.3},
    })

    expect(controller.refs.scene.getAttribute("style")).toBe(
      "transform: translate(-28px, 34px) scale(1.3); transform-origin: 0 0",
    )
    expect(controller.props.frames.map(({id}) => controller.frameRefs(id))).toEqual(frames)
    expect(controller.props.links.map(({id}) => controller.linkRefs(id))).toEqual(links)
    expect(controller.props.nodes.map(({id}) => controller.nodeRefs(id))).toEqual(nodes)
    expect(batches).toHaveLength(1)
    expect(batches[0]?.records).toEqual([{
      type: "attributes",
      target: controller.refs.scene,
      attributeName: "style",
      oldValue: "transform: translate(0px, 0px) scale(1); transform-origin: 0 0",
      newValue: "transform: translate(-28px, 34px) scale(1.3); transform-origin: 0 0",
    }])
    controller.update({...controller.props, scene: {...controller.props.scene}})
    expect(batches).toHaveLength(1)
  })

  test("paints one selected Path last without reparenting semantic DOM order", () => {
    const document = createDocument()
    const controller = createGraphCanvas(document)
    const selected = controller.linkRefs("input-process")!.element
    const previous = controller.linkRefs("process-output")!.element
    const batches: MutationBatch[] = []
    document.appendChild(controller.element)
    document.subscribeMutations((batch) => batches.push(batch))

    controller.update({...controller.props, links: replaceGraphCanvasLinks(controller.props.links, [
      {index: 0, link: {...controller.props.links[0]!, selected: true}},
      {index: 1, link: {...controller.props.links[1]!, selected: false}},
    ])})

    expect(controller.linkRefs("input-process")!.element).toBe(selected)
    expect(controller.linkRefs("process-output")!.element).toBe(previous)
    expect([...controller.refs.scene.children]
      .filter((element) => element.hasAttribute("data-link-id")))
      .toEqual([selected, previous])
    expect(batches).toHaveLength(1)
    expect(batches[0]!.records.filter(({type}) => type === "childList")).toHaveLength(0)
    const renderer = createDocumentRenderer({
      document,
      root: controller.element,
      viewport: {width: 800, height: 520},
      styleSheets: [graphCanvasCss],
    })
    const paths = renderer.flush().displayList.filter((item) => item.kind === "path")
    expect(paths.map(({node}) => node)).toEqual([previous, selected])
    renderer.dispose()
  })

  test("keeps keyed Link replacement pure, atomic, weak and provenance-fenced", async () => {
    const controller = createGraphCanvas(createDocument())
    const initial = controller.props
    const retained = controller.linkRefs("input-process")!.element
    expect(() => replaceGraphCanvasLink(initial.links, -1, initial.links[0]!)).toThrow("index is invalid")
    expect(() => replaceGraphCanvasLinks(initial.links, [
      {index: 0, link: initial.links[0]!},
      {index: 0, link: initial.links[0]!},
    ])).toThrow("duplicated")
    expect(() => replaceGraphCanvasLink(initial.links, 0, {...initial.links[0]!, id: "other"})).toThrow("id cannot change")
    expect(() => replaceGraphCanvasLink(initial.links, 0, {
      ...initial.links[0]!,
      route: {kind: "orthogonal", points: [{x: 0, y: 0}, {x: 1, y: 1}]},
    })).toThrow("not axis-aligned")
    expect(controller.props).toBe(initial)

    const selectedFirst = replaceGraphCanvasLink(initial.links, 0, {...initial.links[0]!, selected: true})
    const staleSecond = replaceGraphCanvasLink(initial.links, 1, {...initial.links[1]!, selected: false})
    controller.update({...controller.props, links: selectedFirst})
    expect(controller.linkRefs("input-process")!.element).toBe(retained)
    controller.update({...controller.props, links: staleSecond})
    expect(controller.props.links[0]!.selected).toBeFalse()
    expect(controller.props.links[1]!.selected).toBeFalse()
    expect(controller.linkRefs("input-process")!.element).toBe(retained)

    const collectable = ((links: typeof controller.props.links) => {
      const predecessor = Object.freeze([...links])
      return Object.freeze({
        predecessor: new WeakRef(predecessor),
        result: replaceGraphCanvasLink(predecessor, 0, {...predecessor[0]!, selected: true}),
      })
    })(controller.props.links)
    for (let attempt = 0; attempt < 4 && collectable.predecessor.deref() !== undefined; attempt++) {
      await Bun.sleep(0)
      Bun.gc(true)
    }
    expect(collectable.predecessor.deref()).toBeUndefined()

    const foreign = createGraphCanvas(createDocument())
    foreign.update({...foreign.props, links: collectable.result})
    expect(foreign.props.links).not.toBe(collectable.result)
    expect(foreign.props.links[0]!.selected).toBeTrue()
    foreign.dispose()
  })

  test("keeps Frame, exact Link Path and Node clicks standard and controlled", () => {
    const document = createDocument()
    const host = document.createElement("div")
    const controller = createGraphCanvas(document)
    const frameLabel = controller.frameRefs("pipeline")!.label
    const linkPath = controller.linkRefs("input-process")!.element
    const node = controller.nodeRefs("output")!.element
    const props = controller.props
    const clicks: unknown[] = []
    const fabricated: string[] = []
    document.appendChild(host)
    host.appendChild(controller.element)
    host.addEventListener("click", (event) => clicks.push(event.target))
    for (const type of ["input", "change", "selectionchange"]) {
      host.addEventListener(type, (event) => fabricated.push(event.type))
    }

    for (const target of [frameLabel, linkPath, node]) {
      expect(target.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}))).toBeTrue()
    }
    expect(clicks).toEqual([frameLabel, linkPath, node])
    expect(fabricated).toEqual([])
    expect(controller.props).toBe(props)
    expect(controller.frameRefs("pipeline")?.element.getAttribute("aria-selected")).toBe("false")
    expect(controller.linkRefs("input-process")?.element.getAttribute("aria-selected")).toBe("false")
    expect(controller.nodeRefs("output")?.element.getAttribute("aria-selected")).toBe("false")
  })

  test("rejects diagonal, zero-length and non-finite Link routes before mutation", () => {
    const controller = createGraphCanvas(createDocument())
    const props = controller.props
    const sceneChildren = [...controller.refs.scene.childNodes]
    const firstPath = controller.linkRefs("input-process")?.element.getAttribute("d")

    const updateRoute = (points: readonly Readonly<{x: number; y: number}>[]) => controller.update({
      ...controller.props,
      links: controller.props.links.map((link) => link.id === "input-process"
        ? {...link, route: {kind: "orthogonal", points}}
        : link),
    })
    expect(() => updateRoute([{x: 0, y: 0}, {x: 10, y: 10}]))
      .toThrow("run 0 not axis-aligned")
    expect(() => updateRoute([{x: 4, y: 4}, {x: 4, y: 4}]))
      .toThrow("point 1 repeats previous")
    expect(() => updateRoute([{x: Number.NaN, y: 0}, {x: 10, y: 0}]))
      .toThrow("finite point")
    expect(() => controller.update({
      ...controller.props,
      links: controller.props.links.map((link) => link.id === "input-process"
        ? {...link, route: {kind: "orthogonal", points: []}}
        : link),
    })).toThrow("needs >=2 orthogonal points")
    expect(controller.props).toBe(props)
    expect(controller.refs.scene.childNodes).toEqual(sceneChildren)
    expect(controller.linkRefs("input-process")?.element.getAttribute("d")).toBe(firstPath)
  })

  test("rejects duplicate entity ids and malformed geometry before mutation", () => {
    const controller = createGraphCanvas(createDocument())
    const props = controller.props
    const children = [...controller.refs.scene.childNodes]

    expect(() => controller.update({
      ...controller.props,
      frames: [controller.props.frames[0]!, {...controller.props.frames[0]!}],
    })).toThrow("GraphCanvas Frame id must be unique: pipeline")
    expect(() => controller.update({
      ...controller.props,
      links: [controller.props.links[0]!, {...controller.props.links[0]!}],
    })).toThrow("GraphCanvas Link id must be unique: input-process")
    expect(() => controller.update({
      ...controller.props,
      nodes: [controller.props.nodes[0]!, {...controller.props.nodes[0]!}],
    })).toThrow("GraphCanvas Node id must be unique: input")
    expect(() => controller.update({
      ...controller.props,
      scene: {...controller.props.scene, scale: 0},
    })).toThrow("GraphCanvas scene scale must be greater than zero")
    expect(() => controller.update({
      ...controller.props,
      nodes: controller.props.nodes.map((node) => node.id === "input" ? {...node, width: 0} : node),
    })).toThrow("GraphCanvas Node input width must be greater than zero")
    expect(controller.props).toBe(props)
    expect(controller.refs.scene.childNodes).toEqual(children)
  })

  test("projects Frame → Link → Node paint order, transformed inverse hits and clean identity", () => {
    const document = createDocument()
    const controller = createGraphCanvas(document)
    document.appendChild(controller.element)
    const renderer = createDocumentRenderer({
      document,
      root: controller.element,
      viewport: {width: 900, height: 560},
      styleSheets: [graphCanvasCss],
    })
    const first = renderer.flush()
    const frame = controller.frameRefs("pipeline")!.element
    const path = controller.linkRefs("input-process")!.element
    const selectedPath = controller.linkRefs("process-output")!.element
    const node = controller.nodeRefs("process")!.element
    const framePaint = backgroundIndex(first.displayList, frame)
    const pathPaint = pathIndex(first.displayList, path)
    const selectedPathPaint = pathIndex(first.displayList, selectedPath)
    const nodePaint = backgroundIndex(first.displayList, node)
    const frameShadow = rectIndex(first.displayList, frame, "shadow")
    const nodeShadow = rectIndex(first.displayList, node, "shadow")

    expect(frameShadow).toBeGreaterThan(-1)
    expect(frameShadow).toBeLessThan(framePaint)
    expect(framePaint).toBeGreaterThan(-1)
    expect(pathPaint).toBeGreaterThan(framePaint)
    expect(selectedPathPaint).toBeGreaterThan(pathPaint)
    expect(nodeShadow).toBeGreaterThan(pathPaint)
    expect(nodeShadow).toBeGreaterThan(selectedPathPaint)
    expect(nodeShadow).toBeLessThan(nodePaint)
    expect(nodePaint).toBeGreaterThan(pathPaint)
    expect(renderer.flush()).toBe(first)
    const nodeBox = first.boxByNode.get(node)!

    controller.update({
      ...controller.props,
      scene: {translateX: 46, translateY: 22, scale: 1.4},
    })
    const transformed = renderer.flush()
    const sceneTransform = transformed.boxByNode.get(controller.refs.scene)!.transform
    expect(sceneTransform.scaleX).toBe(1.4)
    expect(sceneTransform.scaleY).toBe(1.4)
    expect(transformed.boxByNode.get(node)).toMatchObject({
      x: nodeBox.x,
      y: nodeBox.y,
      width: nodeBox.width,
      height: nodeBox.height,
    })
    expect(transformed.hits.get(node)?.transform).toEqual(sceneTransform)
    const pathHit = transformed.hits.get(path)?.path
    expect(pathHit?.presentationOwner).toBe(controller.refs.scene)
    const pathTransform = transformed.presentationTransforms?.get(controller.refs.scene)!
    expect(node.contains(hitTestAtBoxCenter(transformed, nodeBox, sceneTransform)?.node ?? null)).toBeTrue()
    expect(hitTest(
      transformed,
      (pathHit!.originX + 190) * pathTransform.scaleX + pathTransform.translateX,
      (pathHit!.originY + 106) * pathTransform.scaleY + pathTransform.translateY,
    )?.node).toBe(path)
    expect(renderer.flush()).toBe(transformed)
    renderer.dispose()
  })

  test("supports empty entity collections and disposal without consumer removal", () => {
    const document = createDocument()
    const host = document.createElement("div")
    const controller = createGraphCanvas(document)
    const frame = controller.frameRefs("pipeline")!
    document.appendChild(host)
    host.appendChild(controller.element)

    controller.update({...controller.props, frames: [], links: [], nodes: []})
    expect(controller.refs.scene.childNodes).toEqual([])
    expect(controller.frameRefs("pipeline")).toBeNull()
    expect(controller.linkRefs("input-process")).toBeNull()
    expect(controller.nodeRefs("input")).toBeNull()
    expect(frame.element.parentNode).toBeNull()
    expect(controller.refs.root.getAttribute("data-frame-count")).toBe("0")
    expect(controller.refs.root.getAttribute("data-link-count")).toBe("0")
    expect(controller.refs.root.getAttribute("data-node-count")).toBe("0")

    const props = controller.props
    controller.dispose()
    controller.dispose()
    expect(controller.element.parentNode).toBe(host)
    expect(controller.props).toBe(props)
    expect(() => controller.update({...controller.props, title: "Disposed"}))
      .toThrow("GraphCanvas controller is disposed")
  })

  test("keeps GraphCanvas private, independent and DOM-only", async () => {
    const source = await Bun.file(new URL("./graph-canvas.ts", import.meta.url)).text()
    const requirements = await Bun.file(new URL("../requirements.md", import.meta.url)).text()
    const manifest = await Bun.file(new URL("../package.json", import.meta.url)).json() as {
      dependencies: Record<string, string>
      exports: Record<string, string>
    }

    expect(source).toContain('from "@zavx0z/dom"')
    for (const forbidden of [
      "single-node-canvas",
      "multi-node-canvas",
      "<svg",
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
    expect(graphCanvasCss).toContain("position: absolute")
    expect(graphCanvasCss).toContain(".graph-canvas__frame")
    expect(graphCanvasCss).toContain("pointer-hit-width: 16px")
    expect(graphCanvasCss).not.toContain(".node-link__segment")
    expect(graphCanvasCss).toContain(".node-article")
    expect(graphCanvasCss).toContain("box-shadow: 0 0 12px")
    expect(graphCanvasCss).toContain("box-shadow: 0 2px 10px")
    expect(graphCanvasCss).not.toContain("&")
    expect(manifest.dependencies["@zavx0z/dom"]).toBe("link:@zavx0z/dom")
    expect(manifest.dependencies["@ui/components"]).toBe("link:@ui/components")
    expect(manifest.exports["./dom/graph-canvas"]).toBeUndefined()
    expect(manifest.exports["./graph-canvas"]).toBe("./dom/graph-canvas.ts")
    expect(requirements).toContain("NODES-UI-DOM-GRAPH-001")
  })
})

function backgroundIndex(
  displayList: readonly Readonly<{kind: string; node: unknown; key: string}>[],
  node: unknown,
): number {
  return rectIndex(displayList, node, "background")
}

function pathIndex(
  displayList: readonly Readonly<{kind: string; node: unknown}>[],
  node: unknown,
): number {
  return displayList.findIndex((item) => item.kind === "path" && item.node === node)
}

function rectIndex(
  displayList: readonly Readonly<{kind: string; node: unknown; key: string}>[],
  node: unknown,
  key: string,
): number {
  return displayList.findIndex((item) => item.kind === "rect" && item.node === node && item.key === key)
}

function hitTestAtBoxCenter(
  frame: Parameters<typeof hitTest>[0],
  box: Readonly<{x: number; y: number; width: number; height: number}>,
  transform: Readonly<{scaleX: number; scaleY: number; translateX: number; translateY: number}>,
) {
  return hitTest(
    frame,
    (box.x + box.width / 2) * transform.scaleX + transform.translateX,
    (box.y + box.height / 2) * transform.scaleY + transform.translateY,
  )
}
