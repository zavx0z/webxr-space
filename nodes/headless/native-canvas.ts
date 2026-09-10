import {PNG} from "pngjs"
import {globalConstructors} from "bun-webgpu"

const {GPUBufferUsage, GPUTextureUsage, GPUMapMode} = globalConstructors

/** Целочисленная область GPU-текстуры в физических пикселях, включая границу компонента. */
export type NativeCanvasClip = Readonly<{x: number, y: number, width: number, height: number}>

/**
Оконная поверхность для нативного spec: поддерживает только `getContext("webgpu")`.

Контекст выдаёт настоящую GPU-текстуру. Размер фиксирован на время кадра;
DOM, ввод и Canvas 2D этот адаптер не реализует. Один экземпляр принадлежит
одному Renderer в отдельном процессе проверки.

@property width - Ширина backing texture в пикселях, положительное целое число.

@property height - Высота backing texture в пикселях, положительное целое число.
*/
export class NativeGpuCanvas {
  readonly #context: NativeGpuCanvasContext

  constructor(readonly width: number, readonly height: number) {
    if (!Number.isSafeInteger(width) || width <= 0 || !Number.isSafeInteger(height) || height <= 0) {
      throw new Error("Размер нативного Canvas должен состоять из положительных целых чисел")
    }
    this.#context = new NativeGpuCanvasContext(this)
  }

  getContext(type: string): GPUCanvasContext | null {
    return type === "webgpu" ? this.#context : null
  }

  /** Граница совместимости с Renderer.init, использующим размеры и WebGPU-контекст Canvas. */
  asHtmlCanvas(): HTMLCanvasElement {
    return this as unknown as HTMLCanvasElement
  }

  /**
  Читает выбранную область уже нарисованной текстуры и возвращает PNG без внешних полей.

  @param clip - Область внутри Canvas; без аргумента читается вся поверхность.
  @throws Если координаты нецелые, размеры неположительные или область выходит за Canvas.
  */
  async screenshot(clip: NativeCanvasClip = {x: 0, y: 0, width: this.width, height: this.height}): Promise<Buffer> {
    const {x, y, width, height} = clip
    if (![x, y, width, height].every(Number.isSafeInteger) || x < 0 || y < 0 || width <= 0 || height <= 0
      || x + width > this.width || y + height > this.height) {
      throw new Error("Область снимка должна иметь целые координаты и положительные размеры внутри Canvas")
    }
    const rgba = await this.#context.readRgba(clip)
    const image = new PNG({width, height})
    image.data = Buffer.from(rgba)
    return PNG.sync.write(image)
  }

  /** Освобождает поверхность и выделенное для этой проверки устройство Renderer. */
  dispose(): void {
    const device = this.#context.getConfiguration()?.device
    this.#context.unconfigure()
    device?.destroy()
  }
}

class NativeGpuCanvasContext implements GPUCanvasContext {
  readonly __brand = "GPUCanvasContext"
  readonly canvas: HTMLCanvasElement
  #configuration: GPUCanvasConfiguration | null = null
  #texture: GPUTexture | null = null

  constructor(private readonly surface: NativeGpuCanvas) {
    this.canvas = surface.asHtmlCanvas()
  }

  configure(configuration: GPUCanvasConfiguration): undefined {
    this.unconfigure()
    this.#configuration = {...configuration}
    this.#texture = configuration.device.createTexture({
      size: {width: this.surface.width, height: this.surface.height},
      format: configuration.format,
      usage: (configuration.usage ?? GPUTextureUsage.RENDER_ATTACHMENT) | GPUTextureUsage.COPY_SRC,
    })
  }

  unconfigure(): undefined {
    this.#texture?.destroy()
    this.#texture = null
    this.#configuration = null
  }

  getConfiguration(): GPUCanvasConfigurationOut | null {
    return this.#configuration === null ? null : {
      ...this.#configuration,
      usage: this.#configuration.usage ?? GPUTextureUsage.RENDER_ATTACHMENT,
      viewFormats: [...this.#configuration.viewFormats ?? []],
      colorSpace: this.#configuration.colorSpace ?? "srgb",
      alphaMode: this.#configuration.alphaMode ?? "opaque",
      toneMapping: this.#configuration.toneMapping ?? {mode: "standard"},
    }
  }

  getCurrentTexture(): GPUTexture {
    if (this.#texture === null) throw new Error("Нативный Canvas ещё не настроен через configure")
    return this.#texture
  }

  async readRgba(clip: NativeCanvasClip): Promise<Uint8Array> {
    const configuration = this.#configuration
    if (configuration === null) throw new Error("Нельзя прочитать кадр ненастроенного Canvas")
    const {device, format} = configuration
    if (format !== "rgba8unorm" && format !== "bgra8unorm") {
      throw new Error(`Нативная PNG-fixture не поддерживает формат ${format}`)
    }
    const {width, height} = clip
    const bytesPerRow = Math.ceil(width * 4 / 256) * 256
    const buffer = device.createBuffer({size: bytesPerRow * height, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ})
    let mapped = false
    try {
      const encoder = device.createCommandEncoder()
      encoder.copyTextureToBuffer(
        {texture: this.getCurrentTexture(), origin: {x: clip.x, y: clip.y}},
        {buffer, bytesPerRow, rowsPerImage: height},
        {width, height},
      )
      device.queue.submit([encoder.finish()])
      await buffer.mapAsync(GPUMapMode.READ)
      mapped = true
      const bytes = new Uint8Array(buffer.getMappedRange())
      const rgba = new Uint8Array(width * height * 4)
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const source = y * bytesPerRow + x * 4
          const target = (y * width + x) * 4
          rgba[target] = bytes[source + (format === "bgra8unorm" ? 2 : 0)]!
          rgba[target + 1] = bytes[source + 1]!
          rgba[target + 2] = bytes[source + (format === "bgra8unorm" ? 0 : 2)]!
          rgba[target + 3] = bytes[source + 3]!
        }
      }
      return rgba
    } finally {
      if (mapped) buffer.unmap()
      buffer.destroy()
    }
  }
}
