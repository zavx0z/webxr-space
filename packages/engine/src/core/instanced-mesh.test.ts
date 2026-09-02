import {describe, expect, test} from "bun:test"
import {MeshBasicMaterial} from "../materials"
import {Matrix4, Quaternion, Vector3} from "../math"
import {BufferAttribute, BufferGeometry} from "./buffer-geometry"
import {InstancedMesh} from "./instanced-mesh"

function createMesh(count = 4): InstancedMesh {
  const geometry = new BufferGeometry()
  geometry.setAttribute("position", new BufferAttribute(new Float32Array([0, 0, 0]), 3))
  return new InstancedMesh(geometry, new MeshBasicMaterial(), count)
}

describe("InstancedMesh partial matrix updates", () => {
  test("initializes every slot as identity and rejects invalid capacities", () => {
    const mesh = createMesh(2)

    expect([...mesh.instanceMatrix]).toEqual([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ])
    expect(() => createMesh(-1)).toThrow(RangeError)
    expect(() => createMesh(1.5)).toThrow(RangeError)
  })

  test("marks exactly one complete matrix for setMatrixAt", () => {
    const mesh = createMesh()
    mesh.setMatrixAt(2, new Matrix4())

    expect(mesh.instanceMatrixAttribute.updateRanges).toEqual([{offset: 32, count: 16}])
  })

  test("marks only translation values for setPositionAt", () => {
    const mesh = createMesh()
    mesh.setPositionAt(1, new Vector3(3, 4, 5))

    expect(mesh.instanceMatrixAttribute.updateRanges).toEqual([{offset: 28, count: 3}])
  })

  test("keeps the three changed basis columns as bounded ranges", () => {
    const mesh = createMesh()
    const quaternion = new Quaternion().setFromEuler(0.2, 0.4, 0.6)
    mesh.setQuaternionAt(3, quaternion)

    expect(mesh.instanceMatrixAttribute.updateRanges).toEqual([
      {offset: 48, count: 3},
      {offset: 52, count: 3},
      {offset: 56, count: 3},
    ])
    expect([...mesh.instanceMatrix.subarray(48, 64)]).toEqual([
      ...new Matrix4().makeRotationFromQuaternion(quaternion).elements,
    ])

    mesh.instanceMatrixAttribute.clearUpdateRanges()
    mesh.setScaleAt(0, new Vector3(2, 3, 4))
    expect(mesh.instanceMatrixAttribute.updateRanges).toEqual([
      {offset: 0, count: 3},
      {offset: 4, count: 3},
      {offset: 8, count: 3},
    ])
  })

  test("rejects fractional and non-finite instance indices before mutation", () => {
    const mesh = createMesh()

    expect(() => mesh.setMatrixAt(0.5, new Matrix4())).toThrow("out of range")
    expect(() => mesh.setPositionAt(Number.NaN, new Vector3())).toThrow("out of range")
    expect(mesh.instanceMatrixAttribute.needsUpdate).toBe(false)
  })
})
