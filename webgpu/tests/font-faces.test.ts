import {expect, test} from "bun:test"
import {TrueTypeFont, Text} from "../../engine/src/index.ts"
import {createDocument} from "../../dom/src/index.ts"
import {createDocumentRenderer} from "../../renderer/src/index.ts"
import {RendererWebGpuBackend} from "../src/webgpu-backend.ts"

test("measurement and retained paint resolve the same real font face", async () => {
  const regular = new TrueTypeFont(await Bun.file(new URL("../../engine/static/fonts/inter-regular.ttf", import.meta.url)).arrayBuffer())
  const bold = new TrueTypeFont(await Bun.file(new URL("../../engine/static/fonts/inter-bold.ttf", import.meta.url)).arrayBuffer())
  const backend = new RendererWebGpuBackend({font: regular, fontFaces: [
    {family: "sans-serif", weight: 400, style: "normal", font: regular},
    {family: "sans-serif", weight: 700, style: "normal", font: bold},
  ], invalidateGeometry() {}})
  const document = createDocument()
  const paragraph = document.createElement("p")
  paragraph.setAttribute("style", "display:block;font-size:14px")
  paragraph.textContent = "MetaFor"
  document.append(paragraph)
  const renderer = createDocumentRenderer({document, root: paragraph, viewport: {width: 300, height: 100}, textMeasurer: backend.textMeasurer!})
  try {
    backend.applyFrame(renderer.flush())
    const texts: Text[] = []
    backend.root.traverse(node => { if (node instanceof Text) texts.push(node) })
    expect(texts).toHaveLength(1)
    expect(texts[0]?.font).toBe(regular)
    const firstWidth = renderer.flush().boxByNode.get(paragraph.firstChild!)!.width
    paragraph.setAttribute("style", "display:block;font-size:14px;font-weight:700")
    const frame = renderer.flush()
    backend.applyFrame(frame)
    expect(texts[0]?.font).toBe(bold)
    expect(frame.boxByNode.get(paragraph.firstChild!)!.width).not.toBe(firstWidth)
  } finally {
    renderer.dispose()
    backend.dispose()
  }
})
