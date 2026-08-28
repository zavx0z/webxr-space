import {describe, expect, test} from "bun:test"
import {
  createDocument,
  MouseEvent,
  PointerEvent,
  WheelEvent,
} from "@zavx0z/dom"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {graphCanvasDefaultProps} from "./graph-canvas.ts"
import {createNodeEditor, nodeEditorCss} from "./node-editor.ts"

describe("standard-DOM NodeEditor interaction", () => {
  test("owns grid, controlled selection and stable keyed graph identities", () => {
    const selections: unknown[] = []
    const document = createDocument()
    const controller = createNodeEditor(document, {
      ...graphCanvasDefaultProps,
      onSelectionChange: (selection) => selections.push(selection),
    })
    const process = controller.graph.nodeRefs("process")!
    const input = controller.graph.nodeRefs("input")!
    const segment = controller.graph.linkRefs("input-process")!.segmentRefs(0)!
    expect(controller.refs.grid.childNodes.length).toBeGreaterThan(600)
    input.title.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}))
    expect(controller.selection).toEqual({kind: "node", id: "input"})
    expect(controller.graph.nodeRefs("process")).toBe(process)
    expect(controller.graph.nodeRefs("input")).toBe(input)
    segment.hit.dispatchEvent(new MouseEvent("click", {bubbles: true, cancelable: true}))
    expect(controller.selection).toEqual({kind: "link", id: "input-process"})
    expect(selections).toEqual([{kind: "node", id: "input"}, {kind: "link", id: "input-process"}])
  })

  test("pans, anchor-zooms, pinches, fits and culls without replacing Nodes", () => {
    const scenes: unknown[] = []
    const controller = createNodeEditor(createDocument(), {
      ...graphCanvasDefaultProps,
      scene: {translateX: 0, translateY: 0, scale: 1},
      onSceneChange: (scene) => scenes.push(scene),
    })
    const process = controller.graph.nodeRefs("process")!
    controller.refs.viewport.dispatchEvent(new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      deltaX: 12,
      deltaY: 18,
    }))
    expect(controller.props.scene).toEqual({translateX: -12, translateY: -18, scale: 1})
    controller.refs.viewport.dispatchEvent(new WheelEvent("wheel", {
      bubbles: true,
      cancelable: true,
      clientX: 200,
      clientY: 140,
      deltaY: -60,
      ctrlKey: true,
    }))
    expect(controller.props.scene.scale).toBeGreaterThan(1)

    const beforePan = controller.props.scene
    controller.refs.viewport.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, pointerId: 1, clientX: 10, clientY: 10,
    }))
    controller.refs.viewport.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true, cancelable: true, pointerId: 1, clientX: 30, clientY: 25,
    }))
    const afterPan = controller.props.scene
    expect(afterPan.translateX).toBeCloseTo(beforePan.translateX + 20)
    expect(afterPan.translateY).toBeCloseTo(beforePan.translateY + 15)
    controller.refs.viewport.dispatchEvent(new PointerEvent("pointerdown", {
      bubbles: true, pointerId: 2, clientX: 100, clientY: 25,
    }))
    controller.refs.viewport.dispatchEvent(new PointerEvent("pointermove", {
      bubbles: true, cancelable: true, pointerId: 2, clientX: 130, clientY: 25,
    }))
    expect(controller.props.scene.scale).toBeGreaterThan(afterPan.scale)
    controller.refs.viewport.dispatchEvent(new PointerEvent("pointerup", {bubbles: true, pointerId: 1}))
    controller.refs.viewport.dispatchEvent(new PointerEvent("pointerup", {bubbles: true, pointerId: 2}))

    controller.setScene({translateX: -5000, translateY: -5000, scale: 1})
    expect(controller.graph.nodeRefs("process")!.element.getAttribute("data-culled")).toBe("true")
    expect(controller.diagnostics.culledNodes).toBe(3)
    expect(controller.fitToView()).toBeTrue()
    expect(controller.graph.nodeRefs("process")).toBe(process)
    expect(controller.graph.nodeRefs("process")!.element.getAttribute("data-culled")).toBe("false")
    expect(scenes.length).toBeGreaterThan(4)
  })

  test("projects grid and scene transforms through the renderer", () => {
    const document = createDocument()
    const controller = createNodeEditor(document, graphCanvasDefaultProps)
    document.appendChild(controller.element)
    const renderer = createDocumentRenderer({
      document,
      root: controller.element,
      viewport: {width: 800, height: 520},
      styleSheets: [nodeEditorCss],
    })
    const first = renderer.flush()
    expect(first.boxByNode.get(controller.refs.grid)).toBeDefined()
    expect(first.hits.get(controller.graph.nodeRefs("process")!.element)).toBeDefined()
    controller.setScene({translateX: 42, translateY: 18, scale: 1.25})
    const second = renderer.flush()
    expect(second.boxByNode.get(controller.refs.scene)?.transform.scaleX).toBe(1.25)
    expect(second.boxByNode.get(controller.refs.grid)?.transform.scaleX).toBe(1.25)
    renderer.dispose()
  })
})
