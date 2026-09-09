import {expect, test} from "bun:test"
import {
  BufferGeometry,
  ImageMaterial,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Space,
  Text,
  TextMaterial,
  TrueTypeFont,
  ViewPoint,
} from "../../engine/src/index.ts"
import {RendererWebGpuDisplayPlane} from "../../webgpu/src/display-plane.ts"
import {Renderer, type RenderComposition} from "../../webgpu/src/renderer/index.ts"
import type {RenderItem} from "../../webgpu/src/renderer/utils/render-list.ts"

const font = new TrueTypeFont(await Bun.file(new URL("../../engine/static/fonts/inter-regular.ttf", import.meta.url)).arrayBuffer())
const viewport = {width: 1024, height: 512}

type RasterTarget = {texture: GPUTexture; multisample: GPUTexture; depth: GPUTexture; width: number; height: number}
type PreparedLayer = {
  root: Object3D
  layer: {
    regularObjects: RenderItem[]
    uiObjects: RenderItem[]
    glassObjects: RenderItem[]
  }
}
type RecordedPass = {root: Object3D; items: RenderItem[]; target: RasterTarget | undefined}
type TextureRecord = {descriptor: GPUTextureDescriptor; destroys: number; texture: GPUTexture}

type TestRenderer = {
  renderComposition(composition: RenderComposition): void
  canvas: {width: number; height: number}
  context: GPUCanvasContext
  device: GPUDevice
  presentationFormat: GPUTextureFormat
  globalBindGroupLayout: GPUBindGroupLayout
  backgroundBindGroupLayout: GPUBindGroupLayout
  imageBindGroupLayout: GPUBindGroupLayout
  imageSampler: GPUSampler
  viewUniformResources: unknown[]
  isReadyToRender(): boolean
  updateTextures(): void
  updateSceneUniforms(): void
  ensurePerObjectCapacity(): void
  ensurePresentationClipCapacity(): void
  updatePerObjectData(): {uniformBytes: number; boneRanges: never[]}
  ensureViewUniformResourceCapacity(required: number): void
  ensureDisplayRasterTarget(plane: RendererWebGpuDisplayPlane): RasterTarget
  getImageBindGroup(material: ImageMaterial): GPUBindGroup
  renderPreparedLayer(encoder: GPUCommandEncoder, view: GPUTextureView, layer: PreparedLayer, indices: unknown, clear: boolean, clearValue?: GPUColor, target?: RasterTarget): void
  renderOverlayLines(): void
}

function camera(distance: number) {
  return new ViewPoint({
    position: {x: 0, y: -distance, z: 0},
    target: {x: 0, y: 0, z: 0},
    fov: Math.PI / 2,
    viewport: {left: 0, top: 0, ...viewport},
    near: 0.1,
    far: 10000,
  })
}

function display(dpi = 96) {
  const content = new Object3D()
  const mesh = new Mesh(new BufferGeometry(), new MeshBasicMaterial())
  mesh.frustumCulled = false
  const text = new Text("Мелкий текст", font, 12, new TextMaterial())
  content.add(mesh)
  content.add(text)
  const plane = new RendererWebGpuDisplayPlane({
    content,
    viewport: {width: 200 * 96 / 25.4, height: 100 * 96 / 25.4},
    worldUnitsPerPixel: 25.4 / 96,
    rasterSize: {width: Math.round(200 * dpi / 25.4), height: Math.round(100 * dpi / 25.4)},
  })
  plane.rotation.x = Math.PI / 2
  return {plane, content, mesh, text}
}

function fixture() {
  const renderer = new Renderer() as unknown as TestRenderer
  const textures: TextureRecord[] = []
  const samplers: GPUSamplerDescriptor[] = []
  const passes: RecordedPass[] = []
  const uniformRequests: number[] = []
  const rasterRequests: RendererWebGpuDisplayPlane[] = []
  renderer.device = {
    limits: {maxTextureDimension2D: 4096},
    queue: {writeBuffer() {}, submit() {}},
    createCommandEncoder: () => ({finish: () => ({})}),
    createBuffer: () => ({}),
    createBindGroup: () => ({}),
    createSampler(descriptor: GPUSamplerDescriptor) {
      samplers.push(descriptor)
      return {}
    },
    createTexture(descriptor: GPUTextureDescriptor) {
      const record: TextureRecord = {descriptor, destroys: 0, texture: null as unknown as GPUTexture}
      record.texture = {
        createView: () => ({}),
        destroy() { record.destroys++ },
      } as unknown as GPUTexture
      textures.push(record)
      return record.texture
    },
  } as unknown as GPUDevice
  renderer.canvas = {...viewport}
  renderer.context = {getCurrentTexture: () => ({createView: () => ({})})} as unknown as GPUCanvasContext
  renderer.presentationFormat = "bgra8unorm"
  renderer.globalBindGroupLayout = {} as GPUBindGroupLayout
  renderer.backgroundBindGroupLayout = {} as GPUBindGroupLayout
  renderer.imageBindGroupLayout = {} as GPUBindGroupLayout
  renderer.imageSampler = {} as GPUSampler

  // Подменены только готовность GPU, загрузка ресурсов и выполнение прохода.
  // Выбор режима, обход графа, исключения, классификация и выделение матрицы остаются production.
  renderer.isReadyToRender = () => true
  renderer.updateTextures = () => {}
  renderer.updateSceneUniforms = () => {}
  renderer.ensurePerObjectCapacity = () => {}
  renderer.ensurePresentationClipCapacity = () => {}
  renderer.updatePerObjectData = () => ({uniformBytes: 0, boneRanges: []})
  renderer.renderOverlayLines = () => {}
  const allocateUniforms = renderer.ensureViewUniformResourceCapacity.bind(renderer)
  renderer.ensureViewUniformResourceCapacity = required => {
    uniformRequests.push(required)
    allocateUniforms(required)
  }
  const allocateRaster = renderer.ensureDisplayRasterTarget.bind(renderer)
  renderer.ensureDisplayRasterTarget = plane => {
    rasterRequests.push(plane)
    return allocateRaster(plane)
  }
  renderer.renderPreparedLayer = (_encoder, _view, prepared, _indices, _clear, _clearValue, target) => {
    const items = [...prepared.layer.regularObjects, ...prepared.layer.uiObjects, ...prepared.layer.glassObjects]
    passes.push({root: prepared.root, items, target})
    for (const item of items) {
      if (item.object instanceof Mesh && item.object.material instanceof ImageMaterial) {
        renderer.getImageBindGroup(item.object.material)
      }
    }
  }
  return {
    renderer,
    textures,
    samplers,
    passes,
    uniformRequests,
    rasterRequests,
    render(composition: RenderComposition) {
      passes.length = 0
      renderer.renderComposition(composition)
    },
  }
}

function withFixture(run: (gpu: ReturnType<typeof fixture>) => void) {
  const constants = {
    GPUTextureUsage: {RENDER_ATTACHMENT: 16, TEXTURE_BINDING: 4},
    GPUBufferUsage: {UNIFORM: 64, COPY_DST: 8},
  }
  const introduced: string[] = []
  for (const [name, value] of Object.entries(constants)) {
    if (Reflect.get(globalThis, name) !== undefined) continue
    Object.defineProperty(globalThis, name, {configurable: true, value})
    introduced.push(name)
  }
  try {
    run(fixture())
  } finally {
    for (const name of introduced) Reflect.deleteProperty(globalThis, name)
  }
}

function expectContent(pass: RecordedPass, content: ReturnType<typeof display>) {
  expect(pass.items.map(item => item.type), "Обычный граф должен содержать меш и оба векторных прохода текста").toEqual(["static-mesh", "text-stencil", "text-cover"])
  expect(pass.items.map(item => item.object), "Проход должен использовать исходные объекты содержимого").toEqual([content.mesh, content.text, content.text])
}

test("Плотность 96 dpi и выше рисует исходный текст и меш без матрицы, sampler и дополнительных ресурсов камеры", () => {
  for (const dpi of [96, 192, 384]) withFixture(gpu => {
    const scene = new Space()
    const content = display(dpi)
    scene.add(content.plane)
    gpu.render({space: scene, viewPoint: camera(128)})
    expect(gpu.passes, "Для прямого дисплея должен выполняться только основной проход").toHaveLength(1)
    expectContent(gpu.passes[0]!, content)
    expect(gpu.passes[0]!.target, "Основной проход должен выводить содержимое в Canvas").toBeUndefined()
    expect(gpu.rasterRequests, "Прямой дисплей не должен запрашивать растровую матрицу").toHaveLength(0)
    expect(gpu.textures, "Прямой дисплей не должен выделять промежуточные GPU-текстуры").toHaveLength(0)
    expect(gpu.samplers, "Прямой дисплей не должен создавать sampler поверхности").toHaveLength(0)
    expect(gpu.uniformRequests, "Должен запрашиваться только один набор uniform-ресурсов общей камеры").toEqual([1])
    expect(gpu.renderer.viewUniformResources, "Прямой режим не должен создавать ресурсы растровой камеры").toHaveLength(1)
    expect(content.plane.rasterSurface, "Прямой режим не должен создавать скрытый меш растровой поверхности").toBeNull()
  })
})

test("Крупные пиксели низкоплотного дисплея добавляют один растровый проход и исключают повторное рисование текста в Canvas", () => withFixture(gpu => {
  const scene = new Space()
  const content = display(12.7)
  scene.add(content.plane)
  gpu.render({space: scene, viewPoint: camera(128)})
  expect(gpu.passes, "Низкоплотный дисплей должен добавлять ровно один проход перед основным").toHaveLength(2)
  const raster = gpu.passes[0]!
  expectContent(raster, content)
  expect(raster.target, "Содержимое должно рисоваться в номинальную матрицу 100 × 50").toMatchObject({width: 100, height: 50})
  expect(gpu.passes[1]!.items.map(item => item.object), "Canvas должен получать только поверхность матрицы без повторного текста").toEqual([content.plane.rasterSurface!])
  expect(gpu.textures.map(record => record.descriptor.label), "Растровый режим должен выделять цвет, MSAA и глубину только для Display").toEqual(["display-matrix", "display-matrix-msaa", "display-matrix-depth"])
  expect(gpu.samplers, "Крупные физические пиксели должны отображаться ближайшей выборкой").toEqual([{magFilter: "nearest", minFilter: "nearest"}])
  expect(gpu.uniformRequests, "Растровому режиму нужен один дополнительный набор uniform-ресурсов").toEqual([2])
}))

test("Переходы прямой → растровый → прямой сохраняют содержимое и освобождают только созданные ресурсы матрицы", () => withFixture(gpu => {
  const scene = new Space()
  const content = display(12.7)
  const nominalMatrix = content.plane.rasterSize
  const logicalViewport = content.plane.viewport
  const stencil = content.text.stencilGeometry
  scene.add(content.plane)
  const far = camera(1024)
  const near = camera(128)
  gpu.render({space: scene, viewPoint: far})
  expect(gpu.textures, "Дальний дисплей не должен создавать растровые ресурсы").toHaveLength(0)
  expectContent(gpu.passes[0]!, content)
  gpu.render({space: scene, viewPoint: near})
  const surface = content.plane.rasterSurface
  const firstTarget = gpu.passes[0]!.target
  gpu.render({space: scene, viewPoint: near})
  expect(gpu.textures, "Повторный растровый кадр должен переиспользовать три текстуры").toHaveLength(3)
  expect(gpu.passes[0]!.target, "Повторный кадр должен сохранять тот же растровый target").toBe(firstTarget)
  expect(gpu.textures.map(record => record.destroys), "Действующие текстуры не должны освобождаться между кадрами").toEqual([0, 0, 0])
  gpu.render({space: scene, viewPoint: far})
  expect(gpu.textures.map(record => record.destroys), "Возврат к прямой отрисовке должен один раз освобождать все три текстуры").toEqual([1, 1, 1])
  expectContent(gpu.passes[0]!, content)
  gpu.render({space: scene, viewPoint: far})
  expect(gpu.textures, "Повторный прямой кадр не должен создавать новые текстуры").toHaveLength(3)
  expect(gpu.rasterRequests, "Прямые кадры не должны повторно запрашивать матрицу").toHaveLength(2)
  expect(gpu.uniformRequests, "Возврат к прямому режиму должен перестать запрашивать растровые uniform-ресурсы").toEqual([1, 2, 2, 1, 1])
  expect(content.plane.rasterSurface, "Созданная поверхность должна сохранять identity при исключении из прямого прохода").toBe(surface)
  expect(content.plane.content, "Смена режима должна сохранять исходный корень содержимого").toBe(content.content)
  expect(content.text.stencilGeometry, "Смена режима не должна пересоздавать геометрию букв").toBe(stencil)
  expect(content.plane.viewport, "Движение камеры не должно менять область раскладки").toBe(logicalViewport)
  expect(content.plane.rasterSize, "Движение камеры не должно менять номинальную физическую матрицу").toBe(nominalMatrix)
}))

test("Скрытый дисплей не рисует содержимое и не сохраняет растровые текстуры", () => withFixture(gpu => {
  const scene = new Space()
  const ordinary = display()
  ordinary.plane.visible = false
  scene.add(ordinary.plane)
  gpu.render({space: scene, viewPoint: camera(128)})
  expect(gpu.passes.flatMap(pass => pass.items), "Скрытый дисплей должен отсутствовать в основном проходе").toHaveLength(0)
  expect(ordinary.plane.rasterSurface, "Скрытый обычный дисплей не должен создавать растровую поверхность").toBeNull()
  const coarse = display(12.7)
  scene.add(coarse.plane)
  gpu.render({space: scene, viewPoint: camera(128)})
  coarse.plane.visible = false
  gpu.render({space: scene, viewPoint: camera(128)})
  expect(gpu.passes.flatMap(pass => pass.items), "Скрытие растрового дисплея должно убирать его поверхность и содержимое").toHaveLength(0)
  expect(gpu.textures.map(record => record.destroys), "Текстуры скрытого дисплея должны освобождаться").toEqual([1, 1, 1])
}))

test("Номинальная матрица выше предела GPU не ограничивает прямую отрисовку", () => withFixture(gpu => {
  const scene = new Space()
  const content = display()
  content.plane.setRasterSize({width: 10000, height: 5000})
  scene.add(content.plane)
  expect(() => gpu.render({space: scene, viewPoint: camera(128)}), "Высокая номинальная плотность не должна требовать недоступную GPU-текстуру").not.toThrow()
  expectContent(gpu.passes[0]!, content)
  expect(gpu.textures, "Матрица выше GPU limit в прямом режиме не должна создавать текстуры").toHaveLength(0)
}))

test("Вложенный ограниченный вид выбирает режим по собственной камере и не дублирует содержимое в основном виде", () => withFixture(gpu => {
  const scene = new Space()
  const bounded = new Space()
  const content = display(12.7)
  bounded.add(content.plane)
  scene.add(bounded)
  gpu.render({
    space: scene,
    viewPoint: camera(1024),
    boundedViews: [{space: bounded, viewPoint: camera(64), viewport: {x: 0, y: 0, width: 512, height: 256}}],
  })
  expect(gpu.passes.filter(pass => pass.target !== undefined), "Собственная близкая камера должна создавать один растровый проход").toHaveLength(1)
  expectContent(gpu.passes[0]!, content)
  expect(gpu.passes.find(pass => pass.root === scene)!.items, "Основной вид не должен повторно собирать содержимое ограниченного Space").toHaveLength(0)
  expect(gpu.passes.find(pass => pass.root === bounded)!.items.map(item => item.object), "Ограниченный вид должен рисовать только поверхность растрового Display").toEqual([content.plane.rasterSurface!])
  expect(gpu.uniformRequests, "Нужны ресурсы общей камеры, ограниченного вида и одной растровой проекции").toEqual([3])
}))

test("Отдельный overlay участвует в выборе режима и рисует содержимое ровно в одном проходе", () => {
  for (const dpi of [96, 12.7]) withFixture(gpu => {
    const scene = new Space()
    const overlay = new Object3D()
    const content = display(dpi)
    overlay.add(content.plane)
    gpu.render({space: scene, viewPoint: camera(128), overlays: [overlay]})
    const contentPasses = gpu.passes.filter(pass => pass.items.some(item => item.object === content.text))
    expect(contentPasses, "Текст отдельного overlay должен собираться только в одном проходе").toHaveLength(1)
    expectContent(contentPasses[0]!, content)
    if (dpi >= 96) {
      expect(contentPasses[0]!.target, "Обычный overlay должен рисовать текст непосредственно в Canvas").toBeUndefined()
      expect(gpu.textures, "Обычный overlay не должен создавать матрицу Display").toHaveLength(0)
      expect(content.plane.rasterSurface, "Прямому overlay не нужна скрытая растровая поверхность").toBeNull()
    } else {
      expect(contentPasses[0]!.target, "Низкоплотный overlay должен рисовать содержимое в матрицу").toMatchObject({width: 100, height: 50})
      expect(gpu.passes.find(pass => pass.root === overlay)!.items.map(item => item.object), "Основной проход overlay должен содержать только поверхность матрицы").toEqual([content.plane.rasterSurface!])
      expect(gpu.textures, "Отдельному растровому overlay нужны ровно три текстуры").toHaveLength(3)
    }
  })
})
