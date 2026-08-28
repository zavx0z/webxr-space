import {beforeAll, describe, expect, test} from "bun:test"
import {
  ROUNDED_RECT_INSTANCE_OFFSETS,
  ROUNDED_RECT_INSTANCE_RECORD_FLOATS,
} from "../../core/instanced-rounded-rect"
import {setupDevice} from "../../../test/setup-device"
import {roundedInstancedShader, roundedShader} from "./ui-shaders"

const WIDTH = 32
const HEIGHT = 32
const BYTES_PER_ROW = 256

describe("instanced rounded-rect WebGPU pipeline", () => {
  let device: GPUDevice

  beforeAll(async () => {
    device = await setupDevice()
  })

  test("matches scalar RoundedRect pixels for the admitted axis-aligned subset", async () => {
    const scalar = await renderRounded(device, false)
    const instanced = await renderRounded(device, true)

    expect(instanced).toEqual(scalar)
    expect(opaquePixelCount(instanced)).toBeGreaterThan(80)
  })

  test("matches the scalar analytical shadow expansion", async () => {
    const scalar = await renderRounded(device, false, true)
    const instanced = await renderRounded(device, true, true)

    expect(instanced).toEqual(scalar)
    expect(opaquePixelCount(instanced)).toBeGreaterThan(100)
  })

  test("compiles the production storage/order layout", async () => {
    const layouts = createLayouts(device)
    const module = device.createShaderModule({code: roundedInstancedShader})
    const pipeline = await device.createRenderPipelineAsync({
      layout: device.createPipelineLayout({
        bindGroupLayouts: [layouts.global, layouts.perObject, layouts.instances],
      }),
      vertex: {
        module,
        entryPoint: "vs_main",
        buffers: [{
          arrayStride: 12,
          attributes: [{shaderLocation: 0, offset: 0, format: "float32x3"}],
        }],
      },
      fragment: {module, entryPoint: "fs_main", targets: [{format: "rgba8unorm"}]},
      primitive: {topology: "triangle-list", cullMode: "none"},
    })

    expect(pipeline).toBeDefined()
    expect(roundedInstancedShader).toContain("order[instanceIndex]")
    expect(roundedInstancedShader).toContain("records[in.slot]")
  })
})

type Layouts = Readonly<{
  global: GPUBindGroupLayout
  perObject: GPUBindGroupLayout
  instances: GPUBindGroupLayout
}>

function createLayouts(device: GPUDevice): Layouts {
  return {
    global: device.createBindGroupLayout({
      entries: [{binding: 0, visibility: GPUShaderStage.VERTEX, buffer: {type: "uniform"}}],
    }),
    perObject: device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: {type: "uniform"},
        },
        {binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: {type: "read-only-storage"}},
      ],
    }),
    instances: device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: {type: "read-only-storage"},
        },
        {binding: 1, visibility: GPUShaderStage.VERTEX, buffer: {type: "read-only-storage"}},
      ],
    }),
  }
}

async function renderRounded(
  device: GPUDevice,
  instanced: boolean,
  shadow = false,
): Promise<Uint8Array> {
  const layouts = createLayouts(device)
  const module = device.createShaderModule({code: instanced ? roundedInstancedShader : roundedShader})
  const pipeline = await device.createRenderPipelineAsync({
    layout: device.createPipelineLayout({
      bindGroupLayouts: instanced
        ? [layouts.global, layouts.perObject, layouts.instances]
        : [layouts.global, layouts.perObject],
    }),
    vertex: {
      module,
      entryPoint: "vs_main",
      buffers: instanced
        ? [{arrayStride: 12, attributes: [{shaderLocation: 0, offset: 0, format: "float32x3"}]}]
        : [
          {arrayStride: 12, attributes: [{shaderLocation: 0, offset: 0, format: "float32x3"}]},
          {arrayStride: 12, attributes: [{shaderLocation: 1, offset: 0, format: "float32x3"}]},
        ],
    },
    fragment: {
      module,
      entryPoint: "fs_main",
      targets: [{
        format: "rgba8unorm",
        blend: {
          color: {srcFactor: "src-alpha", dstFactor: "one-minus-src-alpha", operation: "add"},
          alpha: {srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add"},
        },
      }],
    },
    primitive: {topology: "triangle-list", cullMode: "none"},
  })

  const rect = [-0.5, -0.25, 0.8, 0.6] as const
  const transform = [-1.25, 0.75, 0.1, -0.05] as const
  const shadowBlur = shadow ? 0.08 : 0
  const shadowSpread = shadow ? 0.04 : 0
  const expansion = shadowBlur + shadowSpread
  const geometryWidth = rect[2] + expansion * 2
  const geometryHeight = rect[3] + expansion * 2
  const unitPositions = new Float32Array([
    -0.5, 0.5, 0,
    0.5, 0.5, 0,
    -0.5, -0.5, 0,
    -0.5, -0.5, 0,
    0.5, 0.5, 0,
    0.5, -0.5, 0,
  ])
  const positions = instanced
    ? unitPositions
    : new Float32Array(Array.from(unitPositions, (value, index) =>
      index % 3 === 0 ? value * geometryWidth : index % 3 === 1 ? value * geometryHeight : value
    ))
  const normals = new Float32Array(positions.length)
  normals.fill(1)
  const globalData = identityMatrix()
  const objectData = new Float32Array(64)
  const centerX = transform[0] * (rect[0] + rect[2] / 2) + transform[2]
  const centerY = transform[1] * (rect[1] + rect[3] / 2) + transform[3]
  objectData.set(instanced
    ? identityMatrix()
    : matrix(transform[0], transform[1], centerX, -centerY), 0)
  objectData.set(identityMatrix(), 16)
  objectData.set([0.8, 0.1, 0.2, 0.75], 32)
  objectData.set([0.1, 0.9, 0.2, 1], 36)
  objectData.set([rect[2], rect[3], 0, 0], 40)
  objectData.set([0.12, 0.08, 0.04, 0.1], 44)
  objectData.set([0.08, 0.65, shadowBlur, shadowSpread], 48)
  objectData.set(shadow ? [0, 0, 0, 0] : [0.08, 0.08, 0.08, 0.08], 60)

  const record = new Float32Array(ROUNDED_RECT_INSTANCE_RECORD_FLOATS)
  record.set(rect, ROUNDED_RECT_INSTANCE_OFFSETS.rect)
  record.set(transform, ROUNDED_RECT_INSTANCE_OFFSETS.transform)
  record.set([0.8, 0.1, 0.2, 0.75], ROUNDED_RECT_INSTANCE_OFFSETS.fill)
  record.set([0.1, 0.9, 0.2, 1], ROUNDED_RECT_INSTANCE_OFFSETS.border)
  record.set([0.12, 0.08, 0.04, 0.1], ROUNDED_RECT_INSTANCE_OFFSETS.radii)
  record.set(
    shadow ? [0, 0, 0, 0] : [0.08, 0.08, 0.08, 0.08],
    ROUNDED_RECT_INSTANCE_OFFSETS.borderWidths,
  )
  record.set([0.65, shadowBlur, shadowSpread, 0], ROUNDED_RECT_INSTANCE_OFFSETS.params)

  const positionBuffer = gpuBuffer(device, positions, GPUBufferUsage.VERTEX)
  const normalBuffer = gpuBuffer(device, normals, GPUBufferUsage.VERTEX)
  const globalBuffer = gpuBuffer(device, globalData, GPUBufferUsage.UNIFORM)
  const objectBuffer = gpuBuffer(device, objectData, GPUBufferUsage.UNIFORM)
  const clipBuffer = gpuBuffer(device, new Float32Array(24), GPUBufferUsage.STORAGE)
  const recordBuffer = gpuBuffer(device, record, GPUBufferUsage.STORAGE)
  const orderBuffer = gpuBuffer(device, new Uint32Array([0]), GPUBufferUsage.STORAGE)
  const globalBindGroup = device.createBindGroup({
    layout: layouts.global,
    entries: [{binding: 0, resource: {buffer: globalBuffer}}],
  })
  const objectBindGroup = device.createBindGroup({
    layout: layouts.perObject,
    entries: [
      {binding: 0, resource: {buffer: objectBuffer}},
      {binding: 2, resource: {buffer: clipBuffer}},
    ],
  })
  const instanceBindGroup = device.createBindGroup({
    layout: layouts.instances,
    entries: [
      {binding: 0, resource: {buffer: recordBuffer}},
      {binding: 1, resource: {buffer: orderBuffer}},
    ],
  })
  const texture = device.createTexture({
    size: {width: WIDTH, height: HEIGHT},
    format: "rgba8unorm",
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
  })
  const readback = device.createBuffer({
    size: BYTES_PER_ROW * HEIGHT,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  })
  const encoder = device.createCommandEncoder()
  const pass = encoder.beginRenderPass({
    colorAttachments: [{
      view: texture.createView(),
      clearValue: {r: 0, g: 0, b: 0, a: 0},
      loadOp: "clear",
      storeOp: "store",
    }],
  })
  pass.setPipeline(pipeline)
  pass.setBindGroup(0, globalBindGroup)
  pass.setBindGroup(1, objectBindGroup)
  if (instanced) pass.setBindGroup(2, instanceBindGroup)
  pass.setVertexBuffer(0, positionBuffer)
  if (!instanced) pass.setVertexBuffer(1, normalBuffer)
  pass.draw(6, 1)
  pass.end()
  encoder.copyTextureToBuffer(
    {texture},
    {buffer: readback, bytesPerRow: BYTES_PER_ROW, rowsPerImage: HEIGHT},
    {width: WIDTH, height: HEIGHT},
  )
  device.queue.submit([encoder.finish()])
  await readback.mapAsync(GPUMapMode.READ)
  const padded = new Uint8Array(readback.getMappedRange())
  const pixels = new Uint8Array(WIDTH * HEIGHT * 4)
  for (let row = 0; row < HEIGHT; row += 1) {
    pixels.set(
      padded.subarray(row * BYTES_PER_ROW, row * BYTES_PER_ROW + WIDTH * 4),
      row * WIDTH * 4,
    )
  }
  readback.unmap()

  for (const buffer of [
    positionBuffer,
    normalBuffer,
    globalBuffer,
    objectBuffer,
    clipBuffer,
    recordBuffer,
    orderBuffer,
    readback,
  ]) buffer.destroy()
  texture.destroy()
  return pixels
}

function identityMatrix(): Float32Array {
  return matrix(1, 1, 0, 0)
}

function matrix(scaleX: number, scaleY: number, x: number, y: number): Float32Array {
  return new Float32Array([
    scaleX, 0, 0, 0,
    0, scaleY, 0, 0,
    0, 0, 1, 0,
    x, y, 0, 1,
  ])
}

function gpuBuffer(
  device: GPUDevice,
  data: Float32Array | Uint32Array,
  usage: GPUBufferUsageFlags,
): GPUBuffer {
  const buffer = device.createBuffer({
    size: Math.max(4, Math.ceil(data.byteLength / 4) * 4),
    usage: usage | GPUBufferUsage.COPY_DST,
  })
  device.queue.writeBuffer(buffer, 0, data)
  return buffer
}

function opaquePixelCount(bytes: Uint8Array): number {
  let count = 0
  for (let index = 3; index < bytes.length; index += 4) {
    if (bytes[index]! > 0) count += 1
  }
  return count
}
