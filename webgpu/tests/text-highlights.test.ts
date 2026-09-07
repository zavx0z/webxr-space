import {expect, test} from "bun:test"
import {createDocument, setDocumentTextHighlights, clearDocumentTextHighlights, type HTMLElement} from "@zavx0z/dom"
import {Text, TrueTypeFont} from "@zavx0z/engine"
import {createDocumentInteractionController, createDocumentRenderer} from "@zavx0z/renderer"
import {RendererWebGpuBackend} from "../src/webgpu-backend.ts"

test("selection side channel preserves retained text and geometry while adding moving and clearing clipped highlights", async () => {
  const font = new TrueTypeFont(await Bun.file(new URL("../../engine/static/fonts/inter-regular.ttf", import.meta.url)).arrayBuffer())
  const document = createDocument()
  const root = document.createElement("section") as HTMLElement
  root.setAttribute("style", "display:block;width:200px;height:80px;overflow:auto;border:2px solid #555;border-radius:8px")
  const text = document.createElement("p")
  text.setAttribute("style", "display:block;font-size:14px;line-height:20px;white-space:pre")
  text.textContent = "first line\nsecond line\nthird line\nfourth line\nfifth line"
  root.append(text)
  document.append(root)
  const backend = new RendererWebGpuBackend({font, invalidateGeometry() {}})
  const renderer = createDocumentRenderer({document, root, viewport: {width: 250, height: 120}, textMeasurer: backend.textMeasurer!})
  const interaction = createDocumentInteractionController({document})
  const textNodes = () => backend.root.children.filter((node): node is Text => node instanceof Text)
  const highlightRoot = () => backend.root.children.find(node => node.name === "text-highlights")
  const owner = {}
  try {
    const frame = renderer.flush()
    backend.applyFrame(frame)
    const retained = textNodes()
    const geometries = retained.map(node => node.stencilGeometry)
    const range = document.createRange()
    range.setStart(text.firstChild!, 1)
    range.setEnd(text.firstChild!, 7)
    document.getSelection().addRange(range)
    backend.applyFrame(interaction.composeFrame(frame))
    expect(backend.diagnostics.textPreparedItems).toBe(0)
    expect(textNodes()).toEqual(retained)
    expect(textNodes().every((node, index) => node.stencilGeometry === geometries[index])).toBe(true)
    const first = highlightRoot()!.children[0]!
    expect(highlightRoot()!.children).toHaveLength(1)
    expect(first.presentationClips.map(clip => [clip.kind, clip.center, clip.halfSize, clip.radii]))
      .toEqual(retained[0]!.presentationClips.map(clip => [clip.kind, clip.center, clip.halfSize, clip.radii]))
    const x = first.position.x

    document.getSelection().setBaseAndExtent(text.firstChild!, 3, text.firstChild!, 16)
    backend.applyFrame(interaction.composeFrame(frame))
    expect(highlightRoot()!.children).toHaveLength(2)
    expect(highlightRoot()!.children[0]).toBe(first)
    expect(first.position.x).not.toBe(x)
    expect(backend.diagnostics.textPreparedItems).toBe(0)
    expect(textNodes().every((node, index) => node === retained[index] && node.stencilGeometry === geometries[index])).toBe(true)

    const extra = document.createRange()
    extra.setStart(text.firstChild!, 24)
    extra.collapse(true)
    setDocumentTextHighlights(document, owner, [extra], {caretColor: "#ffffff"})
    backend.applyFrame(interaction.composeFrame(frame))
    expect(highlightRoot()!.children).toHaveLength(3)
    expect(backend.diagnostics.textPreparedItems).toBe(0)

    document.getSelection().removeAllRanges()
    clearDocumentTextHighlights(document, owner)
    backend.applyFrame(interaction.composeFrame(frame))
    expect(highlightRoot()!.visible).toBe(false)
    expect(highlightRoot()!.children).toHaveLength(0)
    expect(backend.diagnostics.textPreparedItems).toBe(0)
    expect(textNodes().every((node, index) => node === retained[index] && node.stencilGeometry === geometries[index])).toBe(true)
  } finally {
    interaction.dispose()
    renderer.dispose()
    backend.dispose()
  }
})

test("visible selection rectangles follow scroll clips without changing retained glyph geometry", async () => {
  const font = new TrueTypeFont(await Bun.file(new URL("../../engine/static/fonts/inter-regular.ttf", import.meta.url)).arrayBuffer())
  const document = createDocument()
  const root = document.createElement("section") as HTMLElement
  root.setAttribute("style", "width:180px;height:60px;overflow:auto;border-radius:10px")
  const rows = Array.from({length: 200}, (_, index) => {
    const row = document.createElement("p")
    row.setAttribute("style", "height:20px;line-height:20px;white-space:pre")
    row.textContent = `row ${index} with clipped text`
    root.append(row)
    return row
  })
  document.append(root)
  const backend = new RendererWebGpuBackend({font, invalidateGeometry() {}})
  const renderer = createDocumentRenderer({document, root, viewport: {width: 200, height: 80}, textMeasurer: backend.textMeasurer!})
  const interaction = createDocumentInteractionController({document})
  const textNodes = () => backend.root.children.filter((node): node is Text => node instanceof Text)
  try {
    const initial = renderer.flush()
    backend.applyFrame(initial)
    const retained = textNodes()
    const geometries = retained.map(node => node.stencilGeometry)
    const selection = document.getSelection()
    selection.setBaseAndExtent(rows[0]!.firstChild!, 0, rows.at(-1)!.firstChild!, 10)
    backend.applyFrame(interaction.composeFrame(initial))
    expect(backend.diagnostics.textPreparedItems).toBe(0)
    root.scrollTop = 2_000
    const scrolled = renderer.flush()
    const presentation = interaction.composeFrame(scrolled)
    backend.applyFrame(presentation)
    expect(presentation.textHighlights!.length).toBeLessThanOrEqual(5)
    expect(backend.diagnostics.textPreparedItems).toBeLessThan(12)
    expect(textNodes().every((node, index) => node === retained[index] && node.stencilGeometry === geometries[index])).toBe(true)
    const highlight = backend.root.children.find(node => node.name === "text-highlights")!
    expect(highlight.children).toHaveLength(presentation.textHighlights!.length)
    expect(highlight.children.every(node => node.presentationClips.length > 0)).toBe(true)
    backend.applyFrame(interaction.composeFrame(scrolled))
    expect(backend.diagnostics.textPreparedItems).toBe(0)
  } finally {
    interaction.dispose()
    renderer.dispose()
    backend.dispose()
  }
}, 30_000)
