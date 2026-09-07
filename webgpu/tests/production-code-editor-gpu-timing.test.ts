import {afterAll, beforeAll, expect, test} from "bun:test"
import {installProductionCodeEditorGpuTiming} from "../bench/production-code-editor-gpu-timing.ts"

const previousUsage = globalThis.GPUBufferUsage
const previousMode = globalThis.GPUMapMode
beforeAll(() => {
  Object.assign(globalThis, {
    GPUBufferUsage: {MAP_READ: 1, COPY_SRC: 4, COPY_DST: 8, QUERY_RESOLVE: 512},
    GPUMapMode: {READ: 1},
  })
})
afterAll(() => { Object.assign(globalThis, {GPUBufferUsage: previousUsage, GPUMapMode: previousMode}) })

function nativeGpu(supported = true) {
  type Buffer = GPUBuffer & {bytes: ArrayBuffer}
  type Queries = GPUQuerySet & {values: BigUint64Array}
  type Commands = GPUCommandBuffer & {execute(): void}
  const requested: Array<GPUDeviceDescriptor | undefined> = []
  const passes: GPURenderPassDescriptor[] = []
  const resolvedCounts: number[] = []
  let querySets = 0
  let buffers = 0
  let destroyed = 0
  let passNumber = 0
  let timestamp = 1000n
  const device = {
    features: new Set(supported ? ["timestamp-query"] : []),
    createQuerySet(descriptor: GPUQuerySetDescriptor) {
      querySets += 1
      return {values: new BigUint64Array(descriptor.count), destroy() { destroyed += 1 }}
    },
    createBuffer(descriptor: GPUBufferDescriptor) {
      buffers += 1
      const bytes = new ArrayBuffer(descriptor.size)
      return {
        bytes,
        async mapAsync() {},
        getMappedRange(offset: number, size: number) { return bytes.slice(offset, offset + size) },
        unmap() {},
        destroy() { destroyed += 1 },
      }
    },
    createCommandEncoder() {
      const commands: Array<() => void> = []
      return {
        beginRenderPass(descriptor: GPURenderPassDescriptor) {
          passes.push(descriptor)
          const duration = BigInt(++passNumber) * 100_000n
          return {end() {
            commands.push(() => {
              const writes = descriptor.timestampWrites
              if (writes === undefined) return
              const query = writes.querySet as Queries
              query.values[writes.beginningOfPassWriteIndex!] = timestamp
              timestamp += duration
              query.values[writes.endOfPassWriteIndex!] = timestamp
            })
          }}
        },
        resolveQuerySet(querySet: Queries, first: number, count: number, destination: Buffer) {
          resolvedCounts.push(count)
          commands.push(() => new BigUint64Array(destination.bytes).set(querySet.values.slice(first, first + count)))
        },
        copyBufferToBuffer(source: Buffer, from: number, destination: Buffer, to: number, size: number) {
          commands.push(() => new Uint8Array(destination.bytes).set(new Uint8Array(source.bytes, from, size), to))
        },
        finish() { return {execute() { for (const command of commands) command() }} },
      }
    },
    queue: {submit(commands: Commands[]) { for (const command of commands) command.execute() }},
  } as unknown as GPUDevice
  const adapter = {
    features: device.features,
    async requestDevice(descriptor?: GPUDeviceDescriptor) { requested.push(descriptor); return device },
  } as unknown as GPUAdapter
  const gpu = {async requestAdapter() { return adapter }} as unknown as GPU
  return {gpu, device, adapter, requested, passes, resolvedCounts, counts: () => ({querySets, buffers, destroyed})}
}

test("benchmark measures every pass across four actual submissions and preserves caller descriptors", async () => {
  const fake = nativeGpu()
  const originalRequest = fake.gpu.requestAdapter
  const timing = installProductionCodeEditorGpuTiming({enabled: true, gpu: fake.gpu})
  const adapter = (await fake.gpu.requestAdapter())!
  const descriptor = {label: "application-device", requiredFeatures: ["float32-filterable" as GPUFeatureName]}
  const device = await adapter.requestDevice(descriptor)
  expect(fake.requested[0]!.requiredFeatures).toEqual(["float32-filterable", "timestamp-query"])
  expect(descriptor.requiredFeatures).toEqual(["float32-filterable"])
  expect(timing.readStatus()).toEqual({requested: true, available: true, reason: null})
  const attachments: GPURenderPassColorAttachment[] = []
  const passDescriptor: GPURenderPassDescriptor = {label: "actual-pass", colorAttachments: attachments}
  timing.beginSample("eight-passes")
  for (let index = 0; index < 4; index += 1) {
    const encoder = device.createCommandEncoder()
    encoder.beginRenderPass(passDescriptor).end()
    encoder.beginRenderPass(passDescriptor).end()
    device.queue.submit([encoder.finish()])
  }
  const result = await timing.endSample()
  expect(result.complete).toBe(true)
  expect(result.passes.map(pass => pass.durationMs)).toEqual([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8])
  expect(result.totalGpuMs).toBeCloseTo(3.6, 9)
  expect(fake.resolvedCounts).toEqual([4, 4, 4, 4])
  expect(fake.passes.every(pass => pass.colorAttachments === attachments && pass.label === "actual-pass")).toBe(true)
  expect(passDescriptor.timestampWrites).toBeUndefined()

  timing.beginSample("reuse")
  const encoder = device.createCommandEncoder()
  encoder.beginRenderPass(passDescriptor).end()
  device.queue.submit([encoder.finish()])
  expect((await timing.endSample()).complete).toBe(true)
  expect(fake.counts()).toEqual({querySets: 4, buffers: 8, destroyed: 0})
  timing.dispose()
  expect(fake.counts().destroyed).toBe(12)
  expect(fake.gpu.requestAdapter).toBe(originalRequest)
})

test("unsupported feature is explicit and requestDevice keeps the original descriptor", async () => {
  const fake = nativeGpu(false)
  const timing = installProductionCodeEditorGpuTiming({enabled: true, gpu: fake.gpu})
  const descriptor: GPUDeviceDescriptor = {label: "unsupported"}
  await (await fake.gpu.requestAdapter())!.requestDevice(descriptor)
  expect(fake.requested[0]).toBe(descriptor)
  expect(timing.readStatus().available).toBe(false)
  timing.beginSample()
  const result = await timing.endSample()
  expect(result.complete).toBe(false)
  expect(result.totalGpuMs).toBeNull()
  expect(result.errors).toContain("timestamp-query-unavailable")
  expect(fake.counts().querySets).toBe(0)
  timing.dispose()
})

test("caller timestampWrites remain intact and prevent a falsely complete total", async () => {
  const fake = nativeGpu()
  const timing = installProductionCodeEditorGpuTiming({enabled: true, gpu: fake.gpu})
  const device = await (await fake.gpu.requestAdapter())!.requestDevice()
  const timestampWrites = {querySet: device.createQuerySet({type: "timestamp", count: 2}), beginningOfPassWriteIndex: 0, endOfPassWriteIndex: 1}
  timing.beginSample()
  const encoder = device.createCommandEncoder()
  encoder.beginRenderPass({colorAttachments: [], timestampWrites}).end()
  encoder.beginRenderPass({colorAttachments: []}).end()
  device.queue.submit([encoder.finish()])
  const result = await timing.endSample()
  expect(fake.passes[0]!.timestampWrites).toBe(timestampWrites)
  expect(result.passes).toHaveLength(2)
  expect(result.passes[0]!.reason).toBe("caller-timestamp-writes-preserved")
  expect(result.passes[1]!.durationMs).toBe(0.2)
  expect(result.totalGpuMs).toBeNull()
  timing.dispose()
})

test("bounded query capacity reports every omitted pass rather than silently returning a partial total", async () => {
  const fake = nativeGpu()
  const timing = installProductionCodeEditorGpuTiming({enabled: true, gpu: fake.gpu})
  const device = await (await fake.gpu.requestAdapter())!.requestDevice()
  timing.beginSample()
  const encoder = device.createCommandEncoder()
  for (let index = 0; index < 65; index += 1) encoder.beginRenderPass({colorAttachments: []}).end()
  device.queue.submit([encoder.finish()])
  const result = await timing.endSample()
  expect(result.passes).toHaveLength(65)
  expect(result.passes.filter(pass => pass.durationMs !== null)).toHaveLength(64)
  expect(result.passes[64]!.reason).toBe("timestamp-pass-capacity-exceeded")
  expect(result.complete).toBe(false)
  expect(result.totalGpuMs).toBeNull()
  timing.dispose()
})

test("ring exhaustion and unsubmitted command buffers are explicit incomplete samples", async () => {
  const fake = nativeGpu()
  const timing = installProductionCodeEditorGpuTiming({enabled: true, gpu: fake.gpu})
  const device = await (await fake.gpu.requestAdapter())!.requestDevice()
  timing.beginSample()
  for (let index = 0; index < 5; index += 1) {
    const encoder = device.createCommandEncoder()
    encoder.beginRenderPass({colorAttachments: []}).end()
    encoder.finish()
  }
  const result = await timing.endSample()
  expect(result.passes).toHaveLength(5)
  expect(result.passes[4]!.reason).toBe("timestamp-ring-busy")
  expect(result.errors).toContain("render-command-buffer-not-submitted-within-sample")
  expect(result.totalGpuMs).toBeNull()
  timing.dispose()
})
