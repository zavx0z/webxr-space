import {beforeAll, describe, expect, test} from "bun:test"
import {Object3D} from "../../core/object-3d"
import type {PresentationClipShape} from "../../core/presentation-clip"
import {setupDevice} from "../../../test/setup-device"
import {PRESENTATION_CLIP_RANGE_FLOAT_OFFSET, encodePresentationClipChains} from "../presentation-clip-upload"
import {TEXT_COVER_FACE_STATE, TEXT_STENCIL_BACK_FACE_STATE, TEXT_STENCIL_FACE_STATE} from "../text-stencil"
import {
  colorPickerShader,
  imageExternalShader,
  imageShader,
  meshBasicShader,
  radialBackdropShader,
  roundedShader,
  textShader,
} from "./ui-shaders"

const WIDTH = 32
const HEIGHT = 32
const BYTES_PER_ROW = 256

describe("presentation clip WebGPU pixels", () => {
  let device: GPUDevice

  beforeAll(async () => {
    device = await setupDevice()
  })

  test("intersects translated, scaled and rotated rounded clips for ordinary meshes", async () => {
    const [outer, inner] = transformedClipShapes()
    const outerPixels = await renderMeshBasic(device, clipData([outer]))
    const nestedPixels = await renderMeshBasic(device, clipData([outer, inner]))

    expect(pixel(nestedPixels, WIDTH / 2, HEIGHT / 2)[3]).toBeGreaterThan(200)
    const corners: ReadonlyArray<readonly [number, number]> = [
      [1, 1],
      [WIDTH - 2, 1],
      [1, HEIGHT - 2],
      [WIDTH - 2, HEIGHT - 2],
    ]
    for (const [x, y] of corners) {
      expect(pixel(nestedPixels, x, y)[3]).toBe(0)
    }
    expect(opaquePixelCount(nestedPixels)).toBeLessThan(opaquePixelCount(outerPixels))
    expect(opaquePixelCount(nestedPixels)).toBeGreaterThan(80)
  })

  test("applies the same nested rounded chain to text stencil and cover", async () => {
    const clips = clipData(transformedClipShapes())
    const meshPixels = await renderMeshBasic(device, clips)
    const textPixels = await renderTextStencilAndCover(device, clips)

    expect(pixel(textPixels, WIDTH / 2, HEIGHT / 2)[3]).toBeGreaterThan(200)
    expect(pixel(textPixels, 1, 1)[3]).toBe(0)
    expect(Math.abs(opaquePixelCount(textPixels) - opaquePixelCount(meshPixels))).toBeLessThanOrEqual(4)
  })

  test("fails closed for a non-invertible clip coordinate space", async () => {
    const coordinateSpace = new Object3D()
    coordinateSpace.scale.set(0, 1, 1)
    coordinateSpace.updateWorldMatrix()
    const pixels = await renderMeshBasic(device, clipData([{
      kind: "rounded-rect",
      coordinateSpace,
      center: [0, 0],
      halfSize: [1, 1],
      radii: [0.2, 0.2, 0.2, 0.2],
    }]))

    expect(opaquePixelCount(pixels)).toBe(0)
  })

  test("compiles every composed UiSurface material pipeline", async () => {
    const global = device.createBindGroupLayout({
      entries: [
        {binding: 0, visibility: GPUShaderStage.VERTEX, buffer: {type: "uniform"}},
        {binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: {type: "uniform"}},
      ],
    })
    const perObject = device.createBindGroupLayout({
      entries: [
        {binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: {type: "uniform"}},
        {binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: {type: "read-only-storage"}},
      ],
    })
    const image = device.createBindGroupLayout({
      entries: [
        {binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {type: "filtering"}},
        {binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: {sampleType: "float"}},
      ],
    })
    const externalImage = device.createBindGroupLayout({
      entries: [
        {binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: {type: "filtering"}},
        {binding: 1, visibility: GPUShaderStage.FRAGMENT, externalTexture: {}},
      ],
    })
    const normalBuffers: GPUVertexBufferLayout[] = [
      {arrayStride: 12, attributes: [{shaderLocation: 0, offset: 0, format: "float32x3"}]},
      {arrayStride: 12, attributes: [{shaderLocation: 1, offset: 0, format: "float32x3"}]},
    ]
    const imageBuffers: GPUVertexBufferLayout[] = [
      {arrayStride: 12, attributes: [{shaderLocation: 0, offset: 0, format: "float32x3"}]},
      {arrayStride: 8, attributes: [{shaderLocation: 1, offset: 0, format: "float32x2"}]},
    ]
    const cases = [
      {shader: meshBasicShader, buffers: normalBuffers, groups: [global, perObject]},
      {shader: roundedShader, buffers: normalBuffers, groups: [global, perObject]},
      {shader: colorPickerShader, buffers: normalBuffers, groups: [global, perObject]},
      {shader: radialBackdropShader, buffers: normalBuffers, groups: [global, perObject]},
      {shader: imageShader, buffers: imageBuffers, groups: [global, perObject, image]},
      {shader: imageExternalShader, buffers: imageBuffers, groups: [global, perObject, externalImage]},
    ] as const

    for (const item of cases) {
      const module = device.createShaderModule({code: item.shader})
      const pipeline = await device.createRenderPipelineAsync({
        layout: device.createPipelineLayout({bindGroupLayouts: [...item.groups]}),
        vertex: {module, entryPoint: "vs_main", buffers: [...item.buffers]},
        fragment: {module, entryPoint: "fs_main", targets: [{format: "rgba8unorm"}]},
        primitive: {topology: "triangle-list", cullMode: "none"},
      })
      expect(pipeline).toBeDefined()
    }
  })
})

function transformedClipShapes(): readonly [PresentationClipShape, PresentationClipShape] {
  const outerSpace = new Object3D()
  outerSpace.position.set(0.08, -0.04, 0)
  outerSpace.scale.set(0.85, 0.65, 1)
  outerSpace.rotation.z = Math.PI / 8
  outerSpace.updateWorldMatrix()

  const innerSpace = new Object3D()
  innerSpace.position.set(-0.12, 0.08, 0)
  innerSpace.scale.set(0.7, 0.9, 1)
  innerSpace.rotation.z = -Math.PI / 9
  innerSpace.updateWorldMatrix()

  return [
    {
      kind: "rounded-rect",
      coordinateSpace: outerSpace,
      center: [0, 0],
      halfSize: [0.8, 0.65],
      radii: [0.28, 0.18, 0.3, 0.12],
    },
    {
      kind: "rounded-rect",
      coordinateSpace: innerSpace,
      center: [0, 0],
      halfSize: [0.65, 0.55],
      radii: [0.2, 0.26, 0.14, 0.22],
    },
  ]
}

function clipData(shapes: readonly PresentationClipShape[]): Float32Array {
  const renderable = new Object3D()
  renderable.presentationClips = shapes
  return encodePresentationClipChains([renderable]).data
}

async function renderMeshBasic(device: GPUDevice, clips: Float32Array): Promise<Uint8Array> {
  const module = device.createShaderModule({code: meshBasicShader})
  const layouts = createLayouts(device, false)
  const pipeline = await device.createRenderPipelineAsync({
    layout: device.createPipelineLayout({bindGroupLayouts: [layouts.global, layouts.perObject]}),
    vertex: {
      module,
      entryPoint: "vs_main",
      buffers: [
        {arrayStride: 12, attributes: [{shaderLocation: 0, offset: 0, format: "float32x3"}]},
        {arrayStride: 12, attributes: [{shaderLocation: 1, offset: 0, format: "float32x3"}]},
      ],
    },
    fragment: {module, entryPoint: "fs_main", targets: [{format: "rgba8unorm"}]},
    primitive: {topology: "triangle-list", cullMode: "none"},
  })
  return renderSinglePass(device, pipeline, layouts, clips)
}

async function renderTextStencilAndCover(device: GPUDevice, clips: Float32Array): Promise<Uint8Array> {
  const module = device.createShaderModule({code: textShader})
  const layouts = createLayouts(device, true)
  const pipelineLayout = device.createPipelineLayout({bindGroupLayouts: [layouts.global, layouts.perObject]})
  const stencilPipeline = await device.createRenderPipelineAsync({
    layout: pipelineLayout,
    vertex: {
      module,
      entryPoint: "vs_main",
      buffers: [{arrayStride: 12, attributes: [{shaderLocation: 0, offset: 0, format: "float32x3"}]}],
    },
    fragment: {module, entryPoint: "fs_stencil", targets: [{format: "rgba8unorm", writeMask: 0}]},
    primitive: {topology: "triangle-list", cullMode: "none"},
    depthStencil: {
      depthWriteEnabled: false,
      depthCompare: "less",
      format: "depth24plus-stencil8",
      stencilFront: TEXT_STENCIL_FACE_STATE,
      stencilBack: TEXT_STENCIL_BACK_FACE_STATE,
    },
  })
  const coverPipeline = await device.createRenderPipelineAsync({
    layout: pipelineLayout,
    vertex: {
      module,
      entryPoint: "vs_main",
      buffers: [{arrayStride: 12, attributes: [{shaderLocation: 0, offset: 0, format: "float32x3"}]}],
    },
    fragment: {module, entryPoint: "fs_cover", targets: [{format: "rgba8unorm"}]},
    primitive: {topology: "triangle-list", cullMode: "none"},
    depthStencil: {
      depthWriteEnabled: false,
      depthCompare: "less",
      format: "depth24plus-stencil8",
      stencilFront: TEXT_COVER_FACE_STATE,
      stencilBack: TEXT_COVER_FACE_STATE,
    },
  })

  const resources = createRenderResources(device, layouts, clips)
  const depth = device.createTexture({
    size: {width: WIDTH, height: HEIGHT},
    format: "depth24plus-stencil8",
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
  })
  const encoder = device.createCommandEncoder()
  const pass = encoder.beginRenderPass({
    colorAttachments: [{
      view: resources.texture.createView(),
      clearValue: {r: 0, g: 0, b: 0, a: 0},
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
  pass.setBindGroup(0, resources.globalBindGroup)
  pass.setBindGroup(1, resources.objectBindGroup)
  pass.setVertexBuffer(0, resources.positionBuffer)
  pass.setStencilReference(0)
  pass.setPipeline(stencilPipeline)
  pass.draw(6)
  pass.setPipeline(coverPipeline)
  pass.draw(6)
  pass.end()
  const pixels = await submitAndRead(device, encoder, resources)
  depth.destroy()
  destroyRenderResources(resources)
  return pixels
}

async function renderSinglePass(
  device: GPUDevice,
  pipeline: GPURenderPipeline,
  layouts: Layouts,
  clips: Float32Array,
): Promise<Uint8Array> {
  const resources = createRenderResources(device, layouts, clips)
  const encoder = device.createCommandEncoder()
  const pass = encoder.beginRenderPass({
    colorAttachments: [{
      view: resources.texture.createView(),
      clearValue: {r: 0, g: 0, b: 0, a: 0},
      loadOp: "clear",
      storeOp: "store",
    }],
  })
  pass.setPipeline(pipeline)
  pass.setBindGroup(0, resources.globalBindGroup)
  pass.setBindGroup(1, resources.objectBindGroup)
  pass.setVertexBuffer(0, resources.positionBuffer)
  pass.setVertexBuffer(1, resources.normalBuffer)
  pass.draw(6)
  pass.end()
  const pixels = await submitAndRead(device, encoder, resources)
  destroyRenderResources(resources)
  return pixels
}

type Layouts = Readonly<{
  global: GPUBindGroupLayout
  perObject: GPUBindGroupLayout
  hasScene: boolean
}>

function createLayouts(device: GPUDevice, hasScene: boolean): Layouts {
  const globalEntries: GPUBindGroupLayoutEntry[] = [
    {binding: 0, visibility: GPUShaderStage.VERTEX, buffer: {type: "uniform"}},
  ]
  if (hasScene) {
    globalEntries.push({binding: 1, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: {type: "uniform"}})
  }
  return {
    global: device.createBindGroupLayout({entries: globalEntries}),
    perObject: device.createBindGroupLayout({
      entries: [
        {binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: {type: "uniform"}},
        {binding: 2, visibility: GPUShaderStage.FRAGMENT, buffer: {type: "read-only-storage"}},
      ],
    }),
    hasScene,
  }
}

type RenderResources = {
  globalBindGroup: GPUBindGroup
  objectBindGroup: GPUBindGroup
  positionBuffer: GPUBuffer
  normalBuffer: GPUBuffer
  globalBuffer: GPUBuffer
  sceneBuffer: GPUBuffer | null
  objectBuffer: GPUBuffer
  clipBuffer: GPUBuffer
  texture: GPUTexture
  readback: GPUBuffer
}

function createRenderResources(device: GPUDevice, layouts: Layouts, clips: Float32Array): RenderResources {
  const positions = new Float32Array([
    -1, -1, 0, 1, -1, 0, 1, 1, 0,
    -1, -1, 0, 1, 1, 0, -1, 1, 0,
  ])
  const normals = new Float32Array(positions.length)
  normals.fill(1)
  const positionBuffer = gpuBuffer(device, positions, GPUBufferUsage.VERTEX)
  const normalBuffer = gpuBuffer(device, normals, GPUBufferUsage.VERTEX)
  const globalData = new Float32Array(16)
  globalData[0] = globalData[5] = globalData[10] = globalData[15] = 1
  const globalBuffer = gpuBuffer(device, globalData, GPUBufferUsage.UNIFORM)
  const sceneBuffer = layouts.hasScene ? gpuBuffer(device, new Float32Array(64), GPUBufferUsage.UNIFORM) : null
  const objectData = new Float32Array(64)
  objectData[0] = objectData[5] = objectData[10] = objectData[15] = 1
  objectData[16] = objectData[21] = objectData[26] = objectData[31] = 1
  objectData.set([1, 0.15, 0.05, 1], 32)
  objectData[PRESENTATION_CLIP_RANGE_FLOAT_OFFSET] = 0
  objectData[PRESENTATION_CLIP_RANGE_FLOAT_OFFSET + 1] = clips.length / 24
  const objectBuffer = gpuBuffer(device, objectData, GPUBufferUsage.UNIFORM)
  const clipBuffer = gpuBuffer(device, clips, GPUBufferUsage.STORAGE)
  const globalEntries: GPUBindGroupEntry[] = [{binding: 0, resource: {buffer: globalBuffer}}]
  if (sceneBuffer !== null) globalEntries.push({binding: 1, resource: {buffer: sceneBuffer}})
  const globalBindGroup = device.createBindGroup({layout: layouts.global, entries: globalEntries})
  const objectBindGroup = device.createBindGroup({
    layout: layouts.perObject,
    entries: [
      {binding: 0, resource: {buffer: objectBuffer}},
      {binding: 2, resource: {buffer: clipBuffer}},
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
  return {
    globalBindGroup,
    objectBindGroup,
    positionBuffer,
    normalBuffer,
    globalBuffer,
    sceneBuffer,
    objectBuffer,
    clipBuffer,
    texture,
    readback,
  }
}

async function submitAndRead(
  device: GPUDevice,
  encoder: GPUCommandEncoder,
  resources: RenderResources,
): Promise<Uint8Array> {
  encoder.copyTextureToBuffer(
    {texture: resources.texture},
    {buffer: resources.readback, bytesPerRow: BYTES_PER_ROW, rowsPerImage: HEIGHT},
    {width: WIDTH, height: HEIGHT},
  )
  device.queue.submit([encoder.finish()])
  await resources.readback.mapAsync(GPUMapMode.READ)
  const padded = new Uint8Array(resources.readback.getMappedRange())
  const pixels = new Uint8Array(WIDTH * HEIGHT * 4)
  for (let row = 0; row < HEIGHT; row += 1) {
    pixels.set(padded.subarray(row * BYTES_PER_ROW, row * BYTES_PER_ROW + WIDTH * 4), row * WIDTH * 4)
  }
  resources.readback.unmap()
  return pixels
}

function destroyRenderResources(resources: RenderResources): void {
  resources.positionBuffer.destroy()
  resources.normalBuffer.destroy()
  resources.globalBuffer.destroy()
  resources.sceneBuffer?.destroy()
  resources.objectBuffer.destroy()
  resources.clipBuffer.destroy()
  resources.texture.destroy()
  resources.readback.destroy()
}

function gpuBuffer(device: GPUDevice, data: Float32Array, usage: GPUBufferUsageFlags): GPUBuffer {
  const buffer = device.createBuffer({
    size: Math.max(4, Math.ceil(data.byteLength / 4) * 4),
    usage: usage | GPUBufferUsage.COPY_DST,
  })
  if (data.byteLength > 0) device.queue.writeBuffer(buffer, 0, data)
  return buffer
}

function pixel(bytes: Uint8Array, x: number, y: number): readonly [number, number, number, number] {
  const offset = (y * WIDTH + x) * 4
  return [bytes[offset]!, bytes[offset + 1]!, bytes[offset + 2]!, bytes[offset + 3]!]
}

function opaquePixelCount(bytes: Uint8Array): number {
  let count = 0
  for (let offset = 3; offset < bytes.length; offset += 4) {
    if (bytes[offset]! >= 128) count += 1
  }
  return count
}
