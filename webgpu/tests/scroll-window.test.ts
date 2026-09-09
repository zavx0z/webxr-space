import {expect, test} from "bun:test"
import {createDocument} from "@zavx0z/dom"
import {Text, TrueTypeFont} from "@zavx0z/engine"
import {createDocumentRenderer, readCanonicalRenderFrameChanges} from "@renderer/html"
import {RendererWebGpuBackend} from "../src/webgpu-backend.ts"
import {PaintVisibilityIndex} from "../src/paint-visibility-index.ts"

test("glyph-bound interval queries agree with exhaustive intersection", () => {
  const bounds = Array.from({length: 1000}, (_, index) => ({index,
    minX: index % 7 * 20, maxX: index % 7 * 20 + 35,
    minY: index * 3, maxY: index * 3 + index % 19 * 8,
  }))
  const lookup = new PaintVisibilityIndex(bounds)
  for (let top = -20; top < 3100; top += 37) {
    const query = {minX: 25, maxX: 95, minY: top, maxY: top + 80}
    expect(lookup.query(query).sort((a, b) => a - b)).toEqual(bounds.filter(value =>
      value.minX <= query.maxX && value.maxX >= query.minX && value.minY <= query.maxY && value.maxY >= query.minY).map(value => value.index))
  }
})

test("large text scroll updates the visible window and matches the complete backend", async () => {
  const font = new TrueTypeFont(await Bun.file(new URL("../../engine/static/fonts/inter-regular.ttf", import.meta.url)).arrayBuffer())
  const document = createDocument()
  const root = document.createElement("div")
  root.setAttribute("style", "width:220px;height:120px;overflow:auto;border:3px solid #333;border-radius:12px")
  const content = document.createElement("div")
  content.setAttribute("style", "width:380px;transform:scale(1.1);transform-origin:0 0")
  root.append(content)
  for (let index = 0; index < 300; index++) {
    const row = document.createElement("p")
    row.setAttribute("style", `height:20px;line-height:20px;color:#aabbcc;${index % 20 === 0 ? "background:#334455" : ""}`)
    row.textContent = `line ${index}: long text that remains clipped`
    content.append(row)
  }
  document.append(root)
  const backend = new RendererWebGpuBackend({font, invalidateGeometry() {}})
  const complete = new RendererWebGpuBackend({font, invalidateGeometry() {}})
  const renderer = createDocumentRenderer({document, root, viewport: {width: 260, height: 160}, textMeasurer: backend.textMeasurer!})
  const textObjects = (value: RendererWebGpuBackend) => value.root.children.filter((node): node is Text => node instanceof Text)
  try {
    const initial = renderer.flush()
    backend.applyFrame(initial)
    complete.applyFrame(initial)
    const identities = textObjects(backend)
    for (const top of [20, 80, 500, 520, 0]) {
      document.transaction(() => {
        root.scrollTop = top
        root.scrollLeft = top % 70
      })
      const frame = renderer.flush()
      expect(readCanonicalRenderFrameChanges(frame)?.scroll).toBeDefined()
      backend.applyFrame(frame)
      // Dropping the private delta forces exhaustive paint processing of the same frame.
      complete.applyFrame(Object.freeze({...frame}))
      const reference = textObjects(complete)
      const actual = textObjects(backend)
      expect(actual).toHaveLength(reference.length)
      expect(backend.diagnostics.textPreparedItems).toBeLessThan(40)
      expect(actual.every((node, index) => node === identities[index])).toBe(true)
      for (let index = 0; index < actual.length; index++) {
        expect(actual[index]!.visible).toBe(reference[index]!.visible)
        expect(actual[index]!.position.x).toBeCloseTo(reference[index]!.position.x, 8)
        expect(actual[index]!.position.y).toBeCloseTo(reference[index]!.position.y, 8)
        if (actual[index]!.visible) {
          expect(actual[index]!.stencilGeometry).toBe(reference[index]!.stencilGeometry)
          expect(actual[index]!.presentationClips.map(clip => [clip.kind, clip.center, clip.halfSize, clip.radii]))
            .toEqual(reference[index]!.presentationClips.map(clip => [clip.kind, clip.center, clip.halfSize, clip.radii]))
        }
      }
    }
    content.firstChild!.textContent = "changed text"
    const edited = renderer.flush()
    backend.applyFrame(edited)
    complete.applyFrame(Object.freeze({...edited}))
    expect(textObjects(backend).map(node => node.text)).toEqual(textObjects(complete).map(node => node.text))
  } finally {
    renderer.dispose()
    backend.dispose()
    complete.dispose()
  }
}, 30_000)
