import {describe, expect, test} from "bun:test"
import {
  createDocument,
  MouseEvent,
} from "@zavx0z/dom"
import {multiNodeCanvasCss} from "../../dom/multi-node-canvas.ts"
import {
  createMultiNodeStory,
  multiNodeStoryDefaultProps,
} from "./multi-node-story.ts"

describe("package-owned multi-node DOM story", () => {
  test("uses the production controller with live selected and transform source", () => {
    const story = createMultiNodeStory(createDocument())
    const initial = story.source()
    const selected = story.props.nodes.find((node) => node.selected)

    expect(story.props).toEqual(multiNodeStoryDefaultProps)
    expect(selected?.id).toBe("scalar")
    expect(story.nodeRefs("scalar")?.element.getAttribute("aria-selected")).toBe("true")
    expect(story.refs.scene.getAttribute("style")).toBe(
      "transform: translate(18px, 12px) scale(1.05); transform-origin: 0 0",
    )
    expect(initial.html).toContain('<section class="multi-node-canvas"')
    expect(initial.html).toContain('data-node-id="scalar"')
    expect(initial.html).toContain('aria-selected="true"')
    expect(initial.html).toContain("translate(18px, 12px) scale(1.05)")
    expect(initial.css).toBe(multiNodeCanvasCss)
    expect(initial.typescript).toContain('from "../../dom/multi-node-canvas.ts"')
    expect(initial.typescript).toContain('"translateX": 18')
    expect(initial.typescript).toContain('"scale": 1.05')
    expect(initial.typescript).toContain("selected: node.id === id")
    expect(Object.isFrozen(initial)).toBeTrue()
  })

  test("updates transform args without replacing fixed or keyed identities", () => {
    const story = createMultiNodeStory(createDocument())
    const refs = story.refs
    const records = story.props.nodes.map(({id}) => story.nodeRefs(id)!)
    const firstSource = story.source()

    story.update({
      ...story.props,
      scene: {translateX: -30, translateY: 42, scale: 1.4},
    })

    expect(story.refs).toBe(refs)
    expect(story.refs.root).toBe(refs.root)
    expect(story.refs.header).toBe(refs.header)
    expect(story.refs.viewport).toBe(refs.viewport)
    expect(story.refs.scene).toBe(refs.scene)
    expect(story.props.nodes.map(({id}) => story.nodeRefs(id))).toEqual(records)
    expect(story.refs.scene.getAttribute("style")).toBe(
      "transform: translate(-30px, 42px) scale(1.4); transform-origin: 0 0",
    )
    expect(story.source()).not.toBe(firstSource)
    expect(story.source().html).toContain("translate(-30px, 42px) scale(1.4)")
    expect(story.source().typescript).toContain('"translateX": -30')
    expect(story.source().typescript).toContain('"translateY": 42')
    expect(story.source().typescript).toContain('"scale": 1.4')
  })

  test("uses one cancelable standard click for exclusive controlled selection", () => {
    const document = createDocument()
    const host = document.createElement("div")
    const story = createMultiNodeStory(document)
    const input = story.nodeRefs("input")!
    const output = story.nodeRefs("output")!
    const fabricated: string[] = []
    document.appendChild(host)
    host.appendChild(story.element)
    for (const type of ["input", "change", "selectionchange"]) {
      host.addEventListener(type, (event) => fabricated.push(event.type))
    }

    const cancel = (event: import("@zavx0z/dom").Event): void => event.preventDefault()
    host.addEventListener("click", cancel, {capture: true})
    expect(input.element.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}))).toBeFalse()
    expect(story.props.nodes.find((node) => node.selected)?.id).toBe("scalar")
    expect(input.element.getAttribute("aria-selected")).toBe("false")

    host.removeEventListener("click", cancel, {capture: true})
    expect(output.element.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}))).toBeTrue()
    expect(story.props.nodes.filter((node) => node.selected).map(({id}) => id)).toEqual(["output"])
    expect(output.element.getAttribute("aria-selected")).toBe("true")
    expect(story.nodeRefs("scalar")?.element.getAttribute("aria-selected")).toBe("false")
    expect(fabricated).toEqual([])
    expect(story.source().html).toContain('data-node-id="output"')
    expect(story.source().typescript).toContain('"selected": true')
  })

  test("disposes story behavior without removing consumer DOM", () => {
    const document = createDocument()
    const host = document.createElement("div")
    const story = createMultiNodeStory(document)
    const input = story.nodeRefs("input")!
    document.appendChild(host)
    host.appendChild(story.element)
    const props = story.props

    story.dispose()
    story.dispose()
    input.element.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}))

    expect(story.element.parentNode).toBe(host)
    expect(story.props).toBe(props)
    expect(story.props.nodes.find((node) => node.selected)?.id).toBe("scalar")
    expect(() => story.update({...story.props, title: "Disposed"}))
      .toThrow("MultiNodeStory controller is disposed")
    expect(story.source().html).toContain("Сцена узлов")
  })

  test("keeps the story private and free of retained UI owners", async () => {
    const source = await Bun.file(new URL("./multi-node-story.ts", import.meta.url)).text()
    const requirements = await Bun.file(new URL("../../requirements.md", import.meta.url)).text()
    const manifest = await Bun.file(new URL("../../package.json", import.meta.url)).json() as {
      exports: Record<string, string>
    }

    expect(source).toContain('from "@zavx0z/dom"')
    expect(source).toContain('from "@zavx0z/storybook/stories"')
    expect(source).toContain('from "../../dom/multi-node-canvas.ts"')
    for (const forbidden of [
      "@engine/core",
      "@layout/core",
      "@ui/elements",
      "@ui/components",
      "@zavx0z/renderer",
      "UiSurface",
      "Object3D",
      "createDocumentRenderer",
    ]) expect(source).not.toContain(forbidden)
    expect(manifest.exports["./storybook/dom/multi-node-story"]).toBeUndefined()
    expect(Object.values(manifest.exports)).not.toContain("./storybook/dom/multi-node-story.ts")
    expect(requirements).toContain("NODES-UI-DOM-MULTI-NODE-002")
  })
})
