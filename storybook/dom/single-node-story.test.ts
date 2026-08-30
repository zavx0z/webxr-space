import {describe, expect, test} from "bun:test"
import {
  MouseEvent,
  createDocument,
} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {singleNodeCanvasCss, type SingleNodeCanvasProps} from "../../dom/single-node-canvas.ts"
import {
  createSingleNodeStory,
  singleNodeStoryDefaultProps,
} from "./single-node-story.ts"

describe("package-owned single Node DOM story", () => {
  test("uses the production controller and publishes live HTML, CSS and TypeScript", () => {
    const story = createSingleNodeStory(createDocument())
    const refs = story.refs
    const rootChildren = [...refs.root.childNodes]
    const viewportChildren = [...refs.viewport.childNodes]
    const nodeChildren = [...refs.node.childNodes]
    const initialSource = story.source()

    expect(story.element).toBe(refs.root)
    expect(story.props).toEqual(singleNodeStoryDefaultProps)
    expect(initialSource.html).toContain('<section class="single-node-canvas"')
    expect(initialSource.html).toContain('aria-selected="false"')
    expect(initialSource.html).toContain("Граф узла")
    expect(initialSource.html).toContain("Вывод")
    expect(Object.keys(initialSource).sort()).toEqual(["html", "typescript"])
    expect(story.componentRoot.readStyleSheets()).toEqual({revision: 0, styleSheets: []})
    expect(initialSource.typescript).toContain('from "../../dom/single-node-canvas.ts"')
    expect(initialSource.typescript).toContain('"selected": false')
    expect(Object.isFrozen(initialSource)).toBeTrue()

    const next: SingleNodeCanvasProps = {
      ...story.props,
      title: "Материальный граф",
      width: 420,
      height: 280,
      node: {
        ...story.props.node,
        label: "Вывод материала",
        title: "Выбранный узел вывода",
        x: 64,
        y: 46,
        width: 180,
        height: 96,
        selected: true,
      },
    }
    story.update(next)

    expect(story.element).toBe(refs.root)
    expect(story.refs.header).toBe(refs.header)
    expect(story.refs.headerText).toBe(refs.headerText)
    expect(story.refs.viewport).toBe(refs.viewport)
    expect(story.refs.node).toBe(refs.node)
    expect(story.refs.nodeText).toBe(refs.nodeText)
    expect(refs.root.childNodes).toEqual(rootChildren)
    expect(refs.viewport.childNodes).toEqual(viewportChildren)
    expect(refs.node.childNodes).toEqual(nodeChildren)
    expect(story.props).toEqual(next)
    expect(story.props).not.toBe(next)
    expect(story.source()).not.toBe(initialSource)
    expect(story.source().html).toContain('aria-selected="true"')
    expect(story.source().html).toContain("Вывод материала")
    expect(story.source().typescript).toContain('"selected": true')
    expect(story.source().typescript).toContain('"width": 420')
  })

  test("keeps selection controlled through one cancelable standard click", () => {
    const document = createDocument()
    const host = document.createElement("div")
    const story = createSingleNodeStory(document)
    const order: string[] = []
    const fabricated: string[] = []
    document.appendChild(host)
    host.appendChild(story.element)

    const cancel = (event: import("@zavx0z/dom").Event): void => {
      order.push("capture:cancel")
      event.preventDefault()
    }
    host.addEventListener("click", cancel, {capture: true})
    story.refs.node.addEventListener("click", (event) => {
      order.push(`target:${event.defaultPrevented}:${story.props.node.selected}`)
    })
    host.addEventListener("click", () => order.push(`bubble:${story.props.node.selected}`))
    host.addEventListener("input", (event) => fabricated.push(event.type))
    host.addEventListener("change", (event) => fabricated.push(event.type))

    story.refs.node.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}))
    expect(story.props.node.selected).toBeFalse()
    expect(story.refs.node.getAttribute("aria-selected")).toBe("false")
    expect(order).toEqual(["capture:cancel", "target:true:false", "bubble:false"])
    expect(fabricated).toEqual([])

    host.removeEventListener("click", cancel, {capture: true})
    order.length = 0
    story.refs.node.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}))
    expect(story.props.node.selected).toBeTrue()
    expect(story.refs.node.getAttribute("aria-selected")).toBe("true")
    expect(order).toEqual(["target:false:true", "bubble:true"])
    expect(fabricated).toEqual([])

    story.refs.node.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}))
    expect(story.props.node.selected).toBeFalse()
    expect(story.refs.node.getAttribute("aria-selected")).toBe("false")
  })

  test("renders the same production tree and controlled selection through the CPU renderer", () => {
    const document = createDocument()
    const story = createSingleNodeStory(document)
    document.appendChild(story.element)
    const renderer = createDocumentRenderer({
      document,
      root: story.element,
      viewport: {width: 520, height: 360},
      styleSheets: [singleNodeCanvasCss],
    })
    const first = renderer.flush()
    const firstNodeBox = first.boxByNode.get(story.refs.node)
    const firstNodeRect = first.displayList.find((item) =>
      item.kind === "rect" && item.node === story.refs.node && item.key === "background")
    const firstNodeShadow = first.displayList.find((item) =>
      item.kind === "rect" && item.node === story.refs.node && item.key === "shadow")

    expect(first.boxByNode.get(story.refs.root)).toMatchObject({width: 360, height: 240})
    expect(firstNodeBox).toMatchObject({width: 156, height: 88})
    expect(first.displayList.filter((item) => item.kind === "text").map((item) => item.text))
      .toEqual(expect.arrayContaining(["Граф узла", "Вывод"]))
    expect(firstNodeRect).toMatchObject({
      kind: "rect",
      node: story.refs.node,
      border: {colors: {top: "#111111"}},
    })
    expect(firstNodeShadow).toMatchObject({kind: "rect", key: "shadow", node: story.refs.node})
    expect(first.hits.get(story.refs.node)).toMatchObject({
      node: story.refs.node,
      interactive: true,
      role: "option",
    })
    expect(renderer.flush()).toBe(first)

    story.refs.node.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}))
    const selected = renderer.flush()
    const selectedNodeRect = selected.displayList.find((item) =>
      item.kind === "rect" && item.node === story.refs.node && item.key === "background")
    const selectedNodeShadow = selected.displayList.find((item) =>
      item.kind === "rect" && item.node === story.refs.node && item.key === "shadow")
    const selectedNodeBox = selected.boxByNode.get(story.refs.node)
    expect(selected).not.toBe(first)
    expect(selectedNodeBox).toMatchObject({
      x: firstNodeBox?.x,
      y: firstNodeBox?.y,
      width: firstNodeBox?.width,
      height: firstNodeBox?.height,
    })
    expect(selectedNodeRect).toMatchObject({
      kind: "rect",
      node: story.refs.node,
      border: {colors: {top: "#2d6880"}},
    })
    expect(selectedNodeShadow).toMatchObject({
      kind: "rect",
      key: "shadow",
      color: "rgba(45, 104, 128, 0.45)",
    })
  })

  test("disposes only story-owned behavior and preserves the consumer subtree", () => {
    const document = createDocument()
    const host = document.createElement("div")
    const story = createSingleNodeStory(document)
    document.appendChild(host)
    host.appendChild(story.element)
    const props = story.props

    story.dispose()
    story.dispose()

    expect(story.element.parentNode).toBe(host)
    expect(story.props).toBe(props)
    story.refs.node.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}))
    expect(story.props).toBe(props)
    expect(story.refs.node.getAttribute("aria-selected")).toBe("false")
    expect(() => story.update({...story.props, title: "Disposed"}))
      .toThrow("SingleNodeStory controller is disposed")
    expect(story.source().html).toContain("Граф узла")
  })

  test("keeps the story private and free of retained UI owners", async () => {
    const source = await Bun.file(new URL("./single-node-story.ts", import.meta.url)).text()
    const requirements = await Bun.file(new URL("../../requirements.md", import.meta.url)).text()
    const packageManifest = await Bun.file(new URL("../../package.json", import.meta.url)).json() as {
      dependencies: Record<string, string>
      exports: Record<string, string>
    }
    const rootManifest = await Bun.file(new URL("../../../../package.json", import.meta.url)).json() as {
      devDependencies: Record<string, string>
    }

    expect(source).toContain('from "@zavx0z/dom"')
    expect(source).toContain('from "../../../../.storybook/runtime.ts"')
    expect(source).toContain('from "../../dom/single-node-canvas.ts"')
    for (const forbidden of [
      "@engine/core",
      "@zavx0z/storybook",
      "@layout/core",
      "@ui/elements",
      "@ui/components",
      "@zavx0z/renderer",
      "UiSurface",
      "Object3D",
      "createDocumentRenderer",
    ]) expect(source).not.toContain(forbidden)
    expect(packageManifest.dependencies["@zavx0z/renderer"]).toBeUndefined()
    expect(packageManifest.exports["./storybook/dom/single-node-story"]).toBeUndefined()
    expect(Object.values(packageManifest.exports)).not.toContain("./storybook/dom/single-node-story.ts")
    expect(rootManifest.devDependencies["@zavx0z/renderer"]).toBe("link:@zavx0z/renderer")
    expect(requirements).toContain("NODES-UI-DOM-SINGLE-NODE-002")
  })
})
