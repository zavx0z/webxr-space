import {expect, test} from "bun:test"
import {createDocument} from "@zavx0z/dom"
import {TrueTypeFont, Text} from "@zavx0z/engine"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {RendererWebGpuBackend} from "../src/webgpu-backend.ts"

test("scroll patches reuse retained text objects and geometry across frames", async () => {
  const font = new TrueTypeFont(await Bun.file(new URL("../../engine/static/fonts/inter-regular.ttf", import.meta.url)).arrayBuffer())
  const backend = new RendererWebGpuBackend({font, invalidateGeometry() {}})
  const document = createDocument()
  const root = document.createElement("div")
  root.setAttribute("style", "width:200px;height:100px;overflow:auto")
  const paragraph = document.createElement("p")
  paragraph.textContent = "Many words that wrap into several lines. ".repeat(12)
  root.append(paragraph)
  document.append(root)
  let measurements = 0
  const renderer = createDocumentRenderer({document, root, viewport: {width: 200, height: 100},
    textMeasurer: {measureTextAdvance(...args) {
      measurements++
      return backend.textMeasurer!.measureTextAdvance(...args)
    }},
  })
  try {
    backend.applyFrame(renderer.flush())
    const retained: Text[] = []
    backend.root.traverse(node => { if (node instanceof Text) retained.push(node) })
    expect(retained.length).toBeGreaterThan(1)
    const geometries = retained.map(node => ({stencil: node.stencilGeometry, cover: node.coverGeometry, material: node.material}))
    expect(geometries[0]!.stencil.attributes.position!.array.length).toBeGreaterThan(0)
    const beforeY = retained[0]!.position.y
    measurements = 0
    for (const top of [15, 50, 90]) {
      root.scrollTop = top
      backend.applyFrame(renderer.flush())
      const current: Text[] = []
      backend.root.traverse(node => { if (node instanceof Text) current.push(node) })
      expect(current.every((node, index) => node === retained[index] &&
        node.stencilGeometry === geometries[index]!.stencil &&
        node.coverGeometry === geometries[index]!.cover &&
        node.material === geometries[index]!.material)).toBe(true)
      expect(retained[0]!.position.y).toBeCloseTo(beforeY + top, 8)
      expect(backend.diagnostics.rectPlanReused).toBe(true)
    }
    expect(measurements).toBe(0)
  } finally {
    renderer.dispose()
    backend.dispose()
  }
})
