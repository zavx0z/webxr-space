import {afterAll, beforeAll, describe, expect, test} from "bun:test"
import {
  InstancedRoundedRect,
  ROUNDED_RECT_INSTANCE_RECORD_BYTE_LENGTH,
  RoundedRectInstanceLayer,
} from "../core/instanced-rounded-rect"
import {Renderer} from "./index"

type FakeBuffer = GPUBuffer & {destroyCount: number}

type RendererSeam = {
  device: GPUDevice
  perObjectUniformBuffer: GPUBuffer
  perObjectBindGroup: GPUBindGroup
  roundedRectInstanceBindGroupLayout: GPUBindGroupLayout
  renderInstancedRoundedRect(
    pass: GPURenderPassEncoder,
    batch: InstancedRoundedRect,
    renderIndex: number,
  ): void
  invalidateGeometry(geometry: InstancedRoundedRect["geometry"]): void
}

const originalGpuBufferUsage = Object.getOwnPropertyDescriptor(globalThis, "GPUBufferUsage")

beforeAll(() => {
  Object.defineProperty(globalThis, "GPUBufferUsage", {
    configurable: true,
    value: {COPY_DST: 8, INDEX: 16, STORAGE: 128, VERTEX: 32},
  })
})

afterAll(() => {
  if (originalGpuBufferUsage) Object.defineProperty(globalThis, "GPUBufferUsage", originalGpuBufferUsage)
  else Reflect.deleteProperty(globalThis, "GPUBufferUsage")
})

describe("Renderer instanced rounded rectangles", () => {
  test("submits one ranged draw and one bounded record upload after mutation", () => {
    const writes: Array<{offset: number; byteLength: number}> = []
    const drawIndexed: number[][] = []
    const buffers: FakeBuffer[] = []
    const device = {
      createBuffer(descriptor: GPUBufferDescriptor): GPUBuffer {
        const buffer = {
          size: Number(descriptor.size),
          destroyCount: 0,
          destroy() { buffer.destroyCount += 1 },
        }
        buffers.push(buffer as unknown as FakeBuffer)
        return buffer as unknown as FakeBuffer
      },
      createBindGroup(): GPUBindGroup {
        return {} as GPUBindGroup
      },
      queue: {
        writeBuffer(
          _buffer: GPUBuffer,
          offset: number,
          source: AllowSharedBufferSource,
          sourceOffset?: number,
          size?: number,
        ) {
          const sourceLength = ArrayBuffer.isView(source)
            ? source.byteLength
            : source.byteLength
          writes.push({offset, byteLength: size ?? sourceLength - (sourceOffset ?? 0)})
        },
      },
    } as unknown as GPUDevice
    const pass = {
      setBindGroup() {},
      setVertexBuffer() {},
      setIndexBuffer() {},
      drawIndexed(...values: number[]) { drawIndexed.push(values) },
    } as unknown as GPURenderPassEncoder
    const renderer = new Renderer() as unknown as RendererSeam
    renderer.device = device
    renderer.perObjectUniformBuffer = {} as GPUBuffer
    renderer.perObjectBindGroup = {} as GPUBindGroup
    renderer.roundedRectInstanceBindGroupLayout = {} as GPUBindGroupLayout

    const layer = new RoundedRectInstanceLayer({initialCapacity: 3, maxCapacity: 3})
    const handles = [0, 1, 2].map((value) => layer.instances.allocate(instanceRecord(value)))
    const batch = new InstancedRoundedRect(layer, 1, 2)

    renderer.renderInstancedRoundedRect(pass, batch, 4)

    expect(drawIndexed).toEqual([[6, 2, 0, 0, 1]])
    expect(writes.map(({byteLength}) => byteLength).sort((a, b) => a - b)).toEqual([
      12,
      12,
      48,
      384,
    ])

    writes.length = 0
    drawIndexed.length = 0
    layer.instances.setRecord(handles[2]!, instanceRecord(42))
    renderer.renderInstancedRoundedRect(pass, batch, 4)

    expect(drawIndexed).toEqual([[6, 2, 0, 0, 1]])
    expect(writes).toEqual([{
      offset: handles[2]!.slot * ROUNDED_RECT_INSTANCE_RECORD_BYTE_LENGTH,
      byteLength: ROUNDED_RECT_INSTANCE_RECORD_BYTE_LENGTH,
    }])

    renderer.invalidateGeometry(layer.geometry)
    expect(buffers).toHaveLength(4)
    expect(buffers.every(({destroyCount}) => destroyCount === 1)).toBeTrue()
  })
})

function instanceRecord(value: number): Float32Array {
  const record = new Float32Array(ROUNDED_RECT_INSTANCE_RECORD_BYTE_LENGTH / 4)
  record[0] = value
  return record
}
