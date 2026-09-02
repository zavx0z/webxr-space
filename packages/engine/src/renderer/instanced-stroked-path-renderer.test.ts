import {afterAll, beforeAll, describe, expect, test} from "bun:test"
import {
  InstancedStrokedPath,
  STROKED_PATH_SEGMENT_OFFSETS,
  STROKED_PATH_SEGMENT_RECORD_BYTE_LENGTH,
  STROKED_PATH_STYLE_OFFSETS,
  STROKED_PATH_STYLE_RECORD_BYTE_LENGTH,
  StrokedPathInstanceLayer,
} from "../core/instanced-stroked-path"
import {Matrix4} from "../math/matrix-4"
import {Renderer} from "./index"

type FakeBuffer = GPUBuffer & {destroyCount: number}

type RendererSeam = {
  device: GPUDevice
  perObjectUniformBuffer: GPUBuffer
  perObjectBindGroup: GPUBindGroup
  strokedPathInstanceBindGroupLayout: GPUBindGroupLayout
  strokedPathStorageValidationCache: WeakMap<StrokedPathInstanceLayer, Readonly<{
    styleBytes: number
    segmentBytes: number
    orderBytes: number
  }>>
  perObjectDataCPU: Float32Array
  updateInstancedStrokedPathData(worldMatrix: Matrix4, offsetFloats: number): void
  renderInstancedStrokedPath(
    pass: GPURenderPassEncoder,
    batch: InstancedStrokedPath,
    renderIndex: number,
  ): void
  invalidateGeometry(geometry: InstancedStrokedPath["geometry"]): void
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

describe("Renderer instanced stroked paths", () => {
  test("submits one ranged draw and uploads only bounded mutated record ranges", () => {
    const writes: Array<{buffer: GPUBuffer; offset: number; byteLength: number}> = []
    const drawIndexed: number[][] = []
    const buffers: FakeBuffer[] = []
    const bindGroups: GPUBindGroupDescriptor[] = []
    const device = {
      limits: {
        maxStorageBufferBindingSize: 1_000_000,
        maxBufferSize: 1_000_000,
      },
      createBuffer(descriptor: GPUBufferDescriptor): GPUBuffer {
        const buffer = {
          size: Number(descriptor.size),
          destroyCount: 0,
          destroy() { buffer.destroyCount += 1 },
        }
        buffers.push(buffer as unknown as FakeBuffer)
        return buffer as unknown as FakeBuffer
      },
      createBindGroup(descriptor: GPUBindGroupDescriptor): GPUBindGroup {
        bindGroups.push(descriptor)
        return {} as GPUBindGroup
      },
      queue: {
        writeBuffer(
          buffer: GPUBuffer,
          offset: number,
          source: AllowSharedBufferSource,
          sourceOffset?: number,
          size?: number,
        ) {
          const sourceLength = ArrayBuffer.isView(source) ? source.byteLength : source.byteLength
          writes.push({buffer, offset, byteLength: size ?? sourceLength - (sourceOffset ?? 0)})
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
    renderer.strokedPathInstanceBindGroupLayout = {} as GPUBindGroupLayout

    const layer = new StrokedPathInstanceLayer({
      initialStyleCapacity: 2,
      maxStyleCapacity: 2,
      initialSegmentCapacity: 512,
      maxSegmentCapacity: 512,
    })
    const ordinary = layer.styles.allocate(styleRecord([0.2, 0.4, 0.8, 1], 2.2))
    const selected = layer.styles.allocate(styleRecord([1, 0.5, 0.1, 1], 3.4))
    const denseSegments = Array.from({length: 512}, (_, index) => layer.segments.allocate(
      segmentRecord(
        index === 511 ? selected : ordinary,
        [index, 0, index + 1, index % 2],
      ),
    ))
    const selectedSegment = denseSegments[511]!
    const batch = new InstancedStrokedPath(layer)

    renderer.renderInstancedStrokedPath(pass, batch, 4)

    expect(drawIndexed).toEqual([[6, 512, 0, 0, 0]])
    expect(writes.map(({byteLength}) => byteLength).sort((a, b) => a - b)).toEqual([
      12,
      48,
      64,
      2_048,
      16_384,
    ])
    expect(bindGroups).toHaveLength(1)
    expect(bindGroups[0]!.entries.map(({binding}) => binding)).toEqual([0, 1, 2])
    expect(renderer.strokedPathStorageValidationCache.get(layer)).toEqual({
      styleBytes: 64,
      segmentBytes: 16_384,
      orderBytes: 2_048,
    })

    writes.length = 0
    drawIndexed.length = 0
    layer.styles.updateRecord(
      selected,
      STROKED_PATH_STYLE_OFFSETS.params * Uint32Array.BYTES_PER_ELEMENT,
      new Float32Array([4.2]),
    )
    renderer.renderInstancedStrokedPath(pass, batch, 4)

    expect(drawIndexed).toEqual([[6, 512, 0, 0, 0]])
    expect(writes).toHaveLength(1)
    expect(writes[0]).toMatchObject({
      offset: selected.slot * STROKED_PATH_STYLE_RECORD_BYTE_LENGTH
        + STROKED_PATH_STYLE_OFFSETS.params * Uint32Array.BYTES_PER_ELEMENT,
      byteLength: Float32Array.BYTES_PER_ELEMENT,
    })

    writes.length = 0
    drawIndexed.length = 0
    layer.segments.updateRecord(
      selectedSegment,
      STROKED_PATH_SEGMENT_OFFSETS.endpoints * Uint32Array.BYTES_PER_ELEMENT,
      new Float32Array([10, 10, 24, 12]),
    )
    renderer.renderInstancedStrokedPath(pass, batch, 4)

    expect(drawIndexed).toEqual([[6, 512, 0, 0, 0]])
    expect(writes).toHaveLength(1)
    expect(writes[0]).toMatchObject({
      offset: selectedSegment.slot * STROKED_PATH_SEGMENT_RECORD_BYTE_LENGTH,
      byteLength: 4 * Float32Array.BYTES_PER_ELEMENT,
    })

    renderer.invalidateGeometry(layer.geometry)
    expect(buffers).toHaveLength(5)
    expect(buffers.every(({destroyCount}) => destroyCount === 1)).toBeTrue()
  })

  test("fails closed when a live draw has no style resource", () => {
    const renderer = new Renderer() as unknown as RendererSeam
    renderer.device = {} as GPUDevice
    renderer.perObjectUniformBuffer = {} as GPUBuffer
    renderer.perObjectBindGroup = {} as GPUBindGroup
    renderer.strokedPathInstanceBindGroupLayout = {} as GPUBindGroupLayout
    const layer = new StrokedPathInstanceLayer({maxStyleCapacity: 1, maxSegmentCapacity: 1})
    layer.segments.allocate(segmentRecord({slot: 0, generation: 1}, [0, 0, 10, 0]))
    const batch = new InstancedStrokedPath(layer)

    expect(() => renderer.renderInstancedStrokedPath(
      {} as GPURenderPassEncoder,
      batch,
      0,
    )).toThrow("requires at least one live style")
  })

  test("uploads one shared run transform without dirtying style or segment storage", () => {
    const renderer = new Renderer() as unknown as RendererSeam
    renderer.perObjectDataCPU = new Float32Array(64)
    const matrix = new Matrix4()
    matrix.elements[0] = 1.5
    matrix.elements[5] = 0.75
    matrix.elements[12] = 14
    matrix.elements[13] = -9
    const layer = new StrokedPathInstanceLayer({maxStyleCapacity: 1, maxSegmentCapacity: 1})
    const styleVersion = layer.styles.recordAttribute.version
    const segmentVersion = layer.segments.recordAttribute.version

    renderer.updateInstancedStrokedPathData(matrix, 0)

    expect([...renderer.perObjectDataCPU.slice(0, 16)]).toEqual([...matrix.elements])
    expect(layer.styles.recordAttribute.version).toBe(styleVersion)
    expect(layer.segments.recordAttribute.version).toBe(segmentVersion)
  })
})

function styleRecord(color: readonly number[], width: number): Float32Array {
  const record = new Float32Array(STROKED_PATH_STYLE_RECORD_BYTE_LENGTH / 4)
  record.set(color, STROKED_PATH_STYLE_OFFSETS.color)
  record.set([width, 1, 0, 0], STROKED_PATH_STYLE_OFFSETS.params)
  return record
}

function segmentRecord(
  style: Readonly<{slot: number; generation: number}>,
  endpoints: readonly [number, number, number, number],
): Uint8Array {
  const buffer = new ArrayBuffer(STROKED_PATH_SEGMENT_RECORD_BYTE_LENGTH)
  new Float32Array(buffer).set(endpoints, STROKED_PATH_SEGMENT_OFFSETS.endpoints)
  const words = new Uint32Array(buffer)
  words[STROKED_PATH_SEGMENT_OFFSETS.styleSlot] = style.slot
  words[STROKED_PATH_SEGMENT_OFFSETS.styleGeneration] = style.generation
  return new Uint8Array(buffer)
}
