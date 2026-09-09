import {expect, test} from "bun:test"
import {createDocument, type HTMLElement} from "@zavx0z/dom"
import {Mesh, RoundedRectMaterial, Text, TrueTypeFont, type Object3D} from "@zavx0z/engine"
import {createDocumentRenderer, readCanonicalRenderFrameChanges, type RenderFrame} from "@renderer/html"
import {RendererWebGpuBackend} from "../src/webgpu-backend.ts"
import {collectSpaceObjects, type RenderItem} from "../src/renderer/utils/render-list.ts"

const font = new TrueTypeFont(await Bun.file(new URL("../../engine/static/fonts/inter-regular.ttf", import.meta.url)).arrayBuffer())
const rowStyle = "display:flex;width:800px;height:20px;min-height:20px;background:#243344;border:1px solid #455566;box-sizing:border-box"

function fixture(second = false) {
  const document = createDocument()
  const root = document.createElement("div")
  root.setAttribute("style", "display:flex;flex-direction:column;gap:12px;width:460px;height:420px;overflow:hidden;border-radius:10px;font-size:12px;line-height:18px")
  document.append(root)
  const append = (parent: HTMLElement, style: string, text?: string) => {
    const element = document.createElement("div")
    element.setAttribute("style", style)
    if (text !== undefined) element.textContent = text
    parent.append(element)
    return element
  }
  const editor = (prefix: string) => {
    const panel = append(root, "width:440px;height:190px;min-height:190px;overflow:hidden;border-radius:12px")
    const scroller = append(panel, "width:420px;height:160px;overflow:auto;border:2px solid #667788;border-radius:6px;box-sizing:border-box")
    const content = append(scroller, "width:800px")
    const rows = Array.from({length: 280}, (_, index) => {
      const row = append(content, rowStyle)
      append(row, "width:180px;min-width:180px;color:#aabbcc", `${prefix} source ${index}`)
      append(row, "width:120px;min-width:120px;margin-left:340px;background:#8a5544;color:#ddeeff", `token ${index}`)
      return row
    })
    return {scroller, rows}
  }
  const first = editor("first")
  const other = second ? editor("second") : undefined
  // Keep safe retained updates enabled but cap storage below a two-rect run:
  // these tests exercise the independent scalar visibility-window fallback.
  const backend = new RendererWebGpuBackend({font, maxRectInstances: 1, invalidateGeometry() {}})
  const renderer = createDocumentRenderer({document, root, viewport: {width: 480, height: 440}, textMeasurer: backend.textMeasurer!})
  return {document, root, first, other, backend, renderer,
    dispose() {
      renderer.dispose()
      backend.dispose()
    },
  }
}

function scalarGeometry(node: Object3D) {
  if (node instanceof Mesh) return node.geometry
  if (node instanceof Text) return node.stencilGeometry
  throw new Error(`Unexpected presentation object: ${node.name}`)
}

function visiblePaint(backend: RendererWebGpuBackend) {
  backend.root.updateWorldMatrix()
  const items: RenderItem[] = []
  collectSpaceObjects(backend.root, items, [])
  return items.map(({type, object}) => ({
    type,
    name: object.name,
    text: object instanceof Text ? object.text : undefined,
    position: [object.position.x, object.position.y, object.position.z],
    paint: object instanceof Mesh && object.material instanceof RoundedRectMaterial
      ? {fill: object.material.fill.toArray(), border: object.material.border.toArray(), widths: object.material.borderWidths}
      : undefined,
    clips: object.presentationClips.map(clip => ({
      center: clip.center,
      halfSize: clip.halfSize,
      radii: clip.radii,
      matrix: Array.from(clip.coordinateSpace.matrixWorld.elements),
    })),
  }))
}

function compareFresh(frame: RenderFrame, actual: RendererWebGpuBackend) {
  const fresh = new RendererWebGpuBackend({font, rectInstancing: "disabled", invalidateGeometry() {}})
  try {
    fresh.applyFrame(Object.freeze({...frame}))
    expect(actual.root.children).toHaveLength(fresh.root.children.length)
    expect(actual.root.children.every((node, index) => {
      const reference = fresh.root.children[index]!
      return node.visible === reference.visible &&
        Math.abs(node.position.x - reference.position.x) < 1e-8 &&
        Math.abs(node.position.y - reference.position.y) < 1e-8
    })).toBe(true)
    expect(visiblePaint(actual)).toEqual(visiblePaint(fresh))
  } finally { fresh.dispose() }
}

test("large clipped colored source rows prepare only visible rectangles and text while retaining all scene objects", () => {
  const f = fixture()
  try {
    const initial = f.renderer.flush()
    f.backend.applyFrame(initial)
    expect(initial.boxes.length).toBeGreaterThan(256)
    expect(f.backend.diagnostics.rectInstancedInstances).toBe(0)
    const nodes = [...f.backend.root.children]
    const geometries = nodes.map(scalarGeometry)
    const firstRowIndex = initial.displayList.findIndex(item => item.kind === "rect" && item.node === f.first.rows[0])
    const firstRectangle = nodes[firstRowIndex]!
    expect(firstRectangle.visible).toBe(true)
    const totalRects = initial.displayList.filter(item => item.kind === "rect").length
    expect(totalRects).toBeGreaterThan(500)
    for (const [left, top] of [[0, 20], [360, 120], [380, 1100], [200, 1200], [0, 40], [0, 0]] as const) {
      f.document.transaction(() => {
        f.first.scroller.scrollLeft = left
        f.first.scroller.scrollTop = top
      })
      const frame = f.renderer.flush()
      expect(readCanonicalRenderFrameChanges(frame)?.scroll).toBeDefined()
      f.backend.applyFrame(frame)
      expect(f.backend.diagnostics.rectPreparedItems).toBeLessThan(45)
      expect(f.backend.diagnostics.textPreparedItems).toBeLessThan(30)
      expect(f.backend.root.children.length).toBe(nodes.length)
      expect(f.backend.root.children.every((node, index) => node === nodes[index] && scalarGeometry(node) === geometries[index])).toBe(true)
      compareFresh(frame, f.backend)
      if (top >= 120) expect(firstRectangle.visible).toBe(false)
    }
    expect(firstRectangle.visible).toBe(true)
    expect(f.first.rows).toHaveLength(280)
  } finally { f.dispose() }
}, 30000)

test("a hidden source row mutation and switching scroll owners invalidate the retained visibility window", () => {
  const f = fixture(true)
  try {
    f.backend.applyFrame(f.renderer.flush())
    const nodes = [...f.backend.root.children]
    f.first.scroller.scrollTop = 900
    let frame = f.renderer.flush()
    f.backend.applyFrame(frame)
    expect(f.backend.diagnostics.rectPreparedItems).toBeLessThan(45)
    const hiddenRow = f.first.rows[0]!
    const hiddenItem = frame.displayList.findIndex(item => item.kind === "rect" && item.node === hiddenRow)
    const rectangle = f.backend.root.children[hiddenItem]!
    expect(rectangle.visible).toBe(false)
    hiddenRow.setAttribute("style", rowStyle.replace("#243344", "#af273f"))
    hiddenRow.firstChild!.firstChild!.textContent = "changed while hidden"
    frame = f.renderer.flush()
    f.backend.applyFrame(frame)
    compareFresh(frame, f.backend)
    for (const [owner, top, left] of [
      [f.other!.scroller, 100, 370],
      [f.first.scroller, 0, 0],
      [f.other!.scroller, 0, 0],
      [f.first.scroller, 80, 240],
      [f.first.scroller, 0, 0],
    ] as const) {
      f.document.transaction(() => {
        owner.scrollTop = top
        owner.scrollLeft = left
      })
      frame = f.renderer.flush()
      f.backend.applyFrame(frame)
      compareFresh(frame, f.backend)
      expect(f.backend.root.children.every((node, index) => node === nodes[index])).toBe(true)
    }
    expect(rectangle.visible).toBe(true)
    expect(rectangle).toBeInstanceOf(Mesh)
    expect((rectangle as Mesh).material).toBeInstanceOf(RoundedRectMaterial)
    expect(((rectangle as Mesh).material as RoundedRectMaterial).fill.toArray()).toEqual(new Float32Array([175 / 255, 39 / 255, 63 / 255, 1]))
    expect(f.backend.root.children.some(node => node instanceof Text && node.visible && node.text === "changed while hidden")).toBe(true)
  } finally { f.dispose() }
}, 30000)

test("scalar border antialias and shadow geometry fringes remain visible at a scrolling clip edge", () => {
  const document = createDocument()
  const root = document.createElement("div")
  root.setAttribute("style", "width:100px;height:100px;overflow:hidden")
  document.append(root)
  const scroller = document.createElement("div")
  scroller.setAttribute("style", "width:100px;height:100px;overflow:auto")
  root.append(scroller)
  const content = document.createElement("div")
  content.setAttribute("style", "position:relative;width:300px")
  scroller.append(content)
  const border = document.createElement("div")
  border.setAttribute("style", "position:absolute;left:20px;top:100.5px;width:20px;height:10px;border:2px solid #aabbcc;box-sizing:border-box")
  const shadow = document.createElement("div")
  shadow.setAttribute("style", "position:absolute;left:60px;top:105px;width:20px;height:10px;background:#334455;box-shadow:0 0 8px 2px #778899")
  content.append(border, shadow)
  for (let index = 0; index < 280; index++) {
    const row = document.createElement("div")
    row.setAttribute("style", "height:20px;width:300px;background:#243344")
    content.append(row)
  }
  // A one-slot bound preserves the scalar path without disabling retained updates.
  const backend = new RendererWebGpuBackend({font, maxRectInstances: 1, invalidateGeometry() {}})
  const renderer = createDocumentRenderer({document, root, viewport: {width: 100, height: 100}, textMeasurer: backend.textMeasurer!})
  try {
    const initial = renderer.flush()
    backend.applyFrame(initial)
    const borderIndex = initial.displayList.findIndex(item => item.kind === "rect" && item.node === border)
    const shadowIndex = initial.displayList.findIndex(item => item.kind === "rect" && item.node === shadow && item.shadow !== null)
    const bodyIndex = initial.displayList.findIndex(item => item.kind === "rect" && item.node === shadow && item.shadow === null)
    expect(borderIndex).toBeGreaterThanOrEqual(0)
    expect(shadowIndex).toBeGreaterThanOrEqual(0)
    expect(bodyIndex).toBeGreaterThanOrEqual(0)
    const borderObject = backend.root.children[borderIndex]!
    const shadowObject = backend.root.children[shadowIndex]!
    const bodyObject = backend.root.children[bodyIndex]!
    expect(borderObject.visible).toBe(true)
    expect(shadowObject.visible).toBe(true)
    expect(bodyObject.visible).toBe(false)
    for (const top of [1, 120, 0]) {
      scroller.scrollTop = top
      const frame = renderer.flush()
      expect(readCanonicalRenderFrameChanges(frame)?.scroll).toBeDefined()
      backend.applyFrame(frame)
      expect(backend.diagnostics.rectPreparedItems).toBeLessThan(15)
      compareFresh(frame, backend)
      if (top === 120) {
        expect(borderObject.visible).toBe(false)
        expect(shadowObject.visible).toBe(true)
      } else {
        expect(borderObject.visible).toBe(true)
        expect(shadowObject.visible).toBe(true)
        expect(bodyObject.visible).toBe(false)
      }
    }
  } finally {
    renderer.dispose()
    backend.dispose()
  }
})
