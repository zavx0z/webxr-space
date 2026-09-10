import {expect, test} from "bun:test"
import {createDocument} from "@zavx0z/dom"
import {Mesh, MeshBasicMaterial, type BufferGeometry} from "@zavx0z/engine"
import {createDocumentRenderer} from "@renderer/html"
import {parseRenderPath, pointInPathFill} from "../../renderer/html/src/path.ts"
import {pathFillVertices} from "../src/path-fill.ts"
import {RendererWebGpuBackend} from "../src/webgpu-backend.ts"

function inTriangle(data: Float32Array, offset: number, x: number, y: number): boolean {
  const ax = data[offset]!, ay = data[offset + 1]!
  const bx = data[offset + 3]!, by = data[offset + 4]!
  const cx = data[offset + 6]!, cy = data[offset + 7]!
  const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
  if (Math.abs(area) < 1e-8) return false
  const u = ((x - ax) * (cy - ay) - (y - ay) * (cx - ax)) / area
  const v = ((bx - ax) * (y - ay) - (by - ay) * (x - ax)) / area
  return u >= 0 && v >= 0 && u + v <= 1
}

for (const [name, source] of [
  ["triangle", "M 5 5 L 70 40 L 5 75"],
  ["concave", "M 5 5 L 75 5 L 75 25 L 25 25 L 25 75 L 5 75"],
  ["quadratic", "M 5 5 Q 75 5 75 75 L 5 75"],
  ["cubic", "M 5 40 C 5 -10 75 -10 75 40 C 75 90 5 90 5 40"],
  ["crossing", "M 5 5 L 75 75 L 5 75 L 75 5"],
  ["double winding", "M 5 5 L 75 5 L 75 75 L 5 75 L 5 5 L 75 5 L 75 75 L 5 75"],
  ["hole connected by retraced bridge", "M 5 5 L 75 5 L 75 75 L 5 75 L 5 5 L 25 25 L 25 55 L 55 55 L 55 25 L 25 25 L 5 5"],
] as const) {
  test(`[VECTOR-FILL-GPU-001] ${name}: triangles совпадают с semantic interior для обоих правил`, () => {
    const geometry = parseRenderPath(source)!
    for (const rule of ["nonzero", "evenodd"] as const) {
      const data = pathFillVertices(geometry, rule)
      expect(pathFillVertices(geometry, rule)).toBe(data)
      for (let y = 0.371; y < 82; y += 3.1) {
        for (let x = 0.713; x < 82; x += 3.3) {
          let count = 0
          for (let i = 0; i < data.length; i += 9) if (inTriangle(data, i, x, y)) count += 1
          expect(count).toBe(pointInPathFill(geometry, x, y, rule) ? 1 : 0)
        }
      }
    }
  })
}

test("[VECTOR-FILL-GPU-002] retained mesh обновляет цвет без геометрии, сохраняет clips/transform и освобождается", () => {
  const document = createDocument()
  const root = document.createElement("div")
  root.setAttribute("style", "position:relative;width:120px;height:120px;overflow:hidden")
  document.append(root)
  const path = document.createElement("vector-path")
  path.d = "M 5 5 L 70 40 L 5 75"
  const base = "position:absolute;width:0;height:0;stroke-width:0;transform-origin:0 0;transform:translate(10px,20px) scale(2)"
  path.setAttribute("style", `${base};fill:#ff0000;opacity:0.5`)
  root.append(path)
  const renderer = createDocumentRenderer({document, root, viewport: {width: 120, height: 120}})
  const invalidated: BufferGeometry[] = []
  const backend = new RendererWebGpuBackend({invalidateGeometry: geometry => invalidated.push(geometry)})
  try {
    backend.applyFrame(renderer.flush())
    const mesh = backend.root.children.find(node => node.name.endsWith(":path-fill"))
    if (!(mesh instanceof Mesh) || !(mesh.material instanceof MeshBasicMaterial)) throw new Error("Ожидалась настоящая retained Mesh")
    const geometry = mesh.geometry
    const positions = geometry.attributes.position!.array
    expect(positions.length).toBeGreaterThan(0)
    expect(mesh.scale.x).toBe(2)
    expect(mesh.scale.y).toBe(-2)
    expect(mesh.position.x).toBe(10)
    expect(mesh.position.y).toBe(-20)
    expect(mesh.presentationClips.length).toBeGreaterThan(0)
    expect(mesh.material.color.a).toBe(0.5)
    path.setAttribute("style", `${base};fill:#00ff00;opacity:0.5`)
    backend.applyFrame(renderer.flush())
    expect(backend.root.children.includes(mesh)).toBe(true)
    expect(geometry.attributes.position!.array).toBe(positions)
    expect(mesh.material.color.g).toBe(1)
    expect(mesh.material.color.r).toBe(0)
    path.d = "M 10 10 L 30 10 L 30 30 L 10 30"
    backend.applyFrame(renderer.flush())
    expect(mesh.geometry).toBe(geometry)
    expect(geometry.attributes.position!.array).not.toBe(positions)
    path.setAttribute("style", `${base};fill:#00ff00;stroke-width:2;stroke:#ffffff`)
    backend.applyFrame(renderer.flush())
    expect(backend.root.children[0]).toBe(mesh)
    expect(backend.root.children.length).toBeGreaterThan(1)
    path.setAttribute("style", `${base};fill:#00ff00;visibility:hidden`)
    backend.applyFrame(renderer.flush())
    expect(backend.root.children.includes(mesh)).toBe(false)
    expect(invalidated).toContain(geometry)
  } finally {
    backend.dispose()
    renderer.dispose()
  }
})

test("[VECTOR-FILL-GPU-003] пустая evenodd область не загружает пустой buffer и снова становится видимой при смене правила", () => {
  const document = createDocument()
  const root = document.createElement("div")
  document.append(root)
  const path = document.createElement("vector-path")
  path.d = "M 5 5 L 75 5 L 75 75 L 5 75 L 5 5 L 75 5 L 75 75 L 5 75"
  path.setAttribute("style", "fill:#ff0000;fill-rule:evenodd;stroke-width:0")
  root.append(path)
  const renderer = createDocumentRenderer({document, root, viewport: {width: 100, height: 100}})
  const backend = new RendererWebGpuBackend({invalidateGeometry: () => {}})
  try {
    backend.applyFrame(renderer.flush())
    const mesh = backend.root.children[0] as Mesh
    expect(mesh.visible).toBe(false)
    expect(mesh.geometry.attributes.position!.count).toBe(0)
    path.setAttribute("style", "fill:#ff0000;fill-rule:nonzero;stroke-width:0")
    backend.applyFrame(renderer.flush())
    expect(backend.root.children[0]).toBe(mesh)
    expect(mesh.visible).toBe(true)
    expect(mesh.geometry.attributes.position!.count).toBeGreaterThan(0)
    const positions = mesh.geometry.attributes.position!.array
    path.setAttribute("style", "fill:#ff0000;stroke-width:0;transform-origin:0 0;transform:translate(3px,4px) scale(2)")
    backend.applyFrame(renderer.flush())
    expect(mesh.geometry.attributes.position!.array).toBe(positions)
    expect(mesh.position.x).toBe(3)
    expect(mesh.scale.x).toBe(2)
  } finally {
    backend.dispose()
    renderer.dispose()
  }
})
