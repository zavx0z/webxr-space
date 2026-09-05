import {expect, test} from "bun:test"
import {createDocument} from "@zavx0z/dom"
import {ImageMaterial, Mesh} from "@zavx0z/engine"
import {createDocumentRenderer} from "@zavx0z/renderer"
import {RendererWebGpuBackend} from "../src/webgpu-backend.ts"

function fixture() {
  const document = createDocument()
  const root = document.createElement("div")
  root.setAttribute("style", "position:relative;width:100px;height:100px;overflow:hidden")
  const image = document.createElement("img")
  image.src = "visibility-image.png"
  image.width = 10
  image.height = 10
  image.setAttribute("style", "position:absolute;display:block;left:0;top:0")
  root.append(image)
  document.append(root)
  const renderer = createDocumentRenderer({document, root, viewport: {width:100,height:100}})
  const backend = new RendererWebGpuBackend({invalidateGeometry() {}, requestPresentation() {}})
  const flush = () => {
    backend.applyFrame(renderer.flush())
    return backend.root.children.find(node => node instanceof Mesh && node.material instanceof ImageMaterial) as Mesh
  }
  const move = (left: number, top: number, extra = "") => {
    image.setAttribute("style", `position:absolute;display:block;left:${left}px;top:${top}px;${extra}`)
    return flush()
  }
  return {document, root, image, renderer, backend, flush, move,
    dispose() {
      renderer.dispose()
      backend.dispose()
    },
  }
}

test("viewport clipping pauses only fully invisible images and retains their material", () => {
  const f = fixture()
  try {
    const mesh = f.flush()
    expect(mesh.visible).toBe(true)
    expect(f.move(0, 95).visible).toBe(true)
    expect(f.move(0, 100).visible).toBe(false)
    f.move(0, 10)
    const wideContent = f.document.createElement("div")
    wideContent.setAttribute("style", "width:200px;height:1px")
    f.root.append(wideContent)
    f.root.scrollLeft = 9
    expect(f.flush().visible).toBe(true)
    f.root.scrollLeft = 10
    expect(f.flush().visible).toBe(false)
    f.root.scrollLeft = 0
    expect(f.move(8, 0) === mesh).toBe(true)
    f.renderer.resize({width:5,height:100})
    expect(f.flush().visible).toBe(false)
    f.renderer.resize({width:100,height:100})
    expect(f.flush().visible).toBe(true)
    expect(f.move(0, 0, "opacity:0").visible).toBe(false)
    expect(f.move(0, 0, "transform:scale(0);transform-origin:0 0").visible).toBe(false)
    expect(f.move(20, 0, "transform:scale(-1,1);transform-origin:0 0").visible).toBe(true)
  } finally { f.dispose() }
})

test("rounded and nested transformed clips participate in image visibility", () => {
  const f = fixture()
  try {
    f.root.setAttribute("style", "position:relative;width:100px;height:100px;overflow:hidden;border-radius:50px")
    expect(f.flush().visible).toBe(false)
    expect(f.move(35, 35).visible).toBe(true)
    const inner = f.document.createElement("div")
    inner.setAttribute("style", "position:relative;margin:20px;width:30px;height:30px;overflow:hidden;transform:scale(1.5);transform-origin:0 0")
    f.root.append(inner)
    inner.append(f.image)
    expect(f.move(40, 15).visible).toBe(false)
    expect(f.move(28, 15).visible).toBe(true)
    f.root.setAttribute("style", "position:relative;width:100px;height:100px;overflow:hidden;transform:translate(200px,0px)")
    expect(f.flush().visible).toBe(false)
  } finally { f.dispose() }
})
