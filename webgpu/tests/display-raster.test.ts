import {expect, test} from "bun:test"
import {Object3D, Vector3} from "@zavx0z/engine"
import {RendererWebGpuDisplayPlane} from "../src/display-plane.ts"
import {Renderer} from "../src/renderer/index.ts"

function surface() {
  return new RendererWebGpuDisplayPlane({content: new Object3D(), viewport: {width: 960, height: 480}, worldUnitsPerPixel: 25.4 / 96, rasterSize: {width: 100, height: 50}})
}

test("finite raster projection maps the physical surface corners independently of world pose", () => {
  const plane = surface()
  plane.position.set(30, -120, 900)
  plane.quaternion.set(Math.SQRT1_2, 0, 0, Math.SQRT1_2)
  plane.scale.set(2, 3, 1)
  plane.updateWorldMatrix(true)
  const projection = plane.rasterProjection()
  const corner = new Vector3(-127, 63.5, 0).applyMatrix4(plane.matrixWorld).applyMatrix4(projection)
  expect(corner.x).toBeCloseTo(-1)
  expect(corner.y).toBeCloseTo(1)
  expect(corner.z).toBeCloseTo(0.5)
  const content = plane.content
  const quad = plane.surface
  plane.setRasterSize({width: 1920, height: 960})
  expect(plane.content).toBe(content)
  expect(plane.surface).toBe(quad)
  expect(plane.viewport).toEqual({width: 960, height: 480})
})

test("Renderer retains matrix attachments, samples pixels without an image URL, reallocates only on resolution change, and releases them", () => {
  const prior = globalThis.GPUTextureUsage
  if (!prior) Object.defineProperty(globalThis, "GPUTextureUsage", {configurable: true, value: {RENDER_ATTACHMENT: 16, TEXTURE_BINDING: 4}})
  try {
    const created: {descriptor: GPUTextureDescriptor; destroyed: boolean; texture: GPUTexture}[] = []
    const samplers: GPUSamplerDescriptor[] = []
    const renderer = new Renderer() as unknown as {
      device: GPUDevice
      presentationFormat: GPUTextureFormat
      imageBindGroupLayout: GPUBindGroupLayout
      imageSampler: GPUSampler
      ensureDisplayRasterTarget(plane: RendererWebGpuDisplayPlane): {texture: GPUTexture; multisample: GPUTexture; depth: GPUTexture; width: number; height: number}
      getImageBindGroup(material: unknown): GPUBindGroup
      releaseDisplay(plane: RendererWebGpuDisplayPlane): void
    }
    renderer.device = {
      limits: {maxTextureDimension2D: 4096},
      createTexture(descriptor: GPUTextureDescriptor) {
        const record = {descriptor, destroyed: false, texture: null as unknown as GPUTexture}
        record.texture = {createView: () => ({record}), destroy: () => { record.destroyed = true }} as unknown as GPUTexture
        created.push(record)
        return record.texture
      },
      createSampler(descriptor: GPUSamplerDescriptor) { samplers.push(descriptor); return {} },
      createBindGroup: (descriptor: unknown) => ({descriptor}),
    } as unknown as GPUDevice
    renderer.presentationFormat = "bgra8unorm"
    renderer.imageBindGroupLayout = {} as GPUBindGroupLayout
    renderer.imageSampler = {} as GPUSampler
    const plane = surface()
    const first = renderer.ensureDisplayRasterTarget(plane)
    expect(created).toHaveLength(3)
    expect(created[0]!.descriptor.size).toEqual([100, 50])
    expect(renderer.ensureDisplayRasterTarget(plane)).toBe(first)
    renderer.getImageBindGroup(plane.rasterMaterial)
    expect(samplers[0]).toMatchObject({magFilter: "nearest", minFilter: "nearest"})
    plane.setRasterSize({width: 1920, height: 960})
    renderer.ensureDisplayRasterTarget(plane)
    expect(created).toHaveLength(6)
    expect(created.slice(0, 3).every(record => record.destroyed)).toBe(true)
    expect(created[3]!.descriptor.size).toEqual([1920, 960])
    renderer.releaseDisplay(plane)
    expect(created.every(record => record.destroyed)).toBe(true)
    plane.setRasterSize({width: 5000, height: 100})
    expect(() => renderer.ensureDisplayRasterTarget(plane)).toThrow("maxTextureDimension2D")
    expect(created).toHaveLength(6)
  } finally {
    if (!prior) Reflect.deleteProperty(globalThis, "GPUTextureUsage")
  }
})
