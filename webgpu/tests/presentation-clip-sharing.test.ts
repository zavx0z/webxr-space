import {expect, test} from "bun:test"
import {Object3D, type PresentationClipShape} from "@zavx0z/engine"
import {
  encodePresentationClipChains,
  PRESENTATION_CLIP_RECORD_FLOATS,
} from "../src/renderer/presentation-clip-upload.ts"

function frozenShape(coordinateSpace: Object3D): PresentationClipShape {
  return Object.freeze({
    kind: "rounded-rect",
    coordinateSpace,
    center: Object.freeze([10, 20] as const),
    halfSize: Object.freeze([5, 8] as const),
    radii: Object.freeze([1, 2, 3, 4] as const),
  })
}

function objectsWith(shapes: readonly PresentationClipShape[], count = 2): Object3D[] {
  return Array.from({length: count}, () => {
    const object = new Object3D()
    object.presentationClips = shapes
    return object
  })
}

test("shared immutable clips canonicalise once for every renderable, but sample transforms every frame", () => {
  const coordinateSpace = new Object3D()
  const baseShape = frozenShape(coordinateSpace)
  let centerReads = 0
  const center = new Proxy(baseShape.center, {
    get(target, property, receiver) {
      if (property === "0" || property === "1") centerReads += 1
      return Reflect.get(target, property, receiver)
    },
  })
  const chain = Object.freeze([Object.freeze({...baseShape, center})])
  const objects = objectsWith(chain, 1000)
  const first = encodePresentationClipChains(objects)

  expect(centerReads).toBe(2)
  expect(first.data.length).toBe(PRESENTATION_CLIP_RECORD_FLOATS)
  for (const object of objects) expect(first.ranges.get(object)).toBe(first.ranges.get(objects[0]!))
  coordinateSpace.position.x = 17
  coordinateSpace.updateWorldMatrix()
  const second = encodePresentationClipChains(objects)

  expect(centerReads).toBe(4)
  expect(first.data[12]).toBe(0)
  expect(second.data[12]).toBe(-17)
  expect(second.data.slice(16)).toEqual(first.data.slice(16))
})

test("frozen chains containing mutable geometry are resampled without changing value interning", () => {
  const coordinateSpace = new Object3D()
  const center: [number, number] = [10, 20]
  const chain = Object.freeze([Object.freeze({...frozenShape(coordinateSpace), center})])
  const first = new Object3D()
  first.presentationClips = chain
  const second = new Object3D()
  Object.defineProperty(second, "presentationClips", {
    get() {
      center[0] = 35
      return chain
    },
  })
  const encoded = encodePresentationClipChains([first, second])

  expect(encoded.ranges.get(first)).toEqual({start: 0, count: 1})
  expect(encoded.ranges.get(second)).toEqual({start: 1, count: 1})
  expect(encoded.data[16]).toBe(10)
  expect(encoded.data[PRESENTATION_CLIP_RECORD_FLOATS + 16]).toBe(35)
})

test("freezing an accessor shape does not make its changing values immutable", () => {
  const coordinateSpace = new Object3D()
  let reads = 0
  const shape = Object.freeze({
    ...frozenShape(coordinateSpace),
    get center(): readonly [number, number] {
      reads += 1
      return Object.freeze([reads * 10, 20])
    },
  })
  const objects = objectsWith(Object.freeze([shape]))
  const encoded = encodePresentationClipChains(objects)

  expect(encoded.data.length).toBe(PRESENTATION_CLIP_RECORD_FLOATS * 2)
  expect(encoded.ranges.get(objects[0]!)).not.toEqual(encoded.ranges.get(objects[1]!))
})

test("shared chains retain fail-closed validation, record limits, and immutable prior uploads", () => {
  const coordinateSpace = new Object3D()
  const shape = frozenShape(coordinateSpace)
  const chain = Object.freeze([shape])
  const objects = objectsWith(chain)
  const valid = encodePresentationClipChains(objects)
  coordinateSpace.scale.x = 0
  coordinateSpace.updateWorldMatrix()
  const singular = encodePresentationClipChains(objects)

  expect(singular.data[18]).toBe(-1)
  expect(singular.ranges.get(objects[0]!)).toBe(singular.ranges.get(objects[1]!))
  expect(valid.data[18]).toBe(5)

  const exhausted = encodePresentationClipChains(objectsWith(Object.freeze([shape, shape])), {maxRecords: 2})
  expect(exhausted.data.length).toBe(PRESENTATION_CLIP_RECORD_FLOATS)
  expect(exhausted.data[18]).toBe(-1)
  const invalidShape = Object.freeze({...shape, halfSize: Object.freeze([0, 8] as const)})
  const invalid = encodePresentationClipChains(objectsWith(Object.freeze([invalidShape])))
  expect(invalid.data[18]).toBe(-1)
})
