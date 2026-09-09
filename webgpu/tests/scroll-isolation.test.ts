import {expect, test} from "bun:test"
import {createDocument, type HTMLElement} from "@zavx0z/dom"
import {Text, TrueTypeFont} from "@zavx0z/engine"
import {
  createDocumentInteractionController,
  createDocumentRenderer,
  hitTestProjection,
  readCanonicalRenderFrameChanges,
} from "@renderer/html"
import {RendererWebGpuBackend} from "../src/webgpu-backend.ts"

const font = new TrueTypeFont(await Bun.file(new URL("../../engine/static/fonts/inter-regular.ttf", import.meta.url)).arrayBuffer())

function fixture(rows = 40) {
  const document = createDocument()
  const root = document.createElement("div")
  root.setAttribute("style", "display:flex;flex-direction:column;width:400px;height:260px;gap:10px;font-size:12px;line-height:16px")
  document.append(root)
  const add = (parent: HTMLElement, style: string, text?: string) => {
    const node = document.createElement("div")
    node.setAttribute("style", style)
    if (text !== undefined) node.textContent = text
    parent.append(node)
    return node
  }
  const first = add(root, "width:380px;height:100px;min-height:100px;overflow:auto;background:#191a1c")
  for (let index = 0; index < rows; index++) add(first, "height:16px;color:#bcbec4", `line ${index}`)
  const second = add(root, "width:380px;height:100px;min-height:100px;overflow:auto;background:#191a1c")
  second.title = "Small source"
  add(second, "width:1200px;height:16px;color:#cf8e6d", "const value = 1 ".repeat(12))
  const backend = new RendererWebGpuBackend({font, invalidateGeometry() {}})
  let measurements = 0
  const renderer = createDocumentRenderer({document, root, viewport: {width: 400, height: 260},
    textMeasurer: {measureTextAdvance(...args) {
      measurements++
      return backend.textMeasurer!.measureTextAdvance(...args)
    }},
  })
  const interaction = createDocumentInteractionController({document, hitTest: hitTestProjection, tooltipDelayMs: 1})
  return {first, second, backend, renderer, interaction, measured: () => measurements,
    dispose() {
      interaction.dispose()
      renderer.dispose()
      backend.dispose()
    },
  }
}

test("a scrollbar batched next to a sibling keeps the retained paint plan when it moves", () => {
  const f = fixture()
  try {
    f.backend.applyFrame(f.renderer.flush())
    expect(f.backend.diagnostics.rectInstancedInstances).toBeGreaterThan(0)
    const texts = f.backend.root.children.filter((node): node is Text => node instanceof Text)
    const measured = f.measured()
    for (const top of [16, 64, 32, 0]) {
      f.first.scrollTop = top
      f.backend.applyFrame(f.renderer.flush())
      expect(f.backend.diagnostics.rectPlanReused).toBe(true)
      expect(f.backend.root.children.filter(node => node instanceof Text)).toEqual(texts)
    }
    expect(f.measured()).toBe(measured)
  } finally { f.dispose() }
})

test("an unchanged tooltip preserves sparse scrolling and retained text in adjacent sources", () => {
  const f = fixture()
  try {
    let base = f.renderer.flush()
    f.interaction.pointerMove(base, {clientX: 100, clientY: 170, timeStamp: 0})
    let presentation = f.interaction.composeFrame(base, 10)
    f.backend.applyFrame(presentation)
    expect(f.interaction.tooltip?.text).toBe("Small source")
    const measured = f.measured()
    for (const left of [16, 48, 32, 0]) {
      f.interaction.wheel(base, {clientX: 100, clientY: 170, deltaX: left - f.second.scrollLeft, deltaY: 0})
      base = f.renderer.flush()
      const next = f.interaction.composeFrame(base, 20)
      const changes = readCanonicalRenderFrameChanges(next)
      expect(changes?.previous).toBe(presentation)
      expect(changes!.indexes.length).toBeLessThan(base.displayList.length)
      f.backend.applyFrame(next)
      presentation = next
      expect(f.interaction.tooltip?.text).toBe("Small source")
      expect(f.backend.diagnostics.rectPlanReused).toBe(true)
    }
    expect(f.measured()).toBe(measured)
  } finally { f.dispose() }
})

test("a tooltip over a large lazy scroll frame retains bounded paint preparation and source snapshots", () => {
  const f = fixture(400)
  const complete = new RendererWebGpuBackend({font, invalidateGeometry() {}})
  try {
    const initial = f.renderer.flush()
    f.interaction.pointerMove(initial, {clientX: 100, clientY: 170, timeStamp: 0})
    let presentation = f.interaction.composeFrame(initial, 10)
    f.backend.applyFrame(presentation)
    const initialText = initial.displayList.find(item => item.kind === "text")!
    const oldY = initialText.y
    const identities = f.backend.root.children.filter((node): node is Text => node instanceof Text)
    const measured = f.measured()
    for (const top of [16, 320, 640, 32, 0]) {
      f.first.scrollTop = top
      const base = f.renderer.flush()
      expect(readCanonicalRenderFrameChanges(base)?.scroll).toBeDefined()
      const next = f.interaction.composeFrame(base, 20)
      expect(readCanonicalRenderFrameChanges(next)?.previous).toBe(presentation)
      expect(readCanonicalRenderFrameChanges(next)?.scroll).toBeDefined()
      expect(f.interaction.tooltip?.text).toBe("Small source")
      f.backend.applyFrame(next)
      complete.applyFrame(Object.freeze({...next}))
      expect(f.backend.diagnostics.rectPlanReused).toBe(true)
      expect(f.backend.diagnostics.textPreparedItems).toBeLessThan(30)
      const actual = f.backend.root.children.filter((node): node is Text => node instanceof Text)
      const reference = complete.root.children.filter((node): node is Text => node instanceof Text)
      expect(actual.every((node, index) => node === identities[index])).toBe(true)
      expect(actual.map(node => node.visible)).toEqual(reference.map(node => node.visible))
      expect(actual.filter(node => node.visible).map(node => [node.text, node.position.x, node.position.y]))
        .toEqual(reference.filter(node => node.visible).map(node => [node.text, node.position.x, node.position.y]))
      expect(initialText.y).toBe(oldY)
      presentation = next
    }
    expect(f.measured()).toBe(measured)
  } finally {
    complete.dispose()
    f.dispose()
  }
}, 30_000)
