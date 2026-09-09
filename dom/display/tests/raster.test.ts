import {expect, test} from "bun:test"
import {Object3D, Vector3} from "../../../engine/src/index.ts"
import {RendererWebGpuDisplayPlane} from "../../../webgpu/src/display-plane.ts"
import {Renderer} from "../../../webgpu/src/renderer/index.ts"

function surface() {
  return new RendererWebGpuDisplayPlane({content: new Object3D(), viewport: {width: 960, height: 480}, worldUnitsPerPixel: 25.4 / 96, rasterSize: {width: 100, height: 50}})
}

test("Растровая проекция отображает углы поверхности независимо от положения дисплея в сцене", () => {
  const plane = surface()
  plane.position.set(30, -120, 900)
  plane.quaternion.set(Math.SQRT1_2, 0, 0, Math.SQRT1_2)
  plane.scale.set(2, 3, 1)
  plane.updateWorldMatrix(true)
  const projection = plane.rasterProjection()
  const corner = new Vector3(-127, 63.5, 0).applyMatrix4(plane.matrixWorld).applyMatrix4(projection)
  expect(corner.x, "Левая граница поверхности должна проецироваться в координату −1 по X").toBeCloseTo(-1)
  expect(corner.y, "Верхняя граница поверхности должна проецироваться в координату 1 по Y").toBeCloseTo(1)
  expect(corner.z, "Поверхность дисплея должна проецироваться на глубину 0.5").toBeCloseTo(0.5)
  const content = plane.content
  const quad = plane.surface
  plane.setRasterSize({width: 1920, height: 960})
  expect(plane.content, "Изменение матрицы не должно заменять граф содержимого").toBe(content)
  expect(plane.surface, "Изменение матрицы не должно заменять поверхность дисплея").toBe(quad)
  expect(plane.viewport, "Изменение матрицы не должно менять область раскладки").toEqual({width: 960, height: 480})
})

test("Рендерер сохраняет ресурсы матрицы, выбирает ближайший пиксель, меняет размер и освобождает текстуры", () => {
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
    expect(created, "Для матрицы должны создаваться три текстуры: цвет, сглаживание и глубина").toHaveLength(3)
    expect(created[0]!.descriptor.size, "Начальная цветовая текстура должна иметь размер 100 × 50").toEqual([100, 50])
    expect(renderer.ensureDisplayRasterTarget(plane), "Повторный запрос той же матрицы должен сохранять её ресурсы").toBe(first)
    renderer.getImageBindGroup(plane.rasterMaterial)
    expect(samplers[0], "Матрица дисплея должна использовать выбор ближайшего пикселя").toMatchObject({magFilter: "nearest", minFilter: "nearest"})
    plane.setRasterSize({width: 1920, height: 960})
    renderer.ensureDisplayRasterTarget(plane)
    expect(created, "Изменение размера матрицы должно создать три новые текстуры").toHaveLength(6)
    expect(created.slice(0, 3).every(record => record.destroyed), "После изменения размера прежние текстуры должны быть освобождены").toBe(true)
    expect(created[3]!.descriptor.size, "Новая цветовая текстура должна иметь размер 1920 × 960").toEqual([1920, 960])
    renderer.releaseDisplay(plane)
    expect(created.every(record => record.destroyed), "Удаление дисплея должно освобождать все созданные текстуры").toBe(true)
    plane.setRasterSize({width: 5000, height: 100})
    expect(() => renderer.ensureDisplayRasterTarget(plane), "Матрица больше предела GPU должна отклоняться").toThrow("maxTextureDimension2D")
    expect(created, "Отклонённый размер не должен создавать новые текстуры").toHaveLength(6)
  } finally {
    if (!prior) Reflect.deleteProperty(globalThis, "GPUTextureUsage")
  }
})
