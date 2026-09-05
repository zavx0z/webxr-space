import {expect, test} from "bun:test"
import {createDocument} from "@zavx0z/dom"
import {TrueTypeFont, Text} from "@zavx0z/engine"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {RendererWebGpuBackend} from "../src/webgpu-backend.ts"
import {collectSpaceObjects, type RenderItem} from "../src/renderer/utils/render-list.ts"

const readFont = async (name: string) => new TrueTypeFont(await Bun.file(new URL(`../../engine/static/fonts/${name}.ttf`, import.meta.url)).arrayBuffer())
const texts = (backend: RendererWebGpuBackend) => {
  const result: Text[] = []
  backend.root.traverse(node => { if (node instanceof Text) result.push(node) })
  return result
}

test("clipped text leaves the GPU render list and returns with the same geometry", async () => {
  const font = await readFont("inter-regular")
  const backend = new RendererWebGpuBackend({font,invalidateGeometry() {}})
  const document = createDocument()
  const root = document.createElement("div")
  root.setAttribute("style", "width:200px;height:100px;overflow:hidden")
  for (let index=0; index<30; index++) {
    const paragraph = document.createElement("p")
    paragraph.setAttribute("style", "display:block;height:40px;margin:0;line-height:20px")
    paragraph.textContent = `Line ${index}`
    root.append(paragraph)
  }
  document.append(root)
  const renderer = createDocumentRenderer({document,root,viewport:{width:200,height:100},textMeasurer:backend.textMeasurer!})
  try {
    backend.applyFrame(renderer.flush())
    const retained = texts(backend)
    expect(retained).toHaveLength(30)
    expect(retained[0]!.visible).toBe(true)
    expect(retained.at(-1)!.visible).toBe(false)
    const geometry = retained[10]!.stencilGeometry
    const submissions: RenderItem[] = []
    collectSpaceObjects(backend.root,submissions,[])
    expect(submissions.filter(item => item.type.startsWith("text-")).length).toBeLessThan(12)
    root.scrollTop = 400
    backend.applyFrame(renderer.flush())
    expect(retained[0]!.visible).toBe(false)
    expect(retained[10]!.visible).toBe(true)
    expect(texts(backend)[10] === retained[10]).toBe(true)
    expect(retained[10]!.stencilGeometry === geometry).toBe(true)
    root.scrollTop = 0
    backend.applyFrame(renderer.flush())
    expect(retained[0]!.visible).toBe(true)
  } finally {
    renderer.dispose()
    backend.dispose()
  }
})

test("italic glyph overhang remains visible beyond the logical line box", async () => {
  const font = await readFont("inter-italic")
  const backend = new RendererWebGpuBackend({font,invalidateGeometry() {}})
  const document = createDocument()
  const root = document.createElement("div")
  root.setAttribute("style", "position:relative;width:100px;height:60px;overflow:hidden")
  const paragraph = document.createElement("p")
  paragraph.setAttribute("style", "position:absolute;display:block;left:100px;top:0;font-size:40px;line-height:50px")
  paragraph.textContent = "j"
  root.append(paragraph)
  document.append(root)
  const renderer = createDocumentRenderer({document,root,viewport:{width:100,height:60},textMeasurer:backend.textMeasurer!})
  try {
    backend.applyFrame(renderer.flush())
    const text = texts(backend)[0]!
    const position = text.stencilGeometry.attributes.position!
    const x = Array.from({length:position.count},(_,i)=>position.array[i*position.itemSize]!)
    expect(Math.min(...x)).toBeLessThan(0)
    expect(text.position.x).toBe(100)
    expect(text.visible).toBe(true)
    paragraph.setAttribute("style", "position:absolute;display:block;left:100px;top:0;font-size:40px;line-height:50px;color:transparent")
    backend.applyFrame(renderer.flush())
    expect(text.visible).toBe(false)
  } finally {
    renderer.dispose()
    backend.dispose()
  }
})
