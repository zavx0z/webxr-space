import {beforeAll, describe, expect, test} from "bun:test"
import {setupDevice} from "../../test/setup-device"
import {ViewPoint} from "../core/view-point"
import {Color} from "../math/color"
import {Space} from "../scenes/space"
import {Renderer} from "./index"
import {renderCompositionBackgroundShader} from "./render-composition"

const WIDTH = 16
const HEIGHT = 12
const BYTES_PER_ROW = 256

describe("Renderer bounded composition WebGPU pass", () => {
  let device: GPUDevice

  beforeAll(async () => {
    device = await setupDevice()
  })

  test("paints one exact viewport without changing pixels outside its scissor", async () => {
    const layout = device.createBindGroupLayout({
      entries: [{
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: {type: "uniform"},
      }],
    })
    const module = device.createShaderModule({code: renderCompositionBackgroundShader})
    const pipeline = await device.createRenderPipelineAsync({
      layout: device.createPipelineLayout({bindGroupLayouts: [layout]}),
      vertex: {module, entryPoint: "vs_main"},
      fragment: {module, entryPoint: "fs_main", targets: [{format: "rgba8unorm"}]},
      primitive: {topology: "triangle-list", cullMode: "none"},
      depthStencil: {
        depthWriteEnabled: false,
        depthCompare: "always",
        format: "depth24plus-stencil8",
      },
      multisample: {count: 4},
    })
    const colorBuffer = device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })
    device.queue.writeBuffer(colorBuffer, 0, new Float32Array([1, 0, 0, 1]))
    const bindGroup = device.createBindGroup({
      layout,
      entries: [{binding: 0, resource: {buffer: colorBuffer}}],
    })
    const multisample = device.createTexture({
      size: {width: WIDTH, height: HEIGHT},
      sampleCount: 4,
      format: "rgba8unorm",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    })
    const resolved = device.createTexture({
      size: {width: WIDTH, height: HEIGHT},
      format: "rgba8unorm",
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    })
    const depth = device.createTexture({
      size: {width: WIDTH, height: HEIGHT},
      sampleCount: 4,
      format: "depth24plus-stencil8",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    })
    const readback = device.createBuffer({
      size: BYTES_PER_ROW * HEIGHT,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    })
    const encoder = device.createCommandEncoder()
    const clearPass = encoder.beginRenderPass({
      colorAttachments: [{
        view: multisample.createView(),
        resolveTarget: resolved.createView(),
        clearValue: {r: 0, g: 0, b: 0, a: 1},
        loadOp: "clear",
        storeOp: "store",
      }],
      depthStencilAttachment: {
        view: depth.createView(),
        depthClearValue: 1,
        depthLoadOp: "clear",
        depthStoreOp: "store",
        stencilClearValue: 0,
        stencilLoadOp: "clear",
        stencilStoreOp: "store",
      },
    })
    clearPass.end()
    const viewPass = encoder.beginRenderPass({
      colorAttachments: [{
        view: multisample.createView(),
        resolveTarget: resolved.createView(),
        loadOp: "load",
        storeOp: "store",
      }],
      depthStencilAttachment: {
        view: depth.createView(),
        depthClearValue: 1,
        depthLoadOp: "clear",
        depthStoreOp: "store",
        stencilClearValue: 0,
        stencilLoadOp: "clear",
        stencilStoreOp: "store",
      },
    })
    viewPass.setViewport(4, 3, 6, 4, 0, 1)
    viewPass.setScissorRect(4, 3, 6, 4)
    viewPass.setPipeline(pipeline)
    viewPass.setBindGroup(0, bindGroup)
    viewPass.draw(3)
    viewPass.end()
    encoder.copyTextureToBuffer(
      {texture: resolved},
      {buffer: readback, bytesPerRow: BYTES_PER_ROW, rowsPerImage: HEIGHT},
      {width: WIDTH, height: HEIGHT},
    )
    device.queue.submit([encoder.finish()])
    await readback.mapAsync(GPUMapMode.READ)
    const bytes = new Uint8Array(readback.getMappedRange())

    expect(pixel(bytes, 5, 4)).toEqual([255, 0, 0, 255])
    expect(pixel(bytes, 3, 4)).toEqual([0, 0, 0, 255])
    expect(pixel(bytes, 10, 4)).toEqual([0, 0, 0, 255])
    expect(pixel(bytes, 5, 2)).toEqual([0, 0, 0, 255])
    expect(pixel(bytes, 5, 7)).toEqual([0, 0, 0, 255])

    readback.unmap()
    readback.destroy()
    colorBuffer.destroy()
    multisample.destroy()
    resolved.destroy()
    depth.destroy()
  })

  test("presents base and bounded Space backgrounds through one Renderer current texture", async () => {
    const presentation = fakePresentationCanvas(WIDTH, HEIGHT)
    const renderer = new Renderer()
    await renderer.init(presentation.canvas)
    renderer.setPixelRatio(1)
    renderer.setSize(WIDTH, HEIGHT)
    const base = new Space()
    base.background = new Color(0x0000ff)
    const bounded = new Space()
    bounded.background = new Color(0xff0000)
    base.add(bounded)
    base.updateWorldMatrix(true)
    renderer.renderComposition({
      space: base,
      viewPoint: hostViewPoint(WIDTH, HEIGHT),
      boundedViews: [{
        space: bounded,
        viewPoint: hostViewPoint(6, 4),
        viewport: {x: 4, y: 3, width: 6, height: 4},
      }],
    })
    const seam = renderer as unknown as {
      device: GPUDevice
      presentationFormat: GPUTextureFormat
      presentedFrameTexture: GPUTexture
    }
    const bytes = await readTexture(seam.device, seam.presentedFrameTexture)

    expect(rgba(bytes, 5, 4, seam.presentationFormat)).toEqual([255, 0, 0, 255])
    expect(rgba(bytes, 3, 4, seam.presentationFormat)).toEqual([0, 0, 255, 255])
    expect(rgba(bytes, 10, 4, seam.presentationFormat)).toEqual([0, 0, 255, 255])
    expect(rgba(bytes, 5, 2, seam.presentationFormat)).toEqual([0, 0, 255, 255])
    expect(rgba(bytes, 5, 7, seam.presentationFormat)).toEqual([0, 0, 255, 255])

    presentation.dispose()
  })
})

function pixel(bytes: Uint8Array, x: number, y: number): readonly number[] {
  const offset = y * BYTES_PER_ROW + x * 4
  return [bytes[offset]!, bytes[offset + 1]!, bytes[offset + 2]!, bytes[offset + 3]!]
}

function hostViewPoint(width: number, height: number): ViewPoint {
  return new ViewPoint({
    controls: "host",
    viewport: {left: 0, top: 0, width, height},
    position: {x: 0, y: -10, z: 0},
    target: {x: 0, y: 0, z: 0},
  })
}

function fakePresentationCanvas(width: number, height: number): Readonly<{
  canvas: HTMLCanvasElement
  dispose(): void
}> {
  let currentTexture: GPUTexture | null = null
  let configuredDevice: GPUDevice | null = null
  let configuredFormat: GPUTextureFormat | null = null
  let configuredUsage: GPUTextureUsageFlags = GPUTextureUsage.RENDER_ATTACHMENT
  const canvas = {
    width,
    height,
    getContext(kind: string) {
      if (kind !== "webgpu") return null
      return {
        configure(configuration: GPUCanvasConfiguration) {
          configuredDevice = configuration.device
          configuredFormat = configuration.format
          configuredUsage = configuration.usage ?? GPUTextureUsage.RENDER_ATTACHMENT
          currentTexture?.destroy()
          currentTexture = null
        },
        getCurrentTexture() {
          if (configuredDevice === null || configuredFormat === null) {
            throw new Error("Fake presentation context is not configured")
          }
          currentTexture?.destroy()
          currentTexture = configuredDevice.createTexture({
            size: {width: canvas.width, height: canvas.height},
            format: configuredFormat,
            usage: configuredUsage,
          })
          return currentTexture
        },
      } as GPUCanvasContext
    },
  } as unknown as HTMLCanvasElement
  return {
    canvas,
    dispose() {
      currentTexture?.destroy()
      currentTexture = null
    },
  }
}

async function readTexture(device: GPUDevice, texture: GPUTexture): Promise<Uint8Array> {
  const readback = device.createBuffer({
    size: BYTES_PER_ROW * HEIGHT,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  })
  const encoder = device.createCommandEncoder()
  encoder.copyTextureToBuffer(
    {texture},
    {buffer: readback, bytesPerRow: BYTES_PER_ROW, rowsPerImage: HEIGHT},
    {width: WIDTH, height: HEIGHT},
  )
  device.queue.submit([encoder.finish()])
  await readback.mapAsync(GPUMapMode.READ)
  const bytes = new Uint8Array(readback.getMappedRange()).slice()
  readback.unmap()
  readback.destroy()
  return bytes
}

function rgba(
  bytes: Uint8Array,
  x: number,
  y: number,
  format: GPUTextureFormat,
): readonly number[] {
  const value = pixel(bytes, x, y)
  return format.startsWith("bgra")
    ? [value[2]!, value[1]!, value[0]!, value[3]!]
    : value
}
