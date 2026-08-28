import {afterAll, beforeAll, describe, expect, test} from "bun:test"
import {BufferAttribute, BufferGeometry} from "../core/buffer-geometry"
import {Renderer} from "./index"

interface FakeBuffer {
  readonly size: number
  destroyCount: number
  destroy(): void
}

interface FakeDeviceState {
  createCount: number
  writeCount: number
  failWriteAt: number | null
  buffers: FakeBuffer[]
}

interface RendererGeometrySeam {
  device: GPUDevice
  getOrCreateGeometryBuffers(geometry: BufferGeometry): {
    positionBuffer: FakeBuffer
    normalBuffer?: FakeBuffer
  }
}

const originalGpuBufferUsage = Object.getOwnPropertyDescriptor(globalThis, "GPUBufferUsage")

beforeAll(() => {
  Object.defineProperty(globalThis, "GPUBufferUsage", {
    configurable: true,
    value: {COPY_DST: 8, INDEX: 16, VERTEX: 32},
  })
})

afterAll(() => {
  if (originalGpuBufferUsage) {
    Object.defineProperty(globalThis, "GPUBufferUsage", originalGpuBufferUsage)
  } else {
    Reflect.deleteProperty(globalThis, "GPUBufferUsage")
  }
})

function createDevice(): {device: GPUDevice; state: FakeDeviceState} {
  const state: FakeDeviceState = {
    createCount: 0,
    writeCount: 0,
    failWriteAt: null,
    buffers: [],
  }
  const device = {
    createBuffer(descriptor: GPUBufferDescriptor): GPUBuffer {
      state.createCount += 1
      const buffer: FakeBuffer = {
        size: Number(descriptor.size),
        destroyCount: 0,
        destroy() {
          this.destroyCount += 1
        },
      }
      state.buffers.push(buffer)
      return buffer as unknown as GPUBuffer
    },
    queue: {
      writeBuffer() {
        state.writeCount += 1
        if (state.failWriteAt === state.writeCount) {
          state.failWriteAt = null
          throw new Error("queue rejected write")
        }
      },
    },
  } as unknown as GPUDevice
  return {device, state}
}

function createGeometry(): BufferGeometry {
  const geometry = new BufferGeometry()
  geometry.setAttribute("position", new BufferAttribute(new Float32Array([0, 0, 0]), 3))
  geometry.setAttribute("normal", new BufferAttribute(new Float32Array([0, 0, 1]), 3))
  return geometry
}

function createSeam(device: GPUDevice): RendererGeometrySeam {
  const renderer = new Renderer() as unknown as RendererGeometrySeam
  renderer.device = device
  return renderer
}

describe("Renderer geometry attribute cache", () => {
  test("reuses an unchanged geometry without planning writes or replacing bindings", () => {
    const {device, state} = createDevice()
    const seam = createSeam(device)
    const geometry = createGeometry()

    const first = seam.getOrCreateGeometryBuffers(geometry)
    const second = seam.getOrCreateGeometryBuffers(geometry)

    expect(second).toBe(first)
    expect(second.positionBuffer).toBe(first.positionBuffer)
    expect(second.normalBuffer).toBe(first.normalBuffer)
    expect(state.createCount).toBe(2)
    expect(state.writeCount).toBe(2)
    expect(state.buffers.map((buffer) => buffer.destroyCount)).toEqual([0, 0])
  })

  test("keeps cached buffers and dirty state when an in-place queue write fails", () => {
    const {device, state} = createDevice()
    const seam = createSeam(device)
    const geometry = createGeometry()
    const first = seam.getOrCreateGeometryBuffers(geometry)
    const normal = geometry.attributes.normal!
    normal.array[2] = 2
    normal.addUpdateRange(2, 1)
    state.failWriteAt = state.writeCount + 1

    expect(() => seam.getOrCreateGeometryBuffers(geometry)).toThrow("queue rejected write")
    expect(normal.needsUpdate).toBe(true)
    expect(state.buffers.map((buffer) => buffer.destroyCount)).toEqual([0, 0])

    const recovered = seam.getOrCreateGeometryBuffers(geometry)
    expect(recovered).toBe(first)
    expect(normal.needsUpdate).toBe(false)
  })

  test("destroys every completed initial allocation if an optional upload fails", () => {
    const {device, state} = createDevice()
    const seam = createSeam(device)
    const geometry = createGeometry()
    state.failWriteAt = 2

    expect(() => seam.getOrCreateGeometryBuffers(geometry)).toThrow("queue rejected write")
    expect(state.buffers).toHaveLength(2)
    expect(state.buffers.map((buffer) => buffer.destroyCount)).toEqual([1, 1])
  })
})
