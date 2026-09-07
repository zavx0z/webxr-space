/** Benchmark-only timestamp queries. Install before the public browser attach(). */
export type GpuTimingSample = Readonly<{
  label: string
  passes: readonly Readonly<{index: number; label: string; durationMs: number | null; reason?: string}>[]
  totalGpuMs: number | null
  complete: boolean
  errors: readonly string[]
}>

export type ProductionCodeEditorGpuTiming = Readonly<{
  readStatus(): Readonly<{requested: boolean; available: boolean; reason: string | null}>
  beginSample(label?: string): void
  endSample(): Promise<GpuTimingSample>
  dispose(): void
}>

type PassTiming = {index: number; label: string; durationMs: number | null; reason?: string}
type Sample = {
  label: string
  passes: PassTiming[]
  errors: string[]
  pending: Promise<void>[]
  slots: Set<Slot>
}
type Slot = {
  querySet: GPUQuerySet
  resolveBuffer: GPUBuffer
  readBuffer: GPUBuffer
  busy: boolean
  submitted: boolean
  sample: Sample | null
  passIndices: number[]
}

const SLOT_COUNT = 4
const MAX_PASSES = 64
const BUFFER_BYTES = MAX_PASSES * 2 * 8

/**
 * Opt in with `{enabled: new URLSearchParams(location.search).get("gpu") === "1"}`.
 *
 * Call beginSample/endSample around synchronous application.render(). endSample
 * closes recording immediately and asynchronously returns every pass duration.
 * CPU timings from a query-enabled run must be reported separately: query resolve,
 * copy and mapping add work. GPU totals cover pass execution, not queue latency,
 * buffer uploads, readback or CPU wall time. Existing timestampWrites are preserved
 * and reported as an explicit incomplete measurement instead of being overwritten.
 *
 * Spec: https://gpuweb.github.io/gpuweb/#timestamp-query
 * https://gpuweb.github.io/gpuweb/#dom-gpurenderpassdescriptor-timestampwrites
 */
export function installProductionCodeEditorGpuTiming(options: {
  enabled: boolean
  gpu?: GPU
}): ProductionCodeEditorGpuTiming {
  const gpu = options.gpu ?? globalThis.navigator?.gpu
  let available = false
  let reason: string | null = options.enabled ? "device-not-created" : "disabled"
  let active: Sample | null = null
  let disposed = false
  const restore: Array<() => void> = []
  const allSlots: Slot[] = []
  const commandSlots = new WeakMap<GPUCommandBuffer, Slot>()
  const instrumentedDevices = new WeakSet<GPUDevice>()
  const instrumentedAdapters = new WeakSet<GPUAdapter>()

  const failSlot = (slot: Slot, message: string): void => {
    const sample = slot.sample!
    sample.errors.push(message)
    for (const index of slot.passIndices) sample.passes[index]!.reason = message
  }

  const readSlot = async (slot: Slot): Promise<void> => {
    const sample = slot.sample!
    const bytes = slot.passIndices.length * 16
    let mapped = false
    try {
      await slot.readBuffer.mapAsync(GPUMapMode.READ, 0, bytes)
      mapped = true
      const timestamps = new BigUint64Array(slot.readBuffer.getMappedRange(0, bytes))
      for (let index = 0; index < slot.passIndices.length; index += 1) {
        const start = timestamps[index * 2]!
        const end = timestamps[index * 2 + 1]!
        const pass = sample.passes[slot.passIndices[index]!]!
        if (end < start) {
          pass.reason = "timestamp-order-invalid"
          sample.errors.push(`${pass.label}: timestamp end precedes start`)
        } else pass.durationMs = Number(end - start) / 1_000_000
      }
    } catch (error) {
      failSlot(slot, `timestamp-readback-failed: ${String(error)}`)
    } finally {
      if (mapped) slot.readBuffer.unmap()
      slot.busy = false
      slot.sample = null
      slot.passIndices = []
    }
  }

  const instrumentDevice = (device: GPUDevice): void => {
    if (instrumentedDevices.has(device)) return
    instrumentedDevices.add(device)
    if (!device.features.has("timestamp-query")) {
      reason = "timestamp-query-unavailable"
      return
    }
    available = true
    reason = null
    const slots = Array.from({length: SLOT_COUNT}, (): Slot => ({
      querySet: device.createQuerySet({type: "timestamp", count: MAX_PASSES * 2}),
      resolveBuffer: device.createBuffer({
        size: BUFFER_BYTES,
        usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
      }),
      readBuffer: device.createBuffer({
        size: BUFFER_BYTES,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      }),
      busy: false,
      submitted: false,
      sample: null,
      passIndices: [],
    }))
    allSlots.push(...slots)
    const createCommandEncoder = device.createCommandEncoder
    const wrappedCreate: GPUDevice["createCommandEncoder"] = function(descriptor) {
      const encoder = createCommandEncoder.call(device, descriptor)
      const sample = active
      if (sample === null || disposed) return encoder
      let slot: Slot | undefined
      const beginRenderPass = encoder.beginRenderPass
      encoder.beginRenderPass = function(passDescriptor) {
        const pass: PassTiming = {
          index: sample.passes.length,
          label: passDescriptor.label ?? `render-pass-${sample.passes.length + 1}`,
          durationMs: null,
        }
        sample.passes.push(pass)
        if (passDescriptor.timestampWrites !== undefined) {
          pass.reason = "caller-timestamp-writes-preserved"
          sample.errors.push(`${pass.label}: caller timestampWrites already present`)
          return beginRenderPass.call(encoder, passDescriptor)
        }
        if (slot === undefined) {
          slot = slots.find(candidate => !candidate.busy)
          if (slot !== undefined) {
            slot.busy = true
            slot.submitted = false
            slot.sample = sample
            slot.passIndices = []
            sample.slots.add(slot)
          }
        }
        if (slot === undefined || slot.passIndices.length === MAX_PASSES) {
          pass.reason = slot === undefined ? "timestamp-ring-busy" : "timestamp-pass-capacity-exceeded"
          sample.errors.push(`${pass.label}: ${pass.reason}`)
          return beginRenderPass.call(encoder, passDescriptor)
        }
        const firstQuery = slot.passIndices.length * 2
        slot.passIndices.push(pass.index)
        return beginRenderPass.call(encoder, {
          ...passDescriptor,
          timestampWrites: {
            querySet: slot.querySet,
            beginningOfPassWriteIndex: firstQuery,
            endOfPassWriteIndex: firstQuery + 1,
          },
        })
      }
      const finish = encoder.finish
      encoder.finish = function(finishDescriptor) {
        if (slot !== undefined && slot.passIndices.length > 0) {
          const queryCount = slot.passIndices.length * 2
          encoder.resolveQuerySet(slot.querySet, 0, queryCount, slot.resolveBuffer, 0)
          encoder.copyBufferToBuffer(slot.resolveBuffer, 0, slot.readBuffer, 0, queryCount * 8)
        }
        const command = finish.call(encoder, finishDescriptor)
        if (slot !== undefined) commandSlots.set(command, slot)
        return command
      }
      return encoder
    }
    device.createCommandEncoder = wrappedCreate
    restore.push(() => {
      if (device.createCommandEncoder === wrappedCreate) device.createCommandEncoder = createCommandEncoder
    })
    const queue = device.queue
    const submit = queue.submit
    const wrappedSubmit: GPUQueue["submit"] = function(commands) {
      const values = Array.from(commands)
      submit.call(queue, values)
      for (const command of values) {
        const slot = commandSlots.get(command)
        if (slot === undefined) continue
        commandSlots.delete(command)
        slot.submitted = true
        slot.sample!.pending.push(readSlot(slot))
      }
    }
    queue.submit = wrappedSubmit
    restore.push(() => { if (queue.submit === wrappedSubmit) queue.submit = submit })
  }

  if (options.enabled && gpu !== undefined) {
    const requestAdapter = gpu.requestAdapter
    const wrappedRequest: GPU["requestAdapter"] = async function(adapterOptions) {
      const adapter = await requestAdapter.call(gpu, adapterOptions)
      if (adapter === null || instrumentedAdapters.has(adapter) || disposed) return adapter
      instrumentedAdapters.add(adapter)
      const requestDevice = adapter.requestDevice
      const wrappedDevice: GPUAdapter["requestDevice"] = async function(descriptor) {
        const supported = adapter.features.has("timestamp-query")
        if (!supported) reason = "adapter-does-not-support-timestamp-query"
        const requiredFeatures = new Set(descriptor?.requiredFeatures ?? [])
        if (supported) requiredFeatures.add("timestamp-query")
        const device = await requestDevice.call(adapter, supported
          ? {...descriptor, requiredFeatures: [...requiredFeatures]}
          : descriptor)
        if (!disposed) instrumentDevice(device)
        return device
      }
      adapter.requestDevice = wrappedDevice
      restore.push(() => {
        if (adapter.requestDevice === wrappedDevice) adapter.requestDevice = requestDevice
      })
      return adapter
    }
    gpu.requestAdapter = wrappedRequest
    restore.push(() => { if (gpu.requestAdapter === wrappedRequest) gpu.requestAdapter = requestAdapter })
  } else if (options.enabled) reason = "webgpu-unavailable"

  return {
    readStatus: () => Object.freeze({requested: options.enabled, available: available && !disposed, reason}),
    beginSample(label = "render") {
      if (disposed) throw new Error("GPU timing helper is disposed")
      if (active !== null) throw new Error("A GPU timing sample is already active")
      active = {label, passes: [], errors: [], pending: [], slots: new Set()}
      if (!available) active.errors.push(reason ?? "timestamp-query-unavailable")
    },
    async endSample() {
      const sample = active
      if (sample === null) throw new Error("No GPU timing sample is active")
      active = null
      for (const slot of sample.slots) {
        if (!slot.submitted) failSlot(slot, "render-command-buffer-not-submitted-within-sample")
      }
      await Promise.all(sample.pending)
      if (sample.passes.length === 0) sample.errors.push("no-render-passes-observed")
      const complete = sample.errors.length === 0 && sample.passes.every(pass => pass.durationMs !== null)
      return Object.freeze({
        label: sample.label,
        passes: Object.freeze(sample.passes.map(pass => Object.freeze({...pass}))),
        totalGpuMs: complete ? sample.passes.reduce((total, pass) => total + pass.durationMs!, 0) : null,
        complete,
        errors: Object.freeze([...sample.errors]),
      })
    },
    dispose() {
      if (disposed) return
      disposed = true
      reason = "disposed"
      active = null
      for (const undo of restore.reverse()) undo()
      for (const slot of allSlots) {
        slot.querySet.destroy()
        slot.resolveBuffer.destroy()
        slot.readBuffer.destroy()
      }
    },
  }
}
