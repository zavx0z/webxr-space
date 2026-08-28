import {describe, expect, test} from "bun:test"
import {BufferAttribute} from "../core/buffer-attribute"
import {
  applyBufferAttributeUploadPlan,
  planBufferAttributeUpload,
} from "./buffer-attribute-upload"

describe("BufferAttribute renderer upload seam", () => {
  test("writes only aligned dirty words while cached capacity is unchanged", () => {
    const attribute = new BufferAttribute(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]), 4)
    const synchronizedVersion = attribute.version
    attribute.array[5] = 55
    attribute.addUpdateRange(5, 1)

    const plan = planBufferAttributeUpload(attribute, 12, synchronizedVersion)
    const writes: Array<{offset: number, bytes: number[]}> = []
    applyBufferAttributeUploadPlan(attribute, plan, (offset, source) => {
      writes.push({offset, bytes: [...source]})
    })

    expect(plan).toEqual({
      sourceVersion: 1,
      sourceByteLength: 12,
      requiredCapacity: 12,
      reallocate: false,
      ranges: [{byteOffset: 4, byteLength: 4}],
    })
    expect(writes).toEqual([{offset: 4, bytes: [4, 55, 6, 7]}])
    expect(attribute.needsUpdate).toBe(false)
  })

  test("coalesces WebGPU-aligned byte writes and pads a short final word", () => {
    const attribute = new BufferAttribute(new Uint8Array([1, 2, 3, 4, 5, 6]), 2)
    const synchronizedVersion = attribute.version
    attribute.addUpdateRange(1, 1)
    attribute.addUpdateRange(4, 2)

    const plan = planBufferAttributeUpload(attribute, 8, synchronizedVersion)
    const writes: Uint8Array[] = []
    applyBufferAttributeUploadPlan(attribute, plan, (_offset, source) => writes.push(source))

    expect(plan.ranges).toEqual([{byteOffset: 0, byteLength: 8}])
    expect([...writes[0]!]).toEqual([1, 2, 3, 4, 5, 6, 0, 0])
  })

  test("requests geometric-buffer replacement only when capacity is insufficient", () => {
    const attribute = new BufferAttribute(new Float32Array([1, 2, 3, 4]), 2)

    expect(planBufferAttributeUpload(attribute, 8)).toEqual({
      sourceVersion: 0,
      sourceByteLength: 16,
      requiredCapacity: 16,
      reallocate: true,
      ranges: [{byteOffset: 0, byteLength: 16}],
    })

    const synchronizedVersion = attribute.version
    attribute.needsUpdate = true
    expect(planBufferAttributeUpload(attribute, 64, synchronizedVersion)).toMatchObject({
      reallocate: false,
      ranges: [{byteOffset: 0, byteLength: 16}],
    })
  })

  test("does not acknowledge dirty ranges when the queue write fails", () => {
    const attribute = new BufferAttribute(new Uint32Array(4), 1)
    const synchronizedVersion = attribute.version
    attribute.addUpdateRange(2, 1)
    const plan = planBufferAttributeUpload(attribute, 16, synchronizedVersion)

    expect(() => applyBufferAttributeUploadPlan(attribute, plan, () => {
      throw new Error("queue rejected write")
    })).toThrow("queue rejected write")
    expect(attribute.updateRanges).toEqual([{offset: 2, count: 1}])
  })

  test("forces a complete catch-up when another binding already acknowledged the revision", () => {
    const attribute = new BufferAttribute(new Uint32Array([1, 2, 3, 4]), 1)
    const firstBindingVersion = attribute.version
    const secondBindingVersion = attribute.version
    attribute.array[2] = 30
    attribute.addUpdateRange(2, 1)

    const firstPlan = planBufferAttributeUpload(attribute, 16, firstBindingVersion)
    applyBufferAttributeUploadPlan(attribute, firstPlan, () => {})
    const secondPlan = planBufferAttributeUpload(attribute, 16, secondBindingVersion)

    expect(firstPlan.ranges).toEqual([{byteOffset: 8, byteLength: 4}])
    expect(secondPlan.ranges).toEqual([{byteOffset: 0, byteLength: 16}])
  })

  test("forces a complete catch-up when a stale binding predates the current dirty history", () => {
    const attribute = new BufferAttribute(new Uint32Array([1, 2, 3, 4]), 1)
    const firstBindingVersion = attribute.version
    const staleBindingVersion = attribute.version

    attribute.array[0] = 10
    attribute.addUpdateRange(0, 1)
    applyBufferAttributeUploadPlan(
      attribute,
      planBufferAttributeUpload(attribute, 16, firstBindingVersion),
      () => {},
    )

    attribute.array[3] = 40
    attribute.addUpdateRange(3, 1)
    const stalePlan = planBufferAttributeUpload(attribute, 16, staleBindingVersion)

    expect(attribute.updateBaseVersion).toBe(1)
    expect(stalePlan.ranges).toEqual([{byteOffset: 0, byteLength: 16}])
  })

  test("plans no work for a cache already synchronized to the current revision", () => {
    const attribute = new BufferAttribute(new Uint32Array([1, 2, 3, 4]), 1)

    expect(planBufferAttributeUpload(attribute, 16, attribute.version)).toEqual({
      sourceVersion: 0,
      sourceByteLength: 16,
      requiredCapacity: 16,
      reallocate: false,
      ranges: [],
    })
  })

  test("rejects a stale plan without acknowledging newer storage", () => {
    const attribute = new BufferAttribute(new Uint8Array(8), 4)
    const synchronizedVersion = attribute.version
    attribute.addUpdateRange(2, 1)
    const plan = planBufferAttributeUpload(attribute, 8, synchronizedVersion)

    attribute.array = new Uint8Array(8)

    expect(() => applyBufferAttributeUploadPlan(attribute, plan, () => {})).toThrow(
      "changed after its upload plan",
    )
    expect(attribute.fullUpdateRequired).toBe(true)
  })

  test("preserves all dirty history when a producer mutates during a queue write", () => {
    const attribute = new BufferAttribute(new Uint32Array(4), 1)
    const synchronizedVersion = attribute.version
    attribute.addUpdateRange(0, 1)
    const plan = planBufferAttributeUpload(attribute, 16, synchronizedVersion)

    expect(() => applyBufferAttributeUploadPlan(attribute, plan, () => {
      attribute.array[3] = 4
      attribute.addUpdateRange(3, 1)
    })).toThrow("changed while its upload plan")
    expect(attribute.version).toBe(2)
    expect(attribute.updateRanges).toEqual([
      {offset: 0, count: 1},
      {offset: 3, count: 1},
    ])
  })
})
