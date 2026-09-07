import {expect, test} from "bun:test"
import {createDocument, type HTMLElement} from "@zavx0z/dom"
import {BufferGeometry, Mesh, RoundedRectMaterial} from "@zavx0z/engine"
import {createDocumentRenderer, readCanonicalRenderFrameChanges, type RenderFrame} from "@zavx0z/renderer"
import {Renderer} from "../src/renderer/index.ts"
import {RendererWebGpuBackend} from "../src/webgpu-backend.ts"

function countedGpu() {
  // Exercise the production geometry upload/cache path without a native device.
  const previousUsage = Object.getOwnPropertyDescriptor(globalThis, "GPUBufferUsage")
  Object.defineProperty(globalThis, "GPUBufferUsage", {configurable: true,
    value: {COPY_DST: 8, INDEX: 16, VERTEX: 32, STORAGE: 128},
  })
  const counters = {created: 0, destroyed: 0, writes: 0}
  const invalidated: BufferGeometry[] = []
  const renderer = new Renderer() as unknown as {
    device: GPUDevice
    getOrCreateGeometryBuffers(geometry: BufferGeometry): unknown
    invalidateGeometry(geometry: BufferGeometry): void
  }
  renderer.device = {
    createBuffer({size}: GPUBufferDescriptor) {
      counters.created += 1
      return {size, destroy() { counters.destroyed += 1 }}
    },
    queue: {writeBuffer() { counters.writes += 1 }},
  } as unknown as GPUDevice
  return {counters, invalidated,
    upload(backend: RendererWebGpuBackend) {
      backend.root.traverse(node => {
        if (node instanceof Mesh && node.visible) renderer.getOrCreateGeometryBuffers(node.geometry)
      })
    },
    invalidateGeometry(geometry: BufferGeometry) {
      invalidated.push(geometry)
      renderer.invalidateGeometry(geometry)
    },
    restore() {
      if (previousUsage === undefined) Reflect.deleteProperty(globalThis, "GPUBufferUsage")
      else Object.defineProperty(globalThis, "GPUBufferUsage", previousUsage)
    },
  }
}

function rectangle(backend: RendererWebGpuBackend, frame: RenderFrame, node: HTMLElement, shadow = false): Mesh {
  const index = frame.displayList.findIndex(item => item.kind === "rect" && item.node === node && (item.shadow !== null) === shadow)
  const mesh = backend.root.children[index]
  if (!(mesh instanceof Mesh)) throw new Error("Expected retained scalar rectangle")
  return mesh
}

test("equal scalar rectangles share GPU planes while resize and removal release only their last owner", () => {
  const gpu = countedGpu()
  const document = createDocument()
  const root = document.createElement("div")
  root.setAttribute("style", "position:relative;width:300px;height:100px")
  document.append(root)
  const append = (left: number, width: number, color: string) => {
    const node = document.createElement("div")
    node.setAttribute("style", `position:absolute;left:${left}px;width:${width}px;height:20px;background:${color};border:1px solid #888;border-radius:4px;box-sizing:border-box`)
    root.append(node)
    return node
  }
  const first = append(0, 30, "#ff0000")
  const second = append(40, 30, "#00ff00")
  const third = append(90, 45, "#0000ff")
  const renderer = createDocumentRenderer({document, root, viewport: {width: 300, height: 100}})
  const backend = new RendererWebGpuBackend({rectInstancing: "disabled", invalidateGeometry: gpu.invalidateGeometry})
  try {
    const frame = renderer.flush()
    backend.applyFrame(frame)
    const firstMesh = rectangle(backend, frame, first)
    const secondMesh = rectangle(backend, frame, second)
    const thirdMesh = rectangle(backend, frame, third)
    const shared = firstMesh.geometry
    const positions = shared.attributes.position!.array.slice()
    expect(secondMesh.geometry).toBe(shared)
    expect(thirdMesh.geometry).not.toBe(shared)
    expect(firstMesh.material).not.toBe(secondMesh.material)
    expect((firstMesh.material as RoundedRectMaterial).borderWidths).toEqual([1, 1, 1, 1])
    gpu.upload(backend)
    expect(gpu.counters).toEqual({created: 8, destroyed: 0, writes: 8})

    first.setAttribute("style", `${first.getAttribute("style")};width:45px`)
    backend.applyFrame(renderer.flush())
    gpu.upload(backend)
    expect(firstMesh.geometry).toBe(thirdMesh.geometry)
    expect(secondMesh.geometry).toBe(shared)
    expect(shared.attributes.position!.array).toEqual(positions)
    expect(gpu.invalidated).toEqual([])
    expect(gpu.counters).toEqual({created: 8, destroyed: 0, writes: 8})

    third.remove()
    backend.applyFrame(renderer.flush())
    expect(gpu.invalidated).toEqual([])
    second.remove()
    backend.applyFrame(renderer.flush())
    expect(gpu.invalidated).toEqual([shared])
    expect(gpu.counters.destroyed).toBe(4)
    first.setAttribute("style", `${first.getAttribute("style")};width:60px`)
    const previous = firstMesh.geometry
    backend.applyFrame(renderer.flush())
    expect(gpu.invalidated).toEqual([shared, previous])
    gpu.upload(backend)
    expect(gpu.counters).toEqual({created: 12, destroyed: 8, writes: 12})
    backend.dispose()
    backend.dispose()
    expect(gpu.invalidated).toEqual([shared, previous, firstMesh.geometry])
    expect(gpu.counters.destroyed).toBe(gpu.counters.created)
  } finally {
    backend.dispose()
    renderer.dispose()
    gpu.restore()
  }
})

test("scrolling into unseen equal rectangles and returning reuses every uploaded GPU plane", () => {
  const gpu = countedGpu()
  const document = createDocument()
  const root = document.createElement("div")
  root.setAttribute("style", "width:120px;height:80px;overflow:auto")
  document.append(root)
  for (let index = 0; index < 300; index++) {
    const row = document.createElement("div")
    row.setAttribute("style", "width:240px;height:20px;background:#334455;border-bottom:1px solid #778899;box-sizing:border-box")
    root.append(row)
  }
  const renderer = createDocumentRenderer({document, root, viewport: {width: 140, height: 100}})
  const backend = new RendererWebGpuBackend({maxRectInstances: 1, invalidateGeometry: gpu.invalidateGeometry})
  try {
    backend.applyFrame(renderer.flush())
    const nodes = [...backend.root.children]
    const geometries = nodes.map(node => (node as Mesh).geometry)
    gpu.upload(backend)
    const initial = {...gpu.counters}
    expect(initial.created).toBeGreaterThan(0)
    for (const [left, top] of [[0, 20], [40, 160], [100, 320], [40, 20], [0, 0]] as const) {
      document.transaction(() => {
        root.scrollLeft = left
        root.scrollTop = top
      })
      const frame = renderer.flush()
      expect(readCanonicalRenderFrameChanges(frame)?.scroll).toBeDefined()
      backend.applyFrame(frame)
      gpu.upload(backend)
      expect(backend.diagnostics.rectPlanReused).toBe(true)
      expect(backend.root.children.every((node, index) => node === nodes[index] && (node as Mesh).geometry === geometries[index])).toBe(true)
      expect(gpu.counters).toEqual(initial)
    }
    expect(gpu.invalidated).toEqual([])
    backend.dispose()
    expect(gpu.counters.destroyed).toBe(initial.created)
  } finally {
    backend.dispose()
    renderer.dispose()
    gpu.restore()
  }
})

test("shadow planes use their expanded dimensions and remain independent from their bordered body", () => {
  const gpu = countedGpu()
  const document = createDocument()
  const root = document.createElement("div")
  root.setAttribute("style", "position:relative;width:240px;height:100px")
  document.append(root)
  const nodes = [0, 80].map(left => {
    const node = document.createElement("div")
    node.setAttribute("style", `position:absolute;left:${left}px;top:20px;width:40px;height:20px;background:#334455;border:2px solid #667788;box-sizing:border-box;box-shadow:0 0 8px 2px #112233`)
    root.append(node)
    return node
  })
  const renderer = createDocumentRenderer({document, root, viewport: {width: 240, height: 100}})
  const backend = new RendererWebGpuBackend({rectInstancing: "disabled", invalidateGeometry: gpu.invalidateGeometry})
  try {
    const frame = renderer.flush()
    backend.applyFrame(frame)
    const body = rectangle(backend, frame, nodes[0]!)
    const shadow = rectangle(backend, frame, nodes[0]!, true)
    expect(body.geometry).toBe(rectangle(backend, frame, nodes[1]!).geometry)
    expect(shadow.geometry).toBe(rectangle(backend, frame, nodes[1]!, true).geometry)
    expect(body.geometry).not.toBe(shadow.geometry)
    expect(body.geometry.attributes.position!.array[0]).toBe(-20)
    expect(shadow.geometry.attributes.position!.array[0]).toBe(-30)
    gpu.upload(backend)
    expect(gpu.counters.created).toBe(8)
    const unchanged = shadow.geometry.attributes.position!.array.slice()
    nodes[0]!.setAttribute("style", `${nodes[0]!.getAttribute("style")};box-shadow:0 0 12px 2px #112233`)
    const changed = renderer.flush()
    backend.applyFrame(changed)
    expect(shadow.geometry).not.toBe(rectangle(backend, changed, nodes[1]!, true).geometry)
    expect(rectangle(backend, changed, nodes[1]!, true).geometry.attributes.position!.array).toEqual(unchanged)
    expect(body.geometry).toBe(rectangle(backend, changed, nodes[1]!).geometry)
    gpu.upload(backend)
    expect(gpu.counters.created).toBe(12)
    backend.dispose()
    expect(gpu.counters.destroyed).toBe(12)
  } finally {
    backend.dispose()
    renderer.dispose()
    gpu.restore()
  }
})
