import {beforeAll, describe, expect, test} from "bun:test"
import {
  STROKED_PATH_SEGMENT_OFFSETS,
  STROKED_PATH_SEGMENT_RECORD_BYTE_LENGTH,
  STROKED_PATH_STYLE_OFFSETS,
  STROKED_PATH_STYLE_RECORD_BYTE_LENGTH,
} from "../../core/instanced-stroked-path"
import {setupDevice} from "../../../test/setup-device"
import {strokedPathInstancedShader} from "./ui-shaders"

const WIDTH = 64
const HEIGHT = 64
const BYTES_PER_ROW = 256

describe("instanced stroked-path WebGPU pipeline", () => {
  let device: GPUDevice

  beforeAll(async () => {
    device = await setupDevice()
  })

  test("compiles the production style/segment/order and presentation-clip layout", async () => {
    const layouts = createLayouts(device)
    const module = device.createShaderModule({code: strokedPathInstancedShader})
    const pipeline = await createPipeline(device, module, layouts)

    expect(pipeline).toBeDefined()
    expect(strokedPathInstancedShader).toContain("segmentOrder[instanceIndex]")
    expect(strokedPathInstancedShader).toContain("styles[segment.styleSlot]")
    expect(strokedPathInstancedShader).toContain("presentationClipCoverage(")
    expect(strokedPathInstancedShader).toContain("fwidth(distance)")
  })

  test("draws an antialiased round capsule for one sampled segment", async () => {
    const pixels = await renderPath(device)

    expect(alphaAt(pixels, 32, 32)).toBeGreaterThan(220)
    expect(alphaAt(pixels, 10, 32)).toBeGreaterThan(100)
    expect(alphaAt(pixels, 32, 28)).toBeGreaterThan(0)
    expect(alphaAt(pixels, 10, 27)).toBeLessThan(80)
    expect(alphaAt(pixels, 2, 32)).toBe(0)
    expect(partialAlphaPixelCount(pixels)).toBeGreaterThan(0)
    expect(opaquePixelCount(pixels)).toBeGreaterThan(250)
  })

  test("intersects capsule coverage with the exact presentation clip", async () => {
    const unclipped = await renderPath(device)
    const clipped = await renderPath(device, {
      clip: {
        center: [-0.25, 0],
        halfSize: [0.2, 0.4],
        radii: [0.08, 0.08, 0.08, 0.08],
      },
    })

    expect(alphaAt(unclipped, 40, 32)).toBeGreaterThan(220)
    expect(alphaAt(clipped, 24, 32)).toBeGreaterThan(220)
    expect(alphaAt(clipped, 40, 32)).toBe(0)
    expect(alphaAt(clipped, 12, 32)).toBe(0)
    expect(opaquePixelCount(clipped)).toBeLessThan(opaquePixelCount(unclipped))
  })

  test("keeps AA support for horizontal, vertical and diagonal profiles across scale", async () => {
    const orientations: readonly Segment[] = [
      [-0.4, 0, 0.4, 0],
      [0, -0.4, 0, 0.4],
      [-0.3, -0.3, 0.3, 0.3],
    ]
    for (const segment of orientations) {
      for (const scale of [0.5, 1, 1.5]) {
        const pixels = await renderPath(device, {segments: [segment], scale})
        expect(alphaAt(pixels, 32, 32)).toBeGreaterThan(220)
        expect(partialAlphaPixelCount(pixels)).toBeGreaterThan(0)
        expect(opaquePixelCount(pixels)).toBeGreaterThan(20)
      }
    }
  })

  test("keeps opaque collinear and right-angle joins continuous without a dark core", async () => {
    for (const scale of [0.5, 1, 1.5]) {
      const continuous = await renderPath(device, {
        segments: [[-0.4, 0, 0.4, 0]],
        scale,
      })
      const collinear = await renderPath(device, {
        segments: [[-0.4, 0, 0, 0], [0, 0, 0.4, 0]],
        scale,
      })
      const corner = await renderPath(device, {
        segments: [[-0.4, 0, 0, 0], [0, 0, 0, 0.4]],
        scale,
      })

      expect(rgbaAt(collinear, 32, 32)).toEqual(rgbaAt(continuous, 32, 32))
      expect(alphaAt(collinear, 32, 32)).toBeGreaterThan(250)
      expect(alphaAt(corner, 32, 32)).toBeGreaterThan(250)
      expect(alphaAt(corner, 31, 32)).toBeGreaterThan(220)
      expect(alphaAt(corner, 32, 31)).toBeGreaterThan(220)
      expect(maxAlphaProfileDelta(continuous, collinear, 32)).toBeLessThanOrEqual(64)
    }
  })
})

type Layouts = Readonly<{
  global: GPUBindGroupLayout
  perObject: GPUBindGroupLayout
  instances: GPUBindGroupLayout
}>

type Clip = Readonly<{
  center: readonly [number, number]
  halfSize: readonly [number, number]
  radii: readonly [number, number, number, number]
}>

type Segment = readonly [fromX: number, fromY: number, toX: number, toY: number]

type RenderPathOptions = Readonly<{
  clip?: Clip
  segments?: readonly Segment[]
  scale?: number
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
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: {type: "read-only-storage"},
        },
        {binding: 2, visibility: GPUShaderStage.VERTEX, buffer: {type: "read-only-storage"}},
      ],
    }),
  }
}

function createPipeline(
  device: GPUDevice,
  module: GPUShaderModule,
  layouts: Layouts,
): Promise<GPURenderPipeline> {
  return device.createRenderPipelineAsync({
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
}

async function renderPath(
  device: GPUDevice,
  options: RenderPathOptions = {},
): Promise<Uint8Array> {
  const clip = options.clip
  const segments = options.segments ?? [[-0.6, 0, 0.6, 0]]
  const scale = options.scale ?? 1
  const layouts = createLayouts(device)
  const module = device.createShaderModule({code: strokedPathInstancedShader})
  const pipeline = await createPipeline(device, module, layouts)
  const objectData = new Float32Array(64)
  objectData.set(scaleMatrix(scale), 0)
  if (clip !== undefined) objectData.set([0, 1], 56)

  const clipData = new Float32Array(24)
  clipData.set(identityMatrix(), 0)
  if (clip !== undefined) {
    clipData.set([...clip.center, ...clip.halfSize], 16)
    clipData.set(clip.radii, 20)
  }

  const style = new Float32Array(STROKED_PATH_STYLE_RECORD_BYTE_LENGTH / 4)
  style.set([0.9, 0.2, 0.1, 1], STROKED_PATH_STYLE_OFFSETS.color)
  style.set([0.24, 1, 0, 0], STROKED_PATH_STYLE_OFFSETS.params)
  const segmentBufferData = new ArrayBuffer(
    STROKED_PATH_SEGMENT_RECORD_BYTE_LENGTH * segments.length,
  )
  const segmentFloats = new Float32Array(segmentBufferData)
  const segmentWords = new Uint32Array(segmentBufferData)
  for (let index = 0; index < segments.length; index += 1) {
    const wordOffset = index * (STROKED_PATH_SEGMENT_RECORD_BYTE_LENGTH / 4)
    segmentFloats.set(segments[index]!, wordOffset + STROKED_PATH_SEGMENT_OFFSETS.endpoints)
    segmentWords[wordOffset + STROKED_PATH_SEGMENT_OFFSETS.styleSlot] = 0
    segmentWords[wordOffset + STROKED_PATH_SEGMENT_OFFSETS.styleGeneration] = 1
  }

  const unitPositions = new Float32Array([
    -0.5, 0.5, 0,
    0.5, 0.5, 0,
    -0.5, -0.5, 0,
    0.5, -0.5, 0,
  ])
  const indices = new Uint16Array([0, 2, 1, 2, 3, 1])
  const positionBuffer = gpuBuffer(device, unitPositions, GPUBufferUsage.VERTEX)
  const indexBuffer = gpuBuffer(device, indices, GPUBufferUsage.INDEX)
  const globalBuffer = gpuBuffer(device, identityMatrix(), GPUBufferUsage.UNIFORM)
  const objectBuffer = gpuBuffer(device, objectData, GPUBufferUsage.UNIFORM)
  const clipBuffer = gpuBuffer(device, clipData, GPUBufferUsage.STORAGE)
  const styleBuffer = gpuBuffer(device, style, GPUBufferUsage.STORAGE)
  const segmentBuffer = gpuBuffer(device, new Uint8Array(segmentBufferData), GPUBufferUsage.STORAGE)
  const orderBuffer = gpuBuffer(
    device,
    Uint32Array.from({length: segments.length}, (_, index) => index),
    GPUBufferUsage.STORAGE,
  )
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
      {binding: 0, resource: {buffer: styleBuffer}},
      {binding: 1, resource: {buffer: segmentBuffer}},
      {binding: 2, resource: {buffer: orderBuffer}},
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
  pass.setBindGroup(2, instanceBindGroup)
  pass.setVertexBuffer(0, positionBuffer)
  pass.setIndexBuffer(indexBuffer, "uint16")
  pass.drawIndexed(indices.length, segments.length)
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
    indexBuffer,
    globalBuffer,
    objectBuffer,
    clipBuffer,
    styleBuffer,
    segmentBuffer,
    orderBuffer,
    readback,
  ]) buffer.destroy()
  texture.destroy()
  return pixels
}

function identityMatrix(): Float32Array {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ])
}

function scaleMatrix(scale: number): Float32Array {
  return new Float32Array([
    scale, 0, 0, 0,
    0, scale, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ])
}

function gpuBuffer(
  device: GPUDevice,
  data: ArrayBufferView,
  usage: GPUBufferUsageFlags,
): GPUBuffer {
  const buffer = device.createBuffer({
    size: Math.max(4, Math.ceil(data.byteLength / 4) * 4),
    usage: usage | GPUBufferUsage.COPY_DST,
  })
  device.queue.writeBuffer(buffer, 0, data)
  return buffer
}

function alphaAt(bytes: Uint8Array, x: number, y: number): number {
  return bytes[(y * WIDTH + x) * 4 + 3]!
}

function rgbaAt(bytes: Uint8Array, x: number, y: number): readonly number[] {
  const offset = (y * WIDTH + x) * 4
  return Array.from(bytes.subarray(offset, offset + 4))
}

function maxAlphaProfileDelta(left: Uint8Array, right: Uint8Array, x: number): number {
  let maximum = 0
  for (let y = 0; y < HEIGHT; y += 1) {
    maximum = Math.max(maximum, Math.abs(alphaAt(left, x, y) - alphaAt(right, x, y)))
  }
  return maximum
}

function opaquePixelCount(bytes: Uint8Array): number {
  let count = 0
  for (let index = 3; index < bytes.length; index += 4) {
    if (bytes[index]! > 0) count += 1
  }
  return count
}

function partialAlphaPixelCount(bytes: Uint8Array): number {
  let count = 0
  for (let index = 3; index < bytes.length; index += 4) {
    const alpha = bytes[index]!
    if (alpha > 0 && alpha < 255) count += 1
  }
  return count
}
