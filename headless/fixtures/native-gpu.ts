import {createGPUInstance, globalConstructors} from "bun-webgpu"
import {NativeGpuCanvas} from "../native-canvas.ts"
import {installShaderCompilationDiagnostics} from "../shader-diagnostics.ts"

const {GPUBufferUsage, GPUTextureUsage, GPUMapMode} = globalConstructors

/**
Результат настоящего рендера в текстуру без окна и браузерного Canvas.

@property rgba - Пиксели построчно в RGBA8, без выравнивающих байтов GPU.

@property adapter - Данные выбранного нативного адаптера для отчёта проверки.
*/
export type NativeGpuProbe = Readonly<{
  width: number
  height: number
  rgba: Uint8Array
  pngBase64: string
  adapter: Readonly<{vendor: string, device: string, description: string}>
}>

/**
Рисует красный треугольник на синем фоне через Dawn из `bun-webgpu`.

Это проверка нативного GPU-пути, а не изображение прикладного компонента. Собственная
текстура заменяет оконную поверхность; компонентный layout здесь не выполняется.
Глобальные `navigator` и WebGPU-конструкторы не подменяются.
Буфер, текстура, устройство и экземпляр GPU освобождаются до возврата результата.

@returns Изображение 17 × 13 пикселей и сведения об адаптере. Ширина намеренно
не кратна GPU-выравниванию строки: чтение удаляет padding до 256 байт.

@throws Если нативный пакет не загрузился, адаптер недоступен или GPU-операция завершилась ошибкой.
*/
export async function renderBunWebGpuProbe(): Promise<NativeGpuProbe> {
  const width = 17
  const height = 13
  const bytesPerRow = Math.ceil(width * 4 / 256) * 256
  const gpu = createGPUInstance()
  const canvas = new NativeGpuCanvas(width, height)
  const context = canvas.getContext("webgpu")!
  let device: GPUDevice | undefined
  let buffer: GPUBuffer | undefined
  let mapped = false
  try {
    const adapter = await gpu.requestAdapter()
    if (adapter === null) throw new Error("bun-webgpu не предоставил нативный GPU-адаптер")
    device = await adapter.requestDevice()
    context.configure({
      device,
      format: "rgba8unorm",
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    })
    const texture = context.getCurrentTexture()
    buffer = device.createBuffer({
      size: bytesPerRow * height,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    })
    const shader = device.createShaderModule({code: `
      @vertex fn vertex(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
        let vertices = array<vec2f, 3>(vec2f(-0.8, -0.8), vec2f(0.8, -0.8), vec2f(0.0, 0.8));
        return vec4f(vertices[index], 0.0, 1.0);
      }

      @fragment fn fragment() -> @location(0) vec4f {
        return vec4f(1.0, 0.0, 0.0, 1.0);
      }
    `})
    const pipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: {module: shader, entryPoint: "vertex"},
      fragment: {module: shader, entryPoint: "fragment", targets: [{format: "rgba8unorm"}]},
      primitive: {topology: "triangle-list"},
    })
    const encoder = device.createCommandEncoder()
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: texture.createView(),
        clearValue: {r: 0, g: 0, b: 1, a: 1},
        loadOp: "clear",
        storeOp: "store",
      }],
    })
    pass.setPipeline(pipeline)
    pass.draw(3)
    pass.end()
    encoder.copyTextureToBuffer(
      {texture},
      {buffer, bytesPerRow, rowsPerImage: height},
      {width, height},
    )
    device.queue.submit([encoder.finish()])
    await buffer.mapAsync(GPUMapMode.READ)
    mapped = true
    const bytes = new Uint8Array(buffer.getMappedRange())
    const rgba = new Uint8Array(width * height * 4)
    for (let row = 0; row < height; row += 1) {
      rgba.set(bytes.subarray(row * bytesPerRow, row * bytesPerRow + width * 4), row * width * 4)
    }
    return {
      width,
      height,
      rgba,
      pngBase64: (await canvas.screenshot()).toString("base64"),
      adapter: {vendor: adapter.info.vendor, device: adapter.info.device, description: adapter.info.description},
    }
  } finally {
    if (mapped) buffer!.unmap()
    buffer?.destroy()
    context.unconfigure()
    device?.destroy()
    gpu.destroy()
  }
}

// Нативный FFI запускается отдельным процессом, чтобы сбой драйвера не прерывал остальные spec.
if (import.meta.main) {
  if (process.argv[2] === "diagnostics") {
    Object.assign(globalThis, globalConstructors)
    const gpu = createGPUInstance()
    let device: GPUDevice | undefined
    try {
      const adapter = await gpu.requestAdapter()
      if (adapter === null) throw new Error("Не найден адаптер для проверки ошибок WGSL")
      device = await adapter.requestDevice()
      installShaderCompilationDiagnostics(device)
      const valid = device.createShaderModule({code: "@compute @workgroup_size(1) fn main() {}"})
      const invalid = device.createShaderModule({code: "this is deliberately invalid WGSL"})
      console.log(JSON.stringify({valid: await valid.getCompilationInfo(), invalid: await invalid.getCompilationInfo()}))
    } finally {
      device?.destroy()
      gpu.destroy()
    }
  } else {
    const frame = await renderBunWebGpuProbe()
    console.log(JSON.stringify({...frame, rgba: [...frame.rgba]}))
  }
}
