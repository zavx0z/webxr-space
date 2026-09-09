import {expect, test} from "bun:test"
import {createDocument} from "@zavx0z/dom"
import {InstancedRoundedRect, Mesh, RoundedRectMaterial, ROUNDED_RECT_INSTANCE_OFFSETS} from "@zavx0z/engine"
import {createDocumentRenderer} from "@renderer/html"
import {RendererWebGpuBackend} from "../src/webgpu-backend.ts"
import {roundedShader, roundedInstancedShader} from "../src/renderer/shaders/ui-shaders.ts"
import commonBorder from "../src/renderer/shaders/rounded-border.wgsl" with {type: "text"}

function fixture() {
  const document = createDocument()
  const root = document.createElement("section")
  root.setAttribute("style", "display:flex;width:200px;height:40px;gap:10px")
  const nodes = Array.from({length: 2}, () => {
    const node = document.createElement("div")
    node.setAttribute("style", "display:block;box-sizing:border-box;width:80px;height:30px;border-bottom:1px solid #888;border-radius:4px;background:#333")
    root.append(node)
    return node
  })
  document.append(root)
  const renderer = createDocumentRenderer({document, root, viewport: {width: 200, height: 40}})
  return {root, nodes, renderer}
}

test("bottom-only rounded border reaches retained scalar material without throwing or losing edge widths", () => {
  const f = fixture()
  const backend = new RendererWebGpuBackend({rectInstancing: "disabled", invalidateGeometry() {}})
  try {
    expect(() => backend.applyFrame(f.renderer.flush())).not.toThrow()
    const mesh = backend.root.children.find(node => node instanceof Mesh && node.material instanceof RoundedRectMaterial) as Mesh
    const material = mesh.material as RoundedRectMaterial
    expect(material.borderWidths).toEqual([0, 0, 1, 0])
    expect(material.radii).toEqual([4, 4, 4, 4])
    f.nodes[0]!.setAttribute("style", `${f.nodes[0]!.getAttribute("style")};border-bottom-width:3px`)
    backend.applyFrame(f.renderer.flush())
    expect(backend.root.children.includes(mesh)).toBe(true)
    expect(mesh.material).toBe(material)
    expect(material.borderWidths).toEqual([0, 0, 3, 0])
    expect(material.radii).toEqual([4, 4, 4, 4])
  } finally {
    backend.dispose()
    f.renderer.dispose()
  }
})

test("instanced rounded border records preserve independent edge widths and corner radii", () => {
  const f = fixture()
  const backend = new RendererWebGpuBackend({invalidateGeometry() {}})
  try {
    expect(() => backend.applyFrame(f.renderer.flush())).not.toThrow()
    expect(backend.diagnostics.rectInstancedInstances).toBe(2)
    const draw = backend.root.children.find(node => node instanceof InstancedRoundedRect) as InstancedRoundedRect
    const records = draw.layer.instances.recordAttribute.array
    const values = new Float32Array(records.buffer, records.byteOffset, records.byteLength / 4)
    expect([...values.slice(ROUNDED_RECT_INSTANCE_OFFSETS.borderWidths, ROUNDED_RECT_INSTANCE_OFFSETS.borderWidths + 4)]).toEqual([0, 0, 1, 0])
    expect([...values.slice(ROUNDED_RECT_INSTANCE_OFFSETS.radii, ROUNDED_RECT_INSTANCE_OFFSETS.radii + 4)]).toEqual([4, 4, 4, 4])
  } finally {
    backend.dispose()
    f.renderer.dispose()
  }
})

test("scalar and instanced rounded pipelines share the same asymmetric inner contour implementation", () => {
  for (const shader of [roundedShader, roundedInstancedShader]) {
    expect(shader).toContain(commonBorder)
    expect(shader).not.toContain("// @engine-rounded-border")
    expect(shader.match(/fn roundedInnerDistance\(/gu)).toHaveLength(1)
  }
})
